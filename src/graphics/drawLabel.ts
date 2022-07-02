import { LatLng } from 'src/geo';
import * as L from 'leaflet';

export type LabelLayer = L.Marker[];

export const drawLabel = (coord: LatLng, text: string): LabelLayer =>
  L.marker(coord, {
    icon: L.divIcon({
      className: 'hex-label',
      html: text,
    }),
  });
