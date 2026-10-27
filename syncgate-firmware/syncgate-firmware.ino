// ============================================================
// SyncGate — Firmware do leitor de acesso (ESP32 + RC522)
// ============================================================
// O que este programa faz, em resumo:
//   1. Conecta no Wi-Fi (configurado pelo celular, sem reprogramar).
//   2. Fica esperando um cartão RFID encostar no leitor RC522.
//   3. Lê o UID do cartão (o "número de série" dele).
//   4. Envia o UID para a API do SyncGate (/api/acesso/validar),
//      se identificando com a chave secreta deste dispositivo.
//      Funciona com http:// (testes no PC) e https:// (Azure).
//   5. Acende o LED verde (permitido) ou vermelho (negado) e
//      toca o buzzer, conforme a resposta da API.
//
// Quem decide se o acesso é permitido é SEMPRE a API — o ESP32
// só lê o cartão e mostra o resultado. Assim, bloquear um usuário
// no painel vale na hora, sem precisar reprogramar o dispositivo.
//
// CONFIGURAÇÃO PELO CELULAR (WiFiManager)
// Sem Wi-Fi salvo (ou faltando a chave), o ESP32 cria a rede
// "SyncGate-XXXX". Conecte nela pelo celular: abre uma página onde
// você escolhe o Wi-Fi e informa o endereço da API, o ID e a chave
// do dispositivo. Tudo fica salvo na memória do ESP32.
// Para apagar e configurar de novo: segure o botão BOOT por 5 s.
//
// Bibliotecas necessárias (Arduino IDE → Gerenciador de Bibliotecas):
//   - MFRC522      (autor: GithubCommunity)
//   - ArduinoJson  (autor: Benoit Blanchon), versão 7
//   - WiFiManager  (autor: tzapu)
// WiFi, HTTPClient, WiFiClientSecure, Preferences e SPI já vêm
// com a placa ESP32.
// ============================================================

#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFiManager.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// Valores padrão (API, ID, chave, senha do portal).
// Se der erro "config.h: No such file", copie o config.example.h
// para config.h e preencha (veja o README.md desta pasta).
#include "config.h"

// Certificados raiz usados para conferir o servidor em https://
#include "certificados.h"

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

// Botão BOOT da própria placa (GPIO 0). Segurar por 5 s apaga a
// configuração e reabre a página de configuração.
const int PINO_BOTAO_RESET = 0;

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

// Tempo máximo esperando a resposta da API. É maior que numa rede
// local porque a primeira conexão HTTPS (com a Azure) leva mais tempo.
const int TIMEOUT_API_MS = 8000;

// Por quanto tempo a página de configuração fica aberta esperando
// alguém configurar. Depois disso o ESP32 reinicia e tenta o Wi-Fi
// salvo de novo — assim, se o roteador estava só desligado, a
// catraca volta a funcionar sozinha quando ele voltar.
const int TEMPO_PORTAL_S = 180;

// Quanto tempo segurar o BOOT para apagar a configuração.
const unsigned long TEMPO_RESET_MS = 5000;

// A cada quanto tempo conferir se o Wi-Fi caiu.
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

// Configuração em uso (carregada da memória do ESP32 ou do config.h)
String apiUrl;
int idDispositivo = 0;
String chaveDispositivo;

// "Preferences" é a memória permanente do ESP32 (não apaga ao
// desligar). É onde guardamos o que foi configurado pelo celular.
Preferences memoria;

String ultimoUid = "";
unsigned long momentoUltimaLeitura = 0;
unsigned long momentoUltimaVerificacaoWifi = 0;


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
// Configuração (memória do ESP32)
// ============================================================

// Carrega a configuração salva. O que nunca foi salvo pelo
// celular usa o valor padrão do config.h.
void carregarConfiguracao() {
  memoria.begin("syncgate", true); // true = só leitura
  apiUrl = memoria.getString("api_url", API_URL_PADRAO);
  idDispositivo = memoria.getInt("id", ID_DISPOSITIVO_PADRAO);
  chaveDispositivo = memoria.getString("chave", CHAVE_DISPOSITIVO_PADRAO);
  memoria.end();
}

void salvarConfiguracao() {
  memoria.begin("syncgate", false);
  memoria.putString("api_url", apiUrl);
  memoria.putInt("id", idDispositivo);
  memoria.putString("chave", chaveDispositivo);
  memoria.end();
}

// A chave gerada pelo painel tem sempre 64 caracteres.
bool configuracaoCompleta() {
  return apiUrl.startsWith("http") && idDispositivo > 0 && chaveDispositivo.length() == 64;
}

// Mostra a configuração no Monitor Serial, escondendo a chave.
void mostrarConfiguracao() {
  Serial.printf("[Config] API: %s\n", apiUrl.c_str());
  Serial.printf("[Config] ID do dispositivo: %d\n", idDispositivo);
  if (chaveDispositivo.length() == 64) {
    Serial.printf("[Config] Chave: %s... (64 caracteres)\n", chaveDispositivo.substring(0, 6).c_str());
  } else {
    Serial.println("[Config] Chave: NAO CONFIGURADA");
  }
}


// ============================================================
// Wi-Fi + página de configuração (WiFiManager)
// ============================================================

// Fica true quando alguém salva a página de configuração.
bool configuracaoFoiSalva = false;

// Nome da rede de configuração: "SyncGate-" + final do MAC da placa,
// para dar para diferenciar várias catracas no mesmo lugar.
String nomeRedeConfiguracao() {
  String mac = WiFi.macAddress(); // "AA:BB:CC:DD:EE:FF"
  mac.replace(":", "");
  return "SyncGate-" + mac.substring(8);
}

// Conecta no Wi-Fi salvo. Se não houver Wi-Fi salvo, se não
// conseguir conectar, ou se faltar configurar a chave, abre a
// página de configuração (rede "SyncGate-XXXX").
void conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFiManager gerenciador;

  // Campos extras da página, além da escolha do Wi-Fi.
  // A chave começa vazia de propósito: quem abrir a página não
  // consegue ver a chave atual. Vazio = manter a que já está salva.
  char textoId[12];
  snprintf(textoId, sizeof(textoId), "%d", idDispositivo);
  WiFiManagerParameter campoUrl("api_url", "Endereco da API (https://.../api/acesso/validar)", apiUrl.c_str(), 150);
  WiFiManagerParameter campoId("id", "ID do dispositivo (painel: Dispositivos)", textoId, 10);
  WiFiManagerParameter campoChave("chave", "Chave do dispositivo (64 caracteres; vazio = manter a atual)", "", 65);
  gerenciador.addParameter(&campoUrl);
  gerenciador.addParameter(&campoId);
  gerenciador.addParameter(&campoChave);

  gerenciador.setSaveConfigCallback([]() { configuracaoFoiSalva = true; });
  // Salva os campos mesmo se a conexão com o Wi-Fi escolhido falhar
  // (ex.: senha digitada errada) — assim não precisa preencher tudo de novo.
  gerenciador.setBreakAfterConfig(true);
  gerenciador.setConnectTimeout(20);
  gerenciador.setConfigPortalTimeout(TEMPO_PORTAL_S);

  String nomeRede = nomeRedeConfiguracao();

  // Avisa no Serial e nos LEDs quando a página de configuração abrir.
  gerenciador.setAPCallback([nomeRede](WiFiManager *) {
    Serial.println();
    Serial.println("[Config] ====== MODO DE CONFIGURACAO ======");
    Serial.printf("[Config] 1. No celular, conecte na rede Wi-Fi \"%s\"\n", nomeRede.c_str());
    Serial.println("[Config]    (senha: a SENHA_PORTAL do config.h)");
    Serial.println("[Config] 2. A pagina abre sozinha. Se nao abrir, acesse http://192.168.4.1");
    Serial.println("[Config] 3. Toque em \"Configure WiFi\", escolha a rede e preencha os campos.");
    digitalWrite(PINO_LED_VERDE, HIGH);
    digitalWrite(PINO_LED_VERMELHO, HIGH);
  });

  bool conectado;
  if (configuracaoCompleta()) {
    Serial.println("[WiFi] Conectando no Wi-Fi salvo...");
    // Tenta o Wi-Fi salvo; se não der, abre a página sozinho.
    conectado = gerenciador.autoConnect(nomeRede.c_str(), SENHA_PORTAL);
  } else {
    Serial.println("[Config] Falta configurar a API, o ID ou a chave. Abrindo a pagina de configuracao...");
    conectado = gerenciador.startConfigPortal(nomeRede.c_str(), SENHA_PORTAL);
  }

  apagarLeds();

  if (configuracaoFoiSalva) {
    String novaUrl = String(campoUrl.getValue());
    novaUrl.trim();
    if (novaUrl.length() > 0) apiUrl = novaUrl;

    int novoId = atoi(campoId.getValue());
    if (novoId > 0) idDispositivo = novoId;

    String novaChave = String(campoChave.getValue());
    novaChave.trim();
    if (novaChave.length() == 64) {
      chaveDispositivo = novaChave;
    } else if (novaChave.length() > 0) {
      Serial.printf("[Config] Chave ignorada: tem %d caracteres (precisa ter 64).\n", novaChave.length());
    }

    salvarConfiguracao();
    Serial.println("[Config] Configuracao salva na memoria do ESP32.");
    mostrarConfiguracao();
    configuracaoFoiSalva = false;
  }

  if (!conectado || !configuracaoCompleta()) {
    // Ninguém configurou a tempo, o Wi-Fi não conectou, ou ainda
    // falta algum campo: reinicia e tenta de novo do começo.
    Serial.println("[WiFi] Sem Wi-Fi ou configuracao incompleta. Reiniciando em 3 s...");
    delay(3000);
    ESP.restart();
  }

  // Se o Wi-Fi cair depois, o próprio ESP32 tenta reconectar.
  WiFi.setAutoReconnect(true);

  Serial.print("[WiFi] Conectado em \"");
  Serial.print(WiFi.SSID());
  Serial.print("\"! IP do ESP32: ");
  Serial.println(WiFi.localIP());
}

// Durante o funcionamento: se o Wi-Fi cair, pede para reconectar
// de tempos em tempos SEM travar o programa.
void manterWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long agora = millis();
  if (agora - momentoUltimaVerificacaoWifi < INTERVALO_RECONEXAO_MS) return;

  momentoUltimaVerificacaoWifi = agora;
  Serial.println("[WiFi] Sem conexao. Tentando reconectar...");
  WiFi.reconnect();
}

// Segurar o botão BOOT por TEMPO_RESET_MS apaga o Wi-Fi e a
// configuração salvos e reinicia — o ESP32 volta para o modo de
// configuração. Útil para levar a catraca para outro local.
void verificarBotaoReset() {
  if (digitalRead(PINO_BOTAO_RESET) != LOW) return;

  Serial.println("[Config] Botao BOOT pressionado. Segure por 5 s para apagar a configuracao...");
  unsigned long inicio = millis();
  while (digitalRead(PINO_BOTAO_RESET) == LOW) {
    // Vermelho piscando enquanto o botão está pressionado.
    digitalWrite(PINO_LED_VERMELHO, (millis() / 200) % 2 ? HIGH : LOW);

    if (millis() - inicio >= TEMPO_RESET_MS) {
      Serial.println("[Config] Apagando Wi-Fi e configuracao...");
      WiFiManager gerenciador;
      gerenciador.resetSettings(); // apaga o Wi-Fi salvo
      memoria.begin("syncgate", false);
      memoria.clear(); // apaga API, ID e chave (voltam ao padrão do config.h)
      memoria.end();
      bipe(1500, 500);
      ESP.restart();
    }
    delay(20);
  }

  apagarLeds();
  Serial.println("[Config] Botao solto antes de 5 s. Nada foi apagado.");
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
  Serial.printf("[RFID] Versao do RC522: 0x%02X\n", versao);
  return versao != 0x00 && versao != 0xFF;
}


// ============================================================
// Comunicação com a API
// ============================================================

Resultado validarNaApi(const String &uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] Sem Wi-Fi, nao da para validar.");
    return ERRO;
  }

  // Monta o corpo da requisição: {"uid":"A1B2C3D4","id_dispositivo":1}
  JsonDocument pedido;
  pedido["uid"] = uid;
  pedido["id_dispositivo"] = idDispositivo;
  String corpo;
  serializeJson(pedido, corpo);

  // http:// usa uma conexão comum; https:// usa uma conexão segura
  // que confere o certificado do servidor contra os certificados
  // raiz de certificados.h. Se o servidor não for quem diz ser, a
  // conexão falha — os dados nunca chegam a um impostor.
  WiFiClient clienteComum;
  WiFiClientSecure clienteSeguro;
  HTTPClient http;
  http.setTimeout(TIMEOUT_API_MS);

  bool iniciou;
  if (apiUrl.startsWith("https://")) {
    clienteSeguro.setCACert(CERTIFICADOS_RAIZ);
    iniciou = http.begin(clienteSeguro, apiUrl);
  } else {
    iniciou = http.begin(clienteComum, apiUrl);
  }

  if (!iniciou) {
    Serial.printf("[API] Endereco invalido: %s\n", apiUrl.c_str());
    return ERRO;
  }

  http.addHeader("Content-Type", "application/json");
  // A chave secreta prova para a API que este é mesmo o
  // dispositivo cadastrado (sem ela, a API responde 401).
  http.addHeader("X-Dispositivo-Chave", chaveDispositivo);

  int codigo = http.POST(corpo);
  String resposta = http.getString();
  http.end();

  // Códigos negativos = nem chegou a falar com a API
  // (endereço errado, servidor fora do ar, certificado recusado...).
  if (codigo <= 0) {
    Serial.printf("[API] Falha de conexao: %s\n", HTTPClient::errorToString(codigo).c_str());
    Serial.println("      Confira o endereco da API e se o backend esta no ar.");
    return ERRO;
  }

  if (codigo == 401) {
    Serial.println("[API] 401: chave ou ID do dispositivo invalidos.");
    Serial.println("      Segure o BOOT por 5 s e configure de novo pelo celular.");
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
    Serial.println("[API] Resposta nao e um JSON valido.");
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
  Serial.println("===== SyncGate - leitor de acesso =====");

  pinMode(PINO_LED_VERDE, OUTPUT);
  pinMode(PINO_LED_VERMELHO, OUTPUT);
  pinMode(PINO_BUZZER, OUTPUT);
  pinMode(PINO_BOTAO_RESET, INPUT_PULLUP);
  apagarLeds();

  // Inicia o barramento SPI com os pinos definidos lá em cima
  // e depois o leitor RC522.
  SPI.begin(PINO_RFID_SCK, PINO_RFID_MISO, PINO_RFID_MOSI, PINO_RFID_SS);
  leitor.PCD_Init();
  delay(50);

  if (!leitorRespondendo()) {
    Serial.println("[RFID] O RC522 NAO esta respondendo. Confira a ligacao dos fios e o 3,3 V.");
    // Pisca o vermelho para sempre: não adianta continuar sem leitor.
    while (true) {
      sinalErro();
      delay(1000);
    }
  }

  carregarConfiguracao();
  mostrarConfiguracao();

  conectarWifi();

  Serial.printf("[SyncGate] Dispositivo %d pronto.\n", idDispositivo);
  Serial.println("[SyncGate] Aproxime um cartao do leitor...");
  bipe(1500, 80); // bipe curto de "pronto"
}


// ============================================================
// loop() roda sem parar depois do setup()
// ============================================================
void loop() {
  verificarBotaoReset();
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

  Serial.printf("\n[RFID] Cartao lido. UID: %s\n", uid.c_str());

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
