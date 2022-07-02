import { HexBins, HexID, countDiff } from 'src/hexBins';
import { drawLabel, LabelLayer } from './drawLabel';
import { drawVector, VectorLayer } from './drawVector';
import { latLng } from 'src/geo';
import * as h3 from 'h3-js';
import * as R from 'ramda';

type DiffLayers = { vectors: VectorLayer[]; labels: LabelLayer[] };

export const drawDiffs = (frames: HexBins[], ids: HexID[]): DiffLayers => {
  if (frames.length < 2) {
    console.log('drawDiffs needs at least 2 frames');
    return { vectors: [], labels: [] };
  }

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
    .filter(R.identity) as VectorLayer[];

  return { labels, vectors };
};
