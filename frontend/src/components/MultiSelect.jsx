import { useEffect, useRef, useState } from 'react';

// Dropdown de seleção múltipla por checkboxes. `opcoes` é [{ valor, rotulo }];
// `selecionados` é um array de valores (vazio = "Todos"); `onChange` recebe o
// novo array. Fecha ao clicar fora.
export function MultiSelect({ opcoes, selecionados, onChange, placeholder = 'Todos' }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  function alternar(valor) {
    if (selecionados.includes(valor)) onChange(selecionados.filter((v) => v !== valor));
    else onChange([...selecionados, valor]);
  }

  const rotulo = selecionados.length === 0
    ? placeholder
    : selecionados.length === 1
      ? (opcoes.find((o) => o.valor === selecionados[0])?.rotulo || selecionados[0])
      : `${selecionados.length} selecionados`;

  return (
    <div className="multiselect" ref={ref}>
      <button type="button" className="input multiselect-botao" onClick={() => setAberto((a) => !a)}>
        <span>{rotulo}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {aberto && (
        <div className="multiselect-painel">
          {selecionados.length > 0 && (
            <button type="button" className="multiselect-limpar" onClick={() => onChange([])}>Limpar seleção</button>
          )}
          {opcoes.map((o) => (
            <label key={o.valor} className="multiselect-item">
              <input type="checkbox" checked={selecionados.includes(o.valor)} onChange={() => alternar(o.valor)} />
              {o.rotulo}
            </label>
          ))}
          {opcoes.length === 0 && <div className="multiselect-vazio">Nenhuma opção disponível.</div>}
        </div>
      )}
    </div>
  );
}
