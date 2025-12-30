import { useEffect, useState } from 'react';
import { get, post } from '../../services/api';

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    get('/faqs/admin').then(r => setFaqs(r.faqs));
  }, []);

  function toggle(id) {
    post(`/faqs/admin/${id}/toggle`).then(() =>
      setFaqs(faqs.map(f => f._id === id ? { ...f, isActive: !f.isActive } : f))
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Manage FAQs</h1>

      {faqs.map(f => (
        <div key={f._id} className="bg-white/5 p-4 rounded flex justify-between">
          <div>
            <div className="font-medium">{f.question}</div>
            <div className="text-xs text-slate-400">{f.category}</div>
          </div>

          <button
            onClick={() => toggle(f._id)}
            className={`px-3 py-1 rounded text-sm ${
              f.isActive ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {f.isActive ? 'Active' : 'Hidden'}
          </button>
        </div>
      ))}
    </div>
  );
}
