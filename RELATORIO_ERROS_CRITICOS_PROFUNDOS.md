# Relatório de Erros Críticos Profundos - MINE REDE SOCIAL

**Data:** 20 de Junho de 2026
**Analista:** Manus AI
**Escopo:** Segurança Arquitetural, Autenticação e Validação de Dados.

## 🔴 ERROS CRÍTICOS IDENTIFICADOS

### 1. Autenticação Insegura (Client-Side Auth)
- **Arquivo:** `legacy_static_version/auth.js`
- **Erro:** A lógica de autenticação (verificação de password e criação de sessão) é feita inteiramente no frontend.
- **Vulnerabilidade:** O ficheiro `auth.js` lê todos os utilizadores do `localStorage`, incluindo os seus hashes de password, e realiza a comparação no browser. Um atacante pode simplesmente ler o `localStorage` de qualquer utilizador ou manipular o código JS para saltar a verificação.
- **Impacto:** **Comprometimento total da base de utilizadores local.** Qualquer pessoa com acesso ao computador ou via um ataque XSS pode extrair todos os hashes de todos os utilizadores registados naquela máquina.

### 2. Falta de Validação de Conteúdo de Ficheiros (Magic Bytes)
- **Arquivo:** `server/features.ts` (Linha 213) e `server/storage.ts`
- **Erro:** O servidor aceita uma string base64 e converte-a para buffer sem validar o conteúdo real do ficheiro.
- **Vulnerabilidade:** O `mimeType` é definido estaticamente com base num `enum` enviado pelo cliente (`image/jpeg` ou `video/mp4`). Um atacante pode enviar um script malicioso disfarçado de imagem e o servidor irá armazená-lo e servi-lo.
- **Impacto:** **Execução de Código Remoto (RCE) ou Hosting de Malware.** O servidor torna-se um repositório para ficheiros perigosos que podem ser executados no contexto de outros utilizadores.

### 3. Ausência de Limites de Payload no Backend
- **Arquivo:** `server/features.ts`
- **Erro:** A rota `uploadMedia` não impõe um limite de tamanho ao buffer recebido.
- **Vulnerabilidade:** Um atacante pode enviar strings base64 gigantescas para esgotar a memória do servidor (RAM).
- **Impacto:** **Negação de Serviço (DoS).** O servidor pode crashar ao tentar processar buffers excessivamente grandes.

### 4. Armazenamento de Segredos em Texto Limpo no LocalStorage
- **Arquivo:** `legacy_static_version/auth.js` (Linha 18)
- **Erro:** O ID do utilizador atual é armazenado em `currentUserId` sem qualquer assinatura ou token de segurança.
- **Vulnerabilidade:** É trivial para um utilizador alterar o seu `currentUserId` no `localStorage` para o ID de outro utilizador e assumir a sua identidade (Session Hijacking/Impersonation).
- **Impacto:** **Acesso não autorizado a contas de terceiros.**

---

## 📋 Plano de Hardening Imediato

### Fase 1: Backend Auth (Prioridade Máxima)
- Migrar a lógica de `login` e `register` para rotas tRPC protegidas.
- Implementar o hashing de passwords **apenas no servidor** usando `bcrypt`.
- Nunca enviar o `passwordHash` para o cliente.

### Fase 2: Validação de Ficheiros
- Usar uma biblioteca como `file-type` no backend para validar os **Magic Bytes** dos buffers recebidos.
- Rejeitar qualquer ficheiro cujo conteúdo real não corresponda à extensão declarada.
- Implementar um limite rigoroso de tamanho de payload no middleware do servidor (ex: 5MB).

### Fase 3: Segurança de Sessão
- Substituir o `currentUserId` no `localStorage` por um **HttpOnly Cookie** assinado, gerido pelo servidor.
- Implementar expiração de sessão.
