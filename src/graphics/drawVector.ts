import * as h3 from 'h3-js';
import * as L from 'leaflet';
import * as R from 'ramda';

import { LatLng, latLng, interpolateCoord, avgCoord } from 'src/geo';
import { HexID } from 'src/hexBins';

type DiffVectorLayer = L.Polyline[];

type HexCountMap = { [id: HexID]: number };

const drawVector = (
  counts: HexCountMap,
  id: HexID,
  center: LatLng
): L.Polyline | undefined => {
  const count = counts[id];

  const neighbors = h3.kRing(id, 1);
  neighbors.shift();

  // TODO: some vectors are negative
  // TODO: precompute neighbors
  const adjustedNeighbors = neighbors
    .map((nID: HexID) => {
      const nCount = counts[nID];
      // only count outbound vectors
      if (count == 0 || count >= nCount) {
        return;
      }
      const p = (nCount - count) / count;
      const neighborCenter = latLng(h3.h3ToGeo(nID));
      return interpolateCoord(center, neighborCenter, p);
    })
    .filter(R.identity) as LatLng[];

  const coords: LatLng[] = [center, avgCoord(adjustedNeighbors)];
  if (adjustedNeighbors.length == 0) {
    return;
  }
  return L.polyline(coords, {
    color: 'purple',
  });
};

export { drawVector, DiffVectorLayer };
