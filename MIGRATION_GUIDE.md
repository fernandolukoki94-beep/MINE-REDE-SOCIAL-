# Guia de Migração: LocalStorage → TiDB

## Visão Geral

Este documento descreve o processo de migração de dados da aplicação MINE Rede Social do armazenamento local (LocalStorage) para uma base de dados persistente (TiDB) com backend Node.js + tRPC.

## Arquitetura Anterior (LocalStorage)

A versão anterior da aplicação armazenava todos os dados no navegador:

| Entidade | Armazenamento | Formato |
| --- | --- | --- |
| Utilizadores | `localStorage['users']` | JSON array |
| Posts | `localStorage['posts']` | JSON array |
| Amigos | `localStorage['friendships']` | JSON array |
| Perfis | Inline nos posts | Dados do utilizador |
| Likes | Array dentro de posts | IDs de utilizadores |
| Comentários | Array dentro de posts | Objetos com texto/autor |

**Limitações:**
- Sem persistência entre dispositivos
- Sem sincronização em tempo real
- Limite de ~5-10MB por domínio
- Sem suporte a vídeos
- Sem notificações em tempo real

## Nova Arquitetura (TiDB + Backend)

### Schema de Base de Dados

```sql
-- Utilizadores (autenticação via OAuth Manus)
users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)

-- Perfis estendidos
userProfiles (id, userId, bio, avatar, createdAt, updatedAt)

-- Posts com suporte a mídia
posts (id, userId, text, image, video, videoThumbnail, likes, createdAt, updatedAt)

-- Likes (rastreamento individual)
postLikes (id, postId, userId, createdAt)

-- Comentários
comments (id, postId, userId, text, createdAt, updatedAt)

-- Amizades (com estados)
friendships (id, userId, friendId, status, createdAt, updatedAt)

-- Mensagens diretas
directMessages (id, senderId, recipientId, text, isRead, createdAt)

-- Notificações in-app
notifications (id, userId, type, relatedUserId, relatedPostId, message, isRead, createdAt)
```

### Mapeamento de Dados

#### Utilizadores

**LocalStorage:**
```json
{
  "id": "user-123",
  "name": "João Silva",
  "email": "joao@example.com",
  "avatar": "data:image/jpeg;base64,...",
  "bio": "Desenvolvedor"
}
```

**TiDB:**
```sql
INSERT INTO users (openId, name, email, loginMethod, role) 
VALUES ('user-123', 'João Silva', 'joao@example.com', 'local', 'user');

INSERT INTO userProfiles (userId, bio, avatar) 
VALUES (1, 'Desenvolvedor', 'https://storage.example.com/avatar-1.jpg');
```

#### Posts

**LocalStorage:**
```json
{
  "id": 1,
  "authorId": "user-123",
  "text": "Olá mundo!",
  "image": "data:image/jpeg;base64,...",
  "likes": ["user-456", "user-789"],
  "comments": [
    { "authorId": "user-456", "text": "Legal!" }
  ],
  "timestamp": 1623456789000
}
```

**TiDB:**
```sql
-- Post
INSERT INTO posts (userId, text, image, likes, createdAt) 
VALUES (1, 'Olá mundo!', 'https://storage.example.com/post-1.jpg', 2, '2024-06-15 10:00:00');

-- Likes (individual tracking)
INSERT INTO postLikes (postId, userId) VALUES (1, 2);
INSERT INTO postLikes (postId, userId) VALUES (1, 3);

-- Comentários
INSERT INTO comments (postId, userId, text) VALUES (1, 2, 'Legal!');
```

#### Amizades

**LocalStorage:**
```json
{
  "userId": "user-123",
  "friends": ["user-456", "user-789"],
  "pendingRequests": ["user-999"]
}
```

**TiDB:**
```sql
-- Amizades aceites (bidirecional)
INSERT INTO friendships (userId, friendId, status) VALUES (1, 2, 'accepted');
INSERT INTO friendships (userId, friendId, status) VALUES (2, 1, 'accepted');

-- Pedidos pendentes
INSERT INTO friendships (userId, friendId, status) VALUES (1, 4, 'pending');
```

## Processo de Migração

### Pré-requisitos

1. **Backend em execução:** Node.js + tRPC + TiDB
2. **Autenticação:** OAuth Manus configurado
3. **S3:** Bucket para armazenamento de mídia
4. **Script de migração:** Executado uma única vez

### Passos de Migração

#### 1. Preparação

```bash
# Backup dos dados LocalStorage (no navegador)
# Abrir DevTools > Console
const backup = {
  users: JSON.parse(localStorage.getItem('users') || '[]'),
  posts: JSON.parse(localStorage.getItem('posts') || '[]'),
  friendships: JSON.parse(localStorage.getItem('friendships') || '[]')
};
console.log(JSON.stringify(backup));
# Copiar e guardar num ficheiro seguro
```

#### 2. Upload de Mídia

Todos os dados base64 (imagens, avatares) devem ser convertidos para S3:

```typescript
// Converter base64 para URL S3
async function migrateMedia(base64: string, type: 'image' | 'avatar'): Promise<string> {
  const buffer = Buffer.from(base64.split(',')[1], 'base64');
  const key = `migration/${type}/${Date.now()}.jpg`;
  const { url } = await storagePut(key, buffer, 'image/jpeg');
  return url;
}
```

#### 3. Importação de Dados

```typescript
// Script de migração (executar uma única vez)
async function migrateFromLocalStorage(backupData: any) {
  // 1. Criar utilizadores
  for (const user of backupData.users) {
    const openId = `migrated-${user.id}`;
    await upsertUser({
      openId,
      name: user.name,
      email: user.email,
      loginMethod: 'local',
    });
    
    // 2. Migrar avatar
    if (user.avatar) {
      const avatarUrl = await migrateMedia(user.avatar, 'avatar');
      await updateUserProfile(user.id, user.bio || '', avatarUrl);
    }
  }
  
  // 3. Criar posts
  for (const post of backupData.posts) {
    const imageUrl = post.image ? await migrateMedia(post.image, 'image') : null;
    await createPost(post.authorId, post.text, imageUrl);
  }
  
  // 4. Criar amizades
  for (const friendship of backupData.friendships) {
    await sendFriendRequest(friendship.userId, friendship.friendId);
  }
}
```

#### 4. Validação

```sql
-- Verificar contagem de dados
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_posts FROM posts;
SELECT COUNT(*) as total_friendships FROM friendships WHERE status = 'accepted';

-- Verificar integridade de chaves estrangeiras
SELECT * FROM posts WHERE userId NOT IN (SELECT id FROM users);
SELECT * FROM comments WHERE userId NOT IN (SELECT id FROM users);
```

## Funcionalidades Novas

### 1. Sincronização em Tempo Real

**Antes:** Dados desincronizados entre abas
**Depois:** Todos os dados sincronizados via tRPC + WebSocket

### 2. Suporte a Vídeos

- Upload até 50MB
- Armazenamento em S3
- Geração automática de thumbnails
- Reprodução inline

### 3. Mensagens Diretas

- Chat 1-a-1 com amigos
- Histórico persistido
- Notificações de novas mensagens

### 4. Notificações Push

- Likes, comentários, pedidos de amizade
- Alertas em tempo real
- Histórico de notificações

### 5. Paginação Infinita

- Feed carrega 20 posts por vez
- Scroll infinito automático
- Algoritmo de relevância: `score = (likes × 2) + comentários`

## Rollback (Se Necessário)

Se a migração falhar ou houver problemas:

1. **Dados LocalStorage ainda existem** no navegador (não foram apagados)
2. **Reverter para versão anterior** da aplicação
3. **Contactar suporte** para restaurar dados na base de dados

## Limitações Conhecidas

1. **Vídeos:** Geração de thumbnails é placeholder (requer FFmpeg em produção)
2. **Notificações em tempo real:** Requer WebSocket (não implementado nesta versão)
3. **Migração manual:** Não há UI automática (requer script)

## Próximos Passos

- [ ] Implementar WebSocket para notificações em tempo real
- [ ] Adicionar geração real de thumbnails com FFmpeg
- [ ] Criar UI de migração automática
- [ ] Implementar sincronização offline com Service Worker

---

**Versão:** 1.0  
**Data:** Junho 2026  
**Autor:** MINE Development Team
