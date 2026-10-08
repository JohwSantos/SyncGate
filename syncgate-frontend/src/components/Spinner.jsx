export default function Spinner({ tamanho = 'md', className = '' }) {
  const classeTamanho = tamanho === 'sm' ? ' sg-spinner--sm' : tamanho === 'lg' ? ' sg-spinner--lg' : '';
  return (
    <span
      className={`sg-spinner${classeTamanho} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}