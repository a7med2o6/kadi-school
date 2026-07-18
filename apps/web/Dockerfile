FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS dev
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-schema/package.json ./packages/shared-schema/package.json
RUN pnpm install --frozen-lockfile
COPY . .
WORKDIR /workspace/apps/web
EXPOSE 3000
CMD ["pnpm", "dev"]
