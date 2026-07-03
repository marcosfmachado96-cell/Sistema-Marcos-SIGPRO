import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ehPlanilha } from '../util';

export function NovoRelatorio() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    numMedicao: '', contrato: '', objeto: '',
    periodoInicio: '', periodoFim: '', valor: '',
  });
  const [arquivos, setArquivos] = useState([]);
  const [descricoes, setDescricoes] = useState({}); // { [indice]: texto }
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function selecionarArquivos(lista) {
    setArquivos(lista);
    setDescricoes({});
  }

  async function aoSalvar(e) {
    e.preventDefault();
    setErro('');
    const semDescricao = arquivos.findIndex((a, i) => ehPlanilha(a) && !(descricoes[i] || '').trim());
    if (semDescricao !== -1) {
      setErro(`Descreva o conteúdo da planilha "${arquivos[semDescricao].name}" antes de enviar.`);
      return;
    }
    setEnviando(true);
    try {
      const r = await api.criarRelatorio({
        ...form,
        valor: Number(form.valor),
      });
      if (arquivos.length > 0) {
        // anexos de medição são incluídos logo após a criação
        await api.anexarMedicao(r.id, arquivos, arquivos.map((_, i) => descricoes[i] || ''));
      }
      navigate(`/relatorios/${r.id}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Cadastro de medição</div>
          <h1>Novo relatório</h1>
          <div className="descricao">Ao enviar, o relatório segue automaticamente para análise do coordenador.</div>
        </div>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      <form onSubmit={aoSalvar}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 16 }}>Identificação</h3>
          <div className="grade-2">
            <div className="campo">
              <label>Nº da medição</label>
              <input className="input" value={form.numMedicao} onChange={(e) => set('numMedicao', e.target.value)} required />
            </div>
            <div className="campo">
              <label>Contrato</label>
              <input className="input" value={form.contrato} onChange={(e) => set('contrato', e.target.value)}
                placeholder="CO 036/2022 DOP" required />
            </div>
          </div>
          <div className="campo">
            <label>Objeto</label>
            <input className="input" value={form.objeto} onChange={(e) => set('objeto', e.target.value)}
              placeholder="Ex.: supervisão e fiscalização do trecho…" required />
          </div>
          <div className="grade-2">
            <div className="campo">
              <label>Início do período</label>
              <input className="input" type="date" value={form.periodoInicio} onChange={(e) => set('periodoInicio', e.target.value)} required />
            </div>
            <div className="campo">
              <label>Fim do período</label>
              <input className="input" type="date" value={form.periodoFim} onChange={(e) => set('periodoFim', e.target.value)} required />
            </div>
          </div>
          <div className="campo" style={{ maxWidth: 260 }}>
            <label>Valor da medição (R$)</label>
            <input className="input mono" type="number" step="0.01" min="0"
              value={form.valor} onChange={(e) => set('valor', e.target.value)} required />
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginBottom: 6 }}>Anexos da medição</h3>
          <p className="descricao" style={{ marginBottom: 12 }}>PDF ou planilhas (xlsx, xls, csv).</p>
          <div className="dropzone">
            Selecione os arquivos da medição
            <input type="file" multiple accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => selecionarArquivos(Array.from(e.target.files))} />
          </div>
          {arquivos.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {arquivos.map((a, i) => (
                <div key={i} className="campo" style={{ marginBottom: 8 }}>
                  <label className="mono" style={{ fontSize: 13 }}>{a.name}</label>
                  {ehPlanilha(a) && (
                    <input className="input" placeholder='Sobre o que é essa planilha? Ex.: "Resumo Controle Tecnológico Supervisão"'
                      value={descricoes[i] || ''} onChange={(e) => setDescricoes((d) => ({ ...d, [i]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="row row-fim" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secundario" onClick={() => navigate('/relatorios')}>Cancelar</button>
          <button className="btn btn-primario" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar para análise'}
          </button>
        </div>
      </form>
    </>
  );
}
