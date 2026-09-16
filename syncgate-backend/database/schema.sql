-- ============================================================
-- SyncGate - Schema do banco de dados
-- Sistema de Controle de Acesso (ETEC Zona Leste)
-- ============================================================
-- Este script cria as 6 tabelas do sistema, na ordem correta
-- (tabelas sem dependência primeiro, depois as que têm chave
-- estrangeira para elas).
-- ============================================================

CREATE DATABASE IF NOT EXISTS syncgate
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE syncgate;

-- ------------------------------------------------------------
-- Tabela: usuarios
-- ------------------------------------------------------------
-- Estratégia de herança "single table": Pessoa + Aluno/Professor/
-- Funcionario/Admin ficam todos nesta única tabela. O campo `tipo`
-- diz qual "subtipo" de pessoa é, e os campos que só fazem sentido
-- para alguns tipos (curso, turma, cargo) ficam nulos para os
-- outros. É uma simplificação intencional em troca de não ter
-- que fazer JOIN toda vez que for buscar um usuário.
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  cpf             VARCHAR(14)  NOT NULL,
  matricula       VARCHAR(20)  NULL,
  tipo            ENUM('aluno', 'professor', 'funcionario', 'admin') NOT NULL,
  email           VARCHAR(100) NULL,
  telefone        VARCHAR(20)  NULL,
  curso           VARCHAR(100) NULL,
  turma           VARCHAR(50)  NULL,
  cargo           VARCHAR(50)  NULL,
  login           VARCHAR(50)  NOT NULL,
  senha_hash      VARCHAR(255) NOT NULL,
  perfil          ENUM('operador', 'gestor', 'master') NULL,
  status          TINYINT(1)   NOT NULL DEFAULT 1, -- 1 = ativo, 0 = bloqueado (RN04)
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Só o CPF é único, por decisão do projeto (o login pode
  -- se repetir entre usuários — algo a ter em mente na etapa
  -- de autenticação, mais pra frente).
  CONSTRAINT uq_usuarios_cpf UNIQUE (cpf)
) ENGINE=InnoDB;

-- Índice de apoio para buscas por tipo (ex.: listar todos os alunos)
CREATE INDEX idx_usuarios_tipo ON usuarios (tipo);


-- ------------------------------------------------------------
-- Tabela: dispositivos
-- ------------------------------------------------------------
-- Representa cada catraca/leitor RFID instalado fisicamente.
-- ------------------------------------------------------------
CREATE TABLE dispositivos (
  id_dispositivo      INT AUTO_INCREMENT PRIMARY KEY,
  descricao           VARCHAR(100) NOT NULL,
  localizacao         VARCHAR(100) NULL,
  ip_local            VARCHAR(45)  NULL,
  status              ENUM('online', 'offline', 'manutencao') NOT NULL DEFAULT 'offline',
  ultima_comunicacao  DATETIME NULL
) ENGINE=InnoDB;


-- ------------------------------------------------------------
-- Tabela: cartoes
-- ------------------------------------------------------------
-- Cada cartão RFID físico, vinculado a um único usuário (RN02).
-- ------------------------------------------------------------
CREATE TABLE cartoes (
  id_cartao       INT AUTO_INCREMENT PRIMARY KEY,
  uid             VARCHAR(45) NOT NULL, -- identificador físico do cartão (RN05: único)
  ativo           TINYINT(1) NOT NULL DEFAULT 1,
  data_emissao    DATE NULL,
  data_validade   DATE NULL,
  id_usuario      INT NOT NULL,

  CONSTRAINT uq_cartoes_uid UNIQUE (uid),

  CONSTRAINT fk_cartoes_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_cartoes_usuario ON cartoes (id_usuario);


-- ------------------------------------------------------------
-- Tabela: horarios_acesso
-- ------------------------------------------------------------
-- Janelas de horário em que um usuário e/ou dispositivo tem
-- acesso liberado (RN06). Tanto id_usuario quanto id_dispositivo
-- são opcionais: uma regra pode valer para um usuário específico,
-- para um dispositivo específico, ou para os dois ao mesmo tempo.
-- ------------------------------------------------------------
CREATE TABLE horarios_acesso (
  id_horario      INT AUTO_INCREMENT PRIMARY KEY,
  dia_semana      ENUM('seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom') NOT NULL,
  hora_inicio     TIME NOT NULL,
  hora_fim        TIME NOT NULL,
  id_usuario      INT NULL,
  id_dispositivo  INT NULL,

  CONSTRAINT fk_horarios_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_horarios_dispositivo
    FOREIGN KEY (id_dispositivo) REFERENCES dispositivos (id_dispositivo)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_horarios_usuario ON horarios_acesso (id_usuario);
CREATE INDEX idx_horarios_dispositivo ON horarios_acesso (id_dispositivo);


-- ------------------------------------------------------------
-- Tabela: acesso
-- ------------------------------------------------------------
-- Log de cada tentativa de acesso (RN03: toda tentativa é
-- registrada, mesmo as negadas). É um log imutável (RN08) —
-- a aplicação nunca deve fazer UPDATE ou DELETE nesta tabela,
-- só INSERT. Essa regra é de responsabilidade da camada de
-- serviço/aplicação, o banco por si só não impede um DELETE.
--
-- id_usuario e id_cartao ficam NULL quando o UID lido não
-- corresponde a nenhum cartão cadastrado no sistema — nesse
-- caso, o motivo_negado descreve o problema (ex.: "UID não
-- cadastrado: A1B2C3D4").
-- ------------------------------------------------------------
CREATE TABLE acesso (
  id_acesso       INT AUTO_INCREMENT PRIMARY KEY,
  data_hora       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo_movimento  ENUM('entrada', 'saida') NOT NULL,
  status          ENUM('permitido', 'negado') NOT NULL,
  motivo_negado   VARCHAR(150) NULL,
  id_usuario      INT NULL,
  id_cartao       INT NULL,
  id_dispositivo  INT NOT NULL,

  CONSTRAINT fk_acesso_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_acesso_cartao
    FOREIGN KEY (id_cartao) REFERENCES cartoes (id_cartao)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT fk_acesso_dispositivo
    FOREIGN KEY (id_dispositivo) REFERENCES dispositivos (id_dispositivo)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Índices de apoio para as consultas mais comuns: histórico por
-- usuário, por dispositivo, e por período de tempo.
CREATE INDEX idx_acesso_usuario ON acesso (id_usuario);
CREATE INDEX idx_acesso_dispositivo ON acesso (id_dispositivo);
CREATE INDEX idx_acesso_data_hora ON acesso (data_hora);


-- ------------------------------------------------------------
-- Tabela: solicitacao_acesso
-- ------------------------------------------------------------
-- Fluxo de solicitação de acesso para visitantes. O solicitante
-- é um usuário já cadastrado no sistema (ex.: um funcionário
-- pedindo acesso para um visitante específico).
-- ------------------------------------------------------------
CREATE TABLE solicitacao_acesso (
  id_solicitacao        INT AUTO_INCREMENT PRIMARY KEY,
  data_solicitacao      DATE NOT NULL DEFAULT (CURRENT_DATE),
  motivo_visita         VARCHAR(150) NOT NULL,
  destinatario          VARCHAR(100) NULL,
  documento_visitante   VARCHAR(20) NULL,
  status                ENUM('pendente', 'aprovado', 'rejeitado') NOT NULL DEFAULT 'pendente',
  data_aprovacao        DATE NULL,
  id_usuario_solicitante INT NOT NULL,

  CONSTRAINT fk_solicitacao_usuario
    FOREIGN KEY (id_usuario_solicitante) REFERENCES usuarios (id_usuario)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_solicitacao_status ON solicitacao_acesso (status);
