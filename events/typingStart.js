const { Events } = require('discord.js');

module.exports = {
    name: Events.TypingStart,
    execute({ channel, user }) {
        let location = channel.isThread() ? `thread ${channel.name} in ${channel.parent.name} channel` : `${channel.name} channel`;
        console.log(`${user.username} is typing in the ${location}...`);
    }
}

