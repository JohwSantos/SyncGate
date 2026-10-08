import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Modal generico reutilizado por todas as telas de cadastro.
// Acessivel: trap de foco, Escape fecha, aria-modal, aria-labelledby.
export default function Modal({ titulo, aoFechar, children, largura }) {
  const referenciaConteudo = useRef(null);

  useEffect(() => {
    const elementoAnterior = document.activeElement;
    referenciaConteudo.current?.focus();

    function fecharComEscape(evento) {
      if (evento.key === 'Escape') aoFechar();
    }
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.removeEventListener('keydown', fecharComEscape);
      elementoAnterior?.focus?.();
    };
  }, [aoFechar]);

  return (
    <div className="sg-modal-backdrop" onClick={aoFechar} role="presentation">
      <div
        className="sg-modal"
        style={largura ? { maxWidth: largura } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        ref={referenciaConteudo}
      >
        <div className="sg-modal-header">
          <h2 id="modal-titulo" className="sg-modal-title">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            className="sg-btn sg-btn-ghost sg-btn-icon"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="sg-modal-body">{children}</div>
      </div>
    </div>
  );
}