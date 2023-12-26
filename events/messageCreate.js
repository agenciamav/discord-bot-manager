const { Events } = require('discord.js');
const axios = require('axios');
const https = require('https');
const { APP_URL } = process.env;

module.exports = { 
    name: Events.MessageCreate, 
    execute(message) { 
        console.log(`Message received from ${message.author.globalName ?? message.author.username}: ${message.content}`);
        if (message.author.bot) return;
        if (!message.system) {

            // Send the message to the Laravel server
            axios({
                method: 'post',
                url: `${APP_URL}/api/chat`,
                data: {
                    message
                },
                httpsAgent: new https.Agent({  
                    rejectUnauthorized: false
                }),
                headers: {
                    'Authorization': `Bearer ${process.env.API_TOKEN}`
                }
            })
            .then(function (response) {
                if (!response.data.message) return;
                
                message.channel.send(response.data.message);
            })
            .catch(function (error) {
                message.channel.send('Deu ruim aqui, mas já estamos resolvendo!');
            });

            // message.reply(`Então tá ${message.author.globalName ?? message.author.username}`);
            // message.channel.send(`Se tu diz que é ${message.content} então é ${message.content}`);
        }
    }
}
