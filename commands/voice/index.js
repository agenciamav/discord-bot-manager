const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

// Mapeamento de tipos numéricos para tipos de opções do Discord
const OPTION_TYPES = {
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
  MENTIONABLE: 9,
  NUMBER: 10,
  ATTACHMENT: 11
};

// Comando principal
const voiceCommand = new SlashCommandBuilder()
  .setName('voice')
  .setDescription('Comandos relacionados a canais de voz');

// Objeto para armazenar os executores de subcomandos
const subcommandHandlers = {};

// Carregar subcomandos
const commandsDir = __dirname;
const commandFiles = fs.readdirSync(commandsDir)
  .filter(file => file.endsWith('.js') && file !== 'index.js');

console.log(`Carregando subcomandos de voz de ${commandsDir}:`, commandFiles);

for (const file of commandFiles) {
  const filePath = path.join(commandsDir, file);
  try {
    const subcommand = require(filePath);
    
    if (subcommand.data && subcommand.execute) {
      const name = subcommand.data.name;
      
      // Adicionar este subcomando ao comando principal
      if (subcommand.data.options) {
        const options = subcommand.data.options;
        
        // Construir o subcomando
        voiceCommand.addSubcommand(sub => {
          sub.setName(name).setDescription(subcommand.data.description);
          
          // Adicionar opções ao subcomando
          for (const option of options) {
            // Processar com base no tipo numérico
            if (option.type === OPTION_TYPES.STRING || option.type === 3) {
              sub.addStringOption(opt => {
                opt.setName(option.name)
                   .setDescription(option.description);
                
                if (option.required) {
                  opt.setRequired(true);
                }
                
                if (option.choices) {
                  opt.addChoices(...option.choices);
                }
                
                return opt;
              });
            } else if (option.type === OPTION_TYPES.INTEGER || option.type === 4) {
              sub.addIntegerOption(opt => {
                opt.setName(option.name)
                   .setDescription(option.description);
                
                if (option.required) {
                  opt.setRequired(true);
                }
                
                if (option.choices) {
                  opt.addChoices(...option.choices);
                }
                
                return opt;
              });
            } else if (option.type === OPTION_TYPES.BOOLEAN || option.type === 5) {
              sub.addBooleanOption(opt => {
                opt.setName(option.name)
                   .setDescription(option.description);
                
                if (option.required) {
                  opt.setRequired(true);
                }
                
                return opt;
              });
            }
          }
          
          return sub;
        });
      } else {
        // Subcomando simples sem opções
        voiceCommand.addSubcommand(sub => 
          sub.setName(name).setDescription(subcommand.data.description)
        );
      }
      
      // Configurar permissões específicas se o subcomando tiver
      if (subcommand.data.default_member_permissions) {
        voiceCommand.setDefaultMemberPermissions(subcommand.data.default_member_permissions);
      }
      
      if (subcommand.data.dm_permission !== undefined) {
        voiceCommand.setDMPermission(subcommand.data.dm_permission);
      }
      
      // Armazenar o executor do subcomando
      subcommandHandlers[name] = subcommand.execute;
      console.log(`✅ Subcomando 'voice ${name}' registrado com sucesso`);
    } else {
      console.log(`⚠️ Subcomando em ${filePath} não possui propriedades 'data' ou 'execute'`);
    }
  } catch (error) {
    console.error(`❌ Erro ao carregar subcomando ${filePath}:`, error);
  }
}

module.exports = {
  category: 'voice',
  data: voiceCommand,
  
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Este comando só pode ser usado em servidores.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    
    if (subcommandHandlers[subcommand]) {
      try {
        await subcommandHandlers[subcommand](interaction);
      } catch (error) {
        console.error(`Erro ao executar subcomando '${subcommand}':`, error);
        await interaction.reply({
          content: `❌ Ocorreu um erro ao executar o comando: ${error.message}`,
          ephemeral: true
        });
      }
    } else {
      await interaction.reply({
        content: `❌ Subcomando '${subcommand}' não encontrado.`,
        ephemeral: true
      });
    }
  },
}; 