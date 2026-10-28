import { useCallback, useEffect, useState } from 'react';
import { Plus, Lock, Unlock, Trash2, Search } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import Paginacao from '../components/Paginacao';
import Spinner from '../components/Spinner';
import EstadoVazio from '../components/EstadoVazio';
import ModalConfirmacao from '../components/ModalConfirmacao';
import BotoesCSV from '../components/BotoesCSV';
import { usePermissoes } from '../hooks/usePermissoes';

export default function Cartoes() {
  const { podeGerenciarCartoesDispositivos } = usePermissoes();
  const [cartoes, setCartoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Para exclusao
  const [cartaoExclusao, setCartaoExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarDados = useCallback(async (pag = 1) => {
    try {
      setCarregando(true);
      const [respCartoes, listaUsuarios] = await Promise.all([
        api.get(`/cartoes?pagina=${pag}&limite=10&busca=${encodeURIComponent(busca.trim())}`),
        api.get('/usuarios'),
      ]);
      setCartoes(respCartoes.dados);
      setTotalPaginas(respCartoes.totalPaginas);
      setTotalRegistros(respCartoes.total);
      setPagina(respCartoes.pagina);
      setUsuarios(listaUsuarios);
      setErroLista(null);
    } catch (erro) {
      setErroLista(erro.message);
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    const temporizador = setTimeout(() => carregarDados(1), 300);
    return () => clearTimeout(temporizador);
  }, [busca, carregarDados]);

  async function alternarAtivo(cartao) {
    setErroAcao(null);
    try {
      const atualizado = await api.patch(`/cartoes/${cartao.id_cartao}/status`, {
        ativo: !cartao.ativo,
      });
      setCartoes((atual) =>
        atual.map((c) => (c.id_cartao === atualizado.id_cartao ? atualizado : c))
      );
    } catch (erro) {
      setErroAcao(erro.message);
    }
  }

  async function confirmarExclusao() {
    if (!cartaoExclusao) return;
    setErroAcao(null);
    setExcluindo(true);
    try {
      await api.delete(`/cartoes/${cartaoExclusao.id_cartao}`);
      carregarDados(pagina);
      setCartaoExclusao(null);
    } catch (erro) {
      setErroAcao(erro.message);
      setCartaoExclusao(null);
    } finally {
      setExcluindo(false);
    }
  }

  function nomeDoUsuario(idUsuario) {
    const usuario = usuarios.find((u) => u.id_usuario === idUsuario);
    return usuario ? usuario.nome : `Usuario #${idUsuario}`;
  }

  function aoVincular() {
    carregarDados(pagina);
    setModalAberto(false);
  }

  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Cartoes RFID</h1>
          <p className="sg-page-subtitle">Gerencie as tags RFID vinculadas aos usuarios</p>
        </div>
        <div className="sg-page-actions">
          <BotoesCSV 
            rotaExportar="/csv/cartoes/exportar" 
            nomeArquivo="cartoes.csv" 
            rotaImportar="/csv/cartoes/importar"
            aoImportar={() => carregarDados(pagina)}
          />
          {podeGerenciarCartoesDispositivos && (
            <button className="sg-btn sg-btn-primary" onClick={() => setModalAberto(true)}>
              <Plus size={16} /> Vincular cartao
            </button>
          )}
        </div>
      </div>

      <div className="sg-toolbar">
        <label className="sg-search">
          <Search size={16} className="sg-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Pesquisar por UID, nome ou CPF..."
            className="sg-search-input"
          />
        </label>
      </div>

      {erroLista && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erroLista}</span>
        </div>
      )}

      {erroAcao && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>Nao foi possivel concluir a acao: {erroAcao}</span>
        </div>
      )}

      {carregando ? (
        <div className="sg-loading-area">
          <Spinner /> Carregando cartoes...
        </div>
      ) : !erroLista ? (
        <div className="sg-table-wrap">
          <table className="sg-table sg-table-responsive">
            <thead>
              <tr>
                <th>UID</th>
                <th>Usuario vinculado</th>
                <th>Validade</th>
                <th>Status</th>
                {podeGerenciarCartoesDispositivos && <th></th>}
              </tr>
            </thead>
            <tbody>
              {cartoes.map((cartao) => (
                <tr key={cartao.id_cartao}>
                  <td className="sg-td-mono" data-rotulo="UID"><strong>{cartao.uid}</strong></td>
                  <td data-rotulo="Usuario">{nomeDoUsuario(cartao.id_usuario)}</td>
                  <td data-rotulo="Validade">
                    {cartao.data_validade
                      ? new Date(cartao.data_validade).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td data-rotulo="Status">
                    <Badge
                      texto={cartao.ativo ? 'Ativo' : 'Inativo'}
                      tom={cartao.ativo ? 'sucesso' : 'perigo'}
                    />
                  </td>
                  {podeGerenciarCartoesDispositivos && (
                    <td className="sg-td-actions">
                      <div style={{ display: 'flex', gap: 'var(--sg-space-1)', justifyContent: 'flex-end' }}>
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          title={cartao.ativo ? 'Desativar cartao' : 'Ativar cartao'}
                          onClick={() => alternarAtivo(cartao)}
                        >
                          {cartao.ativo ? <Lock size={15} /> : <Unlock size={15} />}
                        </button>
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          style={{ color: 'var(--sg-danger)' }}
                          title="Excluir cartao"
                          onClick={() => setCartaoExclusao(cartao)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {cartoes.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarCartoesDispositivos ? 5 : 4} style={{ padding: 0 }}>
                    <EstadoVazio 
                      icone="busca" 
                      titulo="Nenhum cartao encontrado" 
                      descricao={busca ? 'Tente buscar com outros termos.' : 'Nenhum cartao RFID foi vinculado no sistema.'} 
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
        <Modal titulo="Vincular novo cartao" aoFechar={() => setModalAberto(false)} largura="500px">
          <FormularioCartao usuarios={usuarios} aoSalvar={aoVincular} />
        </Modal>
      )}

      <ModalConfirmacao
        aberto={!!cartaoExclusao}
        titulo="Excluir cartao"
        mensagem={`Tem certeza que deseja excluir o cartao UID "${cartaoExclusao?.uid}"? Cartoes que ja foram usados nao podem ser excluidos (o historico e preservado); nesse caso, desative o cartao.`}
        textoConfirmar="Sim, excluir"
        variante="danger"
        carregando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setCartaoExclusao(null)}
      />
    </div>
  );
}

function FormularioCartao({ usuarios, aoSalvar }) {
  const [uid, setUid] = useState('');
  const [idUsuario, setIdUsuario] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const cartao = await api.post('/cartoes', {
        uid,
        id_usuario: Number(idUsuario),
        data_validade: dataValidade || null,
      });
      aoSalvar(cartao);
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
          UID do cartao
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Ex.: A1B2C3D4"
            required
            className="sg-input sg-mono"
            autoFocus
          />
        </label>

        <label className="sg-label sg-label-required">
          Usuario vinculado
          <select
            value={idUsuario}
            onChange={(e) => setIdUsuario(e.target.value)}
            required
            className="sg-select"
          >
            <option value="" disabled>Selecione um usuario</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id_usuario} value={usuario.id_usuario}>
                {usuario.nome} ({usuario.tipo})
              </option>
            ))}
          </select>
        </label>

        <label className="sg-label">
          Validade (opcional)
          <input
            type="date"
            value={dataValidade}
            onChange={(e) => setDataValidade(e.target.value)}
            className="sg-input"
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
            <><Spinner tamanho="sm" /> Vinculando...</>
          ) : (
            'Vincular cartao'
          )}
        </button>
      </div>
    </form>
  );
}