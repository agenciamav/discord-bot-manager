const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const recordingManager = require('../../audio/recordingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('record')
        .setDescription('Inicia a gravação de áudio no canal de voz')
        .setDefaultMemberPermissions(2048) // Permissão para enviar mensagens
        .setDMPermission(false), // Não permitir em DMs

    async execute(interaction) {
        // Verificar se o usuário está em um canal de voz
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'Você precisa estar em um canal de voz para usar este comando!', ephemeral: true });
        }

        const guildId = interaction.guildId;
        const channelId = voiceChannel.id;

        // Verificar se já está gravando
        if (recordingManager.isRecording(guildId)) {
            return interaction.reply({ content: 'Já estou gravando neste servidor. Use `/stop` para parar a gravação atual.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            // Obter ou criar uma conexão com o canal de voz
            let connection = getVoiceConnection(guildId);
            
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: channelId,
                    guildId: guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false, // Precisa ouvir para gravar
                    selfMute: true, // Não precisa falar
                });
            }

            // Iniciar a gravação para o servidor
            const started = recordingManager.startRecordingGuild(guildId, connection);
            
            if (!started) {
                return interaction.editReply('Não foi possível iniciar a gravação. Já existe uma sessão ativa?');
            }

            // Iniciar a gravação para cada membro presente no canal
            const members = voiceChannel.members.filter(member => !member.user.bot);
            
            if (members.size === 0) {
                await interaction.editReply('Iniciando gravação, mas não há usuários no canal ainda. Aguardando participantes...');
                return;
            }

            // Aguardar um momento para garantir que a conexão esteja pronta
            setTimeout(() => {
                // Iniciar gravação para cada membro
                let startedCount = 0;
                members.forEach(member => {
                    recordingManager.startRecordingUser(guildId, channelId, member.id, connection.receiver);
                    startedCount++;
                });

                interaction.editReply(`Gravação iniciada no canal ${voiceChannel.name}. Gravando áudio de ${startedCount} usuários. Use \`/stop\` para encerrar a gravação.`);
            }, 2000); // 2 segundos para garantir que a conexão esteja estabelecida
        } catch (error) {
            console.error(`[Record] Erro ao iniciar gravação:`, error);
            interaction.editReply(`Ocorreu um erro ao tentar iniciar a gravação: ${error.message}`);
        }
    },
};
