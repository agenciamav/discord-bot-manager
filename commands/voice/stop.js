const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const recordingManager = require('../../audio/recordingManager');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Para a gravação de áudio no canal de voz atual')
        .setDefaultMemberPermissions(2048) // Permissão para enviar mensagens
        .setDMPermission(false), // Não permitir em DMs

    async execute(interaction) {
        const guildId = interaction.guildId;

        // Verificar se há gravação ativa
        if (!recordingManager.isRecording(guildId)) {
            return interaction.reply({ content: 'Não há gravação ativa neste servidor.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            // Obter a gravação ativa para este servidor
            const recording = recordingManager.getActiveRecording(guildId);
            
            if (!recording) {
                return interaction.editReply('Não foi possível encontrar a gravação ativa.');
            }

            // Parar a gravação
            const recordingInfo = recordingManager.stopRecordingGuild(guildId);
            
            if (!recordingInfo) {
                return interaction.editReply('Não foi possível parar a gravação. Talvez ela já tenha sido encerrada.');
            }

            // Verificar se há arquivos gravados
            const { userRecordings, startTime, channelId } = recordingInfo;
            const channelName = interaction.guild.channels.cache.get(channelId)?.name || 'desconhecido';
            
            if (userRecordings.length === 0) {
                return interaction.editReply('Gravação finalizada, mas nenhum áudio foi capturado.');
            }

            // Formatação da duração
            const duration = Math.round((Date.now() - startTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // Listar os arquivos gravados
            const fileInfo = userRecordings.map(rec => {
                const username = interaction.guild.members.cache.get(rec.userId)?.user.username || 'Usuário desconhecido';
                return `- ${username}: ${path.basename(rec.filePath)}`;
            }).join('\n');

            // Desconectar do canal de voz, se estiver conectado
            const connection = getVoiceConnection(guildId);
            if (connection) {
                connection.destroy();
            }

            interaction.editReply(`✅ Gravação finalizada!\n` +
                `**Canal:** ${channelName}\n` +
                `**Duração:** ${durationFormatted}\n` +
                `**Arquivos gravados (${userRecordings.length}):**\n${fileInfo}`);
        } catch (error) {
            console.error(`[Stop] Erro ao parar gravação:`, error);
            interaction.editReply(`Ocorreu um erro ao tentar parar a gravação: ${error.message}`);
        }
    },
};
