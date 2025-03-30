const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignora mensagens de bots (inclusive as do próprio bot)
    if (message.author.bot) return;

    console.log(`Mensagem recebida de ${message.author.username} em ${message.channel.name}: ${message.content}`);
    
    // Lógica básica para responder a comandos específicos (exemplo)
    if (message.content.toLowerCase() === '!ping') {
      await message.reply('Pong!');
    }
    
    // Se mencionou o bot, informar sobre funcionalidade limitada
    if (message.mentions.has(message.client.user)) {
      await message.reply('Este bot está configurado apenas para gerenciamento básico e não possui recursos de IA para responder a perguntas.');
    }
  },
};
