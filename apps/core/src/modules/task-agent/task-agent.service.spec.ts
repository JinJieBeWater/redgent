import { Test, TestingModule } from '@nestjs/testing'
import { generateId } from 'ai'
import { Mocked } from 'vitest'

import { TaskStatus } from '@redgent/db'

import { createMockTaskConfig } from '../../../test/data-factory'
import { createMockContext, MockedContext } from '../../../test/mocks'
import { PrismaService } from '../../processors/prisma/prisma.service'
import { TrpcRouter } from '../../processors/trpc/trpc.router'
import { TaskExecutionService } from '../task-execution/task-execution.service'
import { TaskScheduleService } from '../task-schedule/task-schedule.service'
import { TaskAgentService } from './task-agent.service'

// 使用数据工厂创建测试任务
const mockTask = createMockTaskConfig({
  name: '测试任务',
  status: TaskStatus.active,
  scheduleType: 'interval',
  scheduleExpression: '5m',
  enableCache: false,
})

describe(TaskAgentService.name, () => {
  let service: TaskAgentService
  let prismaService: MockedContext['prisma']
  let taskScheduleService: Mocked<TaskScheduleService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAgentService,
        {
          provide: PrismaService,
          useValue: createMockContext().prisma,
        },
        {
          provide: TaskScheduleService,
          useValue: {
            registerTask: vi.fn(),
            removeTask: vi.fn(),
          },
        },
        {
          provide: TaskExecutionService,
          useValue: {
            execute: vi.fn(),
          },
        },
        {
          provide: TrpcRouter,
          useValue: {
            caller: {
              task: {
                paginate: vi.fn(),
                detail: vi.fn(),
              },
              report: {
                paginate: vi.fn(),
                paginateByTaskId: vi.fn(),
                byId: vi.fn(),
              },
            },
          },
        },
      ],
    }).compile()

    service = module.get(TaskAgentService)
    prismaService = module.get(PrismaService)
    taskScheduleService = module.get(TaskScheduleService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('应该被正确定义', () => {
    expect(service).toBeDefined()
  })

  describe('switchTaskStatus 工具', () => {
    let switchTaskStatusTool: ReturnType<
      typeof service.tools
    >['switchTaskStatus']

    beforeEach(() => {
      switchTaskStatusTool = service.tools().switchTaskStatus
    })

    it('应该成功切换单个任务状态为active并注册调度', async () => {
      const updatedTask = createMockTaskConfig({
        ...mockTask,
        status: TaskStatus.active,
      })

      const inputData = {
        tasks: [
          {
            id: updatedTask.id,
            status: TaskStatus.active,
          },
        ],
      }
      prismaService.task.update.mockResolvedValue(updatedTask)

      const result = await switchTaskStatusTool.execute!(inputData, {
        toolCallId: generateId(),
        messages: [],
      })

      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        data: { status: TaskStatus.active },
      })
      expect(taskScheduleService.registerTask).toHaveBeenCalledWith(updatedTask)
      expect(taskScheduleService.removeTask).not.toHaveBeenCalled()
      expect(result).toEqual([
        expect.objectContaining({
          id: updatedTask.id,
          status: updatedTask.status,
        }),
      ])
    })

    it('应该成功切换单个任务状态为paused并移除调度', async () => {
      const inputData = {
        tasks: [
          {
            id: mockTask.id,
            status: TaskStatus.paused,
          },
        ],
      }
      const updatedTask = createMockTaskConfig({
        ...mockTask,
        status: TaskStatus.paused,
      })

      prismaService.task.update.mockResolvedValue(updatedTask)

      const result = await switchTaskStatusTool.execute!(inputData, {
        toolCallId: generateId(),
        messages: [],
      })

      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        data: { status: TaskStatus.paused },
      })
      expect(taskScheduleService.removeTask).toHaveBeenCalledWith(
        updatedTask.id,
      )
      expect(taskScheduleService.registerTask).not.toHaveBeenCalled()
      expect(result).toEqual([
        expect.objectContaining({
          id: updatedTask.id,
          status: updatedTask.status,
        }),
      ])
    })

    it('应该成功切换多个任务状态', async () => {
      const mockTask2 = createMockTaskConfig({
        name: '测试任务2',
      })

      const inputData = {
        tasks: [
          { id: mockTask.id, status: TaskStatus.active },
          { id: mockTask2.id, status: TaskStatus.paused },
        ],
      }

      const updatedTask1 = createMockTaskConfig({
        ...mockTask,
        status: TaskStatus.active,
      })
      const updatedTask2 = createMockTaskConfig({
        ...mockTask2,
        status: TaskStatus.paused,
      })

      prismaService.task.update
        .mockResolvedValueOnce(updatedTask1)
        .mockResolvedValueOnce(updatedTask2)

      const result = await switchTaskStatusTool.execute!(inputData, {
        toolCallId: generateId(),
        messages: [],
      })

      expect(prismaService.task.update).toHaveBeenCalledTimes(2)
      expect(prismaService.task.update).toHaveBeenNthCalledWith(1, {
        where: { id: mockTask.id },
        data: { status: TaskStatus.active },
      })
      expect(prismaService.task.update).toHaveBeenNthCalledWith(2, {
        where: { id: mockTask2.id },
        data: { status: TaskStatus.paused },
      })

      expect(taskScheduleService.registerTask).toHaveBeenCalledWith(
        updatedTask1,
      )
      expect(taskScheduleService.removeTask).toHaveBeenCalledWith(
        updatedTask2.id,
      )

      expect(result).toEqual([
        expect.objectContaining({
          id: updatedTask1.id,
          status: updatedTask1.status,
        }),
        expect.objectContaining({
          id: updatedTask2.id,
          status: updatedTask2.status,
        }),
      ])
    })

    it('应该在数据库更新失败时抛出错误', async () => {
      const inputData = {
        tasks: [
          {
            id: mockTask.id,
            status: TaskStatus.active,
          },
        ],
      }

      const dbError = new Error('数据库连接失败')

      prismaService.task.update.mockRejectedValue(dbError)

      await expect(
        switchTaskStatusTool.execute!(inputData, {
          toolCallId: generateId(),
          messages: [],
        }),
      ).rejects.toThrow(dbError)
      expect(taskScheduleService.registerTask).not.toHaveBeenCalled()
      expect(taskScheduleService.removeTask).not.toHaveBeenCalled()
    })
  })
})
