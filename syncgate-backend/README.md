# SyncGate — Backend

API REST do sistema de controle de acesso **SyncGate**, desenvolvida em Node.js + Express, seguindo o padrão MVC (Rotas → Controllers → Services → Models → Banco de dados). Projeto de TCC da ETEC Zona Leste (Centro Paula Souza).

> **Status:** completo. As 6 entidades do sistema, autenticação, tempo real e exclusão com integridade referencial estão implementadas e testadas.

---

## Tecnologias

- Node.js + Express (arquitetura MVC)
- MySQL / MariaDB (via `mysql2`)
- JWT (`jsonwebtoken`) — autenticação das rotas administrativas
- Socket.io — eventos em tempo real
- `bcryptjs` — hash de senha
- Docker (Dockerfile incluso)

## Estrutura do projeto

```
syncgate-backend/
├── database/
│   └── schema.sql              # As 6 tabelas, chaves estrangeiras e índices
├── scripts/
│   └── criarAdmin.js            # Bootstrap do primeiro administrador (sem passar pela API)
├── src/
│   ├── config/                  # Variáveis de ambiente e conexão MySQL
│   ├── controllers/             # usuario, cartao, dispositivo, acesso, horarioAcesso, solicitacaoAcesso, auth
│   ├── models/                  # Um model por entidade — só leem/escrevem no banco
│   ├── services/                # Regras de negócio (RN01-RN08, RF01-RF10)
│   ├── routes/                  # Endpoints da API
│   ├── middlewares/
│   │   ├── errorHandler.js      # Tratamento central de erros
│   │   └── auth.middleware.js   # Validação do token JWT
│   ├── websocket/socket.js      # Eventos em tempo real (Socket.io)
│   └── app.js
├── server.js
├── Dockerfile
└── .env.example
```

## Instalação

```bash
npm install
cp .env.example .env
```

Edite o `.env` com os dados do seu MySQL e defina um `JWT_SECRET` próprio. Crie o banco:

```bash
mysql -u root < database/schema.sql
```

Suba o servidor:

```bash
npm run dev
```

API disponível em `http://localhost:3000/api`.

### Rodando com Docker

Veja o `README-DOCKER.md` na raiz do monorepo — sobe banco, API e painel juntos com `docker compose up -d --build`.

### Criar o primeiro administrador

Como toda rota de cadastro exige login, o primeiro usuário precisa ser criado por script:

```bash
npm run seed:admin -- "Seu Nome" "12345678900" "admin" "suaSenha123"
```

---

## Entidades e regras de negócio

| Entidade | Descrição |
|---|---|
| `usuarios` | Alunos, professores, funcionários e admins (herança single-table) |
| `cartoes` | Cartões RFID, um vinculado a cada usuário |
| `dispositivos` | Catracas/leitores físicos |
| `acesso` | Log imutável de cada tentativa de entrada/saída |
| `horarios_acesso` | Restrição de acesso por dia/horário |
| `solicitacao_acesso` | Fluxo de aprovação para visitantes |

| Regra | Onde é aplicada |
|---|---|
| RN02 — um cartão por usuário | Estrutura da tabela `cartoes` |
| RN03 — toda tentativa é registrada, mesmo negada | `acesso.service.js` |
| RN04 — usuário bloqueado não acessa | `acesso.service.js` |
| RN05 — UID e CPF únicos | Constraint do banco + validação no service (`409`) |
| RN06 — restrição por horário | `horarioAcesso.model.js` + `acesso.service.js` |
| RN08 — log de acesso imutável | Nenhuma rota de UPDATE/DELETE em `acesso` |
| RF09 — bloqueio sem exclusão | `definirStatus` / `definirAtivo` |

## Autenticação

Todas as rotas administrativas exigem `Authorization: Bearer <token>`, obtido em `POST /api/auth/login`. A única rota pública além do login é `POST /api/acesso/validar` — é a rota que o dispositivo físico (ESP32) chama, não uma pessoa logada no painel.

## Exclusão (DELETE)

`usuarios`, `cartoes` e `dispositivos` podem ser excluídos definitivamente. Cartões sempre podem; usuários e dispositivos só quando não têm histórico/vínculos dependentes — nesse caso a API responde `409` com uma mensagem explicando o motivo, em vez de deixar vazar o erro do MySQL.

## Referência rápida dos endpoints

| Método | Rota | Autenticação |
|---|---|---|
| GET | `/api/health` | — |
| POST | `/api/auth/login` | — |
| POST | `/api/acesso/validar` | — (rota do dispositivo) |
| GET/POST/PUT/PATCH/DELETE | `/api/usuarios` | Bearer |
| GET/POST/PATCH/DELETE | `/api/cartoes` | Bearer |
| GET/POST/PUT/PATCH/DELETE | `/api/dispositivos` | Bearer |
| GET/POST/DELETE | `/api/horarios` | Bearer |
| GET/POST/PATCH | `/api/solicitacoes` | Bearer |
| GET | `/api/acesso` | Bearer |

## WebSocket

Conexão em `http://localhost:3000`, autenticada via `socket.handshake.auth.token` (mesmo JWT do login). Eventos emitidos: `novo-acesso`, `dispositivo-atualizado`, `solicitacao-atualizada`.

## Como testar

Um roteiro completo de testes (com `curl` e Thunder Client) foi seguido etapa a etapa durante o desenvolvimento — cobrindo cada regra de negócio, cenários de erro (`400`/`404`/`409`) e a integração com WebSocket. Para testar rapidamente:

```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","senha":"suaSenha123"}'
```
