# Plano de Testes: Validação de Correções de Bugs Críticos

**Autor:** Manus AI  
**Data:** 20 de Junho de 2026  
**Projeto:** MINE-REDE-SOCIAL-

## 1. Introdução

Este documento estabelece o plano de testes para validar as correções aplicadas aos 7 bugs críticos identificados no projeto `MINE-REDE-SOCIAL-`. O objetivo é garantir que as vulnerabilidades de segurança (XSS, hash fraco), erros de sintaxe e falhas lógicas foram resolvidos com sucesso, sem introduzir regressões no sistema.

## 2. Escopo dos Testes

Os testes focarão nas seguintes áreas, correspondentes aos bugs corrigidos:
1.  **Funcionalidade de Pedidos de Amizade:** Rejeição de pedidos.
2.  **Ordenação do Feed:** Comparação de datas dos posts.
3.  **Segurança de Autenticação:** Algoritmo de hash de passwords.
4.  **Prevenção de XSS:** Sanitização de inputs e remoção de `onclick` inline.
5.  **Renderização de Imagens:** Validação e injeção segura de avatares e imagens de posts.
6.  **Manipulação de DOM:** Escapamento de IDs dinâmicos.

## 3. Casos de Teste

A tabela abaixo detalha os casos de teste específicos para cada bug corrigido.

| ID do Teste | Bug Relacionado | Descrição do Teste | Passos de Execução | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Bug 1 (Erro de Sintaxe em `rejectFriendRequest`) | Validar a rejeição de um pedido de amizade. | 1. Fazer login com o Utilizador A.<br>2. Enviar pedido de amizade para o Utilizador B.<br>3. Fazer login com o Utilizador B.<br>4. Navegar até "Pedidos de Amizade".<br>5. Clicar em "✗ Rejeitar" no pedido do Utilizador A. | O pedido de amizade desaparece da lista. Nenhuma mensagem de erro na consola do navegador. O Utilizador A não é adicionado à lista de amigos. |
| **TC-02** | Bug 2 (Comparação de Datas Incorreta) | Validar a ordenação correta dos posts no feed por data e pontuação. | 1. Criar 3 posts com diferentes pontuações (likes/comentários) e datas (modificar manualmente o `localStorage` para simular datas antigas e recentes, incluindo formatos inválidos ou diferentes).<br>2. Recarregar a página do feed. | Os posts são ordenados primeiro por pontuação (decrescente) e, em caso de empate, por data (mais recente primeiro). Posts com datas inválidas não quebram a ordenação (são tratados como data 0). |
| **TC-03** | Bug 3 & 7 (Hash de Password Inseguro) | Validar o novo algoritmo de hash no registo e login. | 1. Registar um novo utilizador (Utilizador C) com a password "Teste123!".<br>2. Verificar o `localStorage` (`users`) e confirmar que o `passwordHash` do Utilizador C é uma string longa e complexa (não é a password em texto limpo nem um hash MD5 simples).<br>3. Fazer logout.<br>4. Fazer login com o Utilizador C e a password "Teste123!". | O login é bem-sucedido. O hash armazenado reflete o novo algoritmo com salt e múltiplas iterações. |
| **TC-04** | Bug 4 (XSS em `onclick` e injeções HTML) | Validar a prevenção de XSS na pesquisa de utilizadores e lista de amigos. | 1. Registar um utilizador com o nome `<script>alert('XSS')</script>`.<br>2. Com outro utilizador, pesquisar por esse nome.<br>3. Verificar a lista de resultados e a lista de amigos (se adicionado). | O script não é executado. O nome do utilizador é exibido como texto literal (`<script>alert('XSS')</script>`). Os botões de ação funcionam corretamente. |
| **TC-05** | Bug 4 (XSS em Hashtags) | Validar a prevenção de XSS na geração de hashtags. | 1. Criar um post com o texto: `Teste de hashtag #<img src=x onerror=alert('XSS')>`.<br>2. Visualizar o post no feed. | O script não é executado. A hashtag é renderizada como texto seguro ou ignorada se o formato for inválido, sem injetar HTML malicioso. |
| **TC-06** | Bug 5 (Falha de Validação de Imagem/Avatar) | Validar a injeção segura do avatar no perfil. | 1. Fazer login.<br>2. Editar o perfil e fazer upload de uma imagem válida.<br>3. Inspecionar o elemento do avatar no DOM (`#userAvatarDisplay`). | O avatar é renderizado usando um elemento `<img>` criado via DOM, não via `innerHTML`. O atributo `src` contém os dados base64 corretos. |
| **TC-07** | Bug 6 (Injeção de Código em Template String) | Validar o escapamento de IDs dinâmicos nos comentários. | 1. Modificar manualmente o `id` de um utilizador no `localStorage` para conter espaços ou aspas (ex: `user"id`).<br>2. Criar um post com esse utilizador.<br>3. Tentar adicionar um comentário a esse post. | O comentário é adicionado com sucesso. A consola não apresenta erros de seletores CSS inválidos. O ID do input de comentário no DOM está corretamente escapado. |

## 4. Ambiente de Teste

*   **Navegador:** Versão mais recente do Google Chrome ou Mozilla Firefox.
*   **Ferramentas:** Ferramentas de Desenvolvedor do Navegador (Console, Application/Storage tab para inspecionar o `localStorage`).
*   **Dados:** Limpar o `localStorage` antes de iniciar a suite de testes para garantir um ambiente limpo.

## 5. Critérios de Aceitação

A suite de testes será considerada bem-sucedida se todos os casos de teste (TC-01 a TC-07) passarem sem erros, confirmando que as vulnerabilidades foram mitigadas e a funcionalidade esperada foi mantida ou restaurada. Qualquer falha exigirá uma revisão da correção correspondente.
