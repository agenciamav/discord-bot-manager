const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const recordingManager = require('../../audio/recordingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Para a gravação de áudio atual neste servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        const { guild } = interaction;
        const guildId = guild.id;

        if (!recordingManager.isRecording(guildId)) {
            return interaction.reply({ content: 'Não há nenhuma gravação ativa neste servidor.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const stopped = recordingManager.stopRecordingGuild(guildId);

            if (stopped) {
                // Opcional: Desconectar após parar a gravação
                const connection = getVoiceConnection(guildId);
                if (connection) {
                    connection.destroy();
                     console.log(`[StopCmd] Conexão de voz destruída para ${guildId} após parar gravação.`);
                }
                await interaction.editReply('⏹️ Gravação finalizada. Os arquivos de áudio foram salvos.');
            } else {
                await interaction.editReply({ content: 'Não foi possível parar a gravação (não estava ativa?).', ephemeral: true });
            }
        } catch (error) {
            console.error('[StopCmd] Erro ao parar gravação:', error);
            await interaction.editReply({ content: `Ocorreu um erro ao tentar parar a gravação: ${error.message}`, ephemeral: true });
        }
    },
};
