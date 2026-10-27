// ============================================================
// SyncGate — configuração do firmware (MODELO)
// ============================================================
// 1. Copie este arquivo e renomeie a cópia para  config.h
//    (na mesma pasta do syncgate-firmware.ino).
// 2. Preencha os valores abaixo.
//
// O config.h tem a senha do Wi-Fi e a chave do dispositivo, por
// isso ele está no .gitignore e NUNCA vai para o GitHub. Este
// arquivo de modelo (sem segredos) é o que fica no repositório.
// ============================================================

#pragma once

// ---- Wi-Fi ---------------------------------------------------
// O ESP32 só conecta em redes de 2,4 GHz (não funciona em 5 GHz).
#define WIFI_SSID   "EL_DESTILADOS"
#define WIFI_SENHA  "eldestilados123"

// ---- API do SyncGate -----------------------------------------
// Use o IP do computador onde o backend está rodando, NÃO
// "localhost" (para o ESP32, localhost é ele mesmo).
// Para descobrir o IP no Windows: abra o PowerShell e rode
//   ipconfig
// e procure "Endereço IPv4" do adaptador Wi-Fi (ex.: 192.168.0.15).
#define API_URL  "http://192.168.15.7:3000/api/acesso/validar"

// ---- Identificação do dispositivo ----------------------------
// No painel: Dispositivos → botão da chave (🔑) → "Gerar chave".
// O painel mostra exatamente estas duas linhas prontas para colar.
#define ID_DISPOSITIVO     1
#define CHAVE_DISPOSITIVO  "a3fb27edaf3b9e9ef1dbd9e976a46b25a005104ac2d098e367cbf9fe5ea24b5d"
