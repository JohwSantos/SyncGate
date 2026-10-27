-- ============================================================
-- Migração 003: chave de API dos dispositivos (ESP32)
-- ============================================================
-- Adiciona a coluna onde fica o hash da chave secreta de cada
-- dispositivo. Use SÓ em um banco que já existia antes desta
-- correção — bancos novos, criados pelo schema.sql atualizado,
-- já nascem com a coluna.
--
-- Depois de aplicar, gere a chave de cada dispositivo pelo painel
-- (tela Dispositivos → botão "Gerar chave"). Sem chave, o
-- dispositivo recebe 401 ao tentar validar um acesso.
--
-- Como rodar (PowerShell):
--   Get-Content syncgate-backend\database\migracoes\003_chave_dispositivo.sql | mysql -u root syncgate
-- No Docker (PowerShell):
--   Get-Content syncgate-backend\database\migracoes\003_chave_dispositivo.sql | docker compose exec -T mysql mariadb -u root -prootpassword syncgate
-- ============================================================

USE syncgate;

ALTER TABLE dispositivos
  ADD COLUMN chave_api_hash CHAR(64) NULL AFTER ultima_comunicacao;
