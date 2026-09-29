import { useState, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import api from '../api/client';

// Componente reutilizável para botões de exportar/importar CSV.
// Usado nas telas de Usuários, Cartões, Dispositivos e Histórico.
//
// Props:
//   rotaExportar   - caminho da API para exportar (ex: '/csv/usuarios/exportar')
//   nomeArquivo    - nome do arquivo baixado (ex: 'usuarios.csv')
//   rotaImportar   - caminho da API para importar (null = só exporta, como no Histórico)
//   aoImportar     - callback chamado após importação bem-sucedida (para recarregar a lista)

export default function BotoesCSV({ rotaExportar, nomeArquivo, rotaImportar, aoImportar }) {
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const inputRef = useRef(null);

  async function exportar() {
    setErro(null);
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
      if (aoImportar) aoImportar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setImportando(false);
      // Limpa o input para permitir importar o mesmo arquivo de novo
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <div style={estilos.container}>
        <button
          style={estilos.botao}
          onClick={exportar}
          disabled={exportando}
          title="Exportar CSV"
        >
          <Download size={16} />
          {exportando ? 'Exportando...' : 'Exportar CSV'}
        </button>

        {rotaImportar && (
          <>
            <button
              style={estilos.botao}
              onClick={() => inputRef.current?.click()}
              disabled={importando}
              title="Importar CSV"
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

      {erro && <div style={estilos.faixaErro}>{erro}</div>}

      {resultado && (
        <div style={estilos.faixaResultado}>
          <strong>Importação concluída:</strong>{' '}
          {resultado.inseridos} inserido(s), {resultado.pulados} pulado(s)
          {resultado.erros?.length > 0 && (
            <ul style={estilos.listaErros}>
              {resultado.erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

const estilos = {
  container: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  botao: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'var(--cor-superficie)',
    color: 'var(--cor-texto)',
    border: '1px solid var(--cor-borda)',
    padding: '0.5rem 0.85rem',
    borderRadius: 'var(--raio-pequeno)',
    fontWeight: 500,
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  faixaErro: {
    background: 'var(--cor-perigo-fundo)',
    color: 'var(--cor-perigo)',
    padding: '0.6rem 0.8rem',
    borderRadius: 'var(--raio-pequeno)',
    fontSize: '0.85rem',
  },
  faixaResultado: {
    background: 'var(--cor-sucesso-fundo, #ecfdf5)',
    color: 'var(--cor-sucesso, #047857)',
    padding: '0.6rem 0.8rem',
    borderRadius: 'var(--raio-pequeno)',
    fontSize: '0.85rem',
  },
  listaErros: {
    margin: '0.4rem 0 0',
    paddingLeft: '1.2rem',
    fontSize: '0.8rem',
  },
};
