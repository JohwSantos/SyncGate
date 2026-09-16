import { Hammer } from 'lucide-react';

// Placeholder para seções do menu que ainda não têm tela própria.
// Existe pra o menu de navegação já poder ficar completo desde
// já, sem parecer um link quebrado quando clicado.
export default function EmConstrucao({ titulo }) {
  return (
    <div style={estilos.pagina}>
      <div style={estilos.icone}>
        <Hammer size={22} strokeWidth={2} />
      </div>
      <h2 style={estilos.titulo}>{titulo}</h2>
      <p style={estilos.texto}>Esta seção ainda não foi construída — chega numa próxima etapa.</p>
    </div>
  );
}

const estilos = {
  pagina: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.6rem',
    padding: '2rem',
    background: 'var(--cor-superficie)',
    border: '1px dashed var(--cor-borda)',
    borderRadius: 'var(--raio)',
    maxWidth: '28rem',
  },
  icone: {
    width: '2.4rem',
    height: '2.4rem',
    borderRadius: 'var(--raio-pequeno)',
    background: 'var(--cor-blue-50)',
    color: 'var(--cor-blue-600)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: '1.15rem',
  },
  texto: {
    color: 'var(--cor-texto-suave)',
    fontSize: '0.9rem',
  },
};
