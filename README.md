# MINE-REDE-SOCIAL - Versão Industrial

Este documento detalha a arquitetura, configuração, execução e testes da aplicação MINE-REDE-SOCIAL, agora elevada a um nível industrial com foco em escalabilidade, segurança e manutenibilidade.

## 1. Visão Geral da Arquitetura

A aplicação segue uma arquitetura modular, dividida em `client` (frontend React) e `server` (backend Node.js com tRPC). A comunicação entre frontend e backend é feita via tRPC, garantindo tipagem de ponta a ponta. A persistência de dados é gerida pelo Drizzle ORM com MySQL, e o caching é implementado com Redis.

**Componentes Principais:**

*   **Frontend (`client/`)**: Aplicação React com Vite, TypeScript e TailwindCSS para uma interface de utilizador moderna e responsiva.
*   **Backend (`server/`)**: Servidor Node.js com Express, tRPC para APIs tipadas, Drizzle ORM para interação com a base de dados MySQL, Socket.IO para comunicação em tempo real e Redis para caching.
*   **Camada de Serviços (`server/services/`)**: Nova camada de lógica de negócio que desacopla as regras de negócio dos handlers tRPC, promovendo maior testabilidade e reusabilidade.
*   **Camada de Queries (`server/queries.ts`)**: Centraliza todas as operações de base de dados, garantindo uma interface consistente para a camada de serviços.
*   **Drizzle ORM (`drizzle/`)**: Gerencia o esquema da base de dados e as migrações.
*   **Segurança**: Implementação de `helmet` para headers de segurança e `express-rate-limit` para proteção contra ataques de força bruta/DDoS.
*   **Caching**: Utilização de Redis para cache de dados frequentemente acedidos, como o feed de posts e notificações.

## 2. Configuração do Ambiente de Desenvolvimento

Para configurar o ambiente de desenvolvimento, siga os passos abaixo:

### Pré-requisitos

Certifique-se de ter as seguintes ferramentas instaladas:

*   Node.js (v18 ou superior)
*   pnpm (gerenciador de pacotes)
*   Docker e Docker Compose (para MySQL e Redis)
*   Git

### Instalação

1.  **Clonar o repositório:**

    ```bash
    git clone https://github.com/fernandolukoki94-beep/MINE-REDE-SOCIAL-.git
    cd MINE-REDE-SOCIAL-
    ```

2.  **Instalar dependências:**

    ```bash
    pnpm install
    ```

3.  **Configurar variáveis de ambiente:**

    Crie um ficheiro `.env` na raiz do projeto com base no `.env.example` (se existir) ou com as seguintes variáveis:

    ```env
    DATABASE_URL="mysql://user:password@localhost:3306/mineredesocial"
    REDIS_URL="redis://localhost:6379"
    PORT=3000
    # Outras variáveis de ambiente necessárias para S3, OAuth, etc.
    ```

4.  **Iniciar serviços de base de dados e cache com Docker Compose:**

    ```bash
    docker-compose up -d
    ```

5.  **Executar migrações da base de dados:**

    ```bash
    pnpm run db:push
    ```

## 3. Execução da Aplicação

Para iniciar a aplicação em modo de desenvolvimento:

```bash
pnpm run dev
```

O frontend estará disponível em `http://localhost:5173` (ou outra porta definida pelo Vite) e o backend em `http://localhost:3000` (ou a porta definida em `.env`).

Para construir e iniciar a aplicação em modo de produção:

```bash
pnpm run build
pnpm run start
```

## 4. Testes

O projeto utiliza Vitest para testes unitários e de integração. Os testes estão localizados nos diretórios `server/*.test.ts` e `server/services/*.test.ts`.

### Executar todos os testes

```bash
pnpm run test
```

### Executar testes de linting

```bash
pnpm run lint
```

## 5. CI/CD (Integração Contínua / Entrega Contínua)

Um workflow básico de CI/CD foi configurado usando GitHub Actions para garantir a qualidade do código e automatizar o processo de build e teste.

O ficheiro de configuração do workflow está localizado em `.github/workflows/ci.yml`.

**O workflow inclui os seguintes passos:**

1.  **Checkout do código:** Obtém o código do repositório.
2.  **Configuração do Node.js:** Configura o ambiente Node.js.
3.  **Instalação de dependências:** Instala as dependências do projeto usando pnpm.
4.  **Linting:** Executa o ESLint para verificar problemas de estilo e erros de código.
5.  **Build:** Compila o projeto frontend e backend.
6.  **Testes:** Executa os testes unitários e de integração com Vitest.

Este workflow garante que cada push ou pull request passe por verificações de qualidade antes de ser integrado à branch principal.

## 6. Melhorias Implementadas (Versão Industrial)

Esta versão do MINE-REDE-SOCIAL incorpora as seguintes melhorias para um nível industrial:

### 6.1. Arquitetura e Organização do Código

*   **Camada de Serviços**: Introdução de uma camada de serviços (`server/services.ts`) para encapsular a lógica de negócio, separando-a dos handlers tRPC. Isso melhora a modularidade, testabilidade e reusabilidade do código.
*   **Centralização de Queries**: Todas as interações com a base de dados foram centralizadas em `server/queries.ts`, proporcionando uma API consistente para a camada de serviços.

### 6.2. Segurança

*   **Headers de Segurança (Helmet)**: Adição do middleware `helmet` no servidor Express para configurar headers HTTP de segurança, protegendo a aplicação contra vulnerabilidades comuns como XSS, clickjacking, etc.
*   **Rate Limiting**: Implementação de `express-rate-limit` para limitar o número de requisições por IP em um determinado período, mitigando ataques de força bruta e DDoS.

### 6.3. Performance e Escalabilidade

*   **Caching com Redis**: Integração de Redis para cache de dados. O feed de posts agora utiliza cache para reduzir a carga na base de dados e melhorar o tempo de resposta. O cache é invalidado automaticamente após a criação de novos posts ou ações relevantes.
*   **Otimização de Queries**: Revisão de queries para evitar problemas de N+1 e otimizar o acesso a dados.

### 6.4. Qualidade de Código e Manutenibilidade

*   **ESLint**: Configuração do ESLint com regras para TypeScript, React, JSX A11y e Import, garantindo um código consistente e de alta qualidade. Um script `lint` foi adicionado ao `package.json`.
*   **Testes Unitários e de Integração**: Expansão da cobertura de testes com a criação de `server/services.test.ts` para testar a lógica de negócio de forma isolada. Os testes de router (`server/features.test.ts`) foram atualizados para mockar os serviços, focando na integração do router com a camada de serviços.
*   **Documentação Técnica**: Criação deste `README.md` abrangente, detalhando a arquitetura, configuração, execução, testes e melhorias implementadas.

### 6.5. Automação

*   **GitHub Actions para CI/CD**: Configuração de um workflow de CI/CD para automatizar o linting, build e testes do projeto a cada push ou pull request, garantindo a integração contínua e a qualidade do código.

## 7. Próximos Passos (Melhorias Futuras)

Para continuar a elevar o projeto a um nível ainda mais industrial, as seguintes áreas podem ser exploradas:

*   **Observabilidade**: Implementação de logging estruturado, métricas (Prometheus/Grafana) e tracing distribuído.
*   **Gestão de Erros Centralizada**: Um sistema mais robusto para tratamento e reporte de erros (Sentry, Bugsnag).
*   **Autenticação e Autorização Avançadas**: Implementação de JWTs mais robustos, refresh tokens e autorização baseada em roles/permissions mais granular.
*   **Validação de Input no Frontend**: Além da validação no backend, adicionar validação de formulários mais sofisticada no frontend para melhorar a UX.
*   **Otimização de Imagens/Vídeos**: Processamento de media assíncrono e otimizado para diferentes dispositivos e larguras de banda.
*   **Internacionalização (i18n)**: Suporte a múltiplos idiomas.
*   **Testes E2E**: Implementação de testes end-to-end com ferramentas como Cypress ou Playwright.
*   **Monitorização e Alertas**: Configuração de monitorização de performance e alertas para problemas em produção.

---

**Autor:** fernandolukoki94@gmail.com 
**Data:** 20 de Junho de 2026
