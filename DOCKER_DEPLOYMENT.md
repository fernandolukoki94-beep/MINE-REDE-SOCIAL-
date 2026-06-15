# Deployment com Docker - MINE Rede Social

## Visão Geral

Este guia fornece instruções completas para fazer deploy da MINE Rede Social usando Docker e Docker Compose.

## Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+
- Git

## Estrutura de Deployment

```
┌─────────────────────────────────────────────┐
│          Nginx/Reverse Proxy                │
│              (Port 80/443)                  │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
   ┌────▼──┐  ┌───▼────┐  ┌──▼─────┐
   │  App  │  │  MySQL │  │ Redis  │
   │ (3000)│  │ (3306) │  │ (6379) │
   └───────┘  └────────┘  └────────┘
```

## Instalação Rápida

### 1. Clone o repositório

```bash
git clone https://github.com/fernandolukoki94-beep/MINE-REDE-SOCIAL-.git
cd MINE-REDE-SOCIAL-
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas configurações:

```bash
# Database
DB_ROOT_PASSWORD=seu-password-seguro
DB_PASSWORD=seu-password-seguro

# JWT
JWT_SECRET=seu-secret-jwt-muito-seguro

# OAuth Manus
VITE_APP_ID=seu-app-id
VITE_APP_TITLE=MINE Rede Social
```

### 3. Inicie os serviços

```bash
docker-compose up -d
```

### 4. Aplique as migrations

```bash
docker-compose exec app pnpm drizzle-kit migrate
```

### 5. Acesse a aplicação

- Frontend: http://localhost:3000
- API: http://localhost:3000/api/trpc

## Comandos Úteis

### Visualizar logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas a aplicação
docker-compose logs -f app

# Apenas MySQL
docker-compose logs -f db

# Apenas Redis
docker-compose logs -f redis
```

### Parar serviços

```bash
docker-compose down
```

### Remover dados (CUIDADO!)

```bash
docker-compose down -v
```

### Rebuild da imagem

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Deployment em Produção

### 1. Usar Nginx como Reverse Proxy

Crie `nginx.conf`:

```nginx
upstream app {
    server app:3000;
}

server {
    listen 80;
    server_name seu-dominio.com;

    # Redirect HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://app/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. Atualizar docker-compose.yml para produção

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - mine-network

  app:
    build: .
    environment:
      NODE_ENV: production
      # ... outras variáveis
    depends_on:
      - db
      - redis
    networks:
      - mine-network
    restart: always

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - mine-network
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - mine-network
    restart: always

volumes:
  db_data:
  redis_data:

networks:
  mine-network:
```

### 3. SSL com Let's Encrypt

```bash
# Instale certbot
sudo apt-get install certbot python3-certbot-nginx

# Gere certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Copie para o diretório ssl
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem ./ssl/key.pem
```

## Monitoramento

### Health Checks

```bash
# Verificar saúde da aplicação
curl http://localhost:3000/health

# Verificar MySQL
docker-compose exec db mysqladmin ping

# Verificar Redis
docker-compose exec redis redis-cli ping
```

### Backups

```bash
# Backup do MySQL
docker-compose exec db mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > backup.sql

# Restaurar backup
docker-compose exec -T db mysql -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} < backup.sql
```

## Troubleshooting

### Erro: "Cannot connect to Docker daemon"

```bash
sudo systemctl start docker
```

### Erro: "Port already in use"

```bash
# Encontre o processo usando a porta
lsof -i :3000

# Mude a porta no .env
APP_PORT=3001
```

### Erro: "Database connection failed"

```bash
# Verifique se MySQL está rodando
docker-compose ps

# Veja os logs
docker-compose logs db
```

### Erro: "Redis connection refused"

```bash
# Reinicie Redis
docker-compose restart redis

# Verifique conectividade
docker-compose exec redis redis-cli ping
```

## Performance

### Otimizações

1. **Database**: Adicione índices para queries frequentes
2. **Redis**: Configure política de evicção apropriada
3. **Docker**: Use multi-stage builds para reduzir tamanho da imagem
4. **Nginx**: Configure caching e compressão gzip

### Scaling

Para escalar horizontalmente:

```yaml
services:
  app:
    deploy:
      replicas: 3
```

Use um load balancer (HAProxy, Nginx) para distribuir tráfego.

## Segurança

### Checklist

- [ ] Altere todas as senhas padrão
- [ ] Configure SSL/TLS
- [ ] Ative firewall
- [ ] Configure rate limiting
- [ ] Ative logging e monitoramento
- [ ] Faça backups regulares
- [ ] Atualize dependências regularmente
- [ ] Configure CORS apropriadamente

## Próximos Passos

1. Configure CI/CD com GitHub Actions
2. Implemente monitoring com Prometheus/Grafana
3. Configure alertas com PagerDuty
4. Implemente disaster recovery
5. Faça testes de carga

---

**Versão:** 1.0  
**Data:** Junho 2026  
**Autor:** MINE Development Team
