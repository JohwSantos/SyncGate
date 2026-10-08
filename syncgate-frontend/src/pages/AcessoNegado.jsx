import { Link } from 'react-router-dom';
import EstadoVazio from '../components/EstadoVazio';

export default function AcessoNegado() {
  return (
    <div className="sg-page" style={{ justifyContent: 'center', minHeight: '100%', alignItems: 'center' }}>
      <EstadoVazio 
        icone="permissao" 
        titulo="Acesso restrito" 
        descricao="Seu perfil nao possui nivel de acesso suficiente para visualizar esta pagina." 
        acao={
          <Link to="/dashboard" className="sg-btn sg-btn-primary">
            Voltar ao Dashboard
          </Link>
        }
      />
    </div>
  );
}