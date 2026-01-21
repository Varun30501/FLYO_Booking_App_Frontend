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


🪑 Seat Map v3 (Production-grade)

The Seat Map system has been significantly upgraded to support real-world booking scenarios and eliminate earlier inconsistencies.

✅ What’s new in SeatMap v3

Template-based Seat Maps

Each flight has a single template seat map identified only by flightId

Templates are immutable and never tied to date or route

Dynamic Seat Map Instantiation

On flight search, a new seat map is dynamically created using:

flightId + travelDate + origin + destination


This ensures seat availability is isolated per journey, not reused incorrectly

Seat Lifecycle Management

free → held → booked

Seats are:

held during booking flow

booked only after successful payment

released automatically if booking expires

Passenger-aware Seat Rules

Exit-row and restricted seats are blocked for:

Child passengers

Passengers requiring assistance

Seat availability now reflects passenger eligibility correctly

Backend-authoritative Seat State

Seat status is always sourced from backend seat maps

Frontend never “guesses” or overrides seat availability

🧾 Booking & Payment Sync (SeatMap v3)

Seat finalization happens only via payment webhook

Booking status and seat status are now fully consistent

Prevents:

Double booking

Phantom “held” seats

Mismatched UI vs DB state

⚠️ Current Limitations (SeatMap v3)

These are known and acceptable for production launch:

Seat layouts are generic per flight, not aircraft-specific yet

No real-time seat sync across multiple users (near-real-time via DB only)

Seat maps are not visually customized per airline branding

No seat-level pricing by cabin class (Economy/Business split pending)

🔮 Planned Improvements (SeatMap)

Aircraft-specific seat layouts (A320, B737, etc.)

Real-time seat locking via Redis / WebSockets

Seat class differentiation (Economy / Premium / Business)

Better mobile seat-map interactions

Accessibility improvements for seat selection UX

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