import { useState } from 'react';

// Infográfico do Dashboard: mostra os relatórios que a API já
// oferece (/relatorios/por-hora-hoje, /por-dia, /por-semana,
// /por-mes, /por-ano e o resumo).
// As barras são <div>s com altura/largura em %, sem biblioteca de
// gráficos. Cada número também aparece em texto (title/aria-label
// e rótulos), para não depender só da cor.

const COR_PERMITIDO = 'var(--sg-success)';
const COR_NEGADO = 'var(--sg-danger)';
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// 'AAAA-MM-DD' no fuso do navegador (en-CA escreve nesse formato).
const chaveData = (data) => new Date(data).toLocaleDateString('en-CA');
const contagem = (linha) => ({ permitidos: Number(linha?.permitidos) || 0, negados: Number(linha?.negados) || 0 });

// Cada período vira uma lista de barras. A API só devolve os
// períodos que tiveram acesso: os vazios são completados com zero.
const PERIODOS = {
  dia: {
    rotulo: 'Dia',
    titulo: 'Últimos 7 dias',
    montar: (linhas) => Array.from({ length: 7 }, (_, i) => {
      const data = new Date();
      data.setDate(data.getDate() - (6 - i));
      const linha = linhas.find((r) => chaveData(r.data) === chaveData(data));
      return { rotulo: `${DIAS_SEMANA[data.getDay()]} ${data.getDate()}`, ...contagem(linha) };
    }),
  },
  semana: {
    rotulo: 'Semana',
    titulo: 'Últimas 8 semanas (início na segunda-feira)',
    montar: (linhas) => {
      const segunda = new Date();
      segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
      return Array.from({ length: 8 }, (_, i) => {
        const inicio = new Date(segunda);
        inicio.setDate(segunda.getDate() - 7 * (7 - i));
        const linha = linhas.find((r) => chaveData(r.inicio_semana) === chaveData(inicio));
        return { rotulo: `${inicio.getDate()}/${inicio.getMonth() + 1}`, ...contagem(linha) };
      });
    },
  },
  mes: {
    rotulo: 'Mês',
    titulo: 'Últimos 12 meses',
    montar: (linhas) => Array.from({ length: 12 }, (_, i) => {
      const hoje = new Date();
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
      const linha = linhas.find((r) => Number(r.ano) === mes.getFullYear() && Number(r.mes) === mes.getMonth() + 1);
      // O ano aparece (numa 2ª linha, para caber no celular) no primeiro mês e em cada janeiro.
      const ano = i === 0 || mes.getMonth() === 0 ? `\n${mes.getFullYear()}` : '';
      return { rotulo: `${MESES[mes.getMonth()]}${ano}`, ...contagem(linha) };
    }),
  },
  ano: {
    rotulo: 'Ano',
    titulo: 'Por ano',
    montar: (linhas) => (linhas.length
      ? linhas.map((r) => ({ rotulo: String(r.ano), ...contagem(r) }))
      : [{ rotulo: String(new Date().getFullYear()), permitidos: 0, negados: 0 }]),
  },
};

export default function Infografico({ resumo, porHora = [], porPeriodo = {} }) {
  const [periodo, setPeriodo] = useState('dia');
  const atual = PERIODOS[periodo];

  // A API só devolve horas/dias que tiveram acesso: completamos os vazios com zero.
  const horas = Array.from({ length: 24 }, (_, h) => {
    const linha = porHora.find((r) => Number(r.hora) === h);
    return { rotulo: `${h}h`, permitidos: Number(linha?.permitidos) || 0, negados: Number(linha?.negados) || 0 };
  });

  const barrasPeriodo = atual.montar(porPeriodo[periodo] ?? []);

  const hoje = { permitidos: resumo?.permitidosHoje ?? 0, negados: resumo?.negadosHoje ?? 0 };
  const totalHoje = hoje.permitidos + hoje.negados;
  const pctPermitido = totalHoje ? Math.round((hoje.permitidos / totalHoje) * 100) : 0;

  const motivos = resumo?.topMotivosNegacao ?? [];
  const maiorMotivo = Math.max(1, ...motivos.map((m) => Number(m.total)));

  return (
    <section className="sg-card" aria-labelledby="titulo-infografico">
      <div className="sg-card-header">
        <h2 id="titulo-infografico" style={estilos.titulo}>Infográfico de acessos</h2>
        <Legenda />
      </div>

      <div style={estilos.grade}>
        <Bloco titulo="Acessos por hora (hoje)">
          <Barras itens={horas} rotuloACada={3} />
        </Bloco>

        <Bloco titulo={`Resumo por período: ${atual.titulo.toLowerCase()}`}>
          <div style={estilos.abas} role="group" aria-label="Período do resumo">
            {Object.entries(PERIODOS).map(([chave, p]) => (
              <button
                key={chave}
                type="button"
                aria-pressed={periodo === chave}
                onClick={() => setPeriodo(chave)}
                style={{ ...estilos.aba, ...(periodo === chave ? estilos.abaAtiva : null) }}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
          <Barras itens={barrasPeriodo} rotuloACada={1} mostrarTotal />
        </Bloco>

        <Bloco titulo="Resultado de hoje">
          {totalHoje === 0 ? (
            <p style={estilos.vazio}>Nenhum acesso hoje ainda.</p>
          ) : (
            <>
              <p style={estilos.destaque}>
                {pctPermitido}% <span style={estilos.destaqueRotulo}>permitidos</span>
              </p>
              <div
                style={estilos.trilho}
                role="img"
                aria-label={`${hoje.permitidos} permitidos e ${hoje.negados} negados hoje`}
              >
                <div style={{ width: `${pctPermitido}%`, background: COR_PERMITIDO }} />
                <div style={{ flex: 1, background: COR_NEGADO }} />
              </div>
              <p style={estilos.legendaLinha}>
                {hoje.permitidos} permitido(s) · {hoje.negados} negado(s)
              </p>
            </>
          )}
        </Bloco>

        <Bloco titulo="Principais motivos de negação">
          {motivos.length === 0 ? (
            <p style={estilos.vazio}>Nenhum acesso negado registrado.</p>
          ) : (
            <ul style={estilos.listaMotivos}>
              {motivos.map((m) => (
                <li key={m.motivo} style={estilos.motivo}>
                  <span style={estilos.motivoTexto} className="sg-truncate" title={m.motivo}>{m.motivo}</span>
                  <span style={estilos.motivoTrilho} aria-hidden="true">
                    <span style={{ ...estilos.motivoBarra, width: `${(Number(m.total) / maiorMotivo) * 100}%` }} />
                  </span>
                  <span style={estilos.motivoTotal}>{m.total}</span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>
    </section>
  );
}

function Bloco({ titulo, children }) {
  return (
    <div style={estilos.bloco}>
      <h3 style={estilos.blocoTitulo}>{titulo}</h3>
      {children}
    </div>
  );
}

function Legenda() {
  return (
    <div style={estilos.legenda}>
      <span style={estilos.legendaItem}><span style={{ ...estilos.quadrado, background: COR_PERMITIDO }} />Permitido</span>
      <span style={estilos.legendaItem}><span style={{ ...estilos.quadrado, background: COR_NEGADO }} />Negado</span>
    </div>
  );
}

// Barras verticais empilhadas (permitidos embaixo, negados em cima).
function Barras({ itens, rotuloACada, mostrarTotal = false }) {
  const maior = Math.max(1, ...itens.map((i) => i.permitidos + i.negados));
  const total = itens.reduce((soma, i) => soma + i.permitidos + i.negados, 0);

  return (
    <div>
      <div style={estilos.barras} role="img" aria-label={`${total} acesso(s) no período`}>
        {itens.map((item) => {
          const soma = item.permitidos + item.negados;
          return (
            <div
              key={item.rotulo}
              style={estilos.coluna}
              title={`${item.rotulo.replace('\n', '/')}: ${item.permitidos} permitido(s), ${item.negados} negado(s)`}
            >
              {mostrarTotal && <span style={estilos.totalColuna}>{soma || ''}</span>}
              <div style={{ ...estilos.pilha, height: `${(soma / maior) * 100}%` }}>
                <div style={{ flex: item.negados, background: COR_NEGADO }} />
                <div style={{ flex: item.permitidos, background: COR_PERMITIDO }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={estilos.eixo} aria-hidden="true">
        {itens.map((item, i) => (
          <span key={item.rotulo} style={estilos.rotuloEixo}>{i % rotuloACada === 0 ? item.rotulo : ''}</span>
        ))}
      </div>
    </div>
  );
}

const estilos = {
  titulo: { fontSize: 'var(--sg-text-base)', fontWeight: 600 },
  grade: {
    display: 'grid',
    // 2×2 no computador, 1 coluna no celular (min() evita estourar telas < 420px).
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
    gap: 'var(--sg-space-5)',
    padding: 'var(--sg-space-5)',
  },
  bloco: { display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)', minWidth: 0 },
  blocoTitulo: { fontSize: 'var(--sg-text-sm)', fontWeight: 600, color: 'var(--sg-text-2)' },
  barras: { display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px', borderBottom: '1px solid var(--sg-border)' },
  coluna: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 },
  pilha: { width: '100%', display: 'flex', flexDirection: 'column', borderRadius: '3px 3px 0 0', overflow: 'hidden' },
  totalColuna: { fontSize: 'var(--sg-text-xs)', color: 'var(--sg-text-2)', fontVariantNumeric: 'tabular-nums' },
  eixo: { display: 'flex', gap: '3px', marginTop: 'var(--sg-space-1)' },
  rotuloEixo: { flex: 1, textAlign: 'center', fontSize: 'var(--sg-text-xs)', color: 'var(--sg-text-3)', whiteSpace: 'pre-line', lineHeight: 1.2, minWidth: 0 },
  destaque: { fontSize: 'var(--sg-text-xl)', fontWeight: 700, lineHeight: 1, color: 'var(--sg-text-1)' },
  destaqueRotulo: { fontSize: 'var(--sg-text-sm)', fontWeight: 500, color: 'var(--sg-text-2)' },
  trilho: { display: 'flex', height: '14px', borderRadius: '999px', overflow: 'hidden' },
  legendaLinha: { fontSize: 'var(--sg-text-xs)', color: 'var(--sg-text-2)' },
  vazio: { fontSize: 'var(--sg-text-sm)', color: 'var(--sg-text-3)' },
  listaMotivos: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-2)' },
  motivo: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', alignItems: 'center', gap: 'var(--sg-space-2)', fontSize: 'var(--sg-text-sm)' },
  motivoTexto: { color: 'var(--sg-text-1)' },
  motivoTrilho: { height: '8px', background: 'var(--sg-border)', borderRadius: '999px', overflow: 'hidden' },
  motivoBarra: { display: 'block', height: '100%', background: COR_NEGADO, borderRadius: '999px' },
  motivoTotal: { fontVariantNumeric: 'tabular-nums', color: 'var(--sg-text-2)', minWidth: '2ch', textAlign: 'right' },
  abas: { display: 'flex', gap: 'var(--sg-space-1)', flexWrap: 'wrap' },
  aba: {
    minHeight: '32px',
    padding: '0 var(--sg-space-3)',
    fontSize: 'var(--sg-text-xs)',
    fontWeight: 500,
    color: 'var(--sg-text-2)',
    background: 'transparent',
    border: '1px solid var(--sg-border)',
    borderRadius: '999px',
    cursor: 'pointer',
  },
  abaAtiva: { color: 'var(--sg-text-1)', background: 'var(--sg-surface-2)', borderColor: 'var(--sg-text-3)', fontWeight: 600 },
  legenda: { display: 'flex', gap: 'var(--sg-space-3)', fontSize: 'var(--sg-text-xs)', color: 'var(--sg-text-2)' },
  legendaItem: { display: 'flex', alignItems: 'center', gap: 'var(--sg-space-1)' },
  quadrado: { width: '10px', height: '10px', borderRadius: '2px', display: 'inline-block' },
};
