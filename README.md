---
title: Discord Bot Manager
emoji: 📚
colorFrom: green
colorTo: red
sdk: docker
pinned: false
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

## Discord Bot Manager

O Discord Bot Manager é uma aplicação Node.js projetada para gerenciar múltiplas instâncias de bots do Discord. Esta aplicação fornece uma API REST simples para iniciar, parar e monitorar o status de vários bots Discord.

### Funcionalidades

- Gerenciamento de múltiplos bots Discord simultaneamente
- API REST para controle e monitoramento
- Inicialização automática de bots baseado em configuração externa
- Tratamento de eventos do Discord (mensagens, interações, etc.)

### Endpoints da API

- `GET /api` - Verifica o status da aplicação
- `GET /api/status` - Obtém o status de todos os bots gerenciados
- `POST /api/start` - Inicia um bot com o token fornecido
- `POST /api/stop` - Para um bot com o token fornecido

### Requisitos

- Node.js 18+
- Token de bot Discord

### Variáveis de Ambiente

- `PORT` - Porta onde o servidor será executado (padrão: 7860)
- `APP_URL` - URL da aplicação para buscar a lista de bots ativos
- `TOKEN` - Token de bot padrão (opcional)
- `CLIENT_ID` - ID do cliente Discord (opcional)
- `GUILD_ID` - ID do servidor Discord (opcional)

### Estrutura do Projeto

```
discord-bot-manager/
├── commands/          # Comandos Discord
├── events/            # Manipuladores de eventos Discord
├── bot.js             # Classe para gerenciamento individual de bots
├── botManager.js      # Gerenciador de múltiplos bots
├── index.js           # Ponto de entrada da aplicação
└── deploy-commands.js # Script para registrar comandos Discord
```
