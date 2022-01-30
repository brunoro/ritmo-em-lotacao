import * as h3 from "h3-js";
import * as L from 'leaflet'
import geojson2h3 from 'geojson2h3';
import { hslToHex } from './color';
import 'leaflet-providers'

let map = null;
let coords = [];
let hexLayers = [];

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

const drawCoords = () => {
    const hexResolution = document.getElementById("hexResolution").valueAsNumber;

    hexLayers.map(layer => layer.removeFrom(map));

    hexLayers = coords.map(c => {
        const hexBins = coordsToHexBins(hexResolution, c);

        const geojson = geojson2h3.h3SetToFeatureCollection(
            Object.keys(hexBins),
            hex => ({count: hexBins[hex]})
        );

        layer = L.geoJSON(geojson, { style: hexStyle });
        layer.addTo(map);
        return layer;
    });
    setAbOpacity()
}

// snapshot_2022-01-29T16:53:39.742Z.json
const snapshotTimestamp = (filename) =>
    new Date(filename.split('.')[0].split('_')[1]);

const readFiles = (input) => {
    coords = [];
    [...input.files]
        .sort((a, b) => snapshotTimestamp(b.name) - snapshotTimestamp(a.name))
        .forEach(readSnapshotJSON);
}

const readSnapshotJSON = (file) => {
    const fileReader = new FileReader();

    fileReader.onload = ({ target: { result }}) => {
        coords.push(JSON.parse(result));

        drawCoords();
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
(window as any).drawCoords = drawCoords;
(window as any).setAbOpacity = setAbOpacity;

document.addEventListener("DOMContentLoaded", (event) => {
    initMap()
});
