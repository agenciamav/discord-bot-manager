# Configuração de Áudio para o Bot Discord

Este bot requer alguns arquivos de áudio para funcionar corretamente com o comando `/voice play`.

## Arquivos Necessários

Você precisa criar os seguintes arquivos na pasta `discord-bot-manager/audio/`:

1. `welcome.mp3` - Som de boas-vindas
2. `alert.mp3` - Som de alerta
3. `goodbye.mp3` - Som de despedida

## Passos para Testar com Arquivos de Placeholder

Para testar rapidamente, você pode criar arquivos de áudio vazios:

### No Windows:

```cmd
cd discord-bot-manager\audio
copy NUL welcome.mp3
copy NUL alert.mp3
copy NUL goodbye.mp3
```

### No Linux/Mac:

```bash
cd discord-bot-manager/audio
touch welcome.mp3
touch alert.mp3
touch goodbye.mp3
```

## Solução de Problemas

Se você estiver tendo problemas com os comandos de voz:

1. Verifique se os arquivos de áudio existem
2. Tente reiniciar o bot: `npm run start`
3. Verifique se os comandos foram registrados: `node deploy-commands.js`
4. Verifique as permissões do Discord para o bot

## Personalizando os Sons

Para melhor experiência, substitua os arquivos placeholder por arquivos de áudio reais (MP3) com duração curta (2-5 segundos). 