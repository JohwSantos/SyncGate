// ============================================================
// SyncGate — medição de desempenho da API (RNF01, RNF02, RNF06)
// ============================================================
// Simula catracas enviando leituras para POST /api/acesso/validar
// e mede quanto tempo a API leva para decidir.
//
// ATENÇÃO: cada leitura vira um registro PERMANENTE no histórico
// (RN08). Rode contra um banco de teste, nunca no banco da escola.
// O passo a passo está em docs/medicoes.md.
//
// Uso:
//   node scripts/medir-desempenho.js resposta   (RNF01: 60 leituras, 1 por segundo)
//   node scripts/medir-desempenho.js carga      (RNF06: 20 catracas ao mesmo tempo por 60 s)
//   node scripts/medir-desempenho.js continuo   (RNF02: 1 leitura a cada 10 s; MINUTOS=60)
//
// Variáveis de ambiente:
//   SG_API          ex.: http://localhost:3000/api
//   SG_DISPOSITIVO  id do dispositivo de teste
//   SG_CHAVE        chave desse dispositivo (64 caracteres)
//   SG_UID          UID de um cartão cadastrado (opcional)
//   CATRACAS, SEGUNDOS, MINUTOS  ajustam os modos acima
// ============================================================

const API = process.env.SG_API || 'http://localhost:3000/api';
const DISPOSITIVO = Number(process.env.SG_DISPOSITIVO);
const CHAVE = process.env.SG_CHAVE || '';
const UID = process.env.SG_UID || 'TESTE0001';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Uma leitura de cartão. Devolve { ms, ok, status }.
async function lerCartao() {
  const inicio = performance.now();
  try {
    const resposta = await fetch(`${API}/acesso/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Dispositivo-Chave': CHAVE },
      body: JSON.stringify({ uid: UID, id_dispositivo: DISPOSITIVO }),
      signal: AbortSignal.timeout(10000),
    });
    await resposta.text();
    return { ms: performance.now() - inicio, ok: resposta.status === 200, status: resposta.status };
  } catch (erro) {
    return { ms: performance.now() - inicio, ok: false, status: erro.name };
  }
}

// Percentil de uma lista de tempos (p = 50 → mediana).
function percentil(tempos, p) {
  const ordenados = [...tempos].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)];
}

function resumo(titulo, resultados, segundos) {
  const tempos = resultados.filter((r) => r.ok).map((r) => r.ms);
  const falhas = resultados.filter((r) => !r.ok);
  console.log(`\n=== ${titulo} ===`);
  console.log(`Leituras: ${resultados.length} | sucesso: ${tempos.length} | falhas: ${falhas.length}`);
  if (falhas.length) {
    const tipos = {};
    for (const f of falhas) tipos[f.status] = (tipos[f.status] || 0) + 1;
    console.log('Falhas por tipo:', tipos);
  }
  if (tempos.length) {
    console.log(`Tempo de resposta (ms): média ${(tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1)}`
      + ` | mediana ${percentil(tempos, 50).toFixed(1)} | p95 ${percentil(tempos, 95).toFixed(1)}`
      + ` | máximo ${Math.max(...tempos).toFixed(1)}`);
    console.log(`Abaixo de 2 s (RNF01): ${((tempos.filter((t) => t < 2000).length / resultados.length) * 100).toFixed(1)}%`);
  }
  if (segundos) console.log(`Vazão: ${(resultados.length / segundos).toFixed(1)} leituras/s`);
  console.log(`Disponibilidade: ${((tempos.length / resultados.length) * 100).toFixed(2)}%`);
}

async function modoResposta() {
  const resultados = [];
  for (let i = 0; i < 60; i++) {
    resultados.push(await lerCartao());
    process.stdout.write('.');
    await esperar(1000);
  }
  resumo('RNF01 — tempo de resposta (60 leituras, 1 por segundo)', resultados);
}

async function modoCarga() {
  const catracas = Number(process.env.CATRACAS) || 20;
  const segundos = Number(process.env.SEGUNDOS) || 60;
  const fim = Date.now() + segundos * 1000;
  const resultados = [];
  // Cada "catraca" lê um cartão atrás do outro, sem pausa (pior caso).
  await Promise.all(Array.from({ length: catracas }, async () => {
    while (Date.now() < fim) resultados.push(await lerCartao());
  }));
  resumo(`RNF06 — carga (${catracas} catracas simultâneas por ${segundos} s)`, resultados, segundos);
}

async function modoContinuo() {
  const minutos = Number(process.env.MINUTOS) || 60;
  const fim = Date.now() + minutos * 60 * 1000;
  const resultados = [];
  while (Date.now() < fim) {
    const r = await lerCartao();
    resultados.push(r);
    if (!r.ok) console.log(`\n${new Date().toLocaleString('pt-BR')} FALHA: ${r.status}`);
    else process.stdout.write('.');
    await esperar(10000);
  }
  resumo(`RNF02 — operação contínua (${minutos} min, 1 leitura a cada 10 s)`, resultados);
}

const modos = { resposta: modoResposta, carga: modoCarga, continuo: modoContinuo };
const modo = modos[process.argv[2]];

if (!modo || !DISPOSITIVO || CHAVE.length !== 64) {
  console.log('Uso: node scripts/medir-desempenho.js resposta|carga|continuo');
  console.log('Defina SG_DISPOSITIVO e SG_CHAVE (veja o começo deste arquivo).');
  process.exit(1);
}

modo();
