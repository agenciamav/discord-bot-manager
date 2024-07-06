const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const { Groq, APIError } = require('groq-sdk');
const { APP_URL, GROQ_API_KEY } = process.env;

const groq = new Groq({
    apiKey: GROQ_API_KEY,
});

// Função para sanitizar mensagens
function sanitizeMessage(content) {
    // Adicione lógica de sanitização conforme necessário
    return content.replace(/@\S+/g, '@user');
}

// Função para calcular o número de tokens aproximado em uma string
function countTokens(str) {
    return str.split(' ').length;
}

// Limite de tokens para o histórico da conversa
const TOKEN_LIMIT = 3000;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        const isDM = message.channel.type === ChannelType.DM;
        const isGuildChannel = message.channel.type === ChannelType.GuildText;
        const bot = message.client.user;
        const botMentioned = message.mentions.has(bot);
        const isNotFromSelf = message.author.id !== bot.id;
        const shouldRespond = isNotFromSelf && (!message.author.bot || botMentioned);

        if (shouldRespond) {
            // Verifica se há outros bots digitando
            const channelTypingUsers = typingUsers.get(message.channel.id) || new Set();
            console.log(channelTypingUsers);
            const otherBotsTyping = Array.from(channelTypingUsers).some(userId => {
                const user = message.guild.members.cache.get(userId);
                return user && user.user.bot && user.id !== bot.id;
            });

            if (otherBotsTyping) {
                return;
            }

            const messages = await message.channel.messages.fetch({ limit: 100, before: message.id });
            const messageHistory = messages.reverse().map(msg => {
                const role = msg.author.bot ? 'assistant' : 'user';
                const name = `${msg.author.globalName || msg.author.username} <@!${msg.author.id}>`;
                return {
                    role,
                    name,
                    content: sanitizeMessage(msg.content),
                };
            });

            // Truncar histórico se exceder o limite de tokens
            let totalTokens = messageHistory.reduce((acc, msg) => acc + countTokens(JSON.stringify(msg)), 0);
            while (totalTokens > TOKEN_LIMIT && messageHistory.length > 1) {
                messageHistory.shift();
                totalTokens = messageHistory.reduce((acc, msg) => acc + countTokens(JSON.stringify(msg)), 0);
            }

            const shouldRespondPrompt = `
                Você é um assistente de conversa que decide se deve responder a uma mensagem do usuário.
                INSTRUÇÕES: Leia a mensagem do usuário e decida se é necessário responder.
                Responda em JSON com o seguinte formato: '{"shouldRespond": true/false, "reason": "Motivo da decisão"}'.
                CONTEXTO: Esta conversa pode incluir múltiplos tópicos e participantes.
                MENSAGEM DO USUÁRIO: ${JSON.stringify({ role: 'user', content: sanitizeMessage(message.content), name: `${message.author.globalName || message.author.username} <@!${message.author.id}>` })}
            `;

            try {
                const response = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: shouldRespondPrompt },
                    ],
                    model: 'llama3-8b-8192',
                    max_tokens: 100,
                    temperature: 0.7,
                    top_p: 1,
                    response_format: { type: "json_object" }
                });

                const shouldRespondResponse = JSON.parse(response.choices[0].message.content);
                if (!shouldRespondResponse.shouldRespond) {
                    console.log(`Decidi não responder à mensagem do usuário: ${shouldRespondResponse.reason}`);
                    return;
                }

                const systemPrompt = `
                    Você é ${bot.username} <@!${bot.id}> e esta é uma conversa profissional via Discord.
                    INSTRUÇÕES: Você deve continuar a compreender a conversa e responder coerentemente. 
                    Responda em JSON com o seguinte formato: '{"role": "assistant", "name": "${bot.username} <@!${bot.id}>", "content": "Sua resposta aqui..."}'.
                    CONTEXTO: Esta conversa pode incluir múltiplos tópicos e participantes. 
                    Responda de maneira clara e profissional, fornecendo informações úteis e relevantes.
                    CONVERSA: ${JSON.stringify(messageHistory)}
                    ÚLTIMA MENSAGEM: ${JSON.stringify({ role: 'user', content: sanitizeMessage(message.content), name: (message.author.globalName || message.author.username) })}
                `;

                const contextLength = countTokens(systemPrompt);
                const maxTokens = 4086 - contextLength > 0 ? 4086 - contextLength : 100;
                const temperature = 0.7;

                // Enviar isTyping
                await message.channel.sendTyping();

                const chatResponse = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: sanitizeMessage(message.content), name: `${message.author.globalName || message.author.username} <@!${message.author.id}>` },
                    ],
                    model: 'llama3-8b-8192',
                    max_tokens: maxTokens,
                    temperature: temperature,
                    top_p: 1,
                    response_format: { type: "json_object" }
                });

                const reply = JSON.parse(chatResponse.choices[0].message.content);
                message.channel.send(reply.content);

            } catch (err) {
                if (err instanceof Groq.APIError) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle(`Erro ${err.status}`)
                        .setDescription(`${err.message}`)
                        .setColor(0xFFA500);

                    const reply = err.message;
                    message.channel.send(reply);
                    message.channel.send({ embeds: [errorEmbed] });
                } else {
                    throw err;
                }
            }
        }
    }
};
