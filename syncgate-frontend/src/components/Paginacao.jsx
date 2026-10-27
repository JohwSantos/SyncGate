import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// Props:
//   pagina       — pagina atual (1-indexed)
//   totalPaginas — total de paginas
//   total        — total de registros (opcional)
//   aoMudar      — callback(novaPagina)
export default function Paginacao({ pagina, totalPaginas, total, aoMudar }) {
  // Só some quando não há nenhum registro. Com uma única página, a
  // barra continua aparecendo (com o total de registros e os botões
  // desativados) — antes ela sumia, e parecia que a tela não tinha
  // paginação.
  if (!total && totalPaginas <= 1) return null;

  function gerarPaginas() {
    const paginas = [];
    let inicio = Math.max(1, pagina - 2);
    let fim = Math.min(totalPaginas, pagina + 2);
    if (fim - inicio < 4) {
      if (inicio === 1) fim = Math.min(totalPaginas, 5);
      else inicio = Math.max(1, totalPaginas - 4);
    }
    for (let i = inicio; i <= fim; i++) paginas.push(i);
    return paginas;
  }

  return (
    <div className="sg-pagination">
      <span className="sg-pagination-info">
        Pagina <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
        {total != null && <> &mdash; {total.toLocaleString('pt-BR')} registro(s)</>}
      </span>

      <div className="sg-pagination-controls">
        <button
          className="sg-page-btn"
          onClick={() => aoMudar(1)}
          disabled={pagina <= 1}
          title="Primeira pagina"
          aria-label="Primeira pagina"
        >
          <ChevronsLeft size={13} />
        </button>
        <button
          className="sg-page-btn"
          onClick={() => aoMudar(pagina - 1)}
          disabled={pagina <= 1}
          title="Pagina anterior"
          aria-label="Pagina anterior"
        >
          <ChevronLeft size={13} />
        </button>

        {gerarPaginas().map((num) => (
          <button
            key={num}
            className={`sg-page-btn${num === pagina ? ' sg-page-btn--active' : ''}`}
            onClick={() => aoMudar(num)}
            aria-label={`Pagina ${num}`}
            aria-current={num === pagina ? 'page' : undefined}
          >
            {num}
          </button>
        ))}

        <button
          className="sg-page-btn"
          onClick={() => aoMudar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          title="Proxima pagina"
          aria-label="Proxima pagina"
        >
          <ChevronRight size={13} />
        </button>
        <button
          className="sg-page-btn"
          onClick={() => aoMudar(totalPaginas)}
          disabled={pagina >= totalPaginas}
          title="Ultima pagina"
          aria-label="Ultima pagina"
        >
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  );
}