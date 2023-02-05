import 'mapbox-gl/dist/mapbox-gl.css'
import 'mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import mapbox from 'mapbox-gl'
import MapboxGeocoder from 'mapbox-gl-geocoder';

mapbox.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function App() {
  
  const geocoderRef = useRef(null);
  const [lon, setLon] = useState(-95.3698);
  const [lat, setLat] = useState(29.7604);
  const [zoom, setZoom] = useState(10);
  const [details, setDetails] = useState({name: "Huston"});


  async function calculateRisk(search){
    
  }

  async function generateMap( lon, lat, zoom, details) {

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
    
    geocoder.on('result', (event) => {
      map.getSource('single-point').setData(event.result.geometry);
      console.log("hello: ", event.result)

      const popup = new mapbox.Popup({ closeOnClick: false })
                    .setHTML("<div><span class='bg-danger text-white px-3 py-1 fw-bold rounded-pill'>High Risk</span><p><h6>"+event.result.text+"</h6>"+ event.result.place_name + "</p></div>")
                    .addTo(map);
      new mapbox.Marker().setLngLat(event.result.center).addTo(map).setPopup(popup);
    });
    new mapbox.Marker().setLngLat([lon, lat]).addTo(map);

  }


  useEffect(() => {
    generateMap(lon, lat, zoom, details);
  }, [lon, lat, zoom, details]);

 
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
