const interpolateCoord = (a, b, p) => {
  return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
};

const avgCoord = (coords) => {
  let latAcc = 0;
  let lngAcc = 0;
  coords.forEach(([lat, lng]) => {
    latAcc += lat;
    lngAcc += lng;
  });
  return [latAcc / coords.length, lngAcc / coords.length];
};

export { interpolateCoord, avgCoord };
