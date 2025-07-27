import { PrismaClient, ScheduleType, Task, TaskStatus } from '@redgent/db'

const prisma = new PrismaClient()

const testTasks: Omit<
  Task,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'lastExecutedAt'
  | 'lastFailureAt'
  | 'lastErrorMessage'
  | 'results'
  | 'enableFiltering'
>[] = [
  {
    name: 'AI技术追踪',
    prompt: '分析最新的AI技术动态和讨论，重点关注GPT、Claude等大语言模型的发展',
    keywords: ['AI', 'GPT', 'Claude', 'LLM', 'machine learning'],
    subreddits: ['MachineLearning', 'artificial', 'ChatGPT'],
    scheduleType: ScheduleType.cron,
    scheduleExpression: '0 9 * * *', // 每天早上9点
    status: TaskStatus.active,
  },
  {
    name: '加密货币市场监控',
    prompt:
      '监控加密货币市场动态，分析用户对比特币、以太坊等主要币种的讨论和情绪',
    keywords: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'DeFi'],
    subreddits: ['CryptoCurrency', 'Bitcoin', 'ethereum'],
    scheduleType: ScheduleType.interval,
    scheduleExpression: '3600000', // 每小时执行一次
    status: TaskStatus.active,
  },
  {
    name: '游戏行业趋势',
    prompt: '收集游戏行业最新趋势，包括新游戏发布、更新、玩家反馈等',
    keywords: ['gaming', 'steam', 'nintendo', 'playstation', 'xbox'],
    subreddits: ['gaming', 'Games', 'GameDeals'],
    scheduleType: ScheduleType.cron,
    scheduleExpression: '0 12,18 * * *', // 每天12点和18点
    status: TaskStatus.active,
  },
  {
    name: '技术新闻汇总',
    prompt: '汇总最新的科技新闻和讨论，关注大型科技公司动态',
    keywords: ['tech', 'apple', 'google', 'microsoft', 'startup'],
    subreddits: ['technology', 'programming', 'startups'],
    scheduleType: ScheduleType.cron,
    scheduleExpression: '0 12,18 * * *',
    status: TaskStatus.active,
  },
  {
    name: '娱乐笑话',
    prompt: '每十分钟提供一些娱乐笑话，为我快速创造时间感，提高情绪和生活质量',
    keywords: ['funny', 'funny_memes', 'memes', 'jokes', 'humor'],
    subreddits: ['funny', 'funny_memes'],
    scheduleType: ScheduleType.cron,
    scheduleExpression: '0 */10 * * *',
    status: TaskStatus.active,
  },
]

async function seedTestTasks() {
  console.log('🌱 开始插入测试任务数据...')

  try {
    // 清除现有测试数据（可选）
    const existingCount = await prisma.task.count()
    console.log(`📊 当前数据库中有 ${existingCount} 个任务`)

    // 插入测试数据
    for (const task of testTasks) {
      const createdTask = await prisma.task.create({
        data: task,
      })
      console.log(`✅ 创建任务: ${createdTask.name} (ID: ${createdTask.id})`)
    }

    console.log(`🎉 成功插入 ${testTasks.length} 个测试任务`)

    // 显示统计信息
    const totalTasks = await prisma.task.count()
    const activeTasks = await prisma.task.count({
      where: { status: TaskStatus.active },
    })
    const pausedTasks = await prisma.task.count({
      where: { status: TaskStatus.paused },
    })

    console.log('\n📈 数据库统计:')
    console.log(`  总任务数: ${totalTasks}`)
    console.log(`  激活任务: ${activeTasks}`)
    console.log(`  暂停任务: ${pausedTasks}`)
  } catch (error) {
    console.error('❌ 插入测试数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedTestTasks()
}

export { seedTestTasks }
