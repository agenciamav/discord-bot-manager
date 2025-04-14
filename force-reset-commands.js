require('dotenv').config();
const { REST, Routes } = require('discord.js');
const axios = require('axios');

const APP_URL = process.env.APP_URL || 'http://localhost:8000';
const BOT_MANAGER_SECRET = process.env.BOT_MANAGER_SECRET;

// Função para obter o bot da API
async function fetchBot() {
  try {
    console.log(`🔍 Buscando bot da API em: ${APP_URL}/api/discord/bots`);
    
    const configs = [
      {
        name: "X-Bot-Manager-Secret header",
        config: {
          headers: {
            'Accept': 'application/json',
            'X-Bot-Manager-Secret': BOT_MANAGER_SECRET
          }
        }
      }
    ];
    
    for (const { name, config } of configs) {
      console.log(`🔄 Tentando autenticação: ${name}`);
      
      try {
        const response = await axios.get(`${APP_URL}/api/discord/bots`, config);
        
        if (response.status === 200 && response.data?.success && response.data?.data?.length > 0) {
          console.log(`✅ Autenticação bem-sucedida!`);
          console.log(`✅ Encontrados ${response.data.data.length} bots`);
          
          // Retorna o primeiro bot
          return response.data.data[0];
        }
      } catch (err) {
        console.log(`❌ Falha: ${err.message}`);
      }
    }
    
    throw new Error("Não foi possível obter os bots da API");
  } catch (error) {
    console.error(`❌ Erro ao buscar bots: ${error.message}`);
    process.exit(1);
  }
}

// Função para forçar o reset dos comandos
async function forceResetCommands(clientId, guildId, token) {
  console.log(`
======================================
    FORCE RESET DE COMANDOS DISCORD
======================================
Client ID: ${clientId}
Guild ID: ${guildId}
Token: ${token ? '[Presente]' : '[Ausente]'}

ATENÇÃO: Este script irá FORÇAR a remoção de TODOS os comandos
         registrados e depois limpar o cache Discord.
  `);
  
  // Verifica os parâmetros
  if (!clientId || !guildId || !token) {
    console.error("❌ CLIENT_ID, GUILD_ID e TOKEN são obrigatórios!");
    process.exit(1);
  }
  
  try {
    // Inicializa o cliente REST
    const rest = new REST({ version: '10' }).setToken(token);
    
    // Primeiro: Busca comandos registrados globalmente
    console.log("🔍 Buscando comandos globais...");
    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    console.log(`📋 Encontrados ${globalCommands.length} comandos globais`);
    
    // Remove comandos globais um por um
    if (globalCommands.length > 0) {
      console.log("🗑️ Removendo comandos globais...");
      for (const cmd of globalCommands) {
        await rest.delete(
          Routes.applicationCommand(clientId, cmd.id)
        );
        console.log(`  ✅ Comando global removido: ${cmd.name}`);
      }
    }
    
    // Segundo: Busca comandos registrados na guild
    console.log(`\n🔍 Buscando comandos na guild ${guildId}...`);
    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    console.log(`📋 Encontrados ${guildCommands.length} comandos na guild`);
    
    // Remove comandos da guild um por um
    if (guildCommands.length > 0) {
      console.log("🗑️ Removendo comandos da guild...");
      for (const cmd of guildCommands) {
        await rest.delete(
          Routes.applicationGuildCommand(clientId, guildId, cmd.id)
        );
        console.log(`  ✅ Comando de guild removido: ${cmd.name}`);
      }
    }
    
    // Terceiro: força um reset completo usando a abordagem de array vazio
    console.log("\n🔄 Enviando array vazio para garantir o reset completo...");
    
    // Reset global
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] }
    );
    console.log("✅ Reset global concluído!");
    
    // Reset na guild
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: [] }
    );
    console.log("✅ Reset da guild concluído!");
    
    console.log(`
======================================
      RESET CONCLUÍDO COM SUCESSO
======================================

Todos os comandos foram removidos com sucesso! 
Agora você pode executar o script reset-commands.js
para registrar novamente os comandos.

NOTA: Pode ser necessário reiniciar o cliente Discord
      para que as alterações sejam visíveis.
    `);
    
    return true;
  } catch (error) {
    console.error(`❌ Erro durante o reset de comandos: ${error.message}`);
    if (error.code) {
      console.error(`Código de erro: ${error.code}`);
    }
    if (error.response) {
      console.error(`Resposta: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

// Execução principal
(async () => {
  try {
    const bot = await fetchBot();
    
    const clientId = bot.application_id || bot.client_id;
    const guildId = bot.guild_id;
    const token = bot.decrypted_token;
    
    console.log(`🤖 Bot encontrado: ${bot.name}`);
    console.log(`ℹ️ Client ID: ${clientId}`);
    console.log(`ℹ️ Guild ID: ${guildId}`);
    
    // Executa o reset forçado
    await forceResetCommands(clientId, guildId, token);
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    process.exit(1);
  }
})(); 