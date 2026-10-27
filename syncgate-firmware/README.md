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
| `config.example.h` | Modelo de configuração (vai para o GitHub) |
| `config.h` | **Sua** configuração, com a senha do Wi-Fi e a chave — você cria a partir do modelo. Está no `.gitignore` e nunca vai para o GitHub |

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
| Ligando / conectando no Wi-Fi | verde piscando | — |
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

### 3. Preparar o backend e gerar a chave

1. Suba o backend (Docker ou `npm run dev`) e aplique a migração `003_chave_dispositivo.sql` se o seu banco já existia.
2. No painel, vá em **Dispositivos**, cadastre a catraca (se ainda não existir) e clique no **botão da chave (🔑)** → **Gerar chave**.
3. **Copie as duas linhas** que aparecem (`ID_DISPOSITIVO` e `CHAVE_DISPOSITIVO`). A chave não é mostrada de novo — se perder, é só gerar outra.

### 4. Configurar o `config.h`

1. Nesta pasta, copie `config.example.h` e renomeie a cópia para **`config.h`**.
2. Abra o `syncgate-firmware.ino` no Arduino IDE (o `config.h` aparece como uma aba ao lado).
3. Preencha no `config.h`:
   - `WIFI_SSID` e `WIFI_SENHA` — rede **2,4 GHz** (o ESP32 não conecta em 5 GHz);
   - `API_URL` — com o **IP do seu PC**, não `localhost`. No PowerShell, rode `ipconfig` e use o "Endereço IPv4" do adaptador Wi-Fi. Ex.: `http://192.168.0.15:3000/api/acesso/validar`;
   - `ID_DISPOSITIVO` e `CHAVE_DISPOSITIVO` — as linhas copiadas do painel.

### 5. Liberar a porta 3000 no Firewall do Windows

O Windows costuma bloquear conexões vindas de outros aparelhos da rede. Abra o **PowerShell como administrador** e rode uma vez:

```powershell
New-NetFirewallRule -DisplayName "SyncGate API (3000)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

> A rede Wi-Fi do PC precisa estar marcada como **Privada** (Configurações → Rede e Internet → Wi-Fi → propriedades da rede).

Para testar: no celular, conectado no mesmo Wi-Fi, abra `http://SEU_IP:3000/api/health`. Se abrir, o ESP32 também vai conseguir.

### 6. Gravar no ESP32

1. Conecte o ESP32 no USB. Se ele não aparecer em **Tools → Port**, instale o driver do chip USB da sua placa: **CP210x** (Silicon Labs) ou **CH340** (WCH) — está escrito no chip perto do conector USB.
2. Em **Tools → Board**, escolha **ESP32 Dev Module** e, em **Tools → Port**, a porta COM da placa.
3. Clique em **Upload** (seta →). Se ficar parado em `Connecting.....`, segure o botão **BOOT** da placa até começar a gravar.
4. Abra **Tools → Serial Monitor** e ajuste para **115200 baud**.

Você deve ver:

```
===== SyncGate — leitor de acesso =====
[RFID] Versão do RC522: 0x92
[WiFi] Conectando em "MinhaRede"....
[WiFi] Conectado! IP do ESP32: 192.168.0.42
[SyncGate] Dispositivo 1 pronto. API: http://192.168.0.15:3000/api/acesso/validar
[SyncGate] Aproxime um cartão do leitor...
```

### 7. Cadastrar os cartões

Encoste um cartão ainda não cadastrado. O Monitor Serial mostra o UID:

```
[RFID] Cartão lido. UID: A1B2C3D4
[API] NEGADO: UID não cadastrado: A1B2C3D4
```

Cadastre esse UID no painel (**Cartões RFID → Vincular cartão**), exatamente como apareceu, e encoste de novo: agora deve acender o verde. A tentativa negada também fica no **Histórico** do painel, com o UID — dá para pegar de lá.

## Problemas comuns

| No Monitor Serial | Causa provável | O que fazer |
|---|---|---|
| `Versão do RC522: 0x00` ou `0xFF` | ESP32 não fala com o leitor | Confira os 7 fios, principalmente SDA→5 e RST→22, e se está no 3V3 |
| Fica em `Conectando....` para sempre | SSID/senha errados ou rede 5 GHz | Confira o `config.h`; use uma rede 2,4 GHz |
| `Falha de conexão: connection refused` | IP errado ou backend desligado | Confira o `API_URL` e se o backend está rodando |
| `Falha de conexão: read Timeout` / `connection lost` | Firewall do Windows bloqueando | Faça o passo 5 |
| `401: chave ou id do dispositivo inválidos` | Chave/ID errados, ou chave gerada de novo | Gere a chave no painel e copie as duas linhas para o `config.h` |
| `429: leituras demais` | Mais de 60 leituras em 1 minuto | Aguarde um minuto |
| Bipe só faz "clique" ou fica mudo | Tipo do buzzer | Troque `BUZZER_PASSIVO` no começo do `.ino` |
| Erro de compilação `config.h: No such file` | `config.h` não foi criado | Faça o passo 4 |
