import { applyDecorators, Injectable } from '@nestjs/common'
import { DiscoveryService } from '@nestjs/core'

export const BaseTrpcRouter = DiscoveryService.createDecorator()

export function TrpcRouter(name?: string) {
  return applyDecorators(Injectable(), BaseTrpcRouter(name))
}
