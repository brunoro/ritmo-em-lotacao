import * as h3 from "h3-js";
import * as L from "leaflet";
import * as R from "ramda";

import { LatLng, interpolateCoord, avgCoord } from "../geo";
import { HexID } from "../hexBins";

export type VectorLayer = L.Polyline;

export const drawVector = (
  counts: { [id: HexID]: number },
  coords: { [id: HexID]: LatLng },
  id: HexID
): VectorLayer | null => {
  const center = coords[id];
  const count = counts[id];

  // only count outbound vectors
  if (!count || count == 0) {
    return null;
  }

  const neighbors = h3.kRing(id, 1);
  neighbors.shift();

  // TODO: precompute neighbors
  const adjustedNeighbors = neighbors
    .map((nID: HexID) => {
      const nCount = counts[nID];
      // only count outbound vectors
      if (!nCount || nCount == 0 || count >= nCount) {
        return null;
      }
      const p = (nCount - count) / Math.max(nCount, count);
      const nCenter = coords[nID];
      return interpolateCoord(center, nCenter, p);
    })
    .filter(R.identity) as LatLng[];

  if (adjustedNeighbors.length == 0) {
    return null;
  }
  return L.polyline([center, avgCoord(adjustedNeighbors)], {
    color: "purple",
  });
};
