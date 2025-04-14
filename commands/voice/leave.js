const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  data: {
    name: 'leave',
    description: 'Sai do canal de voz'
  },
  
  async execute(interaction) {
    try {
      // Obter a conexão atual do bot
      const connection = getVoiceConnection(interaction.guild.id);
      
      if (!connection) {
        return interaction.reply({ 
          content: 'Não estou conectado a nenhum canal de voz neste servidor!', 
          ephemeral: true 
        });
      }
      
      // Desconectar do canal de voz
      connection.destroy();
      await interaction.reply('Saí do canal de voz!');
    } catch (error) {
      console.error(`Erro ao sair do canal de voz: ${error}`);
      await interaction.reply({ 
        content: 'Ocorreu um erro ao tentar sair do canal de voz.', 
        ephemeral: true 
      });
    }
  },
}; 