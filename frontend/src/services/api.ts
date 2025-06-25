import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface Flight {
    icao24: string;
    callsign: string | null;
    origin_country: string;
    longitude: number | null;
    latitude: number | null;
    altitude: number | null;
    on_ground: boolean;
    velocity: number | null;
    true_track: number | null;
    vertical_rate: number | null;
    geo_altitude: number | null;
    spi: boolean;
    position_source: number;
}

export interface TrackPoint {
    latitude: number;
    longitude: number;
    altitude: number;
    timestamp: number;
}

export const getFlightsInArea = async (lat_min: number, lon_min: number, lat_max: number, lon_max: number): Promise<Flight[]> => {
    const response = await axios.get(`${API_URL}/flights/area`, {
        params: { lat_min, lon_min, lat_max, lon_max }
    });
    return response.data;
};

export const getFlightsByCity = async (city: string): Promise<Flight[]> => {
    const response = await axios.get(`${API_URL}/flights/city/${city}`);
    return response.data;
};

export const getFlightByIcao = async (icao24: string): Promise<Flight> => {
    const response = await axios.get(`${API_URL}/flights/track/${icao24}`);
    return response.data;
};

export const getFlightHistory = async (icao24: string): Promise<TrackPoint[]> => {
    const response = await axios.get(`${API_URL}/flights/track/history/${icao24}`);
    return response.data;
};

export const getCoordsFromCity = async (city: string): Promise<{lat: number, lon: number}> => {
    const response = await axios.get(NOMINATIM_URL, {
        params: {
            q: city,
            format: 'json',
            limit: 1
        }
    });
    if (response.data.length > 0) {
        return { lat: parseFloat(response.data[0].lat), lon: parseFloat(response.data[0].lon) };
    }
    throw new Error('City not found');
};