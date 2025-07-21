import type { Cache } from 'cache-manager'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { AnalysisTaskStatus } from '@prisma/client'
import { APICallError, generateObject } from 'ai'
import { Observable, Subscriber } from 'rxjs'
import z from 'zod'

import { AnalysisReportContent } from '@redgent/types/analysis-report'
import {
  TaskConfig,
  TaskProgress,
  TaskStatus,
} from '@redgent/types/analysis-task'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'

import { selectMostRelevantLinksPrompt } from '../ai-sdk/prompts'
import { myProvider } from '../ai-sdk/provider'
import { AnalysisReportService } from '../analysis-report/analysis-report.service'
import { PrismaService } from '../prisma/prisma.service'
import { CommentNode, RedditService } from '../reddit/reddit.service'

@Injectable()
export class AnalysisTaskExecutionService {
  private readonly CACHE_KEY_PREFIX_POST = 'redgent:link:'
  private readonly CACHE_TTL = 1000 * 60 * 60 * 36 // 36 hours
  private readonly MAX_LINKS_PER_TASK = 10
  private readonly logger = new Logger(AnalysisTaskExecutionService.name)

  constructor(
    private readonly redditService: RedditService,
    private readonly analysisService: AnalysisReportService,
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  execute(taskConfig: TaskConfig): Observable<TaskProgress> {
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
    taskConfig: TaskConfig,
    subscriber: Subscriber<TaskProgress>,
  ) {
    await this.prismaService.analysisTask.update({
      where: { id: taskConfig.id },
      data: { status: AnalysisTaskStatus.running },
    })
    subscriber.next({
      status: TaskStatus.TASK_START,
      message: `任务 "${taskConfig.name}" 已开始`,
    })
  }

  private async _fetchLinks(
    taskConfig: TaskConfig,
    subscriber: Subscriber<TaskProgress>,
  ): Promise<RedditLinkInfoUntrusted[]> {
    subscriber.next({
      status: TaskStatus.FETCH_START,
      message: '正在从 Reddit 抓取帖子...',
    })

    const links = await this.redditService.getHotLinksByQueriesAndSubreddits(
      taskConfig.keywords,
      taskConfig.subreddits,
    )

    // 过滤ups为0的帖子 和 评论数为0的帖子 和 为媒体帖子
    const filteredLinks = links.filter(
      (link) => link.ups > 0 || link.num_comments > 0 || !link.is_video,
    )

    // // 帖子数量大于30时，按照ups排序，取前30个
    // if (filteredLinks.length > 30) {
    //   filteredLinks = filteredLinks.sort((a, b) => b.ups - a.ups).slice(0, 30)
    // }

    if (filteredLinks.length === 0) {
      subscriber.next({
        status: TaskStatus.TASK_CANCEL,
        message: '没有发现任何帖子，任务结束。',
      })
    } else {
      subscriber.next({
        status: TaskStatus.FETCH_COMPLETE,
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
      status: TaskStatus.FILTER_START,
      message: '开始查询缓存，并进行过滤',
    })

    const cacheKeys = links.map((l) => `${this.CACHE_KEY_PREFIX_POST}${l.id}`)
    const cachedValues = await this.cacheManager.mget(cacheKeys)
    const newLinks = links.filter(
      (_, index) => cachedValues[index] === undefined,
    )
    this.logger.log('cacheKeys: ' + cacheKeys)

    if (newLinks.length > 0) {
      const pairsToCache = newLinks.map((p) => ({
        key: `${this.CACHE_KEY_PREFIX_POST}${p.id}`,
        value: 1,
        ttl: this.CACHE_TTL,
      }))
      this.cacheManager.mset(pairsToCache).catch((err) => {
        this.logger.warn('Failed to cache new links in the background', err)
      })
    }

    if (newLinks.length === 0) {
      subscriber.next({
        status: TaskStatus.TASK_CANCEL,
        message: '所有帖子都已被处理过，没有新内容，任务结束。',
      })
    } else {
      subscriber.next({
        status: TaskStatus.FILTER_COMPLETE,
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
    taskConfig: TaskConfig,
    links: RedditLinkInfoUntrusted[],
    subscriber: Subscriber<TaskProgress>,
  ): Promise<RedditLinkInfoUntrusted[]> {
    if (links.length <= this.MAX_LINKS_PER_TASK) {
      return links
    }

    subscriber.next({
      status: TaskStatus.SELECT_START,
      message: `帖子过多（${links.length} > ${this.MAX_LINKS_PER_TASK}），开始筛选...`,
    })

    const linkInfoToSelect = links.map((link) => ({
      id: link.id,
      title: link.title,
      selftext: link.selftext,
    }))

    const filteredLinkIds = await this.selectMostRelevantLinks(
      taskConfig,
      linkInfoToSelect,
    )
    const filteredLinks = links.filter((link) =>
      filteredLinkIds.includes(link.id),
    )

    if (filteredLinks.length === 0) {
      subscriber.next({
        status: TaskStatus.TASK_CANCEL,
        message: '筛选后没有帖子，任务结束。',
      })
    } else {
      subscriber.next({
        status: TaskStatus.SELECT_COMPLETE,
        message: `筛选完成，选出 ${filteredLinks.length} 个最相关的帖子`,
        data: {
          originalCount: links.length,
          uniqueCount: filteredLinks.length,
          links: filteredLinks.map((link) => ({
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
      status: TaskStatus.FETCH_CONTENT_START,
      message: `正在为 ${links.length} 个帖子获取完整内容...`,
    })

    const completeLinkData = await this.redditService.getCommentsByLinkIds(
      links.map((p) => p.id),
    )

    subscriber.next({
      status: TaskStatus.FETCH_CONTENT_COMPLETE,
      message: '获取完整内容完成',
    })
    return completeLinkData
  }

  private async _analyzeContent(
    taskConfig: TaskConfig,
    completeLinkData: {
      content: RedditLinkInfoUntrusted
      comment: CommentNode[]
    }[],
    subscriber: Subscriber<TaskProgress>,
  ) {
    subscriber.next({
      status: TaskStatus.ANALYZE_START,
      message: `正在调用 AI 服务分析 ${completeLinkData.length} 个帖子...`,
      data: { count: completeLinkData.length },
    })

    const analysisResult = await this.analyze(taskConfig, completeLinkData)

    subscriber.next({
      status: TaskStatus.ANALYZE_COMPLETE,
      message: 'AI 分析完成',
    })
    return analysisResult
  }

  private async _saveResults(
    taskConfig: TaskConfig,
    analysisResult: AnalysisReportContent,
    startTime: number,
    subscriber: Subscriber<TaskProgress>,
  ) {
    const executionDuration = performance.now() - startTime

    const [_, taskInfo] = await Promise.all([
      this.prismaService.analysisTask.update({
        where: { id: taskConfig.id },
        data: {
          lastExecutedAt: new Date(),
          status: AnalysisTaskStatus.active,
        },
      }),
      this.analysisService.create({
        taskId: taskConfig.id,
        content: analysisResult,
        executionDuration,
      }),
    ])

    subscriber.next({
      status: TaskStatus.TASK_COMPLETE,
      message: '任务成功执行完毕',
      data: taskInfo,
    })
  }

  private async _handleError(
    error: unknown,
    taskConfig: TaskConfig,
    subscriber: Subscriber<TaskProgress>,
  ) {
    this.logger.error(error)
    await this.prismaService.analysisTask.update({
      where: { id: taskConfig.id },
      data: {
        lastFailureAt: new Date(),
        lastErrorMessage: (error as Error).message,
        status: AnalysisTaskStatus.active,
      },
    })

    subscriber.error({
      status: TaskStatus.TASK_ERROR,
      message: `任务 "${taskConfig.name}" 执行失败`,
    })
  }

  async selectMostRelevantLinks(
    taskConfig: TaskConfig,
    links: { id: string; title: string; selftext: string | undefined }[],
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
        const err = JSON.parse(error.responseBody)
        this.logger.error(err)
        throw new Error(err)
      } else {
        this.logger.error(error)
        throw new Error('无法进行 AI 筛选，请稍后重试')
      }
    }
  }

  async analyze(
    taskConfig: TaskConfig,
    completeLinkData: {
      content: RedditLinkInfoUntrusted
      comment: CommentNode[]
    }[],
  ): Promise<AnalysisReportContent> {
    // TODO: 实现分析逻辑
    return {
      text: '分析结果',
    } as unknown as AnalysisReportContent
  }
}
