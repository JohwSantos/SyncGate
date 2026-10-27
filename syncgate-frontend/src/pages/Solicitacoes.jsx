import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import EstadoVazio from '../components/EstadoVazio';
import Paginacao from '../components/Paginacao';
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
  const [erroAcao, setErroAcao] = useState(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Carrega uma página de solicitações (10 por vez, mais recentes
  // primeiro). Os usuários vêm completos para mostrar os nomes.
  async function carregarDados(pag = pagina) {
    try {
      setCarregando(true);
      const [respSolicitacoes, listaUsuarios] = await Promise.all([
        api.get(`/solicitacoes?pagina=${pag}&limite=10`),
        api.get('/usuarios'),
      ]);
      if (respSolicitacoes.dados.length === 0 && pag > 1) {
        return carregarDados(pag - 1);
      }
      setSolicitacoes(respSolicitacoes.dados);
      setPagina(respSolicitacoes.pagina);
      setTotalPaginas(respSolicitacoes.totalPaginas);
      setTotalRegistros(respSolicitacoes.total);
      setUsuarios(listaUsuarios);
      setErroLista(null);
    } catch (erro) {
      setErroLista(erro.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados(1);
  }, []);

  // Se outra pessoa (ou o proprio operador, em outra aba) aprovar
  // ou rejeitar uma solicitacao, essa tela se atualiza sozinha.
  useSocket({
    'solicitacao-atualizada': (solicitacaoAtualizada) => {
      const estaNaPagina = solicitacoes.some(
        (s) => s.id_solicitacao === solicitacaoAtualizada.id_solicitacao
      );
      if (estaNaPagina) {
        // Aprovada/rejeitada: atualiza a linha na hora.
        setSolicitacoes((atual) =>
          atual.map((s) =>
            s.id_solicitacao === solicitacaoAtualizada.id_solicitacao ? solicitacaoAtualizada : s
          )
        );
      } else if (pagina === 1) {
        // Solicitação nova: entra no topo da página 1. Recarregamos
        // a página para manter os 10 itens e o total certos.
        carregarDados(1);
      }
    },
  });

  async function decidir(solicitacao, acao) {
    setErroAcao(null);
    setAcaoEmAndamento(solicitacao.id_solicitacao);
    try {
      const atualizada = await api.patch(`/solicitacoes/${solicitacao.id_solicitacao}/${acao}`);
      setSolicitacoes((atual) =>
        atual.map((s) => (s.id_solicitacao === atualizada.id_solicitacao ? atualizada : s))
      );
    } catch (erro) {
      setErroAcao(erro.message);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  function nomeDoSolicitante(idUsuario) {
    const usuario = usuarios.find((u) => u.id_usuario === idUsuario);
    return usuario ? usuario.nome : `Usuario #${idUsuario}`;
  }

  function aoCriar() {
    setModalAberto(false);
    carregarDados(1); // a nova aparece no topo da primeira página
  }

  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Solicitacoes de Acesso</h1>
          <p className="sg-page-subtitle">Aprove ou rejeite entradas de visitantes e alunos sem cartao</p>
        </div>
        <div className="sg-page-actions">
          <button className="sg-btn sg-btn-primary" onClick={() => setModalAberto(true)}>
            <Plus size={16} /> Nova solicitacao
          </button>
        </div>
      </div>

      {erroLista && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erroLista}</span>
        </div>
      )}

      {erroAcao && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>Nao foi possivel atualizar a solicitacao: {erroAcao}</span>
        </div>
      )}

      {carregando ? (
        <div className="sg-loading-area">
          <Spinner /> Carregando solicitacoes...
        </div>
      ) : !erroLista ? (
        <div className="sg-table-wrap">
          <table className="sg-table sg-table-responsive">
            <thead>
              <tr>
                <th>Motivo da visita</th>
                <th>Destinatario</th>
                <th>Solicitante</th>
                <th>Data</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((solicitacao) => (
                <tr key={solicitacao.id_solicitacao}>
                  <td data-rotulo="Motivo"><strong>{solicitacao.motivo_visita}</strong></td>
                  <td data-rotulo="Destinatario">{solicitacao.destinatario || '—'}</td>
                  <td data-rotulo="Solicitante">{nomeDoSolicitante(solicitacao.id_usuario_solicitante)}</td>
                  <td className="sg-td-mono" data-rotulo="Data">
                    {new Date(solicitacao.data_solicitacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td data-rotulo="Status">
                    <Badge
                      texto={ROTULO_STATUS[solicitacao.status]}
                      tom={TOM_STATUS[solicitacao.status]}
                    />
                  </td>
                  <td className="sg-td-actions">
                    <div style={{ display: 'flex', gap: 'var(--sg-space-1)', justifyContent: 'flex-end' }}>
                      {solicitacao.status === 'pendente' && podeAprovarSolicitacoes && (
                        <>
                          <button
                            className="sg-btn sg-btn-ghost sg-btn-icon"
                            style={{ color: 'var(--sg-success)' }}
                            title="Aprovar solicitacao"
                            disabled={acaoEmAndamento === solicitacao.id_solicitacao}
                            onClick={() => decidir(solicitacao, 'aprovar')}
                          >
                            {acaoEmAndamento === solicitacao.id_solicitacao ? <Spinner tamanho="sm" /> : <Check size={16} />}
                          </button>
                          <button
                            className="sg-btn sg-btn-ghost sg-btn-icon"
                            style={{ color: 'var(--sg-danger)' }}
                            title="Rejeitar solicitacao"
                            disabled={acaoEmAndamento === solicitacao.id_solicitacao}
                            onClick={() => decidir(solicitacao, 'rejeitar')}
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {solicitacoes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <EstadoVazio 
                      icone="busca" 
                      titulo="Nenhuma solicitacao registrada" 
                      descricao="Nao ha pedidos de acesso temporario no momento." 
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={totalRegistros}
            aoMudar={carregarDados}
          />
        </div>
      ) : null}

      {modalAberto && (
        <Modal titulo="Nova solicitacao de acesso" aoFechar={() => setModalAberto(false)} largura="500px">
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
    <form onSubmit={aoEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)' }}>
        <label className="sg-label sg-label-required">
          Motivo da visita
          <input
            type="text"
            value={motivoVisita}
            onChange={(e) => setMotivoVisita(e.target.value)}
            placeholder="Ex.: Reuniao com a coordenacao"
            required
            className="sg-input"
            autoFocus
          />
        </label>

        <label className="sg-label sg-label-required">
          Solicitado por
          <select
            value={idUsuarioSolicitante}
            onChange={(e) => setIdUsuarioSolicitante(e.target.value)}
            required
            className="sg-select"
          >
            <option value="" disabled>Selecione quem esta solicitando</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id_usuario} value={usuario.id_usuario}>
                {usuario.nome} ({usuario.tipo})
              </option>
            ))}
          </select>
        </label>

        <label className="sg-label">
          Destinatario (opcional)
          <input
            type="text"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="Ex.: Coordenacao Pedagogica"
            className="sg-input"
          />
        </label>

        <label className="sg-label">
          Documento do visitante (opcional)
          <input
            type="text"
            value={documentoVisitante}
            onChange={(e) => setDocumentoVisitante(e.target.value)}
            placeholder="RG ou CPF do visitante"
            className="sg-input sg-mono"
          />
        </label>
      </div>

      {erro && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erro}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sg-space-2)' }}>
        <button type="submit" disabled={salvando} className="sg-btn sg-btn-primary">
          {salvando ? (
            <><Spinner tamanho="sm" /> Registrando...</>
          ) : (
            'Registrar solicitacao'
          )}
        </button>
      </div>
    </form>
  );
}