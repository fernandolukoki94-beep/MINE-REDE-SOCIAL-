# Relatório de Auditoria Exaustiva - MINE REDE SOCIAL

**Data:** 20 de Junho de 2026
**Analista:** Manus (AI Agent)
**Escopo:** Análise integral do backend (tRPC, Drizzle, Socket.IO) e frontend (React).

## 🔴 CRÍTICOS (Segurança e Integridade)

### 1. Vulnerabilidade de IDOR em Notificações
- **Arquivo:** `server/features.ts` (Linha 516)
- **Problema:** A rota `markAsRead` aceita um `notificationId` e chama `markNotificationAsRead(input.notificationId)` sem verificar se a notificação pertence ao utilizador autenticado (`ctx.user.id`).
- **Impacto:** Qualquer utilizador autenticado pode marcar as notificações de qualquer outro utilizador como lidas, bastando adivinhar ou iterar sobre os IDs.

### 2. Configuração Insegura de CORS no Socket.IO
- **Arquivo:** `server/socket.ts` (Linha 16)
- **Problema:** O Socket.IO está configurado com `origin: "*"`.
- **Impacto:** Permite que qualquer site malicioso estabeleça uma ligação WebSocket com o servidor. Combinado com a autenticação baseada em cookies (que usa `SameSite: None`), isto pode facilitar ataques de Cross-Site WebSocket Hijacking (CSWH).

### 3. Exposição de Sessão em Cross-Site (CSRF/CSWH)
- **Arquivo:** `server/_core/cookies.ts` (Linha 45)
- **Problema:** O cookie de sessão está configurado com `sameSite: "none"`.
- **Impacto:** Embora necessário para algumas integrações de terceiros, no contexto de uma rede social, isto permite que o cookie seja enviado em pedidos cross-site, aumentando o risco de CSRF e o sequestro de WebSockets mencionado acima.

### 4. Falta de Validação de Propriedade em Eliminação de Posts
- **Arquivo:** `server/queries.ts` (Linha 83)
- **Problema:** Embora a função `deletePost` verifique a propriedade (`post[0].userId !== userId`), ela falha silenciosamente se a verificação falhar.
- **Impacto:** Embora não seja um leak de dados, a falta de feedback de erro dificulta o debug e pode mascarar tentativas de ataque.

## 🟡 ALTOS (Estabilidade e Lógica)

### 5. Inconsistência na Aceitação de Pedidos de Amizade
- **Arquivo:** `server/queries.ts` (Linha 177)
- **Problema:** A função `acceptFriendRequest` atualiza o estado para `accepted` mas não verifica se o pedido existia originalmente ou se o `userId` é realmente o destinatário do pedido.
- **Impacto:** Um utilizador pode "aceitar" um pedido que nunca recebeu ou que já foi rejeitado.

### 6. Race Condition em Likes/Deslikes
- **Arquivo:** `server/queries.ts` (Linha 106/111)
- **Problema:** O contador de likes é atualizado usando `sql`${posts.likes} + 1``. No entanto, se o `toggleLike` for chamado rapidamente em paralelo, o estado da tabela `postLikes` e o contador em `posts` podem ficar dessincronizados.
- **Impacto:** Contadores de likes incorretos nos posts.

## 🟢 MÉDIOS (Performance e Manutenção)

### 7. Falta de Paginação em Comentários
- **Arquivo:** `server/queries.ts` (Linha 139)
- **Problema:** A função `getPostComments` retorna todos os comentários de uma vez.
- **Impacto:** Posts com milhares de comentários podem causar lentidão no carregamento e consumo excessivo de memória no servidor/cliente.

---

## Plano de Correção Imediata
1. **Corrigir IDOR:** Adicionar `userId` à query de `markNotificationAsRead`.
2. **Restringir CORS:** Configurar uma lista de origens permitidas no Socket.IO.
3. **Reforçar Cookies:** Alterar `sameSite` para `Lax` se não houver necessidade estrita de cross-site.
4. **Validar Amizades:** Adicionar verificações de existência e destinatário em `acceptFriendRequest`.
