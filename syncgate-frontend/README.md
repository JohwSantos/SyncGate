# SyncGate — Painel Administrativo (Frontend)

Painel web em React (Vite) para o sistema de controle de acesso SyncGate.

> **Status:** completo. As 7 telas de gestão estão funcionais, com atualização em tempo real e layout responsivo.

## Tecnologias

- React + Vite
- React Router
- Context API (estado de login)
- Socket.io Client (eventos em tempo real)
- `lucide-react` (ícones)
- CSS com variáveis de design (`src/styles/global.css`)
- Nginx (build de produção via Docker)

## Estrutura

```
src/
├── api/client.js            # Cliente HTTP autenticado
├── context/AuthContext.jsx  # Estado global de login (token + usuário em localStorage)
├── hooks/useSocket.js        # Conexão WebSocket reutilizável
├── routes/RotaPrivada.jsx    # Protege todo o painel atrás de um único guard
├── components/
│   ├── Layout.jsx             # Menu lateral + topo + área de conteúdo
│   ├── Sidebar.jsx             # Navegação (vira menu retrátil no mobile)
│   ├── Modal.jsx / Badge.jsx / CartaoEstatistica.jsx
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx           # Indicadores + feed de acessos ao vivo
│   ├── Usuarios.jsx
│   ├── Cartoes.jsx
│   ├── Dispositivos.jsx
│   ├── Horarios.jsx
│   ├── Solicitacoes.jsx        # Aprovar/rejeitar com atualização em tempo real
│   └── Historico.jsx           # Log de acessos com filtros
├── styles/global.css           # Tokens de design + regras responsivas
├── App.jsx                      # Rotas da aplicação
└── main.jsx
```

## Instalação e execução

```bash
npm install
cp .env.example .env
```

Confirme `VITE_API_URL` no `.env` (padrão: `http://localhost:3000/api`). O backend precisa estar rodando, com pelo menos um administrador criado (`npm run seed:admin` no backend).

```bash
npm run dev
```

Acesse `http://localhost:5173`.

### Rodando com Docker

Veja o `README-DOCKER.md` na raiz do monorepo.

## Telas

| Tela | O que faz |
|---|---|
| Login | Autenticação, token salvo no navegador |
| Dashboard | Indicadores do dia + feed de acessos ao vivo (WebSocket) |
| Usuários | Cadastro, edição, bloqueio, exclusão |
| Cartões RFID | Vínculo com usuário, ativar/desativar, exclusão |
| Dispositivos | Cadastro, mudança de status, exclusão |
| Horários de Acesso | Regras de restrição por dia/horário |
| Solicitações | Aprovar/rejeitar visitantes, sincronizado entre abas via WebSocket |
| Histórico de Acessos | Log completo com filtros (usuário, dispositivo, status, período) |

## Identidade visual

Paleta baseada na logo (azul-marinho `#0B1E3D` + azul `#1554F5`), tipografia Space Grotesk (títulos) + Inter (texto) + JetBrains Mono (IDs, UIDs, horários) — pensado como um console de segurança, onde estado (permitido/negado, online/offline) é sempre comunicado por cor **e** texto.

## Responsividade

Abaixo de 820px: o menu lateral vira um painel deslizante (ícone de hambúrguer), a tela de login empilha em uma coluna só, e as tabelas passam de colunas com rolagem horizontal para cartões empilhados (rótulo + valor por linha).

## Como testar

```bash
npm run build   # confirma que compila sem erros
npm run dev
```

Fluxo básico: logar → Dashboard mostra indicadores reais → abrir duas abas logadas e aprovar uma solicitação numa delas → a outra atualiza sozinha, sem F5.
