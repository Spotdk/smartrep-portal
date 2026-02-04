// app/api/travel-distance/route.js
// API endpoint der bruger Google Distance Matrix til at beregne ægte køretid

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { origin, destination } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Mangler origin eller destination' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key ikke konfigureret' },
        { status: 500 }
      );
    }

    // Kald Google Distance Matrix API
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', origin);
    url.searchParams.append('destinations', destination);
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('language', 'da');
    url.searchParams.append('units', 'metric');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', data);
      return NextResponse.json(
        { error: 'Google Maps API fejl', details: data.status },
        { status: 500 }
      );
    }

    const element = data.rows?.[0]?.elements?.[0];

    if (!element || element.status !== 'OK') {
      return NextResponse.json(
        { error: 'Kunne ikke beregne rute', details: element?.status },
        { status: 400 }
      );
    }

    // Returner km og minutter
    return NextResponse.json({
      km: Math.round(element.distance.value / 1000),
      minutes: Math.round(element.duration.value / 60),
      distanceText: element.distance.text,
      durationText: element.duration.text,
      origin: data.origin_addresses?.[0],
      destination: data.destination_addresses?.[0],
    });
  } catch (error) {
    console.error('Travel distance API error:', error);
    return NextResponse.json(
      { error: 'Server fejl', details: error.message },
      { status: 500 }
    );
  }
}
