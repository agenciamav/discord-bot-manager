const { EndBehaviorType, VoiceReceiver } = require('@discordjs/voice');
const { pipeline } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const prism = require('prism-media'); // Necessário para decodificar Opus para PCM

const recordings = new Map(); // guildId -> { connection, userStreams: Map<userId, WritableStream> }

function getFilePath(guildId, channelId, userId) {
    const recordingsDir = path.join(__dirname, 'recordings');
    if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
    }
    const timestamp = Date.now();
    // Formato: guildId_channelId_userId_timestamp.pcm
    return path.join(recordingsDir, `${guildId}_${channelId}_${userId}_${timestamp}.pcm`);
}

function startRecordingUser(guildId, channelId, userId, receiver) {
    const guildRecording = recordings.get(guildId);
    if (!guildRecording || guildRecording.userStreams.has(userId)) {
        // Já gravando ou gravação não encontrada
        return;
    }

    const filePath = getFilePath(guildId, channelId, userId);
    const opusStream = receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.AfterSilence, // Ou AfterInactivity
            duration: 1000, // ms de silêncio/inatividade antes de terminar
        },
    });

    // Decodificar Opus para PCM S16LE
    const pcmStream = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });

    const writer = fs.createWriteStream(filePath);

    console.log(`[RecordingManager] Iniciando gravação para ${userId} em ${guildId} para o arquivo ${filePath}`);

    // Usar pipeline para lidar com streams e erros
    pipeline(opusStream, pcmStream, writer, (err) => {
        if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE' && err.code !== 'ERR_STREAM_DESTROYED') {
            // Ignorar erros esperados de fechamento/destruição, logar outros
             console.error(`[RecordingManager] Erro no pipeline de gravação para ${userId} em ${guildId}:`, err);
        } else {
             console.log(`[RecordingManager] Pipeline de gravação para ${userId} em ${guildId} finalizado.`);
        }
        // Remover o stream do mapa após a finalização (mesmo com erro)
        if (guildRecording.userStreams.has(userId)) {
             guildRecording.userStreams.delete(userId);
             console.log(`[RecordingManager] Stream removido para ${userId} em ${guildId}`);
        }
    });

    // Armazenar o stream de escrita para poder finalizá-lo depois
    guildRecording.userStreams.set(userId, writer);

     // Opcional: Limpar o stream Opus se ele não for destruído automaticamente
     opusStream.on('end', () => {
        console.log(`[RecordingManager] Opus stream ended for ${userId} in ${guildId}`);
        // Tentar remover do mapa aqui também, caso o pipeline não pegue
        if (guildRecording.userStreams.has(userId)) {
            guildRecording.userStreams.delete(userId);
        }
     });
     opusStream.on('close', () => {
         console.log(`[RecordingManager] Opus stream closed for ${userId} in ${guildId}`);
         if (guildRecording.userStreams.has(userId)) {
             guildRecording.userStreams.delete(userId);
         }
     });
     opusStream.on('error', (err) => {
         console.error(`[RecordingManager] Opus stream error for ${userId} in ${guildId}:`, err);
         if (guildRecording.userStreams.has(userId)) {
             guildRecording.userStreams.delete(userId);
         }
     });

}

function stopRecordingUser(guildId, userId) {
    const guildRecording = recordings.get(guildId);
    if (guildRecording && guildRecording.userStreams.has(userId)) {
        const writer = guildRecording.userStreams.get(userId);
         console.log(`[RecordingManager] Finalizando gravação para ${userId} em ${guildId}`);
        writer.end(); // Finaliza o WritableStream
        guildRecording.userStreams.delete(userId); // Remove do mapa
    }
}

function startRecordingGuild(guildId, connection) {
    if (recordings.has(guildId)) {
        console.log(`[RecordingManager] Gravação já ativa para ${guildId}`);
        return false; // Já gravando
    }
    console.log(`[RecordingManager] Iniciando registro de gravação para ${guildId}`);
    recordings.set(guildId, {
        connection: connection,
        userStreams: new Map(), // userId -> WritableStream
        channelId: connection.joinConfig.channelId,
    });
    return true;
}

function stopRecordingGuild(guildId) {
    const guildRecording = recordings.get(guildId);
    if (!guildRecording) {
        console.log(`[RecordingManager] Nenhuma gravação ativa encontrada para ${guildId}`);
        return false; // Não estava gravando
    }

    console.log(`[RecordingManager] Parando gravação para ${guildId}`);
    // Finaliza todos os streams de usuário ativos
    guildRecording.userStreams.forEach((writer, userId) => {
        console.log(`[RecordingManager] Finalizando stream para ${userId} em ${guildId}`);
        writer.end();
    });

    // Remove a entrada da gravação do mapa principal
    recordings.delete(guildId);
    console.log(`[RecordingManager] Gravação finalizada e removida para ${guildId}`);

    // Opcional: desconectar o bot do canal de voz
    // guildRecording.connection.destroy();

    return true;
}

function isRecording(guildId) {
    return recordings.has(guildId);
}

function getActiveRecording(guildId) {
    return recordings.get(guildId);
}


module.exports = {
    startRecordingGuild,
    stopRecordingGuild,
    startRecordingUser,
    stopRecordingUser,
    isRecording,
    getActiveRecording,
};
