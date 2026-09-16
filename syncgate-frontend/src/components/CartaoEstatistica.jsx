// Card simples de indicador numérico, usado no Dashboard. Fica
// num componente próprio porque as próximas telas provavelmente
// também vão precisar mostrar números em destaque.
export default function CartaoEstatistica({ Icone, rotulo, valor, corDestaque }) {
  return (
    <div style={estilos.cartao}>
      <div style={{ ...estilos.icone, background: corDestaque?.fundo, color: corDestaque?.texto }}>
        <Icone size={20} strokeWidth={2} />
      </div>
      <div>
        <p style={estilos.valor}>{valor}</p>
        <p style={estilos.rotulo}>{rotulo}</p>
      </div>
    </div>
  );
}

const estilos = {
  cartao: {
    background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)',
    padding: '1.1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
    boxShadow: 'var(--sombra)',
  },
  icone: {
    width: '2.6rem',
    height: '2.6rem',
    borderRadius: 'var(--raio-pequeno)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  valor: {
    fontFamily: 'var(--fonte-display)',
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  rotulo: {
    fontSize: '0.8rem',
    color: 'var(--cor-texto-suave)',
    marginTop: '0.3rem',
  },
};
