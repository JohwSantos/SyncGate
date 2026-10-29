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
//   5. Permitido: aciona o relé da catraca (RF05), acende o LED
//      verde e toca o buzzer. Negado: LED vermelho e dois bipes.
//   6. Mostra no Monitor Serial quanto tempo a decisão levou (RNF01).
//
// Quem decide se o acesso é permitido é a API — assim, bloquear um
// usuário no painel vale na hora, sem reprogramar o dispositivo.
//
// MODO OFFLINE (RNF08)
// De 5 em 5 minutos o ESP32 baixa da API a lista de cartões
// autorizados (com as janelas de horário) e guarda na memória flash.
// Se a API ficar fora de alcance, ele decide sozinho com essa lista
// e anota cada passagem numa fila, que é enviada para o histórico
// assim que a conexão volta. O relógio vem da internet (NTP).
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
#include <LittleFS.h>
#include <time.h>

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

// Relé que libera a catraca (RF05). Sem o módulo ligado, nada
// acontece no pino 26 e o LED verde aceso mostra a liberação.
const int PINO_RELE = 26;
// Módulos relé de 1 canal vêm em dois tipos. Se o relé ficar
// ligado o tempo todo e desligar ao passar o cartão, troque para false.
const bool RELE_ATIVA_EM_NIVEL_ALTO = true;
// Quanto tempo a catraca fica liberada para a pessoa passar.
const unsigned long TEMPO_LIBERACAO_MS = 3000;

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

// Tempo máximo para abrir a conexão com a API. Curto de propósito:
// se o servidor não responder, o leitor passa a decidir offline
// sem deixar a pessoa esperando na catraca (RNF01: até 2 s).
const int TIMEOUT_CONEXAO_MS = 1500;

// Depois de uma falha de conexão, o leitor decide offline na hora
// durante este tempo, sem esperar a API a cada cartão.
const unsigned long PAUSA_APOS_FALHA_MS = 30UL * 1000;

// Modo offline: de quanto em quanto tempo atualizar a lista de
// cartões e tentar enviar a fila de acessos guardados.
const unsigned long INTERVALO_LISTA_MS = 5UL * 60 * 1000;
const unsigned long INTERVALO_FILA_MS  = 30UL * 1000;
// Tamanho máximo da fila na flash (~1500 passagens).
const size_t TAMANHO_MAXIMO_FILA = 64 * 1024;
const char *ARQUIVO_LISTA = "/cartoes.json";
const char *ARQUIVO_FILA  = "/fila.jsonl";

// ---- Tipos ---------------------------------------------------
// Resultado da consulta à API.
// Precisa ficar AQUI EM CIMA, antes de qualquer função: o Arduino
// IDE cria sozinho as "declarações" das funções e as coloca no
// começo do arquivo — se o enum viesse depois, a declaração de
// validarNaApi() usaria um tipo que ainda não existe e daria o
// erro "'Resultado' does not name a type".
// SEM_CONEXAO = a API não respondeu: hora de decidir offline.
enum Resultado { PERMITIDO, NEGADO, ERRO, SEM_CONEXAO };

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

// Lista de cartões autorizados (cópia em RAM do ARQUIVO_LISTA).
JsonDocument listaCartoes;
unsigned long momentoUltimaLista = 0;
unsigned long momentoUltimoEnvioFila = 0;
unsigned long momentoFalhaApi = 0; // 0 = a última conexão deu certo


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

void acionarRele(bool ligado) {
  digitalWrite(PINO_RELE, ligado == RELE_ATIVA_EM_NIVEL_ALTO ? HIGH : LOW);
}

// Acesso PERMITIDO (RF05): libera a catraca pelo relé durante
// TEMPO_LIBERACAO_MS, com o LED verde aceso + um bipe agudo e curto.
void liberarCatraca() {
  acionarRele(true);
  digitalWrite(PINO_LED_VERDE, HIGH);
  bipe(2000, 150);
  delay(TEMPO_LIBERACAO_MS - 150);
  acionarRele(false);
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
  // MAC gravado de fábrica no chip: WiFi.macAddress() devolve zeros
  // antes de o Wi-Fi iniciar (dava "SyncGate-0000").
  uint64_t mac = ESP.getEfuseMac();
  char final[5];
  snprintf(final, sizeof(final), "%02X%02X", (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  return "SyncGate-" + String(final);
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
  // Já configurado (só o Wi-Fi está fora): a página fica aberta por
  // menos tempo, e depois a catraca segue funcionando offline.
  // Com Wi-Fi salvo (só a rede caiu), a página fica aberta 1 minuto e
  // depois a catraca segue offline. Sem Wi-Fi salvo, espera o tempo todo.
  bool wifiSalvo = gerenciador.getWiFiIsSaved();
  gerenciador.setConfigPortalTimeout(configuracaoCompleta() && wifiSalvo ? 60 : TEMPO_PORTAL_S);

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

  if (!configuracaoCompleta()) {
    // Ninguém configurou a tempo ou ainda falta algum campo:
    // reinicia e tenta de novo do começo.
    Serial.println("[WiFi] Configuracao incompleta. Reiniciando em 3 s...");
    delay(3000);
    ESP.restart();
  }

  if (!conectado && !wifiSalvo) {
    // Ninguém configurou o Wi-Fi: reinicia para abrir a página de novo.
    Serial.println("[WiFi] Nenhum Wi-Fi configurado. Reiniciando em 3 s...");
    delay(3000);
    ESP.restart();
  }

  if (!conectado) {
    // Configurado, mas o Wi-Fi não está disponível agora (RNF08):
    // segue funcionando com a lista local e reconecta sozinho depois.
    Serial.println("[WiFi] Sem Wi-Fi. Funcionando OFFLINE com a lista local; tentando reconectar em segundo plano.");
    WiFi.mode(WIFI_STA);
    WiFi.begin(); // usa o Wi-Fi salvo
    WiFi.setAutoReconnect(true);
    return;
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

// Envia um JSON por POST para a API e devolve o código HTTP
// (negativo = nem conseguiu falar com o servidor).
// http:// usa uma conexão comum; https:// usa uma conexão segura
// que confere o certificado do servidor contra os certificados
// raiz de certificados.h. Se o servidor não for quem diz ser, a
// conexão falha — os dados nunca chegam a um impostor.
int postarJson(const String &url, const String &corpo, String &resposta) {
  WiFiClient clienteComum;
  WiFiClientSecure clienteSeguro;
  HTTPClient http;
  http.setConnectTimeout(TIMEOUT_CONEXAO_MS);
  http.setTimeout(TIMEOUT_API_MS);

  bool iniciou;
  if (url.startsWith("https://")) {
    clienteSeguro.setCACert(CERTIFICADOS_RAIZ);
    iniciou = http.begin(clienteSeguro, url);
  } else {
    iniciou = http.begin(clienteComum, url);
  }

  if (!iniciou) {
    Serial.printf("[API] Endereco invalido: %s\n", url.c_str());
    return HTTPC_ERROR_CONNECTION_REFUSED;
  }

  http.addHeader("Content-Type", "application/json");
  // A chave secreta prova para a API que este é mesmo o
  // dispositivo cadastrado (sem ela, a API responde 401).
  http.addHeader("X-Dispositivo-Chave", chaveDispositivo);

  int codigo = http.POST(corpo);
  resposta = codigo > 0 ? http.getString() : "";
  // Guarda quando a API deixou de responder (| 1 evita o valor 0).
  momentoFalhaApi = codigo > 0 ? 0 : (millis() | 1);
  http.end();
  return codigo;
}

// As outras rotas do leitor ficam ao lado de /validar:
// ".../api/acesso/validar" -> ".../api/acesso/<rota>"
String urlDaRota(const char *rota) {
  int fim = apiUrl.lastIndexOf("/validar");
  if (fim < 0) return "";
  return apiUrl.substring(0, fim + 1) + rota;
}

// A API falhou há menos de PAUSA_APOS_FALHA_MS?
bool apiForaDoAr() {
  return momentoFalhaApi != 0 && millis() - momentoFalhaApi < PAUSA_APOS_FALHA_MS;
}

Resultado validarNaApi(const String &uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] Sem Wi-Fi.");
    return SEM_CONEXAO;
  }
  if (apiForaDoAr()) {
    Serial.println("[API] Fora do ar ha pouco; decidindo offline sem esperar.");
    return SEM_CONEXAO;
  }

  // Monta o corpo da requisição: {"uid":"A1B2C3D4","id_dispositivo":1}
  JsonDocument pedido;
  pedido["uid"] = uid;
  pedido["id_dispositivo"] = idDispositivo;
  String corpo;
  serializeJson(pedido, corpo);

  String resposta;
  int codigo = postarJson(apiUrl, corpo, resposta);

  // Códigos negativos = nem chegou a falar com a API
  // (servidor fora do ar, internet caiu, certificado recusado...).
  if (codigo <= 0) {
    Serial.printf("[API] Falha de conexao: %s\n", HTTPClient::errorToString(codigo).c_str());
    return SEM_CONEXAO;
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
// Modo offline (RNF08)
// ============================================================

// O relógio só está certo depois de sincronizar pela internet (NTP).
bool relogioCerto() {
  return time(nullptr) > 1700000000; // depois de nov/2023
}

void carregarListaDoArquivo() {
  File arquivo = LittleFS.open(ARQUIVO_LISTA, "r");
  if (!arquivo) {
    Serial.println("[Offline] Ainda nao ha lista local de cartoes.");
    return;
  }
  if (deserializeJson(listaCartoes, arquivo)) {
    Serial.println("[Offline] Lista local corrompida; sera baixada de novo.");
    listaCartoes.clear();
  } else {
    Serial.printf("[Offline] Lista local carregada: %d cartao(oes).\n", listaCartoes["cartoes"].size());
  }
  arquivo.close();
}

// Baixa da API a lista de cartões autorizados e guarda na flash.
void atualizarLista() {
  momentoUltimaLista = millis();
  if (WiFi.status() != WL_CONNECTED) return;

  String resposta;
  int codigo = postarJson(urlDaRota("cartoes-autorizados"), "{\"id_dispositivo\":" + String(idDispositivo) + "}", resposta);
  if (codigo != 200) {
    Serial.printf("[Offline] Nao foi possivel atualizar a lista (HTTP %d).\n", codigo);
    return;
  }

  JsonDocument nova;
  if (deserializeJson(nova, resposta) || !nova["cartoes"].is<JsonArray>()) {
    Serial.println("[Offline] Lista recebida invalida.");
    return;
  }

  File arquivo = LittleFS.open(ARQUIVO_LISTA, "w");
  if (arquivo) {
    arquivo.print(resposta);
    arquivo.close();
  }
  listaCartoes = nova;
  Serial.printf("[Offline] Lista atualizada: %d cartao(oes).\n", listaCartoes["cartoes"].size());
}

// Decide sem a API, com a lista local: o mesmo que a API faria
// para cartão ativo, dentro da validade, dono ativo e horário (RN06).
Resultado decidirOffline(const String &uid) {
  for (JsonObject cartao : listaCartoes["cartoes"].as<JsonArray>()) {
    if (uid != cartao["uid"].as<const char *>()) continue;

    // Sem janelas de horário: o dono pode passar a qualquer hora.
    if (!cartao["h"].is<JsonArray>()) return PERMITIDO;

    // Com horário restrito, só dá para conferir com o relógio certo.
    struct tm agora;
    if (!relogioCerto() || !getLocalTime(&agora, 10)) {
      Serial.println("[Offline] Relogio nao sincronizado: nao da para conferir o horario.");
      return NEGADO;
    }
    char hora[9];
    strftime(hora, sizeof(hora), "%H:%M:%S", &agora);
    // Cada janela: [dia da semana (0 = domingo), "HH:MM:SS", "HH:MM:SS"]
    for (JsonArray janela : cartao["h"].as<JsonArray>()) {
      if (janela[0].as<int>() == agora.tm_wday &&
          strcmp(hora, janela[1].as<const char *>()) >= 0 &&
          strcmp(hora, janela[2].as<const char *>()) <= 0) {
        return PERMITIDO;
      }
    }
    return NEGADO;
  }
  return NEGADO; // não está na lista: desconhecido, inativo, bloqueado...
}

// Anota a passagem decidida offline, para mandar ao histórico depois.
void guardarNaFila(const String &uid, bool permitido) {
  File arquivo = LittleFS.open(ARQUIVO_FILA, "a");
  if (!arquivo) return;
  if (arquivo.size() >= TAMANHO_MAXIMO_FILA) {
    Serial.println("[Offline] Fila cheia! Esta passagem nao sera registrada no historico.");
    arquivo.close();
    return;
  }
  // t = 0: relógio ainda não sincronizado (a API usa a hora de chegada).
  long instante = relogioCerto() ? (long)time(nullptr) : 0;
  arquivo.printf("{\"uid\":\"%s\",\"t\":%ld,\"p\":%s}\n", uid.c_str(), instante, permitido ? "true" : "false");
  arquivo.close();
}

// Envia a fila para a API, em lotes de até 100 passagens. Só apaga
// do arquivo o que a API confirmou ter recebido.
void enviarFila() {
  momentoUltimoEnvioFila = millis();
  if (WiFi.status() != WL_CONNECTED || !LittleFS.exists(ARQUIVO_FILA)) return;

  File arquivo = LittleFS.open(ARQUIVO_FILA, "r");
  if (!arquivo) return;

  JsonDocument pedido;
  pedido["id_dispositivo"] = idDispositivo;
  JsonArray registros = pedido["registros"].to<JsonArray>();
  String resto;
  while (arquivo.available()) {
    String linha = arquivo.readStringUntil('\n');
    if (linha.length() == 0) continue;
    if (registros.size() < 100) {
      JsonDocument item;
      if (!deserializeJson(item, linha)) registros.add(item);
    } else {
      resto += linha + "\n";
    }
  }
  arquivo.close();

  if (registros.size() == 0) {
    LittleFS.remove(ARQUIVO_FILA);
    return;
  }

  String corpo, resposta;
  serializeJson(pedido, corpo);
  int codigo = postarJson(urlDaRota("offline"), corpo, resposta);
  if (codigo != 200) {
    Serial.printf("[Offline] Fila nao enviada (HTTP %d); tento de novo depois.\n", codigo);
    return;
  }

  Serial.printf("[Offline] %d passagem(ns) enviada(s) ao historico: %s\n", registros.size(), resposta.c_str());
  if (resto.length() == 0) {
    LittleFS.remove(ARQUIVO_FILA);
  } else {
    File novo = LittleFS.open(ARQUIVO_FILA, "w");
    novo.print(resto);
    novo.close();
  }
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
  pinMode(PINO_RELE, OUTPUT);
  acionarRele(false); // catraca travada ao ligar
  apagarLeds();

  // Memória flash onde ficam a lista de cartões e a fila offline.
  // true = formata na primeira vez (placa nova).
  if (!LittleFS.begin(true)) {
    Serial.println("[Offline] Falha ao abrir a memoria flash: modo offline desativado.");
  }

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

  // Relógio pela internet, no horário de Brasília (UTC-3, sem horário
  // de verão). Necessário para conferir horários e datar a fila offline.
  configTzTime("<-03>3", "pool.ntp.org", "a.st1.ntp.br");

  carregarListaDoArquivo();
  atualizarLista();
  enviarFila();

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

  // Tarefas do modo offline, só com Wi-Fi e API respondendo
  // (com a API fora, cada tentativa travaria a leitura por 1,5 s).
  if (WiFi.status() == WL_CONNECTED && !apiForaDoAr()) {
    if (millis() - momentoUltimaLista >= INTERVALO_LISTA_MS) atualizarLista();
    if (millis() - momentoUltimoEnvioFila >= INTERVALO_FILA_MS) enviarFila();
  }

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

  // RNF01: tempo entre a leitura do cartão e a decisão.
  unsigned long inicio = millis();
  Resultado resultado = validarNaApi(uid);
  const char *modo = "online";

  if (resultado == SEM_CONEXAO) {
    // API fora de alcance: decide com a lista local e anota na fila.
    resultado = decidirOffline(uid);
    guardarNaFila(uid, resultado == PERMITIDO);
    modo = "offline";
    Serial.printf("[Offline] %s pela lista local (sera enviado ao historico depois).\n",
                  resultado == PERMITIDO ? "PERMITIDO" : "NEGADO");
  }

  Serial.printf("[Tempo] Decisao %s em %lu ms\n", modo, millis() - inicio);

  switch (resultado) {
    case PERMITIDO:
      liberarCatraca();
      break;
    case NEGADO:
      sinalNegado();
      break;
    default: // ERRO (chave errada, limite de leituras, resposta estranha)
      sinalErro();
      break;
  }

  // Conta o intervalo a partir do FIM do sinal, para que o mesmo
  // cartão ainda encostado não seja lido de novo logo em seguida.
  momentoUltimaLeitura = millis();
}
