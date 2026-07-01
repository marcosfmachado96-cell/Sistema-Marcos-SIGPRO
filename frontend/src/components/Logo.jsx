// Brasão DER/PR — rodovia estilizada em perspectiva, em âmbar.
export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="#12161c" stroke="#2a3038" strokeWidth="1" />
      {/* pista em perspectiva */}
      <path d="M17 40 L21 10 L27 10 L31 40 Z" fill="#e6a52c" />
      {/* faixa central tracejada (recortes escuros) */}
      <rect x="23" y="14" width="2" height="4" rx="1" fill="#12161c" />
      <rect x="23" y="22" width="2" height="4.5" rx="1" fill="#12161c" />
      <rect x="22.5" y="31" width="3" height="5" rx="1.2" fill="#12161c" />
    </svg>
  );
}

// Logo completo: brasão + nome. `variante` controla a cor do texto.
export function Logo({ size = 40, variante = 'claro', subtitulo = 'Supervisão · CO 036/2022 DOP' }) {
  const corTitulo = variante === 'escuro' ? '#f4f6f8' : 'var(--texto)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <LogoMark size={size} />
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontWeight: 700, fontSize: size * 0.5, letterSpacing: '0.02em', color: corTitulo }}>DER/PR</div>
        {subtitulo && (
          <div style={{ fontWeight: 600, fontSize: size * 0.24, letterSpacing: '0.06em', color: '#e6a52c', textTransform: 'uppercase' }}>
            {subtitulo}
          </div>
        )}
      </div>
    </div>
  );
}
