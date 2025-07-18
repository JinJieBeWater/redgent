/**
 * @fileoverview 该文件包含AI SDK使用的所有提示.
 */

/**
 * 前端对话相关的提示词
 * 用于与用户进行自然语言交互的对话提示
 */
export const frontendPrompts = {
  /**
   * 用于获取用户意图
   */
  getUserIntent: `
从以下用户输入中提取用户意图：
用户输入: {userInput}
请分析用户的意图，并返回一个简洁的描述。
确保描述清晰且易于理解，能够准确反映用户的需求和期望
`.trim(),

  /**
   * 用于从关键字派生出更多相关关键词的提示词。
   */
  deriveKeywords: `
从以下关键词派生出更多相关的长尾关键词：
关键词: {keywords}
用户意图: {userIntent}
请生成至少5个相关的长尾关键词，确保它们与原关键词紧密相关，并能覆盖用户可能的搜索意图。
`.trim(),

  /**
   * 用于从subreddit列表中筛选最相关社区的提示词。
   */
  filterSubreddits: `
从以下subreddit列表中筛选出最相关的社区：
subreddit列表: {subreddits}
用户意图: {userIntent}
请根据用户的兴趣和意图，选择最相关的社区，并提供理由。
确保选择的社区能够最大程度地满足用户的需求。
`.trim(),
}

/**
 * 分析任务相关的提示词
 * 用于后台数据分析和处理任务
 */
export const analysisPrompts = {
  /**
   * 用于识别热门话题和趋势
   */
  analyze: `
分析以下Reddit数据，识别热门话题和趋势，提取趋势和关键观点，数据按照热度降序排列：
帖子数据: {linksData}
`.trim(),
}

/**
 * 统一的提示词导出
 */
export const prompts = {
  ...frontendPrompts,
  ...analysisPrompts,
}
