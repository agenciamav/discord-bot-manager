require('dotenv').config({ path: './.env' });
const express = require('express');
const bodyParser = require('body-parser');
const BotManager = require('./botManager');
const axios = require('axios');
const https = require('https');
const { Client, GatewayIntentBits } = require('discord.js');

const { APP_URL, BOT_MANAGER_SECRET } = process.env;

// Debug das variáveis de ambiente
console.log('==== Variáveis de Ambiente ====');
console.log('APP_URL:', APP_URL);
console.log('BOT_MANAGER_SECRET:', BOT_MANAGER_SECRET ? 'Configurado (valor oculto)' : 'Não configurado');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('==============================');

// Create an express app
const app = express();
app.use(bodyParser.json());
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Start the bot
const port = process.env.PORT || 7860;
const botManager = new BotManager();

// Adicione estas configurações no topo do arquivo, após as importações
const axiosConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Bot-Manager-Secret': BOT_MANAGER_SECRET,
    'User-Agent': 'axios/discord-bot-manager'
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
    timeout: 10000,
    keepAlive: true
  }),
  // Força IPv4
  family: 4,
  // Adiciona retry
  retry: 3,
  retryDelay: 1000
};

// API status
app.get('/api', (req, res) => {
    res.json({ status: 'ok', message: 'Discord Bot Manager is running' });
});

// Bots status
app.get('/api/status', (req, res) => {
    const status = botManager.getBotsStatus();
    res.json(status);
});

// Endpoint para iniciar um bot
app.post('/api/start', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const response = botManager.startBot(token);
    res.json({ message: response });
});

// Endpoint para parar um bot
app.post('/api/stop', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const response = botManager.stopBot(token);
    res.json({ message: response });
});

// Endpoint para validar um token
app.post('/api/validate-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Informações básicas do token
    const tokenInfo = {
        exists: !!token,
        type: typeof token,
        length: token ? token.length : 0,
        isEmpty: token === '',
        hasValidChars: token ? /^[A-Za-z0-9_.-]+$/.test(token) : false,
        parts: token ? token.split('.').length : 0
    };

    // Validação completa do token
    const isValid = botManager.isValidDiscordToken(token);

    res.json({ 
        valid: isValid,
        format_valid: isValid,
        token_info: tokenInfo,
        message: isValid ? 'Token format is valid' : 'Token format is invalid',
        details: {
            format_requirements: {
                min_length: 50,
                min_parts: 2,
                allowed_chars: 'A-Z, a-z, 0-9, underscore, hyphen',
                structure: 'At least 2 parts separated by dots'
            }
        }
    });
});

// Adicione um teste para verificar conectividade geral
console.log("Testando conectividade externa...");
axios.get('https://httpbin.org/get', { timeout: 5000 })
  .then(() => console.log("✅ Conexão externa OK"))
  .catch(err => console.error("❌ Falha ao testar conexão externa:", err.message));

// Modifique a chamada da API para usar estas configurações
if (process.env.APP_URL) {
  console.log(`Tentando conexão com API via domínio: ${process.env.APP_URL}...`);

  axios.get(`${process.env.APP_URL}/api/discord/bots`, axiosConfig)
    .catch(error => {
      console.log('Falha ao conectar via domínio, tentando via IP...');
      // Se falhar, tenta pelo IP
      if (process.env.API_IP) {
        return axios.get(`http://${process.env.API_IP}/api/discord/bots`, axiosConfig);
      } else {
        console.error('API_IP não está configurado, impossível tentar conexão via IP');
        throw error;
      }
    })
    .then(async response => {
      console.log(`Resposta recebida às ${new Date().toISOString()}`);
      console.log(`Status: ${response.status}`);
      const data = response.data;
      
      if (data.workspaces && Array.isArray(data.workspaces)) {
          console.log(`\n=== Iniciando Bot Manager ===`);
          console.log(`Encontrados ${data.workspaces.length} workspaces`);
          
          // Percorre todos os workspaces
          for (const workspace of data.workspaces) {
              console.log(`\n>> Workspace: ${workspace.workspace.name}`);
              
              // Percorre os bots de cada workspace
              if (workspace.bots && Array.isArray(workspace.bots)) {
                  for (const bot of workspace.bots) {
                      console.log(`\n> Bot: ${bot.name}`);
                      
                      // Debug: Mostrar informações do bot
                      const tokenStatus = bot.token ? 'presente' : 'ausente';
                      console.log(`Status: Token ${tokenStatus}`);
                      
                      if (bot.token && typeof bot.token === 'string') {
                          // Validar formato do token
                          const tokenParts = bot.token.split('.');
                          const isValidFormat = bot.token.length >= 50 && 
                                             tokenParts.length >= 2 && 
                                             /^[A-Za-z0-9_.-]+$/.test(bot.token);
                          
                          if (isValidFormat) {
                              console.log('Token válido, iniciando bot...');
                              try {
                                  const result = await botManager.startBot(bot.token);
                                  console.log(`Resultado: ${result}`);
                              } catch (error) {
                                  console.error(`Erro ao iniciar bot:`, error.message);
                              }
                          } else {
                              console.error('Token inválido:', {
                                  length: bot.token.length,
                                  parts: tokenParts.length,
                                  format: /^[A-Za-z0-9_.-]+$/.test(bot.token)
                              });
                          }
                      } else {
                          console.log('Token ausente ou inválido');
                      }
                  }
              }
          }
          console.log('\n=== Inicialização concluída ===\n');
      } else {
          console.error('Formato de resposta da API inválido:', data);
      }
  }).catch(error => {
      console.error(`Erro ao buscar bots ativos às ${new Date().toISOString()}:`, error.message);
      
      // Adicionar mais informações sobre o erro
      if (error.code) console.error('Código de erro:', error.code);
      if (error.syscall) console.error('Syscall:', error.syscall);
      if (error.address) console.error('Endereço:', error.address);
      if (error.port) console.error('Porta:', error.port);
      if (error.config && error.config.url) console.error('URL:', error.config.url);
      
      if (error.response) {
          console.error('Resposta da API:', error.response.data);
          console.error('Status:', error.response.status);
      }
  });
} else {
  console.error('APP_URL não está configurado, impossível tentar conexão via domínio');
}

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});