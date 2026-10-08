import { useState, useRef } from 'react';
import { Download, Upload, Users, CreditCard, Router, History, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { usePermissoes } from '../hooks/usePermissoes';

export default function ImportacaoExportacao() {
  const {
    podeGerenciarUsuarios,
    podeGerenciarCartoesDispositivos,
  } = usePermissoes();

  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Importacao e Exportacao</h1>
          <p className="sg-page-subtitle">
            Exporte dados para CSV ou importe registros em lote a partir de arquivos <code>.csv</code>.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 'var(--sg-space-4)' }}>
        <SecaoCSV
          titulo="Usuarios"
          descricao="Cadastro de alunos, professores, funcionarios e administradores."
          Icone={Users}
          rotaExportar="/csv/usuarios/exportar"
          nomeArquivo="usuarios.csv"
          rotaImportar={podeGerenciarUsuarios ? '/csv/usuarios/importar' : null}
          dicaImportacao="Campos obrigatorios: nome, cpf, tipo, login, senha. Linhas com CPF ja cadastrado serao puladas."
        />

        <SecaoCSV
          titulo="Cartoes RFID"
          descricao="Cartoes vinculados a usuarios. Referencia o dono pelo CPF no CSV."
          Icone={CreditCard}
          rotaExportar="/csv/cartoes/exportar"
          nomeArquivo="cartoes.csv"
          rotaImportar={podeGerenciarCartoesDispositivos ? '/csv/cartoes/importar' : null}
          dicaImportacao="Campos obrigatorios: uid, cpf_usuario. Linhas com UID ja cadastrado serao puladas."
        />

        <SecaoCSV
          titulo="Dispositivos"
          descricao="Catracas e leitores RFID instalados fisicamente."
          Icone={Router}
          rotaExportar="/csv/dispositivos/exportar"
          nomeArquivo="dispositivos.csv"
          rotaImportar={podeGerenciarCartoesDispositivos ? '/csv/dispositivos/importar' : null}
          dicaImportacao="Campo obrigatorio: descricao. Linhas com descricao ja existente serao puladas."
        />

        <SecaoCSV
          titulo="Historico de Acessos"
          descricao="Log imutavel de todas as tentativas de acesso — somente exportacao."
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
    <div className="sg-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sg-space-3)' }}>
        <div style={{ background: 'var(--sg-primary)', color: 'white', padding: '0.5rem', borderRadius: 'var(--sg-radius)', display: 'flex', flexShrink: 0 }}>
          <Icone size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--sg-text-1)' }}>{titulo}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--sg-text-2)', margin: '0.2rem 0 0', lineHeight: 1.4 }}>{descricao}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sg-space-2)', marginTop: 'var(--sg-space-4)', flexWrap: 'wrap' }}>
        <button
          className="sg-btn sg-btn-secondary"
          onClick={exportar}
          disabled={exportando}
        >
          {exportando ? <Spinner tamanho="sm" /> : <Download size={15} />}
          Exportar CSV
        </button>

        {rotaImportar && (
          <>
            <button
              className="sg-btn sg-btn-primary"
              onClick={() => inputRef.current?.click()}
              disabled={importando}
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

      {dicaImportacao && rotaImportar && (
        <div className="sg-alert sg-alert--info" style={{ marginTop: 'var(--sg-space-3)', padding: '0.6rem 0.75rem' }}>
          <FileSpreadsheet size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{dicaImportacao}</span>
        </div>
      )}

      {erro && (
        <div className="sg-alert sg-alert--error" style={{ marginTop: 'var(--sg-space-3)' }} role="alert">
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{erro}</span>
        </div>
      )}

      {resultado && (
        <div className="sg-alert sg-alert--success" style={{ marginTop: 'var(--sg-space-3)' }} role="status">
          <CheckCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span>
              <strong>{resultado.inseridos}</strong> inserido(s),{' '}
              <strong>{resultado.pulados}</strong> pulado(s)
            </span>
            {resultado.erros?.length > 0 && (
              <ul style={{ margin: 'var(--sg-space-2) 0 0', paddingLeft: 'var(--sg-space-3)', color: 'var(--sg-danger)', fontSize: '0.8rem' }}>
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