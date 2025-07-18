import { Injectable, Logger } from '@nestjs/common'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'
import { TaskConfig } from '@redgent/types/analysis-task'
import { registry } from './registry'
import { generateText } from 'ai'
import { RedditService } from '../reddit/reddit.service'
import { AnalysisReport } from '@redgent/types/analysis-report'

@Injectable()
export class AiSdkService {
  private readonly logger = new Logger(AiSdkService.name)

  constructor(private readonly redditService: RedditService) {}

  /** 从过多link中筛选出最有价值最相关的link */
  async selectMostRelevantLinks(links: RedditLinkInfoUntrusted[]) {
    // TODO: 实现筛选逻辑
    return links
  }

  /** 分析任务 */
  async analyze(
    taskConfig: TaskConfig,
    links: RedditLinkInfoUntrusted[],
  ): Promise<AnalysisReport> {
    this.logger.log('开始分析...')

    const linkInfoToAnalyze = links.map((link) => ({
      id: link.id,
      title: link.title,
      created_utc: link.created_utc,
      is_video: link.is_video,
      media: link.media,
      permalink: link.permalink,
    }))

    // 通过ai找出最相关的和最有用的link

    // 然后抓取link对应的link的评论

    // 结合link与对应评论交给ai解析

    const { text } = await generateText({
      model: registry.languageModel('openrouter:moonshotai/kimi-k2:free'),
      prompt: `分析以下Reddit数据，识别热门话题和趋势，提取趋势和关键观点，数据按照热度降序排列：
      ${JSON.stringify(linkInfoToAnalyze, null, 2)}
      `,
    })

    return {
      text,
    } as unknown as AnalysisReport
  }
}
