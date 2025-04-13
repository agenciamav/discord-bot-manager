const fs = require('fs');
const path = require('path');

/**
 * Garante que os diretórios necessários existam
 */
function setupDirectories() {
  const dirs = [
    './commands',
    './audio',
    './audio/recordings'
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`📁 Criando diretório: ${dir}`);
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

// Executa a configuração
setupDirectories();

module.exports = {
  setupDirectories
}; 