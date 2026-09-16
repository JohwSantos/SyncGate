// Selo colorido reutilizado em várias telas para mostrar estado
// (ativo/bloqueado, online/offline, permitido/negado, etc).
// O texto sempre acompanha a cor — nunca só a cor sozinha,
// pra continuar legível mesmo pra quem não distingue bem cores.
const TONS = {
  sucesso: { fundo: 'var(--cor-sucesso-fundo)', texto: 'var(--cor-sucesso)' },
  perigo: { fundo: 'var(--cor-perigo-fundo)', texto: 'var(--cor-perigo)' },
  alerta: { fundo: 'var(--cor-alerta-fundo)', texto: 'var(--cor-alerta)' },
  neutro: { fundo: 'var(--cor-fundo)', texto: 'var(--cor-texto-suave)' },
};

export default function Badge({ texto, tom = 'neutro' }) {
  const cores = TONS[tom] || TONS.neutro;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: cores.fundo,
        color: cores.texto,
      }}
    >
      {texto}
    </span>
  );
}
