const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Retorna informações sobre o status do bot.'),
  async execute(interaction) {
    const client = interaction.client;
        
    // Calcular uptime
    const uptimeMs = client.uptime;
    const seconds = Math.floor(uptimeMs / 1000) % 60;
    const minutes = Math.floor(uptimeMs / (1000 * 60)) % 60;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        
    const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
    // Criar embed com informações do bot
    const statusEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('Status do Bot')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: 'Nome', value: client.user.username, inline: true },
        { name: 'ID', value: client.user.id, inline: true },
        { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Uptime', value: uptime },
        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Canais', value: `${client.channels.cache.size}`, inline: true },
        { name: 'Usuários', value: `${client.users.cache.size}`, inline: true },
      )
      .setFooter({ text: 'Discord Bot Manager', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();
        
    await interaction.reply({ embeds: [statusEmbed] });
  },
}; 