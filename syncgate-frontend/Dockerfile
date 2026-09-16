# ---- Etapa 1: build ----
# Usamos o Node só para compilar o React. A imagem final não leva
# o Node nem o código-fonte, só os arquivos estáticos já prontos.
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# A URL da API precisa estar definida NO MOMENTO DO BUILD, porque
# o Vite "grava" essa variável dentro do JavaScript final — ela não
# pode ser trocada depois, rodando o container (diferente de uma
# variável de ambiente comum). O docker-compose.yml passa esse
# valor via "build: args:".
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Etapa 2: servir com Nginx ----
FROM nginx:alpine

# Copia só o resultado da compilação (pasta dist) para dentro do
# Nginx — a imagem final é bem menor que carregar o Node inteiro.
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
