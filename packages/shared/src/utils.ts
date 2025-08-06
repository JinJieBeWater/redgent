/**
 * 格式化间隔时间，提供更直观的时间显示
 * @param interval 间隔时间，单位为毫秒
 * @returns 格式化后的字符串，如"每天"、"每4小时"、"每30分钟"
 */
export const formatIntervalTime = (interval: number) => {
  const seconds = Math.floor(interval / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  // 优先显示最大时间单位，使表达更简洁
  if (days > 0) {
    // 如果正好是天数的倍数
    if (hours % 24 === 0) {
      return days === 1 ? '每天' : `每${days}天`
    }
    // 包含天数的混合时间
    const remainingHours = hours % 24
    if (remainingHours > 0) {
      return `每${days}天${remainingHours}小时`
    }
  }

  if (hours > 0) {
    // 如果正好是小时数的倍数
    if (minutes % 60 === 0) {
      return hours === 1 ? '每小时' : `每${hours}小时`
    }
    // 包含小时的混合时间
    const remainingMinutes = minutes % 60
    if (remainingMinutes > 0) {
      return `每${hours}小时${remainingMinutes}分钟`
    }
  }

  if (minutes > 0) {
    // 如果正好是分钟数的倍数
    if (seconds % 60 === 0) {
      return minutes === 1 ? '每分钟' : `每${minutes}分钟`
    }
    // 包含分钟的混合时间
    const remainingSeconds = seconds % 60
    if (remainingSeconds > 0) {
      return `每${minutes}分钟${remainingSeconds}秒`
    }
  }

  // 仅秒数
  return seconds === 1 ? '每秒' : `每${seconds}秒`
}
