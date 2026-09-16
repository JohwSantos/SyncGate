const horarioModel = require('../models/horarioAcesso.model');
const usuarioModel = require('../models/usuario.model');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

const DIAS_VALIDOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

async function listar() {
  return horarioModel.listarTodos();
}

async function listarPorUsuario(idUsuario) {
  const usuario = await usuarioModel.buscarPorId(idUsuario);
  if (!usuario) {
    throw erroComStatus('Usuário não encontrado', 404);
  }
  return horarioModel.listarPorUsuario(idUsuario);
}

async function criar(dados) {
  const { dia_semana, hora_inicio, hora_fim, id_usuario } = dados;

  if (!dia_semana || !hora_inicio || !hora_fim || !id_usuario) {
    throw erroComStatus(
      'Campos obrigatórios: dia_semana, hora_inicio, hora_fim, id_usuario',
      400
    );
  }

  if (!DIAS_VALIDOS.includes(dia_semana)) {
    throw erroComStatus(`dia_semana deve ser um de: ${DIAS_VALIDOS.join(', ')}`, 400);
  }

  const usuario = await usuarioModel.buscarPorId(id_usuario);
  if (!usuario) {
    throw erroComStatus('Usuário não encontrado', 404);
  }

  return horarioModel.criar(dados);
}

async function remover(idHorario) {
  const horario = await horarioModel.buscarPorId(idHorario);
  if (!horario) {
    throw erroComStatus('Regra de horário não encontrada', 404);
  }
  await horarioModel.remover(idHorario);
}

module.exports = {
  listar,
  listarPorUsuario,
  criar,
  remover,
};
