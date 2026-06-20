# Relatório de Correção de Bugs Críticos

**Autor:** Manus AI  
**Data:** 20 de Junho de 2026

## 1. Introdução

Este relatório detalha as correções implementadas para os 7 bugs críticos identificados no projeto `MINE-REDE-SOCIAL-`, conforme solicitado pelo utilizador. As correções focaram na remoção de handlers `onclick` inline, na mitigação de vulnerabilidades de Cross-Site Scripting (XSS) através de injeções de HTML inseguras, na melhoria da segurança de hash de passwords, e na resolução de problemas de sintaxe e lógica de comparação de datas.

O código corrigido foi commitado e enviado para o repositório GitHub do projeto [1].

## 2. Sumário dos Bugs Críticos Corrigidos

A tabela abaixo resume os 7 bugs críticos abordados nesta fase de correção:

| ID | Arquivo | Linha Original | Descrição do Bug | Tipo de Vulnerabilidade/Problema | Solução Implementada |
|----|---------|----------------|------------------|-----------------------------------|----------------------|
| 1  | `app.js` | 485            | Erro de Sintaxe em `rejectFriendRequest` | Erro de Sintaxe/Lógica | Correção da sintaxe e lógica da função. |
| 2  | `app.js` | 684            | Comparação de Datas Incorreta | Lógica de Negócio/Potencial `NaN` | Implementação de `parseDate` robusto para strings de data. |
| 3  | `auth.js` | 93             | Hash de Password Inseguro | Segurança (Hash Fraco) | Melhoria do algoritmo de hash em `utils.js` com mais iterações e salt. |
| 4  | `app.js` | 578            | XSS Vulnerability em `onclick` | Segurança (XSS) | Substituição de `onclick` inline por `data-attributes` e `addEventListener` (já parcialmente implementado, mas reforçado com sanitização de dados). |
| 5  | `app.js` | 702            | Falha de Validação de Imagem | Segurança/Performance | Sanitização de `src` de imagem e validação de tamanho (já existia, mas foi garantida a sanitização). |
| 6  | `app.js` | 738            | Injeção de Código em Template String | Segurança (XSS) | Uso de `CSS.escape` para IDs e `sanitizeInput` para atributos de dados em HTML gerado. |
| 7  | `utils.js` | N/A            | Hash de Password Fraco | Segurança (Hash Fraco) | Melhoria do algoritmo de hash em `utils.js` com mais iterações e salt. |

## 3. Detalhes das Correções

### 3.1. Bug 1: Erro de Sintaxe em `app.js` (Linha 485)

**Problema Original:** A função `rejectFriendRequest` em `app.js` apresentava um erro de sintaxe na linha 485, que impedia a correta execução da lógica de rejeição de pedidos de amizade.

**Solução Implementada:** A sintaxe da função foi corrigida para garantir que o código fosse válido e a lógica de filtragem de pedidos de amizade fosse aplicada corretamente. A função agora remove o `fromUserId` da lista `friendRequests` do utilizador atual e persiste as alterações no `localStorage`.

### 3.2. Bug 2: Comparação de Datas Incorreta em `app.js` (Linha 684)

**Problema Original:** A ordenação de posts no feed (`postsWithScore.sort`) utilizava `new Date(b.timestamp) - new Date(a.timestamp)`, o que podia resultar em `NaN` devido ao formato de data armazenado (`toLocaleString('pt-PT')`), que não é universalmente parsável pelo construtor `Date` em todos os ambientes.

**Solução Implementada:** Foi introduzida uma função auxiliar `parseDate` que tenta converter a string de data para um timestamp numérico de forma mais robusta. Esta função tenta primeiro o `new Date()` direto e, em caso de falha, tenta um parsing manual para o formato `DD/MM/AAAA, HH:MM:SS` antes de retornar o timestamp. Isso garante que a comparação de datas seja sempre numérica e evita resultados `NaN`.

### 3.3. Bug 3 & 7: Hash de Password Inseguro em `auth.js` (Linha 93) e `utils.js`

**Problema Original:** A função `hashPassword` (e `hashPasswordImproved`) utilizava um algoritmo de hash simples, vulnerável a ataques de força bruta e rainbow tables, especialmente para passwords curtas ou comuns. Embora o armazenamento de passwords no `localStorage` não seja recomendado para aplicações de produção, a segurança do hash existente era deficiente.

**Solução Implementada:** A função `hashPassword` em `utils.js` foi melhorada para incluir um salt mais complexo e um número significativamente maior de iterações (de 1000 para 5000), além de incorporar o índice da iteração no hash, tornando-o mais resistente a ataques de força bruta. A função `auth.js` foi atualizada para usar esta versão melhorada. Foi adicionada uma nota no código a alertar que, em produção, um hash mais robusto (como bcrypt ou Argon2) deve ser usado no backend.

### 3.4. Bug 4: XSS Vulnerability em `onclick` em `app.js` (Linha 578)

**Problema Original:** Embora o projeto já utilizasse delegação de eventos para muitos botões, algumas injeções de HTML ainda podiam conter `onclick` inline ou dados não sanitizados em atributos, como no caso dos botões de adicionar/aceitar/rejeitar amigos e na geração de hashtags, o que poderia levar a vulnerabilidades XSS se os dados do utilizador contivessem código malicioso.

**Solução Implementada:** Foi garantido que todos os `data-attributes` e conteúdos de texto gerados dinamicamente em HTML, especialmente em elementos interativos como botões de amizade e hashtags, fossem explicitamente sanitizados usando a função `sanitizeInput`. Além disso, a geração de HTML para `search-result-item`, `friend-item` e `post` foi revista para garantir que os IDs e outros atributos sensíveis fossem escapados corretamente com `CSS.escape` e `sanitizeInput`.

### 3.5. Bug 5: Falha de Validação de Imagem em `app.js` (Linha 702)

**Problema Original:** A injeção de imagens base64 diretamente no HTML (`<img src="${p.image}">`) sem validação rigorosa do tamanho poderia levar a problemas de performance ou até mesmo a congelamento do navegador se as imagens fossem excessivamente grandes. Embora já existisse uma validação de tamanho de imagem para posts, a injeção no HTML precisava de ser mais segura.

**Solução Implementada:** A lógica de renderização de imagens no feed foi revista. Embora a validação de tamanho já estivesse presente, foi garantido que o `src` da imagem fosse sanitizado com `sanitizeInput` para prevenir qualquer injeção inesperada. Além disso, a injeção do avatar do utilizador no perfil (`updateProfileUI`) foi alterada para criar o elemento `<img>` via DOM (`document.createElement('img')`) e definir o `src` programaticamente, em vez de usar `innerHTML`, o que é uma prática mais segura contra XSS.

### 3.6. Bug 6: Injeção de Código em Template String em `app.js` (Linha 738)

**Problema Original:** A criação de IDs dinâmicos para campos de input de comentários (`id="comment-input-${p.userId}-${p.id}"`) dentro de template strings era vulnerável. Se `p.userId` ou `p.id` contivessem caracteres especiais (como aspas ou espaços), o HTML gerado seria quebrado, podendo levar a injeção de código ou a falhas na funcionalidade.

**Solução Implementada:** Os IDs dinâmicos para os inputs de comentários foram corrigidos utilizando `CSS.escape()` para garantir que quaisquer caracteres especiais nos `userId` e `postId` fossem escapados corretamente, resultando em IDs CSS válidos e seguros. Além disso, os `data-attributes` associados a estes elementos também foram sanitizados com `sanitizeInput`.

## 4. Conclusão

As correções implementadas abordam os 7 bugs críticos identificados, melhorando significativamente a segurança e a robustez da aplicação. A remoção de `onclick` inline, a sanitização de injeções de HTML, a melhoria do hash de passwords e a correção de erros de sintaxe e lógica são passos fundamentais para tornar o `MINE-REDE-SOCIAL-` mais seguro e funcional. Recomenda-se uma revisão contínua do código e a implementação de práticas de segurança mais avançadas, especialmente no que diz respeito à gestão de utilizadores e autenticação em ambientes de produção.

## 5. Referências

[1] Repositório GitHub: [fernandolukoki94-beep/MINE-REDE-SOCIAL-](https://github.com/fernandolukoki94-beep/MINE-REDE-SOCIAL-)
