import { SchedulerRegistry } from '@nestjs/schedule'
import { Test, TestingModule } from '@nestjs/testing'
import { CronJob } from 'cron'
import { Mocked } from 'vitest'

import { ScheduleType, TaskStatus } from '@redgent/db'

import {
  createMockTaskConfig,
  createMockTaskReport,
} from '../../../test/data-factory'
import { createMockContext, MockedContext } from '../../../test/mocks'
import { PrismaService } from '../../processors/prisma/prisma.service'
import { TaskExecutionService } from '../task-execution/task-execution.service'
import { TaskScheduleService } from './task-schedule.service'

describe(TaskScheduleService.name, () => {
  let service: TaskScheduleService
  let prismaService: MockedContext['prisma']
  let schedulerRegistry: Mocked<SchedulerRegistry>

  // 创建测试用的interval任务
  const mockIntervalTask = createMockTaskConfig({
    id: 'test-interval-task',
    name: '测试Interval任务',
    scheduleType: ScheduleType.interval,
    scheduleExpression: '5000', // 5秒间隔
    status: TaskStatus.active,
  })

  // 创建测试用的cron任务
  const mockCronTask = createMockTaskConfig({
    id: 'test-cron-task',
    name: '测试Cron任务',
    scheduleType: ScheduleType.cron,
    scheduleExpression: '0 0 * * *',
    status: TaskStatus.active,
  })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskScheduleService,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: vi.fn(),
            addInterval: vi.fn(),
            deleteCronJob: vi.fn(),
            deleteInterval: vi.fn(),
            doesExist: vi.fn(),
            getCronJob: vi.fn(),
            getCronJobs: vi.fn().mockReturnValue(new Map()),
            getInterval: vi.fn(),
            getIntervals: vi.fn().mockReturnValue([]),
          },
        },
        {
          provide: TaskExecutionService,
          useValue: {
            executeObservable: vi.fn().mockReturnValue({
              subscribe: vi.fn(),
            }),
          },
        },
      ],
    }).compile()

    service = module.get(TaskScheduleService)
    prismaService = module.get(PrismaService)
    schedulerRegistry = module.get(SchedulerRegistry)

    // 模拟数据库查询返回空数组，避免onModuleInit时自动注册任务
    prismaService.task.findMany.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('应该被正确定义', () => {
    expect(service).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('应该从数据库加载并注册所有激活的任务', async () => {
      const tasks = [mockIntervalTask, mockCronTask]
      prismaService.task.findMany.mockResolvedValue(tasks)

      const registerTaskSpy = vi.spyOn(service, 'registerTask')

      await service.onModuleInit()

      expect(prismaService.task.findMany).toHaveBeenCalledWith({
        where: { status: TaskStatus.active },
      })
      expect(registerTaskSpy).toHaveBeenCalledTimes(2)
      expect(registerTaskSpy).toHaveBeenCalledWith(mockIntervalTask)
      expect(registerTaskSpy).toHaveBeenCalledWith(mockCronTask)
    })
  })

  describe('registerTask', () => {
    it('应该注册cron任务', () => {
      const removeTaskSpy = vi.spyOn(service, 'removeTask')

      service.registerTask(mockCronTask)

      expect(removeTaskSpy).toHaveBeenCalledWith(mockCronTask.id)
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        mockCronTask.id,
        expect.any(CronJob),
      )
    })

    it('应该注册interval任务', async () => {
      const removeTaskSpy = vi.spyOn(service, 'removeTask')

      // 模拟没有历史报告的情况
      prismaService.taskReport.findFirst.mockResolvedValue(null)

      service.registerTask(mockIntervalTask)

      // 等待异步操作完成
      await vi.waitFor(() => {
        expect(removeTaskSpy).toHaveBeenCalledWith(mockIntervalTask.id)
        expect(prismaService.taskReport.findFirst).toHaveBeenCalledWith({
          where: { taskId: mockIntervalTask.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
        expect(schedulerRegistry.addInterval).toHaveBeenCalledWith(
          mockIntervalTask.id,
          expect.any(setTimeout(() => {}).constructor),
        )
      })
    })

    it('应该处理无效的interval表达式', async () => {
      const invalidTask = createMockTaskConfig({
        ...mockIntervalTask,
        scheduleExpression: 'invalid',
      })

      const loggerSpy = vi.spyOn(service['logger'], 'error')

      service.registerTask(invalidTask)

      await vi.waitFor(() => {
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('invalid'),
        )
      })
    })
  })

  describe('intervalTaskStates 管理', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该为新的interval任务创建状态记录', async () => {
      // 模拟没有历史报告
      prismaService.taskReport.findFirst.mockResolvedValue(null)
      const executeTaskSpy = vi.spyOn(service as any, 'executeTask')

      service.registerTask(mockIntervalTask)

      const nextExecutionTime =
        Date.now() + Number(mockIntervalTask.scheduleExpression)

      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        expect(intervalTaskStates.has(mockIntervalTask.id)).toBe(true)
        const taskState = intervalTaskStates.get(mockIntervalTask.id)
        expect(taskState?.normalInterval).toBe(
          Number(mockIntervalTask.scheduleExpression),
        )
        expect(taskState?.isCalibrating).toBe(false)
        expect(
          nextExecutionTime - taskState!.nextExecutionTime!.getTime(),
        ).toBeLessThan(50)
        // 应该立即执行一次
        expect(executeTaskSpy).toHaveBeenCalledWith(mockIntervalTask)
      })
    })

    it('应该在有历史报告且未过期时设置正确的延迟', async () => {
      const now = new Date()
      const lastReportTime = new Date(now.getTime() - 2000) // 2秒前

      prismaService.taskReport.findFirst.mockResolvedValue(
        createMockTaskReport({
          createdAt: lastReportTime,
          taskId: mockIntervalTask.id,
        }),
      )

      vi.spyOn(globalThis, 'setInterval') // 监视 setInterval

      service.registerTask(mockIntervalTask)

      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        const taskState = intervalTaskStates.get(mockIntervalTask.id)

        expect(taskState).toBeDefined()
        expect(taskState?.normalInterval).toBe(5000)
        expect(taskState?.isCalibrating).toBe(true)
        expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2950)
      })
    })

    it('应该在有历史报告且已过期时立即执行', async () => {
      const now = new Date()
      const lastReportTime = new Date(now.getTime() - 10000) // 10秒前，超过5秒间隔

      prismaService.taskReport.findFirst.mockResolvedValue(
        createMockTaskReport({
          createdAt: lastReportTime,
          taskId: mockIntervalTask.id,
        }),
      )

      const executeTaskSpy = vi.spyOn(service as any, 'executeTask')

      service.registerTask(mockIntervalTask)

      await vi.waitFor(() => {
        expect(executeTaskSpy).toHaveBeenCalledWith(mockIntervalTask)
      })
    })

    it('应该在校准阶段完成后切换到正常间隔', async () => {
      const now = new Date()
      const lastReportTime = new Date(now.getTime() - 2000) // 2秒前

      prismaService.taskReport.findFirst.mockResolvedValue(
        createMockTaskReport({
          createdAt: lastReportTime,
          taskId: mockIntervalTask.id,
        }),
      )

      const executeTaskSpy = vi.spyOn(service as any, 'executeTask')
      const deleteIntervalSpy = vi.spyOn(schedulerRegistry, 'deleteInterval')
      const addIntervalSpy = vi.spyOn(schedulerRegistry, 'addInterval')

      service.registerTask(mockIntervalTask)

      // 等待初始注册完成
      await vi.waitFor(() => {
        expect(addIntervalSpy).toHaveBeenCalled()
      })

      // 模拟第一次执行（校准阶段）
      vi.advanceTimersByTime(Number(mockIntervalTask.scheduleExpression))

      await vi.waitFor(() => {
        expect(executeTaskSpy).toHaveBeenCalledWith(mockIntervalTask)
        expect(deleteIntervalSpy).toHaveBeenCalledWith(mockIntervalTask.id)
        // 应该重新注册正常间隔
        expect(addIntervalSpy).toHaveBeenCalledTimes(2)
      })

      // 验证状态已更新
      const intervalTaskStates = service['intervalTaskStates']
      const taskState = intervalTaskStates.get(mockIntervalTask.id)
      expect(taskState!.isCalibrating).toBe(false)
      expect(taskState!.normalInterval).toBe(
        Number(mockIntervalTask.scheduleExpression),
      )
    })
  })

  describe('removeTask', () => {
    it('应该移除cron任务', () => {
      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        return type === 'cron' && id === mockCronTask.id
      })

      service.removeTask(mockCronTask.id)

      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        mockCronTask.id,
      )
    })

    it('应该移除interval任务', () => {
      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        return type === 'interval' && id === mockIntervalTask.id
      })

      service.removeTask(mockIntervalTask.id)

      expect(schedulerRegistry.deleteInterval).toHaveBeenCalledWith(
        mockIntervalTask.id,
      )
    })

    it('应该移除interval任务状态', async () => {
      // 先注册一个任务以创建状态
      prismaService.taskReport.findFirst.mockResolvedValue(null)
      service.registerTask(mockIntervalTask)

      // 等待状态创建完成
      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        expect(intervalTaskStates.has(mockIntervalTask.id)).toBe(true)
      })

      // 模拟任务存在
      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        return type === 'interval' && id === mockIntervalTask.id
      })

      service.removeTask(mockIntervalTask.id)

      // 验证状态已被清除
      const intervalTaskStates = service['intervalTaskStates']
      expect(intervalTaskStates.has(mockIntervalTask.id)).toBe(false)
    })
  })

  describe('intervalTaskStates 边界情况', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该处理零间隔的interval任务', async () => {
      const zeroIntervalTask = createMockTaskConfig({
        ...mockIntervalTask,
        scheduleExpression: '0',
      })

      const loggerSpy = vi.spyOn(service['logger'], 'error')

      service.registerTask(zeroIntervalTask)

      await vi.waitFor(() => {
        expect(loggerSpy).toHaveBeenCalled()
      })
    })

    it('应该处理负数间隔的interval任务', async () => {
      const negativeIntervalTask = createMockTaskConfig({
        ...mockIntervalTask,
        scheduleExpression: '-1000',
      })

      const loggerSpy = vi.spyOn(service['logger'], 'error')

      service.registerTask(negativeIntervalTask)

      await vi.waitFor(() => {
        expect(loggerSpy).toHaveBeenCalled()
      })
    })

    it('应该处理任务状态不存在的情况', async () => {
      const loggerSpy = vi.spyOn(service['logger'], 'error')

      // 直接调用私有方法来测试错误处理
      service['calibrateIntervalTask'](
        'non-existent-task',
        5000,
        mockIntervalTask,
      )

      expect(loggerSpy).toHaveBeenCalledWith(
        '任务状态不存在: non-existent-task',
      )
    })

    it('应该在多次注册同一任务时清理旧状态', async () => {
      prismaService.taskReport.findFirst.mockResolvedValue(null)

      // 第一次注册
      service.registerTask(mockIntervalTask)

      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        expect(intervalTaskStates.has(mockIntervalTask.id)).toBe(true)
      })

      const removeTaskSpy = vi.spyOn(service, 'removeTask')

      // 第二次注册同一任务
      service.registerTask(mockIntervalTask)

      expect(removeTaskSpy).toHaveBeenCalledWith(mockIntervalTask.id)
    })
  })

  describe('getNextExecutionTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该返回cron任务的下次执行时间', async () => {
      const mockNextDate = new Date('2024-01-01T12:00:00Z')
      const mockCronJob = {
        nextDates: vi.fn().mockReturnValue([{ toJSDate: () => mockNextDate }]),
      }

      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        return type === 'cron' && id === mockCronTask.id
      })
      schedulerRegistry.getCronJob.mockReturnValue(
        mockCronJob as unknown as CronJob,
      )

      const result = service.getNextExecutionTime(mockCronTask.id)
      expect(result).toBe(mockNextDate)
    })

    it('应该返回interval任务的下次执行时间', async () => {
      const mockNextExecutionTime = new Date('2024-01-01T12:05:00Z')

      // 模拟interval任务存在
      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        if (type === 'cron' && id === mockIntervalTask.id) return false
        if (type === 'interval' && id === mockIntervalTask.id) return true
        return false
      })

      // 手动设置任务状态
      const intervalTaskStates = service['intervalTaskStates']
      intervalTaskStates.set(mockIntervalTask.id, {
        normalInterval: 5000,
        nextExecutionTime: mockNextExecutionTime,
        isCalibrating: false,
      })

      const result = service.getNextExecutionTime(mockIntervalTask.id)

      expect(result).toBe(mockNextExecutionTime)
    })

    it('应该正确处理校准阶段的interval任务的下次执行时间', async () => {
      const now = new Date()
      const lastReportTime = new Date(now.getTime() - 2000) // 2秒前

      prismaService.taskReport.findFirst.mockResolvedValue(
        createMockTaskReport({
          createdAt: lastReportTime,
          taskId: mockIntervalTask.id,
        }),
      )

      // 注册任务（应该进入校准阶段）
      service.registerTask(mockIntervalTask)

      // 等待任务注册完成
      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        const taskState = intervalTaskStates.get(mockIntervalTask.id)
        expect(taskState?.isCalibrating).toBe(true)
      })

      // 模拟scheduler registry状态
      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        if (type === 'cron' && id === mockIntervalTask.id) return false
        if (type === 'interval' && id === mockIntervalTask.id) return true
        return false
      })

      const result = service.getNextExecutionTime(mockIntervalTask.id)

      expect(result).toBeInstanceOf(Date)
      expect(result).toBeDefined()

      // 验证下次执行时间是合理的（应该在3秒左右，因为间隔5秒，已过去2秒）
      const expectedTime = now.getTime() + 3000
      const actualTime = result!.getTime()
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(100) // 允许100ms误差
    })

    it('应该正确处理在校准完成后的interval任务的下次执行时间', async () => {
      const now = new Date()
      const lastReportTime = new Date(now.getTime() - 2000) // 2秒前

      prismaService.taskReport.findFirst.mockResolvedValue(
        createMockTaskReport({
          createdAt: lastReportTime,
          taskId: mockIntervalTask.id,
        }),
      )

      // 注册任务（应该进入校准阶段）
      service.registerTask(mockIntervalTask)

      // 等待任务注册完成
      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        const taskState = intervalTaskStates.get(mockIntervalTask.id)
        expect(taskState?.isCalibrating).toBe(true)
      })

      // 模拟scheduler registry状态
      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        if (type === 'cron' && id === mockIntervalTask.id) return false
        if (type === 'interval' && id === mockIntervalTask.id) return true
        return false
      })

      // 模拟校准阶段执行完成，触发切换到正常间隔
      vi.advanceTimersByTime(3000) // 推进到校准执行时间

      // 等待校准完成
      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        const taskState = intervalTaskStates.get(mockIntervalTask.id)
        expect(taskState?.isCalibrating).toBe(false)
      })

      const result = service.getNextExecutionTime(mockIntervalTask.id)

      expect(result).toBeInstanceOf(Date)
      expect(result).toBeDefined()

      // 校准完成后，下次执行时间应该是正常间隔（5秒）
      const expectedTime = now.getTime() + 5000 + 3000 // 当前时间 + 正常间隔 + 已推进的时间
      const actualTime = result!.getTime()
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(10) // 允许10ms误差
    })

    it('应该在执行过后更新下次执行时间', async () => {
      prismaService.taskReport.findFirst.mockResolvedValue(null)

      // 注册任务
      service.registerTask(mockIntervalTask)

      // 等待任务注册完成
      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        expect(intervalTaskStates.has(mockIntervalTask.id)).toBe(true)
      })

      // 模拟scheduler registry状态
      schedulerRegistry.doesExist.mockImplementation((type, id) => {
        if (type === 'cron' && id === mockIntervalTask.id) return false
        if (type === 'interval' && id === mockIntervalTask.id) return true
        return false
      })

      // 获取初始的下次执行时间
      const initialNextTime = service.getNextExecutionTime(mockIntervalTask.id)
      expect(initialNextTime).toBeDefined()

      // 推进时间到下次执行
      vi.advanceTimersByTime(Number(mockIntervalTask.scheduleExpression))

      // 等待执行完成和状态更新
      await vi.waitFor(() => {
        const intervalTaskStates = service['intervalTaskStates']
        const taskState = intervalTaskStates.get(mockIntervalTask.id)
        expect(taskState?.nextExecutionTime).toBeDefined()
      })

      // 获取更新后的下次执行时间
      const updatedNextTime = service.getNextExecutionTime(mockIntervalTask.id)
      expect(updatedNextTime).toBeDefined()

      // 验证下次执行时间已更新（应该比初始时间晚一个间隔）
      const timeDifference =
        updatedNextTime!.getTime() - initialNextTime!.getTime()
      expect(
        Math.abs(timeDifference - Number(mockIntervalTask.scheduleExpression)),
      ).toBeLessThan(10) // 允许10ms误差
    })
  })
})
