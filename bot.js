require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const { TOKEN, CLIENT_ID, GUILD_ID, APP_URL } = process.env;
const recordingManager = require('./audio/recordingManager');

class Bot {    
  constructor(token, config = {}) {
    this.client = new Client({
      intents: [                
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildWebhooks,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.User,
        Partials.ThreadMember,
      ],	
    });
    this.client.cooldowns = new Collection();
    this.client.commands = new Collection();
    this.client.voiceConnections = new Collection();

    this.token = token ?? TOKEN;
    
    // Salvar configurações adicionais
    this.clientId = config.clientId ?? CLIENT_ID;
    this.guildId = config.guildId ?? GUILD_ID;
    this.applicationId = config.applicationId;
    this.botConfig = config;

    // Load commands
    loadCommands(this.client);

    // Load events
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
    for (const file of eventFiles) {
      const eventPath = path.join(eventsPath, file);
      const event = require(eventPath);
      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args));
      } else {
        this.client.on(event.name, (...args) => event.execute(...args));
      }
    }   

    // Em algum lugar após o client ser criado (ex: no evento 'ready' ou na inicialização)
    this.client.on('voiceStateUpdate', (oldState, newState) => {
        const guildId = newState.guild.id; // ou oldState.guild.id

        // Verificar se há uma gravação ativa neste servidor
        if (!recordingManager.isRecording(guildId)) return;

        const recordingInfo = recordingManager.getActiveRecording(guildId);
        const userId = newState.id; // ID do usuário que mudou o estado
        const member = newState.member; // ou oldState.member

        if (!member || member.user.bot) return; // Ignorar bots

        const oldChannelId = oldState.channelId;
        const newChannelId = newState.channelId;
        const recordingChannelId = recordingInfo.channelId;

        // Usuário entrou no canal gravado?
        if (!oldChannelId && newChannelId === recordingChannelId) {
            console.log(`[VoiceStateUpdate] Usuário ${userId} entrou no canal gravado ${recordingChannelId}`);
            recordingManager.startRecordingUser(guildId, recordingChannelId, userId, recordingInfo.connection.receiver);
        }
        // Usuário saiu do canal gravado?
        else if (oldChannelId === recordingChannelId && !newChannelId) {
            console.log(`[VoiceStateUpdate] Usuário ${userId} saiu do canal gravado ${recordingChannelId}`);
            recordingManager.stopRecordingUser(guildId, userId);
        }
        // Usuário mudou de canal (saindo do canal gravado)?
        else if (oldChannelId === recordingChannelId && newChannelId && newChannelId !== recordingChannelId) {
             console.log(`[VoiceStateUpdate] Usuário ${userId} mudou do canal gravado ${recordingChannelId} para ${newChannelId}`);
             recordingManager.stopRecordingUser(guildId, userId);
        }
         // Usuário mudou para o canal gravado?
         else if (oldChannelId && oldChannelId !== recordingChannelId && newChannelId === recordingChannelId) {
              console.log(`[VoiceStateUpdate] Usuário ${userId} mudou de ${oldChannelId} para o canal gravado ${recordingChannelId}`);
              recordingManager.startRecordingUser(guildId, recordingChannelId, userId, recordingInfo.connection.receiver);
         }
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Tentando iniciar bot com token de ${this.token.length} caracteres`);
                
        // Verificações básicas do token
        if (!this.token || typeof this.token !== 'string') {
          console.error('Token inválido: não é uma string');
          reject(new Error('Invalid token: not a string'));
          return;
        }
                
        if (this.token.trim() === '') {
          console.error('Token inválido: string vazia');
          reject(new Error('Invalid token: empty string'));
          return;
        }
                
        // Verificar formato do token
        const tokenParts = this.token.split('.');
        if (tokenParts.length < 2) {
          console.error('Token inválido: formato incorreto (deve ter pelo menos 2 partes separadas por ponto)');
          reject(new Error('Invalid token format: expected at least 2 parts separated by dots'));
          return;
        }

        this.client.login(this.token)
          .then(() => {
            console.log(`Bot iniciado com sucesso: ${this.client.user.tag}`);
            resolve();
          })
          .catch(error => {
            console.error(`Erro ao fazer login do bot: ${error.message}`);
            if (error.code === 'TokenInvalid') {
              console.error('Token inválido fornecido ao Discord API.');
              reject(new Error('Invalid token: Discord API rejected token'));
            } else if (error.code === 'DisallowedIntents') {
              console.error('Intents não permitidas para este bot.');
              reject(new Error('Disallowed intents: Bot requires privileged intents that are not enabled'));
            } else {
              reject(error);
            }
          });
      } catch (error) {
        console.error(`Erro ao iniciar bot: ${error.message}`);
        reject(error);
      }
    });
  }

  stop() {
    this.client.destroy();
  }

  getStatus() {
    return this.client.isReady() ? 'online' : 'offline';
  }
}

function loadCommands(client) {
  const commandsPath = path.join(__dirname, 'commands');
  
  // Verificar se o diretório existe
  if (!fs.existsSync(commandsPath)) {
    console.log(`[ERROR] Diretório de comandos não encontrado: ${commandsPath}`);
    return;
  }

  // Obter todos os arquivos do diretório de comandos
  const files = fs.readdirSync(commandsPath);

  for (const file of files) {
    const filePath = path.join(commandsPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && file.endsWith('.js')) {
      // Se for um arquivo JavaScript, carregá-lo como comando
      try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          console.log(`🔧 Comando carregado: ${command.data.name}`);
        } else {
          console.log(`[WARNING] O comando em ${filePath} está sem as propriedades "data" ou "execute".`);
        }
      } catch (error) {
        console.error(`[ERROR] Erro ao carregar o comando ${filePath}:`, error);
      }
    } else if (stats.isDirectory()) {
      // Se for um diretório, carregar os comandos dentro dele
      const subCommandFiles = fs.readdirSync(filePath).filter(file => file.endsWith('.js'));
      for (const subFile of subCommandFiles) {
        const subFilePath = path.join(filePath, subFile);
        try {
          const command = require(subFilePath);
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`🔧 Comando carregado: ${command.data.name} (${file}/${subFile})`);
          } else {
            console.log(`[WARNING] O comando em ${subFilePath} está sem as propriedades "data" ou "execute".`);
          }
        } catch (error) {
          console.error(`[ERROR] Erro ao carregar o comando ${subFilePath}:`, error);
        }
      }
    }
  }
}

module.exports = Bot;