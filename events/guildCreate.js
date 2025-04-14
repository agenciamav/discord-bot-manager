const axios = require('axios');
const { deployCommandsForBot } = require('../deploy-commands');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    name: 'guildCreate',
    once: false,
    async execute(guild) {
        try {
            console.log(`🎉 Bot foi adicionado ao servidor: ${guild.name} (${guild.id})`);
            console.log(`👥 Membros: ${guild.memberCount}`);
            console.log(`👑 Dono: ${guild.ownerId}`);
            
            // Notificar a API sobre o novo servidor
            try {
                console.log(`📡 Notificando API sobre o novo servidor...`);
                
                await axios.post(`${process.env.APP_URL}/api/discord/guilds/joined`, {
                    bot_id: guild.client.user.id,
                    guild_id: guild.id,
                    guild_name: guild.name,
                    members_count: guild.memberCount,
                    owner_id: guild.ownerId
                }, {
                    headers: {
                        'X-Bot-Manager-Secret': process.env.BOT_MANAGER_SECRET
                    }
                });
                
                console.log(`✅ API notificada com sucesso!`);
            } catch (apiError) {
                console.error(`❌ Erro ao notificar API sobre o novo servidor:`, apiError.message);
                if (apiError.response) {
                    console.error(`Status: ${apiError.response.status}`);
                }
            }
            
            // Registrar comandos automaticamente no novo servidor
            console.log(`🔄 Registrando comandos no servidor: ${guild.name}`);
            
            // Verificar se o bot tem permissões adequadas
            const botMember = await guild.members.fetch(guild.client.user.id);
            if (!botMember.permissions.has('ADMINISTRATOR') && 
                !botMember.permissions.has('MANAGE_GUILD') && 
                !botMember.permissions.has('MANAGE_ROLES')) {
                console.warn(`⚠️ O bot pode não ter permissões suficientes no servidor ${guild.name}`);
            }
            
            // Utilizar a função deployCommandsForBot do deploy-commands.js
            const result = await deployCommandsForBot({
                token: guild.client.token,
                clientId: guild.client.user.id,
                guildId: guild.id,
                name: guild.name
            });
            
            if (result.success) {
                console.log(`✅ Comandos registrados com sucesso no servidor: ${guild.name}`);
                console.log(`📋 Total de ${result.results[0].commandsRegistered} comandos registrados`);
            } else {
                console.error(`❌ Falha ao registrar comandos no servidor: ${guild.name}`);
                console.error(result.error || JSON.stringify(result, null, 2));
                
                // Se falhou, tentar buscar mais informações sobre o erro
                if (result.results && result.results.length > 0) {
                    const firstResult = result.results[0];
                    if (firstResult.error) {
                        console.error(`Detalhes do erro: ${firstResult.error}`);
                    }
                }
            }
            
            // Enviar mensagem de boas-vindas ao servidor (opcional)
            try {
                // Buscar o canal principal (geral, principal, bem-vindo)
                const generalChannel = guild.channels.cache.find(
                    channel => channel.type === 0 && // GUILD_TEXT
                    (channel.name.includes('geral') || 
                     channel.name.includes('general') || 
                     channel.name.includes('bem-vindo') || 
                     channel.name.includes('welcome') || 
                     channel.name.includes('chat'))
                );
                
                if (generalChannel) {
                    await generalChannel.send({
                        content: `👋 Olá! Obrigado por me adicionar ao servidor **${guild.name}**!\n\n` +
                                `Use o comando \`/help\` para ver a lista de comandos disponíveis.\n\n` +
                                `Se precisar de ajuda, contacte o administrador do bot.`
                    });
                }
            } catch (msgError) {
                console.error(`❌ Erro ao enviar mensagem de boas-vindas:`, msgError.message);
            }
        } catch (error) {
            console.error(`❌ Erro no evento guildCreate para o servidor ${guild?.name || 'desconhecido'}:`, error);
        }
    }
};
