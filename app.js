// Autenticação
function checkAuthentication() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (!currentUserId) {
    window.location.href = "auth.html";
    return false;
  }
  return true;
}

function getCurrentUser() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (!currentUserId) return null;
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  return users.find(u => u.id === currentUserId);
}

function logout() {
  if (confirm("Tens a certeza que queres fazer logout?")) {
    localStorage.removeItem("currentUserId");
    window.location.href = "auth.html";
  }
}

// Filtro de palavras
const badWords = ['merda', 'porra', 'caralho', 'palavrafeia1', 'palavrafeia2'];

function filterWords(text) {
  if (!text) return "";
  let filteredText = text;
  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });
  // Highlight hashtags
  filteredText = filteredText.replace(/#(\w+)/g, '<span class="hashtag" onclick="filterByHashtag(\'$1\')">#$1</span>');
  return filteredText;
}

function getProfileColor(name) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  let hash = 0;
  const str = name || "Anônimo";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// File to Base64 helper
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function loadPosts(searchTerm = "") {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const posts = JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]");
  const postList = document.getElementById("postList");
  
  // Smart Feed Algorithm: score = likes * 2 + comments
  const postsWithScore = posts.map((p, index) => ({
    ...p,
    originalIndex: index,
    score: (p.likes || 0) * 2 + (p.comments || []).length
  }));

  // Sort by score descending, then by date (if score is equal)
  postsWithScore.sort((a, b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp));
  
  let html = "";
  postsWithScore.forEach((p) => {
    const originalIndex = p.originalIndex;
    
    // Search in text, author or hashtags
    if (searchTerm && 
        !p.text.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !p.author.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(p.text.toLowerCase().includes('#' + searchTerm.toLowerCase().replace('#', '')))) {
      return;
    }

    const profileColor = getProfileColor(p.author);
    const initial = (p.author || "A").charAt(0).toUpperCase();
    const avatarHtml = p.avatar ? 
      `<img src="${p.avatar}" class="profile-pic">` : 
      `<div class="profile-pic" style="background-color: ${profileColor};">${initial}</div>`;
    
    const imageHtml = p.image ? `<img src="${p.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : '';
    
    const commentsHtml = (p.comments || []).map(c => `
      <div class="comment">
        <strong>${c.author}:</strong> ${filterWords(c.text)}
      </div>
    `).join('');

    html += `
      <div class="card post">
        <div class="post-header">
          ${avatarHtml}
          <div class="post-info">
            <strong>${p.author || "Anônimo"}</strong>
            <span class="timestamp">${p.timestamp}</span>
          </div>
          <button class="action-btn" onclick="deletePost(${originalIndex})" title="Eliminar">🗑️</button>
        </div>
        <div class="post-content">${filterWords(p.text)}</div>
        ${imageHtml}
        <div class="post-footer">
          <button class="action-btn ${p.liked ? 'liked' : ''}" onclick="toggleLike(${originalIndex})">
            ${p.likes || 0} ❤️ Gosto
          </button>
          <button class="action-btn" onclick="focusComment(${originalIndex})">
            💬 Comentar
          </button>
        </div>
        <div class="comments-section">
          ${commentsHtml}
          <div class="comment-input-container">
            <input type="text" placeholder="Escreve um comentário..." id="comment-input-${originalIndex}" onkeypress="handleCommentKey(event, ${originalIndex})">
            <button class="primary-btn" style="width: auto; padding: 5px 15px;" onclick="addComment(${originalIndex})">Postar</button>
          </div>
        </div>
      </div>
    `;
  });

  if (html === "" && searchTerm) {
    html = `<p style="text-align: center; color: var(--text-secondary);">Nenhuma publicação encontrada para "${searchTerm}".</p>`;
  } else if (html === "") {
    html = `<p style="text-align: center; color: var(--text-secondary);">Ainda não há publicações. Sê o primeiro!</p>`;
  }

  postList.innerHTML = html;
}

async function addPost() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const textInput = document.getElementById("postText");
  const imageFileInput = document.getElementById("postImageFile");
  
  const text = textInput.value.trim();
  let imageData = "";
  
  if (!text) {
    alert("Por favor, escreve algo antes de publicar.");
    return;
  }

  if (imageFileInput.files && imageFileInput.files[0]) {
    try {
      imageData = await fileToBase64(imageFileInput.files[0]);
    } catch (e) {
      console.error("Error processing image", e);
    }
  }

  const posts = JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]");
  
  const newPost = {
    text: text,
    author: currentUser.username,
    avatar: currentUser.avatar || "",
    timestamp: new Date().toLocaleString('pt-PT'),
    likes: 0,
    liked: false,
    image: imageData,
    comments: []
  };
  
  posts.push(newPost);
  localStorage.setItem(`posts_${currentUser.id}`, JSON.stringify(posts));

  textInput.value = "";
  imageFileInput.value = "";
  loadPosts();
}

function filterByHashtag(tag) {
  document.getElementById("searchInput").value = tag;
  loadPosts(tag);
}

// Profile Functions
async function saveProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const bio = document.getElementById("userBio").value.trim();
  const avatarFile = document.getElementById("userAvatarFile").files[0];
  
  let avatarData = currentUser.avatar || "";

  if (avatarFile) {
    avatarData = await fileToBase64(avatarFile);
  }

  // Update user in users array
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex].bio = bio;
    users[userIndex].avatar = avatarData;
    localStorage.setItem("users", JSON.stringify(users));
  }

  updateProfileUI();
  toggleEditProfile();
}

function updateProfileUI() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  document.getElementById("profileCard").style.display = "block";
  document.getElementById("editProfileCard").style.display = "none";
  document.getElementById("displayUserName").textContent = currentUser.username;
  document.getElementById("displayUserBio").textContent = currentUser.bio || "Sem biografia";
  
  const avatarDisplay = document.getElementById("userAvatarDisplay");
  if (currentUser.avatar) {
    avatarDisplay.innerHTML = `<img src="${currentUser.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    avatarDisplay.style.backgroundColor = "transparent";
  } else {
    avatarDisplay.textContent = currentUser.username.charAt(0).toUpperCase();
    avatarDisplay.style.backgroundColor = getProfileColor(currentUser.username);
  }

  // Update inputs
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

// Data Export
function exportData() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const data = {
    user: currentUser.username,
    posts: JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]"),
    msgs: JSON.parse(localStorage.getItem(`msgs_${currentUser.id}`) || "[]"),
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `social-app-data-${currentUser.username}-${new Date().getTime()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Rest of existing functions
function toggleLike(index) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const posts = JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]");
  if (!posts[index]) return;
  
  if (posts[index].liked) {
    posts[index].likes = (posts[index].likes || 1) - 1;
    posts[index].liked = false;
  } else {
    posts[index].likes = (posts[index].likes || 0) + 1;
    posts[index].liked = true;
    console.log("Notificação: Gostaste da publicação!");
  }
  
  localStorage.setItem(`posts_${currentUser.id}`, JSON.stringify(posts));
  loadPosts(document.getElementById("searchInput").value);
}

function deletePost(index) {
  if (confirm("Tens a certeza que queres eliminar esta publicação?")) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const posts = JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]");
    posts.splice(index, 1);
    localStorage.setItem(`posts_${currentUser.id}`, JSON.stringify(posts));
    loadPosts(document.getElementById("searchInput").value);
  }
}

function addComment(postIndex) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const input = document.getElementById(`comment-input-${postIndex}`);
  const commentText = input.value.trim();
  if (!commentText) return;

  const posts = JSON.parse(localStorage.getItem(`posts_${currentUser.id}`) || "[]");
  
  if (!posts[postIndex].comments) posts[postIndex].comments = [];
  
  posts[postIndex].comments.push({
    text: commentText,
    author: currentUser.username,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem(`posts_${currentUser.id}`, JSON.stringify(posts));
  input.value = "";
  loadPosts(document.getElementById("searchInput").value);
}

function handleCommentKey(event, index) {
  if (event.key === "Enter") addComment(index);
}

function focusComment(index) {
  document.getElementById(`comment-input-${index}`).focus();
}

function loadMsgs() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const msgs = JSON.parse(localStorage.getItem(`msgs_${currentUser.id}`) || "[]");
  const msgList = document.getElementById("msgList");
  let html = "";

  msgs.forEach(m => {
    html += `
      <div style="margin-bottom: 10px;">
        <div class="message">
          <strong>${m.author} • ${m.timestamp}</strong>
          ${filterWords(m.text)}
        </div>
      </div>
    `;
  });

  if (html === "") {
    html = `<p style="text-align: center; color: var(--text-secondary); font-size: 0.9rem;">Sem mensagens recentes.</p>`;
  }

  msgList.innerHTML = html;
  msgList.scrollTop = msgList.scrollHeight;
}

function addMsg() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const input = document.getElementById("msgText");
  const text = input.value.trim();
  if (!text) return;

  const msgs = JSON.parse(localStorage.getItem(`msgs_${currentUser.id}`) || "[]");
  
  msgs.push({
    text: text,
    author: currentUser.username,
    timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  });
  
  if (msgs.length > 20) msgs.shift();
  localStorage.setItem(`msgs_${currentUser.id}`, JSON.stringify(msgs));
  input.value = "";
  loadMsgs();
}

function filterPosts() {
  const searchTerm = document.getElementById("searchInput").value;
  loadPosts(searchTerm);
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
}

function clearAll() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  if (confirm("ATENÇÃO: Isto irá apagar permanentemente todos os teus dados. Continuar?")) {
    localStorage.removeItem(`posts_${currentUser.id}`);
    localStorage.removeItem(`msgs_${currentUser.id}`);
    loadPosts();
    loadMsgs();
  }
}

window.onload = () => {
  // Check authentication
  if (!checkAuthentication()) return;
  
  updateProfileUI();
  
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = '☀️';
  }

  loadPosts();
  loadMsgs();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("SW error:", err));
  }
};
