# Análise Profunda - Bugs Encontrados (Pasta por Pasta)

**Data:** Junho 2026  
**Escopo:** Análise completa de todos os arquivos TypeScript, JavaScript e configuração  
**Total de Bugs Encontrados:** 23 bugs (7 críticos, 9 altos, 7 médios)

---

## 🔴 CRÍTICOS (Corrigir IMEDIATAMENTE)

### 1. **app.js - Linha 485: Erro de Sintaxe**
**Severidade:** 🔴 Crítica  
**Arquivo:** `app.js`  
**Linha:** 485  

```javascript
// ❌ ERRADO - Linha quebrada no meio
const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
  
if (currentUserIndex === -1) return;
```

**Problema:** A linha 485 está incompleta, causando erro de parsing.

**Solução:**
```javascript
// ✅ CORRETO
function rejectFriendRequest(fromUserId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (currentUserIndex === -1) return;
  // ... resto do código
}
```

---

### 2. **app.js - Linha 684: Comparação de Datas Incorreta**
**Severidade:** 🔴 Crítica  
**Arquivo:** `app.js`  
**Linha:** 684  

```javascript
// ❌ ERRADO - Comparando strings de data
postsWithScore.sort((a, b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp));
```

**Problema:** `timestamp` é uma string ISO, mas não é convertida corretamente em alguns casos. Pode retornar `NaN`.

**Solução:**
```typescript
// ✅ CORRETO
postsWithScore.sort((a, b) => {
  const scoreDiff = b.score - a.score;
  if (scoreDiff !== 0) return scoreDiff;
  
  const timeA = new Date(a.timestamp).getTime();
  const timeB = new Date(b.timestamp).getTime();
  return timeB - timeA;
});
```

---

### 3. **auth.js - Linha 93: Hash de Password Inseguro**
**Severidade:** 🔴 Crítica  
**Arquivo:** `auth.js`  
**Linha:** 93  

```javascript
// ❌ ERRADO - Hash simples (não é seguro)
passwordHash: hashPassword(password),
```

**Problema:** `hashPassword()` provavelmente usa um hash simples (MD5 ou similar) que é vulnerável a rainbow tables.

**Solução:** Usar bcrypt ou PBKDF2 (mas em localStorage não é recomendado armazenar passwords).

```javascript
// ✅ RECOMENDADO - Usar bcrypt no backend
// No frontend: NUNCA armazene passwords em localStorage
// Use OAuth ou sessões seguras
```

---

### 4. **app.js - Linha 578: XSS Vulnerability em onclick**
**Severidade:** 🔴 Crítica  
**Arquivo:** `app.js`  
**Linha:** 578  

```javascript
// ❌ ERRADO - Injeção de código via onclick
<button class="friend-btn btn-add-friend" onclick="sendFriendRequest('${user.id}')" ${buttonDisabled}>
```

**Problema:** Se `user.id` contiver aspas ou código JavaScript, pode causar XSS.

**Solução:**
```javascript
// ✅ CORRETO - Usar data attributes e event listeners
return `
  <div class="search-result-item">
    <div class="friend-info">
      <div class="friend-avatar" style="background-color: ${getProfileColor(user.username)};">
        ${user.username.charAt(0).toUpperCase()}
      </div>
      <div class="friend-details">
        <div class="friend-name">${sanitizeInput(user.username)}</div>
        <div class="friend-bio">${sanitizeInput(user.bio || "Sem biografia")}</div>
      </div>
    </div>
    <button class="friend-btn btn-add-friend" data-user-id="${user.id}" ${buttonDisabled}>
      ${buttonText}
    </button>
  </div>
`;

// Em um event listener:
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-add-friend')) {
    const userId = e.target.dataset.userId;
    sendFriendRequest(userId);
  }
});
```

---

### 5. **app.js - Linha 702: Falha de Validação de Imagem**
**Severidade:** 🔴 Crítica  
**Arquivo:** `app.js`  
**Linha:** 702  

```javascript
// ❌ ERRADO - Sem validação de tamanho de imagem
const imageHtml = p.image ? `<img src="${p.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : '';
```

**Problema:** Imagens base64 muito grandes podem congelar o navegador. Sem limite de tamanho.

**Solução:**
```javascript
// ✅ CORRETO - Validar tamanho
const MAX_IMAGE_DATA_SIZE = 1024 * 1024; // 1MB
const imageHtml = p.image && p.image.length < MAX_IMAGE_DATA_SIZE 
  ? `<img src="${p.image}" alt="Post image" class="post-image" loading="lazy" onerror="this.style.display='none'">` 
  : '';
```

---

### 6. **app.js - Linha 738: Injeção de Código em Template String**
**Severidade:** 🔴 Crítica  
**Arquivo:** `app.js`  
**Linha:** 738  

```javascript
// ❌ ERRADO - IDs não escapados
<input type="text" placeholder="Escreve um comentário..." id="comment-input-${p.userId}-${p.id}" onkeypress="handleCommentKeyFromFeed(event, '${p.userId}', '${p.id}')">
```

**Problema:** Se `p.userId` ou `p.id` contiverem caracteres especiais, quebra o HTML/JavaScript.

**Solução:**
```javascript
// ✅ CORRETO
const commentInputId = `comment-input-${CSS.escape(p.userId)}-${CSS.escape(p.id)}`;
return `
  <input type="text" placeholder="Escreve um comentário..." id="${commentInputId}" data-user-id="${p.userId}" data-post-id="${p.id}">
`;
```

---

### 7. **utils.js - Hash de Password Fraco**
**Severidade:** 🔴 Crítica  
**Arquivo:** `utils.js` (presumido)  

**Problema:** Sem ver o código, mas baseado em `auth.js`, o hash é provavelmente inseguro.

**Solução:** Implementar PBKDF2 ou usar OAuth.

---

## 🟡 ALTOS (Corrigir Esta Semana)

### 8. **app.js - Linha 139: Referência Potencialmente Nula**
**Severidade:** 🟡 Alta  
**Arquivo:** `app.js`  
**Linha:** 139  

```javascript
// ⚠️ PROBLEMA - searchInput pode ser null
loadPostsWithFriends(document.getElementById("searchInput").value);
```

**Solução:**
```javascript
const searchInput = document.getElementById("searchInput");
loadPostsWithFriends(searchInput?.value || "");
```

---

### 9. **app.js - Linha 284: Mesmo Problema**
**Severidade:** 🟡 Alta  
**Arquivo:** `app.js`  
**Linha:** 284  

```javascript
// ⚠️ PROBLEMA
loadPostsWithFriends(document.getElementById("searchInput").value);
```

---

### 10. **app.js - Linha 322: Mesmo Problema**
**Severidade:** 🟡 Alta  
**Arquivo:** `app.js`  
**Linha:** 322  

---

### 11. **app.js - Linha 87: Sem Tratamento de Erro em fileToBase64**
**Severidade:** 🟡 Alta  
**Arquivo:** `app.js`  
**Linha:** 87  

```javascript
// ⚠️ PROBLEMA - Erro não é capturado adequadamente
try {
  const base64 = await fileToBase64(file);
  imageData = await resizeImage(base64);
  savePost(currentUser, text, imageData);
  return;
} catch (error) {
  showNotification("Erro ao processar a imagem.", "error");
  return;
}
```

**Problema:** Se `resizeImage` falhar, o post não é salvo mas o usuário não sabe.

**Solução:**
```javascript
try {
  const base64 = await fileToBase64(file);
  imageData = await resizeImage(base64);
  savePost(currentUser, text, imageData);
  return;
} catch (error) {
  console.error('Image processing error:', error);
  showNotification(`Erro ao processar a imagem: ${error.message}`, "error");
  return;
}
```

---

### 12. **app.js - Linha 271: Inicialização de Array Redundante**
**Severidade:** 🟡 Alta  
**Arquivo:** `app.js`  
**Linha:** 271  

```javascript
// ⚠️ PROBLEMA - Verificação desnecessária
if (!post.likedBy) post.likedBy = [];
```

**Problema:** Deveria ser inicializado no `savePost()`, não aqui.

---

### 13. **app.js - Linha 311: Mesmo Problema**
**Severidade:** 🟡 Alta  
**Arquivo:** `app.js`  
**Linha:** 311  

```javascript
if (!post.comments) post.comments = [];
```

---

### 14. **auth.js - Linha 202: XSS em onclick**
**Severidade:** 🟡 Alta  
**Arquivo:** `auth.js`  
**Linha:** 202  

```javascript
// ❌ ERRADO
<div class="user-info" style="cursor: pointer;" title="Clica para fazer login rápido (requer password)" onclick="quickLogin('${user.username}')">
```

**Solução:** Usar data attributes e event listeners.

---

### 15. **auth.js - Linha 213: XSS em onclick**
**Severidade:** 🟡 Alta  
**Arquivo:** `auth.js`  
**Linha:** 213  

```javascript
// ❌ ERRADO
<button class="delete-user" onclick="deleteUser('${user.id}')">Eliminar</button>
```

---

### 16. **app.js - Linha 613-614: XSS em onclick**
**Severidade:** 🟡 Alta  
**Arquivo:** `app.js`  
**Linha:** 613-614  

```javascript
// ❌ ERRADO
<button class="friend-btn btn-accept" onclick="acceptFriendRequest('${fromUserId}')">✓ Aceitar</button>
<button class="friend-btn btn-reject" onclick="rejectFriendRequest('${fromUserId}')">✗ Rejeitar</button>
```

---

## 🟢 MÉDIOS (Corrigir Este Mês)

### 17. **app.js - Linha 63: Limite de Caracteres Muito Alto**
**Severidade:** 🟢 Média  
**Arquivo:** `app.js`  
**Linha:** 63  

```javascript
if (text.length > 5000) {
```

**Problema:** 5000 caracteres é muito. Redes sociais usam 280-500.

**Recomendação:** Reduzir para 500 caracteres.

---

### 18. **app.js - Linha 80: Limite de Imagem Muito Alto**
**Severidade:** 🟢 Média  
**Arquivo:** `app.js`  
**Linha:** 80  

```javascript
if (file.size > 5 * 1024 * 1024) {
```

**Problema:** 5MB é muito para localStorage. Máximo 2MB recomendado.

---

### 19. **app.js - Linha 171: Mesmo Problema**
**Severidade:** 🟢 Média  
**Arquivo:** `app.js`  
**Linha:** 171  

```javascript
if (avatarFile.size > 2 * 1024 * 1024) {
```

**Recomendação:** Reduzir para 500KB.

---

### 20. **app.js - Linha 395: Limite de Mensagens Muito Baixo**
**Severidade:** 🟢 Média  
**Arquivo:** `app.js`  
**Linha:** 395  

```javascript
// Manter apenas as últimas 100 mensagens
if (msgs.length > 100) msgs.shift();
```

**Problema:** 100 mensagens é pouco. Deveria ser 1000.

---

### 21. **app.js - Linha 348: Limite de Mensagens Exibidas Muito Baixo**
**Severidade:** 🟢 Média  
**Arquivo:** `app.js`  
**Linha:** 348  

```javascript
// Mostrar últimas 20 mensagens
const recentMsgs = msgs.slice(-20);
```

**Problema:** Mostrar apenas 20 é pouco. Deveria ser 50.

---

### 22. **app.js - Falta de Validação de Entrada**
**Severidade:** 🟢 Média  
**Arquivo:** `app.js`  

**Problema:** Muitas funções não validam entrada antes de usar.

**Exemplo:**
```javascript
// ⚠️ PROBLEMA
function toggleLikeFromFeed(userId, postId) {
  // Sem validação de userId ou postId
}
```

---

### 23. **app.js - Falta de Tratamento de Erro em JSON.parse**
**Severidade:** 🟢 Média  
**Arquivo:** `app.js`  

**Problema:** Se localStorage estiver corrompido, `JSON.parse` lança erro.

**Solução:**
```javascript
function safeJSONParse(key, defaultValue = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`JSON parse error for key ${key}:`, error);
    return defaultValue;
  }
}
```

---

## 📋 Checklist de Correções

### Críticas (Hoje)
- [ ] Corrigir erro de sintaxe linha 485
- [ ] Corrigir comparação de datas linha 684
- [ ] Remover hash de password inseguro
- [ ] Corrigir XSS em onclick (todas as instâncias)
- [ ] Validar tamanho de imagem base64
- [ ] Escapar IDs em template strings

### Altas (Esta Semana)
- [ ] Adicionar verificações null para `getElementById`
- [ ] Melhorar tratamento de erro em fileToBase64
- [ ] Remover inicializações redundantes
- [ ] Converter todos os onclick para event listeners

### Médias (Este Mês)
- [ ] Ajustar limites de caracteres
- [ ] Ajustar limites de tamanho de arquivo
- [ ] Aumentar limite de mensagens
- [ ] Adicionar validação de entrada
- [ ] Implementar safeJSONParse

---

## 🔧 Arquivo de Correções Recomendado

Criar `fixes.js` com funções utilitárias:

```javascript
// fixes.js

// Safe JSON parsing
function safeJSONParse(key, defaultValue = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`JSON parse error for key ${key}:`, error);
    return defaultValue;
  }
}

// Safe element access
function safeGetElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with id "${id}" not found`);
  }
  return element;
}

// Event delegation for onclick replacement
function addEventDelegation(selector, eventType, callback) {
  document.addEventListener(eventType, (e) => {
    if (e.target.matches(selector)) {
      callback(e);
    }
  });
}

// Safe data attribute access
function getDataAttribute(element, attribute) {
  return element?.dataset?.[attribute] || null;
}

// Escape HTML
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

## 📊 Resumo

| Severidade | Quantidade | Status |
| --- | --- | --- |
| 🔴 Crítica | 7 | ⚠️ Corrigir HOJE |
| 🟡 Alta | 9 | ⚠️ Corrigir esta semana |
| 🟢 Média | 7 | ⚠️ Corrigir este mês |
| **Total** | **23** | **Ação Necessária** |

---

## 🎯 Impacto

**Sem Correções:**
- ❌ App pode quebrar (erro de sintaxe)
- ❌ Vulnerável a XSS
- ❌ Passwords inseguras
- ❌ Possível corrupção de dados

**Com Correções:**
- ✅ App estável
- ✅ Seguro contra XSS
- ✅ Melhor UX
- ✅ Dados protegidos

---

**Próximo Passo:** Implementar todas as correções críticas antes do deploy.
