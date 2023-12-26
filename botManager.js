
const Bot = require('./bot');

class BotManager {
    constructor() {
        this.bots = new Map();
    }

    startBot(token) {
        if (this.bots.has(token)) {
            console.log('Bot already running');
            return 'Bot already running';
        }

        const bot = new Bot(token);
        bot.start();
        this.bots.set(token, bot);
        return 'Bot started';
    }

    stopBot(token) {
        if (!this.bots.has(token)) {
            console.log('Bot not found');
            return 'Bot not found';
        }

        const bot = this.bots.get(token);
        bot.stop();
        this.bots.delete(token);
        return 'Bot stopped';
    }

    getBotsStatus() {
        const status = {};
        for (const [token, bot] of this.bots) {
            status[token] = bot.getStatus();
        }
        return status;
    }
}

module.exports = BotManager;
