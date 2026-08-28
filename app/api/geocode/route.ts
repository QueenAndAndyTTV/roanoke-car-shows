import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) return NextResponse.json([]);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
      {
        headers: {
          'User-Agent': 'RoanokeCarShowsApp/1.0 (hello@roanokecruisers.com)',
        },
      }
    );
    const data = await response.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}