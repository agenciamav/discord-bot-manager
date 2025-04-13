# Captura de Áudio do Discord

Este módulo permite que o bot capture áudio dos canais de voz no Discord para posteriormente realizar processamento de fala para texto (STT).

## Funcionalidades

- Conexão a canais de voz do Discord
- Captura de áudio de usuários individuais
- Gravação de arquivos de áudio (.pcm)
- Processamento STT (a ser implementado)

## Como usar

1. Use o comando `/voice join` para conectar o bot ao seu canal de voz
2. O bot iniciará automaticamente a captura de áudio
3. Cada usuário que falar terá seu áudio salvo como um arquivo separado
4. Os arquivos são salvos em `./recordings/`
5. Use o comando `/voice leave` para desconectar o bot

## Formato dos arquivos

Os arquivos são salvos no formato PCM com as seguintes características:
- Taxa de amostragem: 48kHz
- Canais: 2 (estéreo)
- Bits por amostra: 16
- Sem cabeçalho (raw PCM)

## Processamento STT

Para implementar o processamento STT, você pode:

1. Adicionar código ao método `processAudioFile` em `audioManager.js`
2. Integrar com serviços como Google Cloud Speech-to-Text, Amazon Transcribe ou outros
3. Processar os arquivos em tempo real ou em batch após a gravação

## Requisitos

Este módulo requer as seguintes dependências:
- @discordjs/voice
- @discordjs/opus
- prism-media
- sodium-native (ou libsodium-wrappers)
- ffmpeg-static

## Limitações

- O Discord limita a qualidade do áudio capturado (48kHz, 16-bit)
- Pode haver latência ou perda de pacotes dependendo da conexão
- Os arquivos podem ficar grandes em conversas longas

## Exemplo de integração com STT

```javascript
async processAudioFile(filename, userId) {
  console.log(`🔄 Processando arquivo de áudio ${filename} para STT...`);
  
  // Exemplo com a biblioteca node-speech
  const speech = require('@google-cloud/speech');
  const fs = require('fs').promises;
  
  // Criar cliente Speech
  const client = new speech.SpeechClient();
  
  // Ler arquivo
  const audioBytes = await fs.readFile(filename);
  
  // Configurar requisição
  const audio = {
    content: audioBytes.toString('base64'),
  };
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 48000,
    languageCode: 'pt-BR',
  };
  const request = {
    audio: audio,
    config: config,
  };
  
  // Realizar transcrição
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  
  console.log(`📝 Transcrição para ${userId}: ${transcription}`);
  
  return transcription;
}
``` 