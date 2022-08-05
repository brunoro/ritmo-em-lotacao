import "./leaflet.css";
import * as R from "ramda";
import * as L from "leaflet";
import * as h3 from "h3-js";
import "leaflet-providers";

import {
  HexBinLayer,
  LabelLayer,
  VectorLayer,
  drawHexBins,
  drawVector,
  drawLabel,
} from "./graphics";
import {
  HexID,
  hexBins,
  allFrameHexIDs,
  countDiffs,
  diffVector,
} from "./hexBins";
import { latLng } from "./geo";
import { sleep } from "./sleep";
import frames from "./snapshots.json";

let map: L.Map | null = null;

// layers
const hexLayers: L.FeatureGroup<HexBinLayer> = L.featureGroup();
const diffLabels: L.FeatureGroup<LabelLayer> = L.featureGroup();
const diffVectors: L.FeatureGroup<VectorLayer> = L.featureGroup();

const getInputElement = (id: string): HTMLInputElement | null => {
  const e = document.getElementById(id);
  if (e) {
    return e as HTMLInputElement;
  } else {
    console.warn(`missing element #${id}`);
    return null;
  }
};

const toggleDiffVector = () => {
  if (!map) {
    console.warn("map is null");
    return;
  }

  getInputElement("showDiffVector")?.checked
    ? diffVectors.addTo(map)
    : diffVectors.removeFrom(map);
};

const toggleDiffLabel = () => {
  if (!map) {
    console.warn("map is null");
    return;
  }

  getInputElement("showDiffLabel")?.checked
    ? diffLabels.addTo(map)
    : diffLabels.removeFrom(map);
};

const draw = () => {
  const t = getInputElement("frameSelector")?.valueAsNumber;
  if (!t) {
    return;
  }

  // frames start at 1, as we need the previous frame to calculate the diff
  if (t < 1 || t > frames.length) {
    console.error(`can't draw frame ${t}, got ${frames.length} frames`);
    return;
  }

  const resolution = getInputElement("hexResolution")?.valueAsNumber;
  if (!resolution) {
    return;
  }
  const bins = [
    hexBins(frames[t - 1], resolution),
    hexBins(frames[t], resolution),
  ];

  hexLayers.clearLayers();
  hexLayers.addLayer(drawHexBins(bins[1]));

  const ids = allFrameHexIDs(bins);
  const coords = R.zipObj(
    ids,
    ids.map((id) => latLng(h3.h3ToGeo(id)))
  );
  const diffs = countDiffs(bins, ids);
  const getDiffVector = R.curry(diffVector)(diffs)(coords);

  diffLabels.clearLayers();
  diffVectors.clearLayers();

  ids.forEach((id: HexID) => {
    const vector = getDiffVector(id);
    if (vector) {
      const vectorLayer = drawVector(vector);
      if (vectorLayer) {
        diffVectors.addLayer(vectorLayer);

        const labelLayer = drawLabel(coords[id], diffs[id].toString());
        diffLabels.addLayer(labelLayer);
      }
    }
  });

  // const avgVector = drawVector()
};

const initMap = () => {
  const initialCenter = [-19.926752, -43.939384];
  const minZoom = 10;
  const maxZoom = 15;
  const initialZoom = 14;
  map = L.map("map", {
    center: new L.LatLng(initialCenter[0], initialCenter[1]),
    zoom: initialZoom,
    minZoom,
    maxZoom,
  });
  //@ts-ignore
  L.tileLayer.provider("Stamen.TonerBackground").addTo(map);

  hexLayers.addTo(map);

  if (getInputElement("showDiffVector")?.checked) {
    diffVectors.addTo(map);
  }

  if (getInputElement("showDiffLabel")?.checked) {
    diffLabels.addTo(map);
  }
};

const setFrameSelectorRange = () => {
  const input = getInputElement("frameSelector");
  if (!input) {
    return;
  }
  input.setAttribute("max", `${frames.length - 1}`);
  input.setAttribute("min", "1");
  input.value = "1";
};

const play = async () => {
  const input = getInputElement("frameSelector");
  const span = document.getElementById("frameNumber");

  if (!input || !span) {
    return;
  }
  for (let i = 1; i < frames.length; i++) {
    input.value = `${i}`;
    span.innerText = `${i}`;
    draw();
    await sleep(1000);
  }
};

(window as any).toggleDiffVector = toggleDiffVector;
(window as any).toggleDiffLabel = toggleDiffLabel;
(window as any).draw = draw;
(window as any).play = play;

document.addEventListener("DOMContentLoaded", (_) => {
  initMap();
  setFrameSelectorRange();
  draw();
});
