# MINE Rede Social - Guia de Deployment

## Visão Geral

A MINE Rede Social é uma aplicação web moderna de rede social com backend Node.js + React, suportando posts com mídia, mensagens diretas, sistema de amigos e notificações em tempo real.

## Arquitetura

### Stack Tecnológico

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| Frontend | React 19 + Tailwind CSS 4 | Latest |
| Backend | Node.js + Express 4 + tRPC 11 | 22.13.0 |
| Base de Dados | TiDB (MySQL compatível) | Latest |
| Armazenamento | S3 (Manus Storage) | Built-in |
| Autenticação | OAuth Manus | Built-in |

### Estrutura de Ficheiros

```
mine-rede-social-backend/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Feed, Messages, Friends, Notifications)
│   │   ├── components/    # Componentes reutilizáveis
│   │   └── lib/trpc.ts    # Cliente tRPC
│   └── index.html
├── server/                # Backend Node.js
│   ├── routers.ts         # Definição de procedimentos tRPC
│   ├── features.ts        # Lógica de negócio
│   ├── queries.ts         # Queries de base de dados
│   └── _core/             # Framework (OAuth, tRPC, etc.)
├── drizzle/               # Schema e migrations
│   └── schema.ts          # Definição de tabelas
└── package.json
```

## Deployment

### Pré-requisitos

- Node.js 22.13.0+
- Base de dados TiDB (ou MySQL 8.0+)
- Bucket S3 para armazenamento de mídia
- Credenciais OAuth Manus

### Variáveis de Ambiente

```bash
# Base de Dados
DATABASE_URL=mysql://user:password@host:3306/mine_social

# Autenticação
JWT_SECRET=seu-secret-jwt-aqui
VITE_APP_ID=seu-app-id-manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Armazenamento
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=seu-api-key

# Frontend
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=seu-frontend-key
VITE_APP_TITLE=MINE Rede Social
VITE_APP_LOGO=https://seu-logo-url.jpg
```

### Build e Deploy

#### 1. Instalação de Dependências

```bash
cd mine-rede-social-backend
pnpm install
```

#### 2. Configurar Base de Dados

```bash
# Gerar migrations
pnpm drizzle-kit generate

# Aplicar migrations
pnpm drizzle-kit migrate
```

#### 3. Build de Produção

```bash
pnpm build
```

#### 4. Iniciar Servidor

```bash
# Desenvolvimento
pnpm dev

# Produção
pnpm start
```

## Funcionalidades Implementadas

### 1. Feed de Posts
- ✅ Criar posts com texto
- ✅ Upload de imagens
- ✅ Upload de vídeos (até 50MB)
- ✅ Paginação infinita (20 posts por página)
- ✅ Algoritmo de relevância: `score = (likes × 2) + comentários`
- ✅ Likes e comentários em tempo real

### 2. Sistema de Amigos
- ✅ Enviar pedidos de amizade
- ✅ Aceitar/rejeitar pedidos
- ✅ Listar amigos
- ✅ Remover amigos
- ✅ Buscar utilizadores

### 3. Mensagens Diretas
- ✅ Enviar mensagens privadas (apenas entre amigos)
- ✅ Histórico de conversas persistido
- ✅ Carregamento de histórico de mensagens
- ✅ Status de leitura

### 4. Notificações
- ✅ Notificações de likes
- ✅ Notificações de comentários
- ✅ Notificações de mensagens recebidas
- ✅ Notificações de pedidos de amizade
- ✅ Histórico de notificações
- ⏳ WebSocket para notificações em tempo real (em desenvolvimento)

### 5. Autenticação
- ✅ OAuth Manus
- ✅ Gestão de sessões
- ✅ Logout

## Testes

### Executar Testes

```bash
pnpm test
```

### Cobertura de Testes

- ✅ Validação de entrada (posts, mensagens, pedidos)
- ✅ Autenticação e autorização
- ✅ Notificações
- ✅ Amigos

## Performance

### Otimizações Implementadas

1. **Paginação Infinita:** Carregamento de 20 posts por vez
2. **Índices de Base de Dados:** Índices em `userId`, `createdAt`, `status`
3. **Caching:** Queries otimizadas com `limit/offset`
4. **Compressão de Mídia:** Imagens comprimidas antes de upload

### Limites

- Tamanho máximo de post: 5000 caracteres
- Tamanho máximo de mensagem: 500 caracteres
- Tamanho máximo de vídeo: 50MB
- Limite de pedidos de amizade: 100 por utilizador

## Segurança

### Medidas Implementadas

1. **Autenticação:** OAuth Manus obrigatório
2. **Autorização:** Verificação de propriedade antes de deletar posts
3. **Validação:** Todas as entradas validadas com Zod
4. **HTTPS:** Obrigatório em produção
5. **CORS:** Configurado para domínios permitidos

## Troubleshooting

### Erro: "Database connection failed"
```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Testar conexão
mysql -h host -u user -p database_name
```

### Erro: "OAuth callback failed"
```bash
# Verificar VITE_APP_ID e OAUTH_SERVER_URL
# Confirmar que o redirect URI está registado em Manus
```

### Erro: "Storage upload failed"
```bash
# Verificar BUILT_IN_FORGE_API_KEY
# Confirmar que o bucket S3 está acessível
```

## Monitoramento

### Logs

```bash
# Ver logs do servidor
tail -f .manus-logs/devserver.log

# Ver logs do navegador
tail -f .manus-logs/browserConsole.log

# Ver requests HTTP
tail -f .manus-logs/networkRequests.log
```

### Métricas

- Tempo de resposta das queries
- Taxa de erro de uploads
- Número de utilizadores ativos
- Tamanho médio de posts

## Próximas Melhorias

- [ ] WebSocket para notificações em tempo real
- [ ] Geração real de thumbnails de vídeos com FFmpeg
- [ ] Compressão automática de imagens
- [ ] Cache distribuído com Redis
- [ ] Busca full-text de posts
- [ ] Recomendações de amigos (ML)
- [ ] Analytics e estatísticas
- [ ] Moderação de conteúdo

## Suporte

Para questões ou problemas:
1. Consultar `MIGRATION_GUIDE.md` para migração de dados
2. Verificar `todo.md` para status de funcionalidades
3. Contactar o time de desenvolvimento

---

**Versão:** 1.0  
**Data:** Junho 2026  
**Autor:** MINE Development Team
