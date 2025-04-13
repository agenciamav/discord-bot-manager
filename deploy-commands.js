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

if (fs.existsSync(commandsPath)) {
  const files = fs.readdirSync(commandsPath);
  console.log('Arquivos/pastas encontrados:', files);

  for (const file of files) {
    const filePath = path.join(commandsPath, file);
    const stats = fs.statSync(filePath);
    console.log(`Analisando ${file}:`, stats.isFile() ? 'arquivo' : 'diretório');

    if (stats.isFile() && file.endsWith('.js')) {
      try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`✅ Comando carregado: ${file} (${command.data.name})`);
        } else {
          console.log(`⚠️ [WARNING] O comando em ${filePath} está sem as propriedades "data" ou "execute".`);
        }
      } catch (error) {
        console.error(`❌ Erro ao carregar comando ${filePath}:`, error);
      }
    } else if (stats.isDirectory()) {
      console.log(`📁 Abrindo diretório: ${file}`);
      const subCommandFiles = fs.readdirSync(filePath).filter(file => file.endsWith('.js'));
      console.log(`   Arquivos encontrados: ${subCommandFiles.join(', ')}`);
      
      for (const subFile of subCommandFiles) {
        const subFilePath = path.join(filePath, subFile);
        try {
          const command = require(subFilePath);
          if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Comando carregado: ${file}/${subFile} (${command.data.name})`);
          } else {
            console.log(`⚠️ [WARNING] O comando em ${subFilePath} está sem as propriedades "data" ou "execute".`);
          }
        } catch (error) {
          console.error(`❌ Erro ao carregar comando ${subFilePath}:`, error);
        }
      }
    }
  }
} else {
  console.error(`❌ [ERROR] Diretório de comandos não encontrado: ${commandsPath}`);
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

module.exports = {};