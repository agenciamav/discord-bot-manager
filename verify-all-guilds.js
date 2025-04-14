require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');

// Carregar configurações do ambiente
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'http://localhost:8000';
const BOT_MANAGER_SECRET = process.env.BOT_MANAGER_SECRET;

// Verificar se temos o token
if (!TOKEN) {
  console.error('❌ TOKEN não encontrado! Configure a variável DISCORD_BOT_TOKEN no arquivo .env');
  process.exit(1);
}

console.log('==== Iniciando verificação de todos os servidores ====');
console.log('TOKEN:', TOKEN ? '[configurado]' : '[não configurado]');
console.log('APP_URL:', APP_URL);
console.log('BOT_MANAGER_SECRET:', BOT_MANAGER_SECRET ? '[configurado]' : '[não configurado]');

// Inicializar cliente Discord para buscar os servidores
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Inicializar REST API para Discord
const rest = new REST().setToken(TOKEN);

// Função para carregar todos os comandos
function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  
  // Verificar se o diretório existe
  if (!fs.existsSync(commandsPath)) {
    console.error(`❌ Diretório de comandos não encontrado: ${commandsPath}`);
    return [];
  }
  
  // Função para carregar comandos recursivamente
  function loadCommandsFromDir(dir) {
    if (!fs.existsSync(dir)) {
      console.error(`❌ Diretório não encontrado: ${dir}`);
      return;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile() && item.endsWith('.js')) {
        try {
          const command = require(itemPath);
          
          if ('data' in command && 'execute' in command) {
            if (command.data.toJSON) {
              commands.push(command.data.toJSON());
            } else {
              commands.push(command.data);
            }
            console.log(`✅ Comando carregado: ${command.data.name}`);
          } else {
            console.log(`⚠️ Comando inválido em ${itemPath}`);
          }
        } catch (error) {
          console.error(`❌ Erro ao carregar ${itemPath}:`, error);
        }
      } else if (stats.isDirectory() && item !== 'backup') {
        loadCommandsFromDir(itemPath);
      }
    }
  }
  
  loadCommandsFromDir(commandsPath);
  return commands;
}

// Função para serializar BigInt (resolve problema de serialização JSON)
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(item => serializeBigInt(item));
    }
    
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

// Função para registrar comandos em um servidor
async function registerCommandsInGuild(clientId, guildId, commands) {
  console.log(`\n🔄 Registrando comandos na guild: ${guildId}`);
  
  try {
    // Verificar comandos existentes
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`📋 ${existingCommands.length} comandos já registrados`);
    
    // Registrar novos comandos
    const safeCommands = commands.map(cmd => serializeBigInt(cmd));
    
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: safeCommands }
    );
    
    console.log(`✅ Comandos registrados com sucesso! (${data.length} comandos)`);
    return {
      success: true,
      guildId,
      commandsRegistered: data.length
    };
  } catch (error) {
    console.error(`❌ Erro ao registrar comandos na guild ${guildId}:`, error.message);
    return {
      success: false,
      guildId,
      error: error.message
    };
  }
}

// Função para notificar a API Laravel sobre o servidor
async function notifyApiAboutGuild(botId, guild) {
  if (!APP_URL || !BOT_MANAGER_SECRET) {
    console.log(`⚠️ APP_URL ou BOT_MANAGER_SECRET não configurados, pulando notificação`);
    return { success: false, reason: 'missing_config' };
  }
  
  try {
    const response = await axios.post(`${APP_URL}/api/discord/guilds/joined`, {
      bot_id: botId,
      guild_id: guild.id,
      guild_name: guild.name,
      members_count: guild.memberCount,
      owner_id: guild.ownerId
    }, {
      headers: {
        'X-Bot-Manager-Secret': BOT_MANAGER_SECRET
      }
    });
    
    console.log(`✅ API notificada sobre o servidor: ${guild.name}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erro ao notificar API:`, error.message);
    return { success: false, error: error.message };
  }
}

// Evento de login bem-sucedido
client.once('ready', async () => {
  try {
    console.log(`🤖 Bot conectado como ${client.user.tag}`);
    console.log(`🆔 ID do bot: ${client.user.id}`);
    
    // Carregar comandos
    const commands = loadCommands();
    console.log(`📋 Total de ${commands.length} comandos carregados`);
    
    if (commands.length === 0) {
      console.error('❌ Nenhum comando encontrado para registrar!');
      process.exit(1);
    }
    
    // Verificar todos os servidores onde o bot está presente
    const guilds = client.guilds.cache;
    console.log(`\n🔍 Bot está presente em ${guilds.size} servidores:`);
    
    const results = [];
    
    for (const [guildId, guild] of guilds) {
      console.log(`\n==== Servidor: ${guild.name} (${guildId}) ====`);
      console.log(`👥 Membros: ${guild.memberCount}`);
      console.log(`👑 Dono: ${guild.ownerId}`);
      
      // Notificar API sobre este servidor
      const apiResult = await notifyApiAboutGuild(client.user.id, guild);
      
      // Registrar comandos neste servidor
      const registerResult = await registerCommandsInGuild(client.user.id, guildId, commands);
      
      results.push({
        guildId,
        guildName: guild.name,
        apiNotified: apiResult.success,
        commandsRegistered: registerResult.success ? registerResult.commandsRegistered : 0,
        success: registerResult.success,
        error: registerResult.error
      });
    }
    
    // Resumo final
    console.log('\n==== Resumo da operação ====');
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Comandos registrados com sucesso em: ${successCount}/${guilds.size} servidores`);
    
    if (successCount < guilds.size) {
      console.log('\n⚠️ Servidores com falha:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.guildName} (${result.guildId}): ${result.error}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  }
});

// Iniciar o bot
client.login(TOKEN).catch(error => {
  console.error('❌ Erro ao conectar ao Discord:', error.message);
  process.exit(1);
}); 