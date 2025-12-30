import React, { useEffect, useState } from 'react';
import { get } from '../../services/api';

export default function AdminProviderHealth() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    get('/admin/providers').then(res => {
      setLogs(res.logs || []);
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Provider Health</h1>

      <table className="w-full text-sm border border-white/6">
        <thead className="bg-white/3">
          <tr>
            <th className="p-2 text-left">Provider</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l._id} className="border-t border-white/6">
              <td className="p-2">{l.provider}</td>
              <td className="p-2">
                {l.ok ? 'OK' : 'FAIL'}
              </td>
              <td className="p-2">
                {new Date(l.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
