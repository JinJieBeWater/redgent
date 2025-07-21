/**
 * @fileoverview 该文件包含AI SDK使用的所有提示.
 */

export const selectMostRelevantLinksPrompt = (
  prompt: string,
  links: { id: string; title: string; selftext: string | undefined }[],
) => `
      给定帖子数组，找出最有价值，且与用户想要关注的内容最相关的帖子。
      以JSON数组的格式返回找到的帖子的id，即使只有一个结果，也要确保它在数组中。

      用户给出的任务内容：${prompt}

      给定的帖子内容：${JSON.stringify(links, null, 2)}
      `
