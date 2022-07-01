import * as L from 'leaflet';

type LatLng = L.LatLng;

type LatLngMap<T> = { [k: T]: LatLng };

const latLng = ([lat, lng]: number[]) => L.latLng(lat, lng);

const interpolateCoord = (a: LatLng, b: LatLng, p): LatLng => {
  return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
};

const avgCoord = (coords: LatLng[]): LatLng => {
  let latAcc = 0;
  let lngAcc = 0;
  coords.forEach(({ lat, lng }: LatLng) => {
    latAcc += lat;
    lngAcc += lng;
  });
  return [latAcc / coords.length, lngAcc / coords.length];
};

export { latLng, LatLng, LatLngMap, interpolateCoord, avgCoord };
