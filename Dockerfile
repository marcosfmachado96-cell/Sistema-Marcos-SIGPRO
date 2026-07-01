# ---- Estágio 1: build do frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Estágio 2: backend + serviço do SPA ----
FROM node:20-slim AS app
# openssl é exigido pelo engine do Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY scripts ./scripts
# build do frontend, servido pelo próprio backend
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV SERVE_FRONTEND=true
ENV FRONTEND_DIST=/app/frontend/dist
ENV TRUST_PROXY=true
EXPOSE 3000

# Aplica as migrations e sobe o servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
