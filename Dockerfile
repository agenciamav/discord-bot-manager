# Use a imagem oficial do Node.js como base
FROM node:14

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# Copie o arquivo package.json e package-lock.json para o diretório de trabalho
COPY package*.json ./

# Instale o Yarn
RUN npm install -g yarn

# Instale as dependências do projeto usando o Yarn
RUN yarn install

# Copie o restante dos arquivos do projeto para o diretório de trabalho
COPY . .

# Exponha a porta que o aplicativo usará
EXPOSE 7860

# Defina o comando para executar o aplicativo
CMD [ "node", "index.js", "--port", "7860" ]