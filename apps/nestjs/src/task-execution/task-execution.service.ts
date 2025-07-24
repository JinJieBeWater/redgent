import type { Cache } from 'cache-manager'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { APICallError, generateObject } from 'ai'
import { Observable, Subscriber } from 'rxjs'
import z from 'zod'

import { Task, TaskReport, TaskStatus as TaskStatusModel } from '@redgent/db'
import {
  CommentNode,
  RedditLinkInfoUntrusted,
  TaskProgress,
  TaskProgressStatus,
} from '@redgent/types'

import {
  analyzeRedditContentPrompt,
  selectMostRelevantLinksPrompt,
} from '../ai-sdk/prompts'
import { myProvider } from '../ai-sdk/provider'
import { PrismaService } from '../prisma/prisma.service'
import { RedditService } from '../reddit/reddit.service'

@Injectable()
export class TaskExecutionService {
  private readonly CACHE_KEY_PREFIX_POST = 'redgent:link:'
  private readonly CACHE_TTL = 1000 * 60 * 60 * 36 // 36 hours
  private readonly MAX_LINKS_PER_TASK = 10
  readonly logger = new Logger(TaskExecutionService.name)

  constructor(
    private readonly redditService: RedditService,
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 执行任务
   * @param taskConfig 任务配置
   * @returns Observable<TaskProgress>
   */
  execute(taskConfig: Task): Observable<TaskProgress> {
    return new Observable((subscriber: Subscriber<TaskProgress>) => {
      const run = async () => {
        const startTime = performance.now()
        try {
          await this._startTask(taskConfig, subscriber)

          let links = await this._fetchLinks(taskConfig, subscriber)
          if (links.length === 0) {
            subscriber.complete()
            return
          }

          if (taskConfig.enableFiltering) {
            links = await this._filterLinks(links, subscriber)
            if (links.length === 0) {
              subscriber.complete()
              return
            }
          }

          links = await this._selectLinks(taskConfig, links, subscriber)
          if (links.length === 0) {
            subscriber.complete()
            return
          }

          const completeLinkData = await this._fetchFullContent(
            links,
            subscriber,
          )
          const analysisResult = await this._analyzeContent(
            taskConfig,
            completeLinkData,
            subscriber,
          )
          await this._saveResults(
            taskConfig,
            analysisResult,
            startTime,
            subscriber,
          )

          subscriber.complete()
        } catch (error) {
          await this._handleError(error, taskConfig, subscriber)
        }
      }

      void run()
    })
  }

  private async _startTask(
    taskConfig: Task,
    subscriber: Subscriber<TaskProgress>,
  ) {
    await this.prismaService.task.update({
      where: { id: taskConfig.id },
      data: { status: TaskStatusModel.running },
    })
    subscriber.next({
      status: TaskProgressStatus.TASK_START,
      message: `任务 "${taskConfig.name}" 已开始`,
    })
  }

  private async _fetchLinks(
    taskConfig: Task,
    subscriber: Subscriber<TaskProgress>,
  ): Promise<RedditLinkInfoUntrusted[]> {
    subscriber.next({
      status: TaskProgressStatus.FETCH_START,
      message: '正在从 Reddit 抓取帖子...',
    })

    const links = await this.redditService.getHotLinksByQueriesAndSubreddits(
      taskConfig.keywords,
      taskConfig.subreddits,
    )

    // 过滤ups为0的帖子 和 评论数为0的帖子
    const filteredLinks = links.filter(
      link => link.ups > 0 || link.num_comments > 0,
    )

    // // 帖子数量大于30时，按照ups排序，取前30个
    // if (filteredLinks.length > 30) {
    //   filteredLinks = filteredLinks.sort((a, b) => b.ups - a.ups).slice(0, 30)
    // }

    if (filteredLinks.length === 0) {
      subscriber.next({
        status: TaskProgressStatus.TASK_CANCEL,
        message: '没有发现任何帖子，任务结束。',
      })
    } else {
      subscriber.next({
        status: TaskProgressStatus.FETCH_COMPLETE,
        message: `从 Reddit 抓取到 ${filteredLinks.length} 个帖子`,
        data: { count: filteredLinks.length },
      })
    }
    return filteredLinks
  }

  private async _filterLinks(
    links: RedditLinkInfoUntrusted[],
    subscriber: Subscriber<TaskProgress>,
  ): Promise<RedditLinkInfoUntrusted[]> {
    subscriber.next({
      status: TaskProgressStatus.FILTER_START,
      message: '开始查询缓存，并进行过滤',
    })

    const cacheKeys = links.map(l => `${this.CACHE_KEY_PREFIX_POST}${l.id}`)
    const cachedValues = await this.cacheManager.mget(cacheKeys)
    const newLinks = links.filter(
      (_, index) => cachedValues[index] === undefined,
    )
    if (newLinks.length > 0) {
      const pairsToCache = newLinks.map(p => ({
        key: `${this.CACHE_KEY_PREFIX_POST}${p.id}`,
        value: 1,
        ttl: this.CACHE_TTL,
      }))
      this.cacheManager.mset(pairsToCache).catch(err => {
        this.logger.warn('Failed to cache new links in the background', err)
      })
    }

    if (newLinks.length === 0) {
      subscriber.next({
        status: TaskProgressStatus.TASK_CANCEL,
        message: '所有帖子都已被处理过，没有新内容，任务结束。',
      })
    } else {
      subscriber.next({
        status: TaskProgressStatus.FILTER_COMPLETE,
        message: `缓存查询完成，发现 ${newLinks.length} 个新帖子`,
        data: {
          originalCount: links.length,
          uniqueCount: newLinks.length,
        },
      })
    }
    return newLinks
  }

  private async _selectLinks(
    taskConfig: Task,
    links: RedditLinkInfoUntrusted[],
    subscriber: Subscriber<TaskProgress>,
  ): Promise<RedditLinkInfoUntrusted[]> {
    if (links.length <= this.MAX_LINKS_PER_TASK) {
      return links
    }

    subscriber.next({
      status: TaskProgressStatus.SELECT_START,
      message: `帖子过多（${links.length} > ${this.MAX_LINKS_PER_TASK}），开始筛选...`,
    })

    const linkInfoToSelect = links.map(link => ({
      id: link.id,
      title: link.title,
      selftext: link.selftext,
    }))

    const filteredLinkIds = await this.selectMostRelevantLinks(
      taskConfig,
      linkInfoToSelect,
    )
    const filteredLinks = links.filter(link =>
      filteredLinkIds.includes(link.id),
    )

    if (filteredLinks.length === 0) {
      subscriber.next({
        status: TaskProgressStatus.TASK_CANCEL,
        message: '筛选后没有帖子，任务结束。',
      })
    } else {
      subscriber.next({
        status: TaskProgressStatus.SELECT_COMPLETE,
        message: `筛选完成，选出 ${filteredLinks.length} 个最相关的帖子`,
        data: {
          originalCount: links.length,
          uniqueCount: filteredLinks.length,
          links: filteredLinks.map(link => ({
            id: link.id,
            title: link.title,
            selftext: link.selftext,
          })),
        },
      })
    }
    return filteredLinks
  }

  private async _fetchFullContent(
    links: RedditLinkInfoUntrusted[],
    subscriber: Subscriber<TaskProgress>,
  ) {
    subscriber.next({
      status: TaskProgressStatus.FETCH_CONTENT_START,
      message: `正在为 ${links.length} 个帖子获取完整内容...`,
    })

    const completeLinkData = await this.redditService.getCommentsByLinkIds(
      links.map(p => p.id),
    )

    subscriber.next({
      status: TaskProgressStatus.FETCH_CONTENT_COMPLETE,
      message: '获取完整内容完成',
    })
    return completeLinkData
  }

  private async _analyzeContent(
    taskConfig: Task,
    completeLinkData: {
      content: RedditLinkInfoUntrusted
      comment: CommentNode[]
    }[],
    subscriber: Subscriber<TaskProgress>,
  ) {
    subscriber.next({
      status: TaskProgressStatus.ANALYZE_START,
      message: `正在调用 AI 服务分析 ${completeLinkData.length} 个帖子...`,
      data: { count: completeLinkData.length },
    })

    const analysisResult = await this.analyze(taskConfig, completeLinkData)

    subscriber.next({
      status: TaskProgressStatus.ANALYZE_COMPLETE,
      message: 'AI 分析完成',
    })
    return analysisResult
  }

  private async _saveResults(
    taskConfig: Task,
    analysisResult: TaskReport['content'],
    startTime: number,
    subscriber: Subscriber<TaskProgress>,
  ) {
    const executionDuration = performance.now() - startTime

    const [, taskInfo] = await Promise.all([
      this.prismaService.task.update({
        where: { id: taskConfig.id },
        data: {
          lastExecutedAt: new Date(),
          status: TaskStatusModel.active,
        },
      }),

      this.prismaService.taskReport.create({
        data: {
          taskId: taskConfig.id,
          content: analysisResult,
          executionDuration,
        },
      }),
    ])

    subscriber.next({
      status: TaskProgressStatus.TASK_COMPLETE,
      message: '任务成功执行完毕',
      data: taskInfo,
    })
  }

  private async _handleError(
    error: unknown,
    taskConfig: Task,
    subscriber: Subscriber<TaskProgress>,
  ) {
    this.logger.error(error)
    await this.prismaService.task.update({
      where: { id: taskConfig.id },
      data: {
        lastFailureAt: new Date(),
        lastErrorMessage: (error as Error).message,
        status: TaskStatusModel.active,
      },
    })

    subscriber.error({
      status: TaskProgressStatus.TASK_ERROR,
      message: `任务 "${taskConfig.name}" 执行失败`,
    })
  }

  async selectMostRelevantLinks(
    taskConfig: Task,
    links: { id: string; title: string; selftext: string }[],
  ) {
    try {
      const { object: selectedLinkIds } = await generateObject({
        model: myProvider.languageModel('structure-model'),
        schema: z
          .array(z.string().describe('帖子id'))
          .describe(
            `帖子的id数组，每个元素都是一个不重复的帖子id，控制在${this.MAX_LINKS_PER_TASK}个以内`,
          ),
        prompt: selectMostRelevantLinksPrompt(
          taskConfig.prompt,
          links,
          this.MAX_LINKS_PER_TASK,
        ),
      })
      return selectedLinkIds
    } catch (error) {
      if (APICallError.isInstance(error) && error.responseBody) {
        // Handle the API call error
        const err = error.responseBody
        this.logger.error(err)
        throw new Error(err)
      } else {
        this.logger.error(error)
        throw new Error('无法进行 AI 筛选，请稍后重试')
      }
    }
  }

  /**
   * 使用 AI 分析 Reddit 内容
   * @param taskConfig 任务配置
   * @param completeLinkData 完整的链接数据和评论
   * @returns 分析报告内容
   */
  private async analyze(
    taskConfig: Task,
    completeLinkData: {
      content: RedditLinkInfoUntrusted
      comment: CommentNode[]
    }[],
  ): Promise<TaskReport['content']> {
    try {
      const { object: analysisResult } = await generateObject({
        model: myProvider.languageModel('analysis-model'),
        schema: z.object({
          title: z.string().describe('报告的整体标题'),
          overallSummary: z.string().describe('对所有分析内容的总体情况'),
          findings: z
            .array(
              z.object({
                point: z.string().describe('发现的要点总结，类似小标题'),
                elaboration: z.string().describe('对该要点的详细阐述和分析'),
                supportingPostIds: z
                  .array(z.string())
                  .describe('支持该发现的源帖子的 ID 列表'),
              }),
            )
            .describe('具体的、分点的分析发现列表'),
        }),
        prompt: analyzeRedditContentPrompt(taskConfig.prompt, completeLinkData),
      })

      return analysisResult
    } catch (error) {
      if (APICallError.isInstance(error) && error.responseBody) {
        const err = error.responseBody
        this.logger.error(err)
        throw new Error(err)
      } else {
        this.logger.error(error)
        throw new Error('无法进行 AI 分析，请稍后重试')
      }
    }
  }
}
