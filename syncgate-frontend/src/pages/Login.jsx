import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navegar = useNavigate();

  const [loginDigitado, setLoginDigitado] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      await login(loginDigitado, senha);
      navegar('/');
    } catch (erroLogin) {
      setErro(erroLogin.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={estilos.pagina} className="sg-login-pagina">
      {/* Painel esquerdo: identidade da marca */}
      <div style={estilos.painelMarca} className="sg-login-marca">
        <div style={estilos.logoLinha}>
          <EscudoS />
          <span style={estilos.wordmark}>
            SYNC<span style={{ color: 'var(--cor-blue-600)' }}>GATE</span>
          </span>
        </div>
        <p style={estilos.tagline}>Controle inteligente de acesso</p>

        <OndasDeSinal />

        <p style={estilos.painelRodape}>
          Sistema de controle de acesso por RFID — ETEC Zona Leste
        </p>
      </div>

      {/* Painel direito: formulário */}
      <div style={estilos.painelFormulario}>
        <form onSubmit={aoEnviar} style={estilos.formulario}>
          <h1 style={estilos.titulo}>Entrar</h1>
          <p style={estilos.subtitulo}>Acesse o painel administrativo</p>

          <label style={estilos.rotulo}>
            Login
            <input
              type="text"
              value={loginDigitado}
              onChange={(e) => setLoginDigitado(e.target.value)}
              placeholder="seu.login"
              autoFocus
              required
              style={estilos.campo}
            />
          </label>

          <label style={estilos.rotulo}>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={estilos.campo}
            />
          </label>

          {erro && <div style={estilos.faixaErro}>{erro}</div>}

          <button type="submit" disabled={carregando} style={estilos.botao}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Ícone simplificado do escudo da logo, em SVG puro — evita
// depender de um arquivo de imagem externo para algo tão pequeno.
function EscudoS() {
  return (
    <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
      <path
        d="M50 5 L90 22 V50 C90 72 73 90 50 95 C27 90 10 72 10 50 V22 Z"
        fill="var(--cor-navy-900)"
      />
      <path
        d="M35 35 L65 35 L35 65 L65 65"
        stroke="var(--cor-blue-600)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Motivo decorativo de "ondas de sinal", ecoando o ícone de RFID
// da marca — em vez de um gradiente genérico de fundo.
function OndasDeSinal() {
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" style={{ opacity: 0.9 }}>
      {[40, 70, 100].map((raio, indice) => (
        <circle
          key={raio}
          cx="30"
          cy="110"
          r={raio}
          fill="none"
          stroke="var(--cor-blue-600)"
          strokeWidth="2"
          opacity={0.55 - indice * 0.15}
        />
      ))}
      <circle cx="30" cy="110" r="10" fill="var(--cor-blue-600)" />
    </svg>
  );
}

const estilos = {
  pagina: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    minHeight: '100vh',
  },
  painelMarca: {
    background:
      'linear-gradient(160deg, var(--cor-navy-900) 0%, var(--cor-navy-800) 100%)',
    color: 'white',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  logoLinha: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  wordmark: {
    fontFamily: 'var(--fonte-display)',
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: 'white',
  },
  tagline: {
    marginTop: '0.5rem',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.95rem',
  },
  painelRodape: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.85rem',
    maxWidth: '22rem',
  },
  painelFormulario: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'var(--cor-superficie)',
  },
  formulario: {
    width: '100%',
    maxWidth: '22rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  titulo: {
    fontSize: '1.6rem',
    color: 'var(--cor-texto)',
  },
  subtitulo: {
    color: 'var(--cor-texto-suave)',
    marginTop: '-0.6rem',
  },
  rotulo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '0.85rem',
    color: 'var(--cor-texto-suave)',
    fontWeight: 500,
  },
  campo: {
    padding: '0.65rem 0.8rem',
    borderRadius: 'var(--raio-pequeno)',
    border: '1px solid var(--cor-borda)',
    outline: 'none',
    fontSize: '0.95rem',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)',
    color: 'var(--cor-perigo)',
    padding: '0.65rem 0.8rem',
    borderRadius: 'var(--raio-pequeno)',
    fontSize: '0.85rem',
  },
  botao: {
    marginTop: '0.4rem',
    padding: '0.75rem',
    borderRadius: 'var(--raio-pequeno)',
    border: 'none',
    background: 'var(--cor-blue-600)',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
};
