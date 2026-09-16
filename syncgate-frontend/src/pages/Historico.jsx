import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import Badge from '../components/Badge';
import { useSocket } from '../hooks/useSocket';

function formatarDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function Historico() {
  const [acessos, setAcessos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [filtroUsuario, setFiltroUsuario] = useState('todos');
  const [filtroDispositivo, setFiltroDispositivo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const [listaAcessos, listaUsuarios, listaDispositivos] = await Promise.all([
          api.get('/acesso'),
          api.get('/usuarios'),
          api.get('/dispositivos'),
        ]);
        setAcessos(listaAcessos);
        setUsuarios(listaUsuarios);
        setDispositivos(listaDispositivos);
        setErro(null);
      } catch (erroCarregar) {
        setErro(erroCarregar.message);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // Novos acessos entram direto na lista completa — os filtros
  // (calculados abaixo, via useMemo) decidem sozinhos se o novo
  // registro deve aparecer ou não na tabela.
  useSocket({
    'novo-acesso': ({ registro }) => {
      setAcessos((atual) => [registro, ...atual]);
    },
  });

  function nomeDoUsuario(idUsuario) {
    if (!idUsuario) return 'Desconhecido';
    return usuarios.find((u) => u.id_usuario === idUsuario)?.nome || `Usuário #${idUsuario}`;
  }

  function descricaoDoDispositivo(idDispositivo) {
    return (
      dispositivos.find((d) => d.id_dispositivo === idDispositivo)?.descricao ||
      `Dispositivo #${idDispositivo}`
    );
  }

  const acessosFiltrados = useMemo(() => {
    return acessos.filter((acesso) => {
      if (filtroUsuario !== 'todos' && String(acesso.id_usuario) !== filtroUsuario) return false;
      if (filtroDispositivo !== 'todos' && String(acesso.id_dispositivo) !== filtroDispositivo) return false;
      if (filtroStatus !== 'todos' && acesso.status !== filtroStatus) return false;

      const dataAcesso = new Date(acesso.data_hora);
      if (dataInicio && dataAcesso < new Date(`${dataInicio}T00:00:00`)) return false;
      if (dataFim && dataAcesso > new Date(`${dataFim}T23:59:59`)) return false;

      return true;
    });
  }, [acessos, filtroUsuario, filtroDispositivo, filtroStatus, dataInicio, dataFim]);

  return (
    <div style={estilos.pagina}>
      <h1 style={estilos.titulo}>Histórico de Acessos</h1>

      <div style={estilos.faixaFiltros}>
        <label style={estilos.rotuloFiltro}>
          Usuário
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            style={estilos.campoFiltro}
          >
            <option value="todos">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>

        <label style={estilos.rotuloFiltro}>
          Dispositivo
          <select
            value={filtroDispositivo}
            onChange={(e) => setFiltroDispositivo(e.target.value)}
            style={estilos.campoFiltro}
          >
            <option value="todos">Todos</option>
            {dispositivos.map((d) => (
              <option key={d.id_dispositivo} value={d.id_dispositivo}>
                {d.descricao}
              </option>
            ))}
          </select>
        </label>

        <label style={estilos.rotuloFiltro}>
          Status
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={estilos.campoFiltro}
          >
            <option value="todos">Todos</option>
            <option value="permitido">Permitido</option>
            <option value="negado">Negado</option>
          </select>
        </label>

        <label style={estilos.rotuloFiltro}>
          De
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            style={estilos.campoFiltro}
          />
        </label>

        <label style={estilos.rotuloFiltro}>
          Até
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            style={estilos.campoFiltro}
          />
        </label>
      </div>

      {carregando && <p style={{ color: 'var(--cor-texto-suave)' }}>Carregando...</p>}
      {erro && <div style={estilos.faixaErro}>{erro}</div>}

      {!carregando && !erro && (
        <div style={estilos.tabelaContainer}>
          <table style={estilos.tabela} className="sg-tabela-responsiva">
            <thead>
              <tr>
                <th style={estilos.th}>Data/Hora</th>
                <th style={estilos.th}>Usuário</th>
                <th style={estilos.th}>Dispositivo</th>
                <th style={estilos.th}>Movimento</th>
                <th style={estilos.th}>Status</th>
                <th style={estilos.th}>Motivo (se negado)</th>
              </tr>
            </thead>
            <tbody>
              {acessosFiltrados.map((acesso) => (
                <tr key={acesso.id_acesso}>
                  <td style={{ ...estilos.td, fontFamily: 'var(--fonte-mono)', fontSize: '0.8rem' }} data-rotulo="Data/Hora">
                    {formatarDataHora(acesso.data_hora)}
                  </td>
                  <td style={estilos.td} data-rotulo="Usuário">{nomeDoUsuario(acesso.id_usuario)}</td>
                  <td style={estilos.td} data-rotulo="Dispositivo">{descricaoDoDispositivo(acesso.id_dispositivo)}</td>
                  <td style={{ ...estilos.td, textTransform: 'capitalize' }} data-rotulo="Movimento">{acesso.tipo_movimento}</td>
                  <td style={estilos.td} data-rotulo="Status">
                    <Badge
                      texto={acesso.status === 'permitido' ? 'Permitido' : 'Negado'}
                      tom={acesso.status === 'permitido' ? 'sucesso' : 'perigo'}
                    />
                  </td>
                  <td style={{ ...estilos.td, color: 'var(--cor-texto-suave)' }} data-rotulo="Motivo">
                    {acesso.motivo_negado || '—'}
                  </td>
                </tr>
              ))}

              {acessosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...estilos.td, color: 'var(--cor-texto-suave)' }}>
                    Nenhum acesso encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={estilos.contagem}>
        {acessosFiltrados.length} de {acessos.length} registros
      </p>
    </div>
  );
}

const estilos = {
  pagina: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  titulo: { fontSize: '1.4rem' },
  faixaFiltros: {
    display: 'flex', flexWrap: 'wrap', gap: '1rem', background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)', borderRadius: 'var(--raio)', padding: '1rem 1.1rem',
  },
  rotuloFiltro: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem',
    fontWeight: 500, color: 'var(--cor-texto-suave)',
  },
  campoFiltro: {
    padding: '0.4rem 0.55rem', borderRadius: 'var(--raio-pequeno)',
    border: '1px solid var(--cor-borda)', fontSize: '0.85rem', minWidth: '9rem',
  },
  tabelaContainer: {
    background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)', overflow: 'auto', boxShadow: 'var(--sombra)',
  },
  tabela: { width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' },
  th: {
    textAlign: 'left', padding: '0.8rem 1rem', borderBottom: '1px solid var(--cor-borda)',
    color: 'var(--cor-texto-suave)', fontWeight: 600, fontSize: '0.78rem',
  },
  td: { padding: '0.65rem 1rem', borderBottom: '1px solid var(--cor-borda)' },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)', color: 'var(--cor-perigo)',
    padding: '0.8rem 1rem', borderRadius: 'var(--raio)',
  },
  contagem: { fontSize: '0.8rem', color: 'var(--cor-texto-suave)' },
};
