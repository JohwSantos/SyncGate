// ============================================================
// SyncGate — Firmware do leitor de acesso (ESP32 + RC522)
// ============================================================
// O que este programa faz, em resumo:
//   1. Conecta no Wi-Fi.
//   2. Fica esperando um cartão RFID encostar no leitor RC522.
//   3. Lê o UID do cartão (o "número de série" dele).
//   4. Envia o UID para a API do SyncGate (/api/acesso/validar),
//      se identificando com a chave secreta deste dispositivo.
//   5. Acende o LED verde (permitido) ou vermelho (negado) e
//      toca o buzzer, conforme a resposta da API.
//
// Quem decide se o acesso é permitido é SEMPRE a API — o ESP32
// só lê o cartão e mostra o resultado. Assim, bloquear um usuário
// no painel vale na hora, sem precisar reprogramar o dispositivo.
//
// Bibliotecas necessárias (Arduino IDE → Gerenciador de Bibliotecas):
//   - MFRC522      (autor: GithubCommunity)
//   - ArduinoJson  (autor: Benoit Blanchon), versão 7
// WiFi.h, HTTPClient.h e SPI.h já vêm com a placa ESP32.
// ============================================================

#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// Wi-Fi, endereço da API, id e chave do dispositivo.
// Se der erro "config.h: No such file", copie o config.example.h
// para config.h e preencha (veja o README.md desta pasta).
#include "config.h"

// ---- Pinos ---------------------------------------------------
// Ligação do leitor RC522 (barramento SPI do ESP32).
// ATENÇÃO: o RC522 funciona em 3,3 V. Ligar no 5 V pode queimá-lo.
const int PINO_RFID_SS   = 5;   // SDA/SS do RC522
const int PINO_RFID_SCK  = 18;
const int PINO_RFID_MOSI = 23;
const int PINO_RFID_MISO = 19;
const int PINO_RFID_RST  = 22;

const int PINO_LED_VERDE    = 2;   // com resistor de 220 Ω
const int PINO_LED_VERMELHO = 4;   // com resistor de 220 Ω
const int PINO_BUZZER       = 15;

// Tipo do buzzer:
//   true  = buzzer PASSIVO (precisa de um sinal de frequência — tone())
//   false = buzzer ATIVO   (apita sozinho quando recebe energia)
// Se o bipe sair muito fraco ou só um "clique", troque este valor.
const bool BUZZER_PASSIVO = true;

// ---- Comportamento --------------------------------------------
// Ignora o MESMO cartão por este tempo depois de uma leitura, para
// uma pessoa que deixa o cartão encostado não gerar várias
// passagens (entrada, saída, entrada...) sem querer.
const unsigned long INTERVALO_MESMO_CARTAO_MS = 3000;

// Tempo máximo esperando a resposta da API.
const int TIMEOUT_API_MS = 5000;

// A cada quanto tempo tentar reconectar se o Wi-Fi cair.
const unsigned long INTERVALO_RECONEXAO_MS = 5000;

// ---- Tipos ---------------------------------------------------
// Resultado da consulta à API.
// Precisa ficar AQUI EM CIMA, antes de qualquer função: o Arduino
// IDE cria sozinho as "declarações" das funções e as coloca no
// começo do arquivo — se o enum viesse depois, a declaração de
// validarNaApi() usaria um tipo que ainda não existe e daria o
// erro "'Resultado' does not name a type".
enum Resultado { PERMITIDO, NEGADO, ERRO };

// ---- Variáveis globais ---------------------------------------
MFRC522 leitor(PINO_RFID_SS, PINO_RFID_RST);

String ultimoUid = "";
unsigned long momentoUltimaLeitura = 0;
unsigned long momentoUltimaTentativaWifi = 0;


// ============================================================
// Sinais visuais e sonoros
// ============================================================

void apagarLeds() {
  digitalWrite(PINO_LED_VERDE, LOW);
  digitalWrite(PINO_LED_VERMELHO, LOW);
}

// Um bipe com frequência (Hz) e duração (ms).
void bipe(int frequencia, int duracaoMs) {
  if (BUZZER_PASSIVO) {
    tone(PINO_BUZZER, frequencia, duracaoMs);
    delay(duracaoMs);
    noTone(PINO_BUZZER);
  } else {
    digitalWrite(PINO_BUZZER, HIGH);
    delay(duracaoMs);
    digitalWrite(PINO_BUZZER, LOW);
  }
}

// Acesso PERMITIDO: LED verde aceso + um bipe agudo e curto.
void sinalPermitido() {
  digitalWrite(PINO_LED_VERDE, HIGH);
  bipe(2000, 150);
  delay(1350);
  apagarLeds();
}

// Acesso NEGADO: LED vermelho aceso + dois bipes graves.
void sinalNegado() {
  digitalWrite(PINO_LED_VERMELHO, HIGH);
  bipe(400, 250);
  delay(100);
  bipe(400, 250);
  delay(900);
  apagarLeds();
}

// PROBLEMA (sem Wi-Fi, API fora do ar, chave errada...):
// LED vermelho piscando + três bipes curtos. É diferente do
// "negado" para quem está na catraca saber que o problema não
// é o cartão dela.
void sinalErro() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(PINO_LED_VERMELHO, HIGH);
    bipe(1000, 80);
    delay(80);
    digitalWrite(PINO_LED_VERMELHO, LOW);
    delay(170);
  }
}


// ============================================================
// Wi-Fi
// ============================================================

// Explica em português o código de status do Wi-Fi do ESP32.
const char *motivoWifi(wl_status_t status) {
  switch (status) {
    case WL_NO_SSID_AVAIL:
      return "rede nao encontrada (nome errado ou rede so de 5 GHz)";
    case WL_CONNECT_FAILED:
      return "falha ao conectar (senha errada?)";
    case WL_CONNECTION_LOST:
      return "conexao perdida";
    case WL_DISCONNECTED:
      return "desconectado (senha errada ou sinal fraco?)";
    default:
      return "ainda tentando";
  }
}

// Lista as redes Wi-Fi que o ESP32 está enxergando. Ajuda a
// descobrir se o nome no config.h está certo (maiúsculas contam!)
// e se a rede aparece — redes só de 5 GHz NÃO aparecem aqui.
void listarRedesVisiveis() {
  Serial.println("[WiFi] Procurando redes visiveis...");
  int quantidade = WiFi.scanNetworks();
  if (quantidade <= 0) {
    Serial.println("[WiFi] Nenhuma rede 2,4 GHz encontrada.");
    return;
  }
  for (int i = 0; i < quantidade; i++) {
    Serial.printf("   %2d) \"%s\"  (sinal %d dBm)%s\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                  WiFi.SSID(i) == WIFI_SSID ? "  <-- e a do config.h" : "");
  }
  WiFi.scanDelete();
}

// Conexão inicial: fica tentando (LED verde piscando) até conectar.
// A cada 20 s sem conseguir, mostra o motivo e as redes visíveis
// no Monitor Serial, e tenta de novo.
void conectarWifi() {
  WiFi.mode(WIFI_STA);

  while (true) {
    Serial.printf("[WiFi] Conectando em \"%s\"", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_SENHA);

    bool ledAceso = false;
    unsigned long inicio = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) {
      ledAceso = !ledAceso;
      digitalWrite(PINO_LED_VERDE, ledAceso ? HIGH : LOW);
      Serial.print(".");
      delay(300);
    }

    if (WiFi.status() == WL_CONNECTED) break;

    Serial.println();
    Serial.printf("[WiFi] Nao conectou: %s\n", motivoWifi(WiFi.status()));
    WiFi.disconnect();
    delay(200);
    listarRedesVisiveis();
    Serial.println("[WiFi] Tentando de novo...");
  }

  apagarLeds();
  Serial.println();
  Serial.print("[WiFi] Conectado! IP do ESP32: ");
  Serial.println(WiFi.localIP());
}

// Durante o funcionamento: se o Wi-Fi cair, tenta reconectar de
// tempos em tempos SEM travar o programa (por isso não usa while).
void manterWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long agora = millis();
  if (agora - momentoUltimaTentativaWifi < INTERVALO_RECONEXAO_MS) return;

  momentoUltimaTentativaWifi = agora;
  Serial.println("[WiFi] Sem conexão. Tentando reconectar...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
}


// ============================================================
// Leitor RFID
// ============================================================

// Converte os bytes do UID em texto hexadecimal, ex.: "A1B2C3D4".
// É nesse formato que o cartão deve ser cadastrado no painel.
String uidEmTexto(const MFRC522::Uid &uid) {
  String texto = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) texto += "0"; // ex.: 0x0A vira "0A"
    texto += String(uid.uidByte[i], HEX);
  }
  texto.toUpperCase();
  return texto;
}

// Confere se o RC522 está respondendo. Se o registrador de versão
// vier 0x00 ou 0xFF, o ESP32 não está "conversando" com o leitor:
// quase sempre é fio solto, trocado ou alimentação errada.
bool leitorRespondendo() {
  byte versao = leitor.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.printf("[RFID] Versão do RC522: 0x%02X\n", versao);
  return versao != 0x00 && versao != 0xFF;
}


// ============================================================
// Comunicação com a API
// ============================================================

Resultado validarNaApi(const String &uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] Sem Wi-Fi, não dá para validar.");
    return ERRO;
  }

  // Monta o corpo da requisição: {"uid":"A1B2C3D4","id_dispositivo":1}
  JsonDocument pedido;
  pedido["uid"] = uid;
  pedido["id_dispositivo"] = ID_DISPOSITIVO;
  String corpo;
  serializeJson(pedido, corpo);

  HTTPClient http;
  http.setTimeout(TIMEOUT_API_MS);
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  // A chave secreta prova para a API que este é mesmo o
  // dispositivo cadastrado (sem ela, a API responde 401).
  http.addHeader("X-Dispositivo-Chave", CHAVE_DISPOSITIVO);

  int codigo = http.POST(corpo);
  String resposta = http.getString();
  http.end();

  // Códigos negativos = nem chegou a falar com a API
  // (IP errado, backend desligado, firewall bloqueando...).
  if (codigo <= 0) {
    Serial.printf("[API] Falha de conexão: %s\n", HTTPClient::errorToString(codigo).c_str());
    Serial.println("      Confira o API_URL no config.h e se o backend está rodando.");
    return ERRO;
  }

  if (codigo == 401) {
    Serial.println("[API] 401: chave ou id do dispositivo inválidos. Confira o config.h.");
    return ERRO;
  }

  if (codigo == 429) {
    Serial.println("[API] 429: leituras demais em pouco tempo. Aguarde um minuto.");
    return ERRO;
  }

  if (codigo != 200) {
    Serial.printf("[API] Resposta inesperada (HTTP %d): %s\n", codigo, resposta.c_str());
    return ERRO;
  }

  // Lê a resposta: {"permitido":true,"tipo_movimento":"entrada","motivo":null}
  JsonDocument respostaJson;
  if (deserializeJson(respostaJson, resposta)) {
    Serial.println("[API] Resposta não é um JSON válido.");
    return ERRO;
  }

  bool permitido = respostaJson["permitido"] | false;
  const char *movimento = respostaJson["tipo_movimento"] | "?";
  const char *motivo = respostaJson["motivo"] | "";

  if (permitido) {
    Serial.printf("[API] PERMITIDO (%s)\n", movimento);
    return PERMITIDO;
  }

  Serial.printf("[API] NEGADO: %s\n", motivo);
  return NEGADO;
}


// ============================================================
// setup() roda uma vez quando o ESP32 liga
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("===== SyncGate — leitor de acesso =====");

  pinMode(PINO_LED_VERDE, OUTPUT);
  pinMode(PINO_LED_VERMELHO, OUTPUT);
  pinMode(PINO_BUZZER, OUTPUT);
  apagarLeds();

  // Inicia o barramento SPI com os pinos definidos lá em cima
  // e depois o leitor RC522.
  SPI.begin(PINO_RFID_SCK, PINO_RFID_MISO, PINO_RFID_MOSI, PINO_RFID_SS);
  leitor.PCD_Init();
  delay(50);

  if (!leitorRespondendo()) {
    Serial.println("[RFID] O RC522 NÃO está respondendo. Confira a ligação dos fios e o 3,3 V.");
    // Pisca o vermelho para sempre: não adianta continuar sem leitor.
    while (true) {
      sinalErro();
      delay(1000);
    }
  }

  conectarWifi();

  Serial.printf("[SyncGate] Dispositivo %d pronto. API: %s\n", ID_DISPOSITIVO, API_URL);
  Serial.println("[SyncGate] Aproxime um cartão do leitor...");
  bipe(1500, 80); // bipe curto de "pronto"
}


// ============================================================
// loop() roda sem parar depois do setup()
// ============================================================
void loop() {
  manterWifi();

  // Nenhum cartão novo encostado? Volta e espera.
  if (!leitor.PICC_IsNewCardPresent() || !leitor.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  String uid = uidEmTexto(leitor.uid);

  // Encerra a comunicação com este cartão (libera o leitor
  // para a próxima leitura).
  leitor.PICC_HaltA();
  leitor.PCD_StopCrypto1();

  // Mesmo cartão há pouco tempo? Ignora (ver INTERVALO_MESMO_CARTAO_MS).
  unsigned long agora = millis();
  if (uid == ultimoUid && agora - momentoUltimaLeitura < INTERVALO_MESMO_CARTAO_MS) {
    return;
  }
  ultimoUid = uid;
  momentoUltimaLeitura = agora;

  Serial.printf("\n[RFID] Cartão lido. UID: %s\n", uid.c_str());

  switch (validarNaApi(uid)) {
    case PERMITIDO:
      sinalPermitido();
      // Aqui é onde, no futuro, um relé acionaria a catraca, ex.:
      //   digitalWrite(PINO_RELE, HIGH); delay(1000); digitalWrite(PINO_RELE, LOW);
      break;
    case NEGADO:
      sinalNegado();
      break;
    case ERRO:
      sinalErro();
      break;
  }

  // Conta o intervalo a partir do FIM do sinal, para que o mesmo
  // cartão ainda encostado não seja lido de novo logo em seguida.
  momentoUltimaLeitura = millis();
}
