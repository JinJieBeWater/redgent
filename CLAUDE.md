# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

使用中文回答

## 架构概览

Redgent 是基于 Turborepo 的 monorepo 项目，包含以下应用：

- `apps/nestjs`: NestJS 后端服务，包含核心业务逻辑 (端口：3002)
- `apps/web`: Next.js React 前端应用 (端口：3000)

## 核心业务逻辑

### 数据模型 (Prisma)

- **Task**: 任务配置，包含 cron 表达式、关键词、subreddit 列表等
- **Report**: 分析报告，存储 AI 分析 Reddit 内容后的结果
- 支持任务状态：active、paused、running

### 核心服务

- **RedditService**: Reddit API 集成，负责抓取帖子和评论
- **TaskExecutionService**: 任务执行引擎，包含完整的执行流水线
- **ReportService**: 分析报告管理
- **MastraService**: AI 工作流和 Agent 集成

### 任务执行流程

1. **抓取阶段**: 根据 keywords 和 subreddits 从 Reddit 获取帖子
2. **过滤阶段**: 使用缓存机制过滤重复内容（启用 enableFiltering 时）
3. **筛选阶段**: 当帖子数量超过 10 个时，使用 AI 筛选最相关的内容
4. **内容获取**: 获取选中帖子的完整内容和评论
5. **AI 分析**: 调用 LLM 分析内容并生成报告
6. **结果保存**: 将分析结果存储到数据库

## 开发命令

### 根目录

- `pnpm install`: 安装所有依赖
- `pnpm dev`: 启动所有应用的开发服务
- `pnpm dev:server`: 仅启动 NestJS 后端服务
- `pnpm build`: 构建所有应用
- `pnpm lint`: 运行 ESLint 检查
- `pnpm format`: 格式化代码
- `pnpm format-check`: 检查代码格式
- `pnpm typecheck`: 运行 TypeScript 类型检查
- `pnpm test`: 运行所有测试
- `pnpm test:integration`: 运行集成测试
- `pnpm test:e2e`: 运行端到端测试

### NestJS 应用 (apps/nestjs)

- `pnpm run start:dev`: 开发模式启动
- `pnpm run test:cov`: 运行测试并生成覆盖率报告
- `pnpm run repl`: 启动 REPL 调试模式
- `pnpm run mastra`: 启动 Mastra 开发模式

### 数据库操作

- 使用 Prisma 作为 ORM
- 迁移文件位于 `apps/nestjs/prisma/migrations/`
- Schema 定义在 `apps/nestjs/prisma/schema.prisma`

## 环境变量配置

关键环境变量：

- `OPENROUTER_API_KEY`: OpenRouter API 密钥（用于 LLM 调用）
- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `REDDIT_CLIENT_ID`: Reddit API 客户端 ID
- `REDDIT_SECRET`: Reddit API 密钥
- `NODE_ENV`: 运行环境
- `PORT`: 服务端口

## 技术栈和工具

### 后端

- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- AI SDK + OpenRouter（LLM 集成）
- Jest（单元测试）
- 定时任务调度

### 前端

- TanStack Router + React + Shadcn UI
- TypeScript

### 开发工具

- Turborepo（monorepo 管理）
- pnpm（包管理器）
- ESLint + Prettier（代码规范）
- Husky + lint-staged（Git hooks）
- 共享的 TypeScript/ESLint/Prettier 配置包
