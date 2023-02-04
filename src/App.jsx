import { useEffect, useRef, useState } from 'react'
import mapbox from 'mapbox-gl'

mapbox.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function App() {

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lon, setLon] = useState(-95.3698);
  const [lat, setLat] = useState(29.7604);
  const [zoom, setZoom] = useState(10);
  const [details, setDetails] = useState({name: "Huston"});

  async function generateMap(map, mapContainer, lon, lat, zoom, details) {

    map.current = new mapbox.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [lon, lat],
        zoom: zoom
    });

    const popup = new mapbox.Popup().setHTML("<b>"+ details.name + "</b>");
    new mapbox.Marker({ "color": "#BB2D3A" }).setLngLat([lon, lat]).addTo(map.current).setPopup(popup);
    return () => map.current.remove();

  }


  useEffect(() => {
    generateMap(map, mapContainer, lon, lat, zoom, details);
  }, [lon, lat, zoom, details]);

 
  return (
    <div className="App">
        <div ref={mapContainer} className="map-box"></div>

        <div className='top-bar'>

          <form class="row row-cols-lg-auto g-3 align-items-center">

            <div class="col-12">
              <label class="visually-hidden" for="inlineFormInputGroupUsername">Search</label>
              <input type="text" class="form-control form-control-sm" placeholder="Search..." />
              
            </div>

            <div class="col-12">
              <label class="visually-hidden" for="inlineFormSelectPref">Radius</label>
              <select class="form-select form-select-sm" id="inlineFormSelectPref">
                <option value="0.1">0.1 Miles</option>
                <option value="0.5">0.5 Miles</option>
                <option value="5">5 Miles</option>
              </select>
            </div>
            
            <div class="col-12">
              <button type="submit" class="btn btn-sm px-4 btn-danger rounded-pill"><b>Submit</b></button>
            </div>
          </form>

        </div>
    </div>
  )
}

export default App
