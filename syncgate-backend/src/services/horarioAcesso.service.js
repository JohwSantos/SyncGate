const horarioModel = require('../models/horarioAcesso.model');
const usuarioModel = require('../models/usuario.model');
const dispositivoModel = require('../models/dispositivo.model');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

const DIAS_VALIDOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

// Aceita "HH:MM" (o que o <input type="time"> do painel envia) ou
// "HH:MM:SS", e devolve sempre "HH:MM:SS". Devolve null se o
// horário for inválido (ex.: "25:00", "8h", "abc").
function normalizarHora(valor) {
  const correspondencia = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(valor).trim());
  if (!correspondencia) return null;
  const [, horas, minutos, segundos = '00'] = correspondencia;
  return `${horas}:${minutos}:${segundos}`;
}

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

  const inicio = normalizarHora(hora_inicio);
  const fim = normalizarHora(hora_fim);
  if (!inicio || !fim) {
    throw erroComStatus('Horários devem estar no formato HH:MM (ex.: 07:30)', 400);
  }

  // Comparar "HH:MM:SS" como texto funciona porque o formato tem
  // tamanho fixo: "07:30:00" < "12:00:00".
  // Regras que atravessam a meia-noite (ex.: 22:00 às 06:00) não são
  // suportadas: cadastre duas regras, uma em cada dia.
  if (inicio >= fim) {
    throw erroComStatus(
      'A hora de início precisa ser menor que a hora de fim. ' +
        'Para horários que passam da meia-noite, cadastre duas regras.',
      400
    );
  }

  const usuario = await usuarioModel.buscarPorId(id_usuario);
  if (!usuario) {
    throw erroComStatus('Usuário não encontrado', 404);
  }

  // Dispositivo é opcional; se informado, precisa existir.
  if (dados.id_dispositivo) {
    const dispositivo = await dispositivoModel.buscarPorId(dados.id_dispositivo);
    if (!dispositivo) {
      throw erroComStatus('Dispositivo não encontrado', 404);
    }
  }

  return horarioModel.criar({ ...dados, hora_inicio: inicio, hora_fim: fim });
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
