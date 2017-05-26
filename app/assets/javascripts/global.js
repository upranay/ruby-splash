$(document).ready(function(){

})

var postgres = {

    meetingData: null,
    getAndSetMeetingLocationsData: function (date) {
		 $.blockUI({
            css: {
                border: 'none',
                padding: '10px 10px 15px 10px',
                backgroundColor: '#000',
                '-webkit-border-radius': '10px',
                '-moz-border-radius': '10px',
                opacity: .5,
                color: '#fff'
            }
        });
		 if($('.date-picker').data('date') != '01/01/1902') {
             $.ajax({
                 url: "/waypoint/waypoint.json",
                 type: "get",
                 data: {"date": "'" + $('.date-picker').data('date') + "'"},
                 success: function (response) {
                     var obj = JSON.parse(response[0].meeting_data);
                     postgres.meetingData = obj;
                     gMap.resetMap();
                     $.unblockUI()
                     if (obj) {
                         gMap.renderRouteData(obj);
                     }
                     else {
                         swal('No engagements', 'No engagements on ' + $('.date-picker').data('date'), 'info');
                     }
                 },
                 error: function (xhr) {
                     //Do Something to handle error
                     $.unblockUI()
                     swal('Error', 'Error in getting meeting data.', 'error');
                 }
             });
         }
    },

}

var gMap = {

    map: null,
    directionsRendererService: "",
    directionsService: "",
    distanceMatrixService: "",
    // waypts: [],
    latlongArrayGlobal: [],
    markers: [],
    infoWindows: [],
	
	
    //loads the map and binds it to the provided element and initiates direction components
    loadMap: function (mapContainer) {

        gMap.map = new google.maps.Map(mapContainer, {
            zoom: 6,
            center: { lat: 21.1458, lng: 79.0882 }
        });

        gMap.directionsService = new google.maps.DirectionsService;
        gMap.directionsRendererService = new google.maps.DirectionsRenderer({ suppressMarkers: true });
        gMap.distanceMatrixService = new google.maps.DistanceMatrixService;
    },

    resetMap: function () {
        gMap.directionsRendererService.setMap(null);
		gMap.directionsRendererService = new google.maps.DirectionsRenderer({ suppressMarkers: true });

        for (var i = 0; i < gMap.markers.length; i++) {
            gMap.markers[i].setMap(null);
        }

        for (var i = 0; i < gMap.infoWindows.length; i++) {
            gMap.infoWindows[i].close();
        }

        gMap.markers = [];
        gMap.infoWindows = [];
		// gMap.waypts = []
    },


    renderRouteData: function (meetingData) {
        gMap.directionsRendererService.setMap(gMap.map);
        var latlongarray = [];
        var meetingContentArray = [];
        var locationTitles = [];

        //segregating meeting data for lat-long and meeting content
        for (var i = 0; i < meetingData.length; i++) {
			var lat = meetingData[i].geometry.coordinates[1];
			var long = meetingData[i].geometry.coordinates[0];

            latlongarray.push(new google.maps.LatLng(lat, long));

            var meetingContentHTML = '<div>' +
                '<div class="infowindow"><p><b>' + meetingData[i].title + '</b></p></div>' +
                '<p><span style="font-weight:bold;color:fff">Start</span>: ' + meetingData[i].start + '</p>' +
                '<p><span style="font-weight:bold;color:fff">End</span>: ' + meetingData[i].end + '</p>' +
                '<br/>' +
                '<p><span style="font-weight:bold;color:fff">Location</span>: ' + meetingData[i].loc_name + '</p>' +
                '</div>';

            meetingContentArray.push(meetingContentHTML);

            locationTitles.push(meetingData[i].loc_name);
        }

        gMap.latlongArrayGlobal = latlongarray;

		gMap.waypts = []
		if (latlongarray.length > 2) {

            var waypts = []
            for (i = 1; i < latlongarray.length - 1; i++) {
                waypts.push({ location: latlongarray[i], stopover: true })

            }

            gMap.directionsService.route({
                origin: latlongarray[0],
                destination: latlongarray[latlongarray.length - 1],
                waypoints: waypts,
                optimizeWaypoints: false,
                travelMode: 'DRIVING'
            }, function (response, status) {
                if (status === 'OK') {
                    console.log(response)
                    gMap.directionsRendererService.setDirections(response);
                }
                //  console.log(response, status)
            });

        }
        console.log(latlongarray.length)
        if (latlongarray.length == 1) {
            gMap.display_marker(latlongarray[0], meetingContentArray[0], locationTitles[0], 1)
            gMap.map.setCenter(latlongarray[0], 6)
        }
        else {
            for (var i = 0; i < latlongarray.length - 1; i++) {

                gMap.apply_direction_service(latlongarray[i], latlongarray[i + 1]);
                               
                gMap.display_marker(latlongarray[i], meetingContentArray[i], locationTitles[i], (i + 1))

                if (i == latlongarray.length - 2) {
                    gMap.display_marker(latlongarray[i + 1], meetingContentArray[i + 1], locationTitles[i + 1], (i + 2))
                }

            }
        }

    },

    //uses direction service to get middle location of route between provided source and dest - middle location is used to show distnace and hours between source and dest
    apply_direction_service: function (sourcelatlong, destlatlong) {


        var middle = "";

        gMap.directionsService.route({
            origin: sourcelatlong,
            destination: destlatlong,
            travelMode: google.maps.DirectionsTravelMode.DRIVING
        }, function (response, status) {
            if (status === 'OK') {
                if (gMap.latlongArrayGlobal.length < 3) {
                    gMap.directionsRendererService.setDirections(response);
                }
                var m = Math.ceil((response.routes[0].overview_path.length) / 2)
                middle = response.routes[0].overview_path[m]

                gMap.apply_direction_matrix(middle, sourcelatlong, destlatlong)
                //callback(middle, sourcelatlong, destlatlong);
            }
            else {
                swal('Error', 'Direction request failed due to ' + status, 'error');
            }
        });
    },


    apply_direction_matrix: function (middle, sourcelatlong, destlatlong) {

        //var service = new google.maps.DistanceMatrixService;
        gMap.distanceMatrixService.getDistanceMatrix({
            origins: [sourcelatlong],
            destinations: [destlatlong],
            travelMode: 'DRIVING',
            unitSystem: google.maps.UnitSystem.IMPERIAL
        }, function (response, status) {
           // console.log(response)
            if (status === 'OK') {
                var originlist = response.originAddresses;
                var destinationllist = response.destinationAddresses;
                for (var i = 0; i < originlist.length; i++) {
                    var results = response.rows[i].elements;
                    for (var j = 0; j < results.length; j++) {
                        var element = results[j]
                        var dt = element.distance.text;
                        var dr = element.duration.text;

                    }
                }

                //callback(middle, dt, dr);
                gMap.displayinfowindow(middle, dt, dr)

            } else {
                swal('Error', 'Distance matrix request failed due to ' + status, 'error');
            }
        });

    },


    display_marker: function (latlong, displayContentHTML, markerTitle, index) {

        var infowindow = new google.maps.InfoWindow({
            content: displayContentHTML
        });

        var marker = new google.maps.Marker({
            position: latlong,
            map: gMap.map,
            title: markerTitle,
            label: "" + index + ""
        });

        gMap.markers.push(marker);

        marker.addListener('click', function () {
            infowindow.open(gMap.map, marker);
        });
    },


    //displays infowindow
    displayinfowindow: function (latlong, dt, dr) {
        var content = '<div><i class="fa fa-car" aria-hidden="true" style="margin-right:3px;"></i>' + dt +
            '<br>' + dr +
            '</div>';
        var infowindow1 = new google.maps.InfoWindow({
            content: content
        });
        //infowindow1.setContent(content)
        infowindow1.setPosition(latlong)
        infowindow1.open(gMap.map)

        gMap.infoWindows.push(infowindow1);

    },


    geolocate: function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var geolocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                var circle = new google.maps.Circle({
                    center: geolocation,
                    radius: position.coords.accuracy
                });
                autocomplete.setBounds(circle.getBounds());

            });
        }

    }
}

