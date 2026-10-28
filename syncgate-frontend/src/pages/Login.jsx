import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navegar = useNavigate();

  const [loginDigitado, setLoginDigitado] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Veio de um 401 (token expirado): avisa o motivo de ter voltado ao login.
  const [erro, setErro] = useState(() =>
    new URLSearchParams(window.location.search).has('expirada')
      ? 'Sua sessão expirou. Entre novamente.'
      : null
  );

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
      {/* Painel esquerdo — identidade */}
      <div style={estilos.painelMarca} className="sg-login-marca">
        <div style={estilos.marcaTopo}>
          <div style={estilos.logoLinha}><LogoMarca /></div>
          <p style={estilos.tagline}>Controle de acesso por RFID</p>
        </div>

        <div style={estilos.marcaMeio}>
          <GridDecorativo />
        </div>

        <p style={estilos.marcaRodape}>
          ETEC Zona Leste &mdash; Sistema de controle de acesso
        </p>
      </div>

      {/* Painel direito — formulario */}
      <div style={estilos.painelFormulario}>
        <form onSubmit={aoEnviar} style={estilos.formulario} noValidate>
          <div style={estilos.formTopo}>
            <h1 style={estilos.titulo}>Entrar</h1>
            <p style={estilos.subtitulo}>Acesse o painel administrativo</p>
          </div>

          {/* Campo login */}
          <label className="sg-label" style={{ gap: 'var(--sg-space-2)' }}>
            Login
            <input
              type="text"
              value={loginDigitado}
              onChange={(e) => setLoginDigitado(e.target.value)}
              placeholder="seu.login"
              autoFocus
              required
              autoComplete="username"
              className={`sg-input${erro ? ' sg-input--error' : ''}`}
            />
          </label>

          {/* Campo senha */}
          <label className="sg-label" style={{ gap: 'var(--sg-space-2)' }}>
            Senha
            <div style={estilos.senhaWrap}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                className={`sg-input${erro ? ' sg-input--error' : ''}`}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                style={estilos.olho}
                tabIndex={-1}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {/* Mensagem de erro */}
          {erro && (
            <div className="sg-alert sg-alert--error" role="alert">
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{erro}</span>
            </div>
          )}

          {/* Botao */}
          <button
            type="submit"
            disabled={carregando || !loginDigitado || !senha}
            className="sg-btn sg-btn-primary"
            style={{ width: '100%', height: '38px', marginTop: 'var(--sg-space-2)', fontSize: 'var(--sg-text-md)' }}
          >
            {carregando ? (
              <>
                <span className="sg-spinner sg-spinner--sm" aria-hidden="true" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function LogoMarca() { return (<div className="sg-logo-container" style={{ padding: "8px", borderRadius: "var(--sg-radius)", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "300px", height: "120px" }}><img src="/logo.svg" alt="SyncGate" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>); }

// Grade decorativa minimalista — evoca "estrutura" e "ordem"
// sem ser um grafico ou forma abstrata
function GridDecorativo() {
  const linhas = 7;
  const colunas = 7;
  const pontos = [];
  for (let r = 0; r < linhas; r++) {
    for (let c = 0; c < colunas; c++) {
      const cx = 20 + c * 36;
      const cy = 20 + r * 36;
      const distCentro = Math.sqrt((c - 3) ** 2 + (r - 3) ** 2);
      const opacidade = Math.max(0.05, 0.35 - distCentro * 0.06);
      pontos.push({ cx, cy, opacidade });
    }
  }
  return (
    <svg
      width="260"
      height="260"
      viewBox="0 0 260 260"
      fill="none"
      aria-hidden="true"
      style={{ opacity: 0.6 }}
    >
      {pontos.map(({ cx, cy, opacidade }, i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" fill="var(--sg-text-3)" opacity={opacidade} />
      ))}
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
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  marcaTopo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--sg-space-2)',
  },
  logoLinha: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sg-space-3)',
  },
  wordmark: {
    fontFamily: 'var(--sg-font)',
    fontSize: 'var(--sg-text-xl)',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'white',
  },
  tagline: {
    color: 'var(--sg-text-2)',
    fontSize: 'var(--sg-text-sm)',
    fontWeight: 400,
  },
  marcaMeio: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  marcaRodape: {
    color: 'var(--sg-text-3)',
    fontSize: 'var(--sg-text-xs)',
  },
  painelFormulario: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'var(--sg-surface)',
  },
  formulario: {
    width: '100%',
    maxWidth: '340px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--sg-space-4)',
  },
  formTopo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--sg-space-1)',
    marginBottom: 'var(--sg-space-2)',
  },
  titulo: {
    fontSize: 'var(--sg-text-3xl)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },
  subtitulo: {
    fontSize: 'var(--sg-text-sm)',
    color: 'var(--sg-text-3)',
  },
  senhaWrap: {
    position: 'relative',
  },
  olho: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--sg-text-3)',
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
};





