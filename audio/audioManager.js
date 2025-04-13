const { createWriteStream } = require('fs');
const { join } = require('path');
const { createAudioResource, createAudioPlayer, joinVoiceChannel, VoiceConnectionStatus, AudioReceiveStream } = require('@discordjs/voice');
const prism = require('prism-media');
const { pipeline } = require('stream');

class AudioManager {
  constructor() {
    this.connections = new Map();
    this.audioReceivers = new Map();
    this.audioPlayers = new Map();
  }

  /**
   * Conecta o bot a um canal de voz
   * @param {VoiceChannel} channel - Canal de voz do Discord
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Objeto com a conexão e player
   */
  async connectToChannel(channel, options = {}) {
    // Verificar se já existe uma conexão para este canal
    if (this.connections.has(channel.id)) {
      return {
        connection: this.connections.get(channel.id),
        player: this.audioPlayers.get(channel.id)
      };
    }

    // Criando nova conexão
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    // Criando player de áudio
    const player = createAudioPlayer();
    connection.subscribe(player);

    // Armazenando conexão e player
    this.connections.set(channel.id, connection);
    this.audioPlayers.set(channel.id, player);

    // Configurando eventos de conexão
    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`📢 Conexão de voz pronta no canal: ${channel.name}`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log(`🔌 Desconectado do canal: ${channel.name}`);
      this.disconnect(channel.id);
    });

    connection.on('error', (error) => {
      console.error(`❌ Erro na conexão de voz: ${error.message}`);
    });

    // Configurar para receber áudio se especificado
    if (options.receiveAudio) {
      this.startListening(channel);
    }

    return { connection, player };
  }

  /**
   * Inicia a captura de áudio do canal
   * @param {VoiceChannel} channel - Canal de voz do Discord
   */
  startListening(channel) {
    const connection = this.connections.get(channel.id);
    if (!connection) {
      throw new Error('Não há conexão ativa para este canal');
    }

    // Configurar a conexão para receber áudio
    connection.receiver.speaking.on('start', (userId) => {
      console.log(`🎙️ Usuário ${userId} começou a falar`);

      // Criar stream de áudio para este usuário
      const audioStream = connection.receiver.subscribe(userId, {
        end: {
          behavior: 'manual'
        }
      });

      // Configurar pipeline de processamento de áudio
      const user = channel.guild.members.cache.get(userId);
      const outputFilename = join(__dirname, 'recordings', `${user?.user.username || userId}-${Date.now()}.pcm`);
      console.log(`📝 Gravando áudio para: ${outputFilename}`);

      // Criar diretório de gravações se não existir
      const { promises: fs } = require('fs');
      fs.mkdir(join(__dirname, 'recordings'), { recursive: true });

      // Criar output stream
      const outputStream = createWriteStream(outputFilename);

      // Opcional: Usar transformação Opus para melhor qualidade
      const opusDecoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      // Conectar streams
      pipeline(
        audioStream,
        opusDecoder,
        outputStream,
        (err) => {
          if (err) {
            console.error(`❌ Erro no processamento do áudio: ${err.message}`);
          } else {
            console.log(`✅ Processamento de áudio finalizado para ${user?.user.username || userId}`);
          }
        }
      );

      // Armazenar referência ao stream para poder parar depois
      this.audioReceivers.set(userId, { 
        stream: audioStream,
        outputStream,
        filename: outputFilename
      });
    });

    connection.receiver.speaking.on('end', (userId) => {
      console.log(`🎙️ Usuário ${userId} parou de falar`);
      
      // Finalizar stream de áudio
      const receiver = this.audioReceivers.get(userId);
      if (receiver) {
        receiver.stream.destroy();
        receiver.outputStream.end();
        this.audioReceivers.delete(userId);

        // Aqui você poderia chamar o serviço de STT com o arquivo gravado
        this.processAudioFile(receiver.filename, userId);
      }
    });

    console.log(`🎧 Começou a escutar áudio no canal: ${channel.name}`);
  }

  /**
   * Processa o arquivo de áudio (aqui você conectaria com seu serviço STT)
   * @param {string} filename - Caminho do arquivo de áudio
   * @param {string} userId - ID do usuário que falou
   */
  async processAudioFile(filename, userId) {
    console.log(`🔄 Processando arquivo de áudio ${filename} para STT...`);
    
    // Aqui você implementaria a integração com seu serviço STT
    // Por exemplo:
    // const text = await someSTTService.transcribe(filename);
    // console.log(`Transcrição para ${userId}: ${text}`);
    
    // Por enquanto apenas registra que o arquivo está disponível
    console.log(`📊 Arquivo pronto para processamento STT: ${filename}`);
  }

  /**
   * Desconecta o bot de um canal de voz
   * @param {string} channelId - ID do canal de voz
   */
  disconnect(channelId) {
    const connection = this.connections.get(channelId);
    if (connection) {
      connection.destroy();
      this.connections.delete(channelId);
      this.audioPlayers.delete(channelId);
      
      // Finalizar todos os streams de áudio associados
      for (const [userId, receiver] of this.audioReceivers.entries()) {
        if (receiver.stream) {
          receiver.stream.destroy();
          receiver.outputStream.end();
          this.audioReceivers.delete(userId);
        }
      }
      
      console.log(`👋 Desconectado do canal de voz: ${channelId}`);
      return true;
    }
    return false;
  }

  /**
   * Desconecta o bot de todos os canais de voz
   */
  disconnectAll() {
    for (const channelId of this.connections.keys()) {
      this.disconnect(channelId);
    }
  }
}

module.exports = new AudioManager(); 