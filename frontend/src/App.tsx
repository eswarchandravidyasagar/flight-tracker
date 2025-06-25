import React, { useState, useEffect, useMemo, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Flight, getFlightsByCity, getFlightByIcao, getCoordsFromCity, TrackPoint, getFlightHistory } from './services/api';
import MapView from './components/MapView';
import FlightDetails from './components/FlightDetails';
import FlightChart from './components/FlightChart';

const OPENWEATHER_API_KEY = ""; // <<< --- INSERT YOUR OPENWEATHERMAP API KEY HERE

function App() {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
    const [flightHistory, setFlightHistory] = useState<TrackPoint[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showWeather, setShowWeather] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [city, setCity] = useState('Zurich');
    const [cityInput, setCityInput] = useState('Zurich');
    const [mapCenter, setMapCenter] = useState<[number, number]>([47.45, 8.56]); // Default to Zurich

    const fetchFlightsByCity = useCallback(async () => {
        if (!city) return;
        try {
            setLoading(true);
            setError(null);
            setSelectedFlight(null);

            const cityCoords = await getCoordsFromCity(city);
            setMapCenter([cityCoords.lat, cityCoords.lon]);

            const data = await getFlightsByCity(city);
            setFlights(data);
            if (data.length === 0) {
                setError(`No flights found near ${city}. Try another city.`);
            }
        } catch (err) {
            setError(`Failed to fetch flights for ${city}.`);
            console.error("Error fetching flights:", err);
        } finally {
            setLoading(false);
        }
    }, [city]);

    useEffect(() => {
        fetchFlightsByCity();
        const interval = setInterval(fetchFlightsByCity, 60000); // Auto-refresh every 60 seconds
        return () => clearInterval(interval);
    }, [fetchFlightsByCity]);

    const handleFlightSelect = async (icao24: string) => {
        try {
            const flightData = await getFlightByIcao(icao24);
            setSelectedFlight(flightData);
            const historyData = await getFlightHistory(icao24);
            setFlightHistory(historyData);
        } catch (err) {
            setError(`Failed to fetch details for flight ${icao24}.`);
            console.error("Error fetching flight details:", err);
            setSelectedFlight(null);
            setFlightHistory([]);
        }
    };

    const filteredFlights = useMemo(() => {
        return flights.filter(flight =>
            flight.callsign?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [flights, searchTerm]);

    const handleCitySearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCity(cityInput);
    };

    return (
        <div className="container-fluid p-3">
            <div className="app-container">
                <h1 className="app-header">Real-Time Flight Tracker</h1>
                <div className="row">
                    <div className="col-lg-4">
                        <div className="flight-list-container">
                            <h2 className="h4">Flight Monitor</h2>
                            <form onSubmit={handleCitySearch} className="d-flex mb-3">
                                <input
                                    type="text"
                                    className="form-control bg-dark text-white me-2"
                                    placeholder="Enter city name..."
                                    value={cityInput}
                                    onChange={e => setCityInput(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? '...' : 'Go'}
                                </button>
                            </form>
                            <input
                                type="text"
                                className="form-control search-bar bg-dark text-white mb-3"
                                placeholder="Filter by callsign..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {loading && <div className="loading-placeholder">Loading flights...</div>}
                            {error && <div className="error-placeholder">{error}</div>}
                            {!loading && !error && (
                                <ul className="list-group">
                                    {filteredFlights.map(flight => (
                                        <li
                                            key={flight.icao24}
                                            className={`list-group-item flight-list-item ${selectedFlight?.icao24 === flight.icao24 ? 'active' : ''}`}
                                            onClick={() => handleFlightSelect(flight.icao24)}
                                        >
                                            {flight.callsign || flight.icao24}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="col-lg-8">
                        <div className="flight-details-container">
                            <div className="flex-grow-1 mb-3" style={{ minHeight: '60%' }}>
                                <MapView 
                                    center={mapCenter} 
                                    flights={flights} 
                                    selectedFlight={selectedFlight} 
                                    flightHistory={flightHistory} 
                                    onFlightSelect={handleFlightSelect}
                                    showWeather={showWeather}
                                    apiKey={OPENWEATHER_API_KEY}
                                />
                            </div>
                            {selectedFlight ? (
                                <>
                                    <FlightDetails flight={selectedFlight} />
                                    {flightHistory.length > 0 && <FlightChart data={flightHistory} />}
                                </>
                            ) : (
                                <div className="flight-details-placeholder">
                                    Select a flight to see details
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="form-check form-switch mt-3">
                    <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch" 
                        id="weatherSwitch"
                        checked={showWeather}
                        onChange={() => setShowWeather(!showWeather)}
                    />
                    <label className="form-check-label" htmlFor="weatherSwitch">Show Weather Overlay</label>
                </div>
            </div>
        </div>
    );
}

export default App;