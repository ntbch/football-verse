FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN --mount=type=cache,id=football-verse-npm,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline

COPY src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,id=football-verse-npm,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund --prefer-offline

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/worker.js"]
