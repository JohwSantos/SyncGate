// Mapa de tons para as classes CSS do design system
const TOM_CLASSE = {
  sucesso: 'sg-badge--success',
  perigo:  'sg-badge--danger',
  alerta:  'sg-badge--warning',
  neutro:  'sg-badge--neutral',
  info:    'sg-badge--info',
};

export default function Badge({ texto, tom = 'neutro', semPonto = false }) {
  const classe = TOM_CLASSE[tom] ?? TOM_CLASSE.neutro;
  return (
    <span className={`sg-badge ${classe}${semPonto ? ' sg-badge--no-dot' : ''}`}>
      {texto}
    </span>
  );
}