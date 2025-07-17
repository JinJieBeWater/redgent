import { Injectable, Logger } from '@nestjs/common';
import { TaskExecutionService } from './task-execution.service';

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  constructor(private readonly taskExecutionService: TaskExecutionService) {}
}
