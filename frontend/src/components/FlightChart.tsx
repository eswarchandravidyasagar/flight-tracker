import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrackPoint } from '../services/api';
import './FlightChart.css';

interface FlightChartProps {
    data: TrackPoint[];
}

const FlightChart: React.FC<FlightChartProps> = ({ data }) => {
    const formattedData = data.map(p => ({
        ...p,
        time: new Date(p.timestamp * 1000).toLocaleTimeString(),
    }));

    return (
        <div className="flight-chart-container">
            <h4 className="chart-title">Altitude Profile (Last Hour)</h4>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#f5f5f5" />
                    <YAxis label={{ value: 'Altitude (m)', angle: -90, position: 'insideLeft', fill: '#f5f5f5' }} stroke="#f5f5f5" />
                    <Tooltip contentStyle={{ backgroundColor: '#2c2c2c', border: '1px solid #444' }} />
                    <Legend />
                    <Line type="monotone" dataKey="altitude" stroke="#61dafb" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FlightChart; 