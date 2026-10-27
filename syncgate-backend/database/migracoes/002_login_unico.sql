-- ============================================================
-- Migração 002: torna o login dos usuários único
-- ============================================================
-- Use este script SÓ em um banco que já existia antes desta
-- correção. Bancos novos, criados pelo schema.sql atualizado,
-- já nascem com a restrição e não precisam dele.
--
-- Como rodar:
--   mysql -u root syncgate < database/migracoes/002_login_unico.sql
--
-- No Docker:
--   docker compose exec -T mysql mariadb -u root -prootpassword syncgate < syncgate-backend/database/migracoes/002_login_unico.sql
-- ============================================================

USE syncgate;

-- PASSO 1 — Conferir se já existem logins repetidos.
-- Se esta consulta mostrar alguma linha, a migração vai FALHAR
-- no passo 2. Nesse caso, edite um dos usuários repetidos (pelo
-- banco, já que o login não é editável pelo painel) e rode de novo:
--   UPDATE usuarios SET login = 'novo_login' WHERE id_usuario = <id>;
SELECT login, COUNT(*) AS quantidade, GROUP_CONCAT(id_usuario) AS ids
  FROM usuarios
 GROUP BY login
HAVING COUNT(*) > 1;

-- PASSO 2 — Criar a restrição de login único.
ALTER TABLE usuarios
  ADD CONSTRAINT uq_usuarios_login UNIQUE (login);
