-- ============================================================
-- Migração 004: histórico de acessos imutável (RN08)
-- ============================================================
-- Use este script SÓ em um banco que já existia antes desta
-- correção. Bancos novos, criados pelo schema.sql atualizado,
-- já nascem assim.
--
-- O que muda:
--   1. Excluir um usuário ou cartão que tem acessos registrados
--      passa a ser recusado (antes, a referência era apagada do
--      histórico). Para tirar alguém do sistema, bloqueie.
--   2. Triggers recusam qualquer UPDATE ou DELETE na tabela acesso.
--
-- No Docker (PowerShell):
--   Get-Content syncgate-backend\database\migracoes\004_historico_imutavel.sql | docker compose exec -T mysql mariadb -u root -prootpassword syncgate
-- ============================================================

USE syncgate;

ALTER TABLE acesso
  DROP FOREIGN KEY fk_acesso_usuario,
  DROP FOREIGN KEY fk_acesso_cartao;

ALTER TABLE acesso
  ADD CONSTRAINT fk_acesso_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_acesso_cartao
    FOREIGN KEY (id_cartao) REFERENCES cartoes (id_cartao)
    ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TRIGGER IF EXISTS trg_acesso_bloqueia_update;
DROP TRIGGER IF EXISTS trg_acesso_bloqueia_delete;

CREATE TRIGGER trg_acesso_bloqueia_update BEFORE UPDATE ON acesso
  FOR EACH ROW SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'RN08: registros de acesso nao podem ser alterados';

CREATE TRIGGER trg_acesso_bloqueia_delete BEFORE DELETE ON acesso
  FOR EACH ROW SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'RN08: registros de acesso nao podem ser excluidos';
