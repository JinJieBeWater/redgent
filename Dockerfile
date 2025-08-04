FROM node:24-alpine3.21 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN apk add --no-cache openssl3
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm dlx turbo run db:generate
RUN ls -la /usr/src/app/packages/database/generated/prisma/

RUN pnpm dlx turbo run build
RUN pnpm deploy --filter=core --prod /prod/core
RUN pnpm deploy --filter=web --prod /prod/web
# 将 generated 复制到 core 下
RUN cp -r /usr/src/app/packages/database/generated /prod/core
# 检查
RUN ls -la /prod/core/generated/prisma/

FROM base AS core
COPY --from=build /prod/core /prod/core
WORKDIR /prod/core
EXPOSE 3001
CMD [ "node", "./dist/src/main.js" ]

FROM base AS web
COPY --from=build /prod/web /prod/web
WORKDIR /prod/web
EXPOSE 3000
CMD [ "pnpm", "start" ]
