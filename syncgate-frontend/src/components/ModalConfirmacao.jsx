import Modal from './Modal';
import Spinner from './Spinner';

export default function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  carregando = false,
  variante = 'danger',
  aoConfirmar,
  aoCancelar,
}) {
  if (!aberto) return null;

  return (
    <Modal titulo={titulo} aoFechar={carregando ? () => {} : aoCancelar} largura="420px">
      <p style={{ margin: 0, color: 'var(--sg-text-2)' }}>{mensagem}</p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sg-space-3)', marginTop: 'var(--sg-space-6)' }}>
        <button
          type="button"
          onClick={aoCancelar}
          disabled={carregando}
          className="sg-btn sg-btn-ghost"
        >
          {textoCancelar}
        </button>
        <button
          type="button"
          onClick={aoConfirmar}
          disabled={carregando}
          className={`sg-btn ${variante === 'danger' ? 'sg-btn-danger' : 'sg-btn-primary'}`}
          autoFocus
        >
          {carregando ? (
            <>
              <Spinner tamanho="sm" />
              Processando...
            </>
          ) : (
            textoConfirmar
          )}
        </button>
      </div>
    </Modal>
  );
}