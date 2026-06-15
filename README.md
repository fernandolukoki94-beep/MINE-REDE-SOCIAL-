# Mini Rede Social (PWA)

Uma aplicação de rede social minimalista, segura e funcional, construída com tecnologias web puras (HTML, CSS e JavaScript). Esta aplicação funciona inteiramente no navegador, utilizando o `localStorage` para persistência de dados, o que a torna ideal para demonstrações, protótipos ou uso pessoal offline.

## 🚀 Funcionalidades Principais

- **Autenticação Segura**: Registo e login com validação de passwords e hash básico
- **Publicações com Imagem**: Partilha pensamentos com suporte a imagens (até 5MB)
- **Sistema de Likes e Comentários**: Interage com publicações de forma intuitiva
- **Feed Inteligente**: Algoritmo que ordena posts por relevância (likes × 2 + comentários)
- **Sistema de Amigos**: Procura, pedidos de amizade e gestão de amigos
- **Mensagens Rápidas**: Chat simplificado com histórico das últimas 100 mensagens
- **Modo Escuro/Claro**: Suporte para temas visuais com persistência
- **Filtro de Conteúdo**: Filtro automático de palavras impróprias
- **Pesquisa em Tempo Real**: Encontra rapidamente publicações, autores ou hashtags
- **Hashtags Interativas**: Clica em hashtags para filtrar publicações
- **Validação de Entrada**: Proteção contra XSS e validações de tamanho
- **Exportação de Dados**: Descarrega todos os teus dados em JSON
- **PWA (Progressive Web App)**: Instalável no dispositivo, funciona offline

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessibilidade
- **CSS3**: Design moderno, responsivo com variáveis CSS para temas
- **JavaScript (Vanilla)**: Lógica de negócio, manipulação do DOM e gestão de estado
- **LocalStorage**: Armazenamento persistente no lado do cliente
- **Service Workers**: Suporte para funcionamento offline e instalação como PWA

## 📦 Como Utilizar

Não é necessária qualquer instalação de servidor ou dependências externas.

### Opção 1: Abrir Localmente
1. Clone o repositório:
   ```bash
   git clone https://github.com/fernandolukoki94-beep/MINE-REDE-SOCIAL-.git
   cd MINE-REDE-SOCIAL-
   ```
2. Abra o ficheiro `index.html` em qualquer navegador moderno

### Opção 2: Servidor Local (Recomendado para PWA)
1. Clone o repositório como acima
2. Inicie um servidor local:
   ```bash
   # Com Python 3
   python -m http.server 8000
   
   # Com Node.js (http-server)
   npx http-server
   
   # Com VS Code Live Server
   # Clique direito em index.html > Open with Live Server
   ```
3. Aceda a `http://localhost:8000`

## 🔐 Segurança

- **Passwords**: Utilizadas com hash simples (não é criptografia real)
- **Sanitização**: Todas as entradas são sanitizadas para evitar XSS
- **Validação**: Validação rigorosa de entrada em todos os formulários
- **Integridade**: Limpeza automática de dados ao eliminar utilizadores

**Nota**: Esta é uma aplicação de demonstração. Para produção, implementa:
- Hash bcrypt ou similar no servidor
- HTTPS obrigatório
- Autenticação com tokens JWT
- Base de dados segura

## 📁 Estrutura de Ficheiros

```
MINE-REDE-SOCIAL-/
├── index.html          # Página principal da aplicação
├── auth.html           # Página de autenticação
├── app.js              # Lógica principal da aplicação
├── auth.js             # Lógica de autenticação
├── utils.js            # Funções utilitárias e helpers
├── style.css           # Estilos CSS com suporte a temas
├── sw.js               # Service Worker para PWA
├── manifest.json       # Configuração de PWA
└── README.md           # Este ficheiro
```

## 🎯 Funcionalidades Detalhadas

### Autenticação
- Registo com validação de username (3-20 caracteres)
- Validação de força de password em tempo real
- Login com verificação de hash
- Logout seguro
- Eliminação de conta com limpeza completa de dados

### Publicações
- Criar posts com texto e imagem
- Limite de 5000 caracteres por post
- Suporte a imagens até 5MB
- Hashtags automáticas (clicáveis para filtrar)
- Filtro de palavras impróprias
- Eliminação apenas pelo autor

### Interações
- Like/Unlike posts (rastreamento por utilizador)
- Comentários com limite de 500 caracteres
- Contador de comentários no post
- Suporte a Enter para enviar comentários

### Amigos
- Procura de utilizadores
- Envio de pedidos de amizade
- Aceitação/rejeição de pedidos
- Remoção de amigos
- Feed agregado com posts de amigos

### Mensagens
- Chat simplificado com histórico
- Limite de 100 mensagens armazenadas
- Limite de 500 caracteres por mensagem
- Filtro de palavras impróprias

### Dados
- Exportação completa em JSON
- Limpeza de todos os dados pessoais
- Sincronização automática com localStorage

## 🎨 Temas

A aplicação suporta dois temas:
- **Claro**: Cores claras e confortáveis para o dia
- **Escuro**: Cores escuras para reduzir fadiga ocular

O tema é persistido no localStorage.

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:
- Desktop (Chrome, Firefox, Safari, Edge)
- Tablet
- Smartphone

## 🔄 Melhorias Recentes (v2.0)

### Segurança
- ✅ Hash de passwords com validação de força
- ✅ Sanitização de entrada para evitar XSS
- ✅ Validação rigorosa de formulários
- ✅ Limpeza automática de dados ao eliminar utilizadores

### Performance
- ✅ Algoritmo de feed inteligente
- ✅ Cache otimizado no Service Worker
- ✅ Renderização eficiente de componentes
- ✅ Limite de mensagens armazenadas

### UX
- ✅ Notificações visuais para ações
- ✅ Feedback em tempo real
- ✅ Validação de força de password
- ✅ Melhor formatação de datas
- ✅ Confirmações para ações críticas

### Código
- ✅ Refatoração modular (utils.js)
- ✅ Comentários e documentação
- ✅ Separação de responsabilidades
- ✅ Tratamento de erros melhorado

### PWA
- ✅ Service Worker atualizado
- ✅ Suporte offline completo
- ✅ Cache versioning

## 🐛 Limitações Conhecidas

- Dados armazenados apenas no localStorage (perdidos ao limpar cache)
- Sem sincronização entre abas/dispositivos
- Sem notificações push
- Sem suporte a media (apenas imagens)
- Sem encriptação de dados

## 🚀 Ideias Futuras

- [ ] Sincronização com backend
- [ ] Notificações em tempo real
- [ ] Suporte a vídeos
- [ ] Grupos/comunidades
- [ ] Direct messages privadas
- [ ] Reações a posts (emojis)
- [ ] Paginação de feed
- [ ] Temas customizáveis
- [ ] Integração com redes sociais
- [ ] Analytics e estatísticas

## 📄 Licença

Este projeto é de código aberto e disponível para uso pessoal e educacional.

## 👨‍💻 Desenvolvedor

Desenvolvido com ❤️ por [Fernando Lukoki](https://github.com/fernandolukoki94-beep)

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se livre para:
- Reportar bugs
- Sugerir melhorias
- Submeter pull requests
- Partilhar ideias

---

**Última atualização**: Junho 2026
