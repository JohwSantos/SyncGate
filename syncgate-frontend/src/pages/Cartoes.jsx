import { useEffect, useState } from 'react';
import { Plus, Lock, Unlock, Trash2 } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { usePermissoes } from '../hooks/usePermissoes';

export default function Cartoes() {
  const { podeGerenciarCartoesDispositivos } = usePermissoes();
  const [cartoes, setCartoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregarDados() {
    try {
      setCarregando(true);
      const [listaCartoes, listaUsuarios] = await Promise.all([
        api.get('/cartoes'),
        api.get('/usuarios'),
      ]);
      setCartoes(listaCartoes);
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

  async function alternarAtivo(cartao) {
    const atualizado = await api.patch(`/cartoes/${cartao.id_cartao}/status`, {
      ativo: !cartao.ativo,
    });
    setCartoes((atual) =>
      atual.map((c) => (c.id_cartao === atualizado.id_cartao ? atualizado : c))
    );
  }

  async function excluirCartao(cartao) {
    const confirmou = window.confirm(
      `Excluir o cartão "${cartao.uid}"? O histórico de acessos feitos com ele não será apagado.`
    );
    if (!confirmou) return;

    setErroExclusao(null);
    try {
      await api.delete(`/cartoes/${cartao.id_cartao}`);
      setCartoes((atual) => atual.filter((c) => c.id_cartao !== cartao.id_cartao));
    } catch (erro) {
      setErroExclusao(erro.message);
    }
  }

  function nomeDoUsuario(idUsuario) {
    const usuario = usuarios.find((u) => u.id_usuario === idUsuario);
    return usuario ? usuario.nome : `Usuário #${idUsuario}`;
  }

  function aoVincular(cartaoCriado) {
    setCartoes((atual) => [...atual, cartaoCriado]);
    setModalAberto(false);
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Cartões RFID</h1>
        {podeGerenciarCartoesDispositivos && (
          <button style={estilos.botaoPrimario} onClick={() => setModalAberto(true)}>
            <Plus size={16} /> Vincular cartão
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
                <th style={estilos.th}>UID</th>
                <th style={estilos.th}>Usuário</th>
                <th style={estilos.th}>Validade</th>
                <th style={estilos.th}>Status</th>
                {podeGerenciarCartoesDispositivos && <th style={estilos.th}></th>}
              </tr>
            </thead>
            <tbody>
              {cartoes.map((cartao) => (
                <tr key={cartao.id_cartao}>
                  <td style={{ ...estilos.td, fontFamily: 'var(--fonte-mono)' }} data-rotulo="UID">{cartao.uid}</td>
                  <td style={estilos.td} data-rotulo="Usuário">{nomeDoUsuario(cartao.id_usuario)}</td>
                  <td style={estilos.td} data-rotulo="Validade">
                    {cartao.data_validade
                      ? new Date(cartao.data_validade).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td style={estilos.td} data-rotulo="Status">
                    <Badge
                      texto={cartao.ativo ? 'Ativo' : 'Inativo'}
                      tom={cartao.ativo ? 'sucesso' : 'perigo'}
                    />
                  </td>
                  {podeGerenciarCartoesDispositivos && (
                    <td style={{ ...estilos.td, display: 'flex', gap: '0.4rem' }}>
                      <button
                        style={estilos.botaoIcone}
                        title={cartao.ativo ? 'Desativar' : 'Ativar'}
                        onClick={() => alternarAtivo(cartao)}
                      >
                        {cartao.ativo ? <Lock size={16} /> : <Unlock size={16} />}
                      </button>
                      <button
                        style={{ ...estilos.botaoIcone, color: 'var(--cor-perigo)' }}
                        title="Excluir"
                        onClick={() => excluirCartao(cartao)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {cartoes.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarCartoesDispositivos ? 5 : 4} style={{ ...estilos.td, color: 'var(--cor-texto-suave)' }}>
                    Nenhum cartão vinculado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal titulo="Vincular novo cartão" aoFechar={() => setModalAberto(false)}>
          <FormularioCartao usuarios={usuarios} aoSalvar={aoVincular} />
        </Modal>
      )}
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
    <form onSubmit={aoEnviar} style={estilosForm.form}>
      <label style={estilosForm.rotulo}>
        UID do cartão <span style={{ color: 'var(--cor-perigo)' }}>*</span>
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="Ex.: A1B2C3D4"
          required
          style={estilosForm.campo}
        />
      </label>

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
              {usuario.nome} ({usuario.tipo})
            </option>
          ))}
        </select>
      </label>

      <label style={estilosForm.rotulo}>
        Validade (opcional)
        <input
          type="date"
          value={dataValidade}
          onChange={(e) => setDataValidade(e.target.value)}
          style={estilosForm.campo}
        />
      </label>

      {erro && <div style={estilosForm.faixaErro}>{erro}</div>}

      <button type="submit" disabled={salvando} style={estilosForm.botaoSalvar}>
        {salvando ? 'Salvando...' : 'Vincular'}
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
    color: 'var(--cor-texto-suave)',
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
