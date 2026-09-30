import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// Componente reutilizável de paginação.
// Props:
//   pagina       — página atual (1-indexed)
//   totalPaginas — total de páginas
//   total        — total de registros
//   aoMudar      — callback(novaPagina)

export default function Paginacao({ pagina, totalPaginas, total, aoMudar }) {
  if (totalPaginas <= 1) return null;

  // Gera os números de página visíveis (máx. 5 ao redor da atual)
  function gerarPaginas() {
    const paginas = [];
    let inicio = Math.max(1, pagina - 2);
    let fim = Math.min(totalPaginas, pagina + 2);

    // Ajusta para sempre mostrar 5 botões quando possível
    if (fim - inicio < 4) {
      if (inicio === 1) fim = Math.min(totalPaginas, 5);
      else inicio = Math.max(1, totalPaginas - 4);
    }

    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  return (
    <div style={estilos.container}>
      <span style={estilos.info}>
        Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
        {total != null && <> — {total.toLocaleString('pt-BR')} registro(s)</>}
      </span>

      <div style={estilos.botoes}>
        <button
          style={estilos.botao}
          onClick={() => aoMudar(1)}
          disabled={pagina <= 1}
          title="Primeira página"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          style={estilos.botao}
          onClick={() => aoMudar(pagina - 1)}
          disabled={pagina <= 1}
          title="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {gerarPaginas().map((num) => (
          <button
            key={num}
            style={{
              ...estilos.botao,
              ...(num === pagina ? estilos.botaoAtivo : {}),
            }}
            onClick={() => aoMudar(num)}
          >
            {num}
          </button>
        ))}

        <button
          style={estilos.botao}
          onClick={() => aoMudar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          title="Próxima página"
        >
          <ChevronRight size={16} />
        </button>
        <button
          style={estilos.botao}
          onClick={() => aoMudar(totalPaginas)}
          disabled={pagina >= totalPaginas}
          title="Última página"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

const estilos = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.75rem',
    padding: '0.75rem 0 0',
  },
  info: {
    fontSize: '0.82rem',
    color: 'var(--cor-texto-suave)',
  },
  botoes: {
    display: 'flex',
    gap: '0.25rem',
  },
  botao: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2rem',
    height: '2rem',
    padding: '0 0.4rem',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio-pequeno)',
    background: 'var(--cor-superficie)',
    color: 'var(--cor-texto)',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  botaoAtivo: {
    background: 'var(--cor-blue-600)',
    color: 'white',
    borderColor: 'var(--cor-blue-600)',
  },
};
