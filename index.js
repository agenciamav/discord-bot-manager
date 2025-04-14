require('dotenv').config({ path: './.env' });
// Carregar script de configuração para criar diretórios necessários
require('./setup');

const express = require('express');
const bodyParser = require('body-parser');
const BotManager = require('./botManager');
const axios = require('axios');
const https = require('https');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

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
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates, // Necessário para detectar eventos de voz
    GatewayIntentBits.MessageContent,   // Para ler conteúdo de mensagens
  ],
  partials: [Partials.Channel]
});

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
    'User-Agent': 'axios/discord-bot-manager',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
    timeout: 10000,
    keepAlive: true,
  }),
  // Força IPv4
  family: 4,
  // Adiciona retry
  retry: 3,
  retryDelay: 1000,
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

// Deploy commands endpoint
app.post('/api/deploy-commands', async (req, res) => {
  const { token, clientId, guildId, guildIds } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  if (!clientId) {
    return res.status(400).json({ error: 'Client ID is required' });
  }
  
  if (!guildId && (!guildIds || !guildIds.length)) {
    return res.status(400).json({ error: 'At least one Guild ID is required' });
  }
  
  try {
    const { deployCommandsForBot } = require('./deploy-commands');
    
    const result = await deployCommandsForBot({
      token,
      clientId,
      guildId,
      guildIds,
      name: req.body.name || 'Bot'
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error deploying commands:', error);
    return res.status(500).json({
      success: false,
      message: `Error deploying commands: ${error.message}`,
      error: error.message
    });
  }
});

// Endpoint para desregistrar todos os comandos
app.post('/api/unregister-commands', async (req, res) => {
  const { token, clientId, guildId, guildIds } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  if (!clientId) {
    return res.status(400).json({ error: 'Client ID is required' });
  }
  
  if (!guildId && (!guildIds || !guildIds.length)) {
    return res.status(400).json({ error: 'At least one Guild ID is required' });
  }
  
  try {
    const { REST, Routes } = require('discord.js');
    const rest = new REST().setToken(token);
    
    const targetGuilds = guildIds?.length ? guildIds : [guildId];
    const results = [];
    
    for (const guild of targetGuilds) {
      try {
        // Buscar todos os comandos registrados
        const registeredCommands = await rest.get(
          Routes.applicationGuildCommands(clientId, guild)
        );
        
        if (registeredCommands.length === 0) {
          results.push({
            guildId: guild,
            success: true,
            message: 'Não há comandos para desregistrar',
            commandsRemoved: 0
          });
          continue;
        }
        
        // Remover comandos um por um
        let removedCount = 0;
        const errors = [];
        
        for (const cmd of registeredCommands) {
          try {
            await rest.delete(
              Routes.applicationGuildCommand(clientId, guild, cmd.id)
            );
            removedCount++;
          } catch (error) {
            errors.push({
              command: cmd.name,
              error: error.message
            });
          }
        }
        
        results.push({
          guildId: guild,
          success: true,
          message: `${removedCount} comandos desregistrados com sucesso`,
          commandsRemoved: removedCount,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (error) {
        results.push({
          guildId: guild,
          success: false,
          error: error.message
        });
      }
    }
    
    return res.json({
      success: results.some(r => r.success),
      results
    });
  } catch (error) {
    console.error('Error unregistering commands:', error);
    return res.status(500).json({
      success: false,
      message: `Error unregistering commands: ${error.message}`,
      error: error.message
    });
  }
});

// Rota para listar bots ativos
app.get('/api/discord/bots', (req, res) => {
  const status = botManager.getBotsStatus();
  res.json({
    status: 'success',
    data: {
      workspaces: [{
        bots: Object.entries(status).map(([token, botStatus]) => ({
          token,
          status: botStatus,
        })),
      }],
    },
  });
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
    parts: token ? token.split('.').length : 0,
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
        structure: 'At least 2 parts separated by dots',
      },
    },
  });
});

// Adicione um teste para verificar conectividade geral
console.log('Testando conectividade externa...');
axios.get('https://httpbin.org/get', { timeout: 5000 })
  .then(() => console.log('✅ Conexão externa OK'))
  .catch(err => console.error('❌ Falha ao testar conexão externa:', err.message));

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
      
      if (data.data && Array.isArray(data.data)) {
        console.log('\n=== Iniciando Bot Manager ===');
        console.log(`Encontrados ${data.data.length} bots`);
          
        // Percorre todos os bots
        for (const bot of data.data) {
          console.log(`\n> Bot: ${bot.name}`);
                  
          // Debug: Mostrar informações do bot
          const tokenStatus = bot.decrypted_token ? 'presente' : 'ausente';
          console.log(`Status: Token ${tokenStatus}`);
                  
          if (bot.decrypted_token && typeof bot.decrypted_token === 'string') {
            // Validar formato do token
            const tokenParts = bot.decrypted_token.split('.');
            const isValidFormat = bot.decrypted_token.length >= 50 && 
                                 tokenParts.length >= 2 && 
                                 /^[A-Za-z0-9_.-]+$/.test(bot.decrypted_token);
                      
            if (isValidFormat) {
              console.log('Token válido, iniciando bot...');
              try {
                // Preparar configuração
                const botConfig = {
                  clientId: bot.client_id,
                  guildId: bot.guild_id,
                  applicationId: bot.application_id,
                  botId: bot.id,
                  name: bot.name
                };
                
                console.log('Configuração do bot:', {
                  name: botConfig.name,
                  clientId: botConfig.clientId ? 'presente' : 'ausente',
                  guildId: botConfig.guildId ? 'presente' : 'ausente',
                  applicationId: botConfig.applicationId ? 'presente' : 'ausente'
                });
                
                const result = await botManager.startBot(bot.decrypted_token, botConfig);
                console.log(`Resultado: ${result}`);
              } catch (error) {
                console.error('Erro ao iniciar bot:', error.message);
              }
            } else {
              console.error('Token inválido:', {
                length: bot.decrypted_token.length,
                parts: tokenParts.length,
                format: /^[A-Za-z0-9_.-]+$/.test(bot.decrypted_token),
              });
            }
          } else {
            console.log('Token ausente ou inválido');
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

// Registrar handlers para áudio
client.on('voiceStateUpdate', async (oldState, newState) => {
  // Verificar se o bot está sendo movido por alguém
  if (newState.member.id === client.user.id) {
    // Se o bot foi desconectado
    if (oldState.channel && !newState.channel) {
      console.log(`🔌 Bot foi desconectado do canal ${oldState.channel.name}`);
      const audioManager = require('./audio/audioManager');
      audioManager.disconnect(oldState.channel.id);
    }
  }
});

// Ajuste na função registerCommandsOnReady para utilizar a função do deploy-commands.js
async function registerCommandsOnReady(client) {
  try {
    console.log('\n===== REGISTRO AUTOMÁTICO DE COMANDOS =====');
    console.log(`🤖 Bot conectado como ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    
    // Obter todas as guilds do cliente
    const guilds = client.guilds.cache;
    console.log(`📊 O bot está em ${guilds.size} servidores.`);
    
    if (guilds.size === 0) {
      console.log('⚠️ O bot não está em nenhum servidor, não há comandos para registrar.');
      return;
    }
    
    // Importar a função deployCommandsForBot do arquivo deploy-commands.js
    const { deployCommandsForBot } = require('./deploy-commands');
    
    // Para cada guild, registrar os comandos
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    console.log(`\n🔄 Iniciando registro em ${guilds.size} servidores...`);
    
    for (const [guildId, guild] of guilds) {
      try {
        console.log(`\n📝 Processando servidor: ${guild.name} (${guildId})`);
        console.log(`📈 Membros: ${guild.memberCount}`);
        
        // Configurar parâmetros para o deploy de comandos
        const result = await deployCommandsForBot({
          token: client.token,
          clientId: client.user.id,
          guildId: guildId,
          name: guild.name
        });
        
        if (result.success) {
          successCount++;
          console.log(`✅ Comandos registrados com sucesso na guild: ${guild.name}`);
          
          // Mais detalhes sobre comandos registrados
          if (result.results && result.results.length > 0) {
            const guildResult = result.results[0];
            console.log(`📋 Total de ${guildResult.commandsRegistered} comandos registrados`);
          }
        } else {
          failCount++;
          console.error(`❌ Falha ao registrar comandos na guild: ${guild.name}`);
          console.error(result.error || JSON.stringify(result, null, 2));
        }
        
        results.push({
          guildId,
          guildName: guild.name,
          success: result.success,
          commandsRegistered: result.results?.[0]?.commandsRegistered || 0,
          error: result.error || result.results?.[0]?.error
        });
        
        // Notificar a API sobre este servidor (opcional)
        try {
          // Evitar flood de requisições para a API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await axios.post(`${process.env.APP_URL}/api/discord/guilds/joined`, {
            bot_id: client.user.id,
            guild_id: guildId,
            guild_name: guild.name,
            members_count: guild.memberCount,
            owner_id: guild.ownerId
          }, {
            headers: {
              'X-Bot-Manager-Secret': process.env.BOT_MANAGER_SECRET
            }
          });
          
          console.log(`📡 API notificada sobre o servidor: ${guild.name}`);
        } catch (apiError) {
          // Apenas log, não interromper o processo
          console.log(`⚠️ Aviso: Não foi possível notificar a API sobre o servidor ${guild.name}`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Erro ao registrar comandos na guild ${guild.name}:`, error.message);
        results.push({
          guildId,
          guildName: guild.name,
          success: false,
          error: error.message
        });
      }
    }
    
    // Resumo final
    console.log('\n===== RESUMO DO REGISTRO DE COMANDOS =====');
    console.log(`✅ Sucesso: ${successCount}/${guilds.size} servidores`);
    console.log(`❌ Falha: ${failCount}/${guilds.size} servidores`);
    
    if (failCount > 0) {
      console.log('\n⚠️ Servidores com falha:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.guildName} (${result.guildId}): ${result.error || 'Erro desconhecido'}`);
      });
    }
    
    console.log('\n✅ Registro de comandos concluído para todos os servidores.');
  } catch (error) {
    console.error('❌ Erro durante o registro de comandos:', error);
  }
}

// Adicionar ao evento 'ready' do bot
client.once('ready', () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  
  // Registrar comandos automaticamente em todas as guilds
  registerCommandsOnReady(client).catch(error => {
    console.error('Erro ao registrar comandos automaticamente:', error);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});