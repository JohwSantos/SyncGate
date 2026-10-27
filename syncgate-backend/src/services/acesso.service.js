const acessoModel = require('../models/acesso.model');
const cartaoModel = require('../models/cartao.model');
const usuarioModel = require('../models/usuario.model');
const dispositivoModel = require('../models/dispositivo.model');
const horarioModel = require('../models/horarioAcesso.model');
const websocket = require('../websocket/socket');
const env = require('../config/env');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

// Dia da semana, hora e data atuais SEMPRE no fuso configurado
// (America/Sao_Paulo por padrão), e não no relógio do servidor.
// Antes usávamos new Date().getDay() e toTimeString(), que seguem
// o fuso da máquina — no Docker (UTC) isso deixava as regras de
// horário 3 horas adiantadas.
//
// Intl.DateTimeFormat é nativo do JavaScript: ele "traduz" um
// instante para o horário de um fuso específico.
const DIAS = { Sun: 'dom', Mon: 'seg', Tue: 'ter', Wed: 'qua', Thu: 'qui', Fri: 'sex', Sat: 'sab' };

const formatoDia = new Intl.DateTimeFormat('en-US', {
  timeZone: env.timezone,
  weekday: 'short', // "Mon", "Tue", ...
});

const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: env.timezone,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23', // 00-23 (nunca "24:00")
});

// O formato 'en-CA' escreve datas como "2026-10-26" (ano-mês-dia),
// que pode ser comparado como texto: "2026-10-25" < "2026-10-26".
const formatoData = new Intl.DateTimeFormat('en-CA', {
  timeZone: env.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Formato usado no banco (seg, ter, ...)
function diaSemanaAtual(agora = new Date()) {
  return DIAS[formatoDia.format(agora)];
}

// "HH:MM:SS", para comparar com as colunas TIME do banco
function horaAtual(agora = new Date()) {
  return formatoHora.format(agora);
}

// "AAAA-MM-DD" de um instante, no fuso do sistema
function dataNoFuso(instante = new Date()) {
  return formatoData.format(instante);
}

// Um cartão vale até o FIM do dia de validade (inclusive).
// Sem data de validade cadastrada, o cartão não vence.
function cartaoVencido(cartao) {
  if (!cartao.data_validade) return false;
  return dataNoFuso(new Date(cartao.data_validade)) < dataNoFuso();
}

// Decide se a próxima passagem do usuário é entrada ou saída,
// olhando a última passagem PERMITIDA dele: se foi "entrada", a
// próxima é "saida", e vice-versa. Sem passagem anterior, é "entrada".
//
// Só contam as permitidas porque uma tentativa negada não mudou a
// pessoa de lugar: se ela estava dentro e teve a saída negada,
// continua dentro, e a próxima passagem ainda é uma saída.
async function decidirTipoMovimento(idUsuario) {
  if (!idUsuario) return 'entrada';
  const ultimo = await acessoModel.buscarUltimoPermitidoPorUsuario(idUsuario);
  if (!ultimo) return 'entrada';
  return ultimo.tipo_movimento === 'entrada' ? 'saida' : 'entrada';
}

// O dispositivo acabou de se comunicar com a API: registramos a
// "última comunicação" e, se ele estava marcado como offline,
// passamos para online e avisamos o painel em tempo real.
// "manutencao" é uma decisão de um administrador, então não é
// alterada automaticamente.
async function registrarComunicacao(dispositivo) {
  const novoStatus = dispositivo.status === 'offline' ? 'online' : dispositivo.status;
  const atualizado = await dispositivoModel.atualizarStatus(dispositivo.id_dispositivo, novoStatus);

  if (dispositivo.status !== novoStatus) {
    websocket.emitir('dispositivo-atualizado', atualizado);
  }
}

// Função central: recebe o UID lido pelo dispositivo e o id do
// dispositivo, e decide se o acesso é permitido ou negado — sempre
// registrando o resultado (RN03, RN08).
//
// Ordem das verificações:
//   1. dispositivo existe        (senão: 404, nada é registrado)
//   2. dispositivo não está em manutenção
//   3. UID cadastrado
//   4. cartão ativo
//   5. cartão dentro da validade
//   6. usuário ativo (RN04)
//   7. horário permitido (RN06)
async function validarAcesso({ uid, id_dispositivo }) {
  if (!uid || !id_dispositivo) {
    throw erroComStatus('Campos obrigatórios: uid, id_dispositivo', 400);
  }

  // 1. Dispositivo precisa existir. Se não existir, não registramos
  // nada (decisão do projeto): não dá pra logar um acesso "órfão".
  const dispositivo = await dispositivoModel.buscarPorId(id_dispositivo);
  if (!dispositivo) {
    throw erroComStatus('Dispositivo não encontrado', 404);
  }

  await registrarComunicacao(dispositivo);

  // Função auxiliar para não repetir a chamada ao model em cada "negado".
  // O tipo_movimento gravado é o que a pessoa TENTOU fazer (entrar
  // ou sair) — como a tentativa foi negada, ela não altera o estado.
  async function negar(motivo, idUsuario, idCartao) {
    const tipo_movimento = await decidirTipoMovimento(idUsuario);
    const registro = await acessoModel.registrar({
      tipo_movimento,
      status: 'negado',
      motivo_negado: motivo,
      id_usuario: idUsuario,
      id_cartao: idCartao,
      id_dispositivo,
    });

    // Avisa o painel em tempo real, mesmo em caso de negação —
    // um acesso negado é justamente o tipo de evento que um
    // operador precisa ver acontecer na hora.
    websocket.emitir('novo-acesso', { permitido: false, motivo, registro });

    return { permitido: false, motivo, registro };
  }

  // 2. Catraca em manutenção não libera ninguém.
  if (dispositivo.status === 'manutencao') {
    const cartaoLido = await cartaoModel.buscarPorUid(uid);
    return negar(
      'Dispositivo em manutenção',
      cartaoLido ? cartaoLido.id_usuario : null,
      cartaoLido ? cartaoLido.id_cartao : null
    );
  }

  // 3. UID precisa corresponder a um cartão cadastrado.
  const cartao = await cartaoModel.buscarPorUid(uid);
  if (!cartao) {
    return negar(`UID não cadastrado: ${uid}`, null, null);
  }

  // 4. Cartão precisa estar ativo.
  if (!cartao.ativo) {
    return negar('Cartão inativo', cartao.id_usuario, cartao.id_cartao);
  }

  // 5. Cartão precisa estar dentro da validade.
  if (cartaoVencido(cartao)) {
    return negar('Cartão vencido', cartao.id_usuario, cartao.id_cartao);
  }

  // 6. Usuário do cartão precisa estar ativo (não bloqueado — RN04).
  const usuario = await usuarioModel.buscarPorId(cartao.id_usuario);
  if (!usuario || !usuario.status) {
    return negar('Usuário bloqueado', cartao.id_usuario, cartao.id_cartao);
  }

  // 7. Restrição por horário (RN06). Só se aplica se o usuário
  // tiver alguma regra configurada — sem regra, não há restrição.
  // Uma regra ligada a um dispositivo só vale para ele; uma regra
  // sem dispositivo vale para todos.
  const totalRegras = await horarioModel.contarRegrasDoUsuario(usuario.id_usuario);
  if (totalRegras > 0) {
    const permitidoAgora = await horarioModel.existeRegraValidaAgora(
      usuario.id_usuario,
      dispositivo.id_dispositivo,
      diaSemanaAtual(),
      horaAtual()
    );
    if (!permitidoAgora) {
      return negar('Fora do horário permitido', usuario.id_usuario, cartao.id_cartao);
    }
  }

  // Tudo certo: acesso permitido.
  const tipo_movimento = await decidirTipoMovimento(usuario.id_usuario);
  const registro = await acessoModel.registrar({
    tipo_movimento,
    status: 'permitido',
    id_usuario: usuario.id_usuario,
    id_cartao: cartao.id_cartao,
    id_dispositivo,
  });

  const resultado = {
    permitido: true,
    tipo_movimento,
    usuario: { id_usuario: usuario.id_usuario, nome: usuario.nome, tipo: usuario.tipo },
    registro,
  };

  websocket.emitir('novo-acesso', resultado);

  return resultado;
}

async function listar() {
  return acessoModel.listarTodos();
}

async function listarPaginado(pagina, limite, filtros) {
  return acessoModel.listarPaginado(pagina, limite, filtros);
}

async function buscarPorId(id) {
  const acesso = await acessoModel.buscarPorId(id);
  if (!acesso) {
    throw erroComStatus('Registro de acesso não encontrado', 404);
  }
  return acesso;
}

module.exports = {
  validarAcesso,
  listar,
  listarPaginado,
  buscarPorId,
};
