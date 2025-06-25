from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import time
from typing import Optional, List

app = FastAPI()

# CORS Middleware
# In production, you should restrict this to your frontend's deployed URL
# for better security. For example:
# origins = ["https://your-frontend-app.netlify.app"]
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory cache
cache = {}

# OpenSky Network API URL
OPENSKY_URL = "https://opensky-network.org/api/states/all"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

class Flight(BaseModel):
    icao24: str
    callsign: Optional[str]
    origin_country: str
    longitude: Optional[float]
    latitude: Optional[float]
    altitude: Optional[float]
    on_ground: bool
    velocity: Optional[float]
    true_track: Optional[float]
    vertical_rate: Optional[float]
    geo_altitude: Optional[float]
    spi: bool
    position_source: int


class TrackPoint(BaseModel):
    latitude: float
    longitude: float
    altitude: float
    timestamp: int


def _parse_flights_from_states(data: dict) -> List[Flight]:
    if not data or not data.get("states"):
        return []

    flights = []
    for state in data["states"]:
        flight_data = {
            "icao24": state[0],
            "callsign": state[1].strip() if state[1] else None,
            "origin_country": state[2],
            "longitude": state[5],
            "latitude": state[6],
            "altitude": state[7],
            "on_ground": state[8],
            "velocity": state[9],
            "true_track": state[10],
            "vertical_rate": state[11],
            "geo_altitude": state[13],
            "spi": state[15] if state[15] is not None else False,
            "position_source": state[16],
        }
        flights.append(Flight(**flight_data))
    return flights


@app.get("/flights/area", response_model=List[Flight])
async def get_flights_in_area(lat_min: float, lon_min: float, lat_max: float, lon_max: float):
    """
    Get all flights within a specified geographical bounding box.
    """
    cache_key = f"area_{lat_min}_{lon_min}_{lat_max}_{lon_max}"
    if cache_key in cache and time.time() - cache[cache_key]["timestamp"] < 60:
        return cache[cache_key]["data"]

    params = {
        "lamin": lat_min,
        "lomin": lon_min,
        "lamax": lat_max,
        "lomax": lon_max,
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(OPENSKY_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))

    flights = _parse_flights_from_states(response.json())
    cache[cache_key] = {"timestamp": time.time(), "data": flights}
    return flights


@app.get("/flights/city/{city}", response_model=List[Flight])
async def get_flights_by_city(city: str):
    """
    Get flights around a specific city by first getting its coordinates.
    """
    cache_key = f"city_{city}"
    if cache_key in cache and time.time() - cache[cache_key]["timestamp"] < 60:
        return cache[cache_key]["data"]

    async with httpx.AsyncClient() as client:
        try:
            # Get coordinates for the city from Nominatim
            nominatim_params = {'q': city, 'format': 'json', 'limit': 1}
            nominatim_resp = await client.get(NOMINATIM_URL, params=nominatim_params)
            nominatim_resp.raise_for_status()
            city_data = nominatim_resp.json()
            if not city_data:
                raise HTTPException(status_code=404, detail=f"City '{city}' not found.")

            lat = float(city_data[0]['lat'])
            lon = float(city_data[0]['lon'])

            # Define a bounding box around the city's coordinates
            bbox_size = 1.0  # degrees
            params = {
                "lamin": lat - bbox_size, "lomin": lon - bbox_size,
                "lamax": lat + bbox_size, "lomax": lon + bbox_size,
            }

            # Get flights from OpenSky
            opensky_resp = await client.get(OPENSKY_URL, params=params)
            opensky_resp.raise_for_status()
            flights = _parse_flights_from_states(opensky_resp.json())

        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))

    cache[cache_key] = {"timestamp": time.time(), "data": flights}
    return flights


@app.get("/flights/track/history/{icao24}", response_model=List[TrackPoint])
async def get_flight_history(icao24: str):
    """
    Get the flight track for the last hour for a specific aircraft.
    """
    cache_key = f"history_{icao24}"
    # Cache for a shorter period for tracks as they update frequently
    if cache_key in cache and time.time() - cache[cache_key]["timestamp"] < 30:
        return cache[cache_key]["data"]

    # Time parameter should be for the beginning of the interval (1 hour ago)
    # But OpenSky seems to work well if we just request for "now" and it gives the last hour.
    # To be safe, let's just request for the current time.
    params = {'icao24': icao24, 'time': int(time.time())}
    async with httpx.AsyncClient() as client:
        try:
            # Note: Using the 'tracks' endpoint from OpenSky
            response = await client.get("https://opensky-network.org/api/tracks/all", params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))

    data = response.json()
    if not data or not data.get('path'):
        return []

    track = [
        TrackPoint(
            latitude=point[1],
            longitude=point[2],
            altitude=point[3],
            timestamp=point[0]
        )
        for point in data['path'] if point[1] is not None and point[2] is not None
    ]

    cache[cache_key] = {"timestamp": time.time(), "data": track}
    return track


@app.get("/flights/track/{icao24}", response_model=Flight)
async def get_flight_by_icao(icao24: str):
    """
    Get flight data for a specific aircraft by its ICAO24 address.
    """
    cache_key = f"track_{icao24}"
    if cache_key in cache and time.time() - cache[cache_key]['timestamp'] < 60:
        return cache[cache_key]['data']

    params = {'icao24': icao24}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(OPENSKY_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))

    data = response.json()

    if not data or not data['states']:
        raise HTTPException(status_code=404, detail=f"Flight with ICAO24 address {icao24} not found.")

    state = data['states'][0]
    flight_data = {
        "icao24": state[0],
        "callsign": state[1].strip() if state[1] else None,
        "origin_country": state[2],
        "longitude": state[5],
        "latitude": state[6],
        "altitude": state[7],
        "on_ground": state[8],
        "velocity": state[9],
        "true_track": state[10],
        "vertical_rate": state[11],
        "geo_altitude": state[13],
        "spi": state[15] if state[15] is not None else False,
        "position_source": state[16],
    }
    flight = Flight(**flight_data)

    cache[cache_key] = {'timestamp': time.time(), 'data': flight}
    return flight