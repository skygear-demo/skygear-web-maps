var map;
var openedBubble;
var map;
var displayedStationMarkers = [];

var buslist = [ "1", "1A", "2", "2A", "2B", "2D", "2E", "2F", "2X", "3B", "3C", "3D", "3M", "3S", "3X", "5", "5A", "5C", "5D", "5M", "5P", "5R", "5X", "6", "6C", "6D", "6F", "6P", "7", "7B", "7M", "8", "8A", "8P", "9", "10", "11", "11B", "11C", "11D", "11K", "11X", "12", "12A", "13D", "13M", "13P", "13X", "14", "14B"];

function initRouteOptions() {
  routeOptionEl = document.getElementById("route-options");

  for (var i in buslist) {
    var s = `<a class="bus-option" href="#${buslist[i]}" data-route="${buslist[i]}">${buslist[i]}<a>`; // HTML string

    var li = document.createElement('li');
    li.innerHTML = s;
    routeOptionEl.append(li);
  }

  var class_names= document.getElementsByClassName("bus-option");

  for (var i = 0; i < class_names.length; i++) {
      class_names[i].addEventListener('click', function(e) {
        var route = e.target.dataset["route"];
        queryRoute(route);
      }, false);
  }
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 2,
    center: new google.maps.LatLng(2.8,-187.3),
    mapTypeId: google.maps.MapTypeId.HYBRID
  });
}

function removeMarkers() {
  for (i in displayedStationMarkers) {
    displayedStationMarkers[i].setMap(null);
  }

  displayedStationMarkers = [];
}

function renderStations(stations) {
  removeMarkers();

  var bounds  = new google.maps.LatLngBounds();

  for(station of stations) {
    let marker = new google.maps.Marker({
      position: new google.maps.LatLng(parseFloat(station.lat), parseFloat(station.lng)),
      title: station.location_tc,
      icon: './location_24x24.png'
    });
    loc = new google.maps.LatLng(marker.position.lat(), marker.position.lng());
    //bounds.extend(loc);

    var contentString = '<div id="content">'+
        '<div id="siteNotice">'+
        '</div>'+
        '<h3 id="firstHeading" class="firstHeading">'+station.location_tc+'</h3>'+
        '<div id="bodyContent">'+
        '<p>'+station.location_en+'</p>'+
        '<ul class="comment-list"></ul>'+
        '<form class="leave-msg">Leave Comment: <input type="text" class="message" />'+
        '<br><button type="submit" class="message mui-btn--small mui-btn mui-btn--raised mui-btn--accent">Send</button>'+
        '</form></div>'+
        '</div>';

        var infowindow = new google.maps.InfoWindow({
          content: contentString
        });

        bounds.extend(loc);
        marker.bubble = infowindow;
        marker.setMap(map);
        marker.station = station;

        marker.addListener('click', function() {
          this.bubble.open(map, this);
          if (openedBubble && this.bubble != openedBubble) {
            openedBubble.close()
          }
          openedBubble = this.bubble;

          var leaveMsg = document.querySelector(".leave-msg");
          if (leaveMsg){
            leaveMsg.addEventListener("submit", submitComment);
            leaveMsg.setAttribute('data-station', this.station._id);
          }

          queryComments(this.station._id);
        
        });

        displayedStationMarkers.push(marker);
  }

  map.fitBounds(bounds);
  map.panToBounds(bounds);
}

function submitComment(e) {
  e.preventDefault();

  var station = e.target.dataset["station"]
  var messageEl = e.target.querySelector(".message");
  var comment = messageEl.value;
  messageEl.value = "";
  saveComment(station, comment);
}

function queryComments(stationId) {

  var commentList = document.querySelector("#bodyContent .comment-list");

  // Remove list
  while (commentList.firstChild) {
    commentList.removeChild(commentList.firstChild);
  }

  const Comment = skygear.Record.extend('comment');
  const query = new skygear.Query(Comment);
  query.equalTo('station', stationId);
  query.addAscending('_updated_at');

  skygear.publicDB.query(query).then((records) => {
    if (records.length == 0) {
      var li = document.createElement('li');
      li.textContent = "No Comments.";
      commentList.appendChild(li);
    } else {
      var recordSize = records.length;
      for (var i = 0; i < recordSize; i++) {
        var li = document.createElement('li');
        li.textContent = records[i].msg;
        commentList.appendChild(li)
      }
    }
  }, (error) => {
    console.error(error);
  });

}

function saveComment(stationId, msg) {
  const Comment = skygear.Record.extend('comment');
  const comment = new Comment({
                      'msg': msg,
                      'station': stationId
                  });

  skygear.publicDB.save(comment).then((record) => {
      queryComments(stationId); // Reload the comment view
    }, (error) => {
      console.error(error);
    });

}

function queryRoute(routeNo) {
  const Station = skygear.Record.extend('station');
  const query = new skygear.Query(Station);
  query.equalTo('route', routeNo);
  query.addAscending('seq');
  skygear.publicDB.query(query).then((records) => {

    if (records.length == 0) {
      showAlert(`No records found for: ${routeNo}`);
    } else {
      renderStations(records);
      var busNow= document.getElementById("bus-now");
      busNow.innerHTML=`Stations for: ${routeNo}` ;
    }
  }, (error) => {
    console.error(error);
  });
}

function showAlert(message) {
  // initialize modal element
  var modalEl = document.createElement('div');
  modalEl.style.width = '200px';
  modalEl.style.height = '100px';
  modalEl.style.margin = '100px auto';
  modalEl.style.padding = '20px';
  modalEl.style.backgroundColor = '#fff';
  modalEl.innerHTML = `<p>${message}</p>`

  // show modal
  mui.overlay('on', modalEl);
}

function init () {
  skygear.config({
    'endPoint': 'https://busmap.skygeario.com/', // trailing slash is required
    'apiKey': 'ee5e2fe67bd34e14ba0455a4c462aa3d',
  }).then(() => {
    console.log('skygear container is now ready for making API calls.');
    skygear.auth.signupAnonymously().then(function(user, error){
      queryRoute("12A");
    });
    
  }, (error) => {
    console.error(error);
  });
}

initRouteOptions();
init();