import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Router,
  Clock,
  ClipboardList,
  History,
} from 'lucide-react';

// Lista central da navegação: cada seção do sistema aparece aqui
// uma vez só, mesmo que a página de destino ainda seja um
// placeholder "Em construção" (nas próximas etapas, essas rotas
// ganham telas de verdade, sem precisar mexer no menu).
const ITENS = [
  { rota: 'dashboard', rotulo: 'Dashboard', Icone: LayoutDashboard },
  { rota: 'usuarios', rotulo: 'Usuários', Icone: Users },
  { rota: 'cartoes', rotulo: 'Cartões RFID', Icone: CreditCard },
  { rota: 'dispositivos', rotulo: 'Dispositivos', Icone: Router },
  { rota: 'horarios', rotulo: 'Horários', Icone: Clock },
  { rota: 'solicitacoes', rotulo: 'Solicitações', Icone: ClipboardList },
  { rota: 'historico', rotulo: 'Histórico de Acessos', Icone: History },
];

export default function Sidebar({ aberto, aoNavegar }) {
  return (
    <aside style={estilos.barra} className={`sg-sidebar ${aberto ? 'aberto' : ''}`}>
      <div style={estilos.marca}>
        <EscudoS />
        <span style={estilos.wordmark}>
          SYNC<span style={{ color: 'var(--cor-blue-600)' }}>GATE</span>
        </span>
      </div>

      <nav style={estilos.nav}>
        {ITENS.map(({ rota, rotulo, Icone }) => (
          <NavLink
            key={rota}
            to={`/${rota}`}
            onClick={aoNavegar}
            style={({ isActive }) => ({
              ...estilos.link,
              ...(isActive ? estilos.linkAtivo : {}),
            })}
          >
            <Icone size={18} strokeWidth={2} />
            {rotulo}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function EscudoS() {
  return (
    <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
      <path
        d="M50 5 L90 22 V50 C90 72 73 90 50 95 C27 90 10 72 10 50 V22 Z"
        fill="var(--cor-navy-900)"
      />
      <path
        d="M35 35 L65 35 L35 65 L65 65"
        stroke="var(--cor-blue-600)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const estilos = {
  barra: {
    width: '15rem',
    flexShrink: 0,
    background: 'var(--cor-navy-900)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem 1rem',
    gap: '1.5rem',
  },
  marca: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0 0.4rem',
  },
  wordmark: {
    fontFamily: 'var(--fonte-display)',
    fontWeight: 700,
    fontSize: '1.05rem',
    color: 'white',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    padding: '0.6rem 0.7rem',
    borderRadius: 'var(--raio-pequeno)',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  linkAtivo: {
    background: 'rgba(255,255,255,0.08)',
    color: 'white',
  },
};
