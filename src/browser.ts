import * as h3 from "h3-js";
import * as L from 'leaflet'
import geojson2h3 from 'geojson2h3';
import { hslToHex } from './color';
import 'leaflet-providers'

let map = null;
let coords = [];
let hexLayer = null;

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
        // fillColor: hslToHex(h, 1, 0.4),
        fillColor: hslToHex(h, 1, 0.4),
        fillOpacity: 0.7,
    }
}

const drawCoords = () => {
    const hexResolution = document.getElementById("hexResolution").valueAsNumber

    const hexBins = coordsToHexBins(hexResolution, coords);
    console.log(hexBins);

    const geojson = geojson2h3.h3SetToFeatureCollection(
        Object.keys(hexBins),
        hex => ({count: hexBins[hex]})
    );

    if (hexLayer) {
        hexLayer.removeFrom(map);
    }

    hexLayer = L.geoJSON(geojson, { style: hexStyle });
    hexLayer.addTo(map);
}

const readSnapshotJSON = (input) => {
    const file = input.files[0];
    const fileReader = new FileReader();

    fileReader.onload = () => {
        coords = JSON.parse(fileReader.result);
        console.log(coords);

        drawCoords()
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

(window as any).readSnapshotJSON = readSnapshotJSON;
(window as any).drawCoords = drawCoords;

document.addEventListener("DOMContentLoaded", (event) => {
    initMap()
});
