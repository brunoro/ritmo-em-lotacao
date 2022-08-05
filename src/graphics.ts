import * as h3 from "h3-js";
import * as L from "leaflet";
import geojson2h3 from "geojson2h3";

import { hslToHex } from "./color";
import { HexBins } from "./hexBins";
import { LatLng, Vector } from "./geo";

export type VectorLayer = L.Polyline;

export const drawVector = (vector: Vector, color: string): VectorLayer => {
  return L.polyline(vector, { color });
};

export type HexBinLayer = L.GeoJSON;
type CountFeature = { count: number };

const style: L.StyleFunction<CountFeature> = (feature?) => {
  const count = feature?.properties.count || 0;
  const max = 15;
  const h = 0.2 - 0.2 * Math.min(count / max, 1.0); // 0.2 (green) -> 0 (red)
  return {
    stroke: false,
    fill: true,
    fillColor: hslToHex(h, 1, 0.4),
  };
};

export const drawHexBins = (bins: HexBins): HexBinLayer => {
  const geojson = geojson2h3.h3SetToFeatureCollection(
    Object.keys(bins),
    (id) => ({
      center: h3.h3ToGeo(id), // TODO: cache coords
      count: bins[id],
    })
  );

  return L.geoJSON(geojson, {
    style,
    // onEachFeature: (_feat, layer) => layer.on({ click: hexLayerOnClick }),
  });
};

export type LabelLayer = L.Marker;

export const drawLabel = (coord: LatLng, text: string): LabelLayer =>
  L.marker(coord, {
    icon: L.divIcon({
      className: "hex-label",
      html: text,
    }),
  });
