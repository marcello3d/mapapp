var UI = require('./lib/ui.ract');

var google
var databaseDom = document.getElementById('database');
console.log("Getting database from localstorage")
databaseDom.value = window.localStorage.getItem('map-database');
console.log("databaseDom.value",{value:databaseDom.value})

function icon(letter, color) {
    return 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld='+letter+'|'+color+'|000000'
}


var ui = new UI({
    el:'ui',
    debug:true,
    data: {
        destinations:[],
        origins:[],
        calculations:{}
    }
});


var justchanged = false;
var databaseFocus = false;
databaseDom.addEventListener('change', function() {
    justchanged = true;
    saveDatabase();
    readDatabase();
    justchanged = false;
}, false);
databaseDom.addEventListener('focus', function() {
    databaseFocus = true;
}, false);
databaseDom.addEventListener('blur', function() {
    databaseFocus = false;
}, false);

function readDatabase() {
    try {
        console.log("Updating ractive from textarea");
        ui.set(JSON.parse(databaseDom.value));
    } catch (e) {
        console.error("Error reading database", e);
    }
}
//ui.observe('*', updateDatabase);
//ui.on('set', updateDatabase);
//ui.on('update', updateDatabase);
function updateDatabase() {
    if (!justchanged && !databaseFocus) {
        var json = JSON.stringify(ui.get(), null, 2)
        if (json !== databaseDom.value) {
            console.log("Updating textarea from ractive...");
            databaseDom.value = json;
            saveDatabase();
        }
    }
}
setInterval(function() {
    updateDatabase();
}, 1000);

function saveDatabase() {
    console.log("Saving textarea to localstorage...", {value:databaseDom.value});
    window.localStorage.setItem('map-database', databaseDom.value);
    if (databaseDom.value !== window.localStorage.getItem('map-database')) {
        console.error("JSON MISMATCH:",{databse:databaseDom.value,localstorage:window.localStorage.getItem('map-database')})
    }
    addPins();
}



var map;
readDatabase();

var pinCache = {}

function addPins() {
    if (!map || !google) {
        return
    }
    var bounds = new google.maps.LatLngBounds();
    function addPin(dest, color) {
        if (pinCache[dest.formatted_address]) {
            return pinCache[dest.formatted_address];
        }
        var point = pinCache[dest.formatted_address] = new google.maps.LatLng(dest.latitude, dest.longitude);
        var marker = new google.maps.Marker({
            map: map,
            position: point,
            icon: icon(dest.id,'FF0000')
        });
        return point;
    }
    ui.get('destinations').forEach(function(dest) {
        if (dest.formatted_address) {
            addPin(dest, 'FF0000');
        }
    });
    ui.get('origins').forEach(function(orig) {
        if (orig.formatted_address) {
            bounds.extend(addPin(orig, '00FF00'));
        }
    });
    map.fitBounds(bounds);
}



window.initializeGMaps = function() {
    google = window.google;
    window.geocoder = new google.maps.Geocoder();
    window.distanceMatrix = new google.maps.DistanceMatrixService();
    window.directionsService = new google.maps.DirectionsService();
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        center: new google.maps.LatLng(55.53, 9.4),
        zoom: 10
    });
    addPins();
};

function loadScript() {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=initializeGMaps';
    document.body.appendChild(script);
}

window.onload = loadScript;


