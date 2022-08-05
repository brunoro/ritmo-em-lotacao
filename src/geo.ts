import * as L from "leaflet";

export type LatLng = L.LatLng;
export type LatLngMap = { [k: string]: LatLng };
export type Vector = [LatLng, LatLng];

const latLng = ([lat, lng]: number[]) => L.latLng(lat, lng);

const interpolateCoord = (a: LatLng, b: LatLng, p: number): LatLng => {
  return L.latLng(a.lat + (b.lat - a.lat) * p, a.lng + (b.lng - a.lng) * p);
};

const avgCoord = (coords: LatLng[]): LatLng => {
  let latAcc = 0;
  let lngAcc = 0;
  coords.forEach(({ lat, lng }: LatLng) => {
    latAcc += lat;
    lngAcc += lng;
  });
  return L.latLng(latAcc / coords.length, lngAcc / coords.length);
};

const interpolateVector = (
  [aFrom, aTo]: Vector,
  [bFrom, bTo]: Vector,
  p: number
): Vector => {
  return [interpolateCoord(aFrom, bFrom, p), interpolateCoord(aTo, bTo, p)];
};

export { latLng, interpolateCoord, avgCoord, interpolateVector };
