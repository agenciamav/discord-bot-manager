/**
 * Script para remover e registrar novamente todos os comandos Discord
 * Útil quando os comandos não estão aparecendo no Discord ou quando há comandos duplicados
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const axios = require('axios');

// Obter configurações do arquivo .env
const APP_URL = process.env.APP_URL || 'http://localhost:8000';
const BOT_MANAGER_SECRET = process.env.BOT_MANAGER_SECRET;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

console.log('===== RESET DE COMANDOS DISCORD =====');
console.log('Este script irá remover todos os comandos e registrá-los novamente.');
console.log('Ambiente:', process.env.NODE_ENV || 'development');
console.log('APP_URL:', APP_URL);
console.log('BOT_MANAGER_SECRET:', BOT_MANAGER_SECRET ? '[definido]' : '[não definido]');
console.log('CLIENT_ID:', CLIENT_ID ? '[definido]' : '[não definido]');
console.log('GUILD_ID:', GUILD_ID ? '[definido]' : '[não definido]');
console.log('DISCORD_BOT_TOKEN:', DISCORD_BOT_TOKEN ? '[definido]' : '[não definido]');

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

async function resetCommands() {
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
    
    // Criar instância REST da API Discord
    const rest = new REST().setToken(token);
    
    // Passo 1: Buscar todos os comandos existentes
    console.log('\n🔍 Buscando comandos registrados...');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Guild ID: ${guildId}`);
    
    const commands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`📋 Total de comandos encontrados: ${commands.length}`);
    
    if (commands.length === 0) {
      console.log('✅ Não há comandos para remover. Pulando para o registro de novos comandos.');
    } else {
      // Passo 2: Remover todos os comandos
      console.log('\n🗑️ Removendo comandos existentes...');
      
      for (const command of commands) {
        console.log(`  - Removendo: ${command.name} (ID: ${command.id})`);
        await rest.delete(
          Routes.applicationGuildCommand(clientId, guildId, command.id)
        );
      }
      
      console.log('✅ Todos os comandos foram removidos com sucesso!');
    }
    
    // Passo 3: Registrar os comandos novamente usando o script deploy-commands.js
    console.log('\n🚀 Registrando comandos novamente...');
    
    // Importar a função para registrar comandos
    const { deployCommandsForBot } = require('./deploy-commands');
    
    const result = await deployCommandsForBot({
      token,
      clientId,
      guildId,
      name: 'Bot'
    });
    
    if (result.success) {
      console.log('\n✅ Processo de reset concluído com sucesso!');
      console.log(`📋 ${result.results[0].commandsRegistered} comandos foram registrados novamente.`);
    } else {
      console.error('\n❌ Falha ao registrar comandos novamente.');
      console.error(result);
    }
  } catch (error) {
    console.error('\n❌ Erro durante o processo de reset:', error);
  }
}

// Executar a função principal
resetCommands(); 