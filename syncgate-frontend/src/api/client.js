// Cliente HTTP central do painel: toda chamada à API do SyncGate
// passa por aqui. Isso evita repetir "monta a URL, adiciona o
// token, trata erro" em cada tela.

const URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function pegarToken() {
  return localStorage.getItem('syncgate_token');
}

async function requisitar(caminho, opcoes = {}) {
  const token = pegarToken();

  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
  });

  // Respostas 204 (No Content) não têm corpo para converter em JSON
  const dados = resposta.status === 204 ? null : await resposta.json();

  if (!resposta.ok) {
    // Padroniza o erro: toda tela pode confiar que `erro.mensagem`
    // existe, não importa o formato exato que o backend devolveu.
    const erro = new Error(dados?.erro || 'Erro inesperado ao falar com o servidor');
    erro.status = resposta.status;
    throw erro;
  }

  return dados;
}

const api = {
  get: (caminho) => requisitar(caminho, { method: 'GET' }),
  post: (caminho, corpo) => requisitar(caminho, { method: 'POST', body: JSON.stringify(corpo) }),
  put: (caminho, corpo) => requisitar(caminho, { method: 'PUT', body: JSON.stringify(corpo) }),
  patch: (caminho, corpo) => requisitar(caminho, { method: 'PATCH', body: JSON.stringify(corpo) }),
  delete: (caminho) => requisitar(caminho, { method: 'DELETE' }),
};

export { URL_BASE, pegarToken };
export default api;
