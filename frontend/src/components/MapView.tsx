import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { Flight, TrackPoint } from '../services/api';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const getAirplaneIcon = (rotation: number = 0, isSelected: boolean = false) => {
    const color = isSelected ? '#61dafb' : '#f5f5f5';
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="transform: rotate(${rotation}deg);"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${color}"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const ChangeView: React.FC<{ center: LatLngExpression; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

interface MapViewProps {
    flights: Flight[];
    selectedFlight: Flight | null;
    onFlightSelect: (icao24: string) => void;
    center: [number, number];
    flightHistory: TrackPoint[];
    showWeather: boolean;
    apiKey: string;
}

const MapView: React.FC<MapViewProps> = ({ flights, selectedFlight, onFlightSelect, center, flightHistory, showWeather, apiKey }) => {
    const position: LatLngExpression =
        selectedFlight && selectedFlight.latitude && selectedFlight.longitude
            ? [selectedFlight.latitude, selectedFlight.longitude]
            : center;
    const zoom = selectedFlight ? 12 : 9;

    return (
        <MapContainer center={position} zoom={zoom} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
            <ChangeView center={position} zoom={zoom} />
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {showWeather && apiKey && (
                <TileLayer
                    url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`}
                    attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
                    opacity={0.6}
                />
            )}
            {flightHistory && flightHistory.length > 0 && (
                <Polyline
                    pathOptions={{ color: '#61dafb', weight: 3 }}
                    positions={flightHistory.map(p => [p.latitude, p.longitude])}
                />
            )}
            {flights.map(flight => {
                if (!flight.latitude || !flight.longitude) return null;
                const isSelected = selectedFlight?.icao24 === flight.icao24;
                const icon = getAirplaneIcon(flight.true_track ?? 0, isSelected);

                return (
                    <Marker
                        key={flight.icao24}
                        position={[flight.latitude, flight.longitude]}
                        icon={icon}
                        eventHandlers={{
                            click: () => onFlightSelect(flight.icao24),
                        }}
                        zIndexOffset={isSelected ? 1000 : 0}
                    >
                        <Popup>
                            <div className="popup-content">
                                <strong>{flight.callsign?.trim() || 'N/A'}</strong> ({flight.icao24})
                                <hr />
                                <p><strong>Origin:</strong> {flight.origin_country}</p>
                                <p><strong>Altitude:</strong> {flight.altitude ? `${flight.altitude} m` : 'N/A'}</p>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
};

export default MapView;
