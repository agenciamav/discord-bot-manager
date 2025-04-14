# Implementação de Suporte a Múltiplos Servidores

## Problema Identificado

O bot está sendo configurado para funcionar principalmente em um servidor específico definido no painel Laravel, enquanto deveria funcionar em todos os servidores em que é adicionado.

## Modificações Necessárias

### 1. Alterações no Bot Manager (Discord)

#### `botManager.js`:
- Modificar a classe `BotManager` para armazenar informações sobre todos os servidores onde o bot está presente
- Implementar método para sincronizar automaticamente os servidores com a API Laravel
- Adicionar suporte para registrar comandos em todos os servidores dinamicamente

#### `bot.js`:
- Remover dependência do `guildId` específico configurado
- Registrar todos os servidores do bot durante a inicialização
- Criar mecanismo de detecção e registro automático quando o bot entra em novos servidores

#### `deploy-commands.js`:
- Modificar para sempre implantar comandos em todos os servidores, não apenas no configurado
- Adicionar capacidade de implantar comandos específicos por servidor quando necessário
- Criar uma opção de "comandos globais" para comandos que devem estar em todos os servidores

### 2. Alterações no Backend Laravel

#### Tabelas do Banco de Dados:
- Modificar a tabela `discord_bots` para armazenar configuração global, não por servidor
- Criar nova tabela `discord_bot_guilds` para rastrear todos os servidores onde o bot está instalado:
  ```sql
  CREATE TABLE discord_bot_guilds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bot_id BIGINT UNSIGNED NOT NULL,
    guild_id VARCHAR(255) NOT NULL,
    guild_name VARCHAR(255) NOT NULL,
    members_count INT UNSIGNED,
    owner_id VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    features JSON,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (bot_id) REFERENCES discord_bots(id) ON DELETE CASCADE,
    UNIQUE KEY (bot_id, guild_id)
  );
  ```

#### API do Laravel:
- Criar endpoint `POST /api/discord/guilds` para registrar novos servidores
- Modificar endpoint `/api/discord/bots` para retornar informações de todos os servidores
- Adicionar endpoint `GET /api/discord/bots/{id}/guilds` para listar todos os servidores de um bot
- Criar endpoint `POST /api/discord/guilds/{id}/commands` para gerenciar comandos específicos de um servidor

#### Painel Admin:
- Adicionar seção de "Servidores" na página de detalhes do bot
- Permitir configuração específica por servidor (prefixo, comandos habilitados, etc.)
- Mostrar estatísticas de uso por servidor

### 3. Integração e Sincronização

#### Evento de Inicialização do Bot:
```javascript
client.once('ready', async () => {
  console.log(`Bot online como ${client.user.tag}`);
  
  // Registrar todos os servidores atuais
  const guilds = client.guilds.cache;
  console.log(`Bot está presente em ${guilds.size} servidores`);
  
  // Sincronizar servidores com a API
  for (const [guildId, guild] of guilds) {
    try {
      await axios.post(`${process.env.APP_URL}/api/discord/guilds`, {
        bot_id: client.user.id,
        guild_id: guildId,
        guild_name: guild.name,
        members_count: guild.memberCount,
        owner_id: guild.ownerId
      }, {
        headers: {
          'X-Bot-Manager-Secret': process.env.BOT_MANAGER_SECRET
        }
      });
      
      // Registrar comandos para este servidor
      await registerCommandsForGuild(client, guild);
      
    } catch (error) {
      console.error(`Erro ao sincronizar servidor ${guild.name}:`, error.message);
    }
  }
});
```

#### Evento de Entrada em Novo Servidor:
```javascript
client.on('guildCreate', async (guild) => {
  try {
    console.log(`Bot adicionado ao servidor: ${guild.name}`);
    
    // Notificar a API sobre o novo servidor
    await axios.post(`${process.env.APP_URL}/api/discord/guilds`, {
      bot_id: client.user.id,
      guild_id: guild.id,
      guild_name: guild.name,
      members_count: guild.memberCount,
      owner_id: guild.ownerId
    }, {
      headers: {
        'X-Bot-Manager-Secret': process.env.BOT_MANAGER_SECRET
      }
    });
    
    // Registrar comandos neste novo servidor
    await registerCommandsForGuild(client, guild);
    
  } catch (error) {
    console.error(`Erro ao processar entrada em novo servidor:`, error.message);
  }
});
```

## Estratégia de Implementação

1. Implementar mudanças no Laravel primeiro:
   - Criar novas tabelas
   - Modificar endpoints da API
   - Atualizar a interface do painel admin

2. Implementar mudanças no Discord Bot Manager:
   - Atualizar `botManager.js` e `bot.js`
   - Modificar `deploy-commands.js`
   - Implementar sincronização de servidores
   
3. Testar em ambiente controlado:
   - Teste com um bot em vários servidores
   - Verificar sincronização e registro de comandos
   
4. Migração de dados:
   - Scripts para migrar bots existentes para o novo sistema
   - Sincronização inicial de todos os servidores

## Considerações Adicionais

- **Cache**: Implementar caching para informações de servidores para reduzir chamadas à API
- **Limitações de Rate**: Respeitar limites de rate do Discord ao registrar comandos em muitos servidores
- **Permissões**: Cada servidor pode ter necessidades diferentes de permissões
- **Logs**: Implementar logs detalhados para rastrear atividades em diferentes servidores
- **Dashboard**: Implementar um dashboard para mostrar atividade em todos os servidores

## Impacto nas Versões Atuais

Esta mudança é compatível com a versão atual e pode ser implementada gradualmente. Os bots existentes continuarão funcionando enquanto as novas funcionalidades são adicionadas. 