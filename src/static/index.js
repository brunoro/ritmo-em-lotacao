var map;

// Set to true when debugging for log statements about HTTP requests.
function load(config) {
  forbid_editing = config.forbid_editing;

  var map_dom = document.getElementById("map");
  var mapOptions = {
    zoom: 13,
    center: config.bounds.getCenter(),
    mapTypeId : google.maps.MapTypeId.ROADMAP,
    scaleControl: true
  };
  map = new google.maps.Map(map_dom, mapOptions);
  map.fitBounds(config.bounds);
  initIcons();

  fetchState(config.bounds)
}


function fetchState(bounds) {
  url = "/json/state?n=" + bounds.getNorthEast().lat()
                 + "&e=" + bounds.getNorthEast().lng()
                 + "&s=" + bounds.getSouthWest().lat()
                 + "&w=" + bounds.getSouthWest().lng()
  downloadUrl(url, callbackDisplayState);
}

function callbackDisplayState(data, responseCode) {
  if (responseCode != 200) {
    return;
  }
  clearMap();
  var nodes = eval(data);
  for (var i=0; i<nodes.length; ++i) {
    addNodeMarkerFromList(nodes[i], true);
  }
}

/**
 * Remove all overlays from the map
 */
function clearMap() {
  boundsOfPolyLine = null;
  for (var stopId in stopMarkersSelected) {
    stopMarkersSelected[stopId].setMap(null);
  }
  for (var stopId in stopMarkersBackground) {
    stopMarkersBackground[stopId].setMap(null);
  }
  for (var i = 0; i < existingPolylines.length; ++i) {
    existingPolylines[i].setMap(null);
  }
  stopMarkersSelected = {};
  stopMarkersBackground = {};
  existingPolylines = [];
}

/**
 * Return a new GIcon used for stops
 */
function mkIcon(imgUrl) {
  return {
    size: new google.maps.Size(12, 20),
    anchor: new google.maps.Point(6, 20),
    url: imgUrl
  };
}

/**
 * Initialize icons. Call once during load.
 */
function initIcons() {
  var iconSelected = mkIcon("/file/mm_20_yellow.png");
  var iconBackground = mkIcon("/file/mm_20_blue_trans.png");
  var iconBackgroundStation = mkIcon("/file/mm_20_red_trans.png");
}

function addNodeMarker(n) {
  return addMarker(iconBackground, n[0], n[1], n[2], n[3]);
}

/**
 * Add a stop to the map, returning the new marker
 */
function addMarker(icon, id, name, lat, lon) {
  var markerOpts = {
    icon: icon,
    map: map,
    position: new google.maps.LatLng(lat, lon),
    draggable: false,
    anchorPoint: new google.maps.Point(0, -20)
  };
  marker = new google.maps.Marker(markerOpts);
  google.maps.event.addListener(marker, "click", function() {
    console.log(id, name)
  });
  return marker;
}

function windowHeight() {
  // Standard browsers (Mozilla, Safari, etc.)
  if (self.innerHeight)
    return self.innerHeight;
  // IE 6
  if (document.documentElement && document.documentElement.clientHeight)
    return document.documentElement.clientHeight;
  // IE 5
  if (document.body)
    return document.body.clientHeight;
  // Just in case.
  return 0;
}

function downloadUrl(url, callback) {
  console.log(url);

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onload = function (e) {
    if (xhr.readyState === 4) {
      callback(xhr.responseText, xhr.status);
    }
  };
  xhr.onerror = function (e) {
    console.error("", xhr.status);
  };
  xhr.send(null);
}
