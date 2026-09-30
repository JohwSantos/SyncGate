import { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle2, XCircle, Router, ClipboardList,
  Wifi, WifiOff, TrendingUp, Clock, BarChart3, AlertTriangle,
} from 'lucide-react';
import api from '../api/client';
import { useSocket } from '../hooks/useSocket';
import CartaoEstatistica from '../components/CartaoEstatistica';

// =====================================================================
// Utilitários
// =====================================================================

const MESES_CURTOS = [
  '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatarHora(dataHoraIso) {
  return new Date(dataHoraIso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatarDataCurta(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// =====================================================================
// Componente de gráfico de barras (SVG puro — sem dependências externas)
// =====================================================================

function GraficoBarras({ dados, labelKey, titulo }) {
  if (!dados || dados.length === 0) {
    return (
      <div style={estilos.graficoVazio}>
        <BarChart3 size={32} color="var(--cor-borda)" />
        <span>Sem dados para este período</span>
      </div>
    );
  }

  const maxValor = Math.max(...dados.map((d) => Number(d.total) || 1));
  const larguraBarra = Math.max(12, Math.min(40, 600 / dados.length - 4));
  const alturaGrafico = 200;
  const larguraTotal = dados.length * (larguraBarra + 4) + 40;
  const [barraAtiva, setBarraAtiva] = useState(null);

  return (
    <div style={estilos.graficoContainer}>
      <h3 style={estilos.graficoTitulo}>{titulo}</h3>
      <div style={estilos.graficoScroll}>
        <svg
          width={Math.max(larguraTotal, 300)}
          height={alturaGrafico + 50}
          style={{ display: 'block' }}
        >
          {/* Linhas de grade */}
          {[0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={30} y1={alturaGrafico - alturaGrafico * frac + 10}
              x2={larguraTotal} y2={alturaGrafico - alturaGrafico * frac + 10}
              stroke="var(--cor-borda)" strokeDasharray="4,4"
            />
          ))}

          {dados.map((item, i) => {
            const permitidos = Number(item.permitidos) || 0;
            const negados = Number(item.negados) || 0;
            const total = Number(item.total) || 0;
            const alturaPermitidos = (permitidos / maxValor) * alturaGrafico;
            const alturaNegados = (negados / maxValor) * alturaGrafico;
            const x = 35 + i * (larguraBarra + 4);
            const label = item[labelKey] || '';
            const isAtiva = barraAtiva === i;

            return (
              <g
                key={i}
                onMouseEnter={() => setBarraAtiva(i)}
                onMouseLeave={() => setBarraAtiva(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Barra de permitidos (verde) */}
                <rect
                  x={x}
                  y={alturaGrafico - alturaPermitidos + 10}
                  width={larguraBarra / 2 - 1}
                  height={Math.max(alturaPermitidos, 0)}
                  rx={2}
                  fill={isAtiva ? '#059669' : 'var(--cor-sucesso)'}
                  opacity={isAtiva ? 1 : 0.85}
                />
                {/* Barra de negados (vermelho) */}
                <rect
                  x={x + larguraBarra / 2 + 1}
                  y={alturaGrafico - alturaNegados + 10}
                  width={larguraBarra / 2 - 1}
                  height={Math.max(alturaNegados, 0)}
                  rx={2}
                  fill={isAtiva ? '#b91c1c' : 'var(--cor-perigo)'}
                  opacity={isAtiva ? 1 : 0.85}
                />
                {/* Label no eixo X */}
                <text
                  x={x + larguraBarra / 2}
                  y={alturaGrafico + 26}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--cor-texto-suave)"
                  fontFamily="var(--fonte-texto)"
                >
                  {label}
                </text>
                {/* Tooltip ao passar o mouse */}
                {isAtiva && (
                  <g>
                    <rect
                      x={x - 20}
                      y={alturaGrafico - Math.max(alturaPermitidos, alturaNegados) - 30}
                      width={larguraBarra + 50}
                      height={22}
                      rx={4}
                      fill="var(--cor-navy-900)"
                    />
                    <text
                      x={x + larguraBarra / 2 + 5}
                      y={alturaGrafico - Math.max(alturaPermitidos, alturaNegados) - 14}
                      textAnchor="middle"
                      fontSize="11"
                      fill="white"
                      fontWeight="600"
                      fontFamily="var(--fonte-texto)"
                    >
                      {`${permitidos}✓  ${negados}✗  (${total})`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Eixo Y — valores de referência */}
          {[0, 0.5, 1].map((frac) => (
            <text
              key={frac}
              x={26}
              y={alturaGrafico - alturaGrafico * frac + 14}
              textAnchor="end"
              fontSize="10"
              fill="var(--cor-texto-suave)"
              fontFamily="var(--fonte-mono)"
            >
              {Math.round(maxValor * frac)}
            </text>
          ))}
        </svg>
      </div>
      <div style={estilos.legenda}>
        <span style={estilos.legendaItem}>
          <span style={{ ...estilos.legendaCor, background: 'var(--cor-sucesso)' }} />
          Permitidos
        </span>
        <span style={estilos.legendaItem}>
          <span style={{ ...estilos.legendaCor, background: 'var(--cor-perigo)' }} />
          Negados
        </span>
      </div>
    </div>
  );
}


// =====================================================================
// Componente do gráfico de horas (hoje)
// =====================================================================

function GraficoHoras({ dados }) {
  if (!dados || dados.length === 0) {
    return (
      <div style={estilos.graficoVazio}>
        <Clock size={32} color="var(--cor-borda)" />
        <span>Nenhum acesso registrado hoje</span>
      </div>
    );
  }

  // Preenche as 24 horas (0–23) para exibição completa
  const horasCompletas = Array.from({ length: 24 }, (_, h) => {
    const encontrado = dados.find((d) => Number(d.hora) === h);
    return {
      hora: h,
      permitidos: encontrado ? Number(encontrado.permitidos) : 0,
      negados: encontrado ? Number(encontrado.negados) : 0,
      total: encontrado ? Number(encontrado.total) : 0,
    };
  });

  const maxValor = Math.max(...horasCompletas.map((d) => d.total), 1);
  const alturaGrafico = 120;
  const barW = 16;
  const gap = 4;
  const larguraTotal = 24 * (barW + gap) + 40;

  return (
    <div style={estilos.graficoContainer}>
      <h3 style={estilos.graficoTitulo}>
        <Clock size={16} /> Distribuição por hora (hoje)
      </h3>
      <div style={estilos.graficoScroll}>
        <svg width={Math.max(larguraTotal, 300)} height={alturaGrafico + 40} style={{ display: 'block' }}>
          {horasCompletas.map((item, i) => {
            const altura = (item.total / maxValor) * alturaGrafico;
            const x = 35 + i * (barW + gap);
            return (
              <g key={i}>
                <rect
                  x={x} y={alturaGrafico - altura + 10}
                  width={barW} height={Math.max(altura, 0)}
                  rx={2}
                  fill={item.total > 0 ? 'var(--cor-blue-600)' : 'var(--cor-borda)'}
                  opacity={0.8}
                />
                {item.total > 0 && (
                  <text
                    x={x + barW / 2} y={alturaGrafico - altura + 4}
                    textAnchor="middle" fontSize="9"
                    fill="var(--cor-blue-600)" fontWeight="600"
                    fontFamily="var(--fonte-mono)"
                  >
                    {item.total}
                  </text>
                )}
                <text
                  x={x + barW / 2} y={alturaGrafico + 24}
                  textAnchor="middle" fontSize="9"
                  fill="var(--cor-texto-suave)"
                  fontFamily="var(--fonte-mono)"
                >
                  {String(item.hora).padStart(2, '0')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}


// =====================================================================
// Componente de motivos de negação
// =====================================================================

function TopMotivosNegacao({ motivos }) {
  if (!motivos || motivos.length === 0) return null;

  const maxTotal = Math.max(...motivos.map((m) => Number(m.total)));

  return (
    <div style={estilos.motivosContainer}>
      <h3 style={estilos.graficoTitulo}>
        <AlertTriangle size={16} /> Principais motivos de negação
      </h3>
      <div style={estilos.motivosLista}>
        {motivos.map((m, i) => {
          const pct = (Number(m.total) / maxTotal) * 100;
          return (
            <div key={i} style={estilos.motivoItem}>
              <div style={estilos.motivoTexto}>
                <span style={estilos.motivoNome}>{m.motivo}</span>
                <span style={estilos.motivoTotal}>{m.total}x</span>
              </div>
              <div style={estilos.motivoBarraFundo}>
                <div style={{ ...estilos.motivoBarra, width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// =====================================================================
// Dashboard principal
// =====================================================================

const PERIODOS = [
  { chave: 'dia', rotulo: 'Diário' },
  { chave: 'semana', rotulo: 'Semanal' },
  { chave: 'mes', rotulo: 'Mensal' },
  { chave: 'ano', rotulo: 'Anual' },
];

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [dispositivos, setDispositivos] = useState([]);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState(0);
  const [acessosRecentes, setAcessosRecentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Relatórios por período
  const [periodo, setPeriodo] = useState('dia');
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [dadosHoraHoje, setDadosHoraHoje] = useState([]);
  const [carregandoGrafico, setCarregandoGrafico] = useState(false);

  // Carregamento inicial
  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        const [
          resumoResp,
          listaAcessos,
          listaDispositivos,
          listaSolicitacoes,
          horasHoje,
        ] = await Promise.all([
          api.get('/relatorios/resumo'),
          api.get('/acesso'),
          api.get('/dispositivos'),
          api.get('/solicitacoes'),
          api.get('/relatorios/por-hora-hoje'),
        ]);
        setResumo(resumoResp);
        setAcessosRecentes(listaAcessos);
        setDispositivos(listaDispositivos);
        setSolicitacoesPendentes(
          listaSolicitacoes.filter((s) => s.status === 'pendente').length
        );
        setDadosHoraHoje(horasHoje);
      } catch (erroCarregamento) {
        setErro(erroCarregamento.message);
      } finally {
        setCarregando(false);
      }
    }
    carregarDadosIniciais();
  }, []);

  // Carrega dados do gráfico quando o período muda
  useEffect(() => {
    async function carregarGrafico() {
      setCarregandoGrafico(true);
      try {
        const rotas = {
          dia: '/relatorios/por-dia?dias=30',
          semana: '/relatorios/por-semana?semanas=12',
          mes: '/relatorios/por-mes?meses=12',
          ano: '/relatorios/por-ano',
        };
        const dados = await api.get(rotas[periodo]);
        setDadosGrafico(dados);
      } catch {
        setDadosGrafico([]);
      } finally {
        setCarregandoGrafico(false);
      }
    }
    carregarGrafico();
  }, [periodo]);

  // WebSocket em tempo real
  const { conectado } = useSocket({
    'novo-acesso': ({ registro }) => {
      setAcessosRecentes((atual) => [registro, ...atual]);
    },
    'dispositivo-atualizado': (dispositivoAtualizado) => {
      setDispositivos((atual) =>
        atual.map((d) =>
          d.id_dispositivo === dispositivoAtualizado.id_dispositivo ? dispositivoAtualizado : d
        )
      );
    },
    'solicitacao-atualizada': async () => {
      const lista = await api.get('/solicitacoes');
      setSolicitacoesPendentes(lista.filter((s) => s.status === 'pendente').length);
    },
  });

  // Prepara labels do gráfico conforme o período
  const dadosComLabel = useMemo(() => {
    return dadosGrafico.map((item) => {
      let label = '';
      if (periodo === 'dia') {
        label = formatarDataCurta(item.data);
      } else if (periodo === 'semana') {
        label = `S${item.semana}`;
      } else if (periodo === 'mes') {
        label = MESES_CURTOS[item.mes] || item.mes;
      } else if (periodo === 'ano') {
        label = String(item.ano);
      }
      return { ...item, label };
    });
  }, [dadosGrafico, periodo]);

  if (carregando) {
    return <p style={{ color: 'var(--cor-texto-suave)' }}>Carregando painel...</p>;
  }

  if (erro) {
    return <div style={estilos.faixaErro}>Não foi possível carregar o dashboard: {erro}</div>;
  }

  const dispositivosOnline = dispositivos.filter((d) => d.status === 'online').length;
  const hojePermitidos = resumo?.hoje?.permitidos ?? 0;
  const hojeNegados = resumo?.hoje?.negados ?? 0;

  const titulosGrafico = {
    dia: 'Movimentação diária (últimos 30 dias)',
    semana: 'Movimentação semanal (últimas 12 semanas)',
    mes: 'Movimentação mensal (últimos 12 meses)',
    ano: 'Movimentação anual',
  };

  return (
    <div style={estilos.pagina}>
      {/* Cabeçalho */}
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Dashboard</h1>
        <div style={estilos.statusConexao}>
          {conectado ? <Wifi size={16} color="var(--cor-sucesso)" /> : <WifiOff size={16} color="var(--cor-perigo)" />}
          <span style={{ color: conectado ? 'var(--cor-sucesso)' : 'var(--cor-perigo)' }}>
            {conectado ? 'Ao vivo' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div style={estilos.grade}>
        <CartaoEstatistica
          Icone={CheckCircle2}
          rotulo="Acessos permitidos hoje"
          valor={hojePermitidos}
          corDestaque={{ fundo: 'var(--cor-sucesso-fundo)', texto: 'var(--cor-sucesso)' }}
        />
        <CartaoEstatistica
          Icone={XCircle}
          rotulo="Acessos negados hoje"
          valor={hojeNegados}
          corDestaque={{ fundo: 'var(--cor-perigo-fundo)', texto: 'var(--cor-perigo)' }}
        />
        <CartaoEstatistica
          Icone={Router}
          rotulo={`Dispositivos online (${dispositivos.length} total)`}
          valor={dispositivosOnline}
          corDestaque={{ fundo: 'var(--cor-blue-50)', texto: 'var(--cor-blue-600)' }}
        />
        <CartaoEstatistica
          Icone={ClipboardList}
          rotulo="Solicitações pendentes"
          valor={solicitacoesPendentes}
          corDestaque={{ fundo: 'var(--cor-alerta-fundo)', texto: 'var(--cor-alerta)' }}
        />
      </div>

      {/* Totais gerais */}
      <div style={estilos.gradeResumo}>
        <div style={estilos.resumoItem}>
          <TrendingUp size={18} color="var(--cor-blue-600)" />
          <div>
            <p style={estilos.resumoValor}>{resumo?.totais?.acessos?.toLocaleString('pt-BR') ?? 0}</p>
            <p style={estilos.resumoRotulo}>Total de acessos registrados</p>
          </div>
        </div>
        <div style={estilos.resumoItem}>
          <CheckCircle2 size={18} color="var(--cor-sucesso)" />
          <div>
            <p style={estilos.resumoValor}>{resumo?.totais?.permitidos?.toLocaleString('pt-BR') ?? 0}</p>
            <p style={estilos.resumoRotulo}>Permitidos (histórico)</p>
          </div>
        </div>
        <div style={estilos.resumoItem}>
          <XCircle size={18} color="var(--cor-perigo)" />
          <div>
            <p style={estilos.resumoValor}>{resumo?.totais?.negados?.toLocaleString('pt-BR') ?? 0}</p>
            <p style={estilos.resumoRotulo}>Negados (histórico)</p>
          </div>
        </div>
        {resumo?.horarioPicoHoje && (
          <div style={estilos.resumoItem}>
            <Clock size={18} color="var(--cor-alerta)" />
            <div>
              <p style={estilos.resumoValor}>
                {String(resumo.horarioPicoHoje.hora).padStart(2, '0')}:00h
              </p>
              <p style={estilos.resumoRotulo}>Horário de pico hoje ({resumo.horarioPicoHoje.total} acessos)</p>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico principal com seletor de período */}
      <div style={estilos.secaoGrafico}>
        <div style={estilos.graficoCabecalho}>
          <h2 style={estilos.subtitulo}>
            <BarChart3 size={18} /> Relatório de Movimentação
          </h2>
          <div style={estilos.seletorPeriodo}>
            {PERIODOS.map(({ chave, rotulo }) => (
              <button
                key={chave}
                onClick={() => setPeriodo(chave)}
                style={{
                  ...estilos.botaoPeriodo,
                  ...(periodo === chave ? estilos.botaoPeriodoAtivo : {}),
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {carregandoGrafico ? (
          <p style={{ color: 'var(--cor-texto-suave)', padding: '2rem', textAlign: 'center' }}>
            Carregando gráfico...
          </p>
        ) : (
          <GraficoBarras
            dados={dadosComLabel}
            labelKey="label"
            titulo={titulosGrafico[periodo]}
          />
        )}
      </div>

      {/* Gráfico de horas + Motivos de negação */}
      <div style={estilos.gradeGraficos}>
        <div style={estilos.secaoGrafico}>
          <GraficoHoras dados={dadosHoraHoje} />
        </div>
        <div style={estilos.secaoGrafico}>
          <TopMotivosNegacao motivos={resumo?.topMotivosNegacao} />
        </div>
      </div>

      {/* Feed de últimos acessos */}
      <div style={estilos.secaoFeed}>
        <h2 style={estilos.subtitulo}>Últimos acessos</h2>
        {acessosRecentes.length === 0 ? (
          <p style={estilos.vazio}>Nenhum acesso registrado ainda.</p>
        ) : (
          <div style={estilos.listaFeed}>
            {acessosRecentes.slice(0, 15).map((acesso) => (
              <div key={acesso.id_acesso} style={estilos.linhaFeed}>
                <span
                  style={{
                    ...estilos.selo,
                    background: acesso.status === 'permitido' ? 'var(--cor-sucesso-fundo)' : 'var(--cor-perigo-fundo)',
                    color: acesso.status === 'permitido' ? 'var(--cor-sucesso)' : 'var(--cor-perigo)',
                  }}
                >
                  {acesso.status === 'permitido' ? 'Permitido' : 'Negado'}
                </span>
                <span style={estilos.movimento}>{acesso.tipo_movimento}</span>
                <span style={estilos.detalhe}>
                  {acesso.motivo_negado || `Dispositivo #${acesso.id_dispositivo}`}
                </span>
                <span style={estilos.hora}>{formatarHora(acesso.data_hora)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// =====================================================================
// Estilos
// =====================================================================

const estilos = {
  pagina: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cabecalho: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulo: { fontSize: '1.4rem' },
  statusConexao: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  grade: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))',
    gap: '1rem',
  },

  // Resumo geral
  gradeResumo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
    gap: '0.75rem',
  },
  resumoItem: {
    background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)',
    padding: '0.9rem 1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    boxShadow: 'var(--sombra)',
  },
  resumoValor: {
    fontFamily: 'var(--fonte-display)',
    fontSize: '1.15rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  resumoRotulo: {
    fontSize: '0.75rem',
    color: 'var(--cor-texto-suave)',
    marginTop: '0.2rem',
  },

  // Seção de gráfico
  secaoGrafico: {
    background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)',
    padding: '1.25rem',
    boxShadow: 'var(--sombra)',
  },
  graficoCabecalho: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  seletorPeriodo: {
    display: 'flex',
    gap: '0.25rem',
    background: 'var(--cor-fundo)',
    borderRadius: 'var(--raio-pequeno)',
    padding: '0.2rem',
  },
  botaoPeriodo: {
    padding: '0.4rem 0.85rem',
    borderRadius: 'var(--raio-pequeno)',
    border: 'none',
    background: 'transparent',
    color: 'var(--cor-texto-suave)',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  botaoPeriodoAtivo: {
    background: 'var(--cor-blue-600)',
    color: 'white',
    boxShadow: '0 1px 3px rgba(21, 84, 245, 0.25)',
  },
  gradeGraficos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
    gap: '1rem',
  },

  // Gráfico
  graficoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  graficoTitulo: {
    fontSize: '0.88rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--cor-texto)',
    margin: 0,
  },
  graficoScroll: {
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '0.5rem',
  },
  graficoVazio: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '2.5rem 1rem',
    color: 'var(--cor-texto-suave)',
    fontSize: '0.88rem',
  },
  legenda: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    fontSize: '0.78rem',
    color: 'var(--cor-texto-suave)',
  },
  legendaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  legendaCor: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    display: 'inline-block',
  },

  // Motivos de negação
  motivosContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  motivosLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  motivoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  motivoTexto: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.82rem',
  },
  motivoNome: {
    color: 'var(--cor-texto)',
  },
  motivoTotal: {
    color: 'var(--cor-perigo)',
    fontWeight: 600,
    fontFamily: 'var(--fonte-mono)',
    fontSize: '0.78rem',
  },
  motivoBarraFundo: {
    height: '6px',
    background: 'var(--cor-fundo)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  motivoBarra: {
    height: '100%',
    background: 'var(--cor-perigo)',
    borderRadius: '3px',
    opacity: 0.7,
  },

  // Feed de acessos recentes
  secaoFeed: {
    background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)',
    padding: '1.25rem',
    boxShadow: 'var(--sombra)',
  },
  subtitulo: {
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    margin: 0,
  },
  vazio: {
    color: 'var(--cor-texto-suave)',
    fontSize: '0.9rem',
  },
  listaFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.9rem',
  },
  linhaFeed: {
    display: 'grid',
    gridTemplateColumns: '6rem 4.5rem 1fr auto',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.55rem 0.4rem',
    borderBottom: '1px solid var(--cor-borda)',
    fontSize: '0.85rem',
  },
  selo: {
    padding: '0.2rem 0.55rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  movimento: {
    textTransform: 'capitalize',
    color: 'var(--cor-texto-suave)',
  },
  detalhe: {
    color: 'var(--cor-texto)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hora: {
    fontFamily: 'var(--fonte-mono)',
    fontSize: '0.8rem',
    color: 'var(--cor-texto-suave)',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)',
    color: 'var(--cor-perigo)',
    padding: '1rem',
    borderRadius: 'var(--raio)',
  },
};
