const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Entra no canal de voz em que você está'),
  
  async execute(interaction) {
    // Verificar se o usuário está em um canal de voz
    const member = interaction.member;
    const voiceChannel = member.voice.channel;
    
    if (!voiceChannel) {
      return interaction.reply({ 
        content: 'Você precisa estar em um canal de voz para usar este comando!', 
        ephemeral: true 
      });
    }
    
    try {
      // Verificar se o bot já está conectado a este canal
      const existingConnection = getVoiceConnection(interaction.guild.id);
      
      if (existingConnection) {
        return interaction.reply({ 
          content: 'Eu já estou conectado a um canal de voz neste servidor!', 
          ephemeral: true 
        });
      }
      
      // Criar conexão com o canal de voz
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });
      
      await interaction.reply(`Conectado ao canal de voz: **${voiceChannel.name}**!`);
    } catch (error) {
      console.error(`Erro ao entrar no canal de voz: ${error}`);
      await interaction.reply({ 
        content: 'Ocorreu um erro ao tentar entrar no canal de voz.', 
        ephemeral: true 
      });
    }
  },
}; 