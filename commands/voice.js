const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { join } = require('path');
const audioManager = require('../audio/audioManager');
const fs = require('fs');

module.exports = {
  category: 'voice',
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Comandos relacionados a canais de voz')
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Entrar no seu canal de voz e capturar áudio para STT')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave')
        .setDescription('Sair do canal de voz atual')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Reproduz um arquivo de áudio')
        .addStringOption(option =>
          option.setName('audio')
            .setDescription('Arquivo de áudio para reproduzir')
            .setRequired(true)
            .addChoices(
              { name: 'Boas Vindas', value: 'welcome' },
              { name: 'Alerta', value: 'alert' },
              { name: 'Despedida', value: 'goodbye' }
            ))
    ),
  
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Este comando só pode ser usado em servidores.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'join') {
      // Verificar se o usuário está em um canal de voz
      const member = interaction.guild.members.cache.get(interaction.user.id);
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: 'Você precisa estar em um canal de voz para usar este comando.',
          ephemeral: true
        });
      }

      try {
        await interaction.deferReply();
        
        // Conectar ao canal e iniciar captura de áudio
        await audioManager.connectToChannel(voiceChannel, { receiveAudio: true });
        
        await interaction.editReply({
          content: `🎤 Conectado ao canal de voz **${voiceChannel.name}** e iniciando captura de áudio para STT.`,
        });

      } catch (error) {
        console.error('Erro ao conectar ao canal de voz:', error);
        await interaction.editReply({
          content: `❌ Erro ao conectar ao canal de voz: ${error.message}`,
        });
      }
    } else if (subcommand === 'leave') {
      // Desconectar do canal de voz
      const guild = interaction.guild;
      const botMember = guild.members.cache.get(interaction.client.user.id);
      const voiceChannel = botMember?.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: 'O bot não está conectado a nenhum canal de voz.',
          ephemeral: true
        });
      }

      try {
        const disconnected = audioManager.disconnect(voiceChannel.id);
        if (disconnected) {
          await interaction.reply({
            content: `👋 Desconectado do canal de voz **${voiceChannel.name}**.`,
          });
        } else {
          await interaction.reply({
            content: '❌ Não foi possível desconectar do canal de voz.',
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Erro ao desconectar do canal de voz:', error);
        await interaction.reply({
          content: `❌ Erro ao desconectar do canal de voz: ${error.message}`,
          ephemeral: true
        });
      }
    } else if (subcommand === 'play') {
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
      const audioPath = join(__dirname, '..', 'audio', `${audioChoice}.mp3`);
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(audioPath)) {
        return interaction.reply({
          content: `❌ Arquivo de áudio '${audioChoice}.mp3' não encontrado.`,
          ephemeral: true
        });
      }
      
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
        await interaction.reply(`🎵 Reproduzindo áudio: **${audioChoice}**`);
        
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
          content: `❌ Ocorreu um erro ao tentar reproduzir o áudio: ${error.message}`, 
          ephemeral: true 
        });
      }
    }
  },
}; 