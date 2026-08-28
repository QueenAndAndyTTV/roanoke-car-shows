'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import MapWrapper from './MapWrapper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function getDistanceFromLatLonInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [shows, setShows] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxDistance, setMaxDistance] = useState<number>(100);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number }>({
    lat: 37.2707,
    lon: -79.9414,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          console.warn('Geolocation permission denied or unavailable.');
        }
      );
    }

    fetchShows();
  }, []);

  const fetchShows = async () => {
    const { data } = await supabase
      .from('car_shows')
      .select('*')
      .order('event_date', { ascending: true });
    if (data) setShows(data);
  };

  const filteredShows = shows.filter((show) => {
    const matchesCategory = selectedCategory === 'All' || show.category === selectedCategory;

    let matchesDistance = true;
    if (show.latitude && show.longitude) {
      const distance = getDistanceFromLatLonInMiles(
        userLocation.lat,
        userLocation.lon,
        show.latitude,
        show.longitude
      );
      matchesDistance = distance <= maxDistance;
    }

    return matchesCategory && matchesDistance;
  });

  const uniqueShowsMap = new Map();
  filteredShows.forEach((show) => {
    const baseTitle = show.title.split('"')[0].split(' - ')[0].trim().toLowerCase();
    if (!uniqueShowsMap.has(baseTitle)) {
      uniqueShowsMap.set(baseTitle, show);
    }
  });
  const displayShows = Array.from(uniqueShowsMap.values());

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Roanoke Valley Cruise-Ins & Shows
          </h1>
          <a href="/add" className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition">
            + Add Show
          </a>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Category:</span>
            {['All', 'Cars & Trucks', 'Cars, Trucks & Bikes', 'Cars', 'Trucks', 'Bikes'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Max Distance:</span>
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="p-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white font-medium"
            >
              <option value={25}>Within 25 miles</option>
              <option value={50}>Within 50 miles</option>
              <option value={100}>Within 100 miles</option>
              <option value={250}>Within 250 miles</option>
              <option value={10000}>Any distance</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-6">
            {displayShows.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-600">No shows match your filter criteria.</p>
              </div>
            ) : (
              displayShows.map((show) => {
                const distance = show.latitude && show.longitude
                  ? getDistanceFromLatLonInMiles(userLocation.lat, userLocation.lon, show.latitude, show.longitude).toFixed(1)
                  : null;

                const repeatText = show.frequency && show.repeat_until
                  ? `(${show.frequency} till ${new Date(show.repeat_until).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`
                  : null;

                return (
                  <Link
                    key={show.id}
                    href={`/event/${show.id}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:border-blue-500 hover:shadow-md transition"
                  >
                    {show.flyer_url && (
                      <img src={show.flyer_url} alt="Show Flyer" className="w-full h-48 object-cover" />
                    )}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {show.category || 'Cars & Trucks'}
                          </span>
                          <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {show.event_type || 'Car Show'}
                          </span>
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {show.admission || 'Free'}
                          </span>
                        </div>
                        {distance && (
                          <span className="text-xs font-medium text-gray-500">
                            ~{distance} mi away
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-800">{show.title}</h2>
                      <p className="text-blue-600 mt-1 font-medium text-sm">
                        {new Date(show.event_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        {repeatText && <span className="text-gray-500 font-normal ml-1.5 text-xs">{repeatText}</span>}
                      </p>
                      <p className="text-gray-600 mt-2 text-sm">{show.address}</p>
                      {show.description && <p className="text-gray-700 mt-3 text-sm">{show.description}</p>}
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 sticky top-8">
              <MapWrapper shows={displayShows} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}