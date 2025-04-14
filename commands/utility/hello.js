const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Responde com uma saudação!'),
  async execute(interaction) {
    await interaction.reply('Olá! Como posso ajudar?');
  },
};