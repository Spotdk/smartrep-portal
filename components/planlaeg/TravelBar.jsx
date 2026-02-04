'use client';
import React from 'react';

/*
  TravelBar.jsx
  Info-bjælke mellem opgaver der viser køretid og afstand fra Google Maps
*/

export default function TravelBar({
  fromAddress,
  toAddress,
  minutes,
  km,
  loading = false,
  onClick,
  isFromHome = false,
  isToHome = false
}) {
  const handleClick = () => {
    if (onClick && !loading) {
      onClick(fromAddress, toAddress, { minutes, km });
    }
  };

  return (
    <div
      className={`travel-bar ${isFromHome ? 'travel-from-home' : ''} ${isToHome ? 'travel-to-home' : ''} ${loading ? 'travel-loading' : ''}`}
      onClick={handleClick}
      title={loading ? 'Beregner rute...' : `Fra: ${fromAddress}\nTil: ${toAddress}\nKlik for at se rute`}
    >
      <span className="travel-icon">🚗</span>
      {loading ? (
        <span className="travel-text">Beregner...</span>
      ) : (
        <span className="travel-text">{minutes} min • {km} km</span>
      )}
    </div>
  );
}
