import * as h3 from 'h3-js';

type HexID = string;
type HexBins = { [id: HexID]: number };

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
    throw 'countAtFrame: hexBin out of range';
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

export { hexBins, HexBins, HexID, countDiff, allFrameHexIDs };
