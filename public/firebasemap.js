/**
 * Data object to be written to Firebase.
 */
var data = {  // This is what is stored in Firebase
  sender: null,
  timestamp: null,
  lat: null,
  lng: null,
  latlng: null,
  capacity: null
};
var config = {
  apiKey: 'AIzaSyCIMOtd7tORwU0Ssx8atqy7wegaqRtBmyw',
  authDomain: 'bike-rack-map.firebaseapp.com',
  databaseURL: 'https://bike-rack-map.firebaseio.com/',
  projectId: 'bike-rack-map',
  storageBucket: 'bike-rack-map.appspot.com',
  messagingSenderId: '285779793579'
};
var infoWindows = []; //Used to access all open infowindows
firebase.initializeApp(config);

var map;
var markers
var transitLayer;
var bikeLayer;
var infoWindow;

var bikePathCheckBox = document.querySelector('#bike-paths');
var lightRailCheckBox = document.querySelector('#light-rail');

bikePathCheckBox.onchange = function() {
  if(bikePathCheckBox.checked) {
    bikeLayer.setMap(map);
  }
  else {
    bikeLayer.setMap();
  }
}
lightRailCheckBox.onchange = function() {
  if(lightRailCheckBox.checked) {
    transitLayer.setMap(map);
  }
  else {
    transitLayer.setMap();
  }
}

function deleteMarker() {

  var latList = document.getElementsByClassName('marker-lat');
  var lat = latList[latList.length-1].innerHTML.substring(4);
  var lngList = document.getElementsByClassName('marker-lng');
  var lng = lngList[lngList.length-1].innerHTML.substring(4);

  console.log(lat+lng);
  var clicks = firebase.database().ref('clicks');
  var ref = clicks.orderByChild('latlng').equalTo(lat+lng).once("value").then(function(snapshot) {
    snapshot.forEach(function(child) {
      child.ref.remove();
      console.log("Removed!");
    })
    // Remove old data from the heatmap when a point is removed from firebase.

  });
  clicks.once('child_removed', function(snapshot, prevChildKey) {
    console.log("child removed");
    var markersData = markers;
    var i = 0;
    console.log(markersData[0]);
    while (snapshot.val().lat != markersData[i].position.lat() || snapshot.val().lng != markersData[i].position.lng()) {
      i++;
      console.log(i);
    }
    console.log(markersData);
    console.log(i);
    markers[i].setMap(null);
    markers.splice(i, 1);
    console.log(markers);
  });
}

function submitCapacity() {
  console.log(markers);
  var radios = document.getElementsByName('capacity');
  var last_click;
  firebase.database().ref('clicks').orderByChild('timestamp').limitToLast(1).once('child_added', function(snapshot) {
    console.log(snapshot.key);
    last_click = snapshot.key;
  });

  for (var i=0; i<radios.length; i++)
  {
   if (radios[i].checked)
   {
     console.log(radios[i].value);
     var clicks = firebase.database().ref('clicks/' + last_click).update({'capacity': radios[i].value});
     firebase.database().ref('clicks').orderByChild('timestamp').limitToLast(1).once('child_added', function(snapshot) {
       var newPosition = snapshot.val();
       console.log(newPosition);
       var point = new google.maps.LatLng(newPosition.lat, newPosition.lng);

       // Add the point to the map.
       console.log(markers.length);
       var newMarker = new google.maps.Marker({
           map: map,
           position: point,
       });
       markers[markers.length-1].setMap(null);
       markers.pop();
       markers.push(newMarker);

       newMarker.addListener('click', function() {
         var capacityInfo = "Capacity: " + newPosition.capacity;
         console.log(newPosition);
         console.log(newPosition.capacity);
         var contentString = '<div id="content">'+
               '<div id="siteNotice">'+
               '</div>'+
               '<div id="bodyContent">'+
               capacityInfo+
               '<p class="marker-lat">Lat:' + newMarker.position.lat()+ '</p>'+
               '<p class="marker-lng">Lng:' + newMarker.position.lng()+ '</p>'+
               '<br>'+
               '<button onClick="">Edit Rack</button>'+
               '<button onClick="deleteMarker()">Delete Rack</button>'+
               '</div>'+
               '</div>';

         var infowindow = new google.maps.InfoWindow({
           content: contentString
         });
         infoWindows.push(infowindow);
         infowindow.open(map, newMarker);
       });
     });
    // only one radio can be logically checked, don't check the rest
    break;
   }
  }
  console.log(markers);
  map.controls[google.maps.ControlPosition.TOP_CENTER].pop();
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 38.576488, lng: -121.493239},
    zoom: 17,
    styles: [
      {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#ffdbd1"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#f5d2c9"
          }
        ]
      }
    ],
    disableDoubleClickZoom: true,
    streetViewControl: true
  });
  // Create the DIV to hold the control and call the makeInfoBox() constructor
  // passing in this DIV.
  // var infoBoxDiv = document.createElement('div');
  // var infoBox = new makeInfoBox(infoBoxDiv, map);
  // infoBoxDiv.index = 1;
  // map.controls[google.maps.ControlPosition.TOP_CENTER].push(infoBoxDiv);
  // Create a heatmap.
  markers = [];

  // var centerMarkerIcon = document.createElement("IMG");
  // centerMarkerIcon.src = 'marker-icon.png';
  // var centerMarker = document.createElement('div');
  // centerMarker.append(centerMarkerIcon);
  // centerMarker.setAttribute("class", "center-marker")
  // map.getDiv().append(centerMarker);
  // console.log(map.getDiv());

  map.addListener('dblclick', function(e) {
    data.lat = e.latLng.lat();
    data.lng = e.latLng.lng();
    data.latlng = data.lat.toString() + data.lng.toString();
    var infoBoxDiv = document.createElement('div');
    makeInfoBox(infoBoxDiv, map);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(infoBoxDiv);
    addToFirebase(data);
  });

  map.addListener('click', function(e) {
    if (document.getElementById('capacity-input-box')) {
      map.controls[google.maps.ControlPosition.TOP_CENTER].pop();
    }
    for (i=0; i<infoWindows.length; i++) {
      infoWindows[i].close();
    }
  });

  transitLayer = new google.maps.TransitLayer();
  transitLayer.setMap(map);
  bikeLayer = new google.maps.BicyclingLayer();
  bikeLayer.setMap(map);

  initAuthentication(initFirebase.bind(undefined, markers));
  infoWindow = new google.maps.InfoWindow;
  if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function(position) {
    var pos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    infoWindow.setPosition(pos);
    infoWindow.setContent('Location found.');
    infoWindow.open(map);
    map.setCenter(pos);
  }, function() {
    handleLocationError(true, infoWindow, map.getCenter());
  });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation or needs to be turned on.');
  infoWindow.open(map);
  infoWindows.push(infoWindow);
}
function makeInfoBox(controlDiv, map) {
  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.id = "capacity-input-box"
  controlUI.style.boxShadow = 'rgba(0, 0, 0, 0.298039) 0px 1px 4px -1px';
  controlUI.style.backgroundColor = '#fff';
  controlUI.style.border = '2px solid #fff';
  controlUI.style.borderRadius = '2px';
  controlUI.style.height = '30vh';
  controlUI.style.width = '100vw';
  controlUI.style.marginBottom = '22px';
  controlUI.style.marginTop = '0px';
  controlUI.style.textAlign = 'center';
  controlDiv.appendChild(controlUI);


  // Set CSS for the control interior.
  var controlText = document.createElement('div');
  controlText.style.color = 'rgb(25,25,25)';
  controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
  controlText.style.fontSize = '100%';
  controlText.style.padding = '6px';
  controlText.innerText = 'How many bikes can fit?';
  controlUI.appendChild(controlText);

  // Radio button for capacity
  var capacityInput = document.createElement("INPUT");
  capacityInput.setAttribute("type", "radio");
  capacityInput.setAttribute("name", "capacity");
  capacityInput.setAttribute("value", "1-5");
  controlUI.appendChild(capacityInput);
  var capacityLabel = document.createElement("label");
  capacityLabel.innerHTML = "1-5";
  controlUI.appendChild(capacityLabel);
  var capacityInput = document.createElement("INPUT");
  capacityInput.setAttribute("type", "radio");
  capacityInput.setAttribute("name", "capacity");
  capacityInput.setAttribute("value", "6-10");
  controlUI.appendChild(capacityInput);
  var capacityLabel = document.createElement("label");
  capacityLabel.innerHTML = "6-10";
  controlUI.appendChild(capacityLabel);
  var capacityInput = document.createElement("INPUT");
  capacityInput.setAttribute("type", "radio");
  capacityInput.setAttribute("name", "capacity");
  capacityInput.setAttribute("value", "10+");
  controlUI.appendChild(capacityInput);
  var capacityLabel = document.createElement("label");
  capacityLabel.innerHTML = "10+";
  controlUI.appendChild(capacityLabel);

  var cancelButton = document.createElement("BUTTON");
  cancelButton.setAttribute("name", "Cancel");
  cancelButton.innerText = "Cancel";
  cancelButton.onclick = function() {map.controls[google.maps.ControlPosition.TOP_CENTER].pop(); markers[markers.length-1].setMap(null); markers.pop();};
  controlUI.appendChild(cancelButton);
  // Submit button
  var submitButton = document.createElement("BUTTON");
  submitButton.setAttribute("name", "Submit");
  submitButton.innerText = "Submit";
  submitButton.onclick = function() {submitCapacity();};
  controlUI.appendChild(submitButton);
}
// /**
// * Starting point for running the program. Authenticates the user.
// * @param {function()} onAuthSuccess - Called when authentication succeeds.
// */
function initAuthentication(onAuthSuccess) {
  firebase.auth().signInAnonymously().catch(function(error) {
      console.log(error.code + ", " + error.message);
  }, {remember: 'sessionOnly'});

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      data.sender = user.uid; // Adds sender to firebase data
      onAuthSuccess();
    } else {
      // User is signed out.
    }
  });
}
function addToFirebase(data) {
  getTimestamp(function(timestamp) {
    // Add the new timestamp to the record data.
    data.timestamp = timestamp;
    var ref = firebase.database().ref('clicks').push(data, function(err) {
      if (err) {  // Data was not written to firebase.
        console.warn(err);
      }
    });
  });
}
function getTimestamp(addClick) {
  // Reference to location for saving the last click time.
  var ref = firebase.database().ref('last_message/' + data.sender);

  ref.onDisconnect().remove();  // Delete reference from firebase on disconnect.

  // Set value to timestamp.
  ref.set(firebase.database.ServerValue.TIMESTAMP, function(err) {
    if (err) {  // Write to last message was unsuccessful.
      console.log(err);
    } else {  // Write to last message was successful.
      ref.once('value', function(snap) {
        addClick(snap.val());  // Add click with same timestamp.
      }, function(err) {
        console.warn(err);
      });
    }
  });
}

function initFirebase(markers) {
  // Reference to the clicks in Firebase.
  var clicks = firebase.database().ref('clicks');
  console.log(clicks);

  // Listen for clicks and add them to the map.
  clicks.orderByChild('timestamp').on('child_added',
    function(snapshot) {
      // Get that click from firebase.
      var newPosition = snapshot.val();
      console.log(newPosition);
      var point = new google.maps.LatLng(newPosition.lat, newPosition.lng);

      // Add the point to the map.
      console.log(markers.length);
      var newMarker = new google.maps.Marker({
          map: map,
          position: point,
      });
      markers.push(newMarker);

      newMarker.addListener('click', function() {
        var capacityInfo = "Capacity: " + newPosition.capacity;
        console.log(newPosition);
        console.log(newPosition.capacity);
        var contentString = '<div id="content">'+
              '<div id="siteNotice">'+
              '</div>'+
              '<div id="bodyContent">'+
              capacityInfo+
              '<p class="marker-lat">Lat:' + newMarker.position.lat()+ '</p>'+
              '<p class="marker-lng">Lng:' + newMarker.position.lng()+ '</p>'+
              '<br>'+
              '<button onClick="">Edit Rack</button>'+
              '<button onClick="deleteMarker()">Delete Rack</button>'+
              '</div>'+
              '</div>';

        var infowindow = new google.maps.InfoWindow({
          content: contentString
        });
        infoWindows.push(infowindow);
        infowindow.open(map, newMarker);
      });
      // // Request entries older than expiry time (10 minutes).
      // var expiryMs = Math.max(60 * 10 * 1000 - elapsedMs, 0);
      // // Set client timeout to remove the point after a certain time.
      // window.setTimeout(function() {
      //   // Delete the old point from the database.
      //   snapshot.ref.remove();
      // }, expiryMs);
    }
  );
}
