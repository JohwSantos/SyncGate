# Imagem enxuta do Node, baseada em Alpine Linux (menor tamanho)
FROM node:20-alpine

WORKDIR /app

# Copiamos só os arquivos de dependência primeiro. Assim, se você
# mudar apenas o código (sem mudar dependências), o Docker reusa
# essa camada já instalada em vez de rodar "npm install" de novo
# a cada build — builds ficam bem mais rápidos.
COPY package*.json ./
RUN npm install --omit=dev

# Agora sim, o restante do código da aplicação
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
