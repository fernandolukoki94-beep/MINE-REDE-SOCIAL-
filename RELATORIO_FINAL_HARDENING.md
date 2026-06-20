# Relatório Final de Hardening de Segurança e Deploy

**Projeto:** MINE-REDE-SOCIAL-
**Data:** 20 de Junho de 2026
**Status:** ✅ PROTEGIDO E PUBLICADO

## 1. Intervenções de Segurança Críticas (Hardening)

Para elevar o projeto de um MVP para uma aplicação segura e pronta para produção, foram implementadas as seguintes alterações estruturais:

### 1.1. Autenticação Centralizada no Backend
- **Antes:** A verificação de password e criação de sessão ocorria no frontend, expondo hashes de todos os utilizadores no browser.
- **Depois:** Implementadas rotas tRPC `auth.login` e `auth.register`. Toda a lógica de verificação agora reside no servidor.
- **Tecnologia:** Utilização de `bcryptjs` com 10 iterações de salt para hashing de passwords no servidor.

### 1.2. Validação Rigorosa de Uploads (Magic Bytes)
- **Antes:** O servidor confiava na extensão do ficheiro enviada pelo utilizador.
- **Depois:** Integrada a biblioteca `file-type` para analisar os **Magic Bytes** dos buffers de upload.
- **Defesa:** O servidor agora rejeita ficheiros cujo conteúdo real não corresponda a imagens (`jpg`, `png`, `gif`, `webp`) ou vídeos (`mp4`, `webm`, `mov`), prevenindo o upload de scripts maliciosos.

### 1.3. Limites de Payload e DoS Prevention
- **Antes:** Limites de payload de 50MB permitiam ataques de exaustão de memória.
- **Depois:** Reduzido o limite global do Express para **6MB** e implementado um limite específico de **5MB** na lógica de negócio para uploads de media.

### 1.4. Gestão de Sessão Segura
- **Antes:** Identificação de utilizador via `localStorage` (vulnerável a manipulação).
- **Depois:** Utilização de **HttpOnly Cookies** assinados via JWT (HS256) geridos pelo SDK do servidor, com política `SameSite: Lax` para mitigar CSRF.

## 2. Resumo Técnico das Alterações

| Ficheiro | Alteração | Impacto |
| :--- | :--- | :--- |
| `server/routers.ts` | Adicionadas rotas `login` e `register` com `bcrypt`. | Autenticação segura e privada. |
| `server/features.ts` | Implementada validação `file-type` e `MAX_FILE_SIZE`. | Proteção contra RCE e Malware. |
| `server/_core/index.ts` | Reduzidos limites de `express.json` e `urlencoded`. | Prevenção de DoS. |
| `drizzle/schema.ts` | Adicionado campo `passwordHash` à tabela `users`. | Suporte a credenciais locais seguras. |

## 3. Conclusão e Deploy

O projeto foi submetido a um processo de "Hardening" que resolveu as vulnerabilidades arquiteturais mais graves. A aplicação está agora protegida contra sequestro de sessão, injeção de ficheiros maliciosos e exposição de credenciais.

**O deploy foi realizado com sucesso e a aplicação está operacional sob as novas políticas de segurança.**
