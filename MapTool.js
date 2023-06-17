let directionsRenderer;
let map;
let clientSiteInfoWindow;
let empGardaInfoWindow;
let trafficLayer;
let allMarkersData = [];


function initMap() {
  const mapOptions = {
    zoom: 10,
    center: { lat: 27.9506, lng: -82.4572 },
    mapId: "5166300bb01e9f7f",
  };
  map = new google.maps.Map(document.getElementById("map"), mapOptions);

  initOriginAutocomplete(map);
  initDestinationAutocomplete(map);

  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
  directionsRenderer.setPanel(document.getElementById("directions-panel"));

  
//TrafficLayer Initialization
trafficLayer = new google.maps.TrafficLayer();


// March 27th Changes to fix clearDirections _Begin_

  document.getElementById("int-search").addEventListener("click", function () {
    performSearch();
  });

  document.getElementById("origin").addEventListener("keydown", handleEnterKeyPress);
  document.getElementById("destination").addEventListener("keydown", handleEnterKeyPress);

  document.getElementById("route-form").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form submission
    performSearch(); // Call the performSearch function
  });
document.getElementById("clear-route").addEventListener("click", clearDirections);
}

function handleEnterKeyPress(event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevent default behavior, like form submission
    performSearch(); // Call the performSearch function
  }
}
//Begin Traffic Conditions Toggle
function toggleTraffic() {
  const trafficCheckbox = document.getElementById("toggle-traffic");
  if (trafficCheckbox.checked) {
    trafficLayer.setMap(map);
  } else {
    trafficLayer.setMap(null);
  }
}

//End Traffic Conditions Toggle

function performSearch() {
  // Call the clearDirections function before calculating the new route
  clearDirections();
  
  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;

  if (origin === "" || destination === "") {
    const output = document.querySelector('#output');
    output.innerHTML = "<div class='alert-danger'>Please enter both origin and destination.</div>";
  } else {
    calculateRoute(origin, destination, map);
  }
}


// March 27th Changes to fix clearDirections _Finish_

window.addEventListener('load', function () {
  initMap();
  document.getElementById("search-ClientEmployee").addEventListener("input", filterSearchResults);

});

function initOriginAutocomplete(map) {
  const input = document.getElementById("origin");
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo("bounds", map);

  autocomplete.addListener("place_changed", function () {
    // Handle origin place changes here
  });
}

function initDestinationAutocomplete(map) {
  const destinationInput = document.getElementById("destination");
  const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
  destinationAutocomplete.bindTo("bounds", map);
  destinationAutocomplete.addListener("place_changed", function () {
  });
}

function calculateRoute(origin, destination, map) {
  const directionsService = new google.maps.DirectionsService();
  
  const request = {
    origin: origin,
    destination: destination,
    travelMode: 'DRIVING',
    unitSystem: google.maps.UnitSystem.IMPERIAL, 
    drivingOptions: {
    departureTime: new Date(Date.now() + 10 * 60 * 1000),
    trafficModel: "bestguess"
    }
  };
  
  directionsService.route(request, function(result, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      const distance = result.routes[0].legs[0].distance.value;
      const distanceMiles = distance / 1609.34;
      const output = document.querySelector('#output');
      const travelTime = result.routes[0].legs[0].duration_in_traffic.text;
output.innerHTML = `<div class='alert-info'> From: ${origin}.<br /> To: ${destination}. <br /> Driving distance: ${distanceMiles.toFixed(2)} miles. <br /> Estimated travel time: ${travelTime} (with traffic).</div>`;

      directionsRenderer.setDirections(result);
    } else { 
      directionsRenderer.setDirections({ routes: [] });
    }
directionsRenderer.setMap(map);
  });
}


// Clear search results

function clearDirections() {
  // Clear the output div
  const output = document.querySelector("#output");
  output.innerHTML = "";

  // Close the info windows and set them to null
  if (clientSiteInfoWindow) {
    clientSiteInfoWindow.close();
    clientSiteInfoWindow = null;
  }
  if (empGardaInfoWindow) {
    empGardaInfoWindow.close();
    empGardaInfoWindow = null;
  }

  // Clear the rendered route
  directionsRenderer.setDirections({ routes: [] });
}



/* 
Begin 
Excel 
Process
*/

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('excelFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      processExcelSheets(workbook, map);
    };

    reader.readAsArrayBuffer(file);
  });
});

function setOrigin(event) {
  event.preventDefault();
  const lat = event.target.getAttribute('data-lat');
  const lng = event.target.getAttribute('data-lng');
  document.getElementById("origin").value = `${lat}, ${lng}`;
}

function setDestination(event) {
  event.preventDefault();
  const lat = event.target.getAttribute('data-lat');
  const lng = event.target.getAttribute('data-lng');
  document.getElementById("destination").value = `${lat}, ${lng}`;
}



function processExcelSheets(workbook, map) {
  allMarkersData = []; // Clear previous data

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const markersData = XLSX.utils.sheet_to_json(sheet);
    addMarkersWithExcelData(map, markersData, sheetName);

    allMarkersData = allMarkersData.concat(markersData); // Store data in the global variable

    console.log(sheetName, markersData);
  });
}

// search-ClientEmployee filtering


function filterSearchResults() {
  const searchTerm = document.getElementById("search-ClientEmployee").value.toLowerCase();
  const filteredResults = allMarkersData.filter(markerData => {
    return markerData.clientSite?.toLowerCase().includes(searchTerm)
      || markerData.firstName?.toLowerCase().includes(searchTerm)
      || markerData.lastName?.toLowerCase().includes(searchTerm);
  });

  const searchOutput = document.getElementById("search-output");
  searchOutput.innerHTML = "";

  filteredResults.forEach(result => {
    const resultElement = document.createElement("div");
    resultElement.classList.add("search-result");
    resultElement.textContent = result.clientSite || `${result.firstName} ${result.lastName}`;
    resultElement.setAttribute("data-lat", result.coordLat || result.lat);
    resultElement.setAttribute("data-lng", result.coordLng || result.lng);
    resultElement.addEventListener("click", centerMapOnChoice);
    searchOutput.appendChild(resultElement);
  });
}

// Center map on results for search-ClientEmployee.


function centerMapOnChoice(event) {
  const lat = parseFloat(event.currentTarget.getAttribute("data-lat"));
  const lng = parseFloat(event.currentTarget.getAttribute("data-lng"));
  map.setCenter({ lat: lat, lng: lng });
  map.setZoom(15); // Set an appropriate zoom level
  
  // Clear the dropdown menu after a click
  document.getElementById("search-output").innerHTML = "";
}

// Add the event listeners here
// Close the search-ClientEmployee dropdown when the 'Esc' key is pressed
document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    document.getElementById("search-output").innerHTML = "";
  }
});

// Close the search-ClientEmployee dropdown when clicking outside of it
document.addEventListener("click", function(event) {
  if (!event.target.matches("#search-ClientEmployee") && !event.target.matches(".search-result")) {
    document.getElementById("search-output").innerHTML = "";
  }
});


// Add a category parameter to the addMarkersWithExcelData function

function addMarkersWithExcelData(map, markersData, category) {
  console.log('category:', category); // Add this line
  
  markersData.forEach((markerData) => {
    const icon = (category === 'clientSites') ? 'Images/clientSites_Icon.png' : 'Images/empGarda_Icon.png';
    const lat = parseFloat(markerData.coordLat || markerData.lat);
    const lng = parseFloat(markerData.coordLng || markerData.lng);
    console.log("Latitude:", lat, "Longitude:", lng); // Add this line
    console.log('icon:', icon); // Add this line
    
    //Display Datasheet contents onto Info window.
const infoContent = (category === 'clientSites') ? `
  <div class="info-window">
    <h3>${markerData.clientSite}</h3>
    <p>Site Address: ${markerData.siteAddr}</p>
    <p>Site ID: ${markerData.siteID}</p>
    <a href="#" data-lat="${lat}" data-lng="${lng}" onclick="setDestination(event, event);">Set as destination</a>
  </div>
` : `
  <div class="info-window">
    <h3>Name: ${markerData.firstName} ${markerData.lastName}</h3>
    <p>Employee ID: ${markerData.empID}</p>
    <p>Phone Number: ${markerData.phoneNum}</p>
    <p>Work Schedule: ${markerData.workSchedule}</p>
    <a href="#" data-lat="${lat}" data-lng="${lng}" onclick="setOrigin(event);">Set as origin</a>
  </div>
`;

console.log('infoContent:', infoContent);

    
const marker = new google.maps.Marker({
  position: { lat: parseFloat(markerData.coordLat || markerData.lat), lng: parseFloat(markerData.coordLng || markerData.lng) },
  map: map,
  title: (category === 'clientSites') ? markerData.clientSite : markerData.empName,
  icon: icon
});

const infoWindow = new google.maps.InfoWindow({
  content: infoContent
});

marker.addListener('click', () => {
  if (category === 'clientSites') {
    if (clientSiteInfoWindow) {
      clientSiteInfoWindow.close();
    }
    clientSiteInfoWindow = infoWindow;
  } else {
    if (empGardaInfoWindow) {
      empGardaInfoWindow.close();
    }
    empGardaInfoWindow = infoWindow;
  }

  if (infoWindow.getMap()) {
    infoWindow.close();
  } else {
    infoWindow.open(map, marker);
  }
});
});
}







