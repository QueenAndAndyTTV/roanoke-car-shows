'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AddShow() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Cars & Trucks');
  const [eventType, setEventType] = useState('Car Show');
  const [admission, setAdmission] = useState('Free');
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [passcode, setPasscode] = useState('');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [repeatUntil, setRepeatUntil] = useState('');

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleAddressChange = (val: string) => {
    setAddress(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.length > 3) {
      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
        } catch (err) {
          setSuggestions([]);
        }
      }, 400);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (s: any) => {
    setAddress(s.display_name);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passcode !== process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
      alert('Incorrect admin passcode!');
      return;
    }

    setLoading(true);

    try {
      let flyerUrl = '';

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('flyers')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('flyers')
            .getPublicUrl(fileName);
          flyerUrl = urlData.publicUrl;
        }
      }

      let lat = 37.2707;
      let lon = -79.9414;
      try {
        if (address) {
          const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
          }
        }
      } catch (geoErr) {
        console.warn('Geocoding skipped, using default map center');
      }

      const eventDates: string[] = [new Date(date).toISOString()];

      if (isRecurring && repeatUntil) {
        let currentDate = new Date(date);
        const endDate = new Date(repeatUntil);

        const advanceDate = (d: Date) => {
          if (frequency === 'weekly') {
            d.setDate(d.getDate() + 7);
          } else if (frequency === 'biweekly') {
            d.setDate(d.getDate() + 14);
          } else if (frequency === 'monthly') {
            d.setMonth(d.getMonth() + 1);
          }
        };

        advanceDate(currentDate);
        while (currentDate <= endDate) {
          eventDates.push(new Date(currentDate).toISOString());
          advanceDate(currentDate);
        }
      }

      const insertPayloads = eventDates.map(eventDate => ({
        title,
        event_date: eventDate,
        category,
        event_type: eventType,
        admission,
        frequency: isRecurring ? frequency : null,
        repeat_until: isRecurring && repeatUntil ? repeatUntil : null,
        address,
        description: description || '',
        flyer_url: flyerUrl,
        latitude: lat,
        longitude: lon,
      }));

      const { error: insertError } = await supabase.from('car_shows').insert(insertPayloads);

      if (insertError) throw insertError;

      router.push('/');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error adding event');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Add New Event</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Event Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900"
              placeholder="e.g. Salem Lowe's Cruise-In"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 bg-white"
              >
                <option value="Cars & Trucks">Cars & Trucks</option>
                <option value="Cars, Trucks & Bikes">Cars, Trucks & Bikes</option>
                <option value="Cars">Cars</option>
                <option value="Trucks">Trucks</option>
                <option value="Bikes">Bikes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Show Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 bg-white"
              >
                <option value="Car Show">Car Show</option>
                <option value="Cruise-In">Cruise-In</option>
                <option value="Swap Meet">Swap Meet</option>
                <option value="Cars & Coffee">Cars & Coffee</option>
                <option value="Truck Show">Truck Show</option>
                <option value="Bike Rally">Bike Rally</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Admission Fee</label>
              <select
                value={admission}
                onChange={(e) => setAdmission(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 bg-white"
              >
                <option value="Free">Free Admission</option>
                <option value="$5">$5</option>
                <option value="$10">$10</option>
                <option value="$15">$15</option>
                <option value="$20">$20</option>
                <option value="Donation">Donation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date & Time</label>
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-800">Repeat Event</span>
            </label>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 text-gray-900 text-sm bg-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Repeat Until Date</label>
                  <input
                    type="date"
                    required={isRecurring}
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 text-gray-900 text-sm bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Address / Location</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900"
              placeholder="Start typing an address or landmark..."
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border border-gray-200 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                {suggestions.map((s, idx) => (
                  <li
                    key={idx}
                    onClick={() => selectSuggestion(s)}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-800"
                  >
                    {s.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900"
              rows={3}
              placeholder="Details, entry fees, rain dates..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Flyer Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700">Admin Passcode</label>
            <input
              type="password"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900"
              placeholder="Enter passcode to submit"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 mt-4"
          >
            {loading ? 'Creating Events...' : 'Submit Event'}
          </button>
        </form>
      </div>
    </main>
  );
}