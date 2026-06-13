const badWords = ['merda', 'porra', 'caralho', 'palavrafeia1', 'palavrafeia2'];

function filterWords(text) {
  if (!text) return "";
  let filteredText = text;
  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });
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

function loadPosts(searchTerm = "") {
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  const postList = document.getElementById("postList");
  
  // Create a copy and reverse it to show newest first
  const displayPosts = [...posts].reverse();
  
  let html = "";
  displayPosts.forEach((p, reversedIndex) => {
    // Calculate original index in the posts array
    const originalIndex = posts.length - 1 - reversedIndex;
    
    if (searchTerm && !p.text.toLowerCase().includes(searchTerm.toLowerCase()) && !p.author.toLowerCase().includes(searchTerm.toLowerCase())) {
      return;
    }

    const profileColor = getProfileColor(p.author);
    const initial = (p.author || "A").charAt(0).toUpperCase();
    const imageHtml = p.image ? `<img src="${p.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : '';
    
    const commentsHtml = (p.comments || []).map(c => `
      <div class="comment">
        <strong>${c.author}:</strong> ${filterWords(c.text)}
      </div>
    `).join('');

    html += `
      <div class="card post">
        <div class="post-header">
          <div class="profile-pic" style="background-color: ${profileColor};">${initial}</div>
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

function addPost() {
  const textInput = document.getElementById("postText");
  const imageInput = document.getElementById("postImage");
  const nameInput = document.getElementById("userName");
  
  const text = textInput.value.trim();
  const image = imageInput.value.trim();
  
  if (!text) {
    alert("Por favor, escreve algo antes de publicar.");
    return;
  }

  const name = nameInput.value.trim() || "Anônimo";
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  
  const newPost = {
    text: text,
    author: name,
    timestamp: new Date().toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    likes: 0,
    liked: false,
    image: image,
    comments: []
  };
  
  posts.push(newPost);
  localStorage.setItem("posts", JSON.stringify(posts));

  textInput.value = "";
  imageInput.value = "";
  loadPosts();
}

function toggleLike(index) {
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  if (!posts[index]) return;
  
  if (posts[index].liked) {
    posts[index].likes = (posts[index].likes || 1) - 1;
    posts[index].liked = false;
  } else {
    posts[index].likes = (posts[index].likes || 0) + 1;
    posts[index].liked = true;
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

  const name = document.getElementById("userName").value.trim() || "Anônimo";
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  
  if (!posts[postIndex].comments) posts[postIndex].comments = [];
  
  posts[postIndex].comments.push({
    text: commentText,
    author: name,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem("posts", JSON.stringify(posts));
  input.value = "";
  loadPosts(document.getElementById("searchInput").value);
}

function handleCommentKey(event, index) {
  if (event.key === "Enter") {
    addComment(index);
  }
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

  const name = document.getElementById("userName").value.trim() || "Anônimo";
  const msgs = JSON.parse(localStorage.getItem("msgs") || "[]");
  
  msgs.push({
    text: text,
    author: name,
    timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  });
  
  // Keep only last 20 messages
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
  if (confirm("ATENÇÃO: Isto irá apagar permanentemente todas as tuas publicações e mensagens. Continuar?")) {
    localStorage.removeItem("posts");
    localStorage.removeItem("msgs");
    loadPosts();
    loadMsgs();
  }
}

// Initialization
window.onload = () => {
  // Load saved name
  const savedName = localStorage.getItem("userName");
  if (savedName) {
    document.getElementById("userName").value = savedName;
  }

  // Save name on change
  document.getElementById("userName").addEventListener("input", (e) => {
    localStorage.setItem("userName", e.target.value.trim());
  });

  // Load theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = '☀️';
  }

  loadPosts();
  loadMsgs();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("SW error:", err));
  }
};
