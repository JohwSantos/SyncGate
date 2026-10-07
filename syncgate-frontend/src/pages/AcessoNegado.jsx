import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AcessoNegado() {
  return (
    <div style={estilos.pagina} role="alert">
      <ShieldX size={32} aria-hidden="true" />
      <h1 style={estilos.titulo}>Acesso não autorizado</h1>
      <p>Seu perfil não possui permissão para acessar esta seção.</p>
      <Link to="/dashboard" style={estilos.link}>Voltar ao dashboard</Link>
    </div>
  );
}

const estilos = {
  pagina: {
    minHeight: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
    textAlign: 'center', color: 'var(--cor-texto-suave)',
  },
  titulo: { color: 'var(--cor-texto)', fontSize: '1.4rem' },
  link: { color: 'var(--cor-blue-600)', fontWeight: 600, textDecoration: 'none' },
};