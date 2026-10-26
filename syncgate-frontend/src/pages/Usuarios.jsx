import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Lock, Unlock, Trash2, Search } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import Paginacao from '../components/Paginacao';
import Spinner from '../components/Spinner';
import EstadoVazio from '../components/EstadoVazio';
import ModalConfirmacao from '../components/ModalConfirmacao';
import BotoesCSV from '../components/BotoesCSV';
import { usePermissoes } from '../hooks/usePermissoes';

const TIPOS = ['aluno', 'professor', 'funcionario', 'admin'];
const PERFIS = ['operador', 'gestor', 'master'];

export default function Usuarios() {
  const { podeGerenciarUsuarios } = usePermissoes();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // null = modal fechado; {} = criando; objeto de usuario = editando
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState(null);
  
  // Para exclusao
  const [usuarioExclusao, setUsuarioExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const [erroAcao, setErroAcao] = useState(null);
  const [busca, setBusca] = useState('');

  const carregarUsuarios = useCallback(async (pag = 1) => {
    try {
      setCarregando(true);
      const resp = await api.get(
        `/usuarios?pagina=${pag}&limite=10&busca=${encodeURIComponent(busca.trim())}`
      );
      setUsuarios(resp.dados);
      setTotalPaginas(resp.totalPaginas);
      setTotalRegistros(resp.total);
      setPagina(resp.pagina);
      setErroLista(null);
    } catch (erro) {
      setErroLista(erro.message);
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => {
    const temporizador = setTimeout(() => carregarUsuarios(1), 300);
    return () => clearTimeout(temporizador);
  }, [busca, carregarUsuarios]);

  async function alternarStatus(usuario) {
    setErroAcao(null);
    try {
      const atualizado = await api.patch(`/usuarios/${usuario.id_usuario}/status`, {
        ativo: !usuario.status,
      });
      setUsuarios((atual) =>
        atual.map((u) => (u.id_usuario === atualizado.id_usuario ? atualizado : u))
      );
    } catch (erro) {
      setErroAcao(erro.message);
    }
  }

  async function confirmarExclusao() {
    if (!usuarioExclusao) return;
    setErroAcao(null);
    setExcluindo(true);
    try {
      await api.delete(`/usuarios/${usuarioExclusao.id_usuario}`);
      carregarUsuarios(pagina);
      setUsuarioExclusao(null);
    } catch (erro) {
      setErroAcao(erro.message);
      setUsuarioExclusao(null);
    } finally {
      setExcluindo(false);
    }
  }

  function aoSalvarUsuario() {
    carregarUsuarios(pagina);
    setUsuarioEmEdicao(null);
  }

  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Usuarios</h1>
          <p className="sg-page-subtitle">Gerencie as pessoas com acesso ao sistema</p>
        </div>
        <div className="sg-page-actions">
          <BotoesCSV 
            rotaExportar="/csv/usuarios/exportar" 
            nomeArquivo="usuarios.csv" 
            rotaImportar="/csv/usuarios/importar"
            aoImportar={() => carregarUsuarios(pagina)}
          />
          {podeGerenciarUsuarios && (
            <button className="sg-btn sg-btn-primary" onClick={() => setUsuarioEmEdicao({})}>
              <Plus size={16} /> Novo usuario
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
            placeholder="Pesquisar por nome, CPF ou login..."
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
          <Spinner /> Carregando usuarios...
        </div>
      ) : !erroLista ? (
        <div className="sg-table-wrap">
          <table className="sg-table sg-table-responsive">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Tipo</th>
                <th>Login</th>
                <th>Perfil</th>
                <th>Status</th>
                {podeGerenciarUsuarios && <th></th>}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <td data-rotulo="Nome"><strong>{usuario.nome}</strong></td>
                  <td className="sg-td-mono" data-rotulo="CPF">{usuario.cpf}</td>
                  <td data-rotulo="Tipo" style={{ textTransform: 'capitalize' }}>{usuario.tipo}</td>
                  <td data-rotulo="Login">{usuario.login}</td>
                  <td data-rotulo="Perfil" style={{ textTransform: 'capitalize' }}>{usuario.perfil || '—'}</td>
                  <td data-rotulo="Status">
                    <Badge
                      texto={usuario.status ? 'Ativo' : 'Bloqueado'}
                      tom={usuario.status ? 'sucesso' : 'perigo'}
                    />
                  </td>
                  {podeGerenciarUsuarios && (
                    <td className="sg-td-actions">
                      <div style={{ display: 'flex', gap: 'var(--sg-space-1)', justifyContent: 'flex-end' }}>
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          title="Editar"
                          onClick={() => setUsuarioEmEdicao(usuario)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          title={usuario.status ? 'Bloquear acesso' : 'Desbloquear acesso'}
                          onClick={() => alternarStatus(usuario)}
                        >
                          {usuario.status ? <Lock size={15} /> : <Unlock size={15} />}
                        </button>
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          style={{ color: 'var(--sg-danger)' }}
                          title="Excluir definitivamente"
                          onClick={() => setUsuarioExclusao(usuario)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarUsuarios ? 7 : 6} style={{ padding: 0 }}>
                    <EstadoVazio 
                      icone="busca" 
                      titulo="Nenhum usuario encontrado" 
                      descricao={busca ? 'Tente buscar com outros termos.' : 'Nao ha usuarios cadastrados no sistema ainda.'} 
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
            aoMudar={carregarUsuarios}
          />
        </div>
      ) : null}

      {usuarioEmEdicao !== null && (
        <Modal
          titulo={usuarioEmEdicao.id_usuario ? 'Editar usuario' : 'Novo usuario'}
          aoFechar={() => setUsuarioEmEdicao(null)}
          largura="600px"
        >
          <FormularioUsuario usuarioInicial={usuarioEmEdicao} aoSalvar={aoSalvarUsuario} />
        </Modal>
      )}

      <ModalConfirmacao
        aberto={!!usuarioExclusao}
        titulo="Excluir usuario"
        mensagem={`Tem certeza que deseja excluir o usuario "${usuarioExclusao?.nome}"? Esta acao nao pode ser desfeita.`}
        textoConfirmar="Sim, excluir"
        variante="danger"
        carregando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setUsuarioExclusao(null)}
      />
    </div>
  );
}
function FormularioUsuario({ usuarioInicial, aoSalvar }) {
  const emEdicao = !!usuarioInicial.id_usuario;
  const { podeAtribuirPerfisRestritos } = usePermissoes();

  // Um gestor só pode dar o perfil "operador". O perfil atual do
  // usuário editado continua na lista para aparecer selecionado
  // (mantê-lo é permitido; o backend só barra a MUDANÇA).
  const perfisDisponiveis = PERFIS.filter(
    (perfil) =>
      podeAtribuirPerfisRestritos || perfil === 'operador' || perfil === usuarioInicial.perfil
  );

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
    <form onSubmit={aoEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-4)' }}>
      
      {/* Secao: Dados principais */}
      <div>
        <h3 className="sg-section-title">Dados de identificacao</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)' }}>
          <label className="sg-label sg-label-required">
            Nome completo
            <input
              type="text"
              value={dados.nome}
              onChange={(e) => atualizarCampo('nome', e.target.value)}
              required
              className="sg-input"
              placeholder="Ex: Maria da Silva"
            />
          </label>

          <div className="sg-form-row">
            <label className="sg-label sg-label-required">
              CPF
              <input
                type="text"
                value={dados.cpf}
                onChange={(e) => atualizarCampo('cpf', e.target.value)}
                required
                disabled={emEdicao}
                className="sg-input sg-mono"
                placeholder="000.000.000-00"
              />
            </label>
            <label className="sg-label sg-label-required">
              Tipo de vinculo
              <select
                value={dados.tipo}
                onChange={(e) => atualizarCampo('tipo', e.target.value)}
                disabled={emEdicao}
                className="sg-select"
                style={{ textTransform: 'capitalize' }}
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="sg-divider" style={{ margin: 'var(--sg-space-2) 0' }} />

      {/* Secao: Acesso */}
      <div>
        <h3 className="sg-section-title">Credenciais de acesso</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)' }}>
          <div className="sg-form-row">
            <label className="sg-label sg-label-required">
              Login
              <input
                type="text"
                value={dados.login}
                onChange={(e) => atualizarCampo('login', e.target.value)}
                required
                disabled={emEdicao}
                className="sg-input"
                placeholder="Ex: maria.silva"
              />
            </label>
            {!emEdicao && (
              <label className="sg-label sg-label-required">
                Senha provisoria
                <input
                  type="password"
                  value={dados.senha}
                  onChange={(e) => atualizarCampo('senha', e.target.value)}
                  required
                  className="sg-input"
                  placeholder="********"
                />
              </label>
            )}
          </div>

          <label className="sg-label">
            Perfil no painel administrativo
            <select
              value={dados.perfil}
              onChange={(e) => atualizarCampo('perfil', e.target.value)}
              className="sg-select"
              style={{ textTransform: 'capitalize' }}
            >
              <option value="">Nenhum (nao acessa o painel)</option>
              {perfisDisponiveis.map((perfil) => (
                <option key={perfil} value={perfil}>{perfil}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="sg-divider" style={{ margin: 'var(--sg-space-2) 0' }} />

      {/* Secao: Contato */}
      <div>
        <h3 className="sg-section-title">Contato e Informacoes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)' }}>
          <div className="sg-form-row">
            <label className="sg-label">
              E-mail
              <input
                type="email"
                value={dados.email}
                onChange={(e) => atualizarCampo('email', e.target.value)}
                className="sg-input"
                placeholder="Ex: maria@email.com"
              />
            </label>
            <label className="sg-label">
              Telefone
              <input
                type="text"
                value={dados.telefone}
                onChange={(e) => atualizarCampo('telefone', e.target.value)}
                className="sg-input sg-mono"
                placeholder="(11) 90000-0000"
              />
            </label>
          </div>

          {dados.tipo === 'aluno' && (
            <div className="sg-form-row">
              <label className="sg-label">
                Curso
                <input
                  type="text"
                  value={dados.curso}
                  onChange={(e) => atualizarCampo('curso', e.target.value)}
                  className="sg-input"
                />
              </label>
              <label className="sg-label">
                Turma
                <input
                  type="text"
                  value={dados.turma}
                  onChange={(e) => atualizarCampo('turma', e.target.value)}
                  className="sg-input"
                />
              </label>
            </div>
          )}

          {(dados.tipo === 'professor' || dados.tipo === 'funcionario') && (
            <label className="sg-label">
              Cargo / Funcao
              <input
                type="text"
                value={dados.cargo}
                onChange={(e) => atualizarCampo('cargo', e.target.value)}
                className="sg-input"
              />
            </label>
          )}
        </div>
      </div>

      {erro && (
        <div className="sg-alert sg-alert--error" role="alert" style={{ marginTop: 'var(--sg-space-2)' }}>
          <span>{erro}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sg-space-2)' }}>
        <button type="submit" disabled={salvando} className="sg-btn sg-btn-primary sg-btn-lg">
          {salvando ? (
            <><Spinner tamanho="sm" /> Salvando...</>
          ) : (
            emEdicao ? 'Salvar alteracoes' : 'Cadastrar usuario'
          )}
        </button>
      </div>
    </form>
  );
}
