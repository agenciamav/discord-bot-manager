require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');

// Obter configurações do arquivo .env
const APP_URL = process.env.APP_URL || 'http://localhost:8000';
const BOT_MANAGER_SECRET = process.env.BOT_MANAGER_SECRET;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Status da configuração
console.log('Iniciando deploy de comandos...');
console.log('Ambiente:', process.env.NODE_ENV || 'development');
console.log('APP_URL:', APP_URL);
console.log('BOT_MANAGER_SECRET:', BOT_MANAGER_SECRET ? '[definido]' : '[não definido]');
console.log('CLIENT_ID:', CLIENT_ID ? '[definido]' : '[não definido]');
console.log('GUILD_ID:', GUILD_ID ? '[definido]' : '[não definido]');
console.log('DISCORD_BOT_TOKEN:', DISCORD_BOT_TOKEN ? '[definido]' : '[não definido]');

// Carregar comandos
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
console.log('Buscando comandos em:', commandsPath);

// Função para desregistrar todos os comandos
async function deleteAllCommands(rest, clientId, guildId) {
  console.log(`🗑️ Iniciando processo para desregistrar todos os comandos...`);
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Guild ID: ${guildId}`);
  
  try {
    // Primeiro, buscar todos os comandos registrados
    const registeredCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`📋 Encontrados ${registeredCommands.length} comandos registrados`);
    
    if (registeredCommands.length === 0) {
      console.log('✅ Não há comandos para desregistrar');
      return;
    }
    
    // Listar os comandos encontrados
    console.log('📋 Comandos registrados:');
    registeredCommands.forEach(cmd => {
      console.log(`   - ${cmd.name} (ID: ${cmd.id})`);
    });
    
    console.log('🗑️ Desregistrando todos os comandos...');
    
    // Remover comandos um por um
    for (const cmd of registeredCommands) {
      try {
        await rest.delete(
          Routes.applicationGuildCommand(clientId, guildId, cmd.id)
        );
        console.log(`✅ Comando removido: ${cmd.name}`);
      } catch (error) {
        console.error(`❌ Erro ao remover comando ${cmd.name}:`, error.message);
      }
    }
    
    console.log('✅ Processo de desregistro concluído');
  } catch (error) {
    console.error('❌ Erro ao desregistrar comandos:', error.message);
    throw error;
  }
}

// Função para carregar comandos recursivamente
function loadCommands(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ [ERROR] Diretório não encontrado: ${dir}`);
    return;
  }

  const items = fs.readdirSync(dir);
  console.log(`📂 Verificando itens em ${dir}:`, items);

  // Primeiro verificar arquivos .js para dar prioridade aos comandos de nível superior
  const jsFiles = items.filter(item => fs.statSync(path.join(dir, item)).isFile() && item.endsWith('.js'));
  const dirs = items.filter(item => fs.statSync(path.join(dir, item)).isDirectory());
  
  // Conjunto para controlar nomes de comandos já registrados
  const registeredCommandNames = new Set();

  // Processar primeiro os arquivos .js
  for (const item of jsFiles) {
    const itemPath = path.join(dir, item);
    
    try {
      const command = require(itemPath);
      if ('data' in command && 'execute' in command) {
        // Verificar se o comando já foi registrado
        const commandName = typeof command.data.name === 'function' 
          ? command.data.name 
          : command.data.name || (command.data.toJSON ? command.data.toJSON().name : null);
        
        if (!commandName) {
          console.log(`⚠️ [WARNING] Comando em ${itemPath} não possui nome válido.`);
          continue;
        }
        
        if (!registeredCommandNames.has(commandName)) {
          // Verificar se é um SlashCommandBuilder ou um objeto simples
          let commandData;
          if (command.data.toJSON) {
            // É um SlashCommandBuilder
            commandData = command.data.toJSON();
          } else if (typeof command.data === 'object') {
            // É um objeto simples, usar como está
            commandData = command.data;
          } else {
            console.log(`⚠️ [WARNING] Formato de dados inválido em ${itemPath}`);
            continue;
          }
          
          commands.push(commandData);
          registeredCommandNames.add(commandName);
          console.log(`✅ Comando carregado: ${itemPath} (${commandName})`);
        } else {
          console.log(`⚠️ [WARNING] Comando ${commandName} já registrado, ignorando duplicata em ${itemPath}`);
        }
      } else {
        console.log(`⚠️ [WARNING] O comando em ${itemPath} está sem as propriedades "data" ou "execute".`);
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar comando ${itemPath}:`, error);
    }
  }

  // Agora processar diretórios (exceto os que conflitam com comandos já registrados)
  for (const item of dirs) {
    // Pular diretórios especiais
    if (item === 'backup') {
      console.log(`📁 Ignorando pasta de backup '${item}'`);
      continue;
    }
    
    // Pular diretórios cujo nome é igual a um comando já registrado
    if (registeredCommandNames.has(item)) {
      console.log(`📁 Ignorando subcomandos da pasta '${item}' pois há um comando principal com o mesmo nome.`);
      continue;
    }
    
    // Carrega comandos recursivamente para outros diretórios
    loadCommands(path.join(dir, item));
  }
}

// Iniciar carregamento de comandos
loadCommands(commandsPath);

// Verificar se algum comando foi carregado
if (commands.length === 0) {
  console.warn('⚠️ [WARNING] Nenhum comando foi carregado!');
} else {
  console.log(`📋 Total de comandos carregados: ${commands.length}`);
  console.log(`📋 Lista de comandos: ${commands.map(cmd => cmd.name).join(', ')}`);
}

console.log(`📋 Total de comandos carregados: ${commands.length}`);
if (commands.length > 0) {
    console.log(`📋 Lista de comandos: ${commands.map(cmd => cmd.name).join(', ')}`);
}

// Função para buscar os bots da API Laravel
async function fetchBotsFromApi() {
    // Log para debug
    console.log(`🔍 Tentando buscar bots da API Laravel em: ${APP_URL}/api/discord/bots`);

    if (!BOT_MANAGER_SECRET) {
        console.log('⚠️ BOT_MANAGER_SECRET não definido, a autenticação com a API pode falhar');
    }
    
    try {
        // Tentar várias configurações de autenticação
        const configs = [
            // Config 1: X-Bot-Manager-Secret no header
            {
                name: "X-Bot-Manager-Secret header",
                config: {
                    headers: {
                        'Accept': 'application/json',
                        'X-Bot-Manager-Secret': BOT_MANAGER_SECRET
                    }
                }
            },
            // Config 2: Bearer token
            {
                name: "Bearer token",
                config: {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${BOT_MANAGER_SECRET}`
                    }
                }
            },
            // Config 3: Query parameter
            {
                name: "Query parameter",
                config: {
                    params: { token: BOT_MANAGER_SECRET },
                    headers: { 'Accept': 'application/json' }
                }
            }
        ];
        
        // Tentar cada configuração
        for (const { name, config } of configs) {
            console.log(`🔄 Tentando autenticação usando: ${name}`);
            
            try {
                const response = await axios.get(`${APP_URL}/api/discord/bots`, config);
                
                if (response.status === 200 && response.data?.success && response.data?.data?.length > 0) {
                    console.log(`✅ Autenticação bem-sucedida usando: ${name}`);
                    console.log(`✅ Encontrados ${response.data.data.length} bots na API`);
                    return response.data.data;
                }
                
                console.log(`❌ API respondeu com sucesso (${response.status}), mas sem bots:`);
                console.log(JSON.stringify(response.data, null, 2));
            } catch (err) {
                console.log(`❌ Falha na autenticação usando ${name}: ${err.message}`);
                if (err.response) {
                    console.log(`   Status: ${err.response.status}`);
                    console.log(`   Resposta: ${JSON.stringify(err.response.data, null, 2)}`);
                }
            }
        }
        
        // Se nenhuma tentativa funcionou, tentar workspace por workspace
        console.log('🔄 Nenhuma tentativa funcionou, tentando buscar por workspace...');
        
        for (let workspaceId = 1; workspaceId <= 5; workspaceId++) {
            console.log(`🔄 Tentando workspace ID: ${workspaceId}`);
            
            for (const { name, config } of configs) {
                try {
                    const url = `${APP_URL}/api/discord/workspaces/${workspaceId}/bots`;
                    console.log(`🔍 Tentando: ${url}`);
                    
                    const response = await axios.get(url, config);
                    
                    if (response.status === 200 && response.data?.success && response.data?.data?.length > 0) {
                        console.log(`✅ Sucesso! Encontrados ${response.data.data.length} bots no workspace ${workspaceId}`);
                        return response.data.data;
                    }
                } catch (err) {
                    // Apenas log em caso de falha
                    console.log(`❌ Falha no workspace ${workspaceId} usando ${name}`);
                }
            }
        }
        
        console.log('❌ Não foi possível encontrar bots em nenhum workspace');
        return null;
    } catch (error) {
        console.error('❌ Erro ao buscar bots da API:', error.message);
        return null;
    }
}

// Função para verificar se um valor é BigInt e convertê-lo para string
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Se for um BigInt, converter para string
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Se for um objeto, processar recursivamente
  if (typeof obj === 'object') {
    // Se for um array, mapear cada elemento
    if (Array.isArray(obj)) {
      return obj.map(item => serializeBigInt(item));
    }
    
    // Se for um objeto, processar cada propriedade
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }
  
  // Retornar outros tipos sem alteração
  return obj;
}

// Função para converter comandos para formato JSON seguro
function safeCommandToJSON(command) {
  if (typeof command.toJSON === 'function') {
    return serializeBigInt(command.toJSON());
  } else {
    return serializeBigInt(command);
  }
}

// Função principal para realizar o deploy de comandos para um bot específico
async function deployCommandsForBot(botConfig) {
  const { token, clientId, guildId, guildIds, name } = botConfig;
  
  if (!token || !clientId) {
    throw new Error('Token e Client ID são obrigatórios para o deploy de comandos');
  }
  
  if (!guildId && (!guildIds || !guildIds.length)) {
    throw new Error('Pelo menos um Guild ID é necessário para o deploy de comandos');
  }
  
  const targetGuilds = guildIds?.length ? guildIds : [guildId];
  
  // Construir versão segura dos comandos para envio
  const safeCommands = commands.map(cmd => safeCommandToJSON(cmd));
  
  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(token);
  
  try {
    console.log(`🤖 Iniciando deploy de comandos para bot: ${name || 'Sem nome'}`);
    console.log(`📋 Total de comandos: ${safeCommands.length}`);
    
    const results = [];
    
    for (const guild of targetGuilds) {
      try {
        console.log(`\n🔄 Processando guild ID: ${guild}`);
        
        // Primeiro, desregistrar todos os comandos existentes
        await deleteAllCommands(rest, clientId, guild);
        
        // Depois, registrar os novos comandos
        console.log(`\n🚀 Registrando ${safeCommands.length} comandos na guild: ${guild}`);
        
        const data = await rest.put(
          Routes.applicationGuildCommands(clientId, guild),
          { body: safeCommands }
        );
        
        console.log(`✅ Sucesso! ${data.length} comandos registrados na guild ${guild}`);
        
        results.push({
          guildId: guild,
          success: true,
          commandsRegistered: data.length,
          message: `${data.length} comandos registrados com sucesso`
        });
      } catch (error) {
        console.error(`❌ Erro ao registrar comandos na guild ${guild}:`, error.message);
        
        results.push({
          guildId: guild,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: results.some(r => r.success),
      results
    };
  } catch (error) {
    console.error('❌ Erro ao realizar deploy de comandos:', error.message);
    throw error;
  }
}

// Exporta a função para uso externo
module.exports = {
  deployCommandsForBot
};

// Função principal
(async () => {
    try {
        // ABORDAGEM 1: Tentar buscar os bots da API Laravel
        let clientId, guildId, token;
        const bots = await fetchBotsFromApi();
        
        if (bots && bots.length > 0) {
            // Usar o primeiro bot da lista
            const firstBot = bots[0];
            console.log(`🤖 Usando bot da API: ${firstBot.name || 'Sem nome'}`);
            
            clientId = firstBot.application_id || firstBot.client_id;
            guildId = firstBot.guild_id;
            token = firstBot.decrypted_token;
            
            console.log(`ℹ️ Token da API: ${token ? '✅ [definido]' : '❌ [não definido]'}`);
            console.log(`ℹ️ Client ID da API: ${clientId || '❌ [não definido]'}`);
            console.log(`ℹ️ Guild ID da API: ${guildId || '❌ [não definido]'}`);
        } else {
            console.log('⚠️ Nenhum bot encontrado na API. Tentando usar variáveis do .env...');
        }
        
        // ABORDAGEM 2: Se não conseguiu da API, usar variáveis de ambiente
        if (!token || !clientId || !guildId) {
            console.log('🔄 Usando dados do arquivo .env como alternativa');
            
            // Usar variáveis de ambiente
            token = DISCORD_BOT_TOKEN;
            clientId = CLIENT_ID;
            guildId = GUILD_ID;
            
            // Verificar se temos o mínimo necessário
            if (!token) {
                throw new Error('DISCORD_BOT_TOKEN não definido no .env e não encontrado na API.');
            }
            
            if (!clientId) {
                throw new Error('CLIENT_ID não definido no .env e não encontrado na API.');
            }
            
            if (!guildId) {
                throw new Error('GUILD_ID não definido no .env e não encontrado na API.');
            }
        }
        
        // Agora com as credenciais, podemos registrar os comandos
        console.log('🚀 Registrando comandos no Discord...');
        console.log(`   Client ID: ${clientId}`);
        console.log(`   Guild ID: ${guildId}`);
        console.log(`   Token: ${token ? '[definido]' : '[não definido]'}`);
        
        // Construct and prepare an instance of the REST module
        const rest = new REST().setToken(token);
        
        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        
        console.log(`✅ Registrados com sucesso ${data.length} comandos (/) no Discord!`);
    } catch (error) {
        console.error('❌ Erro durante o deploy:', error.message);
        process.exit(1);
    }
})();