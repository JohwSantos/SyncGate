-- ============================================================
-- Migração 005: acessos registrados pelo leitor sem internet (RNF08)
-- ============================================================
-- Use este script SÓ em um banco que já existia antes desta
-- correção. Bancos novos, criados pelo schema.sql atualizado,
-- já nascem com a coluna.
--
-- No Docker (PowerShell):
--   Get-Content syncgate-backend\database\migracoes\005_acesso_offline.sql | docker compose exec -T mysql mariadb -u root -prootpassword syncgate
-- ============================================================

USE syncgate;

ALTER TABLE acesso
  ADD COLUMN origem ENUM('online', 'offline') NOT NULL DEFAULT 'online' AFTER id_dispositivo;
