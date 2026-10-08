import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import Badge from '../components/Badge';
import Paginacao from '../components/Paginacao';
import Spinner from '../components/Spinner';
import EstadoVazio from '../components/EstadoVazio';
import BotoesCSV from '../components/BotoesCSV';
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
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const [filtroUsuario, setFiltroUsuario] = useState('todos');
  const [filtroDispositivo, setFiltroDispositivo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const carregar = useCallback(async (pag = 1) => {
    const parametros = new URLSearchParams({ pagina: String(pag), limite: '15' });
    if (filtroUsuario !== 'todos') parametros.set('idUsuario', filtroUsuario);
    if (filtroDispositivo !== 'todos') parametros.set('idDispositivo', filtroDispositivo);
    if (filtroStatus !== 'todos') parametros.set('status', filtroStatus);
    if (dataInicio) parametros.set('dataInicio', dataInicio);
    if (dataFim) parametros.set('dataFim', dataFim);

      try {
        setCarregando(true);
        const [respAcessos, listaUsuarios, listaDispositivos] = await Promise.all([
          api.get(`/acesso?${parametros.toString()}`),
          api.get('/usuarios'),
          api.get('/dispositivos'),
        ]);
        setAcessos(respAcessos.dados);
        setTotalPaginas(respAcessos.totalPaginas);
        setTotalRegistros(respAcessos.total);
        setPagina(respAcessos.pagina);
        setUsuarios(listaUsuarios);
        setDispositivos(listaDispositivos);
        setErro(null);
      } catch (erroCarregar) {
        setErro(erroCarregar.message);
      } finally {
        setCarregando(false);
      }
  }, [filtroUsuario, filtroDispositivo, filtroStatus, dataInicio, dataFim]);

  useEffect(() => {
    carregar(1);
  }, [carregar]);

  useSocket({
    'novo-acesso': () => {
      // Quando entra novo acesso em tempo real, atualizamos
      if (pagina === 1) {
        carregar(1);
      }
    },
  });

  function nomeDoUsuario(idUsuario) {
    if (!idUsuario) return 'Desconhecido';
    return usuarios.find((u) => u.id_usuario === idUsuario)?.nome || `Usuario #${idUsuario}`;
  }

  function descricaoDoDispositivo(idDispositivo) {
    return (
      dispositivos.find((d) => d.id_dispositivo === idDispositivo)?.descricao ||
      `Dispositivo #${idDispositivo}`
    );
  }

  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Historico de Acessos</h1>
          <p className="sg-page-subtitle">Acompanhe as entradas e saidas registradas em tempo real</p>
        </div>
        <div className="sg-page-actions">
          <BotoesCSV 
            rotaExportar="/csv/acesso/exportar" 
            nomeArquivo="historico_acessos.csv" 
            rotaImportar={null}
          />
        </div>
      </div>

      <div className="sg-toolbar" style={{ flexWrap: 'wrap' }}>
        <label className="sg-label" style={{ minWidth: '150px', flex: 1 }}>
          Usuario
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="sg-select"
          >
            <option value="todos">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>{u.nome}</option>
            ))}
          </select>
        </label>

        <label className="sg-label" style={{ minWidth: '150px', flex: 1 }}>
          Dispositivo
          <select
            value={filtroDispositivo}
            onChange={(e) => setFiltroDispositivo(e.target.value)}
            className="sg-select"
          >
            <option value="todos">Todos</option>
            {dispositivos.map((d) => (
              <option key={d.id_dispositivo} value={d.id_dispositivo}>{d.descricao}</option>
            ))}
          </select>
        </label>

        <label className="sg-label" style={{ minWidth: '120px', flex: 1 }}>
          Status
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="sg-select"
          >
            <option value="todos">Todos</option>
            <option value="permitido">Permitido</option>
            <option value="negado">Negado</option>
          </select>
        </label>

        <label className="sg-label" style={{ minWidth: '140px', flex: 1 }}>
          Data Inicial
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="sg-input"
          />
        </label>

        <label className="sg-label" style={{ minWidth: '140px', flex: 1 }}>
          Data Final
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="sg-input"
          />
        </label>
      </div>

      {erro && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erro}</span>
        </div>
      )}

      {carregando ? (
        <div className="sg-loading-area">
          <Spinner /> Buscando historico...
        </div>
      ) : !erro ? (
        <div className="sg-table-wrap">
          <table className="sg-table sg-table-responsive">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuario</th>
                <th>Dispositivo</th>
                <th>Movimento</th>
                <th>Status</th>
                <th>Motivo (se negado)</th>
              </tr>
            </thead>
            <tbody>
              {acessos.map((acesso) => (
                <tr key={acesso.id_acesso}>
                  <td className="sg-td-mono" style={{ fontSize: '0.8rem' }} data-rotulo="Data/Hora">
                    {formatarDataHora(acesso.data_hora)}
                  </td>
                  <td data-rotulo="Usuario"><strong>{nomeDoUsuario(acesso.id_usuario)}</strong></td>
                  <td data-rotulo="Dispositivo">{descricaoDoDispositivo(acesso.id_dispositivo)}</td>
                  <td data-rotulo="Movimento" style={{ textTransform: 'capitalize' }}>
                    {acesso.tipo_movimento}
                  </td>
                  <td data-rotulo="Status">
                    <Badge
                      texto={acesso.status === 'permitido' ? 'Permitido' : 'Negado'}
                      tom={acesso.status === 'permitido' ? 'sucesso' : 'perigo'}
                    />
                  </td>
                  <td data-rotulo="Motivo" style={{ color: 'var(--sg-text-2)' }}>
                    {acesso.motivo_negado || '—'}
                  </td>
                </tr>
              ))}

              {acessos.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <EstadoVazio 
                      icone="busca" 
                      titulo="Nenhum registro encontrado" 
                      descricao="Nenhum acesso foi registrado com os filtros selecionados." 
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
            aoMudar={(novaPagina) => carregar(novaPagina)}
          />
        </div>
      ) : null}
    </div>
  );
}