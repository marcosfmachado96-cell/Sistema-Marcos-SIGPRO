// Campo de contrato — o padrão "CO XXX/20XX DOP" é fixo (numeração DER/PR);
// o usuário só edita a parte "XXX/20XX", com a barra inserida automaticamente
// conforme digita. O valor exposto via onChange já é a string completa.

function formatarMeio(v) {
  const digitos = String(v || '').replace(/\D/g, '').slice(0, 7); // 3 dígitos do nº + 4 do ano
  if (digitos.length <= 3) return digitos;
  return `${digitos.slice(0, 3)}/${digitos.slice(3)}`;
}

function extrairMeio(contratoCompleto) {
  return String(contratoCompleto || '').replace(/^\s*CO\s*/i, '').replace(/\s*DOP\s*$/i, '').trim();
}

export function CampoContrato({ value, onChange, required }) {
  const meio = extrairMeio(value);

  function aoAlterar(e) {
    const novoMeio = formatarMeio(e.target.value);
    onChange(novoMeio ? `CO ${novoMeio} DOP` : '');
  }

  return (
    <div className="campo-contrato">
      <span className="cc-fixo">CO</span>
      <input
        className="input cc-meio"
        value={meio}
        onChange={aoAlterar}
        placeholder="036/2026"
        inputMode="numeric"
        required={required}
      />
      <span className="cc-fixo">DOP</span>
    </div>
  );
}
