const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra a lista de comandos disponíveis')
    .setDMPermission(true),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const commandsDir = path.join(__dirname, '..');
      const categories = fs.readdirSync(commandsDir);
      
      // Objeto para armazenar comandos por categoria
      const commandsByCategory = {};
      
      // Carregar todos os comandos por categoria
      for (const category of categories) {
        // Ignorar arquivos (buscamos apenas diretórios de categorias)
        const categoryPath = path.join(commandsDir, category);
        if (!fs.statSync(categoryPath).isDirectory() || category === 'backup') continue;
        
        // Inicializar array para esta categoria
        commandsByCategory[category] = [];
        
        // Ler arquivos de comando nesta categoria
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
          const commandPath = path.join(categoryPath, file);
          const command = require(commandPath);
          
          if ('data' in command && 'execute' in command) {
            // Extrair nome e descrição
            const name = command.data.name || (command.data.toJSON ? command.data.toJSON().name : null);
            const description = command.data.description || (command.data.toJSON ? command.data.toJSON().description : '');
            
            if (name) {
              commandsByCategory[category].push({
                name,
                description
              });
            }
          }
        }
      }
      
      // Criar embed
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Comandos Disponíveis')
        .setDescription('Aqui estão todos os comandos disponíveis neste bot:')
        .setTimestamp()
        .setFooter({ 
          text: `Solicitado por ${interaction.user.username}`, 
          iconURL: interaction.user.displayAvatarURL() 
        });
      
      // Adicionar categorias e comandos ao embed
      for (const [category, commands] of Object.entries(commandsByCategory)) {
        if (commands.length === 0) continue;
        
        // Formatar nome da categoria para exibição
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        
        // Formatar lista de comandos
        const commandList = commands.map(cmd => {
          return `\`/${cmd.name}\` - ${cmd.description}`;
        }).join('\n');
        
        embed.addFields({ name: `${categoryName} (${commands.length})`, value: commandList });
      }
      
      // Responder com o embed
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(`Erro ao executar comando help:`, error);
      await interaction.editReply({ 
        content: 'Ocorreu um erro ao tentar mostrar a lista de comandos.', 
        ephemeral: true 
      });
    }
  },
}; 