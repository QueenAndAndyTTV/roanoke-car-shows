'use client';

import dynamic from 'next/dynamic';

// This dynamically loads the map only in the browser
const Map = dynamic(() => import('./Map'), { ssr: false });

export default function MapWrapper({ shows }: { shows: any[] }) {
  return <Map shows={shows} />;
}