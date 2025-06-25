import React from 'react';
import { Flight } from '../services/api';
import './FlightDetails.css';

interface FlightDetailsProps {
    flight: Flight;
}

const FlightDetails: React.FC<FlightDetailsProps> = ({ flight }) => {
    return (
        <div className="flight-details-card">
            <h3 className="flight-details-header">
                {flight.callsign || 'N/A'}
                <span className="icao-badge">{flight.icao24}</span>
            </h3>
            <div className="row">
                <div className="col-md-6">
                    <p><strong>Origin:</strong> {flight.origin_country}</p>
                    <p><strong>On Ground:</strong> {flight.on_ground ? 'Yes' : 'No'}</p>
                    <p><strong>Position Source:</strong> {flight.position_source}</p>
                </div>
                <div className="col-md-6">
                    <p><strong>Altitude:</strong> {flight.altitude ? `${flight.altitude} m` : 'N/A'}</p>
                    <p><strong>Velocity:</strong> {flight.velocity ? `${flight.velocity} m/s` : 'N/A'}</p>
                    <p><strong>Track:</strong> {flight.true_track ? `${flight.true_track}°` : 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};

export default FlightDetails; 