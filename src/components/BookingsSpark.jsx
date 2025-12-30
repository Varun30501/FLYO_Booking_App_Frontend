// src/components/BookingsSpark.jsx
import React from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BookingsSpark({ data = [] }) {
  // normalize to expected shape [{ day: 'D1', bookings: 5 }, ...]
  const normalized = Array.isArray(data) && data.length
    ? data.map((v, i) => ({ day: `D${i+1}`, bookings: Number(v || 0) }))
    : [{ day: 'D1', bookings: 0 }];

  return (
    <div style={{ width: '100%', height: 56 }}>
      <ResponsiveContainer>
        <LineChart data={normalized}>
          <XAxis dataKey="day" hide />
          <Tooltip />
          <Line type="monotone" dataKey="bookings" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
