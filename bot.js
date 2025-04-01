require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const { TOKEN, CLIENT_ID, GUILD_ID, APP_URL } = process.env;

class Bot {    
  constructor(token) {
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

    this.token = token ?? TOKEN;

    // Load commands
    const commandsPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = path.join(commandsPath, folder);
      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        const commandPath = path.join(folderPath, file);
        const command = require(commandPath);
        if ('data' in command && 'execute' in command) {
          this.client.commands.set(command.data.name, command);
        } else {
          console.log(`[WARNING] The command at ${commandPath} is missing a required "data" or "execute" property.`);
        }
      }
    }

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

module.exports = Bot;