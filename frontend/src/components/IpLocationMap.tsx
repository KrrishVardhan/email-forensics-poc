import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Leaflet's default marker icon references image files via relative paths
// that don't resolve correctly under Vite's bundling — this is a very
// common Leaflet+Vite gotcha. Rebuilding the icon from CDN URLs avoids the
// classic "no marker shows up, just a broken image icon" symptom.
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface IpLocationMapProps {
  lat: number;
  lon: number;
  label: string;
}

export function IpLocationMap({ lat, lon, label }: IpLocationMapProps) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={5}
      scrollWheelZoom={false}
      style={{ height: "300px", width: "100%", borderRadius: "0rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]} icon={markerIcon}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}
