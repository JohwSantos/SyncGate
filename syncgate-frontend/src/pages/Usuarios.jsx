import { useEffect, useState } from 'react';
import { Plus, Pencil, Lock, Unlock, Trash2 } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { usePermissoes } from '../hooks/usePermissoes';

const TIPOS = ['aluno', 'professor', 'funcionario', 'admin'];
const PERFIS = ['operador', 'gestor', 'master'];

export default function Usuarios() {
  const { podeGerenciarUsuarios } = usePermissoes();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);

  // null = modal fechado; {} = criando; objeto de usuário = editando
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState(null);
  const [erroExclusao, setErroExclusao] = useState(null);

  async function carregarUsuarios() {
    try {
      setCarregando(true);
      setUsuarios(await api.get('/usuarios'));
      setErroLista(null);
    } catch (erro) {
      setErroLista(erro.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function alternarStatus(usuario) {
    const atualizado = await api.patch(`/usuarios/${usuario.id_usuario}/status`, {
      ativo: !usuario.status,
    });
    setUsuarios((atual) =>
      atual.map((u) => (u.id_usuario === atualizado.id_usuario ? atualizado : u))
    );
  }

  async function excluirUsuario(usuario) {
    const confirmou = window.confirm(
      `Excluir definitivamente "${usuario.nome}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmou) return;

    setErroExclusao(null);
    try {
      await api.delete(`/usuarios/${usuario.id_usuario}`);
      setUsuarios((atual) => atual.filter((u) => u.id_usuario !== usuario.id_usuario));
    } catch (erro) {
      // Erro esperado quando o usuário tem cartões/solicitações
      // vinculadas — o backend explica o motivo, só repassamos.
      setErroExclusao(erro.message);
    }
  }

  function aoSalvarUsuario(usuarioSalvo) {
    setUsuarios((atual) => {
      const jaExiste = atual.some((u) => u.id_usuario === usuarioSalvo.id_usuario);
      return jaExiste
        ? atual.map((u) => (u.id_usuario === usuarioSalvo.id_usuario ? usuarioSalvo : u))
        : [...atual, usuarioSalvo];
    });
    setUsuarioEmEdicao(null);
  }

  return (
    <div style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Usuários</h1>
        {podeGerenciarUsuarios && (
          <button style={estilos.botaoPrimario} onClick={() => setUsuarioEmEdicao({})}>
            <Plus size={16} /> Novo usuário
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
                <th style={estilos.th}>Nome</th>
                <th style={estilos.th}>CPF</th>
                <th style={estilos.th}>Tipo</th>
                <th style={estilos.th}>Login</th>
                <th style={estilos.th}>Perfil</th>
                <th style={estilos.th}>Status</th>
                {podeGerenciarUsuarios && <th style={estilos.th}></th>}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <td style={estilos.td} data-rotulo="Nome">{usuario.nome}</td>
                  <td style={{ ...estilos.td, fontFamily: 'var(--fonte-mono)' }} data-rotulo="CPF">{usuario.cpf}</td>
                  <td style={{ ...estilos.td, textTransform: 'capitalize' }} data-rotulo="Tipo">{usuario.tipo}</td>
                  <td style={estilos.td} data-rotulo="Login">{usuario.login}</td>
                  <td style={{ ...estilos.td, textTransform: 'capitalize' }} data-rotulo="Perfil">{usuario.perfil || '—'}</td>
                  <td style={estilos.td} data-rotulo="Status">
                    <Badge
                      texto={usuario.status ? 'Ativo' : 'Bloqueado'}
                      tom={usuario.status ? 'sucesso' : 'perigo'}
                    />
                  </td>
                  {podeGerenciarUsuarios && (
                    <td style={{ ...estilos.td, display: 'flex', gap: '0.4rem' }}>
                      <button
                        style={estilos.botaoIcone}
                        title="Editar"
                        onClick={() => setUsuarioEmEdicao(usuario)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        style={estilos.botaoIcone}
                        title={usuario.status ? 'Bloquear' : 'Desbloquear'}
                        onClick={() => alternarStatus(usuario)}
                      >
                        {usuario.status ? <Lock size={16} /> : <Unlock size={16} />}
                      </button>
                      <button
                        style={{ ...estilos.botaoIcone, color: 'var(--cor-perigo)' }}
                        title="Excluir definitivamente"
                        onClick={() => excluirUsuario(usuario)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarUsuarios ? 7 : 6} style={{ ...estilos.td, color: 'var(--cor-texto-suave)' }}>
                    Nenhum usuário cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {usuarioEmEdicao !== null && (
        <Modal
          titulo={usuarioEmEdicao.id_usuario ? 'Editar usuário' : 'Novo usuário'}
          aoFechar={() => setUsuarioEmEdicao(null)}
        >
          <FormularioUsuario usuarioInicial={usuarioEmEdicao} aoSalvar={aoSalvarUsuario} />
        </Modal>
      )}
    </div>
  );
}

function FormularioUsuario({ usuarioInicial, aoSalvar }) {
  const emEdicao = !!usuarioInicial.id_usuario;

  const [dados, setDados] = useState({
    nome: usuarioInicial.nome || '',
    cpf: usuarioInicial.cpf || '',
    tipo: usuarioInicial.tipo || 'aluno',
    login: usuarioInicial.login || '',
    senha: '',
    email: usuarioInicial.email || '',
    telefone: usuarioInicial.telefone || '',
    matricula: usuarioInicial.matricula || '',
    curso: usuarioInicial.curso || '',
    turma: usuarioInicial.turma || '',
    cargo: usuarioInicial.cargo || '',
    perfil: usuarioInicial.perfil || '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  function atualizarCampo(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      let usuarioSalvo;

      if (emEdicao) {
        // A API de atualização só aceita estes campos — cpf, tipo,
        // login e senha não podem ser alterados por aqui.
        usuarioSalvo = await api.put(`/usuarios/${usuarioInicial.id_usuario}`, {
          nome: dados.nome,
          matricula: dados.matricula || null,
          email: dados.email || null,
          telefone: dados.telefone || null,
          curso: dados.curso || null,
          turma: dados.turma || null,
          cargo: dados.cargo || null,
          perfil: dados.perfil || null,
        });
      } else {
        usuarioSalvo = await api.post('/usuarios', {
          ...dados,
          perfil: dados.perfil || null,
        });
      }

      aoSalvar(usuarioSalvo);
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} style={estilosForm.form}>
      <Campo rotulo="Nome completo" obrigatorio>
        <input
          value={dados.nome}
          onChange={(e) => atualizarCampo('nome', e.target.value)}
          required
          style={estilosForm.campo}
        />
      </Campo>

      <div style={estilosForm.linha}>
        <Campo rotulo="CPF" obrigatorio>
          <input
            value={dados.cpf}
            onChange={(e) => atualizarCampo('cpf', e.target.value)}
            required
            disabled={emEdicao}
            style={estilosForm.campo}
          />
        </Campo>
        <Campo rotulo="Tipo" obrigatorio>
          <select
            value={dados.tipo}
            onChange={(e) => atualizarCampo('tipo', e.target.value)}
            disabled={emEdicao}
            style={estilosForm.campo}
          >
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div style={estilosForm.linha}>
        <Campo rotulo="Login" obrigatorio>
          <input
            value={dados.login}
            onChange={(e) => atualizarCampo('login', e.target.value)}
            required
            disabled={emEdicao}
            style={estilosForm.campo}
          />
        </Campo>
        {!emEdicao && (
          <Campo rotulo="Senha" obrigatorio>
            <input
              type="password"
              value={dados.senha}
              onChange={(e) => atualizarCampo('senha', e.target.value)}
              required
              style={estilosForm.campo}
            />
          </Campo>
        )}
      </div>

      <Campo rotulo="Perfil (acesso ao painel)">
        <select
          value={dados.perfil}
          onChange={(e) => atualizarCampo('perfil', e.target.value)}
          style={estilosForm.campo}
        >
          <option value="">Nenhum</option>
          {PERFIS.map((perfil) => (
            <option key={perfil} value={perfil}>
              {perfil}
            </option>
          ))}
        </select>
      </Campo>

      <div style={estilosForm.linha}>
        <Campo rotulo="E-mail">
          <input
            type="email"
            value={dados.email}
            onChange={(e) => atualizarCampo('email', e.target.value)}
            style={estilosForm.campo}
          />
        </Campo>
        <Campo rotulo="Telefone">
          <input
            value={dados.telefone}
            onChange={(e) => atualizarCampo('telefone', e.target.value)}
            style={estilosForm.campo}
          />
        </Campo>
      </div>

      {dados.tipo === 'aluno' && (
        <div style={estilosForm.linha}>
          <Campo rotulo="Curso">
            <input
              value={dados.curso}
              onChange={(e) => atualizarCampo('curso', e.target.value)}
              style={estilosForm.campo}
            />
          </Campo>
          <Campo rotulo="Turma">
            <input
              value={dados.turma}
              onChange={(e) => atualizarCampo('turma', e.target.value)}
              style={estilosForm.campo}
            />
          </Campo>
        </div>
      )}

      {(dados.tipo === 'professor' || dados.tipo === 'funcionario') && (
        <Campo rotulo="Cargo">
          <input
            value={dados.cargo}
            onChange={(e) => atualizarCampo('cargo', e.target.value)}
            style={estilosForm.campo}
          />
        </Campo>
      )}

      {erro && <div style={estilosForm.faixaErro}>{erro}</div>}

      <button type="submit" disabled={salvando} style={estilosForm.botaoSalvar}>
        {salvando ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}

function Campo({ rotulo, obrigatorio, children }) {
  return (
    <label style={estilosForm.rotulo}>
      {rotulo} {obrigatorio && <span style={{ color: 'var(--cor-perigo)' }}>*</span>}
      {children}
    </label>
  );
}

const estilos = {
  pagina: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  cabecalho: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: {
    fontSize: '1.4rem',
  },
  botaoPrimario: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--cor-blue-600)',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1rem',
    borderRadius: 'var(--raio-pequeno)',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  tabelaContainer: {
    background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)',
    overflow: 'auto',
    boxShadow: 'var(--sombra)',
  },
  tabela: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.8rem 1rem',
    borderBottom: '1px solid var(--cor-borda)',
    color: 'var(--cor-texto-suave)',
    fontWeight: 600,
    fontSize: '0.78rem',
  },
  td: {
    padding: '0.7rem 1rem',
    borderBottom: '1px solid var(--cor-borda)',
  },
  botaoIcone: {
    border: '1px solid var(--cor-borda)',
    background: 'var(--cor-superficie)',
    borderRadius: 'var(--raio-pequeno)',
    padding: '0.35rem',
    display: 'flex',
    color: 'var(--cor-texto-suave)',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)',
    color: 'var(--cor-perigo)',
    padding: '0.8rem 1rem',
    borderRadius: 'var(--raio)',
  },
};

const estilosForm = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  linha: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.9rem',
  },
  rotulo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.82rem',
    fontWeight: 500,
    color: 'var(--cor-texto-suave)',
  },
  campo: {
    padding: '0.55rem 0.7rem',
    borderRadius: 'var(--raio-pequeno)',
    border: '1px solid var(--cor-borda)',
    fontSize: '0.9rem',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)',
    color: 'var(--cor-perigo)',
    padding: '0.6rem 0.8rem',
    borderRadius: 'var(--raio-pequeno)',
    fontSize: '0.85rem',
  },
  botaoSalvar: {
    marginTop: '0.3rem',
    padding: '0.7rem',
    borderRadius: 'var(--raio-pequeno)',
    border: 'none',
    background: 'var(--cor-blue-600)',
    color: 'white',
    fontWeight: 600,
  },
};
