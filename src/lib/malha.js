// Malha rodoviária estadual (DER/PR) — localiza um ponto (lat/lng) a partir de
// rodovia + km, usando os segmentos convertidos do KML oficial (ver
// scripts/converter-malha-rodoviaria.js). Carregado uma vez em memória: é
// referência estática (~2.300 segmentos), sem necessidade de banco geoespacial.
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, '..', '..', 'frontend', 'public', 'malha-rodoviaria.json');

let indice = null; // Map<rodovia, feature[]>

function carregar() {
  if (indice) return indice;
  indice = new Map();
  if (!fs.existsSync(ARQUIVO)) return indice; // dev sem o arquivo: funções abaixo tratam ausência
  const geojson = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  for (const f of geojson.features) {
    const rod = f.properties.rodovia;
    if (!indice.has(rod)) indice.set(rod, []);
    indice.get(rod).push(f);
  }
  return indice;
}

function distanciaMetros([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Ponto a uma fração [0,1] do comprimento total da linha.
function pontoNaFracao(coords, fracao) {
  fracao = Math.min(1, Math.max(0, fracao));
  const distancias = [0];
  for (let i = 1; i < coords.length; i++) {
    distancias.push(distancias[i - 1] + distanciaMetros(coords[i - 1], coords[i]));
  }
  const alvo = fracao * distancias[distancias.length - 1];
  let i = 1;
  while (i < distancias.length && distancias[i] < alvo) i++;
  if (i >= coords.length) i = coords.length - 1;
  const [lng1, lat1] = coords[i - 1];
  const [lng2, lat2] = coords[i];
  const segAlvo = alvo - distancias[i - 1];
  const segTotal = distancias[i] - distancias[i - 1];
  const t = segTotal > 0 ? segAlvo / segTotal : 0;
  return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
}

// Lista as rodovias disponíveis (para o formulário).
function listarRodovias() {
  return [...carregar().keys()].sort((a, b) => a - b);
}

// Localiza o ponto (lat/lng) para rodovia + km. Retorna null se a rodovia não
// existir na malha ou se o km estiver fora de todos os trechos cadastrados.
function localizarPonto(rodovia, km) {
  const segmentos = carregar().get(Number(rodovia)) || [];
  const candidato = segmentos.find((f) => {
    const { kmInicial, kmFinal } = f.properties;
    const min = Math.min(kmInicial, kmFinal);
    const max = Math.max(kmInicial, kmFinal);
    return km >= min - 0.01 && km <= max + 0.01;
  });
  if (!candidato) return null;

  const { kmInicial, kmFinal } = candidato.properties;
  const fracao = kmFinal === kmInicial ? 0 : (km - kmInicial) / (kmFinal - kmInicial);
  const ponto = pontoNaFracao(candidato.geometry.coordinates, fracao);
  return { ...ponto, segmento: candidato.properties.nome };
}

module.exports = { listarRodovias, localizarPonto };
