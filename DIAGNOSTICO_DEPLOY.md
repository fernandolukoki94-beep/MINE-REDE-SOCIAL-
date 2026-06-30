# Relatório de Diagnóstico de Deploy: MINE Rede Social

Após uma análise profunda da estrutura do seu projeto, ficheiros de configuração e testes de build local, identifiquei os pontos críticos que estão a impedir o sucesso do seu deploy.

## 1. Problemas Identificados

### ❌ Configuração do Gerenciador de Pacotes (pnpm)
O projeto utiliza `pnpm`, mas o ficheiro `package.json` contém campos de configuração que a versão mais recente do pnpm (v11+) ignora ou exige aprovação manual. Durante o build no Docker/Railway, isso causa falhas silenciosas ou interrupções.
- **Sintoma:** Erro `[ERR_PNPM_IGNORED_BUILDS]` durante a instalação de dependências.
- **Causa:** O pnpm exige que scripts de build de dependências específicas (como `@google/genai`) sejam aprovados explicitamente.

### ❌ Variáveis de Ambiente Obrigatórias Ausentes
O código do servidor (`server/_core/env.ts`) e o sistema de autenticação dependem de variáveis que não estão configuradas no ambiente de deploy.
- **Variáveis Críticas:** `DATABASE_URL`, `OAUTH_SERVER_URL`, `JWT_SECRET`, e `OWNER_OPEN_ID`.
- **Sintoma:** O servidor inicia, mas falha imediatamente ao tentar registar rotas de OAuth ou conectar à base de dados.

### ❌ Dependências e Patches
Existe uma dependência patcheada (`wouter@3.7.1`), mas a configuração de `patchedDependencies` no `package.json` está num formato que as versões novas do pnpm não reconhecem nativamente sem o ficheiro `.npmrc` correto ou configuração de workspace.

### ❌ Configuração do Dockerfile vs Railway
O seu `Dockerfile` está bem estruturado, mas o Railway muitas vezes tenta detetar o projeto automaticamente. Se houver um conflito entre o que o Railway deteta e o seu `Dockerfile`, o build falha. Além disso, o `HEALTHCHECK` no Dockerfile pode falhar se o servidor demorar mais de 30s a conectar à base de dados (que também está a ser provisionada).

---

## 2. Soluções Recomendadas

### Passo 1: Atualizar o `package.json` e `pnpm-workspace.yaml`
Remova os avisos do pnpm movendo as configurações para o local correto ou use o comando:
```bash
pnpm approve-builds
```
No ambiente de CI/CD (como Railway), você deve garantir que as dependências sejam instaladas ignorando scripts se necessário, ou configurando o `allowBuilds` no `pnpm-workspace.yaml`.

### Passo 2: Configurar Variáveis de Ambiente no Railway
No painel do Railway, você **DEVE** adicionar estas variáveis manualmente:

| Variável | Valor Sugerido |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | *(Use a URL fornecida pelo serviço MySQL do Railway)* |
| `OAUTH_SERVER_URL` | `https://api.manus.im` |
| `JWT_SECRET` | *(Gere uma string aleatória longa)* |
| `OWNER_OPEN_ID` | *(Seu ID de usuário Manus)* |

### Passo 3: Corrigir o Script de Build
O seu script de build atual é:
`"build": "vite build && esbuild server/_core/index.ts ..."`
Notei que o Vite está a gerar avisos sobre variáveis de analytics ausentes no `index.html`. Embora sejam apenas avisos, é boa prática definir `VITE_ANALYTICS_ENDPOINT` e `VITE_ANALYTICS_WEBSITE_ID` como strings vazias se não forem usadas.

---

## 3. Checklist para um Deploy de Sucesso

1.  **Base de Dados:** Certifique-se de que o serviço MySQL no Railway está ativo antes de iniciar o deploy do App.
2.  **Migrations:** Após o primeiro deploy, você precisará rodar:
    ```bash
    pnpm drizzle-kit migrate
    ```
    Isso pode ser feito via Railway CLI ou adicionando um `predeploy` script no `package.json`.
3.  **Logs:** Se o deploy falhar, verifique os logs do Railway. Se vir "OAUTH_SERVER_URL is not configured", o problema é puramente falta de variáveis de ambiente.

## Conclusão
O seu código está tecnicamente correto e o build funciona (testei localmente e passou após as correções de pnpm). O principal bloqueio é a **configuração das variáveis de ambiente** e a **aprovação de scripts do pnpm**.

Recomendo seguir o guia em `RAILWAY_SETUP.md` que já está no seu projeto, garantindo que as variáveis de ambiente sejam preenchidas exatamente como descrito acima.
