# SyncGate — Painel Administrativo (Frontend)

Painel web em React (Vite) para o sistema de controle de acesso SyncGate.

> **Status atual:** estrutura do projeto + identidade visual + tela de login funcional. As demais telas (dashboard, CRUDs, histórico) vêm nas próximas etapas.

## Tecnologias

- React + Vite
- React Router (navegação)
- Context API (estado de login)
- CSS puro com variáveis de design (tokens em `src/styles/global.css`)

## Estrutura

```
src/
├── api/client.js           # Cliente HTTP autenticado (fala com o backend)
├── context/AuthContext.jsx # Estado global de login
├── routes/RotaPrivada.jsx  # Protege telas que exigem login
├── pages/Login.jsx         # Tela de login
├── styles/global.css       # Tokens de design (cores, tipografia)
├── App.jsx                 # Rotas da aplicação
└── main.jsx                # Ponto de entrada
```

## Instalação e execução

```bash
npm install
cp .env.example .env
```

Confirme que `VITE_API_URL` no `.env` aponta para o backend (por padrão, `http://localhost:3000/api`).

**Importante:** o backend do SyncGate precisa estar rodando, com pelo menos um usuário administrador criado (veja o `README.md` do backend, seção de bootstrap do admin).

```bash
npm run dev
```

Acesse `http://localhost:5173`.

## Como testar

1. Suba o backend (`npm run dev` na pasta do backend) e confirme que existe um admin cadastrado
2. Suba o frontend (`npm run dev` aqui)
3. Acesse `http://localhost:5173/login`
4. Teste com credenciais **erradas** → deve aparecer uma faixa de erro vermelha, sem recarregar a página
5. Teste com credenciais **corretas** → deve redirecionar para `/`, mostrando "Login realizado com sucesso" (tela temporária — o dashboard real é a próxima etapa)
6. Recarregue a página em `/` → deve continuar logado (o token fica salvo no navegador)

## Próximas etapas

1. Layout do painel (menu lateral + área de conteúdo) + dashboard com eventos ao vivo via WebSocket
2. CRUD de usuários
3. CRUD de cartões e dispositivos
4. Solicitações de visitantes
5. Histórico de acessos com filtros
6. Responsividade e polimento visual
