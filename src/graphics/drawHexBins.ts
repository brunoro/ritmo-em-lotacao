import * as h3 from 'h3-js';
import geojson2h3 from 'geojson2h3';
import * as L from 'leaflet';

import { hslToHex } from 'src/color';
import { HexBins } from 'src/hexBins';

type HexLayer = L.GeoJSON;

const hexStyle = (feature: { properties: { count: number } }) => {
  const count = feature.properties.count;
  const max = 15;
  const h = 0.2 - 0.2 * Math.min(count / max, 1.0); // 0.2 (green) -> 0 (red)
  return {
    stroke: false,
    fill: true,
    fillColor: hslToHex(h, 1, 0.4),
  };
};

const drawHexBins = (bins: HexBins): HexLayer => {
  const geojson = geojson2h3.h3SetToFeatureCollection(
    Object.keys(frames),
    (id) => ({
      center: h3.h3ToGeo(id),
      count: bins[id],
    })
  );

  return L.geoJSON(geojson, {
    style: hexStyle,
    // onEachFeature: (_feat, layer) => layer.on({ click: hexLayerOnClick }),
  });
};

export { drawHexBins };
