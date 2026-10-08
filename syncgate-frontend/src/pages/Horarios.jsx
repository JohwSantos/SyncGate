import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import EstadoVazio from '../components/EstadoVazio';
import ModalConfirmacao from '../components/ModalConfirmacao';
import { usePermissoes } from '../hooks/usePermissoes';

const DIAS = [
  { valor: 'seg', rotulo: 'Segunda-feira' },
  { valor: 'ter', rotulo: 'Terca-feira' },
  { valor: 'qua', rotulo: 'Quarta-feira' },
  { valor: 'qui', rotulo: 'Quinta-feira' },
  { valor: 'sex', rotulo: 'Sexta-feira' },
  { valor: 'sab', rotulo: 'Sabado' },
  { valor: 'dom', rotulo: 'Domingo' },
];

function rotuloDia(valor) {
  return DIAS.find((d) => d.valor === valor)?.rotulo || valor;
}

export default function Horarios() {
  const { podeGerenciarHorarios } = usePermissoes();
  const [horarios, setHorarios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  const [regraExclusao, setRegraExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  async function carregarDados() {
    try {
      setCarregando(true);
      const [listaHorarios, listaUsuarios, listaDispositivos] = await Promise.all([
        api.get('/horarios'),
        api.get('/usuarios'),
        api.get('/dispositivos'),
      ]);
      setHorarios(listaHorarios);
      setUsuarios(listaUsuarios);
      setDispositivos(listaDispositivos);
      setErroLista(null);
    } catch (erro) {
      setErroLista(erro.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  function nomeDoUsuario(idUsuario) {
    return usuarios.find((u) => u.id_usuario === idUsuario)?.nome || `Usuario #${idUsuario}`;
  }

  function descricaoDoDispositivo(idDispositivo) {
    if (!idDispositivo) return 'Qualquer dispositivo';
    return dispositivos.find((d) => d.id_dispositivo === idDispositivo)?.descricao || `Dispositivo #${idDispositivo}`;
  }

  async function confirmarRemocao() {
    if (!regraExclusao) return;
    setErroAcao(null);
    setExcluindo(true);
    try {
      await api.delete(`/horarios/${regraExclusao.id_horario}`);
      setHorarios((atual) => atual.filter((h) => h.id_horario !== regraExclusao.id_horario));
      setRegraExclusao(null);
    } catch (erro) {
      setErroAcao(erro.message);
      setRegraExclusao(null);
    } finally {
      setExcluindo(false);
    }
  }

  function aoCriar(horarioCriado) {
    setHorarios((atual) => [...atual, horarioCriado]);
    setModalAberto(false);
  }

  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Regras de Horario</h1>
          <p className="sg-page-subtitle">Configure as restricoes de acesso por dias e horarios</p>
        </div>
        <div className="sg-page-actions">
          {podeGerenciarHorarios && (
            <button className="sg-btn sg-btn-primary" onClick={() => setModalAberto(true)}>
              <Plus size={16} /> Nova regra
            </button>
          )}
        </div>
      </div>

      <div className="sg-alert sg-alert--info">
        <span>
          Um usuario sem nenhuma regra cadastrada <strong>nao tem restricao de horario</strong> —
          a restricao so passa a valer a partir da primeira regra criada para ele.
        </span>
      </div>

      {erroLista && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erroLista}</span>
        </div>
      )}

      {erroAcao && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>Nao foi possivel remover a regra: {erroAcao}</span>
        </div>
      )}

      {carregando ? (
        <div className="sg-loading-area">
          <Spinner /> Carregando regras...
        </div>
      ) : !erroLista ? (
        <div className="sg-table-wrap">
          <table className="sg-table sg-table-responsive">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Dispositivo</th>
                <th>Dia da semana</th>
                <th>Horario permitido</th>
                {podeGerenciarHorarios && <th></th>}
              </tr>
            </thead>
            <tbody>
              {horarios.map((horario) => (
                <tr key={horario.id_horario}>
                  <td data-rotulo="Usuario"><strong>{nomeDoUsuario(horario.id_usuario)}</strong></td>
                  <td data-rotulo="Dispositivo" style={{ color: 'var(--sg-text-2)' }}>{descricaoDoDispositivo(horario.id_dispositivo)}</td>
                  <td data-rotulo="Dia">{rotuloDia(horario.dia_semana)}</td>
                  <td className="sg-td-mono" data-rotulo="Horario">
                    {horario.hora_inicio.slice(0, 5)} – {horario.hora_fim.slice(0, 5)}
                  </td>
                  {podeGerenciarHorarios && (
                    <td className="sg-td-actions">
                      <div style={{ display: 'flex', gap: 'var(--sg-space-1)', justifyContent: 'flex-end' }}>
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          style={{ color: 'var(--sg-danger)' }}
                          title="Remover regra"
                          onClick={() => setRegraExclusao(horario)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {horarios.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarHorarios ? 5 : 4} style={{ padding: 0 }}>
                    <EstadoVazio 
                      icone="busca" 
                      titulo="Nenhuma regra configurada" 
                      descricao="Nenhuma regra de horario cadastrada. Todos os usuarios podem acessar o local a qualquer momento." 
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {modalAberto && (
        <Modal titulo="Nova regra de horario" aoFechar={() => setModalAberto(false)} largura="500px">
          <FormularioHorario usuarios={usuarios} dispositivos={dispositivos} aoSalvar={aoCriar} />
        </Modal>
      )}

      <ModalConfirmacao
        aberto={!!regraExclusao}
        titulo="Remover regra"
        mensagem="Tem certeza que deseja remover esta regra de horario? O usuario passara a nao ter essa restricao."
        textoConfirmar="Sim, remover"
        variante="danger"
        carregando={excluindo}
        aoConfirmar={confirmarRemocao}
        aoCancelar={() => setRegraExclusao(null)}
      />
    </div>
  );
}

function FormularioHorario({ usuarios, dispositivos, aoSalvar }) {
  const [idUsuario, setIdUsuario] = useState('');
  const [idDispositivo, setIdDispositivo] = useState('');
  const [diaSemana, setDiaSemana] = useState('seg');
  const [horaInicio, setHoraInicio] = useState('07:00');
  const [horaFim, setHoraFim] = useState('12:00');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const horario = await api.post('/horarios', {
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        id_usuario: Number(idUsuario),
        id_dispositivo: idDispositivo ? Number(idDispositivo) : null,
      });
      aoSalvar(horario);
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)' }}>
        <label className="sg-label sg-label-required">
          Usuario
          <select
            value={idUsuario}
            onChange={(e) => setIdUsuario(e.target.value)}
            required
            className="sg-select"
          >
            <option value="" disabled>Selecione um usuario</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id_usuario} value={usuario.id_usuario}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="sg-label">
          Dispositivo restrito (opcional)
          <select
            value={idDispositivo}
            onChange={(e) => setIdDispositivo(e.target.value)}
            className="sg-select"
          >
            <option value="">Qualquer dispositivo (regra global)</option>
            {dispositivos.map((dispositivo) => (
              <option key={dispositivo.id_dispositivo} value={dispositivo.id_dispositivo}>
                {dispositivo.descricao}
              </option>
            ))}
          </select>
        </label>

        <label className="sg-label sg-label-required">
          Dia da semana
          <select
            value={diaSemana}
            onChange={(e) => setDiaSemana(e.target.value)}
            className="sg-select"
          >
            {DIAS.map((dia) => (
              <option key={dia.valor} value={dia.valor}>
                {dia.rotulo}
              </option>
            ))}
          </select>
        </label>

        <div className="sg-form-row">
          <label className="sg-label sg-label-required">
            Horario de inicio
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
              className="sg-input"
            />
          </label>
          <label className="sg-label sg-label-required">
            Horario de fim
            <input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              required
              className="sg-input"
            />
          </label>
        </div>
      </div>

      {erro && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erro}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sg-space-2)' }}>
        <button type="submit" disabled={salvando} className="sg-btn sg-btn-primary">
          {salvando ? (
            <><Spinner tamanho="sm" /> Salvando...</>
          ) : (
            'Criar regra'
          )}
        </button>
      </div>
    </form>
  );
}