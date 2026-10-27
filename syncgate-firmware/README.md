# SyncGate — Firmware do leitor (ESP32 + RC522)

Código que roda no ESP32: lê o cartão RFID no leitor RC522, pergunta para a API do SyncGate se o acesso é permitido e mostra o resultado com LEDs e buzzer.

```
Cartão ──► RC522 ──SPI──► ESP32 ──Wi-Fi/HTTP──► API SyncGate
                            │                       │
                    LED verde/vermelho       registra o acesso e
                         + buzzer            avisa o painel (WebSocket)
```

Quem decide é **sempre a API**. O ESP32 não guarda lista de cartões: bloquear um usuário no painel vale na hora, sem reprogramar nada.

## Arquivos

| Arquivo | O que é |
|---|---|
| `syncgate-firmware.ino` | O programa do ESP32 |
| `certificados.h` | Certificados raiz usados para conferir o servidor em `https://` (Azure) — públicos, vão para o GitHub |
| `config.example.h` | Modelo dos valores **padrão de fábrica** (vai para o GitHub) |
| `config.h` | **Seus** valores padrão (API, ID, chave, senha do portal) — você cria a partir do modelo. Está no `.gitignore` e nunca vai para o GitHub |

## Como a configuração funciona

O ESP32 **não precisa ser reprogramado** para trocar de Wi-Fi, de servidor ou de chave. Tudo isso é configurado **pelo celular** e fica salvo na memória dele (não se perde ao desligar):

1. Sem Wi-Fi salvo, sem conseguir conectar, ou faltando a chave, o ESP32 cria a rede **`SyncGate-XXXX`** (LED verde **e** vermelho acesos).
2. No celular, conecte nessa rede — a senha é a `SENHA_PORTAL` do `config.h` (padrão `syncgate123`; **troque antes de instalar**).
3. A página de configuração abre sozinha (se não abrir, acesse `http://192.168.4.1`). Toque em **Configure WiFi**, escolha a rede e preencha:
   - **Endereço da API** — ex.: `https://syncgate-api.azurewebsites.net/api/acesso/validar`;
   - **ID do dispositivo** e **Chave** — do painel (Dispositivos → 🔑). Deixar a chave vazia mantém a atual.
4. Salve. O ESP32 conecta e passa a funcionar. Da próxima vez, conecta sozinho.

Se ninguém configurar em 3 minutos, ele reinicia e tenta o Wi-Fi salvo de novo — se o roteador estava só desligado, a catraca volta sozinha quando ele voltar.

**Para levar a catraca para outro lugar** (ou trocar tudo): segure o botão **BOOT** da placa por **5 segundos** (o vermelho pisca). A configuração é apagada e a rede `SyncGate-XXXX` volta.

Os valores do `config.h` são só o **padrão de fábrica** — usados enquanto nada foi salvo pelo celular. Com eles já preenchidos (API, ID e chave), basta escolher o Wi-Fi na página.

### HTTPS (Azure)

Com um endereço `https://`, o ESP32 confere o certificado do servidor usando os certificados raiz de `certificados.h` (DigiCert e Microsoft, usados pela Azure; e Let's Encrypt, para domínio próprio). Se o certificado não for de uma dessas autoridades, a conexão é recusada — ninguém consegue se passar pela sua API. Com `http://` (backend no seu PC, para testes), a conexão é comum.

## Ligação dos componentes

| RC522 | ESP32 |
|---|---|
| SDA (SS) | GPIO 5 |
| SCK | GPIO 18 |
| MOSI | GPIO 23 |
| MISO | GPIO 19 |
| RST | GPIO 22 |
| 3.3V | 3V3 — **nunca no 5V/VIN** |
| GND | GND |
| IRQ | não usado |

| Componente | ESP32 |
|---|---|
| LED verde (perna longa) | GPIO 2, com resistor de 220 Ω |
| LED vermelho (perna longa) | GPIO 4, com resistor de 220 Ω |
| Buzzer (+) | GPIO 15 |
| Pernas curtas dos LEDs e (−) do buzzer | GND |

Se a sua ligação for diferente, mude os números no começo do `syncgate-firmware.ino` (seção **Pinos**).

## Sinais

| O que aconteceu | LED | Buzzer |
|---|---|---|
| Modo de configuração (rede `SyncGate-XXXX` aberta) | verde **e** vermelho acesos | — |
| Segurando o BOOT para apagar a configuração | vermelho piscando | bipe longo ao apagar |
| Pronto para ler | — | 1 bipe curto |
| Acesso **permitido** | verde aceso 1,5 s | 1 bipe agudo |
| Acesso **negado** (cartão bloqueado, vencido, fora do horário...) | vermelho aceso 1,5 s | 2 bipes graves |
| **Problema** (sem Wi-Fi, API desligada, chave errada) | vermelho piscando 3× | 3 bipes curtos |
| RC522 não responde (fio solto) | vermelho piscando sem parar | bipes repetidos |

## Passo a passo — primeira vez

### 1. Instalar o Arduino IDE e a placa ESP32

1. Baixe e instale o **Arduino IDE 2** em <https://www.arduino.cc/en/software>.
2. Abra o Arduino IDE → **File → Preferences** (Arquivo → Preferências). Em **Additional boards manager URLs**, cole:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
3. Vá em **Tools → Board → Boards Manager**, pesquise **esp32** e instale **esp32 by Espressif Systems**.

### 2. Instalar as bibliotecas

Em **Tools → Manage Libraries** (ou o ícone de livros na lateral), pesquise e instale:

- **MFRC522** — autor *GithubCommunity*
- **ArduinoJson** — autor *Benoit Blanchon* (versão 7)
- **WiFiManager** — autor *tzapu*

### 3. Preparar o backend e gerar a chave

1. Suba o backend (Docker ou `npm run dev`) e aplique a migração `003_chave_dispositivo.sql` se o seu banco já existia.
2. No painel, vá em **Dispositivos**, cadastre a catraca (se ainda não existir) e clique no **botão da chave (🔑)** → **Gerar chave**.
3. **Copie as duas linhas** que aparecem (`ID_DISPOSITIVO` e `CHAVE_DISPOSITIVO`). A chave não é mostrada de novo — se perder, é só gerar outra.

### 4. Configurar o `config.h` (valores padrão)

1. Nesta pasta, copie `config.example.h` e renomeie a cópia para **`config.h`**.
2. Com o **Arduino IDE fechado** (ele sobrescreve arquivos abertos ao compilar), edite o `config.h`:
   - `API_URL_PADRAO` — na Azure: `https://SEU-APP.azurewebsites.net/api/acesso/validar`. Testando com o backend no seu PC: `http://IP_DO_PC:3000/api/acesso/validar` (IP do `ipconfig`, não `localhost`);
   - `ID_DISPOSITIVO_PADRAO` e `CHAVE_DISPOSITIVO_PADRAO` — do painel (pode deixar `0` e `""` e preencher depois pela página de configuração);
   - `SENHA_PORTAL` — senha da rede `SyncGate-XXXX` (mínimo 8 caracteres).

O Wi-Fi **não** vai no `config.h`: ele é escolhido pelo celular (veja "Como a configuração funciona").

### 5. Só para testes com o backend no seu PC: liberar a porta 3000

Com o backend na Azure, pule este passo. Rodando no PC, o Windows costuma bloquear conexões vindas de outros aparelhos da rede. Abra o **PowerShell como administrador** e rode uma vez:

```powershell
New-NetFirewallRule -DisplayName "SyncGate API (3000)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

> A rede Wi-Fi do PC precisa estar marcada como **Privada** (Configurações → Rede e Internet → Wi-Fi → propriedades da rede). O ESP32 e o PC precisam estar no **mesmo roteador**.

### 6. Gravar no ESP32

1. Conecte o ESP32 no USB. Se ele não aparecer em **Tools → Port**, instale o driver do chip USB da sua placa: **CP210x** (Silicon Labs) ou **CH340** (WCH) — está escrito no chip perto do conector USB.
2. Em **Tools → Board**, escolha **ESP32 Dev Module** e, em **Tools → Port**, a porta COM da placa.
3. Clique em **Upload** (seta →). Se ficar parado em `Connecting.....`, segure o botão **BOOT** da placa até começar a gravar.
4. Abra **Tools → Serial Monitor** e ajuste para **115200 baud**.

Você deve ver:

```
===== SyncGate - leitor de acesso =====
[RFID] Versao do RC522: 0x92
[Config] API: https://syncgate-api.azurewebsites.net/api/acesso/validar
[Config] ID do dispositivo: 1
[Config] Chave: b2ee93... (64 caracteres)
[WiFi] Conectando no Wi-Fi salvo...
[WiFi] Conectado em "MinhaRede"! IP do ESP32: 192.168.0.42
[SyncGate] Dispositivo 1 pronto.
[SyncGate] Aproxime um cartao do leitor...
```

Na primeira vez (sem Wi-Fi salvo), em vez de conectar aparece `MODO DE CONFIGURACAO` com as instruções — siga "Como a configuração funciona".

### 7. Cadastrar os cartões

Encoste um cartão ainda não cadastrado. O Monitor Serial mostra o UID:

```
[RFID] Cartao lido. UID: A1B2C3D4
[API] NEGADO: UID não cadastrado: A1B2C3D4
```

Cadastre esse UID no painel (**Cartões RFID → Vincular cartão**), exatamente como apareceu, e encoste de novo: agora deve acender o verde. A tentativa negada também fica no **Histórico** do painel, com o UID — dá para pegar de lá.

## Problemas comuns

| No Monitor Serial | Causa provável | O que fazer |
|---|---|---|
| `Versao do RC522: 0x00` ou `0xFF` | ESP32 não fala com o leitor | Confira os 7 fios, principalmente SDA→5 e RST→22, e se está no 3V3 |
| Volta sempre para `MODO DE CONFIGURACAO` | Senha do Wi-Fi errada, ou rede só de **5 GHz** (o ESP32 só enxerga 2,4 GHz) | Na página, a lista mostra só as redes que o ESP32 vê — escolha uma 2,4 GHz e confira a senha |
| `Falha de conexao: connection refused` | Endereço errado ou backend fora do ar | Confira o endereço da API (BOOT 5 s → página) e se o backend está no ar |
| `Falha de conexao` com `https://` | Certificado do servidor não confere com `certificados.h` | Confira se o endereço é o da Azure; com domínio próprio, use certificado DigiCert, Microsoft ou Let's Encrypt |
| `Falha de conexao: read Timeout` (backend no PC) | Firewall do Windows bloqueando | Faça o passo 5 |
| `401: chave ou ID do dispositivo invalidos` | Chave/ID errados, ou chave gerada de novo | Gere a chave no painel; segure o BOOT 5 s e cole a chave nova pela página |
| `429: leituras demais` | Mais de 60 leituras em 1 minuto | Aguarde um minuto |
| Bipe só faz "clique" ou fica mudo | Tipo do buzzer | Troque `BUZZER_PASSIVO` no começo do `.ino` |
| Erro de compilação `config.h: No such file` | `config.h` não foi criado | Faça o passo 4 |
