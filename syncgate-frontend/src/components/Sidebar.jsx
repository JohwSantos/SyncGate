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
      <div className="sg-sidebar-brand" style={{ justifyContent: "center" }}><LogoMarca /></div>

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

function LogoMarca() { return (<div className="sg-logo-container" style={{ padding: "4px", borderRadius: "var(--sg-radius)", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "85px" }}><img src="/logo.svg" alt="SyncGate" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>); }




