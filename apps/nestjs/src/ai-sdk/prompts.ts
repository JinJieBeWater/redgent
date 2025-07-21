/**
 * @fileoverview 该文件包含AI SDK使用的所有提示.
 */

export const selectMostRelevantLinksPrompt = (
  prompt: string,
  links: { id: string; title: string; selftext: string | undefined }[],
  MAX_LINKS_PER_TASK: number = 10,
) => `
      你是一个专业的内容筛选助手，任务是从给定的帖子列表中找出与用户想要关注的内容最相关的帖子。
      用户给出的任务内容：${prompt}

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
