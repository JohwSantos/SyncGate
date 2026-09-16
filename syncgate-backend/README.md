# SyncGate — Backend

API REST do sistema de controle de acesso **SyncGate** (ETEC Zona Leste), desenvolvida em Node.js + Express, seguindo o padrão MVC (Rotas → Controllers → Services → Models → Banco de dados).

> **Status atual:** fundação do backend + banco de dados + CRUD de `usuarios` e `cartoes` funcionando de ponta a ponta. Ainda faltam: `dispositivos`, o registro/validação de `acesso`, `horarios_acesso`, `solicitacao_acesso`, autenticação, painel React e o firmware do ESP32.

---

## Tecnologias

- Node.js + Express
- MySQL / MariaDB (via `mysql2`)
- `bcryptjs` (hash de senha)
- `dotenv`, `cors`
- Arquitetura MVC

## Estrutura do projeto

```
syncgate-backend/
├── database/
│   └── schema.sql            # Script de criação das 6 tabelas
├── src/
│   ├── config/
│   │   ├── env.js             # Leitura das variáveis de ambiente
│   │   └── database.js        # Pool de conexão MySQL
│   ├── controllers/
│   │   ├── usuario.controller.js
│   │   └── cartao.controller.js
│   ├── models/
│   │   ├── usuario.model.js
│   │   └── cartao.model.js
│   ├── routes/
│   │   ├── index.js           # Agrega todas as rotas
│   │   ├── health.routes.js
│   │   ├── usuario.routes.js
│   │   └── cartao.routes.js
│   ├── services/
│   │   ├── usuario.service.js # Regras de negócio de usuários
│   │   └── cartao.service.js  # Regras de negócio de cartões
│   ├── middlewares/
│   │   └── errorHandler.js    # Tratamento central de erros
│   └── app.js                  # Configuração do Express
├── server.js                    # Ponto de entrada
├── .env.example
└── package.json
```

---

## Instalação e configuração

```bash
npm install
cp .env.example .env
```

Edite o `.env` com os dados do seu MySQL:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=syncgate
```

> Se o `root` do seu MySQL/MariaDB usar autenticação por socket (comum em instalações locais no Linux), crie um usuário próprio para a aplicação:
> ```sql
> CREATE USER 'syncgate_app'@'localhost' IDENTIFIED BY 'uma_senha';
> GRANT ALL PRIVILEGES ON syncgate.* TO 'syncgate_app'@'localhost';
> ```

Crie o banco e as tabelas:

```bash
mysql -u root < database/schema.sql
```

Suba o servidor:

```bash
npm run dev
```

Servidor disponível em `http://localhost:3000`.

---

## O que já foi construído

### 1. Estrutura e configuração do backend
Servidor Express funcional, com separação em camadas (config, routes, controllers, services, models, middlewares).

### 2. Banco de dados
Schema completo (`database/schema.sql`) com as 6 entidades do sistema (`usuarios`, `cartoes`, `dispositivos`, `acesso`, `horarios_acesso`, `solicitacao_acesso`), chaves estrangeiras e índices. Testado com `INSERT`s reais, incluindo os casos de CPF duplicado e acesso negado por UID desconhecido.

### 3. Módulo de Usuários (CRUD completo)
- Cadastro com validação de campos obrigatórios e senha transformada em hash (nunca salva em texto puro)
- CPF único (retorna `409` em caso de duplicidade)
- Listagem e busca por id (nunca expõe `senha_hash`)
- Atualização de dados
- Bloqueio/desbloqueio sem exclusão do cadastro (RF09)

### 4. Módulo de Cartões RFID (CRUD parcial)
- Vinculação de cartão a um usuário existente (RF08)
- UID único (retorna `409` em caso de duplicidade)
- Listagem geral e por usuário
- Ativação/desativação de cartão sem apagar o registro

### Regras de negócio já implementadas
| Regra | Onde |
|---|---|
| RN02 — cartão pertence a um único usuário | Estrutura da tabela `cartoes` |
| RN05 — UID único | Constraint do banco + validação no service (`409`) |
| CPF único | Constraint do banco + validação no service (`409`) |
| RF07 — cadastro de usuários | `usuario.service.js` |
| RF08 — vínculo de cartão | `cartao.service.js` |
| RF09 — bloqueio sem exclusão | `definirStatus` (usuários) / `definirAtivo` (cartões) |

---

## Referência da API e como testar

Para todos os exemplos abaixo, o servidor precisa estar rodando (`npm run dev`).

### Health check

```bash
curl http://localhost:3000/api/health
```
**Esperado:** `status: "ok"` e `banco_de_dados: "conectado"` (ou `"indisponível"` se o MySQL não estiver acessível).

---

### Usuários

**Criar usuário**
```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Costa","cpf":"44444444444","tipo":"aluno","login":"ana","senha":"123456"}'
```
**Esperado:** `201`, dados do usuário sem a senha.

**Listar todos**
```bash
curl http://localhost:3000/api/usuarios
```

**Buscar por id**
```bash
curl http://localhost:3000/api/usuarios/1
```

**Atualizar**
```bash
curl -X PUT http://localhost:3000/api/usuarios/1 \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Costa Silva","cargo":"Aluna","perfil":null}'
```

**Bloquear / desbloquear (RF09)**
```bash
curl -X PATCH http://localhost:3000/api/usuarios/1/status \
  -H "Content-Type: application/json" -d '{"ativo": false}'
```

**Testar CPF duplicado (deve dar 409)**
```bash
curl -w "\n%{http_code}\n" -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Outra Pessoa","cpf":"44444444444","tipo":"aluno","login":"outra","senha":"123456"}'
```

**Testar campo obrigatório faltando (deve dar 400)**
```bash
curl -w "\n%{http_code}\n" -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" -d '{"nome":"Sem CPF"}'
```

**Testar usuário inexistente (deve dar 404)**
```bash
curl -w "\n%{http_code}\n" http://localhost:3000/api/usuarios/9999
```

---

### Cartões RFID

**Vincular cartão a um usuário (RF08)** — troque `1` pelo id de um usuário já cadastrado
```bash
curl -X POST http://localhost:3000/api/cartoes \
  -H "Content-Type: application/json" \
  -d '{"uid":"RFID-TESTE-001","id_usuario":1,"data_emissao":"2026-01-10","data_validade":"2027-01-10"}'
```
**Esperado:** `201`, dados do cartão criado.

**Listar todos os cartões**
```bash
curl http://localhost:3000/api/cartoes
```

**Listar cartões de um usuário**
```bash
curl http://localhost:3000/api/cartoes/usuario/1
```

**Buscar cartão por id**
```bash
curl http://localhost:3000/api/cartoes/1
```

**Ativar / desativar cartão**
```bash
curl -X PATCH http://localhost:3000/api/cartoes/1/status \
  -H "Content-Type: application/json" -d '{"ativo": false}'
```

**Testar UID duplicado (deve dar 409)**
```bash
curl -w "\n%{http_code}\n" -X POST http://localhost:3000/api/cartoes \
  -H "Content-Type: application/json" \
  -d '{"uid":"RFID-TESTE-001","id_usuario":1}'
```

**Testar usuário inexistente ao vincular (deve dar 404)**
```bash
curl -w "\n%{http_code}\n" -X POST http://localhost:3000/api/cartoes \
  -H "Content-Type: application/json" -d '{"uid":"RFID-999","id_usuario":9999}'
```

**Testar campo obrigatório faltando (deve dar 400)**
```bash
curl -w "\n%{http_code}\n" -X POST http://localhost:3000/api/cartoes \
  -H "Content-Type: application/json" -d '{"id_usuario":1}'
```

---

## Tabela-resumo de todos os testes possíveis até agora

| # | O que testa | Resultado esperado |
|---|---|---|
| 1 | `GET /api/health` | `200`, status do banco |
| 2 | Criar usuário válido | `201` |
| 3 | Listar usuários | `200`, sem `senha_hash` |
| 4 | Buscar usuário por id | `200` |
| 5 | Atualizar usuário | `200`, campos alterados |
| 6 | Bloquear/desbloquear usuário | `200`, `status` muda, registro continua existindo |
| 7 | Cadastrar usuário com CPF repetido | `409` |
| 8 | Cadastrar usuário sem campo obrigatório | `400` |
| 9 | Buscar usuário inexistente | `404` |
| 10 | Vincular cartão a usuário existente | `201` |
| 11 | Listar todos os cartões | `200` |
| 12 | Listar cartões de um usuário | `200` |
| 13 | Ativar/desativar cartão | `200`, `ativo` muda |
| 14 | Vincular cartão com UID repetido | `409` |
| 15 | Vincular cartão a usuário inexistente | `404` |
| 16 | Vincular cartão sem campo obrigatório | `400` |

---

## Próximas etapas (roadmap)

1. **`dispositivos`** — cadastro das catracas/leitores
2. **`acesso`** — validação e registro de tentativas de entrada/saída (RF03–RF06)
3. `horarios_acesso` — restrição de acesso por horário (RN06)
4. `solicitacao_acesso` — fluxo de visitantes
5. Autenticação (login do painel)
6. WebSocket (eventos em tempo real)
7. Painel administrativo em React
8. Testes automatizados, segurança e documentação final
9. Firmware do ESP32 e integração física
