const { SlashCommandBuilder } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { join } = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduz um arquivo de áudio')
    .addStringOption(option =>
      option.setName('audio')
        .setDescription('Arquivo de áudio para reproduzir (exemplo: welcome, alert)')
        .setRequired(true)
        .addChoices(
          { name: 'Boas Vindas', value: 'welcome' },
          { name: 'Alerta', value: 'alert' },
          { name: 'Despedida', value: 'goodbye' }
        )),
  
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
    
    // Obter o áudio escolhido
    const audioChoice = interaction.options.getString('audio');
    const audioPath = join(__dirname, '..', '..', 'audio', `${audioChoice}.mp3`);
    
    try {
      // Verificar a conexão existente ou criar uma nova
      let connection = getVoiceConnection(interaction.guild.id);
      
      if (!connection) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
          selfDeaf: false,
        });
      }
      
      // Criar o player e o recurso de áudio
      const player = createAudioPlayer();
      const resource = createAudioResource(audioPath);
      
      // Reproduzir o áudio
      connection.subscribe(player);
      player.play(resource);
      
      // Responder à interação
      await interaction.reply(`Reproduzindo áudio: **${audioChoice}**`);
      
      // Configurar tratamento para o fim da reprodução
      player.on(AudioPlayerStatus.Idle, () => {
        console.log('Reprodução de áudio finalizada');
      });
      
      player.on('error', error => {
        console.error(`Erro na reprodução: ${error.message}`);
      });
    } catch (error) {
      console.error(`Erro ao reproduzir áudio: ${error}`);
      await interaction.reply({ 
        content: 'Ocorreu um erro ao tentar reproduzir o áudio.', 
        ephemeral: true 
      });
    }
  },
}; 