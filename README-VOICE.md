# Integração de Voz para Bots Discord

Este documento descreve como implementar e configurar a funcionalidade de interação por voz para os bots Discord da AgenciaMav.

## Pré-requisitos

1. Node.js v16.x ou superior
2. Um bot Discord registrado com as seguintes intents habilitadas:
   - GUILDS
   - GUILD_MESSAGES
   - GUILD_VOICE_STATES
   - MESSAGE_CONTENT
3. Contas e chaves de API para:
   - [AssemblyAI](https://www.assemblyai.com/) (transcrição de voz para texto)
   - [OpenAI](https://platform.openai.com/) (processamento de IA)
   - [ElevenLabs](https://elevenlabs.io/) (conversão de texto para voz)

## Configuração

### 1. Instalação de Dependências

```bash
npm install @discordjs/voice prism-media ffmpeg-static libsodium-wrappers @discordjs/opus assemblyai elevenlabs-node openai --save
```

### 2. Configuração do .env

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

Certifique-se de preencher todas as variáveis de ambiente necessárias:

```
# Discord
TOKEN=seu_token_bot_discord
CLIENT_ID=id_da_aplicacao_discord
GUILD_ID=id_do_servidor_discord

# APIs de IA
ASSEMBLY_AI_API_KEY=sua_chave_assemblyai
OPENAI_API_KEY=sua_chave_openai
ELEVENLABS_API_KEY=sua_chave_elevenlabs
ELEVENLABS_VOICE_ID=id_da_voz_elevenlabs
```

### 3. Comandos Disponíveis

O bot oferece os seguintes comandos de voz:

- `/join` - Faz o bot entrar no canal de voz atual do usuário
- `/leave` - Faz o bot sair do canal de voz
- `/play` - Reproduz um arquivo de áudio pré-definido
- `/listen` - Escuta o usuário por um tempo determinado e responde usando IA

### 4. Implementação Completa

Para uma implementação completa da integração de voz com IA, você precisará:

1. Configurar as integrações com os serviços de IA em `commands/voice/listen.js`
2. Adicionar arquivos de áudio na pasta `audio/` (welcome.mp3, alert.mp3, goodbye.mp3)
3. Implementar as funções de processamento:
   - `transcribeAudio()` - Transcrição via AssemblyAI
   - `getAIResponse()` - Obtenção de resposta via OpenAI
   - `textToSpeech()` - Conversão para voz via ElevenLabs

## Customização do Fluxo de Voz

### Transcrição de Voz (STT)

O fluxo de transcrição de voz utiliza [AssemblyAI](https://www.assemblyai.com/):

```javascript
const AssemblyAI = require('assemblyai');

async function transcribeAudio(audioPath) {
  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLY_AI_API_KEY });
  
  // Enviar o arquivo para transcrição
  const transcript = await client.transcripts.transcribe({
    audio: audioPath,
    config: {
      language_code: 'pt_br'
    }
  });
  
  return transcript.text;
}
```

### Processamento de IA

O processamento usa a API da OpenAI:

```javascript
const { OpenAI } = require('openai');

async function getAIResponse(text) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente útil que responde de forma concisa e clara.'
      },
      {
        role: 'user',
        content: text
      }
    ],
    max_tokens: 150
  });
  
  return response.choices[0].message.content;
}
```

### Conversão de Texto para Voz (TTS)

A conversão utiliza ElevenLabs:

```javascript
const ElevenLabs = require('elevenlabs-node');

async function textToSpeech(text) {
  const client = new ElevenLabs({
    apiKey: process.env.ELEVENLABS_API_KEY
  });
  
  const outputPath = path.join(__dirname, '..', 'audio', `response-${Date.now()}.mp3`);
  
  await client.textToSpeech({
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    text: text,
    outputFilePath: outputPath
  });
  
  return outputPath;
}
```

## Resolução de Problemas

### Erros Comuns

1. **Error: Cannot find module '@discordjs/voice'**
   - Solução: Instale a dependência: `npm install @discordjs/voice`

2. **Error: Cannot find ffmpeg**
   - Solução: Instale ffmpeg: `npm install ffmpeg-static`

3. **DiscordAPIError: Missing Permission**
   - Solução: Verifique se o bot tem permissão de "Conectar" e "Falar" nos canais de voz

4. **Erro ao transcrever áudio**
   - Solução: Verifique a chave da API AssemblyAI e o formato do arquivo de áudio

### Otimizações

- Utilize caching para respostas comuns
- Implemente mecanismos para evitar abuso dos serviços pagos
- Adicione tratamento de erros robusto para cada serviço externo

## Recursos Adicionais

- [Documentação do Discord.js Voice](https://discordjs.guide/voice/)
- [Documentação AssemblyAI](https://www.assemblyai.com/docs/)
- [Documentação OpenAI API](https://platform.openai.com/docs/api-reference)
- [Documentação ElevenLabs](https://elevenlabs.io/docs) 