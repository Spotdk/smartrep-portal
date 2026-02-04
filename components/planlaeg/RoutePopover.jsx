'use client';

import React, { useState, useEffect, useRef } from 'react';

/*
  RoutePopover.jsx
  Popup med kørselsvejledning. Kortet bruger Maps JavaScript API
  så viewport zoomes til kun at vise den aktuelle rute.
*/

export default function RoutePopover({ fromAddress, toAddress, minutes, km, onClose }) {
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const formatAddress = (addr) => {
    if (!addr) return '';
    return addr.includes('Denmark') || addr.includes('Danmark')
      ? addr
      : `${addr}, Denmark`;
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(formatAddress(fromAddress))}&destination=${encodeURIComponent(formatAddress(toAddress))}&travelmode=driving`;

  // Indlæs Google Maps og tegn rute så kortet kun viser ruten
  useEffect(() => {
    if (!apiKey || !fromAddress || !toAddress || !mapRef.current) return;

    const origin = formatAddress(fromAddress);
    const destination = formatAddress(toAddress);

    const initMap = () => {
      if (!window.google || !window.google.maps) {
        setMapError(true);
        return;
      }
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 55.4, lng: 10.4 },
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        preserveViewport: false, // så kortet zoomer til ruten
      });
      directionsRendererRef.current = directionsRenderer;
      mapInstanceRef.current = map;

      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            // Valgfrit: juster bounds med lidt padding
            const bounds = new window.google.maps.LatLngBounds();
            result.routes[0].legs.forEach((leg) => {
              bounds.extend(leg.start_location);
              bounds.extend(leg.end_location);
            });
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
          } else {
            setMapError(true);
          }
        }
      );
    };

    if (window.google?.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=da`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, [apiKey, fromAddress, toAddress]);

  return (
    <div className="route-overlay" onClick={onClose}>
      <div className="route-popover" onClick={(e) => e.stopPropagation()}>
        <div className="route-header">
          <span className="route-title">🚗 Kørselsvejledning</span>
          <button className="route-close" onClick={onClose}>✕</button>
        </div>

        <div className="route-addresses">
          <div className="route-address">
            <strong>Fra:</strong> {fromAddress}
          </div>
          <div className="route-address">
            <strong>Til:</strong> {toAddress}
          </div>
        </div>

        <div className="route-stats">
          <span className="route-stat">🕐 {minutes} min</span>
          <span className="route-stat">📏 {km} km</span>
        </div>

        <div className="route-map">
          {apiKey && !mapError ? (
            <div
              ref={mapRef}
              style={{ width: '100%', height: 300, borderRadius: 8, minHeight: 300 }}
            />
          ) : (
            <div className="route-map-fallback">
              <p>
                {!apiKey
                  ? 'Google Maps API key er ikke konfigureret i .env filen.'
                  : 'Kortet kunne ikke indlæses.'}
              </p>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="route-map-link"
              >
                🗺️ Se rute i Google Maps →
              </a>
            </div>
          )}
        </div>

        <div className="route-footer">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="route-external-link"
          >
            Åbn i Google Maps ↗
          </a>
        </div>
      </div>
    </div>
  );
}
