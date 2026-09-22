# SyncGate — Controle Inteligente de Acesso

Sistema de controle de acesso físico por RFID, com validação em tempo real, painel administrativo web e histórico de acessos. Desenvolvido como Trabalho de Conclusão de Curso (TCC) da ETEC Zona Leste (Centro Paula Souza).

## O que o sistema faz

Um leitor RFID (ESP32) lê o cartão de um aluno, professor ou funcionário e envia o UID para a API, que decide — em menos de um segundo — se libera ou nega o acesso, considerando: cadastro ativo, cartão válido, e restrições de horário. Toda tentativa é registrada, mesmo as negadas. Um painel web permite gerenciar usuários, cartões, dispositivos, horários e solicitações de visitantes, com atualização em tempo real.

## Arquitetura

```
Dispositivo (ESP32 + leitor RFID)
        │  HTTP (UID do cartão)
        ▼
   API REST (Node.js/Express — MVC)  ──────►  MySQL
        │
        │  WebSocket (Socket.io)
        ▼
   Painel Administrativo (React)
```

## Estrutura do repositório

```
syncgate/
├── syncgate-backend/     # API REST (Node.js + Express + MySQL)
├── syncgate-frontend/    # Painel administrativo (React + Vite)
└── docker-compose.yml    # Sobe tudo junto (banco + API + painel)
```

Cada projeto tem seu próprio `README.md` com detalhes de instalação, estrutura e endpoints.

## Como rodar (Docker — recomendado)

```bash
docker compose up -d --build
docker compose exec backend npm run seed:admin -- "Seu Nome" "12345678900" "admin" "suaSenha123"
```

Painel em `http://localhost:5173`. Veja o `README-DOCKER.md` para detalhes.

## Como rodar (manual)

```bash
# Backend
cd syncgate-backend
npm install && cp .env.example .env
mysql -u root < database/schema.sql
npm run seed:admin -- "Seu Nome" "12345678900" "admin" "suaSenha123"
npm run dev

# Frontend (em outro terminal)
cd syncgate-frontend
npm install && cp .env.example .env
npm run dev
```

## Tecnologias

**Backend**
- Node.js
- Express
- MySQL
- JWT
- Socket.io
- bcrypt

**Frontend**
- React
- Vite
- React Router
- Socket.io Client

**Hardware**
- ESP32
- Leitor RFID

**Infraestrutura**
- Docker
- Docker Compose
- Nginx

## Funcionalidades

- Validação de acesso em tempo real com log imutável
- Restrição de acesso por horário
- Autenticação JWT protegendo o painel
- Eventos ao vivo via WebSocket (novo acesso, mudança de status, solicitações)
- Fluxo de aprovação para visitantes
- Painel responsivo (desktop, tablet e celular)

## Contexto acadêmico

Projeto desenvolvido do zero como TCC, com base em levantamento de requisitos, diagramas de classes e modelo entidade-relacionamento próprios.
