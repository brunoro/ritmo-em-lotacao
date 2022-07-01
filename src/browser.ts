import * as L from 'leaflet';
import 'leaflet-providers';

import { drawHexBins, drawDiffs } from 'src/graphics';
import { hexBins, allFrameHexIDs } from 'src/hexBins';
import { sleep } from 'src/sleep';
import frames from 'src/snapshots.json';

let map = null;

// layers
const hexLayers: HexLayer = L.featureGroup();
const diffLabels: DiffLabelLayer = L.featureGroup();
const diffVectors: DiffVectorLayer = L.featureGroup();

const toggleDiffVector = () => {
  document.getElementById('showDiffVector').checked
    ? diffVectors.addTo(map)
    : diffVectors.removeFrom(map);
};

const toggleDiffLabel = () => {
  document.getElementById('showDiffLabel').checked
    ? diffLabels.addTo(map)
    : diffLabels.removeFrom(map);
};

const draw = () => {
  const t = document.getElementById('frameSelector').valueAsNumber;

  // frames start at 1, as we need the previous frame to calculate the diff
  if (t < 1 || t > frames.length) {
    console.log(`can't draw frame ${t}, got `);
    return;
  }

  const resolution = document.getElementById('hexResolution').valueAsNumber;
  const bins = [
    hexBins(frames[t - 1], resolution),
    hexBins(frames[t], resolution),
  ];
  hexLayers.clearLayers();
  bins.map((bin) => hexLayers.addLayer(drawHexBins(bin)));

  const ids = allFrameHexIDs(bins);
  const { labels, vectors } = drawDiffs(bins, ids);

  diffLabels.clearLayers();
  labels.map((layer) => diffLabels.addLayer(layer));
  diffVectors.clearLayers();
  vectors.map((layer) => diffVectors.addLayer(layer));
};

const initMap = () => {
  const initialCenter = [-19.926752, -43.939384];
  const minZoom = 10;
  const maxZoom = 15;
  const initialZoom = 14;
  map = L.map('map', {
    center: new L.LatLng(initialCenter[0], initialCenter[1]),
    zoom: initialZoom,
    minZoom,
    maxZoom,
  });
  L.tileLayer.provider('Stamen.TonerBackground').addTo(map);

  hexLayers.addTo(map);

  if (document.getElementById('showDiffVector').checked) {
    diffVectors.addTo(map);
  }

  if (document.getElementById('showDiffLabel').checked) {
    diffLabels.addTo(map);
  }
};

const setFrameSelectorRange = () => {
  const input = document.getElementById('frameSelector');
  input.setAttribute('max', frames.length - 1);
  input.setAttribute('min', 1);
  input.setAttribute('value', 1);
};

const play = async () => {
  const input = document.getElementById('frameSelector');
  for (let i = 1; i < frames.length; i++) {
    input.setAttribute('value', i);
    draw();
    await sleep(1000);
  }
};

(window as any).toggleDiffVector = toggleDiffVector;
(window as any).toggleDiffLabel = toggleDiffLabel;
(window as any).draw = draw;
(window as any).play = play;

document.addEventListener('DOMContentLoaded', (_) => {
  initMap();
  setFrameSelectorRange();
  draw();
});
