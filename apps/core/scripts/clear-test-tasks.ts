import { PrismaClient } from '@redgent/db/client'

const prisma = new PrismaClient()

async function clearTestTasks() {
  console.log('🧹 开始清除测试任务数据...')

  try {
    // 显示清除前的统计信息
    const beforeCount = await prisma.task.count()
    const reportCount = await prisma.taskReport.count()

    console.log(`📊 清除前统计:`)
    console.log(`  任务数: ${beforeCount}`)
    console.log(`  报告数: ${reportCount}`)

    if (beforeCount === 0) {
      console.log('✨ 数据库已经是空的，无需清除')
      return
    }

    // 由于外键约束，需要先删除报告，再删除任务
    const deletedReports = await prisma.taskReport.deleteMany({})
    console.log(`🗑️  删除了 ${deletedReports.count} 个报告`)

    const deletedTasks = await prisma.task.deleteMany({})
    console.log(`🗑️  删除了 ${deletedTasks.count} 个任务`)

    // 显示清除后的统计信息
    const afterTaskCount = await prisma.task.count()
    const afterReportCount = await prisma.taskReport.count()

    console.log('\n📈 清除后统计:')
    console.log(`  任务数: ${afterTaskCount}`)
    console.log(`  报告数: ${afterReportCount}`)

    console.log('✅ 数据清除完成!')
  } catch (error) {
    console.error('❌ 清除数据失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  void clearTestTasks()
}

export { clearTestTasks }
