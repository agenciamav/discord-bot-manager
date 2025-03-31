---
title: Discord Bot Manager
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# Discord Bot Manager

Um serviço Node.js para gerenciar múltiplas instâncias de bots Discord.

## Funcionalidades

- Gerenciamento centralizado de múltiplos bots Discord
- API REST para iniciar e parar bots
- Carregamento automático de bots ativos
- Comandos slash integrados
- Gerenciamento de eventos do Discord

## Como usar

1. Clone o repositório
2. Configure as variáveis de ambiente no arquivo `.env`
3. Instale as dependências:
   ```
   npm install
   ```
4. Execute o servidor:
   ```
   npm start
   ```

## Variáveis de ambiente

- `TOKEN`: Token do bot Discord principal (para desenvolvimento)
- `CLIENT_ID`: ID do cliente Discord (para desenvolvimento)
- `GUILD_ID`: ID do servidor Discord para testes
- `APP_URL`: URL da aplicação principal
- `API_TOKEN`: Token para autenticação com a API
- `PORT`: Porta para o servidor (padrão: 7860)

## API Endpoints

- `GET /api`: Status do serviço
- `GET /api/status`: Status de todos os bots
- `POST /api/start`: Inicia um bot (requer token no corpo da requisição)
- `POST /api/stop`: Para um bot (requer token no corpo da requisição)

## Desenvolvimento

Para executar em modo de desenvolvimento com recarga automática:

```
npm run dev
```

## Registrar comandos slash

Para registrar os comandos slash no Discord:

```
node deploy-commands.js
```
