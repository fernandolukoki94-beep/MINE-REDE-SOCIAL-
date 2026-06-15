/**
 * Módulo de Autenticação
 * Gestão de utilizadores com validações e segurança melhorada
 */

// Helpers de Armazenamento
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

// Validações
function userExists(username) {
  const users = getAllUsers();
  return users.some(u => u.username.toLowerCase() === username.toLowerCase());
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function validateUsername(username) {
  // Apenas letras, números, underscore e hífen
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

// Registo
function register() {
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerConfirmPassword")?.value || password;
  const bio = document.getElementById("registerBio").value.trim();

  // Limpar erros anteriores
  document.getElementById("registerUsernameError").textContent = "";
  document.getElementById("registerPasswordError").textContent = "";
  document.getElementById("registerConfirmPasswordError").textContent = "";

  // Validações
  if (!username) {
    document.getElementById("registerUsernameError").textContent = "O nome de utilizador é obrigatório.";
    return;
  }

  if (!validateUsername(username)) {
    document.getElementById("registerUsernameError").textContent = 
      "Nome deve ter 3-20 caracteres (letras, números, _ ou -).";
    return;
  }

  if (userExists(username)) {
    document.getElementById("registerUsernameError").textContent = "Este nome de utilizador já existe.";
    return;
  }

  if (!validatePassword(password)) {
    document.getElementById("registerPasswordError").textContent = 
      "A palavra-passe deve ter pelo menos 6 caracteres.";
    return;
  }

  if (password !== confirmPassword) {
    document.getElementById("registerConfirmPasswordError").textContent = 
      "As palavras-passe não coincidem.";
    return;
  }

  // Validar força da password
  const strength = validatePasswordStrength(password);
  if (!strength.isValid) {
    document.getElementById("registerPasswordError").textContent = strength.message;
    return;
  }

  // Criar novo utilizador
  const newUser = {
    id: Date.now().toString(),
    username: username,
    passwordHash: hashPassword(password),
    bio: bio || "",
    avatar: "",
    createdAt: new Date().toISOString(),
    friends: [],
    friendRequests: []
  };

  const users = getAllUsers();
  users.push(newUser);
  saveUsers(users);

  // Auto-login
  setCurrentUser(newUser.id);
  showNotification("Conta criada com sucesso!", "success");
  setTimeout(() => redirectToApp(), 1000);
}

// Login
function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  // Limpar erros anteriores
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

  // Comparar hash de password
  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    document.getElementById("loginPasswordError").textContent = "Palavra-passe incorreta.";
    return;
  }

  // Login bem-sucedido
  setCurrentUser(user.id);
  showNotification("Login realizado com sucesso!", "success");
  setTimeout(() => redirectToApp(), 1000);
}

// Alternar entre formulários
function switchForm() {
  document.getElementById("registerForm").classList.toggle("active");
  document.getElementById("loginForm").classList.toggle("active");
  clearFormErrors();
}

// Limpar erros dos formulários
function clearFormErrors() {
  document.getElementById("registerUsernameError").textContent = "";
  document.getElementById("registerPasswordError").textContent = "";
  document.getElementById("registerConfirmPasswordError").textContent = "";
  document.getElementById("loginUsernameError").textContent = "";
  document.getElementById("loginPasswordError").textContent = "";
}

// Redirecionar para app
function redirectToApp() {
  window.location.href = "index.html";
}

// Eliminar utilizador (com limpeza de dados)
function deleteUser(userId) {
  if (confirm("Tens a certeza que queres eliminar esta conta? Esta ação é irreversível e eliminará todos os teus dados.")) {
    // Limpar dados do utilizador
    cleanupUserData(userId);
    
    // Remover utilizador da lista
    let users = getAllUsers();
    users = users.filter(u => u.id !== userId);
    saveUsers(users);
    
    showNotification("Conta eliminada com sucesso.", "info");
    displayUsersList();
  }
}

// Mostrar lista de utilizadores registados
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
      <div class="user-info" style="cursor: pointer;" title="Clica para fazer login rápido (requer password)">
        <div class="user-avatar" style="background-color: ${getProfileColor(user.username)};">
          ${user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div class="user-name">${sanitizeInput(user.username)}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            ${user.bio ? sanitizeInput(user.bio) : "Sem biografia"}
          </div>
        </div>
      </div>
      <button class="delete-user" onclick="deleteUser('${user.id}')">Eliminar</button>
    </div>
  `).join("");
}

// Alternar tema
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
}

// Inicialização
window.onload = () => {
  // Carregar tema
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = '☀️';
  }

  // Verificar se utilizador já está autenticado
  const currentUser = getCurrentUser();
  if (currentUser) {
    redirectToApp();
  }

  displayUsersList();

  // Permitir Enter para submeter formulários
  document.getElementById("registerPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const confirmPasswordInput = document.getElementById("registerConfirmPassword");
      if (confirmPasswordInput && confirmPasswordInput.value === "") {
        confirmPasswordInput.focus();
      } else {
        register();
      }
    }
  });

  document.getElementById("loginPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });

  // Mostrar força da password em tempo real
  const registerPasswordInput = document.getElementById("registerPassword");
  if (registerPasswordInput) {
    registerPasswordInput.addEventListener("input", (e) => {
      const strength = validatePasswordStrength(e.target.value);
      const errorDiv = document.getElementById("registerPasswordError");
      if (e.target.value.length > 0) {
        errorDiv.textContent = strength.message;
        errorDiv.style.color = strength.isValid ? '#42b72a' : '#f02849';
      } else {
        errorDiv.textContent = "";
      }
    });
  }
};
