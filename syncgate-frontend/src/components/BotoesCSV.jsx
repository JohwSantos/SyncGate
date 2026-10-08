import { useState, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import Spinner from './Spinner';

// Componente reutilizavel para botoes de exportar/importar CSV.
export default function BotoesCSV({ rotaExportar, nomeArquivo, rotaImportar, aoImportar }) {
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
      if (aoImportar) aoImportar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setImportando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--sg-space-2)', alignItems: 'center' }}>
        <button
          className="sg-btn sg-btn-secondary"
          onClick={exportar}
          disabled={exportando}
          title="Exportar CSV"
        >
          {exportando ? <Spinner tamanho="sm" /> : <Download size={15} />}
          Exportar CSV
        </button>

        {rotaImportar && (
          <>
            <button
              className="sg-btn sg-btn-secondary"
              onClick={() => inputRef.current?.click()}
              disabled={importando}
              title="Importar CSV"
            >
              {importando ? <Spinner tamanho="sm" /> : <Upload size={15} />}
              Importar CSV
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={importar}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {erro && (
        <div className="sg-alert sg-alert--error" role="alert">
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{erro}</span>
        </div>
      )}

      {resultado && (
        <div className="sg-alert sg-alert--success" role="status">
          <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Importacao concluida:</strong>{' '}
            {resultado.inseridos} inserido(s), {resultado.pulados} pulado(s).
            {resultado.erros?.length > 0 && (
              <ul style={{ margin: 'var(--sg-space-2) 0 0', paddingLeft: 'var(--sg-space-4)' }}>
                {resultado.erros.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}