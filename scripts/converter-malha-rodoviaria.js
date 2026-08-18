// Converte o KML da malha rodoviária estadual (DER/PR) para GeoJSON, mantendo
// só os campos usados pelo Mapa Operacional. Rodar uma vez (ou quando o DER
// atualizar a malha): node scripts/converter-malha-rodoviaria.js <caminho.kml>
const fs = require('fs');
const path = require('path');

const origem = process.argv[2];
if (!origem) {
  console.error('Uso: node scripts/converter-malha-rodoviaria.js <caminho-do-kml>');
  process.exit(1);
}

// Fica em frontend/public: o mapa carrega direto (asset estático do build) e o
// backend lê o mesmo arquivo (src/lib/malha.js) para localizar rodovia+km —
// uma única fonte, sem duplicar os ~8 MB do arquivo.
const destino = path.join(__dirname, '..', 'frontend', 'public', 'malha-rodoviaria.json');

function campo(bloco, nome) {
  const m = bloco.match(new RegExp(`<SimpleData name="${nome}">([^<]*)</SimpleData>`));
  return m ? m[1] : null;
}

function numOuNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const xml = fs.readFileSync(origem, 'utf8');
const placemarks = xml.split('<Placemark>').slice(1);

const features = [];
let semCoordenadas = 0;

for (const bloco of placemarks) {
  const nome = (bloco.match(/<name>([^<]*)<\/name>/) || [])[1] || null;
  const rodovia = numOuNull(campo(bloco, 'Rod_Num'));
  const kmInicial = numOuNull(campo(bloco, 'Km_Inicial'));
  const kmFinal = numOuNull(campo(bloco, 'Km_Final'));

  // Uma feature pode ter várias <LineString> dentro de <MultiGeometry> — junta todas.
  const linhas = [...bloco.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/g)];
  if (linhas.length === 0 || rodovia == null || kmInicial == null || kmFinal == null) {
    semCoordenadas++;
    continue;
  }

  for (const [, bruto] of linhas) {
    const coords = bruto.trim().split(/\s+/).map((par) => {
      const [lng, lat] = par.split(',').map(Number);
      return [Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6];
    }).filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

    if (coords.length < 2) continue;

    features.push({
      type: 'Feature',
      properties: {
        nome,
        rodovia,
        de: campo(bloco, 'De'),
        para: campo(bloco, 'Para'),
        kmInicial,
        kmFinal,
        situacao: campo(bloco, 'Situacao'),
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
}

const geojson = { type: 'FeatureCollection', features };

fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(geojson));

const tamanhoMb = (fs.statSync(destino).size / 1024 / 1024).toFixed(2);
console.log(`Segmentos convertidos: ${features.length}`);
console.log(`Ignorados (sem coordenadas/km): ${semCoordenadas}`);
console.log(`Arquivo gerado: ${destino} (${tamanhoMb} MB)`);
