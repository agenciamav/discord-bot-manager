const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignorar mensagens do próprio bot
        if (message.author.id === message.client.user.id) return;
        
        // Apenas registra mensagens que mencionam o bot
        if (message.mentions.has(message.client.user)) {
            console.log(`Bot mencionado por ${message.author.username} em ${message.guild?.name || 'DM'}: ${message.content}`);
            
            // Opcionalmente, responde com uma mensagem simples
            await message.reply('Olá! Sou um bot gerenciado pelo Discord Bot Manager. Não possuo capacidades de IA.');
        }
    }
};
