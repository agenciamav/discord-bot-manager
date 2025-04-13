---
title: Discord Bot Manager
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# Discord Bot Manager

Um serviço para gerenciar e controlar múltiplos bots Discord, com suporte à integração de voz e IA.

## Visão Geral

O Discord Bot Manager é um serviço projetado para gerenciar múltiplos bots Discord a partir de uma única interface. Esta solução permite:

- Iniciar e parar bots Discord dinamicamente
- Gerenciar comandos em múltiplos servidores
- Interagir com canais de voz para comunicação por áudio
- Integrar com serviços de IA para processamento de linguagem natural

## Funcionalidades

- **Gerenciamento de Bots**: Inicie, pare e monitore múltiplos bots Discord
- **Comandos Dinâmicos**: Adicione e atualize comandos sem reiniciar os bots
- **Integração de Voz**: Permita que os bots entrem em canais de voz, reproduzam áudio e processem voz
- **Processamento de IA**: Integração com serviços como OpenAI, AssemblyAI e ElevenLabs para criar bots inteligentes
- **API REST**: Interface para gerenciar bots programaticamente

## Pré-requisitos

- Node.js v16.x ou superior
- NPM ou Yarn
- Acesso à API do Discord (token de bot)
- [Opcional] Contas em serviços de IA para funcionalidades avançadas

## Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd discord-bot-manager
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Instale as dependências para funcionalidades de voz (opcional):
```bash
npm install @discordjs/voice prism-media ffmpeg-static libsodium-wrappers @discordjs/opus assemblyai elevenlabs-node openai --save
```

## Comandos

### Comandos Básicos

- `/ping`: Verifica se o bot está funcionando
- `/status`: Mostra o status atual do bot e sua latência
- `/server`: Exibe informações sobre o servidor Discord
- `/user`: Exibe informações sobre o usuário

### Comandos de Voz

- `/join`: Faz o bot entrar no canal de voz atual do usuário
- `/leave`: Faz o bot sair do canal de voz
- `/play`: Reproduz um arquivo de áudio pré-definido
- `/listen`: Escuta o usuário por um tempo determinado e responde usando IA

## Configuração da Integração de Voz

Para configurar a integração de voz e IA, siga as instruções detalhadas em [README-VOICE.md](./README-VOICE.md).

## Endpoints da API

- `GET /api/status`: Retorna o status de todos os bots ativos
- `GET /api/discord/bots`: Lista todos os bots ativos de todos os workspaces
- `POST /api/start`: Inicia um bot com o token fornecido
- `POST /api/stop`: Para um bot com o token fornecido
- `POST /api/validate-token`: Valida um token Discord

## Desenvolvimento

### Estrutura do Projeto

```
discord-bot-manager/
├── commands/           # Comandos do Discord
│   ├── utility/        # Comandos utilitários
│   └── voice/          # Comandos de voz
├── events/             # Eventos do Discord (mensagens, interações, etc.)
├── audio/              # Arquivos de áudio para reprodução
├── .env                # Variáveis de ambiente
├── .env.example        # Exemplo de variáveis de ambiente
├── bot.js              # Classe principal do bot
├── botManager.js       # Gerenciador de múltiplos bots
├── deploy-commands.js  # Script para registrar comandos no Discord
├── index.js            # Ponto de entrada do serviço
└── package.json        # Dependências do projeto
```

### Deploy de Comandos

Para registrar os comandos slash no Discord:

```bash
node deploy-commands.js
```

## Docker

O projeto inclui suporte para Docker:

```bash
# Construir a imagem
docker build -t discord-bot-manager .

# Executar o container
docker run -p 7860:7860 --env-file .env discord-bot-manager
```

## Solução de Problemas

Para problemas comuns e suas soluções, consulte nossa [documentação de solução de problemas](./README-VOICE.md#resolução-de-problemas).

## Contribuição

Contribuições são bem-vindas! Por favor, siga nosso guia de contribuição para enviar pull requests.

## Licença

Este projeto é licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.
