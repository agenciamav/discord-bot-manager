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
                Partials.ThreadMember
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
        this.client.login(this.token);
    }

    stop() {
        this.client.destroy();
    }

    getStatus() {
        return this.client.isReady() ? 'online' : 'offline';
    }
}

module.exports = Bot;