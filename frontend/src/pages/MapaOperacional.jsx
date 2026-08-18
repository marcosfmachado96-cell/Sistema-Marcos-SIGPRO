import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';

const ROTULO_EVENTO = {
  MOBILIZACAO: 'Mobilizado', DESMOBILIZACAO: 'Desmobilizado', OCORRENCIA: 'Ocorrência',
  PARALISACAO: 'Paralisado', RETOMADA: 'Em execução', ANDAMENTO: 'Em execução',
};
const COR_EVENTO = {
  MOBILIZACAO: '#2e6da4', DESMOBILIZACAO: '#5b6472', OCORRENCIA: '#b9821f',
  PARALISACAO: '#b4452f', RETOMADA: '#2e7d5b', ANDAMENTO: '#2e7d5b',
};
const COR_PADRAO = '#5b6472'; // sem eventos ainda ("Cadastrada")

function statusNota(nota) {
  const ultimo = (nota.eventos || [])[0];
  if (!ultimo) return { rotulo: 'Cadastrada', cor: COR_PADRAO };
  return { rotulo: ROTULO_EVENTO[ultimo.tipo] || ultimo.tipo, cor: COR_EVENTO[ultimo.tipo] || COR_PADRAO };
}

function marcador(cor) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function MapaOperacional() {
  const navigate = useNavigate();
  const mapaRef = useRef(null);
  const containerRef = useRef(null);
  const [notas, setNotas] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.listarNotasServico().then(setNotas).catch((e) => setErro(e.message));
  }, []);

  // Inicializa o mapa uma única vez.
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
        L.geoJSON(geojson, {
          style: { color: '#e2571e', weight: 3, opacity: 0.85 },
          onEachFeature: (f, layer) => {
            const p = f.properties;
            layer.bindPopup(`<b>PR-${p.rodovia}</b><br>${p.de || ''} — ${p.para || ''}<br>km ${p.kmInicial} a ${p.kmFinal}`);
            layer.on('mouseover', () => layer.setStyle({ weight: 5, color: '#ffb020' }));
            layer.on('mouseout', () => layer.setStyle({ weight: 3, color: '#e2571e' }));
          },
        }).addTo(mapa);
      })
      .catch(() => { /* malha é só um pano de fundo; segue sem ela se falhar */ });

    return () => { mapa.remove(); mapaRef.current = null; };
  }, []);

  // Marcadores das notas de serviço — recria quando a lista muda.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !notas) return;
    const camada = L.layerGroup().addTo(mapa);
    for (const nota of notas) {
      const { rotulo, cor } = statusNota(nota);
      const marker = L.marker([nota.latitude, nota.longitude], { icon: marcador(cor) }).addTo(camada);
      marker.bindPopup(
        `<b>${nota.numero}</b> — PR-${nota.rodovia} (km ${nota.kmInicial})<br>` +
        `${nota.contrato}<br>${nota.descricao}<br>` +
        `<span style="color:${cor}">● ${rotulo}</span><br>` +
        `<a href="#" data-id="${nota.id}">Ver detalhes</a>`
      );
      marker.on('popupopen', () => {
        const link = document.querySelector(`a[data-id="${nota.id}"]`);
        if (link) link.onclick = (ev) => { ev.preventDefault(); navigate(`/mapa-operacional/${nota.id}`); };
      });
    }
    return () => { mapa.removeLayer(camada); };
  }, [notas, navigate]);

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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div ref={containerRef} style={{ height: '560px', width: '100%' }} />
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
