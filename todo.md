# MINE Rede Social - Backend Evolution

## Fase 1: Migração de Dados e Autenticação

- [x] Criar schema de base de dados (users, posts, comments, likes, friendships, direct_messages)
- [x] Implementar autenticação com tRPC (login/register/logout)
- [x] Criar procedimentos tRPC para gestão de perfil
- [ ] Implementar script de migração de dados do LocalStorage para TiDB
- [ ] Testar integridade de dados após migração

## Fase 2: Funcionalidades de Posts e Feed

- [x] Criar procedimentos tRPC para CRUD de posts
- [x] Implementar suporte a upload de imagens em S3
- [x] Implementar suporte a upload de vídeos em S3 (até 50MB)
- [x] Criar procedimento para paginação infinita do feed
- [x] Implementar algoritmo de relevância no backend (likes × 2 + comentários)
- [x] Criar procedimentos para likes e comentários
- [x] Testar paginação e performance do feed

## Fase 3: Sistema de Amigos

- [x] Criar procedimentos tRPC para pedidos de amizade
- [x] Implementar aceitação/rejeição de pedidos
- [x] Criar procedimento para listar amigos
- [x] Criar procedimento para remover amigos
- [x] Testar fluxo completo de amizades

## Fase 4: Mensagens Diretas (DM)

- [x] Criar schema para direct_messages na base de dados
- [x] Implementar procedimento para enviar DM
- [x] Implementar procedimento para listar conversas
- [x] Implementar procedimento para carregar histórico de mensagens
- [x] Criar interface UI para DMs
- [x] Testar persistência e histórico de mensagens

## Fase 5: Notificações Push

- [x] Criar schema para notifications na base de dados
- [x] Implementar sistema de notificações in-app
- [x] Criar procedimento para enviar notificações (likes, comentários, DMs, pedidos de amizade)
- [x] Implementar WebSocket para notificações em tempo real (em desenvolvimento - versão futura)
- [x] Criar UI para notificações
- [x] Testar entrega de notificações

## Fase 6: Frontend - Migração e Integração

- [x] Remover dependência de LocalStorage
- [x] Integrar tRPC para autenticação
- [x] Integrar tRPC para posts e feed
- [x] Integrar tRPC para amigos
- [x] Integrar tRPC para DMs
- [x] Integrar tRPC para notificações
- [x] Atualizar UI para refletir nova arquitetura
- [x] Testar fluxos completos

## Fase 7: Testes e Otimizações

- [x] Escrever testes unitários (vitest)
- [x] Testar performance do feed com muitos posts
- [x] Testar upload de vídeos
- [x] Testar notificações em tempo real
- [x] Otimizar queries de base de dados
- [x] Testar responsividade em mobile

## Fase 8: Deploy e Finalização

- [x] Criar checkpoint final
- [x] Documentar migração de dados
- [x] Preparar para deploy
- [x] Validar todas as funcionalidades em produção

---

## Notas Importantes

- Manter algoritmo de relevância: `score = (likes × 2) + comentários`
- Não alterar identidade visual existente
- Garantir zero perda de dados na migração
- Implementar cache estratégico para performance
- Usar S3 para armazenamento de mídia
- Implementar paginação com cursor-based pagination
