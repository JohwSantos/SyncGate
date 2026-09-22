import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import { usePermissoes } from '../hooks/usePermissoes';

const DIAS = [
  { valor: 'seg', rotulo: 'Segunda-feira' },
  { valor: 'ter', rotulo: 'Terça-feira' },
  { valor: 'qua', rotulo: 'Quarta-feira' },
  { valor: 'qui', rotulo: 'Quinta-feira' },
  { valor: 'sex', rotulo: 'Sexta-feira' },
  { valor: 'sab', rotulo: 'Sábado' },
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
  const [modalAberto, setModalAberto] = useState(false);

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
    return usuarios.find((u) => u.id_usuario === idUsuario)?.nome || `Usuário #${idUsuario}`;
  }

  function descricaoDoDispositivo(idDispositivo) {
    if (!idDispositivo) return 'Qualquer dispositivo';
    return dispositivos.find((d) => d.id_dispositivo === idDispositivo)?.descricao || `Dispositivo #${idDispositivo}`;
  }

  async function remover(horario) {
    await api.delete(`/horarios/${horario.id_horario}`);
    setHorarios((atual) => atual.filter((h) => h.id_horario !== horario.id_horario));
  }

  function aoCriar(horarioCriado) {
    setHorarios((atual) => [...atual, horarioCriado]);
    setModalAberto(false);
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Horários de Acesso</h1>
        {podeGerenciarHorarios && (
          <button style={estilos.botaoPrimario} onClick={() => setModalAberto(true)}>
            <Plus size={16} /> Nova regra
          </button>
        )}
      </div>

      <div style={estilos.aviso}>
        Um usuário sem nenhuma regra cadastrada <strong>não tem restrição de horário</strong> —
        a restrição só passa a valer a partir da primeira regra criada para ele.
      </div>

      {carregando && <p style={{ color: 'var(--cor-texto-suave)' }}>Carregando...</p>}
      {erroLista && <div style={estilos.faixaErro}>{erroLista}</div>}

      {!carregando && !erroLista && (
        <div style={estilos.tabelaContainer}>
          <table style={estilos.tabela} className="sg-tabela-responsiva">
            <thead>
              <tr>
                <th style={estilos.th}>Usuário</th>
                <th style={estilos.th}>Dispositivo</th>
                <th style={estilos.th}>Dia da semana</th>
                <th style={estilos.th}>Horário permitido</th>
                {podeGerenciarHorarios && <th style={estilos.th}></th>}
              </tr>
            </thead>
            <tbody>
              {horarios.map((horario) => (
                <tr key={horario.id_horario}>
                  <td style={estilos.td} data-rotulo="Usuário">{nomeDoUsuario(horario.id_usuario)}</td>
                  <td style={estilos.td} data-rotulo="Dispositivo">{descricaoDoDispositivo(horario.id_dispositivo)}</td>
                  <td style={estilos.td} data-rotulo="Dia">{rotuloDia(horario.dia_semana)}</td>
                  <td style={{ ...estilos.td, fontFamily: 'var(--fonte-mono)' }} data-rotulo="Horário">
                    {horario.hora_inicio.slice(0, 5)} – {horario.hora_fim.slice(0, 5)}
                  </td>
                  {podeGerenciarHorarios && (
                    <td style={estilos.td}>
                      <button
                        style={{ ...estilos.botaoIcone, color: 'var(--cor-perigo)' }}
                        title="Remover regra"
                        onClick={() => remover(horario)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {horarios.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarHorarios ? 5 : 4} style={{ ...estilos.td, color: 'var(--cor-texto-suave)' }}>
                    Nenhuma regra de horário cadastrada — todos os usuários acessam livremente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal titulo="Nova regra de horário" aoFechar={() => setModalAberto(false)}>
          <FormularioHorario usuarios={usuarios} dispositivos={dispositivos} aoSalvar={aoCriar} />
        </Modal>
      )}
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
    <form onSubmit={aoEnviar} style={estilosForm.form}>
      <label style={estilosForm.rotulo}>
        Usuário <span style={{ color: 'var(--cor-perigo)' }}>*</span>
        <select
          value={idUsuario}
          onChange={(e) => setIdUsuario(e.target.value)}
          required
          style={estilosForm.campo}
        >
          <option value="" disabled>
            Selecione um usuário
          </option>
          {usuarios.map((usuario) => (
            <option key={usuario.id_usuario} value={usuario.id_usuario}>
              {usuario.nome}
            </option>
          ))}
        </select>
      </label>

      <label style={estilosForm.rotulo}>
        Dispositivo (opcional)
        <select
          value={idDispositivo}
          onChange={(e) => setIdDispositivo(e.target.value)}
          style={estilosForm.campo}
        >
          <option value="">Qualquer dispositivo</option>
          {dispositivos.map((dispositivo) => (
            <option key={dispositivo.id_dispositivo} value={dispositivo.id_dispositivo}>
              {dispositivo.descricao}
            </option>
          ))}
        </select>
      </label>

      <label style={estilosForm.rotulo}>
        Dia da semana <span style={{ color: 'var(--cor-perigo)' }}>*</span>
        <select
          value={diaSemana}
          onChange={(e) => setDiaSemana(e.target.value)}
          style={estilosForm.campo}
        >
          {DIAS.map((dia) => (
            <option key={dia.valor} value={dia.valor}>
              {dia.rotulo}
            </option>
          ))}
        </select>
      </label>

      <div style={estilosForm.linha}>
        <label style={estilosForm.rotulo}>
          Início <span style={{ color: 'var(--cor-perigo)' }}>*</span>
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            required
            style={estilosForm.campo}
          />
        </label>
        <label style={estilosForm.rotulo}>
          Fim <span style={{ color: 'var(--cor-perigo)' }}>*</span>
          <input
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
            required
            style={estilosForm.campo}
          />
        </label>
      </div>

      {erro && <div style={estilosForm.faixaErro}>{erro}</div>}

      <button type="submit" disabled={salvando} style={estilosForm.botaoSalvar}>
        {salvando ? 'Salvando...' : 'Criar regra'}
      </button>
    </form>
  );
}

const estilos = {
  pagina: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  cabecalho: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: '1.4rem' },
  aviso: {
    background: 'var(--cor-blue-50)', color: 'var(--cor-navy-900)', fontSize: '0.85rem',
    padding: '0.8rem 1rem', borderRadius: 'var(--raio)',
  },
  botaoPrimario: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--cor-blue-600)',
    color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: 'var(--raio-pequeno)',
    fontWeight: 600, fontSize: '0.9rem',
  },
  tabelaContainer: {
    background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)', overflow: 'auto', boxShadow: 'var(--sombra)',
  },
  tabela: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: {
    textAlign: 'left', padding: '0.8rem 1rem', borderBottom: '1px solid var(--cor-borda)',
    color: 'var(--cor-texto-suave)', fontWeight: 600, fontSize: '0.78rem',
  },
  td: { padding: '0.7rem 1rem', borderBottom: '1px solid var(--cor-borda)' },
  botaoIcone: {
    border: '1px solid var(--cor-borda)', background: 'var(--cor-superficie)',
    borderRadius: 'var(--raio-pequeno)', padding: '0.35rem', display: 'flex',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)', color: 'var(--cor-perigo)',
    padding: '0.8rem 1rem', borderRadius: 'var(--raio)',
  },
};

const estilosForm = {
  form: { display: 'flex', flexDirection: 'column', gap: '0.9rem' },
  linha: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' },
  rotulo: {
    display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem',
    fontWeight: 500, color: 'var(--cor-texto-suave)',
  },
  campo: {
    padding: '0.55rem 0.7rem', borderRadius: 'var(--raio-pequeno)',
    border: '1px solid var(--cor-borda)', fontSize: '0.9rem',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)', color: 'var(--cor-perigo)',
    padding: '0.6rem 0.8rem', borderRadius: 'var(--raio-pequeno)', fontSize: '0.85rem',
  },
  botaoSalvar: {
    marginTop: '0.3rem', padding: '0.7rem', borderRadius: 'var(--raio-pequeno)',
    border: 'none', background: 'var(--cor-blue-600)', color: 'white', fontWeight: 600,
  },
};
