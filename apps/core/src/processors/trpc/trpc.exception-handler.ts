import { Catch, Logger } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'

/**
 * TODO: Can't get this to work, see https://github.com/jaequery/ult-stack/issues/1
 */
@Catch()
export class TrpcExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(TrpcExceptionFilter.name)
  catch() {
    this.logger.error('TRPC error')
    // super.catch(exception, host);
  }
}
