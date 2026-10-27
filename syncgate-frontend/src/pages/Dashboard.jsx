import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, CreditCard, Router, ShieldCheck, ShieldX,
  Activity, Clock, Wifi, WifiOff, Printer
} from 'lucide-react';
import api from '../api/client';
import { useSocket } from '../hooks/useSocket';

// Formata "2026-10-08T18:30:00Z" como "18:30"
function formatarHora(dataHora) {
  if (!dataHora) return '--';
  return new Date(dataHora).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarDataHora(dataHora) {
  if (!dataHora) return '--';
  return new Date(dataHora).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [acessosRecentes, setAcessosRecentes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Recarrega só os números dos cards (sem o "Carregando..." da
  // tela toda). Se chegarem vários eventos seguidos, espera 400 ms
  // e faz UMA requisição só, em vez de uma por evento.
  const temporizadorResumo = useRef(null);
  const atualizarResumo = useCallback(() => {
    clearTimeout(temporizadorResumo.current);
    temporizadorResumo.current = setTimeout(async () => {
      try {
        setResumo(await api.get('/relatorios/resumo'));
      } catch {
        // Falhou uma atualização em segundo plano: mantém os números
        // atuais; a próxima atualização tenta de novo.
      }
    }, 400);
  }, []);

  useEffect(() => () => clearTimeout(temporizadorResumo.current), []);

  const { conectado } = useSocket({
    // O evento chega como { permitido, motivo, usuario?, registro }.
    // O registro do acesso (a "linha" do histórico) é o `registro`;
    // antes usávamos o objeto inteiro, e a linha aparecia sem hora,
    // sem nome e sempre como "Negado".
    'novo-acesso': (evento) => {
      const registro = {
        ...evento.registro,
        // No acesso permitido, o nome já vem no evento — assim um
        // usuário cadastrado depois de abrir a tela também aparece.
        nome_usuario: evento.usuario?.nome,
      };
      setAcessosRecentes((anteriores) =>
        [registro, ...anteriores.filter((a) => a.id_acesso !== registro.id_acesso)].slice(0, 15)
      );
      atualizarResumo();
    },
    // Também mudam números dos cards:
    'dispositivo-atualizado': atualizarResumo, // "Dispositivos online"
    'solicitacao-atualizada': atualizarResumo, // aviso de pendentes
  });

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const [resumoResp, acessosResp, usuariosResp] = await Promise.all([
        api.get('/relatorios/resumo'),
        api.get('/acesso?limite=15&pagina=1'),
        api.get('/usuarios'),
      ]);
      setResumo(resumoResp);
      setAcessosRecentes(acessosResp.dados ?? []);
      setUsuarios(usuariosResp ?? []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function nomeDoUsuario(idUsuario) {
    if (!idUsuario) return 'Desconhecido';
    const u = usuarios.find((u) => u.id_usuario === idUsuario);
    return u?.nome ?? `Usuario #${idUsuario}`;
  }

  function handleImprimir() {
    window.print();
  }

  if (carregando) {
    return (
      <div className="sg-loading-area">
        <span className="sg-spinner" aria-hidden="true" />
        Carregando dashboard...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="sg-page">
        <div className="sg-alert sg-alert--error" role="alert">
          Nao foi possivel carregar o dashboard: {erro}
        </div>
      </div>
    );
  }

  const metricas = [
    { rotulo: 'Usuarios cadastrados', valor: resumo?.totalUsuarios ?? 0, Icone: Users },
    { rotulo: 'Cartoes ativos', valor: resumo?.totalCartoesAtivos ?? 0, Icone: CreditCard },
    { rotulo: 'Dispositivos online', valor: resumo?.dispositivosOnline ?? 0, Icone: Router },
    { rotulo: 'Acessos hoje', valor: resumo?.acessosHoje ?? 0, Icone: Activity },
    { rotulo: 'Permitidos hoje', valor: resumo?.permitidosHoje ?? 0, Icone: ShieldCheck, destaque: 'success' },
    { rotulo: 'Negados hoje', valor: resumo?.negadosHoje ?? 0, Icone: ShieldX, destaque: 'danger' },
  ];

  return (
    <div className="sg-page print-area">
      {/* Cabecalho da pagina */}
      <div className="sg-page-header no-print">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Dashboard</h1>
          <p className="sg-page-subtitle">Visao geral do sistema em tempo real</p>
        </div>
        <div className="sg-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sg-space-4)' }}>
          <StatusConexao conectado={conectado} />
          <button className="sg-btn sg-btn-secondary" onClick={handleImprimir}>
            <Printer size={15} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="only-print" style={{ marginBottom: '20px', display: 'none' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Relatorio do Sistema - SyncGate</h1>
        <p style={{ margin: 0, color: '#666' }}>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
      </div>

      {/* Metricas resumo */}
      <div style={estilos.gradeMetricas}>
        {metricas.map(({ rotulo, valor, Icone, destaque }) => (
          <MetricaItem key={rotulo} rotulo={rotulo} valor={valor} Icone={Icone} destaque={destaque} />
        ))}
      </div>

      {/* Solicitacoes pendentes */}
      {(resumo?.solicitacoesPendentes ?? 0) > 0 && (
        <div className="sg-alert sg-alert--warning no-print">
          <Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{resumo.solicitacoesPendentes}</strong> solicitacao(oes) de acesso aguardando aprovacao.
          </span>
        </div>
      )}

      {/* Feed de ultimos acessos */}
      <div className="sg-card">
        <div className="sg-card-header">
          <h2 style={{ fontSize: 'var(--sg-text-base)', fontWeight: 600 }}>
            Ultimos acessos
          </h2>
          <span className="no-print" style={{ fontSize: 'var(--sg-text-xs)', color: 'var(--sg-text-3)' }}>
            {acessosRecentes.length > 0 ? `${acessosRecentes.length} registro(s)` : 'Atualizado em tempo real'}
          </span>
        </div>

        {acessosRecentes.length === 0 ? (
          <div className="sg-empty-state">
            <Activity size={28} className="sg-empty-state__icon" aria-hidden="true" />
            <p className="sg-empty-state__title">Nenhum acesso registrado ainda</p>
            <p className="sg-empty-state__desc">
              Os registros de entrada e saida aparecerao aqui assim que o sistema processar o primeiro acesso.
            </p>
          </div>
        ) : (
          <div style={estilos.feedLista}>
            {acessosRecentes.map((acesso) => (
              <LinhaAcesso
                key={acesso.id_acesso}
                acesso={acesso}
                nomeUsuario={acesso.nome_usuario || nomeDoUsuario(acesso.id_usuario)}
                formatarDataHora={formatarDataHora}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------

function StatusConexao({ conectado }) {
  return (
    <div style={estilos.statusConexao}>
      {conectado ? (
        <>
          <Wifi size={13} style={{ color: 'var(--sg-success)' }} />
          <span style={{ color: 'var(--sg-success)' }}>Tempo real ativo</span>
        </>
      ) : (
        <>
          <WifiOff size={13} style={{ color: 'var(--sg-text-3)' }} />
          <span style={{ color: 'var(--sg-text-3)' }}>Reconectando...</span>
        </>
      )}
    </div>
  );
}

function MetricaItem({ rotulo, valor, Icone, destaque }) {
  const corIcone = destaque === 'success' ? 'var(--sg-success)' : destaque === 'danger' ? 'var(--sg-danger)' : 'var(--sg-brand)';
  const bgIcone = destaque === 'success' ? 'var(--sg-success-bg)' : destaque === 'danger' ? 'var(--sg-danger-bg)' : 'var(--sg-brand-subtle)';

  return (
    <div style={estilos.metricaItem} className="print-metrica">
      <div style={{ ...estilos.metricaIcone, background: bgIcone, color: corIcone }}>
        <Icone size={15} strokeWidth={2} aria-hidden="true" />
      </div>
      <div>
        <p style={estilos.metricaValor}>{valor.toLocaleString('pt-BR')}</p>
        <p style={estilos.metricaRotulo}>{rotulo}</p>
      </div>
    </div>
  );
}

function LinhaAcesso({ acesso, nomeUsuario, formatarDataHora }) {
  const permitido = acesso.status === 'permitido';
  return (
    <div style={estilos.feedLinha} className="sg-feed-linha print-feed-linha">
      <span className={`sg-badge sg-badge--no-dot ${permitido ? 'sg-badge--success' : 'sg-badge--danger'}`} style={{ minWidth: '62px', justifyContent: 'center' }}>
        {permitido ? 'Permitido' : 'Negado'}
      </span>
      <span style={estilos.feedMovimento}>{acesso.tipo_movimento}</span>
      <span style={estilos.feedDetalhe} className="sg-feed-detalhe sg-truncate">
        {nomeUsuario}
        {acesso.motivo_negado && <span style={{ color: 'var(--sg-text-3)' }}> - {acesso.motivo_negado}</span>}
      </span>
      <span className="sg-mono" style={{ color: 'var(--sg-text-3)', flexShrink: 0 }}>
        {formatarDataHora(acesso.data_hora)}
      </span>
    </div>
  );
}

const estilos = {
  gradeMetricas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--sg-space-3)',
  },
  metricaItem: {
    background: 'var(--sg-surface)',
    border: '1px solid var(--sg-border)',
    borderRadius: 'var(--sg-radius-lg)',
    padding: 'var(--sg-space-4)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sg-space-3)',
    boxShadow: 'var(--sg-shadow-xs)',
  },
  metricaIcone: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--sg-radius)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricaValor: {
    fontSize: 'var(--sg-text-xl)',
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--sg-text-1)',
    fontVariantNumeric: 'tabular-nums',
  },
  metricaRotulo: {
    fontSize: 'var(--sg-text-xs)',
    color: 'var(--sg-text-3)',
    marginTop: 'var(--sg-space-1)',
    lineHeight: 1.3,
  },
  statusConexao: { display: 'flex', alignItems: 'center', gap: 'var(--sg-space-1)', fontSize: 'var(--sg-text-xs)', fontWeight: 500 },
  feedLista: { display: 'flex', flexDirection: 'column' },
  feedLinha: {
    display: 'grid',
    gridTemplateColumns: '72px 80px 1fr auto',
    alignItems: 'center',
    gap: 'var(--sg-space-3)',
    padding: 'var(--sg-space-3) var(--sg-space-5)',
    borderBottom: '1px solid var(--sg-border)',
    fontSize: 'var(--sg-text-sm)',
  },
  feedMovimento: { textTransform: 'capitalize', color: 'var(--sg-text-2)', fontSize: 'var(--sg-text-sm)' },
  feedDetalhe: { color: 'var(--sg-text-1)', fontSize: 'var(--sg-text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
