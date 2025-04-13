const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reloads a command.')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('The command to reload.')
        .setRequired(true)),
  async execute(interaction) {
    const commandName = interaction.options.getString('command', true).toLowerCase();
    const command = interaction.client.commands.get(commandName);

    if (!command) {
      return interaction.reply(`There is no command with name \`${commandName}\`!`);
    }

    // Listar todos os comandos carregados para diagnóstico
    console.log('Comandos carregados:');
    [...interaction.client.commands.entries()].forEach(([name, cmd]) => {
      console.log(`- ${name} ${cmd.category ? `(categoria: ${cmd.category})` : '(sem categoria)'}`);
    });

    // Listar propriedades do comando para diagnóstico
    console.log(`Comando a ser recarregado: ${commandName}`);
    console.log('Propriedades:', Object.keys(command));
    console.log('Category:', command.category);
    console.log('Data:', command.data ? command.data.name : 'sem data');

    // Localizar o caminho do arquivo
    let commandPath;
    const rootCommandsDir = path.join(__dirname, '..', '..');
    const commandsDir = path.join(rootCommandsDir, 'commands');

    console.log('Buscando arquivo em:', commandsDir);

    // Verificar se o comando está diretamente na pasta commands
    if (fs.existsSync(path.join(commandsDir, `${commandName}.js`))) {
      commandPath = path.join(commandsDir, `${commandName}.js`);
      console.log(`Arquivo encontrado: ${commandPath}`);
    } 
    // Verificar se o comando está em uma subpasta utility
    else if (fs.existsSync(path.join(commandsDir, 'utility', `${commandName}.js`))) {
      commandPath = path.join(commandsDir, 'utility', `${commandName}.js`);
      console.log(`Arquivo encontrado: ${commandPath}`);
    }
    // Verificar se o comando está em uma subpasta voice
    else if (fs.existsSync(path.join(commandsDir, 'voice', `${commandName}.js`))) {
      commandPath = path.join(commandsDir, 'voice', `${commandName}.js`);
      console.log(`Arquivo encontrado: ${commandPath}`);
    }
    // Se não encontrou, tentar com a categoria do comando
    else if (command.category) {
      commandPath = path.join(commandsDir, command.category, `${command.data.name}.js`);
      console.log(`Tentando com categoria: ${commandPath}`);
      
      if (!fs.existsSync(commandPath)) {
        console.log(`Arquivo não encontrado com categoria: ${commandPath}`);
        return interaction.reply(`Cannot find path for command \`${commandName}\`!`);
      }
    } else {
      console.log(`Não foi possível localizar arquivo para: ${commandName}`);
      return interaction.reply(`Cannot find path for command \`${commandName}\`!`);
    }

    try {
      // Remover o cache e recarregar o comando
      console.log(`Recarregando arquivo: ${commandPath}`);
      delete require.cache[require.resolve(commandPath)];
      interaction.client.commands.delete(command.data.name);
      
      const newCommand = require(commandPath);
      interaction.client.commands.set(newCommand.data.name, newCommand);
      
      await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
    } catch (error) {
      console.error('Erro ao recarregar comando:', error);
      await interaction.reply(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``);
    }
  },
};
