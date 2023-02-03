import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import Map from 'react-map-gl'

function App() {

  return (
    <div className="App">
        <h1>Safe Places</h1>

        <Map
          initialViewState={{
            longitude: -100,
            latitude: 40,
            zoom: 3.5
          }}
          style={{width: 600, height: 400}}
          mapStyle="mapbox://styles/mapbox/streets-v9"
          mapboxAccessToken='' 
        />


    </div>
  )
}

export default App
