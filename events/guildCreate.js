module.exports = {
    name: 'guildCreate',
    async execute(guild) {
        console.log(`Bot foi adicionado ao servidor: ${guild.name} (${guild.id})`);
        
        // Notificar a API Laravel sobre o novo servidor
        try {
            const response = await axios.post(`${process.env.APP_URL}/api/discord/guilds/joined`, {
                bot_id: guild.client.user.id,
                guild_id: guild.id,
                guild_name: guild.name,
                member_count: guild.memberCount,
                owner_id: guild.ownerId
            }, {
                headers: {
                    'X-Bot-Manager-Secret': process.env.BOT_MANAGER_SECRET
                }
            });
            
            console.log('API notificada sobre novo servidor:', response.data);
            
            // Registrar comandos automaticamente no novo servidor
            // código para deploy...
            
        } catch (error) {
            console.error('Erro ao notificar API sobre novo servidor:', error);
        }
    }
};
