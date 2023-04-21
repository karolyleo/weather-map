"use strict"
let latLong = [-98.4916, 29.4252]; //default is San Antonio

mapboxgl.accessToken = keys.mapbox;// easier access to my key
const coordinates = document.getElementById('coordinates'); //or $('#coordinates')
let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/karolleo000/cld93zwc1001r01oe4192n12v',
    zoom: 10,  //So we can see most of Texas
    center: latLong //starting position in San Antonio
})

const canvas = map.getCanvasContainer();

let geojson = {
    'type': 'FeatureCollection',
    'features': [
        {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': latLong
            }
        }
    ]
};

map.on('load', () => {
// Add a single point to the map.
    map.addSource('point', {
        'type': 'geojson',
        'data': geojson
    });

    map.addLayer({
        'id': 'point',
        'type': 'circle',
        'source': 'point',
        'paint': {
            'circle-radius': 10,
            'circle-color': '#F84C4C' // red color
        }
    });

// When the cursor enters a feature in the point layer, prepare for dragging.
    map.on('mouseenter', 'point', () => {
        map.setPaintProperty('point', 'circle-color', '#6ac12e');
        canvas.style.cursor = 'move';
    });

    map.on('mouseleave', 'point', () => {
        map.setPaintProperty('point', 'circle-color', '#3bb2d0');
        canvas.style.cursor = '';
    });

    map.on('mousedown', 'point', (e) => {
// Prevent the default map drag behavior.
        e.preventDefault();

        canvas.style.cursor = 'grab';

        map.on('mousemove', onMove);
        map.once('mouseup', onUp);
    });

    map.on('touchstart', 'point', (e) => {
        if (e.points.length !== 1) return;

// Prevent the default map drag behavior.
        e.preventDefault();
        map.on('touchmove', onMove);
        map.once('touchend', onUp);
    });
});

let weatherData = {
    updatePage: function (city) {
        $.get("http://api.openweathermap.org/data/2.5/weather", {
            APPID: keys.openWeather,
            q: city,
            units: "imperial"
        }).done(function (data) {
            latLong = [data.coord.lon, data.coord.lat];
            geojson.features[0].geometry.coordinates = latLong;
            updateToday(data);

            map.flyTo({
                center: data.coord,
                essential: true, // this animation is considered essential with respect to prefers-reduced-motion
                zoom: 10
            })
                .getSource('point').setData(geojson);
        });
        $.get("http://api.openweathermap.org/data/2.5/forecast", {
            APPID: keys.openWeather,
            q: city,
            units: "imperial"
        }).done(function (data) {
            updateWeekly(data.list);
        });
    },
    updatePageCoord: function (coord) {
        //for today's weather
        $.get("http://api.openweathermap.org/data/2.5/weather", {
            APPID: keys.openWeather,
            lon: coord.lng.toFixed(3),
            lat: coord.lat.toFixed(3),
            units: "imperial"
        }).done(function (data) {
            latLong = [data.coord.lon, data.coord.lat];
            updateToday(data);
            //For repositioning
            map.flyTo({
                center: data.coord,
                essential: true // this animation is considered essential with respect to prefers-reduced-motion
            });
        })// .catch(error => console.log(error));

        //For weekly Forecast
        $.get("http://api.openweathermap.org/data/2.5/forecast", {
            APPID: keys.openWeather,
            lon: coord.lng.toFixed(3),
            lat: coord.lat.toFixed(3),
            units: "imperial"
        }).done(function (data) {
            updateWeekly(data.list);
        });
    }
}
weatherData.updatePage('San Antonio');

//btn or enter to update the page for city search
$("#searchButton").click(function () {
    weatherData.updatePage($('#citySearch').val());
})
$('#citySearch').on('keypress', function (e) {
    if (e.which === 13) { //This is so it ony works on 'enter' key
        weatherData.updatePage($('#citySearch').val());
    }
});

//btn for populating map
$('#mapBtn').click(function () {
    $('#weatherBoxes').toggleClass('flex-column');
    $('#mapDiv').toggleClass('visually-hidden');
    map.resize();
});

//This is to update the first card inputs
function updateToday(info) {
    let currentTemp = info.main.temp.toFixed(0),
        temp = info.main.temp_min + '°F / ' + info.main.temp_max + '°F';

    $('h2').children('strong').html(currentTemp + '°F');
    $('#locationName').html(info.name);
    $('#weatherType').html(`
          ${info.weather[0].main}
          <img id="mainIcon" src="https://openweathermap.org/img/wn/${info.weather[0].icon}.png" alt="" class="icon" />
          <p class="mb-0 text-xs text-muted">${info.weather[0].description}</p>
          <p class="mb-0 text-xs"><strong>${temp}</strong></p>
          <p class="mb-0 text-xs text-muted">Wind(mph) /  Pressure(hPa)</p>
          <p class="mb-0 text-xs"><strong>${info.wind.speed + '  /  ' + info.main.pressure}</strong></p>
            <p class="mb-0 text-xs text-muted">Humidity: <strong class="small">${info.main.humidity}%</strong></p>`
    )
    // console.log(currentTemp, info.name); //.main.temp for current temp & .name for location
}

//updating second card
function updateWeekly(weeklyInfo) {
    $('#weeklyTemp').empty();
    for (let i = 7; i < weeklyInfo.length; i += 8) {
        let date = weeklyInfo[i].dt_txt.split(' '),
            temp = weeklyInfo[i].main.temp_min + '°F / ' + weeklyInfo[i].main.temp_max + '°F',
            dayOfTheWeek = getDayAbbr(date[0]);
        $('#weeklyTemp').append(`
        <div class="flex-column p-1 m-0">
          <p class="mb-0"><strong>${dayOfTheWeek}</strong></p>
          <p class="mb-0 text-xs text-muted">${date[0]}</p>
          <p class="mb-0 text-xs">${weeklyInfo[i].weather[0].main} <img src="https://openweathermap.org/img/wn/${weeklyInfo[i].weather[0].icon}.png" alt="" class="icon" /></p>
          <p class="mb-0 text-xs text-muted">${weeklyInfo[i].weather[0].description}</p>
          <p class="mb-0 text-xs"><strong>${temp}</strong></p>
          <p class="mb-0 text-xs text-muted">Wind(mph) /  Pressure(hPa)</p>
          <p class="mb-0 text-xs"><strong>${weeklyInfo[i].wind.speed + '  /  ' + weeklyInfo[i].main.pressure}</strong></p>
          <p class="mb-0 text-xs text-muted">Humidity: <strong class="small">${weeklyInfo[i].main.humidity}%</strong></p>
        </div>`)
    }
}

//Turns '2023-01-24' format into 'tues'
function getDayAbbr(date) {
    let daysAbbr = {
        "Sun": "Sun",
        "Mon": "Mon",
        "Tue": "Tue",
        "Wed": "Wed",
        "Thu": "Thu",
        "Fri": "Fri",
        "Sat": "Sat"
    }
    let dateObject = new Date(date);
    let options = {timeZone: 'UTC', weekday: 'short'};
    let day = new Intl.DateTimeFormat('en-US', options).format(dateObject);
    return daysAbbr[day];
}

//interactive pin on map functions
function onMove(e) {
    let coords = e.lngLat;

// Set a UI indicator for dragging.
    canvas.style.cursor = 'grabbing';

// Update the Point feature in `geojson` coordinates
// and call setData to the source layer `point` on it.
    geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
    map.getSource('point').setData(geojson);
}

function onUp(e) {
    let coords = e.lngLat;

// Print the coordinates of where the point had
// finished being dragged to on the map.
    coordinates.style.display = 'block';
    coordinates.innerHTML = `Longitude: ${coords.lng}<br />Latitude: ${coords.lat}`;
    canvas.style.cursor = '';
    map.flyTo({
        center: coords,
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
    weatherData.updatePageCoord(coords);
    // helper = reverseGeocode(coords,keys.mapbox)
    // console.log(helper, coords);

// Unbind mouse/touch events
    map.off('mousemove', onMove);
    map.off('touchmove', onMove);
}