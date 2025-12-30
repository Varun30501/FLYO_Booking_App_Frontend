// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// detect stripe publishable key from env
const STRIPE_PUB = import.meta.env.VITE_STRIPE_PUB_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
window.__STRIPE_ENABLED = Boolean(STRIPE_PUB);

const stripePromise = STRIPE_PUB ? loadStripe(STRIPE_PUB) : null;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <App />
        </Elements>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </React.StrictMode>
);
