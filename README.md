# Mini Rede Social (PWA)

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

[🚀 Demonstração Online](https://fernandolukoki94-beep.github.io/MINE-REDE-SOCIAL-/)

</div>

Uma aplicação de rede social minimalista, segura e funcional, construída com tecnologias web puras (HTML, CSS e JavaScript). Esta aplicação funciona inteiramente no navegador, utilizando o `localStorage` para persistência de dados, o que a torna ideal para demonstrações, protótipos ou uso pessoal offline.

## 📊 Estatísticas do Projeto

- **Tecnologia**: 100% JavaScript Vanilla (Sem frameworks)
- **Arquitetura**: Modular (Auth, App, Utils)
- **Estado**: Persistência via LocalStorage
- **Compatibilidade**: Totalmente Responsivo (Mobile/Desktop)
- **Capacidade PWA**: Offline-first com Service Workers

## 📸 Capturas de Ecrã

*(Adiciona aqui as tuas capturas de ecrã para tornar o projeto visualmente apelativo)*

| Feed Principal | Perfil do Utilizador | Modo Escuro |
| :---: | :---: | :---: |
| ![Feed](https://via.placeholder.com/200x400?text=Feed+Principal) | ![Perfil](https://via.placeholder.com/200x400?text=Perfil) | ![Dark Mode](https://via.placeholder.com/200x400?text=Dark+Mode) |

## 🚀 Funcionalidades Principais

- **Autenticação Segura**: Registo e login com validação de passwords e hashing.
- **Publicações com Imagem**: Partilha pensamentos com suporte a imagens (até 5MB).
- **Sistema de Likes e Comentários**: Interage com publicações de forma intuitiva.
- **Feed Inteligente**: Algoritmo que ordena posts por relevância (likes × 2 + comentários).
- **Sistema de Amigos**: Procura, pedidos de amizade e gestão de amigos.
- **Mensagens Rápidas**: Chat simplificado com histórico das últimas 100 mensagens.
- **Modo Escuro/Claro**: Suporte para temas visuais com persistência.
- **Filtro de Conteúdo**: Filtro automático de palavras impróprias.
- **Hashtags Interativas**: Clica em hashtags para filtrar publicações.
- **PWA (Progressive Web App)**: Instalável no dispositivo, funciona offline.

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessibilidade.
- **CSS3**: Design moderno, responsivo com variáveis CSS para temas.
- **JavaScript (Vanilla)**: Lógica de negócio, manipulação do DOM e gestão de estado.
- **LocalStorage**: Armazenamento persistente no lado do cliente.
- **Service Workers**: Suporte para funcionamento offline e instalação como PWA.

## 📦 Como Utilizar

### Opção 1: Abrir Localmente
1. Clone o repositório:
   ```bash
   git clone https://github.com/fernandolukoki94-beep/MINE-REDE-SOCIAL-.git
   cd MINE-REDE-SOCIAL-
   ```
2. Abra o ficheiro `index.html` em qualquer navegador moderno.

### Opção 2: Servidor Local (Recomendado para PWA)
1. Inicie um servidor local:
   ```bash
   # Com Python 3
   python -m http.server 8000
   ```
2. Aceda a `http://localhost:8000`.

## 🔐 Segurança e Maturidade Técnica

> ⚠️ **Nota de Segurança**: Este projeto utiliza hashing simplificado para passwords apenas para fins educacionais e demonstração de lógica de autenticação no cliente.
> 
> Em ambientes de produção real, recomenda-se:
> - Implementação de backend robusto (Node.js, Go, Python).
> - Utilização de algoritmos de hashing seguros como **bcrypt**, **Argon2** ou **PBKDF2**.
> - Autenticação baseada em tokens (JWT) e HTTPS obrigatório.

- **Sanitização**: Todas as entradas são sanitizadas para evitar ataques de XSS (Cross-Site Scripting).
- **Validação**: Validação rigorosa de tipos de ficheiros e tamanhos de entrada.
- **Integridade**: Sistema de limpeza automática de dados órfãos ao eliminar contas.

## 🎯 Funcionalidades Detalhadas

### Autenticação
- Registo com validação de username (3-20 caracteres).
- Validação de força de password em tempo real.
- Login com verificação de hash.
- Eliminação de conta com limpeza completa de dados.

### Publicações e Interações
- Limite de 5000 caracteres por post e imagens até 5MB.
- Hashtags automáticas e clicáveis.
- Like/Unlike rastreado por ID de utilizador.
- Comentários em tempo real com suporte a tecla Enter.

### Sistema Social
- Procura dinâmica de utilizadores.
- Gestão de pedidos de amizade (Aceitar/Rejeitar).
- Feed agregado: visualiza os teus posts e os dos teus amigos num único lugar.

## 📱 Responsividade e PWA

A aplicação foi desenhada com uma abordagem *Mobile-First*, garantindo uma experiência fluida em smartphones, tablets e desktops. Graças ao Service Worker v2, a aplicação pode ser instalada e utilizada sem ligação à internet.

## 🔄 Melhorias Recentes (v2.0)

- ✅ **Segurança**: Hash de passwords e sanitização XSS.
- ✅ **Performance**: Algoritmo de feed inteligente e cache v2.
- ✅ **UX**: Notificações visuais e melhor formatação de datas.
- ✅ **Código**: Arquitetura modular com `utils.js` e separação de responsabilidades.

## 🚀 Ideias Futuras

- [ ] Sincronização com backend (Node.js + MongoDB/TiDB).
- [ ] Notificações Push em tempo real.
- [ ] Suporte a vídeos e media avançada.
- [ ] Direct Messages (DM) privadas e encriptadas.
- [ ] Paginação infinita para o feed.

## 📄 Licença

Este projeto está sob a licença MIT. Consulta o ficheiro `LICENSE` para mais detalhes.

## 👨‍💻 Desenvolvedor

Desenvolvido com ❤️ por [Fernando Lukoki](https://github.com/fernandolukoki94-beep)

---
**Última atualização**: Junho 2026
