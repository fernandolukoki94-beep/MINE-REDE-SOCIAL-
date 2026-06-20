# Plano de Testes Manus - MINE REDE SOCIAL

Este plano visa validar as correções implementadas para resolver a regressão de API e melhorar a segurança da aplicação.

## 1. Validação do Conflito de `safeJSONParse`
- **Objetivo:** Garantir que a aplicação consegue ler dados do `localStorage` corretamente.
- **Passos:**
  1. Abrir a aplicação.
  2. Fazer login ou registar um novo utilizador.
  3. Criar um post.
  4. Recarregar a página.
- **Resultado Esperado:** O post e o estado da sessão devem persistir após o recarregamento. Se o conflito persistir, a lista de posts aparecerá vazia.

## 2. Validação do Novo Hash de Password
- **Objetivo:** Garantir que novos utilizadores usam o hash melhorado e utilizadores antigos ainda conseguem fazer login.
- **Passos:**
  1. Registar um utilizador "NovoUser".
  2. Verificar no `localStorage` (consola do browser) se o `passwordHash` tem o formato hexadecimal esperado pelo `hashPasswordImproved`.
  3. Tentar fazer login com um utilizador criado antes desta correção.
- **Resultado Esperado:** Ambos os utilizadores devem conseguir fazer login com sucesso.

## 3. Validação de Segurança DOM (Remover Amigo)
- **Objetivo:** Garantir que a lista de amigos é renderizada de forma segura e funcional.
- **Passos:**
  1. Adicionar um amigo.
  2. Ir à lista de amigos.
  3. Clicar em "Remover".
- **Resultado Esperado:** O amigo deve ser removido da lista e o DOM deve ser atualizado sem erros de referência nula ou injeção de script.

## 4. Teste de Regressão de Limites
- **Objetivo:** Garantir que os limites de caracteres e ficheiros definidos em `fixes.js` estão a ser aplicados.
- **Passos:**
  1. Tentar criar um post com mais de 500 caracteres.
  2. Tentar fazer upload de uma imagem superior a 2MB.
- **Resultado Esperado:** A aplicação deve impedir a ação e mostrar uma notificação de erro amigável.
