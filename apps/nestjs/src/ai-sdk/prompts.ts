/**
 * @fileoverview 该文件包含AI SDK使用的所有提示.
 */

import { CommentNode, RedditLinkInfoUntrusted } from '@redgent/types/reddit'

export const selectMostRelevantLinksPrompt = (
  taskPrompt: string,
  links: { id: string; title: string; selftext: string }[],
  MAX_LINKS_PER_TASK: number = 10,
) => `
      你是一个专业的内容筛选助手，任务是从给定的帖子列表中找出与用户想要关注的内容最相关的帖子。
      用户给出的任务内容：${taskPrompt}

      - 给定帖子列表，找出${MAX_LINKS_PER_TASK}个最有价值，且与用户想要关注的内容最相关的帖子。
      - 控制输出的数量大概在${MAX_LINKS_PER_TASK}个上下。
      - 以JSON数组的格式返回找到的帖子的id，即使只有一个结果，也要确保它在数组中。
      - 排除明显与用户想要关注的内容无关的帖子。
      - 如果没有找到相关的帖子，请返回一个空数组
      
      给定的帖子内容：${JSON.stringify(links, null, 2)}

      - 期待的输出格式，数组内数据不可重复：
      [
        "link-1",
        "link-2",
        "link-3",
        ...
      ]
      `

export const analyzeRedditContentPrompt = (
  taskPrompt: string,
  completeLinkData: {
    content: RedditLinkInfoUntrusted
    comment: CommentNode[]
  }[],
) => `
你是一个专业的内容分析师，负责分析 Redgent 定时在 Reddit 上抓取的讨论内容，并生成结构化的分析报告。

用户的分析任务：${taskPrompt}

请分析以下 Reddit 帖子及其评论内容，并生成一份详细的分析报告。

分析的内容包括：
${completeLinkData
  .map(
    (data) => `
- ID: ${data.content.id}
- 标题: ${data.content.title}
- 内容: ${data.content.selftext || '(无文本内容)'}
- 点赞数: ${data.content.ups}
- 评论数: ${data.content.num_comments}

### 主要评论:
${data.comment
  .map(
    (comment, i) => `
${i + 1}. ${comment.body} (点赞: ${comment.ups})
`,
  )
  .join('')}
`,
  )
  .join('\n')}

请根据以上内容生成一个结构化的分析报告，包含：

1. **报告标题** (title): 简洁明了地总结本次分析的主题
2. **总体摘要** (overallSummary): 对所有讨论内容的整体趋势、观点和情况进行概括
3. **具体发现** (findings): 一个数组，每个发现包含：
   - point: 发现的要点或趋势（简洁的小标题）
   - elaboration: 对该要点的详细阐述和分析
   - supportingPostIds: 支持该发现的帖子ID列表

要求：
- 重点关注与用户任务相关的内容
- 识别讨论中的主要观点、趋势和情绪
- 提供客观、有见地的分析
- 确保每个发现都有明确的证据支持
- 使用中文生成分析报告
`
