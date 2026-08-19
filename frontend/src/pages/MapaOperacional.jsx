import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';
import { fmtRodovia } from '../util';
import { useAuth } from '../auth';

const ROTULO_EVENTO = {
  MOBILIZACAO: 'Mobilizado', DESMOBILIZACAO: 'Desmobilizado', OCORRENCIA: 'Ocorrência',
  PARALISACAO: 'Paralisado', RETOMADA: 'Em execução', ANDAMENTO: 'Em execução', CONCLUIDA: 'Concluída',
};
const COR_EVENTO = {
  MOBILIZACAO: '#2e6da4', DESMOBILIZACAO: '#5b6472', OCORRENCIA: '#b9821f',
  PARALISACAO: '#b4452f', RETOMADA: '#2e7d5b', ANDAMENTO: '#2e7d5b', CONCLUIDA: '#161a20',
};
const BADGE_EVENTO = {
  MOBILIZACAO: 'badge-azul', DESMOBILIZACAO: 'badge-grafite', OCORRENCIA: 'badge-ambar',
  PARALISACAO: 'badge-vermelho', RETOMADA: 'badge-verde', ANDAMENTO: 'badge-verde', CONCLUIDA: 'badge-grafite',
};
const COR_PADRAO = '#5b6472'; // sem eventos ainda ("Cadastrada")

function statusNota(nota) {
  const ultimo = (nota.eventos || [])[0];
  if (!ultimo) return { rotulo: 'Cadastrada', cor: COR_PADRAO, badge: 'badge-grafite' };
  return {
    rotulo: ROTULO_EVENTO[ultimo.tipo] || ultimo.tipo,
    cor: COR_EVENTO[ultimo.tipo] || COR_PADRAO,
    badge: BADGE_EVENTO[ultimo.tipo] || 'badge-grafite',
  };
}

// ---- Geometria: extrai o trecho [kmA, kmB] de uma rodovia a partir da malha ----

function distanciaMetros([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function distanciasAcumuladas(coords) {
  const d = [0];
  for (let i = 1; i < coords.length; i++) d.push(d[i - 1] + distanciaMetros(coords[i - 1], coords[i]));
  return d;
}

function pontoNaDistancia(coords, distancias, alvo) {
  let i = 1;
  while (i < distancias.length && distancias[i] < alvo) i++;
  if (i >= coords.length) i = coords.length - 1;
  const [lng1, lat1] = coords[i - 1];
  const [lng2, lat2] = coords[i];
  const segAlvo = alvo - distancias[i - 1];
  const segTotal = distancias[i] - distancias[i - 1];
  const t = segTotal > 0 ? segAlvo / segTotal : 0;
  return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]; // [lat, lng] p/ Leaflet
}

// Retorna uma ou mais polylines [ [lat,lng], ... ] cobrindo o trecho [kmA, kmB]
// da rodovia, montadas a partir dos segmentos da malha que se sobrepõem a ele.
function trechoRodovia(malhaPorRodovia, rodovia, kmA, kmB) {
  const kmMin = Math.min(kmA, kmB);
  const kmMax = Math.max(kmA, kmB);
  const segmentos = malhaPorRodovia.get(Number(rodovia)) || [];
  const partes = [];
  for (const feat of segmentos) {
    const { kmInicial, kmFinal } = feat.properties;
    const segMin = Math.min(kmInicial, kmFinal);
    const segMax = Math.max(kmInicial, kmFinal);
    const ovMin = Math.max(kmMin, segMin);
    const ovMax = Math.min(kmMax, segMax);
    if (ovMin > ovMax + 0.01) continue; // sem sobreposição

    const coords = feat.geometry.coordinates;
    const distancias = distanciasAcumuladas(coords);
    const total = distancias[distancias.length - 1];
    const frac = (km) => (kmFinal === kmInicial ? 0 : (km - kmInicial) / (kmFinal - kmInicial));
    let f0 = frac(ovMin);
    let f1 = frac(ovMax);
    if (f0 > f1) [f0, f1] = [f1, f0];
    f0 = Math.min(1, Math.max(0, f0));
    f1 = Math.min(1, Math.max(0, f1));
    const d0 = f0 * total;
    const d1 = f1 * total;
    const pInicio = pontoNaDistancia(coords, distancias, d0);
    const pFim = pontoNaDistancia(coords, distancias, d1);
    const meio = coords
      .map(([lng, lat], i) => ({ pt: [lat, lng], d: distancias[i] }))
      .filter(({ d }) => d > d0 && d < d1)
      .map(({ pt }) => pt);
    partes.push([pInicio, ...meio, pFim]);
  }
  return partes;
}

function popupNota(nota, rotulo, cor) {
  const km = nota.kmFinal != nota.kmInicial ? `${nota.kmInicial} a ${nota.kmFinal}` : `${nota.kmInicial}`;
  return (
    `<b>${nota.numero}</b> — ${fmtRodovia(nota.rodovia)} (km ${km})<br>` +
    `${nota.contrato}<br>${nota.descricao}<br>` +
    `<span style="color:${cor}">● ${rotulo}</span><br>` +
    `<a href="#" data-id="${nota.id}">Ver detalhes</a>`
  );
}

export function MapaOperacional() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const mapaRef = useRef(null);
  const containerRef = useRef(null);
  const malhaRef = useRef(new Map());
  const layersPorNotaRef = useRef(new Map());
  const destacarIdRef = useRef(location.state?.destacarId || null);
  const [malhaPronta, setMalhaPronta] = useState(false);
  const [notas, setNotas] = useState(null);
  const [erro, setErro] = useState('');

  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroRodovia, setFiltroRodovia] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    api.listarNotasServico().then(setNotas).catch((e) => setErro(e.message));
  }, []);

  const contratos = useMemo(
    () => [...new Set((notas || []).map((n) => n.contrato))].sort(),
    [notas],
  );
  const rodovias = useMemo(
    () => [...new Set((notas || []).map((n) => n.rodovia))].sort((a, b) => a - b),
    [notas],
  );
  const statusDisponiveis = useMemo(() => {
    const vistos = new Map();
    for (const n of notas || []) {
      const s = statusNota(n);
      if (!vistos.has(s.rotulo)) vistos.set(s.rotulo, s);
    }
    return [...vistos.values()];
  }, [notas]);

  const notasFiltradas = useMemo(() => {
    return (notas || []).filter((n) => {
      if (filtroContrato && n.contrato !== filtroContrato) return false;
      if (filtroRodovia && String(n.rodovia) !== filtroRodovia) return false;
      if (filtroStatus && statusNota(n).rotulo !== filtroStatus) return false;
      return true;
    });
  }, [notas, filtroContrato, filtroRodovia, filtroStatus]);

  // Inicializa o mapa e a camada de fundo da malha rodoviária — uma única vez.
  useEffect(() => {
    if (mapaRef.current || !containerRef.current) return;
    const mapa = L.map(containerRef.current).setView([-24.7, -51.5], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapa);
    mapaRef.current = mapa;

    fetch('/malha-rodoviaria.json')
      .then((r) => r.json())
      .then((geojson) => {
        const indice = new Map();
        for (const f of geojson.features) {
          const rod = f.properties.rodovia;
          if (!indice.has(rod)) indice.set(rod, []);
          indice.get(rod).push(f);
        }
        malhaRef.current = indice;
        setMalhaPronta(true);

        L.geoJSON(geojson, {
          style: { color: '#9aa3af', weight: 1.5, opacity: 0.55 },
          onEachFeature: (f, layer) => {
            const p = f.properties;
            layer.bindPopup(`<b>${fmtRodovia(p.rodovia)}</b><br>${p.de || ''} — ${p.para || ''}<br>km ${p.kmInicial} a ${p.kmFinal}`);
          },
        }).addTo(mapa);
      })
      .catch(() => { /* malha é só um pano de fundo; segue sem ela se falhar */ });

    return () => { mapa.remove(); mapaRef.current = null; };
  }, []);

  // Trechos destacados das notas de serviço (linha, não ponto) — recria quando
  // a lista filtrada muda ou a malha termina de carregar.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !malhaPronta) return;
    const camada = L.layerGroup().addTo(mapa);
    const layersPorNota = new Map();
    for (const nota of notasFiltradas) {
      const { rotulo, cor } = statusNota(nota);
      const kmA = Number(nota.kmInicial);
      const kmB = Number(nota.kmFinal);
      const popup = popupNota(nota, rotulo, cor);

      let layers;
      if (kmA === kmB) {
        layers = [L.circleMarker([nota.latitude, nota.longitude], {
          radius: 8, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1,
        })];
      } else {
        const partes = trechoRodovia(malhaRef.current, nota.rodovia, kmA, kmB);
        layers = partes.length > 0
          ? partes.map((pts) => L.polyline(pts, { color: cor, weight: 6, opacity: 0.95, lineCap: 'round' }))
          : [L.circleMarker([nota.latitude, nota.longitude], {
              radius: 8, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1,
            })];
      }

      const grupo = L.featureGroup(layers).addTo(camada);
      grupo.bindPopup(popup);
      grupo.on('popupopen', () => {
        const link = document.querySelector(`a[data-id="${nota.id}"]`);
        if (link) link.onclick = (ev) => { ev.preventDefault(); navigate(`/mapa-operacional/${nota.id}`); };
      });
      layersPorNota.set(nota.id, { grupo, centro: grupo.getBounds().getCenter() });
    }
    layersPorNotaRef.current = layersPorNota;

    // Nota recém-cadastrada (veio da tela de criação): centraliza e abre o popup uma única vez.
    if (destacarIdRef.current && layersPorNota.has(destacarIdRef.current)) {
      const { grupo, centro } = layersPorNota.get(destacarIdRef.current);
      mapa.setView(centro, Math.max(mapa.getZoom(), 13));
      grupo.openPopup();
      destacarIdRef.current = null;
    }

    return () => { mapa.removeLayer(camada); };
  }, [notasFiltradas, malhaPronta, navigate]);

  // Foca uma nota já renderizada no mapa (usado pela tabela) — centraliza,
  // abre o popup com a rodovia/km e rola a tela até o mapa.
  function focarNota(id) {
    const item = layersPorNotaRef.current.get(id);
    const mapa = mapaRef.current;
    if (!item || !mapa) return;
    mapa.setView(item.centro, Math.max(mapa.getZoom(), 13));
    item.grupo.openPopup();
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <div className="eyebrow">Acompanhamento em campo</div>
          <h1>Mapa Operacional</h1>
          <div className="descricao">Notas de serviço por rodovia e km — mobilização, ocorrências, paralisações e andamento.</div>
        </div>
        <button className="btn btn-primario" onClick={() => navigate('/mapa-operacional/novo')}>
          Nova nota de serviço
        </button>
      </div>

      {erro && <div className="alerta alerta-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      <div className="card mapa-card">
        <div ref={containerRef} style={{ height: '560px', width: '100%' }} />
      </div>

      <div className="card card-pad mapa-lista">
        <h3>Notas de serviço {notas ? `(${notasFiltradas.length})` : ''}</h3>

        <div className="mapa-filtros">
          <div className="campo">
            <label>Contrato</label>
            <select className="input" value={filtroContrato} onChange={(e) => setFiltroContrato(e.target.value)}>
              <option value="">Todos</option>
              {contratos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Rodovia</label>
            <select className="input" value={filtroRodovia} onChange={(e) => setFiltroRodovia(e.target.value)}>
              <option value="">Todas</option>
              {rodovias.map((r) => <option key={r} value={r}>{fmtRodovia(r)}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Status</label>
            <select className="input" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              {statusDisponiveis.map((s) => <option key={s.rotulo} value={s.rotulo}>{s.rotulo}</option>)}
            </select>
          </div>
        </div>

        <div className="mapa-lista-tabela">
          {!notas && <div className="carregando">Carregando…</div>}
          {notas && notasFiltradas.length === 0 && (
            <p className="descricao">Nenhuma nota encontrada{notas.length > 0 ? ' com os filtros atuais' : ''}.</p>
          )}
          {notasFiltradas.length > 0 && (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Contrato</th>
                  <th>Rodovia/km</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notasFiltradas.map((n) => {
                  const s = statusNota(n);
                  const ehAutor = usuario && n.autorId === usuario.id;
                  return (
                    <tr key={n.id} onClick={() => focarNota(n.id)}>
                      <td>{n.numero}</td>
                      <td>{n.contrato}</td>
                      <td>{fmtRodovia(n.rodovia)} · km {n.kmInicial}{n.kmFinal != n.kmInicial ? `–${n.kmFinal}` : ''}</td>
                      <td><span className={`badge ${s.badge}`}>{s.rotulo}</span></td>
                      <td className="col-acoes">
                        {ehAutor && (
                          <button
                            className="btn btn-secundario btn-sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/mapa-operacional/${n.id}`); }}
                          >
                            Registrar evento
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {notas && notas.length === 0 && (
        <div className="card card-pad vazio" style={{ marginTop: 16 }}>
          <div className="vazio-titulo">Nenhuma nota de serviço cadastrada ainda</div>
          <p>Cadastre a primeira para começar a acompanhar no mapa.</p>
        </div>
      )}
    </>
  );
}
