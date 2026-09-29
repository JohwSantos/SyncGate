import { useState, useRef } from 'react';
import { Download, Upload, Users, CreditCard, Router, History, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import { usePermissoes } from '../hooks/usePermissoes';

// Página dedicada de importação/exportação CSV.
// Organizada em seções (cards), uma por entidade.

export default function ImportacaoExportacao() {
  const {
    podeGerenciarUsuarios,
    podeGerenciarCartoesDispositivos,
  } = usePermissoes();

  return (
    <div style={estilos.pagina}>
      <div style={estilos.cabecalho}>
        <h1 style={estilos.titulo}>Importação e Exportação</h1>
        <p style={estilos.subtitulo}>
          Exporte dados para CSV ou importe registros em lote a partir de arquivos <code>.csv</code>.
        </p>
      </div>

      <div style={estilos.grid}>
        <SecaoCSV
          titulo="Usuários"
          descricao="Cadastro de alunos, professores, funcionários e administradores."
          Icone={Users}
          rotaExportar="/csv/usuarios/exportar"
          nomeArquivo="usuarios.csv"
          rotaImportar={podeGerenciarUsuarios ? '/csv/usuarios/importar' : null}
          dicaImportacao="Campos obrigatórios: nome, cpf, tipo, login, senha. Linhas com CPF já cadastrado serão puladas."
        />

        <SecaoCSV
          titulo="Cartões RFID"
          descricao="Cartões vinculados a usuários. Referencia o dono pelo CPF no CSV."
          Icone={CreditCard}
          rotaExportar="/csv/cartoes/exportar"
          nomeArquivo="cartoes.csv"
          rotaImportar={podeGerenciarCartoesDispositivos ? '/csv/cartoes/importar' : null}
          dicaImportacao="Campos obrigatórios: uid, cpf_usuario. Linhas com UID já cadastrado serão puladas."
        />

        <SecaoCSV
          titulo="Dispositivos"
          descricao="Catracas e leitores RFID instalados fisicamente."
          Icone={Router}
          rotaExportar="/csv/dispositivos/exportar"
          nomeArquivo="dispositivos.csv"
          rotaImportar={podeGerenciarCartoesDispositivos ? '/csv/dispositivos/importar' : null}
          dicaImportacao="Campo obrigatório: descricao. Linhas com descrição já existente serão puladas."
        />

        <SecaoCSV
          titulo="Histórico de Acessos"
          descricao="Log imutável de todas as tentativas de acesso — somente exportação."
          Icone={History}
          rotaExportar="/csv/historico/exportar"
          nomeArquivo="historico-acessos.csv"
          rotaImportar={null}
          dicaImportacao={null}
        />
      </div>
    </div>
  );
}


// Componente interno: cada "card" de entidade com seus botões.
function SecaoCSV({ titulo, descricao, Icone, rotaExportar, nomeArquivo, rotaImportar, dicaImportacao }) {
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const inputRef = useRef(null);

  async function exportar() {
    setErro(null);
    setResultado(null);
    setExportando(true);
    try {
      await api.baixarArquivo(rotaExportar, nomeArquivo);
    } catch (e) {
      setErro(e.message);
    } finally {
      setExportando(false);
    }
  }

  async function importar(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    setErro(null);
    setResultado(null);
    setImportando(true);

    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      const res = await api.upload(rotaImportar, formData);
      setResultado(res);
    } catch (e) {
      setErro(e.message);
    } finally {
      setImportando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style={estilos.card}>
      <div style={estilos.cardCabecalho}>
        <div style={estilos.cardIcone}>
          <Icone size={20} />
        </div>
        <div>
          <h2 style={estilos.cardTitulo}>{titulo}</h2>
          <p style={estilos.cardDescricao}>{descricao}</p>
        </div>
      </div>

      <div style={estilos.cardBotoes}>
        <button
          style={estilos.botaoExportar}
          onClick={exportar}
          disabled={exportando}
        >
          <Download size={16} />
          {exportando ? 'Exportando...' : 'Exportar CSV'}
        </button>

        {rotaImportar && (
          <>
            <button
              style={estilos.botaoImportar}
              onClick={() => inputRef.current?.click()}
              disabled={importando}
            >
              <Upload size={16} />
              {importando ? 'Importando...' : 'Importar CSV'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={importar}
              style={{ display: 'none' }}
            />
          </>
        )}
      </div>

      {dicaImportacao && rotaImportar && (
        <p style={estilos.dica}>
          <FileSpreadsheet size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          {dicaImportacao}
        </p>
      )}

      {erro && (
        <div style={estilos.faixaErro}>
          <AlertTriangle size={15} />
          {erro}
        </div>
      )}

      {resultado && (
        <div style={estilos.faixaResultado}>
          <div style={estilos.resultadoResumo}>
            <CheckCircle size={15} />
            <span>
              <strong>{resultado.inseridos}</strong> inserido(s),{' '}
              <strong>{resultado.pulados}</strong> pulado(s)
            </span>
          </div>
          {resultado.erros?.length > 0 && (
            <ul style={estilos.listaErros}>
              {resultado.erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


const estilos = {
  pagina: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cabecalho: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  titulo: {
    fontSize: '1.4rem',
    margin: 0,
  },
  subtitulo: {
    fontSize: '0.88rem',
    color: 'var(--cor-texto-suave)',
    margin: 0,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
    gap: '1rem',
  },

  card: {
    background: 'var(--cor-superficie)',
    border: '1px solid var(--cor-borda)',
    borderRadius: 'var(--raio)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: 'var(--sombra)',
  },
  cardCabecalho: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  cardIcone: {
    background: 'var(--cor-blue-600)',
    color: 'white',
    borderRadius: 'var(--raio-pequeno)',
    padding: '0.5rem',
    display: 'flex',
    flexShrink: 0,
  },
  cardTitulo: {
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
  },
  cardDescricao: {
    fontSize: '0.82rem',
    color: 'var(--cor-texto-suave)',
    margin: '0.15rem 0 0',
    lineHeight: 1.4,
  },

  cardBotoes: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  botaoExportar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--cor-superficie)',
    color: 'var(--cor-texto)',
    border: '1px solid var(--cor-borda)',
    padding: '0.55rem 1rem',
    borderRadius: 'var(--raio-pequeno)',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  botaoImportar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--cor-blue-600)',
    color: 'white',
    border: 'none',
    padding: '0.55rem 1rem',
    borderRadius: 'var(--raio-pequeno)',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },

  dica: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.4rem',
    fontSize: '0.78rem',
    color: 'var(--cor-texto-suave)',
    margin: 0,
    lineHeight: 1.45,
    background: 'var(--cor-fundo)',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--raio-pequeno)',
  },

  faixaErro: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--cor-perigo-fundo)',
    color: 'var(--cor-perigo)',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--raio-pequeno)',
    fontSize: '0.85rem',
  },
  faixaResultado: {
    background: 'var(--cor-sucesso-fundo)',
    color: 'var(--cor-sucesso)',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--raio-pequeno)',
    fontSize: '0.85rem',
  },
  resultadoResumo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  listaErros: {
    margin: '0.5rem 0 0',
    paddingLeft: '1.3rem',
    fontSize: '0.8rem',
    color: 'var(--cor-perigo)',
  },
};
