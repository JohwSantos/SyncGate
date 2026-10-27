// ============================================================
// SyncGate — configuração do firmware (MODELO)
// ============================================================
// 1. Copie este arquivo e renomeie a cópia para  config.h
//    (na mesma pasta do syncgate-firmware.ino).
// 2. Preencha os valores abaixo.
//
// Estes valores são só o PADRÃO DE FÁBRICA. Depois de gravado,
// o ESP32 pode ser configurado pelo celular (página de
// configuração), sem reprogramar — e o que for salvo lá passa a
// valer no lugar daqui. Veja o README.md desta pasta.
//
// O config.h está no .gitignore e NUNCA vai para o GitHub
// (pode conter a chave do dispositivo).
// ============================================================

#pragma once

// ---- Endereço padrão da API ----------------------------------
// Na Azure, use o endereço público do backend (com https://), ex.:
//   "https://syncgate-api.azurewebsites.net/api/acesso/validar"
// Para testar com o backend no seu PC, use o IP dele com http://
// (não "localhost" — para o ESP32, localhost é ele mesmo), ex.:
//   "http://192.168.0.15:3000/api/acesso/validar"
#define API_URL_PADRAO  "https://SEU-APP.azurewebsites.net/api/acesso/validar"

// ---- Identificação padrão do dispositivo ---------------------
// No painel: Dispositivos → botão da chave (🔑) → "Gerar chave".
// Pode deixar 0 e "" aqui e preencher pela página de configuração.
#define ID_DISPOSITIVO_PADRAO     0
#define CHAVE_DISPOSITIVO_PADRAO  ""

// ---- Senha da rede de configuração ---------------------------
// Sem Wi-Fi salvo, o ESP32 cria a rede "SyncGate-XXXX" para você
// configurá-lo pelo celular. Esta é a senha dessa rede, para que
// ninguém por perto mude a configuração da catraca.
// Mínimo de 8 caracteres. TROQUE antes de instalar a catraca.
#define SENHA_PORTAL  "syncgate123"
