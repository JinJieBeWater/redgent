# 🖥️ Redgent Core - 后端服务

## 📋 概述

Core 服务是 Redgent 项目的核心后端，基于 NestJS 框架构建，提供：

- **AI Agent**: 基于 AI SDK 的智能对话
- **tRPC API**: 类型安全的端到端 API 接口
- **任务调度**: 支持 Cron 和 Interval 的灵活调度系统
- **数据抓取**: Reddit 数据源适配器和内容分析

## 🏗️ 项目结构

```
src/
├── common/                 # 通用工具和常量
│   ├── constants/         # 应用常量定义
│   ├── dto/              # 数据传输对象
│   └── helpers/          # 工具函数
├── modules/               # 业务模块
│   ├── ai-sdk/           # AI SDK 集成和提示词管理
│   ├── reddit/           # Reddit 数据源
│   ├── report/           # 任务报告 Router
│   ├── task/             # 任务 Router
│   ├── task-agent/       # AI Agent 对话
│   ├── task-execution/   # 任务执行引擎
│   └── task-schedule/    # 定时任务调度器
├── processors/           # 核心处理器
│   ├── ee/              # 事件发射器
│   ├── prisma/          # 数据库连接和配置
│   └── trpc/            # tRPC 路由处理器
└── shared/              # 共享类型
    ├── index.ts         # 导出声明
    ├── tool.ts          # 工具类型
    └── trpc.ts          # tRPC 类型
```
