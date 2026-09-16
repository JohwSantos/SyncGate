const acessoModel = require('../models/acesso.model');
const cartaoModel = require('../models/cartao.model');
const usuarioModel = require('../models/usuario.model');
const dispositivoModel = require('../models/dispositivo.model');
const horarioModel = require('../models/horarioAcesso.model');
const websocket = require('../websocket/socket');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

// Converte o dia da semana atual (0=domingo ... 6=sábado, padrão
// do JavaScript) para o formato usado no banco (seg, ter, ...).
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
function diaSemanaAtual() {
  return DIAS[new Date().getDay()];
}

// Formata a hora atual como "HH:MM:SS", para comparar com as
// colunas TIME do banco.
function horaAtual() {
  return new Date().toTimeString().slice(0, 8);
}

// Decide se a próxima passagem do usuário é entrada ou saída,
// olhando o último registro dele: se a última foi "entrada",
// a próxima é "saida", e vice-versa. Se não há registro anterior,
// consideramos a primeira passagem do dia como "entrada".
async function decidirTipoMovimento(idUsuario) {
  if (!idUsuario) return 'entrada';
  const ultimo = await acessoModel.buscarUltimoPorUsuario(idUsuario);
  if (!ultimo) return 'entrada';
  return ultimo.tipo_movimento === 'entrada' ? 'saida' : 'entrada';
}

// Função central: recebe o UID lido pelo dispositivo e o id do
// dispositivo, e decide se o acesso é permitido ou negado — sempre
// registrando o resultado (RN03, RN08).
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

  // Função auxiliar para não repetir a chamada ao model em cada "negado".
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

  // 2. UID precisa corresponder a um cartão cadastrado.
  const cartao = await cartaoModel.buscarPorUid(uid);
  if (!cartao) {
    return negar(`UID não cadastrado: ${uid}`, null, null);
  }

  // 3. Cartão precisa estar ativo.
  if (!cartao.ativo) {
    return negar('Cartão inativo', cartao.id_usuario, cartao.id_cartao);
  }

  // 4. Usuário do cartão precisa estar ativo (não bloqueado — RN04).
  const usuario = await usuarioModel.buscarPorId(cartao.id_usuario);
  if (!usuario || !usuario.status) {
    return negar('Usuário bloqueado', cartao.id_usuario, cartao.id_cartao);
  }

  // 5. Restrição por horário (RN06). Só se aplica se o usuário
  // tiver alguma regra configurada — sem regra, não há restrição.
  const totalRegras = await horarioModel.contarRegrasDoUsuario(usuario.id_usuario);
  if (totalRegras > 0) {
    const permitidoAgora = await horarioModel.existeRegraValidaAgora(
      usuario.id_usuario,
      diaSemanaAtual(),
      horaAtual()
    );
    if (!permitidoAgora) {
      return negar('Fora do horário permitido', usuario.id_usuario, cartao.id_cartao);
    }
  }

  // 6. Tudo certo: acesso permitido.
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
  buscarPorId,
};
