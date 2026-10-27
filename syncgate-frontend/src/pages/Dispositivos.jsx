import { useEffect, useState } from 'react';
import { Plus, Trash2, KeyRound, Copy, Check } from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import Paginacao from '../components/Paginacao';
import Spinner from '../components/Spinner';
import EstadoVazio from '../components/EstadoVazio';
import ModalConfirmacao from '../components/ModalConfirmacao';
import BotoesCSV from '../components/BotoesCSV';
import { usePermissoes } from '../hooks/usePermissoes';
import { useSocket } from '../hooks/useSocket';

const STATUS_OPCOES = ['online', 'offline', 'manutencao'];
const TOM_STATUS = { online: 'sucesso', offline: 'perigo', manutencao: 'alerta' };
const ROTULO_STATUS = { online: 'Online', offline: 'Offline', manutencao: 'Manutencao' };

export default function Dispositivos() {
  const { podeGerenciarCartoesDispositivos } = usePermissoes();
  const [dispositivos, setDispositivos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Para exclusao
  const [dispositivoExclusao, setDispositivoExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Chave de API do dispositivo (ESP32)
  const [dispositivoChave, setDispositivoChave] = useState(null); // pedindo confirmacao
  const [gerandoChave, setGerandoChave] = useState(false);
  const [chaveGerada, setChaveGerada] = useState(null); // { dispositivo, chave }

  // Atualiza a linha do dispositivo em tempo real quando o backend
  // avisa uma mudanca (ex.: o ESP32 leu um cartao e ficou online).
  useSocket({
    'dispositivo-atualizado': (atualizado) => {
      setDispositivos((atual) =>
        atual.map((d) => (d.id_dispositivo === atualizado.id_dispositivo ? atualizado : d))
      );
    },
  });

  async function carregarDispositivos(pag = pagina) {
    try {
      setCarregando(true);
      const resp = await api.get(`/dispositivos?pagina=${pag}&limite=10`);
      setDispositivos(resp.dados);
      setTotalPaginas(resp.totalPaginas);
      setTotalRegistros(resp.total);
      setPagina(resp.pagina);
      setErroLista(null);
    } catch (erro) {
      setErroLista(erro.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDispositivos(1);
  }, []);

  async function mudarStatus(dispositivo, novoStatus) {
    setErroAcao(null);
    try {
      const atualizado = await api.patch(`/dispositivos/${dispositivo.id_dispositivo}/status`, {
        status: novoStatus,
      });
      setDispositivos((atual) =>
        atual.map((d) => (d.id_dispositivo === atualizado.id_dispositivo ? atualizado : d))
      );
    } catch (erro) {
      setErroAcao(erro.message);
    }
  }

  async function confirmarExclusao() {
    if (!dispositivoExclusao) return;
    setErroAcao(null);
    setExcluindo(true);
    try {
      await api.delete(`/dispositivos/${dispositivoExclusao.id_dispositivo}`);
      carregarDispositivos(pagina);
      setDispositivoExclusao(null);
    } catch (erro) {
      setErroAcao(erro.message);
      setDispositivoExclusao(null);
    } finally {
      setExcluindo(false);
    }
  }

  async function confirmarGerarChave() {
    if (!dispositivoChave) return;
    setErroAcao(null);
    setGerandoChave(true);
    try {
      const resultado = await api.post(`/dispositivos/${dispositivoChave.id_dispositivo}/chave`);
      setDispositivos((atual) =>
        atual.map((d) =>
          d.id_dispositivo === resultado.dispositivo.id_dispositivo ? resultado.dispositivo : d
        )
      );
      setChaveGerada(resultado);
    } catch (erro) {
      setErroAcao(erro.message);
    } finally {
      setGerandoChave(false);
      setDispositivoChave(null);
    }
  }

  function aoCadastrar() {
    carregarDispositivos(pagina);
    setModalAberto(false);
  }

  return (
    <div className="sg-page">
      <div className="sg-page-header">
        <div className="sg-page-header__left">
          <h1 className="sg-page-title">Dispositivos</h1>
          <p className="sg-page-subtitle">Gerencie as catracas e leitores conectados</p>
        </div>
        <div className="sg-page-actions">
          <BotoesCSV 
            rotaExportar="/csv/dispositivos/exportar" 
            nomeArquivo="dispositivos.csv" 
            rotaImportar="/csv/dispositivos/importar"
            aoImportar={() => carregarDispositivos(pagina)}
          />
          {podeGerenciarCartoesDispositivos && (
            <button className="sg-btn sg-btn-primary" onClick={() => setModalAberto(true)}>
              <Plus size={16} /> Novo dispositivo
            </button>
          )}
        </div>
      </div>

      {erroLista && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erroLista}</span>
        </div>
      )}

      {erroAcao && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>Nao foi possivel concluir a acao: {erroAcao}</span>
        </div>
      )}

      {carregando ? (
        <div className="sg-loading-area">
          <Spinner /> Carregando dispositivos...
        </div>
      ) : !erroLista ? (
        <div className="sg-table-wrap">
          <table className="sg-table sg-table-responsive">
            <thead>
              <tr>
                <th>Descricao</th>
                <th>Localizacao</th>
                <th>Status</th>
                <th>Ultima comunicacao</th>
                <th>Chave</th>
                {podeGerenciarCartoesDispositivos && (
                  <>
                    <th>Mudar status</th>
                    <th></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {dispositivos.map((dispositivo) => (
                <tr key={dispositivo.id_dispositivo}>
                  <td data-rotulo="Descricao"><strong>{dispositivo.descricao}</strong></td>
                  <td data-rotulo="Localizacao">{dispositivo.localizacao || '—'}</td>
                  <td data-rotulo="Status">
                    <Badge
                      texto={ROTULO_STATUS[dispositivo.status]}
                      tom={TOM_STATUS[dispositivo.status]}
                    />
                  </td>
                  <td className="sg-td-mono" data-rotulo="Ultima comunicacao">
                    {dispositivo.ultima_comunicacao
                      ? new Date(dispositivo.ultima_comunicacao).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </td>
                  <td data-rotulo="Chave">
                    <Badge
                      texto={dispositivo.tem_chave ? 'Configurada' : 'Sem chave'}
                      tom={dispositivo.tem_chave ? 'sucesso' : 'alerta'}
                    />
                  </td>
                  {podeGerenciarCartoesDispositivos && (
                    <>
                      <td data-rotulo="Mudar status">
                        <select
                          value={dispositivo.status}
                          onChange={(e) => mudarStatus(dispositivo, e.target.value)}
                          className="sg-select"
                          style={{ minWidth: '130px' }}
                        >
                          {STATUS_OPCOES.map((status) => (
                            <option key={status} value={status}>
                              {ROTULO_STATUS[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="sg-td-actions">
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          title={dispositivo.tem_chave ? 'Gerar nova chave' : 'Gerar chave'}
                          onClick={() => setDispositivoChave(dispositivo)}
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          className="sg-btn sg-btn-ghost sg-btn-icon"
                          style={{ color: 'var(--sg-danger)' }}
                          title="Excluir dispositivo"
                          onClick={() => setDispositivoExclusao(dispositivo)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {dispositivos.length === 0 && (
                <tr>
                  <td colSpan={podeGerenciarCartoesDispositivos ? 7 : 5} style={{ padding: 0 }}>
                    <EstadoVazio 
                      icone="erro" 
                      titulo="Nenhum dispositivo cadastrado" 
                      descricao="Nao ha catracas ou leitores registrados no sistema." 
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={totalRegistros}
            aoMudar={carregarDispositivos}
          />
        </div>
      ) : null}

      {modalAberto && (
        <Modal titulo="Novo dispositivo" aoFechar={() => setModalAberto(false)} largura="500px">
          <FormularioDispositivo aoSalvar={aoCadastrar} />
        </Modal>
      )}

      <ModalConfirmacao
        aberto={!!dispositivoExclusao}
        titulo="Excluir dispositivo"
        mensagem={`Tem certeza que deseja excluir o dispositivo "${dispositivoExclusao?.descricao}"?`}
        textoConfirmar="Sim, excluir"
        variante="danger"
        carregando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setDispositivoExclusao(null)}
      />

      <ModalConfirmacao
        aberto={!!dispositivoChave}
        titulo={dispositivoChave?.tem_chave ? 'Gerar nova chave' : 'Gerar chave'}
        mensagem={
          dispositivoChave?.tem_chave
            ? `O dispositivo "${dispositivoChave?.descricao}" ja tem uma chave. Ao gerar uma nova, a antiga para de funcionar imediatamente e o ESP32 precisara ser reconfigurado. Continuar?`
            : `Gerar a chave de acesso do dispositivo "${dispositivoChave?.descricao}"? Ela sera usada no codigo do ESP32.`
        }
        textoConfirmar="Gerar chave"
        variante={dispositivoChave?.tem_chave ? 'danger' : 'primary'}
        carregando={gerandoChave}
        aoConfirmar={confirmarGerarChave}
        aoCancelar={() => setDispositivoChave(null)}
      />

      {chaveGerada && (
        <Modal titulo="Chave do dispositivo" aoFechar={() => setChaveGerada(null)} largura="560px">
          <ChaveGerada
            dispositivo={chaveGerada.dispositivo}
            chave={chaveGerada.chave}
            aoFechar={() => setChaveGerada(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// Mostra a chave recem-gerada UMA vez, com o que precisa ir no
// config.h do ESP32. Depois que o modal fecha, a chave nao pode
// mais ser vista (o banco guarda so o hash dela).
function ChaveGerada({ dispositivo, chave, aoFechar }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // A area de transferencia so funciona em https ou localhost.
      // Fora disso, a pessoa seleciona e copia manualmente.
      document.getElementById('campo-chave')?.select();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-4)' }}>
      <div className="sg-alert sg-alert--warning" role="alert">
        <span>
          <strong>Copie a chave agora.</strong> Ela nao sera mostrada novamente.
          Se perder, gere uma nova (a antiga deixa de funcionar).
        </span>
      </div>

      <label className="sg-label">
        Chave de "{dispositivo.descricao}"
        <div style={{ display: 'flex', gap: 'var(--sg-space-2)' }}>
          <input
            id="campo-chave"
            type="text"
            readOnly
            value={chave}
            onFocus={(e) => e.target.select()}
            className="sg-input sg-mono"
            style={{ flex: 1, fontSize: '0.8rem' }}
          />
          <button type="button" className="sg-btn sg-btn-secondary" onClick={copiar}>
            {copiado ? <Check size={15} /> : <Copy size={15} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </label>

      <div>
        <p style={{ margin: '0 0 var(--sg-space-2)', color: 'var(--sg-text-2)' }}>
          No arquivo <code>config.h</code> do firmware, preencha:
        </p>
        <pre className="sg-mono" style={{ margin: 0, padding: 'var(--sg-space-3)', background: 'var(--sg-surface-2)', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem' }}>
{`#define ID_DISPOSITIVO     ${dispositivo.id_dispositivo}
#define CHAVE_DISPOSITIVO  "${chave}"`}
        </pre>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="sg-btn sg-btn-primary" onClick={aoFechar}>
          Ja copiei, fechar
        </button>
      </div>
    </div>
  );
}

function FormularioDispositivo({ aoSalvar }) {
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [ipLocal, setIpLocal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const dispositivo = await api.post('/dispositivos', {
        descricao,
        localizacao: localizacao || null,
        ip_local: ipLocal || null,
        status: 'offline',
      });
      aoSalvar(dispositivo);
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sg-space-3)' }}>
        <label className="sg-label sg-label-required">
          Descricao
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Catraca Entrada Principal"
            required
            className="sg-input"
            autoFocus
          />
        </label>

        <label className="sg-label">
          Localizacao
          <input
            type="text"
            value={localizacao}
            onChange={(e) => setLocalizacao(e.target.value)}
            placeholder="Ex.: Portaria"
            className="sg-input"
          />
        </label>

        <label className="sg-label">
          IP local (opcional)
          <input
            type="text"
            value={ipLocal}
            onChange={(e) => setIpLocal(e.target.value)}
            placeholder="Ex.: 192.168.0.50"
            className="sg-input sg-mono"
          />
        </label>
      </div>

      <div className="sg-alert sg-alert--info">
        <span>
          Todo dispositivo novo entra como <strong>offline</strong>. 
          Mude o status na tabela depois de confirmar que ele esta respondendo.
        </span>
      </div>

      {erro && (
        <div className="sg-alert sg-alert--error" role="alert">
          <span>{erro}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sg-space-2)' }}>
        <button type="submit" disabled={salvando} className="sg-btn sg-btn-primary">
          {salvando ? (
            <><Spinner tamanho="sm" /> Cadastrando...</>
          ) : (
            'Cadastrar dispositivo'
          )}
        </button>
      </div>
    </form>
  );
}