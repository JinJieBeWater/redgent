import { Inject, Injectable, Logger } from '@nestjs/common'
import { RedditService } from '../reddit/reddit.service'
import { AiSdkService } from '../ai-sdk/ai-sdk.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import { Observable, Subscriber } from 'rxjs'
import {
  TaskConfig,
  TaskProgress,
  TaskStatus,
} from '@redgent/types/analysis-task'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'
import { AnalysisReportService } from '../analysis-report/analysis-report.service'
import { AnalysisTaskStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AnalysisTaskExecutionService {
  private readonly CACHE_KEY_PREFIX = 'redgent'
  private readonly CACHE_KEY_PREFIX_POST = this.CACHE_KEY_PREFIX + ':link:'
  private readonly CACHE_TTL = 1000 * 60 * 60 * 36 // 36 hours
  private readonly MAX_LINKS_PER_TASK = 10
  private readonly logger = new Logger(AnalysisTaskExecutionService.name)

  constructor(
    private readonly redditService: RedditService,
    private readonly aisdkService: AiSdkService,
    private readonly analysisService: AnalysisReportService,
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 执行任务并以流的形式返回进度更新
   * @param taskConfig 任务配置
   * @returns 返回一个 Observable，它会推送 TaskProgress 对象
   */
  execute(taskConfig: TaskConfig): Observable<TaskProgress> {
    // 使用 new Observable 包装整个异步过程
    return new Observable((subscriber: Subscriber<TaskProgress>) => {
      const run = async () => {
        try {
          // 记录开始时间
          const now = performance.now()
          // 标记任务正在执行
          await this.prismaService.analysisTask.update({
            where: {
              id: taskConfig.id,
            },
            data: {
              status: AnalysisTaskStatus.running,
            },
          })

          // 1. 开始任务
          subscriber.next({
            status: TaskStatus.TASK_START,
            message: `任务 "${taskConfig.name}" 已开始`,
          })

          const {
            id: taskId,
            subreddits,
            keywords,
            enableFiltering,
          } = taskConfig

          // 2. 开始抓取帖子
          subscriber.next({
            status: TaskStatus.FETCH_START,
            message: '正在从 Reddit 抓取帖子...',
          })

          const links: RedditLinkInfoUntrusted[] =
            await this.redditService.getHotLinksByQueriesAndSubreddits(
              keywords,
              subreddits,
            )

          subscriber.next({
            status: TaskStatus.FETCH_COMPLETE,
            message: `从 Reddit 抓取到 ${links.length} 个帖子`,
            data: { count: links.length },
          })

          // 3. 未抓取到帖子，结束任务
          if (links.length === 0) {
            subscriber.next({
              status: TaskStatus.TASK_CANCEL,
              message: '没有发现任何帖子，任务结束。',
            })
            subscriber.complete()
            return
          }

          // 4. taskConfig.enableFiltering 为 true 时，启动过滤机制
          let uniqueLinks = links
          if (enableFiltering) {
            subscriber.next({
              status: TaskStatus.FILTER_START,
              message: '开始查询缓存，并进行过滤',
            })

            const originalLinkCount = links.length
            const cacheKeys = links.map(
              (p) => `${this.CACHE_KEY_PREFIX_POST}${p.id}`,
            )
            const cachedValues = await this.cacheManager.mget(cacheKeys)

            const newLinks: RedditLinkInfoUntrusted[] = []
            links.forEach((link, index) => {
              if (cachedValues[index] === undefined) {
                newLinks.push(link)
              }
            })

            uniqueLinks = newLinks

            if (uniqueLinks.length > 0) {
              const pairsToCache = uniqueLinks.map((p) => ({
                key: `${this.CACHE_KEY_PREFIX_POST}${p.id}`,
                value: 1,
                ttl: this.CACHE_TTL,
              }))
              // 移除 await，让它在后台执行，不阻塞主流程
              this.cacheManager.mset(pairsToCache).catch((err) => {
                this.logger.warn(
                  'Failed to cache new links in the background',
                  err,
                )
              })
            }

            subscriber.next({
              status: TaskStatus.FILTER_COMPLETE,
              message: `缓存查询完成，发现 ${uniqueLinks.length} 个新帖子`,
              data: {
                originalCount: originalLinkCount,
                uniqueCount: uniqueLinks.length,
              },
            })
          }

          // 5. 过滤后的帖子为空，结束任务
          if (uniqueLinks.length === 0) {
            subscriber.next({
              status: TaskStatus.TASK_CANCEL,
              message: '所有帖子都已被处理过，没有新内容，任务结束。',
            })
            subscriber.complete()
            return
          }

          // 6. 判断帖子是否过多，如果过多则进行筛选
          if (uniqueLinks.length > this.MAX_LINKS_PER_TASK) {
            subscriber.next({
              status: TaskStatus.SELECT_START,
              message: `帖子过多，开始筛选流程...`,
            })

            const filteredLinks =
              await this.aisdkService.selectMostRelevantLinks(
                taskConfig,
                uniqueLinks,
              )

            subscriber.next({
              status: TaskStatus.SELECT_COMPLETE,
              message: `筛选完成，发现 ${filteredLinks.length} 个最相关的帖子`,
              data: {
                originalCount: uniqueLinks.length,
                uniqueCount: filteredLinks.length,
              },
            })

            uniqueLinks = filteredLinks
          }

          // 7.筛选后的帖子为空，结束任务
          if (uniqueLinks.length === 0) {
            subscriber.next({
              status: TaskStatus.TASK_CANCEL,
              message: '没有相关帖子，任务结束。',
            })
            subscriber.complete()
            return
          }

          // 8. 开始获取完整内容
          subscriber.next({
            status: TaskStatus.FETCH_CONTENT_START,
            message: '正在从 Reddit 获取完整内容...',
          })

          const completeLinkData =
            await this.redditService.getCommentsByLinkIds(
              uniqueLinks.map((p) => p.id),
            )

          subscriber.next({
            status: TaskStatus.FETCH_CONTENT_COMPLETE,
            message: '获取完整内容完成',
          })

          // 8. 开始分析帖子
          subscriber.next({
            status: TaskStatus.ANALYZE_START,
            message: `正在调用 AI 服务分析 ${uniqueLinks.length} 个帖子...`,
            data: { count: uniqueLinks.length },
          })

          const analysisResult = await this.aisdkService.analyze(
            taskConfig,
            completeLinkData,
          )

          subscriber.next({
            status: TaskStatus.ANALYZE_COMPLETE,
            message: 'AI 分析完成',
          })

          // 9. 保存结果

          // 记录结束时间
          const end = performance.now()
          const executionDuration = end - now

          // 使用 Promise.all 并行执行两个独立的数据库写入操作
          const [_, taskInfo] = await Promise.all([
            this.prismaService.analysisTask.update({
              where: {
                id: taskConfig.id,
              },
              data: {
                lastExecutedAt: new Date(),
                status: AnalysisTaskStatus.active,
              },
            }),
            this.analysisService.create({
              taskId,
              content: analysisResult,
              executionDuration,
            }),
          ])

          // 10. 完成任务
          subscriber.next({
            status: TaskStatus.TASK_COMPLETE,
            message: '任务成功执行完毕',
            data: taskInfo,
          })

          subscriber.complete()
        } catch (error) {
          this.logger.error(error)
          // 修改任务信息 添加上次失败时间 和 错误信息
          await this.prismaService.analysisTask.update({
            where: {
              id: taskConfig.id,
            },
            data: {
              lastFailureAt: new Date(),
              lastErrorMessage: (error as Error).message,
              status: AnalysisTaskStatus.active,
            },
          })

          // TODO：后续完成任务调度功能后可以重启限定次数的任务

          // 发生错误时，发射一个 error 状态并结束流
          subscriber.error({
            status: TaskStatus.TASK_ERROR,
            message: `任务 "${taskConfig.name}" 执行失败`,
          })
        }
      }

      void run()
    })
  }
}
