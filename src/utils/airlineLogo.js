// src/utils/airlineLogo.js

const AIRLINE_DOMAIN_MAP = {
  AI: "airindia.com",
  EK: "emirates.com",
  SQ: "singaporeair.com",
  UK: "vistara.com",
  SG: "spicejet.com",
  "6E": "goindigo.in",

  LH: "lufthansa.com",
  BA: "britishairways.com",
  AF: "airfrance.com",
  KL: "klm.com",
  QR: "qatarairways.com",
  EY: "etihad.com",
  TK: "turkishairlines.com",
  CX: "cathaypacific.com",
  QF: "qantas.com",
  JL: "jal.co.jp",
  NH: "ana.co.jp",

  UA: "united.com",
  AA: "aa.com",
  DL: "delta.com",
  SW: "southwest.com",

  FR: "ryanair.com",
  U2: "easyjet.com",
  W6: "wizzair.com",
};

export function getAirlineLogo(iata) {
  if (!iata || typeof iata !== "string") {
    return "/hero-bg.png";
  }

  const code = iata.trim().toUpperCase();
  const domain = AIRLINE_DOMAIN_MAP[code];

  if (!domain) {
    return "/airlines/default.png";
  }

  return `https://logo.clearbit.com/${domain}`;
}
