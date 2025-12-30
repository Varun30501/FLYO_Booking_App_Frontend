// src/pages/Support.jsx
import React, { useEffect, useState } from 'react';
import { get } from '../services/api';
import { Link } from 'react-router-dom';

export default function Support() {
    const [faqs, setFaqs] = useState([]);
    const [query, setQuery] = useState('');
    const categories = ['all', 'booking', 'payments', 'account'];
    const [activeCat, setActiveCat] = useState('all');

    useEffect(() => {
        get(`/faqs?category=${activeCat}`).then(r => setFaqs(r.faqs));
    }, [activeCat]);

    useEffect(() => {
        if (!query) return;

        const ids = faqs
            .filter(f =>
                f.question.toLowerCase().includes(query.toLowerCase()) ||
                f.answer.toLowerCase().includes(query.toLowerCase())
            )
            .map(f => f._id);

        if (ids.length) {
            post('/faqs/track-search', { ids });
        }
    }, [query, faqs]);

    useEffect(() => {
        setQuery('');
    }, [activeCat]);


    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-semibold">Customer Support</h1>
            <p className="text-slate-300">
                Find answers to common questions about bookings, payments, refunds, and more.
            </p>

            {/* Quick Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Guide title="Account Settings" desc="Update email, phone or password" />
                <Guide title="Payments & Refunds" desc="Refunds, failed payments & history" />
                <Guide title="Pre-booking Queries" desc="Issues before booking?" />
                <Guide title="Manage Bookings" desc="View, cancel or modify bookings" />
                <Guide title="Travel Guidelines" desc="Baggage rules & policies" />
                <Guide title="Offers & Coupons" desc="Discounts and promo codes" />
            </div>

            <div className="mt-10">
                <div className="
    relative overflow-hidden rounded-xl p-6
    bg-gradient-to-r from-cyan-500/20 to-indigo-600/20
    border border-white/10
    hover:scale-[1.01] transition-all duration-300
  ">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 pointer-events-none" />

                    <h2 className="text-xl font-semibold mb-2">Need personal assistance?</h2>
                    <p className="text-slate-300 max-w-xl">
                        Our support team is available to help you with bookings, payments, refunds and more.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4">
                        <a
                            href="mailto:support@flyo.com"
                            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition"
                        >
                            📧 Email Support
                        </a>

                        <a
                            href="/contact-us"
                            className="px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-500 transition"
                        >
                            Contact Us →
                        </a>
                    </div>
                </div>
            </div>



            {/* FAQ Section */}
            <div className="space-y-3 ">
                <h1 className="text-2xl font-semibold">FAQs</h1>
                <div className="flex gap-3 mb-4">
                    {categories.map(c => (
                        <button
                            key={c}
                            onClick={() => setActiveCat(c)}
                            className={`px-4 py-1 rounded ${activeCat === c ? 'bg-cyan-600 text-white' : 'bg-white/5'
                                }`}
                        >
                            {c.toUpperCase()}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Search help topics..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2 rounded bg-white/6 border border-white/10 text-white placeholder-slate-400"
                />

                {faqs
                    .filter(f =>
                        f.question.toLowerCase().includes(query.toLowerCase()) ||
                        f.answer.toLowerCase().includes(query.toLowerCase())
                    )
                    .map((f, i) => (

                        <details
                            key={i}
                            className="group bg-white/5 rounded-lg p-4 transition-all duration-300 hover:bg-white/8"
                        >
                            <summary className="cursor-pointer font-medium flex justify-between items-center">
                                {f.question}
                                <span className="transition-transform duration-300 group-open:rotate-180">
                                    ⌄
                                </span>
                            </summary>

                            <p className="mt-3 text-slate-300 animate-fade-in">
                                {f.answer}
                            </p>
                        </details>

                    ))}
            </div>


        </div>
    );
}

function Guide({ title, desc, link }) {
    const content = (
        <div className="bg-white/5 rounded p-4 hover:bg-white/8 transition">
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-slate-300">{desc}</p>
        </div>
    );
    return link ? <Link to={link}>{content}</Link> : content;
}
