import { X } from 'lucide-react';

// Modal genérico, reutilizado por todas as telas de cadastro do
// painel (usuários, cartões, dispositivos, etc.) — construir isso
// uma vez só evita reescrever "fundo escuro + caixa centralizada"
// em cada tela nova.
export default function Modal({ titulo, aoFechar, children }) {
  return (
    <div style={estilos.fundo} onClick={aoFechar}>
      <div style={estilos.caixa} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.cabecalho}>
          <h2 style={estilos.titulo}>{titulo}</h2>
          <button onClick={aoFechar} style={estilos.botaoFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div style={estilos.conteudo}>{children}</div>
      </div>
    </div>
  );
}

const estilos = {
  fundo: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(11, 30, 61, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 50,
  },
  caixa: {
    background: 'var(--cor-superficie)',
    borderRadius: 'var(--raio)',
    width: '100%',
    maxWidth: '30rem',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(15,23,42,0.2)',
  },
  cabecalho: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.1rem 1.3rem',
    borderBottom: '1px solid var(--cor-borda)',
  },
  titulo: {
    fontSize: '1.1rem',
  },
  botaoFechar: {
    border: 'none',
    background: 'transparent',
    color: 'var(--cor-texto-suave)',
    display: 'flex',
    padding: '0.3rem',
    borderRadius: 'var(--raio-pequeno)',
  },
  conteudo: {
    padding: '1.3rem',
  },
};
