import * as h3 from "h3-js";
import { latLng } from "leaflet";
import * as R from "ramda";

import { LatLng, Vector, interpolateCoord, avgCoord } from "./geo";

export type HexID = string;
export type HexBins = { [id: HexID]: number };

const hexBins = (coords: number[][], resolution: number): HexBins => {
  const bins: HexBins = {};
  coords.forEach(([lat, lng]) => {
    const id = h3.geoToH3(lat, lng, resolution);
    bins[id] = bins[id] ? bins[id] + 1 : 1;
  });
  return bins;
};

const countAtFrame = (frames: HexBins[], hexId: HexID, i: number): number => {
  if (i >= frames.length) {
    throw "countAtFrame: hexBin out of range";
  }

  let count = 0;
  if (frames[i][hexId]) {
    count = frames[i][hexId];
  }
  return count;
};

const countDiff = (frames: HexBins[], hexId: HexID): number => {
  return countAtFrame(frames, hexId, 1) - countAtFrame(frames, hexId, 0);
};

// TODO: rename this
const allFrameHexIDs = (frames: HexBins[]): string[] => {
  const all = new Set<string>();
  frames.forEach((frame) =>
    Object.keys(frame).forEach((hexId) => all.add(hexId))
  );
  return Array.from(all);
};

export const countDiffs = (frames: HexBins[], ids: HexID[]): HexBins => {
  if (frames.length < 2) {
    console.warn("drawDiffs needs at least 2 frames");
    return {};
  }

  const countFrameDiffs = R.curry(countDiff)(frames);
  return R.zipObj(
    ids,
    ids.map((id) => countFrameDiffs(id))
  );
};

export const diffVector = (
  counts: { [id: HexID]: number },
  coords: { [id: HexID]: LatLng },
  id: HexID
): Vector | null => {
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
  return [center, avgCoord(adjustedNeighbors)];
};

export { hexBins, countDiff, allFrameHexIDs };
