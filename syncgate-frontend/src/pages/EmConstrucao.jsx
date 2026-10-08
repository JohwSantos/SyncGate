import { Hammer } from 'lucide-react';
import EstadoVazio from '../components/EstadoVazio';

// Placeholder para secoes do menu que ainda nao tem tela propria.
export default function EmConstrucao({ titulo }) {
  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <h1 className="sg-page-title">{titulo}</h1>
      </div>
      
      <div className="sg-card" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sg-space-8)' }}>
        <EstadoVazio 
          icone="default" 
          titulo="Pagina em construcao" 
          descricao="Esta sessao ainda nao foi implementada no sistema." 
          acao={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sg-space-2)', color: 'var(--sg-primary)', fontWeight: 500, marginTop: 'var(--sg-space-2)' }}>
              <Hammer size={18} />
              Em breve
            </div>
          }
        />
      </div>
    </div>
  );
}