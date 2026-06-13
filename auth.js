// Autenticação e Gestão de Utilizadores

function getProfileColor(name) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  let hash = 0;
  const str = name || "Anônimo";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getAllUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function getCurrentUser() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (!currentUserId) return null;
  
  const users = getAllUsers();
  return users.find(u => u.id === currentUserId);
}

function setCurrentUser(userId) {
  localStorage.setItem("currentUserId", userId);
}

function clearCurrentUser() {
  localStorage.removeItem("currentUserId");
}

function userExists(username) {
  const users = getAllUsers();
  return users.some(u => u.username.toLowerCase() === username.toLowerCase());
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function register() {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  const bio = document.getElementById("registerBio").value.trim();

  // Clear previous errors
  document.getElementById("registerUsernameError").textContent = "";
  document.getElementById("registerPasswordError").textContent = "";

  // Validations
  if (!username) {
    document.getElementById("registerUsernameError").textContent = "O nome de utilizador é obrigatório.";
    return;
  }

  if (username.length < 3) {
    document.getElementById("registerUsernameError").textContent = "O nome deve ter pelo menos 3 caracteres.";
    return;
  }

  if (userExists(username)) {
    document.getElementById("registerUsernameError").textContent = "Este nome de utilizador já existe.";
    return;
  }

  if (!validatePassword(password)) {
    document.getElementById("registerPasswordError").textContent = "A palavra-passe deve ter pelo menos 6 caracteres.";
    return;
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    username: username,
    password: password, // In production, this should be hashed!
    bio: bio,
    avatar: "",
    createdAt: new Date().toISOString()
  };

  const users = getAllUsers();
  users.push(newUser);
  saveUsers(users);

  // Auto-login
  setCurrentUser(newUser.id);
  redirectToApp();
}

function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  // Clear previous errors
  document.getElementById("loginUsernameError").textContent = "";
  document.getElementById("loginPasswordError").textContent = "";

  if (!username) {
    document.getElementById("loginUsernameError").textContent = "O nome de utilizador é obrigatório.";
    return;
  }

  if (!password) {
    document.getElementById("loginPasswordError").textContent = "A palavra-passe é obrigatória.";
    return;
  }

  const users = getAllUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    document.getElementById("loginUsernameError").textContent = "Utilizador não encontrado.";
    return;
  }

  if (user.password !== password) {
    document.getElementById("loginPasswordError").textContent = "Palavra-passe incorreta.";
    return;
  }

  // Login successful
  setCurrentUser(user.id);
  redirectToApp();
}

function switchForm() {
  document.getElementById("registerForm").classList.toggle("active");
  document.getElementById("loginForm").classList.toggle("active");
  clearFormErrors();
}

function clearFormErrors() {
  document.getElementById("registerUsernameError").textContent = "";
  document.getElementById("registerPasswordError").textContent = "";
  document.getElementById("loginUsernameError").textContent = "";
  document.getElementById("loginPasswordError").textContent = "";
}

function redirectToApp() {
  window.location.href = "index.html";
}

function deleteUser(userId) {
  if (confirm("Tens a certeza que queres eliminar esta conta? Esta ação é irreversível.")) {
    let users = getAllUsers();
    users = users.filter(u => u.id !== userId);
    saveUsers(users);
    displayUsersList();
  }
}

function quickLogin(userId) {
  setCurrentUser(userId);
  redirectToApp();
}

function displayUsersList() {
  const users = getAllUsers();
  const container = document.getElementById("usersListContainer");
  const listDiv = document.getElementById("usersList");

  if (users.length === 0) {
    listDiv.style.display = "none";
    return;
  }

  listDiv.style.display = "block";
  container.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-info" onclick="quickLogin('${user.id}')">
        <div class="user-avatar" style="background-color: ${getProfileColor(user.username)};">
          ${user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div class="user-name">${user.username}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${user.bio || "Sem biografia"}</div>
        </div>
      </div>
      <button class="delete-user" onclick="deleteUser('${user.id}')">Eliminar</button>
    </div>
  `).join("");
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
}

// Initialize
window.onload = () => {
  // Load theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = '☀️';
  }

  // Check if user is already logged in
  const currentUser = getCurrentUser();
  if (currentUser) {
    redirectToApp();
  }

  displayUsersList();

  // Allow Enter key to submit forms
  document.getElementById("registerPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") register();
  });

  document.getElementById("loginPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
};
