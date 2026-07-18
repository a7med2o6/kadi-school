FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS dev
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared-schema/package.json ./packages/shared-schema/package.json
RUN pnpm install --frozen-lockfile
COPY . .
WORKDIR /workspace/apps/api
EXPOSE 3001
CMD ["pnpm", "dev"]
