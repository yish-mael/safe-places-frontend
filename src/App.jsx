import 'mapbox-gl/dist/mapbox-gl.css'
import 'mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import mapbox from 'mapbox-gl'
import MapboxGeocoder from 'mapbox-gl-geocoder';
import axios from 'axios';

mapbox.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function App() {
  
  const geocoderRef = useRef(null);
  const [lon, setLon] = useState(-95.3698);
  const [lat, setLat] = useState(29.7604);
  const [zoom, setZoom] = useState(10);
  // const [safetyResult, setSafetyResult] = useState({busy: 0, covid: 0, population: 0, deaths: 0, safety: "..."});

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
      const harrisFeatures = harrisResponse.data.data.features;

      for(let i = 0; i < harrisFeatures.length; i++ )
      {
        // console.log(harrisFeatures[i].properties.ZIP);
        // console.log(search.zip);
        if(harrisFeatures[i].properties.ZIP == search.zip)
        {
          activeCovid = harrisFeatures[i].properties.ActiveCases;
          population = harrisFeatures[i].properties.TotalPop;
          covidDeaths = harrisFeatures[i].properties.Death;

          let population20 = population/20;
          let result = (activeCovid/population20) * 100;

          if(result < 6.7) safety = ` <span class='bg-success text-white px-3 py-1 fw-bold rounded-pill'>Low Risk</span>`; 
          else if(result > 13.3) safety = ` <span class='bg-danger text-white px-3 py-1 fw-bold rounded-pill'>High Risk</span>`;
          else safety = ` <span class='bg-warning text-white px-3 py-1 fw-bold rounded-pill'>Medium Risk</span>`;
        }
      }
      let busyTime = "N/A";
      if(busyResponse.data.populartimes) busyTime = busyResponse.data.populartimes[day-1].data[hours] ;

      return {
        busy: busyTime,
        covid: activeCovid,
        population: population,
        deaths: covidDeaths,
        safety: safety,
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

      map.addControl(
        new mapbox.GeolocateControl({
          positionOptions: {
          enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
          }
        ));
          
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

      new mapbox.Marker().setLngLat(event.result.center).addTo(map).setPopup(popup);
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

    new mapbox.Marker().setLngLat([lon, lat]).addTo(map);
    
  }


  useEffect(() => {
    generateMap(lon, lat, zoom);
  }, [lon, lat, zoom]);

 
  return (
    <div className="App">
        
        <div className='top-bar'>

          <form className="row row-cols-lg-auto g-3 align-items-center" onSubmit={(event) => { event.preventDefault }}>

            <div className="col-12" ref={geocoderRef}></div>

            <div className="col-12">
              <label className="visually-hidden" htmlFor="inlineFormSelectPref">Radius</label>
              <select className="form-select form-select-sm" id="inlineFormSelectPref">
                <option value="0.1">0.1 Miles</option>
                <option value="0.5">0.5 Miles</option>
                <option value="5">5 Miles</option>
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
