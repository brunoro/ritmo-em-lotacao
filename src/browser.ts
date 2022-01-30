import * as h3 from "h3-js";
import * as L from 'leaflet'
import geojson2h3 from 'geojson2h3';
import { hslToHex } from './color';
import 'leaflet-providers'

let map = null;
let frames = [];
let hexLayers = [];
let hexBins = [];
const vectorLayers = [];

const coordsToHexBins = (hexResolution: number, coords: number[2][]) => {
    const hexs = coords.map(([lat, lng]) => h3.geoToH3(lat, lng, hexResolution));
    const bins = {};
    hexs.forEach(hex => {
        const bin = bins[hex] ? bins[hex] : 0;
        bins[hex] = bin+1;
    })

    return bins;
}

const hexStyle = (feature: { properties: { count: number } }) => {
    const count = feature.properties.count;
    const max = 15;
    const h = 0.2 - 0.2 * Math.min(count/max, 1.0); // 0.2 (green) -> 0 (red)
    return {
        stroke: false,
        fill: true,
        fillColor: hslToHex(h, 1, 0.4),
    }
}

const countAtFrame = (hexId, i) => {
    let count = 0;
    if (hexBins[i][hexId]) {
        count = hexBins[i][hexId];
    }
    return count;
}

const countDiff = hexId => {
    return countAtFrame(hexId, 1) - countAtFrame(hexId, 0)
}

const interpolateCoord = (a, b, p) => {
    return [
        a[0] + (b[0] - a[0]) * p,
        a[1] + (b[1] - a[1]) * p,
    ]
}

const avgCoord = (coords) => {
    console.log('coords')
    console.log(coords)
    let latAcc = 0;
    let lngAcc = 0;
    coords.forEach(([lat, lng]) => {
        latAcc += lat;
        lngAcc += lng;
    })
    return [
        latAcc/coords.length,
        lngAcc/coords.length,
    ]
}

const hexLayerOnClick = (e) => {
    if (vectorLayers) {
        vectorLayers.forEach(layer => layer.removeFrom(map))
    }
    const hexId = e.target.feature.id;
    const neighbors = h3.kRing(hexId, 1);
    neighbors.shift(0);

    center = e.target.feature.properties.center;
    diff = countDiff(hexId);

    console.log('adjustedNeighbors');
    const adjustedNeighbors = neighbors
        .map(neighborHexId => {
            const neighborDiff = countDiff(neighborHexId);
            // only count one direction
            if (diff == 0 || diff >= neighborDiff) {
                return;
            }
            const p = (neighborDiff - diff) / diff;
            console.log(diff, neighborDiff, p)
            const neighborCenter = h3.h3ToGeo(neighborHexId);
            return interpolateCoord(center, neighborCenter, p);
        })
        .filter(x => x);
    if (adjustedNeighbors.length == 0) {
        return
    }
    const line = L.polyline(
        [center, avgCoord(adjustedNeighbors)],
        {color: 'purple'}
    )
    line.addTo(map);
    vectorLayers.push(line);
}

const setAbOpacity = () => {
    const max = 0.7;
    const p = document.getElementById("abSelector").checked * max;

    if (hexLayers.length > 0) {
        hexLayers[0].setStyle({ fillOpacity: p });
    }
    if (hexLayers.length > 1) {
        hexLayers[1].setStyle({ fillOpacity: max - p });
    }
}

const drawFrames = () => {
    const hexResolution = document.getElementById("hexResolution").valueAsNumber;

    hexLayers.map(layer => layer.removeFrom(map));
    hexBins = []

    hexLayers = frames.map(coords => {
        frameHexBins = coordsToHexBins(hexResolution, coords);
        hexBins.push(frameHexBins);

        const geojson = geojson2h3.h3SetToFeatureCollection(
            Object.keys(frameHexBins),
            hex => ({
                center: h3.h3ToGeo(hex),
                count: frameHexBins[hex]
            })
        );

        layer = L.geoJSON(geojson, {
            style: hexStyle,
            onEachFeature: (_feat, layer) => layer.on({ click: hexLayerOnClick }),
        });
        layer.addTo(map);

        return layer;
    });
    setAbOpacity()
}

// snapshot_2022-01-29T16:53:39.742Z.json
const snapshotTimestamp = (filename) =>
    new Date(filename.split('.')[0].split('_')[1]);

const readFiles = (input) => {
    frames = [];
    [...input.files]
        .sort((a, b) => snapshotTimestamp(b.name) - snapshotTimestamp(a.name))
        .forEach(readSnapshotJSON);
}

const readSnapshotJSON = (file) => {
    const fileReader = new FileReader();

    fileReader.onload = ({ target: { result }}) => {
        frames.push(JSON.parse(result));

        drawFrames();
    };
    fileReader.onerror = () => {
        alert(fileReader.error);
    };
    fileReader.readAsText(file);
}

const initMap = () => {
    const initialCenter = [-19.926752, -43.939384];
    const minZoom = 10;
    const maxZoom = 15;
    const initialZoom = 14;
    map = L.map('map', {
        center: new L.LatLng(initialCenter[0], initialCenter[1]),
        zoom: initialZoom,
        minZoom, maxZoom
    });
    L.tileLayer.provider('Stamen.TonerBackground').addTo(map);
}

(window as any).readFiles = readFiles;
(window as any).drawFrames = drawFrames;
(window as any).setAbOpacity = setAbOpacity;

document.addEventListener("DOMContentLoaded", (event) => {
    initMap()
});
