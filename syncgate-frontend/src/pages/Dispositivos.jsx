import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { usePermissoes } from '../hooks/usePermissoes';

const STATUS_OPCOES = ['online', 'offline', 'manutencao'];
const TOM_STATUS = { online: 'sucesso', offline: 'perigo', manutencao: 'alerta' };
const ROTULO_STATUS = { online: 'Online', offline: 'Offline', manutencao: 'Manutenção' };

export default function Dispositivos() {
  const { podeGerenciarCartoesDispositivos } = usePermissoes();
  const [dispositivos, setDispositivos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregarDispositivos() {
    try {
      setCarregando(true);
      setDispositivos(await api.get('/dispositivos'));
      setErroLista(null);
    } catch (erro) {
      setErroLista(erro.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDispositivos();
  }, []);

  async function mudarStatus(dispositivo, novoStatus) {
    const atualizado = await api.patch(`/dispositivos/${dispositivo.id_dispositivo}/status`, {
      status: novoStatus,
    });
    setDispositivos((atual) =>
      atual.map((d) => (d.id_dispositivo === atualizado.id_dispositivo ? atualizado : d))
    );
  }

  async function excluirDispositivo(dispositivo) {
    const confirmou = window.confirm(`Excluir o dispositivo "${dispositivo.descricao}"?`);
    if (!confirmou) return;

    setErroExclusao(null);
    try {
      await api.delete(`/dispositivos/${dispositivo.id_dispositivo}`);
      setDispositivos((atual) => atual.filter((d) => d.id_dispositivo !== dispositivo.id_dispositivo));
    } catch (erro) {
      // Erro esperado quando o dispositivo já tem histórico de
      // acesso vinculado — o backend explica o motivo.
      setErroExclusao(erro.message);
    }
  }

  function aoCadastrar(dispositivoCriado) {
    setDispositivos((atual) => [...atual, dispositivoCriado]);
    setModalAberto(false);
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Dispositivos</h1>
        {podeGerenciarCartoesDispositivos && (
          <button style={estilos.botaoPrimario} onClick={() => setModalAberto(true)}>
            <Plus size={16} /> Novo dispositivo
          </button>
        )}
      </div>

      {carregando && <p style={{ color: 'var(--cor-texto-suave)' }}>Carregando...</p>}
      {erroLista && <div style={estilos.faixaErro}>{erroLista}</div>}
      {erroExclusao && <div style={estilos.faixaErro}>{erroExclusao}</div>}

      {!carregando && !erroLista && (
        <div style={estilos.tabelaContainer}>
          <table style={estilos.tabela} className="sg-tabela-responsiva">
            <thead>
              <tr>
                <th style={estilos.th}>Descrição</th>
                <th style={estilos.th}>Localização</th>
                <th style={estilos.th}>Status</th>
                <th style={estilos.th}>Última comunicação</th>
                {podeGerenciarCartoesDispositivos && (
                  <>
                    <th style={estilos.th}>Mudar status</th>
                    <th style={estilos.th}></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {dispositivos.map((dispositivo) => (
                <tr key={dispositivo.id_dispositivo}>
                  <td style={estilos.td} data-rotulo="Descrição">{dispositivo.descricao}</td>
                  <td style={estilos.td} data-rotulo="Localização">{dispositivo.localizacao || '—'}</td>
                  <td style={estilos.td} data-rotulo="Status">
                    <Badge
                      texto={ROTULO_STATUS[dispositivo.status]}
                      tom={TOM_STATUS[dispositivo.status]}
                    />
                  </td>
                  <td style={estilos.td} data-rotulo="Última comunicação">
                    {dispositivo.ultima_comunicacao
                      ? new Date(dispositivo.ultima_comunicacao).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </td>
                  {podeGerenciarCartoesDispositivos && (
                    <>
                      <td style={estilos.td} data-rotulo="Mudar status">
                        <select
                          value={dispositivo.status}
                          onChange={(e) => mudarStatus(dispositivo, e.target.value)}
                          style={estilos.seletorStatus}
                        >
                          {STATUS_OPCOES.map((status) => (
                            <option key={status} value={status}>
                              {ROTULO_STATUS[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={estilos.td}>
                        <button
                          style={{ ...estilos.botaoIcone, color: 'var(--cor-perigo)' }}
                          title="Excluir"
                          onClick={() => excluirDispositivo(dispositivo)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {dispositivos.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarCartoesDispositivos ? 6 : 4} style={{ ...estilos.td, color: 'var(--cor-texto-suave)' }}>
                    Nenhum dispositivo cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal titulo="Novo dispositivo" aoFechar={() => setModalAberto(false)}>
          <FormularioDispositivo aoSalvar={aoCadastrar} />
        </Modal>
      )}
    </div>
  );
}

function FormularioDispositivo({ aoSalvar }) {
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [ipLocal, setIpLocal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const dispositivo = await api.post('/dispositivos', {
        descricao,
        localizacao: localizacao || null,
        ip_local: ipLocal || null,
        status: 'offline',
      });
      aoSalvar(dispositivo);
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} style={estilosForm.form}>
      <label style={estilosForm.rotulo}>
        Descrição <span style={{ color: 'var(--cor-perigo)' }}>*</span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Catraca Entrada Principal"
          required
          style={estilosForm.campo}
        />
      </label>

      <label style={estilosForm.rotulo}>
        Localização
        <input
          value={localizacao}
          onChange={(e) => setLocalizacao(e.target.value)}
          placeholder="Ex.: Portaria"
          style={estilosForm.campo}
        />
      </label>

      <label style={estilosForm.rotulo}>
        IP local (opcional)
        <input
          value={ipLocal}
          onChange={(e) => setIpLocal(e.target.value)}
          placeholder="Ex.: 192.168.0.50"
          style={estilosForm.campo}
        />
      </label>

      <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-suave)' }}>
        Todo dispositivo novo entra como <strong>offline</strong> — mude o status na tabela
        depois de confirmar que ele está respondendo.
      </p>

      {erro && <div style={estilosForm.faixaErro}>{erro}</div>}

      <button type="submit" disabled={salvando} style={estilosForm.botaoSalvar}>
        {salvando ? 'Salvando...' : 'Cadastrar'}
      </button>
    </form>
  );
}

const estilos = {
  pagina: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  cabecalho: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: '1.4rem' },
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
  seletorStatus: {
    padding: '0.35rem 0.5rem', borderRadius: 'var(--raio-pequeno)',
    border: '1px solid var(--cor-borda)', fontSize: '0.85rem',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)', color: 'var(--cor-perigo)',
    padding: '0.8rem 1rem', borderRadius: 'var(--raio)',
  },
};

const estilosForm = {
  form: { display: 'flex', flexDirection: 'column', gap: '0.9rem' },
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
