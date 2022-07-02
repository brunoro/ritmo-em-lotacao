import * as h3 from 'h3-js';
import * as L from 'leaflet';
import * as R from 'ramda';

import { LatLng, interpolateCoord, avgCoord } from 'src/geo';
import { HexID } from 'src/hexBins';

type DiffVectorLayer = L.Polyline[];

type HexCountMap = { [id: HexID]: number };
type HexCoordMap = { [id: HexID]: LatLng };

const drawVector = (
  counts: HexCountMap,
  coords: HexCoordMap,
  id: HexID
): L.Polyline | undefined => {
  const center = coords[id];
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
      const p = (nCount - count) / Math.max(nCount, count);
      const nCenter = coords[nID];
      return interpolateCoord(center, nCenter, p);
    })
    .filter(R.identity) as LatLng[];

  if (adjustedNeighbors.length == 0) {
    return;
  }
  return L.polyline([center, avgCoord(adjustedNeighbors)], {
    color: 'purple',
  });
};

export { drawVector, DiffVectorLayer };
