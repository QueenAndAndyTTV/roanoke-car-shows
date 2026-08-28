'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 flex items-center justify-center rounded-lg text-gray-500 text-sm">
      Loading map...
    </div>
  ),
});

export default function MapWrapper({ shows }: { shows: any[] }) {
  return <Map shows={shows} />;
}