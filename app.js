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
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
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
  const textInput = document.getElementById("postText");
  const imageFileInput = document.getElementById("postImageFile");
  const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
  
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

  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  
  const newPost = {
    text: text,
    author: user.name || "Anônimo",
    avatar: user.avatar || "",
    timestamp: new Date().toLocaleString('pt-PT'),
    likes: 0,
    liked: false,
    image: imageData,
    comments: []
  };
  
  posts.push(newPost);
  localStorage.setItem("posts", JSON.stringify(posts));

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
  const name = document.getElementById("userName").value.trim();
  const bio = document.getElementById("userBio").value.trim();
  const avatarFile = document.getElementById("userAvatarFile").files[0];
  
  let avatarData = "";
  const existingProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  avatarData = existingProfile.avatar || "";

  if (avatarFile) {
    avatarData = await fileToBase64(avatarFile);
  }

  const profile = {
    name: name || "Anônimo",
    bio: bio,
    avatar: avatarData
  };

  localStorage.setItem("userProfile", JSON.stringify(profile));
  updateProfileUI();
  toggleEditProfile();
}

function updateProfileUI() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  if (profile.name) {
    document.getElementById("profileCard").style.display = "block";
    document.getElementById("editProfileCard").style.display = "none";
    document.getElementById("displayUserName").textContent = profile.name;
    document.getElementById("displayUserBio").textContent = profile.bio || "Sem biografia";
    
    const avatarDisplay = document.getElementById("userAvatarDisplay");
    if (profile.avatar) {
      avatarDisplay.innerHTML = `<img src="${profile.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      avatarDisplay.style.backgroundColor = "transparent";
    } else {
      avatarDisplay.textContent = profile.name.charAt(0).toUpperCase();
      avatarDisplay.style.backgroundColor = getProfileColor(profile.name);
    }

    // Update inputs
    document.getElementById("userName").value = profile.name;
    document.getElementById("userBio").value = profile.bio || "";
  } else {
    document.getElementById("profileCard").style.display = "none";
    document.getElementById("editProfileCard").style.display = "block";
  }
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
  const data = {
    posts: JSON.parse(localStorage.getItem("posts") || "[]"),
    msgs: JSON.parse(localStorage.getItem("msgs") || "[]"),
    profile: JSON.parse(localStorage.getItem("userProfile") || "{}"),
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `social-app-data-${new Date().getTime()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Rest of existing functions (adapted)
function toggleLike(index) {
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  if (!posts[index]) return;
  
  if (posts[index].liked) {
    posts[index].likes = (posts[index].likes || 1) - 1;
    posts[index].liked = false;
  } else {
    posts[index].likes = (posts[index].likes || 0) + 1;
    posts[index].liked = true;
    // Notify locally (simple console log for demo, could be a toast)
    console.log("Notificação: Gostaste da publicação!");
  }
  
  localStorage.setItem("posts", JSON.stringify(posts));
  loadPosts(document.getElementById("searchInput").value);
}

function deletePost(index) {
  if (confirm("Tens a certeza que queres eliminar esta publicação?")) {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    posts.splice(index, 1);
    localStorage.setItem("posts", JSON.stringify(posts));
    loadPosts(document.getElementById("searchInput").value);
  }
}

function addComment(postIndex) {
  const input = document.getElementById(`comment-input-${postIndex}`);
  const commentText = input.value.trim();
  if (!commentText) return;

  const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  
  if (!posts[postIndex].comments) posts[postIndex].comments = [];
  
  posts[postIndex].comments.push({
    text: commentText,
    author: user.name || "Anônimo",
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem("posts", JSON.stringify(posts));
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
  const msgs = JSON.parse(localStorage.getItem("msgs") || "[]");
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
  const input = document.getElementById("msgText");
  const text = input.value.trim();
  if (!text) return;

  const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const msgs = JSON.parse(localStorage.getItem("msgs") || "[]");
  
  msgs.push({
    text: text,
    author: user.name || "Anônimo",
    timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  });
  
  if (msgs.length > 20) msgs.shift();
  localStorage.setItem("msgs", JSON.stringify(msgs));
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
  if (confirm("ATENÇÃO: Isto irá apagar permanentemente todos os teus dados. Continuar?")) {
    localStorage.clear();
    location.reload();
  }
}

window.onload = () => {
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
