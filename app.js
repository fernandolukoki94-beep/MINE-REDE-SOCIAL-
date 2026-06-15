/**
 * Módulo Principal da Aplicação
 * Lógica de posts, comentários, amigos e feed
 */

// ========== AUTENTICAÇÃO ==========

function checkAuthentication() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (!currentUserId) {
    window.location.href = "auth.html";
    return false;
  }
  return true;
}

// getCurrentUser agora vem de utils.js

function logout() {
  if (confirm("Tens a certeza que queres fazer logout?")) {
    localStorage.removeItem("currentUserId");
    showNotification("Logout realizado.", "info");
    setTimeout(() => {
      window.location.href = "auth.html";
    }, 500);
  }
}

// ========== FILTRO DE CONTEÚDO ==========

const badWords = ['merda', 'porra', 'caralho'];

function filterWords(text) {
  if (!text) return "";
  let filteredText = sanitizeInput(text);
  
  badWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });
  
  // Destacar hashtags
  filteredText = filteredText.replace(/#(\w+)/g, '<span class="hashtag" onclick="filterByHashtag(\'$1\')">#$1</span>');
  return filteredText;
}

// ========== GESTÃO DE POSTS ==========

function addPost() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const textInput = document.getElementById("postText");
  const imageFileInput = document.getElementById("postImageFile");
  
  const text = textInput.value.trim();
  
  if (!text) {
    showNotification("Por favor, escreve algo antes de publicar.", "warning");
    return;
  }

  if (text.length > 5000) {
    showNotification("A publicação não pode ter mais de 5000 caracteres.", "warning");
    return;
  }

  let imageData = "";
  
  if (imageFileInput.files && imageFileInput.files[0]) {
    const file = imageFileInput.files[0];
    
    // Validar tipo de ficheiro
    if (!file.type.startsWith('image/')) {
      showNotification("Por favor, seleciona um ficheiro de imagem válido.", "error");
      return;
    }
    
    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification("A imagem não pode ter mais de 5MB.", "error");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      imageData = await resizeImage(base64);
      savePost(currentUser, text, imageData);
      return;
    } catch (error) {
      showNotification("Erro ao processar a imagem.", "error");
      return;
    }
  }

  savePost(currentUser, text, imageData);
}

function savePost(currentUser, text, imageData) {
  const posts = JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]");
  
  const newPost = {
    id: Date.now().toString(),
    text: text,
    author: currentUser.username,
    avatar: currentUser.avatar || "",
    timestamp: new Date().toLocaleString('pt-PT'),
    likes: 0,
    likedBy: [],
    image: imageData,
    comments: []
  };
  
  posts.push(newPost);
  localStorage.setItem(`posts_${currentUser.id}`, JSON.stringify(posts));

  document.getElementById("postText").value = "";
  document.getElementById("postImageFile").value = "";
  
  showNotification("Publicação criada com sucesso!", "success");
  loadPostsWithFriends();
}

function deletePost(userId, postId) {
  const currentUser = getCurrentUser();
  if (userId !== currentUser.id) {
    showNotification("Não podes eliminar posts de outras pessoas!", "error");
    return;
  }
  
  if (confirm("Tens a certeza que queres eliminar esta publicação?")) {
    const posts = JSON.parse(localStorage.getItem(`posts_${userId}`) || "[]");
    const index = posts.findIndex(p => p.id === postId);
    
    if (index !== -1) {
      posts.splice(index, 1);
      localStorage.setItem(`posts_${userId}`, JSON.stringify(posts));
      showNotification("Publicação eliminada.", "info");
      loadPostsWithFriends(document.getElementById("searchInput").value);
    }
  }
}

function filterByHashtag(tag) {
  document.getElementById("searchInput").value = tag;
  loadPostsWithFriends(tag);
}

// ========== GESTÃO DE PERFIL ==========

async function saveProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const bio = document.getElementById("userBio").value.trim();
  const avatarFile = document.getElementById("userAvatarFile").files[0];
  
  if (bio.length > 500) {
    showNotification("A biografia não pode ter mais de 500 caracteres.", "warning");
    return;
  }

  let avatarData = currentUser.avatar || "";

  if (avatarFile) {
    if (!avatarFile.type.startsWith('image/')) {
      showNotification("Por favor, seleciona um ficheiro de imagem válido.", "error");
      return;
    }
    
    if (avatarFile.size > 2 * 1024 * 1024) {
      showNotification("A imagem não pode ter mais de 2MB.", "error");
      return;
    }

    try {
      avatarData = await fileToBase64(avatarFile);
    } catch (error) {
      showNotification("Erro ao processar a imagem de perfil.", "error");
      return;
    }
  }

  // Atualizar utilizador
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex !== -1) {
    users[userIndex].bio = bio;
    users[userIndex].avatar = avatarData;
    localStorage.setItem("users", JSON.stringify(users));
  }

  updateProfileUI();
  toggleEditProfile();
  showNotification("Perfil atualizado com sucesso!", "success");
}

function updateProfileUI() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  document.getElementById("profileCard").style.display = "block";
  document.getElementById("editProfileCard").style.display = "none";
  document.getElementById("displayUserName").textContent = sanitizeInput(currentUser.username);
  document.getElementById("displayUserBio").textContent = sanitizeInput(currentUser.bio || "Sem biografia");
  
  const avatarDisplay = document.getElementById("userAvatarDisplay");
  if (currentUser.avatar) {
    avatarDisplay.innerHTML = `<img src="${currentUser.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar">`;
    avatarDisplay.style.backgroundColor = "transparent";
  } else {
    avatarDisplay.textContent = currentUser.username.charAt(0).toUpperCase();
    avatarDisplay.style.backgroundColor = getProfileColor(currentUser.username);
  }

  document.getElementById("userBio").value = currentUser.bio || "";
}

function toggleEditProfile() {
  const editCard = document.getElementById("editProfileCard");
  const profileCard = document.getElementById("profileCard");
  
  if (editCard.style.display === "none") {
    editCard.style.display = "block";
    profileCard.style.display = "none";
  } else {
    editCard.style.display = "none";
    profileCard.style.display = "block";
  }
}

// ========== GESTÃO DE DADOS ==========

function exportData() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const data = exportUserData(currentUser);
  const filename = `social-app-data-${currentUser.username}-${new Date().getTime()}.json`;
  downloadJSON(data, filename);
  
  showNotification("Dados exportados com sucesso!", "success");
}

function clearAll() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  if (confirm("ATENÇÃO: Isto irá apagar permanentemente todos os teus dados. Continuar?")) {
    localStorage.removeItem(`posts_${currentUser.id}`);
    localStorage.removeItem(`msgs_${currentUser.id}`);
    loadPostsWithFriends();
    loadMsgs();
    showNotification("Todos os dados foram eliminados.", "info");
  }
}

// ========== GESTÃO DE LIKES ==========

function toggleLikeFromFeed(userId, postId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const posts = JSON.parse(localStorage.getItem(`posts_${userId}`) || "[]");
  const post = posts.find(p => p.id === postId);
  
  if (!post) return;

  // Inicializar array se necessário
  if (!post.likedBy) post.likedBy = [];
  
  const likeIndex = post.likedBy.indexOf(currentUser.id);
  
  if (likeIndex > -1) {
    post.likedBy.splice(likeIndex, 1);
    post.likes = Math.max(0, (post.likes || 1) - 1);
  } else {
    post.likedBy.push(currentUser.id);
    post.likes = (post.likes || 0) + 1;
  }
  
  localStorage.setItem(`posts_${userId}`, JSON.stringify(posts));
  loadPostsWithFriends(document.getElementById("searchInput").value);
}

// ========== GESTÃO DE COMENTÁRIOS ==========

function addCommentFromFeed(userId, postId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const input = document.getElementById(`comment-input-${userId}-${postId}`);
  const commentText = input.value.trim();
  
  if (!commentText) {
    showNotification("Por favor, escreve um comentário.", "warning");
    return;
  }

  if (commentText.length > 500) {
    showNotification("O comentário não pode ter mais de 500 caracteres.", "warning");
    return;
  }

  const posts = JSON.parse(localStorage.getItem(`posts_${userId}`) || "[]");
  const post = posts.find(p => p.id === postId);
  
  if (!post) return;

  if (!post.comments) post.comments = [];
  
  post.comments.push({
    id: Date.now().toString(),
    text: commentText,
    author: currentUser.username,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem(`posts_${userId}`, JSON.stringify(posts));
  input.value = "";
  loadPostsWithFriends(document.getElementById("searchInput").value);
  showNotification("Comentário adicionado!", "success");
}

function handleCommentKeyFromFeed(event, userId, postId) {
  if (event.key === "Enter") {
    event.preventDefault();
    addCommentFromFeed(userId, postId);
  }
}

function focusCommentFromFeed(userId, postId) {
  document.getElementById(`comment-input-${userId}-${postId}`).focus();
}

// ========== GESTÃO DE MENSAGENS ==========

function loadMsgs() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const msgs = JSON.parse(localStorage.getItem(`msgs_${currentUser.id}`) || "[]");
  const msgList = document.getElementById("msgList");
  let html = "";

  // Mostrar últimas 20 mensagens
  const recentMsgs = msgs.slice(-20);
  
  recentMsgs.forEach(m => {
    html += `
      <div style="margin-bottom: 10px;">
        <div class="message">
          <strong>${sanitizeInput(m.author)} • ${formatDate(m.timestamp)}</strong>
          <div>${filterWords(m.text)}</div>
        </div>
      </div>
    `;
  });

  if (html === "") {
    html = `<p style="text-align: center; color: var(--text-secondary); font-size: 0.9rem;">Sem mensagens recentes.</p>`;
  }

  msgList.innerHTML = html;
}

function addMsg() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const input = document.getElementById("msgText");
  const text = input.value.trim();
  
  if (!text) {
    showNotification("Por favor, escreve uma mensagem.", "warning");
    return;
  }

  if (text.length > 500) {
    showNotification("A mensagem não pode ter mais de 500 caracteres.", "warning");
    return;
  }

  const msgs = JSON.parse(localStorage.getItem(`msgs_${currentUser.id}`) || "[]");
  
  msgs.push({
    id: Date.now().toString(),
    text: text,
    author: currentUser.username,
    timestamp: new Date().toISOString()
  });
  
  // Manter apenas as últimas 100 mensagens
  if (msgs.length > 100) msgs.shift();
  
  localStorage.setItem(`msgs_${currentUser.id}`, JSON.stringify(msgs));
  input.value = "";
  loadMsgs();
}

// ========== PESQUISA ==========

function filterPosts() {
  const searchTerm = document.getElementById("searchInput").value;
  loadPostsWithFriends(searchTerm);
}

// ========== TEMA ==========

function toggleTheme() {
  const isDark = toggleThemeLogic();
  document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
}

// ========== SISTEMA DE AMIGOS ==========

function getFriendRequests() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  return userIndex !== -1 ? (users[userIndex].friendRequests || []) : [];
}

function getFriendsList() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  return userIndex !== -1 ? (users[userIndex].friends || []) : [];
}

function addFriendRequest(fromUserId, toUserId) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const toUserIndex = users.findIndex(u => u.id === toUserId);
  
  if (toUserIndex === -1) return;
  
  if (!users[toUserIndex].friendRequests) {
    users[toUserIndex].friendRequests = [];
  }
  
  if (!users[toUserIndex].friendRequests.includes(fromUserId)) {
    users[toUserIndex].friendRequests.push(fromUserId);
    localStorage.setItem("users", JSON.stringify(users));
  }
}

function acceptFriendRequest(fromUserId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
  const fromUserIndex = users.findIndex(u => u.id === fromUserId);
  
  if (currentUserIndex === -1 || fromUserIndex === -1) return;
  
  if (!users[currentUserIndex].friends) users[currentUserIndex].friends = [];
  if (!users[fromUserIndex].friends) users[fromUserIndex].friends = [];
  
  if (!users[currentUserIndex].friends.includes(fromUserId)) {
    users[currentUserIndex].friends.push(fromUserId);
  }
  if (!users[fromUserIndex].friends.includes(currentUser.id)) {
    users[fromUserIndex].friends.push(currentUser.id);
  }
  
  if (!users[currentUserIndex].friendRequests) users[currentUserIndex].friendRequests = [];
  users[currentUserIndex].friendRequests = users[currentUserIndex].friendRequests.filter(id => id !== fromUserId);
  
  localStorage.setItem("users", JSON.stringify(users));
  showNotification("Pedido de amizade aceite!", "success");
  displayFriendRequests();
  displayFriendsList();
}

function rejectFriendRequest(fromUserId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (currentUserIndex === -1) return;
  
  if (!users[currentUserIndex].friendRequests) users[currentUserIndex].friendRequests = [];
  users[currentUserIndex].friendRequests = users[currentUserIndex].friendRequests.filter(id => id !== fromUserId);
  
  localStorage.setItem("users", JSON.stringify(users));
  showNotification("Pedido de amizade rejeitado.", "info");
  displayFriendRequests();
}

function removeFriend(friendId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  if (confirm("Tens a certeza que queres remover este amigo?")) {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
    const friendIndex = users.findIndex(u => u.id === friendId);
    
    if (currentUserIndex === -1 || friendIndex === -1) return;
    
    if (!users[currentUserIndex].friends) users[currentUserIndex].friends = [];
    if (!users[friendIndex].friends) users[friendIndex].friends = [];
    
    users[currentUserIndex].friends = users[currentUserIndex].friends.filter(id => id !== friendId);
    users[friendIndex].friends = users[friendIndex].friends.filter(id => id !== currentUser.id);
    
    localStorage.setItem("users", JSON.stringify(users));
    showNotification("Amigo removido.", "info");
    displayFriendsList();
    loadPostsWithFriends();
  }
}

function sendFriendRequest(toUserId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const friends = getFriendsList();
  if (friends.includes(toUserId)) {
    showNotification("Já são amigos!", "info");
    return;
  }
  
  addFriendRequest(currentUser.id, toUserId);
  showNotification("Pedido de amizade enviado!", "success");
  searchUsers();
}

function searchUsers() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const searchTerm = document.getElementById("searchUsersInput").value.toLowerCase().trim();
  const resultsDiv = document.getElementById("searchResults");
  
  if (!searchTerm) {
    resultsDiv.innerHTML = '<p class="no-results">Escreve um nome para procurar...</p>';
    return;
  }
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const friends = getFriendsList();
  
  const results = users.filter(u => 
    u.id !== currentUser.id && 
    u.username.toLowerCase().includes(searchTerm)
  );
  
  if (results.length === 0) {
    resultsDiv.innerHTML = '<p class="no-results">Nenhum utilizador encontrado.</p>';
    return;
  }
  
  resultsDiv.innerHTML = results.map(user => {
    const isFriend = friends.includes(user.id);
    const buttonText = isFriend ? "Já são amigos" : "Enviar Pedido";
    const buttonDisabled = isFriend ? "disabled" : "";
    
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
        <button class="friend-btn btn-add-friend" onclick="sendFriendRequest('${user.id}')" ${buttonDisabled}>
          ${buttonText}
        </button>
      </div>
    `;
  }).join("");
}

function displayFriendRequests() {
  const requests = getFriendRequests();
  const requestsDiv = document.getElementById("friendRequests");
  
  if (requests.length === 0) {
    requestsDiv.innerHTML = '<p class="no-results">Sem pedidos de amizade.</p>';
    return;
  }
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  
  requestsDiv.innerHTML = requests.map(fromUserId => {
    const user = users.find(u => u.id === fromUserId);
    if (!user) return "";
    
    return `
      <div class="friend-item">
        <div class="friend-info">
          <div class="friend-avatar" style="background-color: ${getProfileColor(user.username)};">
            ${user.username.charAt(0).toUpperCase()}
          </div>
          <div class="friend-details">
            <div class="friend-name">${sanitizeInput(user.username)}</div>
            <div class="friend-bio">${sanitizeInput(user.bio || "Sem biografia")}</div>
          </div>
        </div>
        <div class="friend-actions">
          <button class="friend-btn btn-accept" onclick="acceptFriendRequest('${fromUserId}')">✓ Aceitar</button>
          <button class="friend-btn btn-reject" onclick="rejectFriendRequest('${fromUserId}')">✗ Rejeitar</button>
        </div>
      </div>
    `;
  }).join("");
}

function displayFriendsList() {
  const friends = getFriendsList();
  const friendsDiv = document.getElementById("friendsList");
  
  if (friends.length === 0) {
    friendsDiv.innerHTML = '<p class="no-results">Ainda não tens amigos. Procura e envia pedidos!</p>';
    return;
  }
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  
  friendsDiv.innerHTML = friends.map(friendId => {
    const user = users.find(u => u.id === friendId);
    if (!user) return "";
    
    return `
      <div class="friend-item">
        <div class="friend-info">
          <div class="friend-avatar" style="background-color: ${getProfileColor(user.username)};">
            ${user.username.charAt(0).toUpperCase()}
          </div>
          <div class="friend-details">
            <div class="friend-name">${sanitizeInput(user.username)}</div>
            <div class="friend-bio">${sanitizeInput(user.bio || "Sem biografia")}</div>
          </div>
        </div>
        <button class="friend-btn btn-remove" onclick="removeFriend('${friendId}')">Remover</button>
      </div>
    `;
  }).join("");
}

// ========== FEED COM AMIGOS ==========

function loadPostsWithFriends(searchTerm = "") {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const friends = getFriendsList();
  const allPosts = [];
  
  // Adicionar posts do utilizador atual
  const myPosts = JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]");
  myPosts.forEach(post => {
    allPosts.push({...post, userId: currentUser.id});
  });
  
  // Adicionar posts dos amigos
  friends.forEach(friendId => {
    const friendPosts = JSON.parse(localStorage.getItem(`posts_${friendId}`) || "[]");
    friendPosts.forEach(post => {
      allPosts.push({...post, userId: friendId});
    });
  });
  
  const postList = document.getElementById("postList");
  
  // Algoritmo de feed inteligente
  const postsWithScore = allPosts.map((p) => ({
    ...p,
    score: (p.likes || 0) * 2 + (p.comments || []).length
  }));

  postsWithScore.sort((a, b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp));
  
  let html = "";
  postsWithScore.forEach((p) => {
    // Filtro de pesquisa
    if (searchTerm && 
        !p.text.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !p.author.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(p.text.toLowerCase().includes('#' + searchTerm.toLowerCase().replace('#', '')))) {
      return;
    }

    const profileColor = getProfileColor(p.author);
    const initial = (p.author || "A").charAt(0).toUpperCase();
    const avatarHtml = p.avatar ? 
      `<img src="${p.avatar}" class="profile-pic" alt="Avatar">` : 
      `<div class="profile-pic" style="background-color: ${profileColor};">${initial}</div>`;
    
    const imageHtml = p.image ? `<img src="${p.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : '';
    
    const commentsHtml = (p.comments || []).map(c => `
      <div class="comment">
        <strong>${sanitizeInput(c.author)}:</strong> ${filterWords(c.text)}
      </div>
    `).join('');

    const isOwnPost = p.userId === currentUser.id;
    const deleteButton = isOwnPost ? `<button class="action-btn" onclick="deletePost('${p.userId}', '${p.id}')" title="Eliminar">🗑️</button>` : '';
    
    const isLiked = (p.likedBy || []).includes(currentUser.id);

    html += `
      <div class="card post">
        <div class="post-header">
          ${avatarHtml}
          <div class="post-info">
            <strong>${sanitizeInput(p.author || "Anônimo")}</strong>
            <span class="timestamp">${formatDate(p.timestamp)}</span>
          </div>
          ${deleteButton}
        </div>
        <div class="post-content">${filterWords(p.text)}</div>
        ${imageHtml}
        <div class="post-footer">
          <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikeFromFeed('${p.userId}', '${p.id}')">
            ${p.likes || 0} ❤️ Gosto
          </button>
          <button class="action-btn" onclick="focusCommentFromFeed('${p.userId}', '${p.id}')">
            ${(p.comments || []).length} 💬 Comentar
          </button>
        </div>
        <div class="comments-section">
          ${commentsHtml}
          <div class="comment-input-container">
            <input type="text" placeholder="Escreve um comentário..." id="comment-input-${p.userId}-${p.id}" onkeypress="handleCommentKeyFromFeed(event, '${p.userId}', '${p.id}')">
            <button class="primary-btn" style="width: auto; padding: 5px 15px;" onclick="addCommentFromFeed('${p.userId}', '${p.id}')">Postar</button>
          </div>
        </div>
      </div>
    `;
  });

  if (html === "" && searchTerm) {
    html = `<p style="text-align: center; color: var(--text-secondary);">Nenhuma publicação encontrada para "${sanitizeInput(searchTerm)}".</p>`;
  } else if (html === "") {
    html = `<p style="text-align: center; color: var(--text-secondary);">Ainda não há publicações. Procura amigos e segue-os!</p>`;
  }

  postList.innerHTML = html;
}

// ========== HELPER: Converter ficheiro para Base64 ==========

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// ========== INICIALIZAÇÃO ==========

window.onload = () => {
  // Verificar autenticação
  if (!checkAuthentication()) return;
  
  updateProfileUI();
  
  // Carregar tema
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = '☀️';
  }

  loadPostsWithFriends();
  loadMsgs();
  displayFriendRequests();
  displayFriendsList();

  // Registar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("SW error:", err));
  }
};
