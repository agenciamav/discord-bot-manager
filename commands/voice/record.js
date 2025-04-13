const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const recordingManager = require('../../audio/recordingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('record')
        .setDescription('Inicia a gravação do áudio neste canal de voz.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Permissão para quem pode gravar
        .setDMPermission(false), // Comando não funciona em DMs
    async execute(interaction) {
        const { member, guild, channel } = interaction; // `channel` aqui é o canal de texto

        // Verificar se o usuário está em um canal de voz
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: 'Você precisa estar em um canal de voz para usar este comando.', ephemeral: true });
        }

        // Verificar se o canal de voz é válido
        if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
             return interaction.reply({ content: 'Só é possível gravar em canais de voz ou palco.', ephemeral: true });
        }

        // Verificar permissões do bot no canal de voz
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions || !permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
            return interaction.reply({ content: 'Preciso de permissões para conectar e falar no seu canal de voz!', ephemeral: true });
        }

        const guildId = guild.id;

        // Verificar se já está gravando neste servidor
        if (recordingManager.isRecording(guildId)) {
             const existingRecording = recordingManager.getActiveRecording(guildId);
             if (existingRecording && existingRecording.channelId === voiceChannel.id) {
                 return interaction.reply({ content: 'Já estou gravando neste canal de voz.', ephemeral: true });
             } else if (existingRecording) {
                  return interaction.reply({ content: `Já estou gravando em outro canal (${guild.channels.cache.get(existingRecording.channelId)?.name || 'desconhecido'}) neste servidor. Use /stop primeiro.`, ephemeral: true });
             }
        }

        await interaction.deferReply();

        try {
            let connection = getVoiceConnection(guildId);

            // Se não houver conexão, criar uma
            if (!connection) {
                 console.log(`[RecordCmd] Criando nova conexão de voz para ${guildId} em ${voiceChannel.id}`);
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: false, // Precisa ouvir para gravar
                    selfMute: true, // Não precisa falar para gravar
                });

                 // Esperar a conexão ficar pronta (ou falhar)
                 await new Promise((resolve, reject) => {
                    connection.once(VoiceConnectionStatus.Ready, resolve);
                    connection.once(VoiceConnectionStatus.Disconnected, () => reject(new Error('Disconnected')));
                    connection.once(VoiceConnectionStatus.Destroyed, () => reject(new Error('Destroyed')));
                    setTimeout(() => reject(new Error('Connection timeout')), 15000); // Timeout de 15s
                 });
                 console.log(`[RecordCmd] Conexão estabelecida para ${guildId}`);

            } else if (connection.joinConfig.channelId !== voiceChannel.id) {
                 // Se conectado a outro canal, avisar (ou mover, mas avisar é mais seguro)
                 return interaction.editReply({ content: `Já estou conectado a outro canal de voz (${guild.channels.cache.get(connection.joinConfig.channelId)?.name || 'desconhecido'}). Use /leave e tente novamente neste canal.` });
            }


            // Registrar a gravação
            if (!recordingManager.startRecordingGuild(guildId, connection)) {
                 // Caso raro onde a verificação inicial falhou mas agora detecta gravação
                 return interaction.editReply({ content: 'Erro ao iniciar a gravação (já iniciada?).', ephemeral: true });
            }

             const receiver = connection.receiver;

             // Iniciar gravação para usuários já presentes
             console.log(`[RecordCmd] Iniciando gravação para usuários existentes no canal ${voiceChannel.id}`);
             voiceChannel.members.forEach(member => {
                 if (!member.user.bot) { // Não gravar outros bots (ou a si mesmo)
                     console.log(`[RecordCmd] Tentando gravar usuário existente: ${member.user.tag} (${member.id})`);
                     recordingManager.startRecordingUser(guildId, voiceChannel.id, member.id, receiver);
                 }
             });

            // Adicionar listener para usuários que começarem a falar (ou entrarem)
            // Nota: A forma mais robusta é usar voiceStateUpdate, mas vamos começar com speaking
             receiver.speaking.on('start', (userId) => {
                 console.log(`[RecordCmd] Usuário ${userId} começou a falar em ${guildId}. Verificando se precisa iniciar gravação.`);
                 // Verificar se o usuário não é bot e está no canal correto
                 const member = guild.members.cache.get(userId);
                 if (member && !member.user.bot && member.voice.channelId === voiceChannel.id) {
                     recordingManager.startRecordingUser(guildId, voiceChannel.id, userId, receiver);
                 } else if (member && !member.user.bot) {
                     console.log(`[RecordCmd] Usuário ${userId} começou a falar, mas não está no canal gravado (${voiceChannel.id}), está em ${member.voice.channelId}.`);
                 } else if (!member) {
                      console.log(`[RecordCmd] Usuário ${userId} começou a falar, mas não encontrado no cache do servidor.`);
                 }
             });
             // Listener para quando o stream de um usuário terminar (pode ser usado para limpar)
             // receiver.speaking.on('end', (userId) => { ... }); // Menos útil que o pipeline ending

            await interaction.editReply(`🔴 Gravação iniciada no canal de voz **${voiceChannel.name}**! Use /stop para parar.`);

        } catch (error) {
            console.error('[RecordCmd] Erro ao iniciar gravação:', error);
             // Limpar o estado se a inicialização falhar
             if (recordingManager.isRecording(guildId)) {
                 recordingManager.stopRecordingGuild(guildId);
             }
             // Destruir conexão se foi criada agora e falhou
             const conn = getVoiceConnection(guildId);
             if (conn && conn.state.status !== VoiceConnectionStatus.Destroyed) {
                 //conn.destroy(); // Descomentar se quiser que ele saia em caso de erro
             }

            await interaction.editReply({ content: `Ocorreu um erro ao tentar iniciar a gravação: ${error.message}`, ephemeral: true });
        }
    },
};
