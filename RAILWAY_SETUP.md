# Deploy no Railway - Guia Passo a Passo

## O que é Railway?

Railway é uma plataforma de deploy que permite fazer deploy de aplicações Docker em minutos, sem configuração complexa.

**Vantagens:**
- ✅ Deploy automático a cada push no GitHub
- ✅ Suporte nativo a Docker
- ✅ MySQL e Redis inclusos
- ✅ SSL/TLS automático
- ✅ Tier gratuito generoso
- ✅ Sem cartão de crédito necessário

---

## Passo 1: Criar Conta no Railway

1. Acesse https://railway.app
2. Clique em **Sign up**
3. Escolha **Continue with GitHub**
4. Autorize o acesso ao seu GitHub
5. Confirme seu email

---

## Passo 2: Criar Novo Projeto

1. Na dashboard do Railway, clique em **New Project**
2. Selecione **Deploy from GitHub repo**
3. Selecione seu repositório: `fernandolukoki94-beep/MINE-REDE-SOCIAL-`
4. Clique em **Deploy**

Railway vai detectar o `Dockerfile` automaticamente.

---

## Passo 3: Adicionar Serviços

Railway precisa de 3 serviços: App, MySQL e Redis.

### 3.1 MySQL

1. No painel do projeto, clique em **+ New Service**
2. Selecione **Database** → **MySQL**
3. Configure:
   - **Name:** `mysql`
   - **Root password:** Deixe Railway gerar
4. Clique em **Create**

### 3.2 Redis

1. Clique em **+ New Service**
2. Selecione **Database** → **Redis**
3. Configure:
   - **Name:** `redis`
4. Clique em **Create**

### 3.3 Sua Aplicação

A aplicação já foi criada no Passo 2. Agora vamos configurar as variáveis.

---

## Passo 4: Configurar Variáveis de Ambiente

1. Clique no seu projeto (App)
2. Vá para a aba **Variables**
3. Adicione as seguintes variáveis:

```
NODE_ENV=production
APP_PORT=3000
```

Railway vai injetar automaticamente:
- `DATABASE_URL` (do MySQL)
- `REDIS_URL` (do Redis)

---

## Passo 5: Adicionar Variáveis Manus

Você precisa adicionar as credenciais do Manus OAuth:

1. Ainda na aba **Variables**, clique em **Add Variable**
2. Adicione:

```
JWT_SECRET=seu-secret-jwt-super-seguro-aqui
VITE_APP_ID=seu-app-id-manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua-api-key-manus
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua-frontend-key-manus
VITE_APP_TITLE=MINE Rede Social
VITE_APP_LOGO=https://seu-logo-url.jpg
OWNER_NAME=Seu Nome
OWNER_OPEN_ID=seu-open-id
```

**Onde encontrar essas credenciais:**
- Vá para https://manus.im/dashboard
- Clique em **Aplicações**
- Copie os valores necessários

---

## Passo 6: Conectar Serviços

Railway precisa saber como os serviços se comunicam.

### Conectar App ao MySQL

1. Clique no serviço **mysql**
2. Vá para **Variables**
3. Copie a variável `DATABASE_URL`
4. Clique no serviço **app**
5. Vá para **Variables**
6. Adicione:
   ```
   DATABASE_URL=<valor-copiado>
   ```

### Conectar App ao Redis

1. Clique no serviço **redis**
2. Vá para **Variables**
3. Copie a variável `REDIS_URL`
4. Clique no serviço **app**
5. Vá para **Variables**
6. Adicione:
   ```
   REDIS_URL=<valor-copiado>
   ```

---

## Passo 7: Fazer Deploy

1. Clique no serviço **app**
2. Vá para **Deployments**
3. Clique em **Deploy**
4. Aguarde 5-10 minutos

Você verá o status:
- 🟡 Building...
- 🟡 Deploying...
- 🟢 Live

---

## Passo 8: Acessar Sua Aplicação

1. No painel do Railway, clique no serviço **app**
2. Vá para **Settings**
3. Procure por **Domains**
4. Copie o URL gerado (ex: `mine-social-prod.up.railway.app`)
5. Acesse em seu navegador

---

## Passo 9: Configurar Deploy Automático

Railway faz deploy automático a cada push no GitHub!

1. Clique no serviço **app**
2. Vá para **Settings**
3. Procure por **GitHub**
4. Confirme que está conectado
5. Cada push para `main` fará deploy automático

---

## Passo 10: Aplicar Migrations

Depois do primeiro deploy, você precisa aplicar as migrations do banco:

1. Clique no serviço **app**
2. Vá para **Logs**
3. Veja se há erros de banco de dados
4. Se necessário, execute:

```bash
# Via Railway CLI
railway run pnpm drizzle-kit migrate
```

Ou via painel:
1. Clique em **Shell**
2. Execute: `pnpm drizzle-kit migrate`

---

## Verificar se Está Funcionando

### Teste a API

```bash
curl https://seu-dominio.up.railway.app/api/trpc/auth.me
```

### Verifique os Logs

1. Clique no serviço **app**
2. Vá para **Logs**
3. Procure por erros

### Teste o Banco de Dados

```bash
# Via Railway CLI
railway run mysql -u root -p
```

---

## Troubleshooting

### ❌ Erro: "Build failed"

**Solução:**
1. Verifique o `Dockerfile`
2. Veja os logs de build
3. Teste localmente: `docker build -t mine .`

### ❌ Erro: "Database connection failed"

**Solução:**
1. Verifique se MySQL está rodando
2. Confirme `DATABASE_URL` está correto
3. Aplique migrations: `pnpm drizzle-kit migrate`

### ❌ Erro: "Port already in use"

**Solução:**
1. Railway usa porta 3000 por padrão
2. Verifique `APP_PORT` nas variáveis
3. Reinicie o serviço

### ❌ Erro: "Redis connection refused"

**Solução:**
1. Verifique se Redis está rodando
2. Confirme `REDIS_URL` está correto
3. Reinicie Redis

---

## Monitoramento

### Ver Logs em Tempo Real

```bash
railway logs -f
```

### Ver Status dos Serviços

```bash
railway status
```

### Ver Variáveis de Ambiente

```bash
railway variables
```

---

## Próximos Passos

### 1. Configurar Domínio Próprio (Opcional)

1. Compre um domínio (Namecheap, GoDaddy, etc.)
2. No Railway, vá para **Settings** → **Domains**
3. Clique em **Add Domain**
4. Adicione seu domínio
5. Configure os DNS records conforme indicado

### 2. Configurar SSL/TLS

Railway faz isso automaticamente com Let's Encrypt!

### 3. Configurar Backups

1. Clique no serviço **mysql**
2. Vá para **Settings**
3. Ative **Automatic Backups**

### 4. Monitoramento Avançado

1. Instale Sentry para error tracking
2. Instale Datadog para monitoring
3. Configure alertas

---

## Comandos Úteis do Railway CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Fazer login
railway login

# Ver status
railway status

# Ver logs
railway logs

# Ver logs em tempo real
railway logs -f

# Executar comando
railway run pnpm test

# Conectar ao banco
railway run mysql -u root -p

# Variáveis de ambiente
railway variables
```

---

## Custos

**Tier Gratuito:**
- ✅ 5GB de armazenamento
- ✅ 100GB de transferência
- ✅ 500 horas de execução/mês
- ✅ Suficiente para começar!

**Tier Pago:**
- Começa em $5/mês
- Escalável conforme necessário

---

## Suporte

Se tiver problemas:
1. Veja a documentação: https://docs.railway.app
2. Comunidade: https://railway.app/community
3. Email: support@railway.app

---

**Versão:** 1.0  
**Data:** Junho 2026  
**Autor:** MINE Development Team

---

## Checklist Final

- [ ] Conta Railway criada
- [ ] Repositório GitHub conectado
- [ ] MySQL criado
- [ ] Redis criado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado
- [ ] Aplicação acessível
- [ ] Migrations aplicadas
- [ ] Testes funcionando
- [ ] Backups configurados
