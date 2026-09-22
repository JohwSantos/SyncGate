import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useSocket } from '../hooks/useSocket';
import { usePermissoes } from '../hooks/usePermissoes';

const TOM_STATUS = { pendente: 'alerta', aprovado: 'sucesso', rejeitado: 'perigo' };
const ROTULO_STATUS = { pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado' };

export default function Solicitacoes() {
  const { podeAprovarSolicitacoes } = usePermissoes();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregarDados() {
    try {
      setCarregando(true);
      const [listaSolicitacoes, listaUsuarios] = await Promise.all([
        api.get('/solicitacoes'),
        api.get('/usuarios'),
      ]);
      setSolicitacoes(listaSolicitacoes);
      setUsuarios(listaUsuarios);
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

  // Se outra pessoa (ou o próprio operador, em outra aba) aprovar
  // ou rejeitar uma solicitação, essa tela se atualiza sozinha.
  useSocket({
    'solicitacao-atualizada': (solicitacaoAtualizada) => {
      setSolicitacoes((atual) => {
        const jaExiste = atual.some(
          (s) => s.id_solicitacao === solicitacaoAtualizada.id_solicitacao
        );
        return jaExiste
          ? atual.map((s) =>
              s.id_solicitacao === solicitacaoAtualizada.id_solicitacao ? solicitacaoAtualizada : s
            )
          : [solicitacaoAtualizada, ...atual];
      });
    },
  });

  async function decidir(solicitacao, acao) {
    // acao é 'aprovar' ou 'rejeitar' — vira parte da URL
    const atualizada = await api.patch(`/solicitacoes/${solicitacao.id_solicitacao}/${acao}`);
    setSolicitacoes((atual) =>
      atual.map((s) => (s.id_solicitacao === atualizada.id_solicitacao ? atualizada : s))
    );
  }

  function nomeDoSolicitante(idUsuario) {
    const usuario = usuarios.find((u) => u.id_usuario === idUsuario);
    return usuario ? usuario.nome : `Usuário #${idUsuario}`;
  }

  function aoCriar(solicitacaoCriada) {
    setSolicitacoes((atual) => [solicitacaoCriada, ...atual]);
    setModalAberto(false);
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Solicitações de Acesso</h1>
        <button style={estilos.botaoPrimario} onClick={() => setModalAberto(true)}>
          <Plus size={16} /> Nova solicitação
        </button>
      </div>

      {carregando && <p style={{ color: 'var(--cor-texto-suave)' }}>Carregando...</p>}
      {erroLista && <div style={estilos.faixaErro}>{erroLista}</div>}

      {!carregando && !erroLista && (
        <div style={estilos.tabelaContainer}>
          <table style={estilos.tabela} className="sg-tabela-responsiva">
            <thead>
              <tr>
                <th style={estilos.th}>Motivo da visita</th>
                <th style={estilos.th}>Destinatário</th>
                <th style={estilos.th}>Solicitante</th>
                <th style={estilos.th}>Data</th>
                <th style={estilos.th}>Status</th>
                <th style={estilos.th}></th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((solicitacao) => (
                <tr key={solicitacao.id_solicitacao}>
                  <td style={estilos.td} data-rotulo="Motivo">{solicitacao.motivo_visita}</td>
                  <td style={estilos.td} data-rotulo="Destinatário">{solicitacao.destinatario || '—'}</td>
                  <td style={estilos.td} data-rotulo="Solicitante">{nomeDoSolicitante(solicitacao.id_usuario_solicitante)}</td>
                  <td style={estilos.td} data-rotulo="Data">
                    {new Date(solicitacao.data_solicitacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={estilos.td} data-rotulo="Status">
                    <Badge
                      texto={ROTULO_STATUS[solicitacao.status]}
                      tom={TOM_STATUS[solicitacao.status]}
                    />
                  </td>
                  <td style={{ ...estilos.td, display: 'flex', gap: '0.4rem' }}>
                    {solicitacao.status === 'pendente' && podeAprovarSolicitacoes && (
                      <>
                        <button
                          style={{ ...estilos.botaoIcone, color: 'var(--cor-sucesso)' }}
                          title="Aprovar"
                          onClick={() => decidir(solicitacao, 'aprovar')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          style={{ ...estilos.botaoIcone, color: 'var(--cor-perigo)' }}
                          title="Rejeitar"
                          onClick={() => decidir(solicitacao, 'rejeitar')}
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}

              {solicitacoes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...estilos.td, color: 'var(--cor-texto-suave)' }}>
                    Nenhuma solicitação registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal titulo="Nova solicitação de acesso" aoFechar={() => setModalAberto(false)}>
          <FormularioSolicitacao usuarios={usuarios} aoSalvar={aoCriar} />
        </Modal>
      )}
    </div>
  );
}

function FormularioSolicitacao({ usuarios, aoSalvar }) {
  const [motivoVisita, setMotivoVisita] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [documentoVisitante, setDocumentoVisitante] = useState('');
  const [idUsuarioSolicitante, setIdUsuarioSolicitante] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const solicitacao = await api.post('/solicitacoes', {
        motivo_visita: motivoVisita,
        destinatario: destinatario || null,
        documento_visitante: documentoVisitante || null,
        id_usuario_solicitante: Number(idUsuarioSolicitante),
      });
      aoSalvar(solicitacao);
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} style={estilosForm.form}>
      <label style={estilosForm.rotulo}>
        Motivo da visita <span style={{ color: 'var(--cor-perigo)' }}>*</span>
        <input
          value={motivoVisita}
          onChange={(e) => setMotivoVisita(e.target.value)}
          placeholder="Ex.: Reunião com a coordenação"
          required
          style={estilosForm.campo}
        />
      </label>

      <label style={estilosForm.rotulo}>
        Solicitado por <span style={{ color: 'var(--cor-perigo)' }}>*</span>
        <select
          value={idUsuarioSolicitante}
          onChange={(e) => setIdUsuarioSolicitante(e.target.value)}
          required
          style={estilosForm.campo}
        >
          <option value="" disabled>
            Selecione quem está solicitando
          </option>
          {usuarios.map((usuario) => (
            <option key={usuario.id_usuario} value={usuario.id_usuario}>
              {usuario.nome} ({usuario.tipo})
            </option>
          ))}
        </select>
      </label>

      <label style={estilosForm.rotulo}>
        Destinatário (opcional)
        <input
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          placeholder="Ex.: Coordenação Pedagógica"
          style={estilosForm.campo}
        />
      </label>

      <label style={estilosForm.rotulo}>
        Documento do visitante (opcional)
        <input
          value={documentoVisitante}
          onChange={(e) => setDocumentoVisitante(e.target.value)}
          placeholder="RG ou CPF do visitante"
          style={estilosForm.campo}
        />
      </label>

      {erro && <div style={estilosForm.faixaErro}>{erro}</div>}

      <button type="submit" disabled={salvando} style={estilosForm.botaoSalvar}>
        {salvando ? 'Salvando...' : 'Registrar solicitação'}
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
