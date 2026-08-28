// @ts-nocheck
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function Map({ shows }: { shows: any[] }) {
  const centerLat = shows.length > 0 && shows[0].latitude ? shows[0].latitude : 37.2707;
  const centerLon = shows.length > 0 && shows[0].longitude ? shows[0].longitude : -79.9414;

  return (
    <MapContainer
      center={[centerLat, centerLon]}
      zoom={11}
      scrollWheelZoom={false}
      className="w-full h-[500px] rounded-lg z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shows.map((show) => {
        if (!show.latitude || !show.longitude) return null;
        return (
          <Marker key={show.id} position={[show.latitude, show.longitude]} icon={defaultIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="font-bold">{show.title}</strong>
                <p className="text-xs text-gray-600 mt-1">{show.address}</p>
                <a href={`/event/${show.id}`} className="text-blue-600 text-xs font-semibold underline mt-2 block">
                  View Details →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}