# SyncGate — Rodando com Docker

Este arquivo explica como subir o sistema inteiro (banco de dados + API + painel) com um único comando, usando Docker.

## 1. Estrutura de pastas necessária

O `docker-compose.yml` espera encontrar os dois projetos como subpastas, com **exatamente esses nomes**:

```
syncgate/                      <- crie esta pasta
├── docker-compose.yml         <- este arquivo
├── syncgate-backend/          <- conteúdo do zip do backend
└── syncgate-frontend/         <- conteúdo do zip do frontend
```

Extraia os dois zips dentro da pasta `syncgate/`, ao lado do `docker-compose.yml`.

## 2. Pré-requisitos

- Docker instalado
- Docker Compose (já vem junto no Docker Desktop; no Linux, pode precisar instalar `docker-compose-plugin` separadamente)

## 3. Subir tudo

Na pasta `syncgate/` (onde está o `docker-compose.yml`):

```bash
docker compose up -d --build
```

Isso vai, na ordem certa:
1. Subir o banco de dados MySQL e criar as tabelas automaticamente (usando o `schema.sql` do backend)
2. Esperar o banco responder (`healthcheck`) antes de subir a API
3. Construir e subir a API (backend)
4. Construir e subir o painel (frontend), já compilado e servido pelo Nginx

## 4. Criar o primeiro administrador

O banco sobe vazio — sem isso, ninguém consegue logar no painel. Rode:

```bash
docker compose exec backend npm run seed:admin -- "Johw Santos" "12345678900" "admin" "admin123"
```

## 5. Acessar

- Painel: **http://localhost:5173**
- API: **http://localhost:3000/api/health**
- Banco (se quiser conectar um cliente MySQL): `localhost:3306`, usuário `syncgate_app`, senha `syncgate123`

## Comandos úteis

```bash
# Ver logs de um serviço
docker compose logs -f backend
docker compose logs -f frontend

# Parar tudo (mantém os dados do banco)
docker compose down

# Parar tudo E apagar os dados do banco (recomeçar do zero)
docker compose down -v

# Reconstruir depois de alterar código
docker compose up -d --build
```

## Sobre as senhas neste arquivo

As credenciais no `docker-compose.yml` (`rootpassword`, `syncgate123`, `JWT_SECRET`) são valores de **desenvolvimento/teste**. Se algum dia isso for usado além da sua máquina local, troque todos esses valores por senhas fortes e únicas antes.

## Por que a API roda numa porta separada do painel?

O painel (frontend) é só HTML/CSS/JS estático servido pelo Nginx — ele não fala com o banco diretamente. O navegador de quem usa o painel é quem faz as chamadas para `http://localhost:3000/api`, por isso essa URL precisa ser alcançável de fora do Docker (não adianta apontar para o nome interno do serviço `backend`).
