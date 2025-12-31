✈️ FlyO – Flight Booking & Reservation System (Frontend)

FlyO is a modern flight booking web application built using React (Vite) and TailwindCSS, providing users with an intuitive interface to search, compare, and book flights.

This frontend connects to a MERN-based backend that handles flight search, bookings, payments, and notifications.

🔧 Tech Stack

React (Vite)

TailwindCSS

JavaScript (ES6+)

Stripe Checkout (Test Mode)

Netlify (Deployment)

🚀 Features Implemented
🔍 Flight Search

Search flights by:

Origin

Destination

Travel date

Compare flights across airlines

Display:

Price

Duration

Stops

Airline code

🛫 Flight Listing & Filters

Sort by:

Cheapest

Fastest

Best value

Filter by:

Airlines

Stops

Price range

Visual airline badges (fallback for logos)

🧾 Booking Flow

Select flight and proceed to booking

Passenger details capture

Seat selection (basic)

Add-ons and coupons (where applicable)

💳 Payment Integration

Stripe Checkout (Sandbox/Test Mode)

Secure redirection to Stripe

Success & cancellation redirects handled correctly

📄 Booking Details Page

Displays:

Booking reference

Passenger info

Seats

Fare breakdown (base, taxes, discounts, addons)

Booking confirmation shown post-payment

👨‍💼 Admin Pages

Admin login page

Admin booking management

Resend payment link functionality

⚠️ Current Fallbacks & Limitations (Frontend)

Airline logos use fallback UI badges instead of universal live logos

Airport dataset is curated, not global (major airports only)

Seat maps are static/basic, not dynamically generated per aircraft

Real-time flight status updates are not live yet

No SMS notifications (email only)

🔮 Planned Improvements (Frontend)

Global airport dataset with autocomplete

Dynamic seat maps per aircraft type

Better mobile responsiveness polish

Admin dashboard analytics

Multi-currency display

Improved booking PDF preview UI

📦 Deployment Notes

Hosted on Netlify

Uses SPA routing via _redirects

All routes are handled client-side

🧪 Payments Note

⚠️ Stripe is currently running in TEST (sandbox) mode.
No real money is charged. Live mode is planned post-audit.

Admin Login to access admin pages:
Login Id: admin@example.com  
Password: Admin123
**To access admin login and admin functionalities navigate to /admin which will navigate to the admin login screen**

**Note*: Using gmail will work to get booking information and notifications. Make sure to check spam folder to view them if its not showing in your inbox**