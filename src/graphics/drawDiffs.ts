import { HexBins, HexID, countDiff } from 'src/hexBins';
import { drawVector } from './drawVector';
import { LatLng, latLng } from 'src/geo';
import * as h3 from 'h3-js';
import * as L from 'leaflet';
import * as R from 'ramda';

const drawLabel = (coord: LatLng, text: string) =>
  L.marker(coord, {
    icon: L.divIcon({
      className: 'hex-label',
      html: text,
    }),
  });

export const drawDiffs = (frames: HexBins[], ids: HexID[]) => {
  if (frames.length < 2) {
    console.log('drawDiffs needs at least 2 frames');
    return;
  }

  // TODO: this is broken
  const countFrameDiffs = R.curry(countDiff)(frames);
  const diffs = R.zipObj(
    ids,
    ids.map((id) => countFrameDiffs(id))
  );
  const coords = R.zipObj(
    ids,
    ids.map((id) => latLng(h3.h3ToGeo(id)))
  );
  const labels = ids.map((id) => drawLabel(coords[id], diffs[id].toString()));

  const drawDiffVector = R.curry(drawVector)(diffs)(coords);
  const vectors = ids
    .map((id) => drawDiffVector(id))
    .filter(R.identity) as L.Polyline[];

  return { labels, vectors };
};
