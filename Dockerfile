# 基础镜像
FROM node:24-alpine3.21 AS base

# 时区设置
ARG TZ=Asia/Shanghai
ENV TZ=${TZ}
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/${TZ} /etc/localtime \
    && echo ${TZ} > /etc/timezone

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 构建阶段
FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app

# 安装系统依赖
# RUN apk add --no-cache openssl3 curl

# 安装项目依赖
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# 生成数据库客户端
RUN pnpm dlx turbo run db:generate

# 构建所有项目
RUN pnpm dlx turbo run build

# 部署生产依赖
RUN pnpm deploy --filter=core --prod /prod/core
RUN pnpm deploy --filter=web --prod /prod/web

# 复制必要文件到对应服务
RUN cp -r /usr/src/app/packages/database/src/generated/prisma/*.node /prod/core/node_modules/@redgent/db/dist
RUN cp /usr/src/app/apps/web/nginx.conf /prod/web

# Core 服务 (NestJS 后端)
FROM base AS core
COPY --from=build /prod/core /prod/core
WORKDIR /prod/core

EXPOSE 3001
CMD [ "node", "./dist/src/main.js" ]

# Web 服务 (React 前端)
FROM nginx:stable-alpine AS web
COPY --from=build /prod/web/dist /usr/share/nginx/html
COPY --from=build /prod/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
