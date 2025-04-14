const { getVoiceConnection } = require('@discordjs/voice');
const recordingManager = require('../audio/recordingManager');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState) {
    const { member, guild } = newState;
    
    // Ignorar eventos do próprio bot
    if (member.user.bot && member.id === newState.client.user.id) return;
    
    // Obter conexão atual do bot neste servidor, se existir
    const guildId = guild.id;
    const connection = getVoiceConnection(guildId);
    
    // Se não houver conexão ou não estiver gravando, não precisamos fazer nada
    if (!connection || !recordingManager.isRecording(guildId)) return;
    
    const recording = recordingManager.getActiveRecording(guildId);
    if (!recording) return;
    
    const channelId = connection.joinConfig.channelId;
    
    // Caso 1: Usuário entrou no canal onde estamos gravando
    if (oldState.channelId !== channelId && newState.channelId === channelId) {
      console.log(`[VoiceState] Usuário ${member.user.tag} (${member.id}) entrou no canal de gravação ${channelId}`);
      
      // Aguardar um pouco antes de iniciar a gravação para que a conexão estabilize
      setTimeout(() => {
        // Verificar se o usuário ainda está no canal e se ainda estamos gravando
        if (newState.channelId === channelId && recordingManager.isRecording(guildId)) {
          console.log(`[VoiceState] Iniciando gravação para novo usuário: ${member.user.tag} (${member.id})`);
          recordingManager.startRecordingUser(guildId, channelId, member.id, connection.receiver);
        }
      }, 2000); // 2 segundos de delay
    }
    
    // Caso 2: Usuário saiu do canal onde estávamos gravando
    else if (oldState.channelId === channelId && newState.channelId !== channelId) {
      console.log(`[VoiceState] Usuário ${member.user.tag} (${member.id}) saiu do canal de gravação ${channelId}`);
      recordingManager.stopRecordingUser(guildId, member.id);
    }
    
    // Caso 3: Não há mais ninguém no canal além do bot, parar a gravação
    if (oldState.channelId === channelId && oldState.channel && oldState.channel.members.size <= 1) {
      // Verificar se só resta o bot no canal
      const onlyBotLeft = oldState.channel.members.every(m => m.user.bot);
      
      if (onlyBotLeft) {
        console.log(`[VoiceState] Todos os usuários saíram do canal ${channelId}, parando gravação automaticamente`);
        recordingManager.stopRecordingGuild(guildId);
        connection.destroy();
        console.log(`[VoiceState] Bot desconectado do canal vazio ${channelId}`);
      }
    }
  },
}; 