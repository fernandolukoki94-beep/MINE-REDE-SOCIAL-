# Relatório de Auditoria Manus - MINE REDE SOCIAL

**Data:** 20 de Junho de 2026
**Analista:** Manus (AI Agent)
**Estado do Projeto:** O projeto passou por uma tentativa de correção massiva (`fixes.js`), mas introduziu uma regressão crítica de API.

## 🔴 CRÍTICOS (Corrigir IMEDIATAMENTE)

### 1. Regressão de API: Conflito de `safeJSONParse`
- **Arquivo:** `fixes.js` vs `app.js` / `utils.js`
- **Problema:** O arquivo `utils.js` define `safeJSONParse(key, defaultValue)` onde `key` é a chave do localStorage. No entanto, `fixes.js` (carregado depois) sobrescreve esta função com `safeJSONParse(jsonString, defaultValue)`, onde o primeiro argumento deve ser uma string JSON já lida.
- **Impacto:** Como `app.js` continua a chamar `safeJSONParse("users", [])`, a função tenta fazer `JSON.parse("users")`, o que falha e retorna sempre o valor por defeito (array vazio). **A aplicação "perde" todos os dados em runtime.**

### 2. Bypass de Segurança: Hash de Password Inconsistente
- **Arquivo:** `auth.js`
- **Problema:** Embora `fixes.js` defina `hashPasswordImproved`, o ficheiro `auth.js` ainda utiliza `hashPassword` (de `utils.js`) ou nem sequer utiliza os novos helpers de armazenamento.
- **Impacto:** Utilizadores registados com o método antigo podem não conseguir fazer login se a lógica mudar inconsistentemente, ou continuam vulneráveis a ataques de força bruta no LocalStorage.

### 3. Injeção de HTML Residual
- **Arquivo:** `app.js`
- **Problema:** Apesar das correções de `onclick`, ainda existem funções como `displayFriendsList` que utilizam `.innerHTML` com interpolação direta de strings. Embora exista `sanitizeInput`, o uso de `.innerHTML` é uma má prática comparado com `textContent` ou criação de elementos DOM.

## 🟡 ALTOS (Estabilidade e Robustez)

### 4. Falta de Validação de Esquema
- **Arquivo:** `shared/types.ts` vs `localStorage`
- **Problema:** Não existe validação de que os dados lidos do `localStorage` correspondem aos tipos TypeScript esperados.
- **Impacto:** Dados corrompidos ou versões antigas do esquema podem causar crashes silenciosos em toda a UI.

## 🟢 MÉDIOS (UX e Manutenção)

### 5. Código Morto e Redundância
- **Arquivo:** `fixes.js` e `utils.js`
- **Problema:** Existem múltiplas funções com o mesmo propósito (ex: `formatDate` vs `parseDate`, `safeJSONParse` vs `safeGetFromStorage`).
- **Impacto:** Dificulta a manutenção e aumenta o tamanho do bundle desnecessariamente.

---

## Plano de Ação Recomendado
1. **Unificar a API de utilidades:** Remover o conflito de `safeJSONParse`.
2. **Refatorar `auth.js`:** Garantir que usa as versões mais seguras das funções de hash e armazenamento.
3. **Remover `fixes.js`:** Integrar as correções válidas diretamente nos ficheiros principais (`app.js`, `utils.js`) para evitar a confusão de "monkey-patching" em runtime.
