# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Redgent 是一个基于 NestJS 构建的 Reddit 内容抓取和 AI 分析系统，采用 monorepo 架构。该系统创建定时任务来监控 Reddit 特定主题的讨论，并使用大语言模型生成智能分析报告。

## 开发命令

### 核心命令

- `pnpm dev` - 启动所有应用的开发模式
- `pnpm dev:server` - 仅启动 NestJS 后端服务器
- `pnpm build` - 构建所有包
- `pnpm test` - 运行所有测试（单元 + 集成 + e2e）
- `pnpm test:integration` - 仅运行集成测试
- `pnpm test:e2e` - 仅运行端到端测试
- `pnpm lint` - 检查所有代码
- `pnpm format` - 格式化所有代码
- `pnpm typecheck` - 运行 TypeScript 类型检查

### NestJS 专用命令（在 apps/nestjs/ 目录下）

- `pnpm start:dev` - 启动热重载开发模式
- `pnpm start:debug` - 启动调试模式
- `pnpm test:watch` - 监视模式运行测试
- `pnpm test:cov` - 运行测试并生成覆盖率报告
- `pnpm repl` - 启动 NestJS REPL 用于调试

### 数据库命令

- 脚本位于 `apps/nestjs/scripts/`
- `seed-test-tasks.ts` - 插入测试数据
- `clear-test-tasks.ts` - 清理测试数据

## 架构概览

### 核心模块结构

```
apps/nestjs/src/
├── ai-sdk/              # AI 集成和提示管理
├── task-agent/          # 对话式任务创建接口
├── task-schedule/       # 任务调度和生命周期管理
├── task-execution/      # Reddit 抓取和分析执行
├── reddit/              # Reddit API 集成
├── report/              # 报告生成和存储
└── prisma/              # 数据库服务
```

### 关键架构模式

#### 任务创建流程

1. 用户通过 TaskAgent 对话接口进行交互
2. AI 解析需求并生成结构化任务配置
3. 系统使用 validateTaskConfig 工具验证配置
4. TaskSchedule 模块注册和管理定时任务

#### 任务执行流程

1. 调度器根据 cron/interval 配置触发任务
2. TaskExecution 模块根据任务配置抓取 Reddit 数据
3. AI 分析抓取的内容并生成结构化报告
4. 报告与执行元数据一起存储到数据库

#### 核心数据模型

- **Task**: 包含调度配置、关键词、子版块和状态
- **Report**: 存储 AI 分析结果和执行元数据
- **调度类型**: "cron"（精确时间）vs "interval"（固定间隔）
- **任务状态**: "active"、"paused"、"running"

### AI 集成

- 使用 AI SDK 与 OpenRouter 提供商
- 基于工具的任务管理架构（validateTaskConfig、createTask、updateTask、listAllTasks）
- `ai-sdk/prompts.ts` 中的提示模板用于不同分析场景
- 流式响应实现实时用户交互

### 数据库架构（Prisma）

- PostgreSQL 与 Prisma ORM
- Task 模型包含调度配置、过滤选项和执行跟踪
- Report 模型存储 JSON 分析结果，外键关联到任务
- 迁移文件跟踪架构演进

## 技术栈要求

### 运行时依赖

- Node.js >= 18
- pnpm 9.0.0
- PostgreSQL

### 关键框架版本

- NestJS 11.x 与 TypeScript
- AI SDK 5.0.0-beta.24 与 OpenRouter 集成
- Prisma 6.12.0 用于数据库管理
- Zod 4.x 用于架构验证

### 测试框架

- Jest 用于单元测试（src/ 目录下的 \*.spec.ts 文件）
- 集成测试在 `/integration` 目录
- E2E 测试在 `/test` 目录
- 覆盖率报告生成在 `coverage/` 目录

## 环境配置

### 必需的环境变量

```
NODE_ENV=development|production|test
PORT=8000                    # 服务器端口
PROXY=7890                   # 可选代理端口
REDDIT_CLIENT_ID=            # Reddit API 必需
REDDIT_SECRET=               # Reddit API 必需
OPENROUTER_API_KEY=          # AI 功能必需
DATABASE_URL=                # PostgreSQL 连接字符串
```

### 环境文件

- `.env.development` - 开发配置
- `.env.production` - 生产配置
- `.env.test` - 测试配置

## 开发工作流

### 添加新功能

1. 从当前分支创建功能分支
2. 按照现有模块模式实现更改
3. 添加适当的测试（根据需要进行单元 + 集成测试）

### TaskAgent 工具开发

- 工具在 `task-agent.service.ts` 中定义
- 遵循现有工具模式，使用 Zod 架构验证
- 添加新工具时更新 `ai-sdk/prompts.ts` 中的系统提示
- 工具应返回一致的成功/错误响应格式

### 数据库更改

- 使用 Prisma 迁移进行架构更改
- 使用 seed/clear 脚本测试迁移
- TypeScript 类型将从架构自动生成

## Monorepo 管理

### 工作区结构

- `apps/` - 应用程序（当前仅 NestJS 后端 未来将添加 React 前端）
- `packages/` - 共享包
- `tooling/` - 共享开发配置（ESLint、Prettier、TypeScript）

### Turborepo 任务

- 所有主要任务通过 Turborepo 编排
- 依赖关系根据 package.json 配置自动解析
- 为构建、检查和测试任务启用缓存

### 包管理

- 专门使用 `pnpm` 进行包管理
- 工作区依赖使用 `workspace:*` 协议
- 共享配置集中在工具包中

## 测试指南

### 测试组织

- 单元测试与源文件并列（\*.spec.ts）
- `/integration` 目录中的集成测试用于测试模块交互
- `/test` 目录中的 E2E 测试用于测试完整应用工作流
- 使用 jest-mock-extended 进行复杂的模拟场景

### 覆盖率要求

- 使用 `pnpm test:cov` 生成覆盖率报告
