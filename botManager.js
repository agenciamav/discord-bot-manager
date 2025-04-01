const Bot = require('./bot');

class BotManager {
  constructor() {
    this.bots = new Map();
  }

  async startBot(token) {
    // Debug: Mostrar informações detalhadas do token
    console.log('\nDebug startBot:');
    console.log('Token recebido:', token);
    console.log('Tipo do token:', typeof token);
    if (typeof token === 'string') {
      console.log('Comprimento do token:', token.length);
      console.log('Token contém pontos:', token.includes('.'));
      console.log('Partes do token:', token.split('.').length);
    }

    // Verifica se o token é válido para formato do Discord
    if (!token || typeof token !== 'string') {
      console.log('Token inválido: token não existe ou não é uma string');
      return 'Invalid token provided: not a string';
    }

    // Remove espaços em branco
    token = token.trim();
        
    if (token === '') {
      console.log('Token inválido: string vazia');
      return 'Invalid token provided: empty string';
    }

    // Verifica se o bot já está rodando
    if (this.bots.has(token)) {
      console.log('Bot already running');
      return 'Bot already running';
    }

    try {
      const bot = new Bot(token);
      this.bots.set(token, bot); // Registra o bot antes de iniciá-lo
            
      try {
        await bot.start();
        console.log('Bot iniciado com sucesso no BotManager');
        return 'Bot started';
      } catch (error) {
        // Se falhar ao iniciar, remover do mapa
        this.bots.delete(token);
        console.error('Erro ao iniciar bot:', error.message);
        return `Error starting bot: ${error.message}`;
      }
    } catch (error) {
      console.error('Erro ao criar instância do bot:', error.message);
      return `Error creating bot instance: ${error.message}`;
    }
  }

  // Método para validar se o token tem o formato aproximado de um token Discord
  isValidDiscordToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    token = token.trim();

    if (token === '') {
      return false;
    }

    // Debug: Mostrar informações do token sendo validado
    console.log('\nDebug isValidDiscordToken:');
    console.log('Token sendo validado:', token);
    console.log('Comprimento:', token.length);
    console.log('Partes:', token.split('.').length);

    // Tokens do Discord geralmente seguem um padrão específico
    // Formato mais comum: três partes separadas por pontos
    const parts = token.split('.');
        
    // Verifica se tem pelo menos 2 partes (alguns tokens podem ter formato diferente)
    if (parts.length < 2) {
      console.log('Token inválido: menos de 2 partes');
      return false;
    }

    // Verifica se todas as partes contêm apenas caracteres válidos
    const validChars = /^[A-Za-z0-9_-]+$/;
    const allPartsValid = parts.every(part => validChars.test(part));
        
    if (!allPartsValid) {
      console.log('Token inválido: caracteres inválidos encontrados');
      return false;
    }

    // Verifica o comprimento mínimo do token
    if (token.length < 50) {
      console.log('Token inválido: muito curto');
      return false;
    }

    return true;
  }

  stopBot(token) {
    if (!this.bots.has(token)) {
      console.log('Bot not found');
      return 'Bot not found';
    }

    const bot = this.bots.get(token);
    bot.stop();
    this.bots.delete(token);
    return 'Bot stopped';
  }

  getBotsStatus() {
    const status = {};
    for (const [token, bot] of this.bots) {
      status[token] = bot.getStatus();
    }
    return status;
  }
}

module.exports = BotManager;
