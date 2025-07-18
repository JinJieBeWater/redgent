import { Injectable, Logger } from '@nestjs/common'
import { RedditLinkInfoUntrusted } from '@redgent/types/reddit'
import { TaskConfig } from '@redgent/types/analysis-task'
import { registry } from './registry'
import { generateText } from 'ai'
import { CommentNode } from '../reddit/reddit.service'
import { AnalysisReport } from '@redgent/types/analysis-report'

@Injectable()
export class AiSdkService {
  private readonly logger = new Logger(AiSdkService.name)

  constructor() {}

  /** 从过多link中筛选出最有价值最相关的link */
  async selectMostRelevantLinks(
    taskConfig: TaskConfig,
    links: RedditLinkInfoUntrusted[],
  ) {
    // TODO: 实现筛选逻辑
    return links
  }

  /** 分析任务 */
  async analyze(
    taskConfig: TaskConfig,
    completeLinkData: {
      content: RedditLinkInfoUntrusted
      comment: CommentNode[]
    }[],
  ): Promise<AnalysisReport> {
    // TODO: 实现分析逻辑

    const linkInfoToAnalyze = completeLinkData.map((link) => {
      const { content: linkContent, comment: linkComment } = link

      return {
        id: link.content.id,
        title: linkContent.title,
        selftext: linkContent.selftext,
        permalink: linkContent.permalink,
        created_utc: linkContent.created_utc,
        linkComment: linkComment,
      }
    })

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
