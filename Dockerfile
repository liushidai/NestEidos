# ==========================================
# 构建阶段 - 使用 Node.js 构建镜像
# ==========================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖（包括构建工具）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm ci --only=production=false

# 复制源代码（排除不必要的文件）
COPY --chown=nestjs:nodejs . .

# 构建应用
RUN npm run build

# ==========================================
# 生产阶段 - 使用最小化的运行时镜像
# ==========================================
FROM node:18-alpine AS runner

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nestjs

# 设置工作目录
WORKDIR /app

# 从构建阶段复制 package.json
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# 只安装生产依赖
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1) }).on('error', () => process.exit(1))"

# 启动命令
CMD ["node", "dist/main.js"]

# ==========================================
# 开发阶段 - 用于本地开发（可选）
# ==========================================
FROM builder AS development

# 暴露端口
EXPOSE 3000 9229

# 开发模式启动
CMD ["npm", "run", "start:dev"]