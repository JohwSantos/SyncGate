# SyncGate na máquina virtual da Azure (Ubuntu + Docker)

Resultado: o painel e a API num endereço só, com HTTPS, por exemplo
`https://syncgate-etec.chilecentral.cloudapp.azure.com`. O ESP32 passa
a usar esse endereço e funciona de qualquer rede com internet.

## 1. No portal da Azure (uma vez)

1. **Nome DNS:** abra a máquina virtual › **Endereço IP público** ›
   **Configuração** › **Rótulo de nome DNS**, digite um nome (ex.:
   `syncgate-etec`) e salve. O endereço completo aparece logo abaixo
   (ex.: `syncgate-etec.chilecentral.cloudapp.azure.com`).
   Se o IP for **dinâmico**, troque para **estático** na mesma tela.
2. **Firewall (Rede › Regras de porta de entrada):** permita as portas
   **80** e **443** (TCP, origem: qualquer). Mantenha a 22 (SSH).
   **Remova** regras para 3000, 3307 e 5173, se existirem: banco e API
   não devem ficar abertos para a internet.

## 2. Na máquina virtual (por SSH)

```bash
# Se o projeto antigo estiver rodando, pare (libera portas e não expõe mais o banco)
cd ~/SyncGate && docker compose down          # ajuste a pasta, se for outra

# Código atualizado
cd ~/SyncGate && git pull                      # ou git clone, se ainda não tiver

# Configuração de produção
cd deploy
cp .env.example .env
nano .env        # preencha DOMINIO e gere os 3 segredos com:  openssl rand -base64 32

# Subir (a primeira vez leva alguns minutos)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs caddy | tail -20   # deve citar o certificado emitido
```

Teste no navegador: `https://SEU-DOMINIO/api/health` deve mostrar
`"banco_de_dados":"conectado"`.

## 3. Primeiro administrador

O banco de produção começa vazio:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run seed:admin -- "Seu Nome" "12345678900" "admin" "UmaSenhaForte"
```

Depois entre em `https://SEU-DOMINIO`, cadastre o dispositivo e gere
a chave dele (Dispositivos › chave).

### Quero levar os dados do banco antigo

Só se o banco antigo tiver dados que importam. Com o projeto antigo
ainda de pé (antes do `docker compose down` do passo 2):

```bash
cd ~/SyncGate && docker compose exec -T mysql mariadb-dump -u root -p"SENHA_ROOT_ANTIGA" syncgate > ~/backup-syncgate.sql
```

Depois de subir a produção, importe e aplique as migrações que faltarem
(cada uma só roda uma vez; se disser que a coluna/regra já existe, pule):

```bash
cd ~/SyncGate/deploy
source .env
docker compose -f docker-compose.prod.yml exec -T mysql mariadb -u root -p"$MYSQL_ROOT_PASSWORD" syncgate < ~/backup-syncgate.sql
for m in 002_login_unico 003_chave_dispositivo 004_historico_imutavel 005_acesso_offline; do
  docker compose -f docker-compose.prod.yml exec -T mysql mariadb -u root -p"$MYSQL_ROOT_PASSWORD" syncgate < ../syncgate-backend/database/migracoes/$m.sql
done
```

## 4. ESP32

Segure o BOOT por 5 s, conecte o celular na rede `SyncGate-XXXX` e
preencha:

- **Wi-Fi:** a rede do local (2,4 GHz);
- **Endereço da API:** `https://SEU-DOMINIO/api/acesso/validar`;
- **ID e chave:** os do dispositivo cadastrado no painel de produção.

O firmware já tem o certificado raiz do Let's Encrypt, usado pelo Caddy.

## Atualizar depois

```bash
cd ~/SyncGate && git pull
cd deploy && docker compose -f docker-compose.prod.yml up -d --build
```

## Cuidados

- **Nunca** rode `docker compose ... down -v`: o `-v` apaga o banco
  (`syncgate_dados`) e o certificado (`caddy_dados`).
- Backup do banco: `docker compose -f docker-compose.prod.yml exec -T mysql mariadb-dump -u root -p"$MYSQL_ROOT_PASSWORD" syncgate > backup-$(date +%F).sql`
- O `.env` fica só na máquina virtual. Se ele vazar, gere segredos novos
  (trocar o `JWT_SECRET` desconecta todo mundo do painel).
