import { FileX, SearchX, ShieldX, ServerCrash } from 'lucide-react';

const ICONES = {
  default: FileX,
  busca: SearchX,
  permissao: ShieldX,
  erro: ServerCrash,
};

export default function EstadoVazio({ icone = 'default', titulo, descricao, acao }) {
  const Icone = ICONES[icone] || ICONES.default;
  return (
    <div className="sg-empty-state">
      <Icone size={36} className="sg-empty-state__icon" strokeWidth={1.5} aria-hidden="true" />
      <div>
        <p className="sg-empty-state__title">{titulo}</p>
        {descricao && <p className="sg-empty-state__desc">{descricao}</p>}
      </div>
      {acao && <div style={{ marginTop: 'var(--sg-space-4)' }}>{acao}</div>}
    </div>
  );
}