import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Router, ClipboardList, Wifi, WifiOff } from 'lucide-react';
import api from '../api/client';
import { useSocket } from '../hooks/useSocket';
import CartaoEstatistica from '../components/CartaoEstatistica';

function ehHoje(dataHoraIso) {
  const hoje = new Date();
  const data = new Date(dataHoraIso);
  return (
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  );
}

function formatarHora(dataHoraIso) {
  return new Date(dataHoraIso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function Dashboard() {
  const [acessos, setAcessos] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Carrega o estado inicial da tela via REST. Os eventos do
  // WebSocket, a partir daqui, só vão ATUALIZAR esse estado —
  // nunca substituem essa carga inicial.
  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        const [listaAcessos, listaDispositivos, listaSolicitacoes] = await Promise.all([
          api.get('/acesso'),
          api.get('/dispositivos'),
          api.get('/solicitacoes'),
        ]);
        setAcessos(listaAcessos);
        setDispositivos(listaDispositivos);
        setSolicitacoesPendentes(
          listaSolicitacoes.filter((s) => s.status === 'pendente').length
        );
      } catch (erroCarregamento) {
        setErro(erroCarregamento.message);
      } finally {
        setCarregando(false);
      }
    }

    carregarDadosIniciais();
  }, []);

  // Conecta ao WebSocket e mantém o estado da tela sincronizado
  // com o que está acontecendo agora no sistema.
  const { conectado } = useSocket({
    'novo-acesso': ({ registro }) => {
      setAcessos((atual) => [registro, ...atual]);
    },
    'dispositivo-atualizado': (dispositivoAtualizado) => {
      setDispositivos((atual) =>
        atual.map((d) =>
          d.id_dispositivo === dispositivoAtualizado.id_dispositivo ? dispositivoAtualizado : d
        )
      );
    },
    // Uma solicitação pode ser criada (nova pendente) ou decidida
    // (deixa de ser pendente) — em vez de tentar adivinhar qual
    // dos dois casos aconteceu, é mais simples reconsultar a lista.
    'solicitacao-atualizada': async () => {
      const lista = await api.get('/solicitacoes');
      setSolicitacoesPendentes(lista.filter((s) => s.status === 'pendente').length);
    },
  });

  if (carregando) {
    return <p style={{ color: 'var(--cor-texto-suave)' }}>Carregando painel...</p>;
  }

  if (erro) {
    return <div style={estilos.faixaErro}>Não foi possível carregar o dashboard: {erro}</div>;
  }

  const acessosHoje = acessos.filter((a) => ehHoje(a.data_hora));
  const permitidosHoje = acessosHoje.filter((a) => a.status === 'permitido').length;
  const negadosHoje = acessosHoje.filter((a) => a.status === 'negado').length;
  const dispositivosOnline = dispositivos.filter((d) => d.status === 'online').length;

  return (
    <div style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Dashboard</h1>
        <div style={estilos.statusConexao}>
          {conectado ? <Wifi size={16} color="var(--cor-sucesso)" /> : <WifiOff size={16} color="var(--cor-perigo)" />}
          <span style={{ color: conectado ? 'var(--cor-sucesso)' : 'var(--cor-perigo)' }}>
            {conectado ? 'Ao vivo' : 'Desconectado'}
          </span>
        </div>
      </div>

      <div style={estilos.grade}>
        <CartaoEstatistica
          Icone={CheckCircle2}
          rotulo="Acessos permitidos hoje"
          valor={permitidosHoje}
          corDestaque={{ fundo: 'var(--cor-sucesso-fundo)', texto: 'var(--cor-sucesso)' }}
        />
        <CartaoEstatistica
          Icone={XCircle}
          rotulo="Acessos negados hoje"
          valor={negadosHoje}
          corDestaque={{ fundo: 'var(--cor-perigo-fundo)', texto: 'var(--cor-perigo)' }}
        />
        <CartaoEstatistica
          Icone={Router}
          rotulo={`Dispositivos online (${dispositivos.length} no total)`}
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

      <div style={estilos.secaoFeed}>
        <h2 style={estilos.subtitulo}>Últimos acessos</h2>

        {acessos.length === 0 ? (
          <p style={estilos.vazio}>Nenhum acesso registrado ainda.</p>
        ) : (
          <div style={estilos.listaFeed}>
            {acessos.slice(0, 15).map((acesso) => (
              <div key={acesso.id_acesso} style={estilos.linhaFeed}>
                <span
                  style={{
                    ...estilos.selo,
                    background:
                      acesso.status === 'permitido' ? 'var(--cor-sucesso-fundo)' : 'var(--cor-perigo-fundo)',
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
  titulo: {
    fontSize: '1.4rem',
  },
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
  secaoFeed: {
    background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)',
    padding: '1.25rem',
    boxShadow: 'var(--sombra)',
  },
  subtitulo: {
    fontSize: '1rem',
    marginBottom: '0.9rem',
  },
  vazio: {
    color: 'var(--cor-texto-suave)',
    fontSize: '0.9rem',
  },
  listaFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
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
