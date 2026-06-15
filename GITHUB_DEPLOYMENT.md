# Deploy no GitHub - MINE Rede Social

## Opções de Deploy

Existem várias formas de fazer deploy da MINE Rede Social usando GitHub:

### 1. **GitHub Pages** (Frontend estático)
- Melhor para: Portfólio, documentação
- Custo: Grátis
- Limitação: Sem backend Node.js

### 2. **GitHub Codespaces** (Desenvolvimento na nuvem)
- Melhor para: Desenvolvimento remoto
- Custo: Créditos gratuitos inclusos
- Limitação: Não é produção

### 3. **GitHub Actions + Docker Registry** (Recomendado)
- Melhor para: Produção profissional
- Custo: Grátis para repositórios públicos
- Vantagem: CI/CD automático + Docker

### 4. **GitHub + Vercel/Railway/Render** (Integração)
- Melhor para: Deploy automático
- Custo: Tier gratuito disponível
- Vantagem: Deploy em um clique

---

## Opção 1: Deploy com GitHub Actions + Docker Registry

### Passo 1: Habilitar GitHub Container Registry

1. Vá para https://github.com/fernandolukoki94-beep/MINE-REDE-SOCIAL-
2. Clique em **Settings** → **Packages and registries**
3. Habilite **GitHub Container Registry**

### Passo 2: Criar Personal Access Token

1. Vá para https://github.com/settings/tokens
2. Clique em **Generate new token** → **Generate new token (classic)**
3. Nome: `GITHUB_TOKEN_DOCKER`
4. Selecione permissões:
   - `write:packages`
   - `read:packages`
   - `delete:packages`
5. Copie o token

### Passo 3: Adicionar Secrets ao Repositório

1. Vá para **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

```
REGISTRY_USERNAME = seu-usuario-github
REGISTRY_PASSWORD = seu-token-acima
DATABASE_URL = sua-url-mysql
REDIS_URL = sua-url-redis
JWT_SECRET = seu-jwt-secret
VITE_APP_ID = seu-app-id
```

### Passo 4: Criar Workflow de Deploy

O arquivo `.github/workflows/ci-cd.yml` já está configurado. Ele fará:

1. **Build automático** em cada push
2. **Testes** antes de fazer deploy
3. **Push da imagem Docker** para GitHub Container Registry
4. **Deploy automático** (se configurado)

### Passo 5: Monitorar o Deploy

1. Vá para **Actions** no repositório
2. Veja o workflow rodando
3. Verifique os logs se houver erro

---

## Opção 2: Deploy com Railway (Recomendado para Iniciantes)

Railway oferece deploy super simples com suporte a Docker.

### Passo 1: Criar conta no Railway

1. Acesse https://railway.app
2. Clique em **Sign up with GitHub**
3. Autorize o acesso

### Passo 2: Criar novo projeto

1. Clique em **New Project**
2. Selecione **Deploy from GitHub repo**
3. Selecione `fernandolukoki94-beep/MINE-REDE-SOCIAL-`

### Passo 3: Configurar variáveis de ambiente

1. Clique em **Variables**
2. Adicione:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET`
   - `VITE_APP_ID`
   - Etc.

### Passo 4: Deploy automático

1. Railway detecta `Dockerfile` automaticamente
2. Clique em **Deploy**
3. Aguarde 5-10 minutos

### Passo 5: Acessar aplicação

1. Clique em **Deployments**
2. Copie o URL gerado
3. Acesse em seu navegador

---

## Opção 3: Deploy com Vercel

Vercel é ótimo para aplicações Next.js/React, mas requer ajustes.

### Passo 1: Preparar para Vercel

```bash
# Instale Vercel CLI
npm i -g vercel

# Faça login
vercel login
```

### Passo 2: Deploy

```bash
cd MINE-REDE-SOCIAL-
vercel
```

### Passo 3: Configurar variáveis

Na dashboard do Vercel, adicione as variáveis de ambiente.

**Nota:** Vercel é melhor para frontend. Para backend completo, use Railway ou Docker.

---

## Opção 4: Deploy em VPS com GitHub Actions

Para máximo controle, use um VPS (DigitalOcean, AWS, etc.) com GitHub Actions.

### Passo 1: Criar VPS

1. Crie uma droplet no DigitalOcean (ou equivalente)
2. Instale Docker e Docker Compose
3. Configure SSH key

### Passo 2: Adicionar SSH Key ao GitHub

1. Gere SSH key no VPS:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy
```

2. Adicione a chave pública ao GitHub:
   - Settings → Deploy keys → Add deploy key

3. Adicione a chave privada como secret:
   - Settings → Secrets → `DEPLOY_KEY`

### Passo 3: Criar Workflow de Deploy

Crie `.github/workflows/deploy-vps.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app/MINE-REDE-SOCIAL-
            git pull origin main
            docker-compose down
            docker-compose up -d --build
```

### Passo 4: Executar Deploy

Cada push para `main` fará deploy automático no VPS.

---

## Comparação de Opções

| Opção | Custo | Facilidade | Produção | Recomendado |
| --- | --- | --- | --- | --- |
| **GitHub Pages** | Grátis | ⭐⭐⭐⭐⭐ | ❌ | Frontend só |
| **Railway** | Grátis (tier) | ⭐⭐⭐⭐ | ✅ | Iniciantes |
| **Vercel** | Grátis (tier) | ⭐⭐⭐⭐ | ⚠️ | Frontend |
| **VPS + GitHub Actions** | $$ | ⭐⭐⭐ | ✅ | Profissionais |
| **Docker Registry** | Grátis | ⭐⭐⭐ | ✅ | Avançado |

---

## Checklist de Deploy

- [ ] Código commitado no GitHub
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets adicionados ao repositório
- [ ] Dockerfile testado localmente
- [ ] CI/CD workflow configurado
- [ ] Domínio configurado (opcional)
- [ ] SSL/TLS habilitado
- [ ] Backups configurados
- [ ] Monitoramento ativo
- [ ] Logs centralizados

---

## Troubleshooting

### Erro: "Docker build failed"

```bash
# Teste localmente
docker build -t mine-social .
docker run -p 3000:3000 mine-social
```

### Erro: "Database connection failed"

Verifique se `DATABASE_URL` está correto:
```
mysql://user:password@host:port/database
```

### Erro: "Deployment timeout"

Aumente o timeout no workflow:
```yaml
timeout-minutes: 30
```

---

## Próximos Passos

1. **Monitoramento**: Configure alertas com Sentry ou Datadog
2. **Analytics**: Adicione Google Analytics ou Plausible
3. **Backups**: Configure backups automáticos
4. **CDN**: Use Cloudflare para cache global
5. **Scaling**: Configure auto-scaling se necessário

---

**Versão:** 2.0  
**Data:** Junho 2026  
**Autor:** MINE Development Team
