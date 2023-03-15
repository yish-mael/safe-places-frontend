import 'mapbox-gl/dist/mapbox-gl.css'
import 'mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { useEffect, useRef, useState } from 'react'
import mapbox from 'mapbox-gl'
import MapboxGeocoder from 'mapbox-gl-geocoder';
import axios from 'axios';

mapbox.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const googleToken = import.meta.env.VITE_GOOGLE_API;


function App() {
  
  const zoom = 12;
  const geocoderRef = useRef(null);
  const [lon, setLon] = useState(-95.3698);
  const [lat, setLat] = useState(29.7604);
  const [display, setDisplay] = useState('d-none');
  const [geocoderD, setGeocoderD] = useState('');

  function handleLocation(){
    navigator.geolocation.getCurrentPosition(function(position) {
      setLon(position.coords.longitude);
      setLat(position.coords.latitude);
    });
  }

  async function handleRadiusSearch(event){

    event.preventDefault();

    if(display == 'd-none') return false;

    const data = new FormData(event.target);
    const formObject = Object.fromEntries(data.entries());
      
    const curMap = await generateMap(lon, lat, zoom);
    const popup =  new mapbox.Popup({closeOnClick: false})
                .setHTML(`<div><b>Loading results ...</b></div>`)
                .setLngLat([lon, lat])
                .addTo(curMap);
    const popup1 = new mapbox.Popup({closeOnClick: false});
    new mapbox.Marker({ "color": "#000000" }).setLngLat([lon, lat]).addTo(curMap).setPopup(popup);
    
    console.log("Latitude is :", lat);
    console.log("Longitude is :", lon);

    if(formObject.search == "") return false;  
    let loc = lat +" "+ lon;
    let store = { result: 1000000 };
  
    try
    {
      const placesResponse = await axios.get("http://127.0.0.1:8000/api/google/place?name="+formObject.search+"&location="+loc+"&radius="+formObject.radius);
      const predictions = placesResponse.data.data.predictions;
      // console.log("Predictions: ", placesResponse);

      for(let i = 0; i < predictions.length; i++){
        
        const placeDetails = await axios.get("https://maps.googleapis.com/maps/api/geocode/json?place_id="+predictions[i].place_id+"&key="+googleToken);
        // console.log(placeDetails.data);
        
        let zipcode = 0;
        
        let location = placeDetails.data.results[0].geometry.location;

        placeDetails.data.results[0]?.address_components.forEach(entry => {
          if (entry.types?.[0] === "postal_code")  zipcode = entry.long_name;
        });
        
        let risk = await calculateRisk({search: predictions[i].description, zip: zipcode});
        
        if(risk.result < store.result){
          store = risk;
          store.location = location;
          store.address = predictions[i].description;
          console.log("store: ", store);
        }

      }
      // console.log("here");
      popup.setHTML(`<b>Current Location.</b> <br> <b>Route: <a href="https://www.google.com/maps/dir/${store.address.replace(/\s+/g, '+')}/${loc.replace(/\s+/g, '+')}/" target="_blank">Click Here</a></b>`)
      popup1.setHTML(`<div>
      ${store.safety}
      <br /><br />  
      <p>
      <span style='font-size: 13px;'><b>Location: </b>${store.address}.</span>
      <br />
      <span style='font-size: 13px;'><b>Busy:</b> ${store.busy}</b>% (relative to peak period).</span>
      <br />
      <span style='font-size: 13px;'><b>Population: </b> ${store.population}</span>
      | 
      <span style='font-size: 13px;'><b>Active Covid: </b> ${store.covid}</span>
      | 
      <span style='font-size: 13px;'><b>Covid Deaths: </b> ${store.deaths}</span>
      </p>
      </div>`);
      
      new mapbox.Marker({ "color": "#b40219" }).setLngLat([store.location.lng, store.location.lat]).setPopup(popup1).addTo(curMap);
      // popup.remove();
      popup1.addTo(curMap);
      curMap.setCenter([store.location.lng, store.location.lat]).setZoom(14);

      curMap.addSource('route', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
              'type': 'LineString',
              'coordinates': [
                [lon, lat],
                [store.location.lng, store.location.lat]
              ]
            }
          }
        }).addLayer({
          'id': 'route',
          'type': 'line',
          'source': 'route',
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          }
      });

    }
    catch(e)
    {
      console.log(e);
    }
    
  }

  async function calculateRisk(search){

    try
    {
      const harrisResponse = await axios.get("http://127.0.0.1:8000/api/data");
      const busyResponse = await axios.get("http://127.0.0.1:8000/api/busy?address="+search.address);

      let activeCovid = 0;
      let population = 0;
      let covidDeaths = 0;
      let safety = "<span class='bg-secondary text-white px-3 py-1 fw-bold rounded-pill'>N/A</span>";
      
      const d = new Date();
      const day = d.getDay();
      const hours = d.getHours();
      const harrisFeatures = harrisResponse?.data?.data?.features;
      let result = 0;
      for(let i = 0; i < harrisFeatures.length; i++ )
      {
        if(harrisFeatures[i].properties.ZIP == search?.zip)
        {
          activeCovid = harrisFeatures[i].properties.ActiveCases;
          population = harrisFeatures[i].properties.TotalPop;
          covidDeaths = harrisFeatures[i].properties.Death;

          let population20 = population/20;
          result = (activeCovid/population20) * 100;

          if(result < 6.7) safety = ` <span class='bg-success text-white px-3 py-1 fw-bold rounded-pill'>Low Risk</span>`; 
          else if(result > 13.3) safety = ` <span class='bg-danger text-white px-3 py-1 fw-bold rounded-pill'>High Risk</span>`;
          else safety = ` <span class='bg-warning text-white px-3 py-1 fw-bold rounded-pill'>Medium Risk</span>`;
        }
      }

      let busyTime = "N/A";
      if(day == 0){
        if(busyResponse?.data?.populartimes) busyTime = busyResponse?.data?.populartimes[6]?.data[hours] ;
      }else{
        if(busyResponse?.data?.populartimes) busyTime = busyResponse?.data?.populartimes[day-1]?.data[hours] ;
      }
      return {
        busy: busyTime,
        covid: activeCovid,
        population: population,
        deaths: covidDeaths,
        safety: safety,
        result: result,
      };
    }
    catch(e)
    {
      console.log(e);
    }

  }

  async function generateMap( lon, lat, zoom) {

    const map = new mapbox.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lon, lat],
      zoom: zoom,
      addControl: new mapbox.GeolocateControl()
    });
    
    const geocoder = new MapboxGeocoder({
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      mapboxgl: mapbox,
    });
    geocoderRef.current.appendChild(geocoder.onAdd(map));
    
    map.on('load', () => {

      map.addSource('single-point', {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': []
        }
      });

      // map.addControl(
      //   new mapbox.GeolocateControl({
      //     positionOptions: {
      //     enableHighAccuracy: true
      //     },
      //     trackUserLocation: true,
      //     showUserHeading: true
      //     }
      //   ));
          
    });

    geocoder.on('result', async(event) => {

      let zip = event.result.context[0].text;

      if(event.result.context.length > 5){
        zip = event.result.context[1].text
      }

      map.getSource('single-point').setData(event.result.geometry);
      
      const popup = new mapbox.Popup({closeOnClick: false})
                    .setHTML(`<div><b>Loading results ...</b></div>`)
                    .setLngLat(event.result.center)
                    .addTo(map);

      new mapbox.Marker({ "color": "#b40219" }).setLngLat(event.result.center).addTo(map).setPopup(popup);
      const calcResult = await calculateRisk({address: event?.result?.place_name, zip: zip});

      if(calcResult)
      {
        popup.setHTML(`<div>
                  ${calcResult.safety}
                  <br /><br />  
                  <p>
                    <span style='font-size: 13px;'><b>Location: </b>${event.result.place_name}.</span>
                    <br />
                    <span style='font-size: 13px;'><b>Busy:</b> ${calcResult.busy}</b>% (relative to peak period).</span>
                    <br />
                    <span style='font-size: 13px;'><b>Population: </b> ${calcResult.population}</span>
                     | 
                    <span style='font-size: 13px;'><b>Active Covid: </b> ${calcResult.covid}</span>
                     | 
                    <span style='font-size: 13px;'><b>Covid Deaths: </b> ${calcResult.deaths}</span>
                  </p>
                </div>`);
      }
      else
      {
        popup.setHTML("<div><b>No data for this locaiton.</b></div>");
      }

    });

    new mapbox.Marker( {"color": "#000000"}).setLngLat([lon, lat]).addTo(map);

    return map;
    
  }


  useEffect(() => {
    generateMap(lon, lat, zoom);
  }, [lon, lat, zoom]);

 
  return (
    <div className="App">
        
        <div className='top-bar'>

          <form className="row row-cols-lg-auto g-3 align-items-center" onSubmit={handleRadiusSearch}>

            <div className={"col-12 "+geocoderD} ref={geocoderRef}></div>

            <div className={"col-12 "+display}>
              <label className="visually-hidden">Search </label>
              <input type="text" className="form-control" placeholder='Search' name="search" />
            </div>

            <div className="col-12">
              <label className="visually-hidden" htmlFor="inlineFormSelectPref">Search Type</label>
              <select className="form-select form-select-sm" name='searchType' id="inlineFormSelect" onChange={(e) => { handleLocation(); if(display=='d-none'){ setDisplay('');  setGeocoderD('d-none') } else { setDisplay('d-none'); setGeocoderD(''); } }} >
                <option value="single">Single</option>
                <option value="radius">Radius</option>
              </select>
            </div>

            <div className={"col-12 "+display }>
              <label className="visually-hidden" htmlFor="inlineFormSelectPref">Radius</label>
              <select className="form-select form-select-sm" name="radius" >
                <option value="804.672">0.5 Miles</option>
                <option value="1609.34">1 Miles</option>
                <option value="8046.72">5 Miles</option>
                <option value="16093.4">10 Miles</option>
                <option value="32186.9">20 Miles</option>
                <option value="48280.3">30 Miles</option>
                <option value="64373.8">40 Miles</option>
                <option value="80467.2">50 Miles</option>
              </select>
            </div>

            <div className="col-12">
              <button type="submit" className="btn btn-sm px-4 btn-danger rounded-pill"><b>Submit</b></button>
            </div>
          </form>
        </div>
        <div id="map" className="map-box"></div>
    </div>
  )
}

export default App;
