/**
 * Utilidades de Segurança e Helpers
 * Funções reutilizáveis para toda a aplicação
 */

// Hash melhorado para passwords (utilizando salt e múltiplas iterações para maior segurança no LocalStorage)
function hashPassword(password) {
  // NOTA: Em ambiente de produção, o hash deve ser feito no BACKEND usando bcrypt ou Argon2.
  // Esta implementação é uma simulação melhorada para fins educativos no LocalStorage.
  const salt = "mine-social-secure-salt-2026-v2";
  let hash = password + salt;
  // Aumentar iterações para tornar ataques de força bruta mais lentos
  for (let i = 0; i < 5000; i++) {
    let h = 0;
    for (let j = 0; j < hash.length; j++) {
      h = ((h << 5) - h) + hash.charCodeAt(j);
      h |= 0;
    }
    hash = Math.abs(h).toString(16) + i; // Adicionar índice para variar o hash interno
  }
  return hash;
}

// Validar força da password
function validatePasswordStrength(password) {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  return {
    isValid: password.length >= minLength,
    strength: (password.length >= minLength ? 1 : 0) +
              (hasUpperCase ? 1 : 0) +
              (hasLowerCase ? 1 : 0) +
              (hasNumbers ? 1 : 0),
    message: password.length < minLength 
      ? `Mínimo ${minLength} caracteres`
      : 'Força: ' + ['Fraca', 'Média', 'Boa', 'Forte', 'Muito Forte'][
          Math.min(4, (password.length >= minLength ? 1 : 0) +
                      (hasUpperCase ? 1 : 0) +
                      (hasLowerCase ? 1 : 0) +
                      (hasNumbers ? 1 : 0))
        ]
  };
}

// Sanitizar entrada para evitar XSS
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Gerar cor consistente baseada em nome
function getProfileColor(name) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  let hash = 0;
  const str = name || "Anônimo";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Formatar data de forma legível
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-PT');
  }
}

// Validar email (simples)
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Debounce para funções de pesquisa
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Notificação visual simples
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    background-color: ${
      type === 'success' ? '#42b72a' :
      type === 'error' ? '#f02849' :
      type === 'warning' ? '#ff9800' :
      '#1877f2'
    };
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease-in-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Adicionar estilos de animação se não existirem
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Limpar dados de utilizador eliminado
function cleanupUserData(userId) {
  try {
    localStorage.removeItem(`posts_${userId}`);
    localStorage.removeItem(`msgs_${userId}`);
    localStorage.removeItem(`friends_${userId}`);
    
    // Remover referências em listas de amigos de outros utilizadores
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    users.forEach(user => {
      if (user.friends) {
        user.friends = user.friends.filter(id => id !== userId);
      }
      if (user.friendRequests) {
        user.friendRequests = user.friendRequests.filter(id => id !== userId);
      }
    });
    localStorage.setItem("users", JSON.stringify(users));
  } catch (error) {
    console.error('Erro ao limpar dados do utilizador:', error);
  }
}

// Exportar dados do utilizador
function exportUserData(user) {
  const data = {
    user: {
      id: user.id,
      username: user.username,
      bio: user.bio,
      createdAt: user.createdAt
    },
    posts: JSON.parse(localStorage.getItem(`posts_${user.id}`) || "[]"),
    messages: JSON.parse(localStorage.getItem(`msgs_${user.id}`) || "[]"),
    friends: user.friends || [],
    exportDate: new Date().toISOString()
  };
  
  return data;
}

// Obter utilizador atual centralizado
function getCurrentUser() {
  const currentUserId = localStorage.getItem("currentUserId");
  if (!currentUserId) return null;
  
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  return users.find(u => u.id === currentUserId);
}

// Alternar tema centralizado
function toggleThemeLogic() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  return isDark;
}

// Redimensionar imagem para poupar espaço no LocalStorage
async function resizeImage(base64Str, maxWidth = 800, maxHeight = 600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // Comprimir para JPEG com 70% qualidade
    };
  });
}

// Parse seguro de JSON do localStorage
function safeJSONParse(key, defaultValue = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Erro ao fazer parse de JSON para a chave "${key}":`, error);
    return defaultValue;
  }
}

// Fazer download de JSON
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
