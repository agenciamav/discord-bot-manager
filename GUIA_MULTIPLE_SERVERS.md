# Guia Prático: Implementando Suporte a Múltiplos Servidores

## Próximos Passos

Identificamos que o bot Discord está configurado para funcionar em um servidor específico (definido no painel Laravel), mas agora você precisa que ele funcione em todos os servidores onde está instalado. Siga este guia para implementar essa funcionalidade.

## 1. Configurar Variáveis de Ambiente

Primeiro, certifique-se de que seu arquivo `.env` tem as variáveis necessárias:

```env
# Configurações da API Laravel
APP_URL=http://app.agenciamav.local
BOT_MANAGER_SECRET=seu_secret_aqui

# Configurações do Discord (fallback se a API falhar)
CLIENT_ID=seu_client_id_aqui
DISCORD_BOT_TOKEN=seu_bot_token_aqui
# O GUILD_ID agora é opcional, pois vamos tratar múltiplos servidores
```

## 2. Testar o Script de Verificação

Depois de configurar as variáveis, execute o script que criamos para verificar todos os servidores:

```bash
node verify-all-guilds.js
```

Este script:
- Lista todos os servidores onde o bot está presente
- Notifica a API Laravel sobre cada servidor
- Registra os comandos em cada servidor

## 3. Implementação Completa no Laravel

No backend Laravel:

1. **Crie uma nova tabela para armazenar servidores**:
   - Execute a migração descrita no arquivo `MÚLTIPLOS_SERVIDORES.md`
   - Atualize seus modelos para incluir relacionamentos entre Bot e Guilds

2. **Adicione novos endpoints na API**:
   - `/api/discord/guilds/joined` (já existe)
   - `/api/discord/bots/{id}/guilds` (novo, para listar servidores)
   - `/api/discord/guilds/{id}/commands` (novo, para configurar comandos por servidor)

3. **Atualize o painel de administração**:
   - Adicione uma seção para ver todos os servidores
   - Permita configurações por servidor (opcional)

## 4. Ajustes no Discord Bot Manager

1. **Melhore o script de inicialização do bot**:
   - Edite a função `registerCommandsOnReady` no `index.js`
   - Garanta que ela registre comandos em todos os servidores

2. **Atualize o evento `guildCreate`**:
   - Use a versão melhorada que criamos

3. **Adicione o comando `/help`**:
   - Já criamos este comando para mostrar todos os comandos disponíveis

## 5. Teste a Solução

1. **Adicione o bot a um novo servidor**:
   - Verifique se os comandos são registrados automaticamente
   - Verifique se o novo servidor aparece no painel Laravel

2. **Reinicie o bot**:
   - Verifique se ele mantém todos os servidores configurados
   - Verifique se os comandos funcionam em todos os servidores

## Solução Temporária

Enquanto a implementação completa não estiver pronta, use os scripts:

1. `verify-all-guilds.js` - Para verificar e registrar comandos em todos os servidores
2. `force-reset-commands.js` - Para limpar comandos problemáticos
3. Definir o `GUILD_ID` no arquivo `.env` para o servidor que você está testando

## Tempo Estimado

- Implementação no Laravel: 3-4 horas
- Ajustes no Bot Manager: 1-2 horas
- Testes e correções: 2-3 horas

## Próxima Sessão

Na próxima sessão, podemos:
1. Implementar mudanças no banco de dados Laravel
2. Criar os endpoints da API necessários
3. Ajustar o Bot Manager para usar a nova API 