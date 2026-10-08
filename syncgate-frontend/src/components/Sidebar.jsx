import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Router,
  Clock,
  ClipboardList,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { usePermissoes } from '../hooks/usePermissoes';

const ITENS = [
  { rota: 'dashboard',             rotulo: 'Dashboard',            Icone: LayoutDashboard },
  { rota: 'usuarios',              rotulo: 'Usuarios',             Icone: Users,          perfis: ['gestor','master'] },
  { rota: 'cartoes',               rotulo: 'Cartoes RFID',         Icone: CreditCard,     perfis: ['master'] },
  { rota: 'dispositivos',          rotulo: 'Dispositivos',         Icone: Router,         perfis: ['master'] },
  { rota: 'horarios',              rotulo: 'Horarios',             Icone: Clock,          perfis: ['gestor','master'] },
  { rota: 'solicitacoes',          rotulo: 'Solicitacoes',         Icone: ClipboardList },
  { rota: 'historico',             rotulo: 'Historico de Acessos', Icone: History },
  { rota: 'importacao-exportacao', rotulo: 'Importar / Exportar',  Icone: FileSpreadsheet },
];

export default function Sidebar({ aberto, aoNavegar }) {
  const {
    podeGerenciarUsuarios,
    podeGerenciarCartoesDispositivos,
    podeGerenciarHorarios,
  } = usePermissoes();

  const permissoes = {
    usuarios:    podeGerenciarUsuarios,
    cartoes:     podeGerenciarCartoesDispositivos,
    dispositivos: podeGerenciarCartoesDispositivos,
    horarios:    podeGerenciarHorarios,
  };

  return (
    <aside
      id="menu-lateral"
      className={`sg-sidebar${aberto ? ' aberto' : ''}`}
      aria-label="Menu lateral"
    >
      {/* Marca */}
      <div className="sg-sidebar-brand">
        <LogoMarca />
        <span className="sg-sidebar-wordmark">
          SYNC<span>GATE</span>
        </span>
      </div>

      {/* Navegacao */}
      <nav className="sg-sidebar-nav" aria-label="Navegacao principal">
        {ITENS.filter(({ rota }) => permissoes[rota] !== false).map(
          ({ rota, rotulo, Icone }) => (
            <NavLink
              key={rota}
              to={`/${rota}`}
              onClick={aoNavegar}
              className={({ isActive }) =>
                `sg-nav-item${isActive ? ' active' : ''}`
              }
            >
              <Icone size={16} strokeWidth={2} aria-hidden="true" />
              {rotulo}
            </NavLink>
          )
        )}
      </nav>

      {/* Rodape discreto */}
      <div className="sg-sidebar-footer">
        <span style={{ fontSize: 'var(--sg-text-xs)', color: 'var(--sg-sidebar-text)' }}>
          SyncGate v1.0
        </span>
      </div>
    </aside>
  );
}

function LogoMarca() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M50 6 L88 22 V50 C88 71 71 88 50 94 C29 88 12 71 12 50 V22 Z"
        fill="rgba(255,255,255,0.10)"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="2"
      />
      <path
        d="M36 36 L64 36 L36 64 L64 64"
        stroke="#7BA3F5"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}