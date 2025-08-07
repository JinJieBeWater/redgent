# 🌐 Redgent Web - 前端应用

## 📋 概述

Web 应用是 Redgent 项目的前端界面，基于 React 19 和 Tanstack Router、TanStack Query 等现代技术栈构建。

- **AI Agent 对话**: 自然语言交互的任务创建体验
- **Generative UI**: 动态生成的用户界面组件
- **实时更新**: 基于 SSE 的任务状态实时推送
- **响应式设计**: 支持桌面端和移动端的自适应布局
- **类型安全**: 端到端的 TypeScript 类型支持

## 🏗️ 项目结构

```
src/
├── components/            # React 组件
│   ├── message/          # 消息相关组件
│   ├── ui/               # shadcn/ui 基础组件
│   ├── app-header.tsx    # 应用头部
│   ├── form-component.tsx # 表单组件
│   ├── markdown.tsx      # Markdown 渲染
│   ├── mode-toggle.tsx   # 主题切换
│   ├── spinner.tsx       # 加载动画
│   ├── task.tsx          # 任务组件
│   └── theme-provider.tsx # 主题提供者
├── hooks/                # 自定义 React Hooks
├── lib/                  # 工具函数库
├── routes/               # 路由组件
│   ├── __root.tsx        # 根路由布局
│   └── index.tsx         # 首页路由
├── main.tsx              # 应用入口
├── router.tsx            # Trpc 路由配置
└── styles.css            # 全局样式
```
