# Build stage
FROM node:22-alpine AS builder

# Instalar dependências de sistema para pacotes nativos (bcrypt, sharp, etc)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm@11.9.0

# Copiar ficheiros de configuração primeiro para cache de layers
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches

# Instalar todas as dependências (incluindo dev) para o build
RUN pnpm install --frozen-lockfile

# Copiar o resto do código
COPY . .

# Build do frontend e backend
RUN pnpm build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm@11.9.0

# Copiar apenas ficheiros necessários para produção
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches

# Instalar apenas dependências de produção
RUN pnpm install --frozen-lockfile --prod

# Copiar o build do estágio anterior
COPY --from=builder /app/dist ./dist

# Garantir que o diretório public existe para o servidor estático
# Note: Vite build deve colocar os arquivos em dist/public
RUN mkdir -p dist/public

# Expor a porta padrão
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar
CMD ["node", "dist/index.js"]
