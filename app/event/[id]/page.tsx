'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MapWrapper from '../../MapWrapper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [show, setShow] = useState<any>(null);
  const [seriesEvents, setSeriesEvents] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<{ attending: number; interested: number }>({ attending: 0, interested: 0 });
  const [comments, setComments] = useState<any[]>([]);
  const [author, setAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Cars & Trucks');
  const [editEventType, setEditEventType] = useState('Car Show');
  const [editAdmission, setEditAdmission] = useState('Free');
  const [editDate, setEditDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [repeatUntil, setRepeatUntil] = useState('');

  useEffect(() => {
    fetchShowData();
  }, [id]);

  const fetchShowData = async () => {
    const { data: event } = await supabase.from('car_shows').select('*').eq('id', id).single();
    if (event) {
      setShow(event);

      const { data: series } = await supabase
        .from('car_shows')
        .select('*')
        .eq('title', event.title)
        .order('event_date', { ascending: true });
      
      const allSeries = series || [];
      setSeriesEvents(allSeries);
      populateEditForm(event, allSeries);
    }

    const { data: rsvpData } = await supabase.from('event_rsvps').select('status').eq('event_id', id);
    if (rsvpData) {
      const attending = rsvpData.filter((r) => r.status === 'attending').length;
      const interested = rsvpData.filter((r) => r.status === 'interested').length;
      setRsvps({ attending, interested });
    }

    const { data: commentData } = await supabase
      .from('event_comments')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: true });
    setComments(commentData || []);
  };

  const populateEditForm = (eventData: any, series: any[]) => {
    setEditTitle(eventData.title);
    setEditCategory(eventData.category || 'Cars & Trucks');
    setEditEventType(eventData.event_type || 'Car Show');
    setEditAdmission(eventData.admission || 'Free');
    setEditAddress(eventData.address);
    setEditDescription(eventData.description || '');

    const d = new Date(eventData.event_date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setEditDate(`${year}-${month}-${day}T${hours}:${minutes}`);

    if (eventData.frequency && eventData.repeat_until) {
      setIsRecurring(true);
      setFrequency(eventData.frequency);
      setRepeatUntil(eventData.repeat_until.split('T')[0]);
    } else if (series.length > 1) {
      setIsRecurring(true);
      const lastDate = series[series.length - 1].event_date;
      setRepeatUntil(lastDate.split('T')[0]);
    } else {
      setIsRecurring(false);
      setRepeatUntil('');
    }
  };

  const toggleEdit = () => {
    if (!isEditing && show) {
      populateEditForm(show, seriesEvents);
    }
    setIsEditing(!isEditing);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode !== process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
      alert('Incorrect admin passcode!');
      return;
    }

    setLoading(true);
    try {
      let lat = show.latitude;
      let lon = show.longitude;

      if (editAddress !== show.address) {
        const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(editAddress)}`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lon = parseFloat(geoData[0].lon);
        }
      }

      const newEventDateIso = new Date(editDate).toISOString();

      const { error } = await supabase
        .from('car_shows')
        .update({
          title: editTitle,
          category: editCategory,
          event_type: editEventType,
          admission: editAdmission,
          event_date: newEventDateIso,
          frequency: isRecurring ? frequency : null,
          repeat_until: isRecurring && repeatUntil ? repeatUntil : null,
          address: editAddress,
          description: editDescription,
          latitude: lat,
          longitude: lon,
        })
        .eq('id', id);

      if (error) throw error;

      await supabase
        .from('car_shows')
        .delete()
        .eq('title', show.title)
        .neq('id', id)
        .gte('event_date', show.event_date);

      if (isRecurring && repeatUntil) {
        let currentDate = new Date(editDate);
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

        const newPayloads = [];
        while (currentDate <= endDate) {
          newPayloads.push({
            title: editTitle,
            category: editCategory,
            event_type: editEventType,
            admission: editAdmission,
            event_date: new Date(currentDate).toISOString(),
            frequency: frequency,
            repeat_until: repeatUntil,
            address: editAddress,
            description: editDescription,
            flyer_url: show.flyer_url || '',
            latitude: lat,
            longitude: lon,
          });
          advanceDate(currentDate);
        }

        if (newPayloads.length > 0) {
          await supabase.from('car_shows').insert(newPayloads);
        }
      }

      setIsEditing(false);
      setPasscode('');
      fetchShowData();
    } catch (err: any) {
      alert(err.message || 'Error updating event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const inputPass = prompt('Enter admin passcode to delete this event:');
    if (inputPass !== process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
      alert('Incorrect passcode!');
      return;
    }

    if (confirm('Are you sure you want to delete this show?')) {
      const { error } = await supabase.from('car_shows').delete().eq('id', id);
      if (!error) {
        router.push('/');
        router.refresh();
      } else {
        alert('Error deleting event');
      }
    }
  };

  const handleRSVP = async (status: 'attending' | 'interested') => {
    let session = localStorage.getItem('user_session_id');
    if (!session) {
      session = crypto.randomUUID();
      localStorage.setItem('user_session_id', session);
    }

    await supabase.from('event_rsvps').upsert({
      event_id: id,
      user_session_id: session,
      status,
    }, { onConflict: 'event_id,user_session_id' });

    fetchShowData();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !commentText) return;

    await supabase.from('event_comments').insert([{
      event_id: id,
      author_name: author,
      content: commentText,
    }]);

    setCommentText('');
    fetchShowData();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!show) return <div className="p-8 text-center text-gray-500">Loading show details...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <a href="/" className="text-blue-600 hover:underline text-sm font-semibold">
            ← Back to All Shows
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-fit">
            {show.flyer_url && (
              <div className="bg-gray-900 flex justify-center p-4">
                <img 
                  src={show.flyer_url} 
                  alt={show.title} 
                  className="w-full max-h-[600px] object-contain rounded-md" 
                />
              </div>
            )}
            
            <div className="p-8">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 mb-2 flex-wrap">
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
                  <h1 className="text-3xl font-extrabold text-gray-900">{show.title}</h1>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleShare}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-semibold"
                  >
                    {copied ? '✓ Copied' : '🔗 Share'}
                  </button>
                  <button
                    onClick={toggleEdit}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-md text-sm font-semibold"
                  >
                    {isEditing ? 'Cancel' : '✏️ Edit'}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdate} className="mt-6 space-y-4 bg-gray-50 p-6 rounded-md border border-gray-200">
                  <h2 className="text-base font-bold text-gray-800">Edit Event Details</h2>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900 bg-white"
                      >
                        <option value="Cars & Trucks">Cars & Trucks</option>
                        <option value="Cars, Trucks & Bikes">Cars, Trucks & Bikes</option>
                        <option value="Cars">Cars</option>
                        <option value="Trucks">Trucks</option>
                        <option value="Bikes">Bikes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700">Show Type</label>
                      <select
                        value={editEventType}
                        onChange={(e) => setEditEventType(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900 bg-white"
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Admission Fee</label>
                      <select
                        value={editAdmission}
                        onChange={(e) => setEditAdmission(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900 bg-white"
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
                      <label className="block text-xs font-medium text-gray-700">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-md border border-gray-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-xs font-medium text-gray-800">Repeat Event</span>
                    </label>

                    {isRecurring && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                          <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="block w-full rounded-md border border-gray-300 p-1.5 text-gray-900 text-xs bg-white"
                          >
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Every 2 Weeks</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Repeat Until</label>
                          <input
                            type="date"
                            required={isRecurring}
                            value={repeatUntil}
                            onChange={(e) => setRepeatUntil(e.target.value)}
                            className="block w-full rounded-md border border-gray-300 p-1.5 text-gray-900 text-xs bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Admin Passcode</label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Passcode required"
                      className="w-full mt-1 p-2 border rounded-md text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold ml-auto"
                    >
                      Delete Event Details
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-blue-600 mt-3 font-medium text-base">
                    {new Date(show.event_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                  <p className="text-gray-600 mt-1">{show.address}</p>
                  {show.description && <p className="text-gray-700 mt-4 leading-relaxed">{show.description}</p>}
                </>
              )}

              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={() => handleRSVP('attending')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold text-sm"
                >
                  Going ({rsvps.attending})
                </button>
                <button
                  onClick={() => handleRSVP('interested')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-semibold text-sm"
                >
                  Interested ({rsvps.interested})
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Discussion</h2>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 p-3 rounded-md border border-gray-100">
                      <span className="font-semibold text-gray-800 text-sm">{c.author_name}</span>
                      <p className="text-gray-700 text-sm mt-1">{c.content}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-900"
                    required
                  />
                  <textarea
                    placeholder="Add a comment or ask a question..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-900"
                    rows={3}
                    required
                  />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold">
                    Post Comment
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6 sticky top-8 h-fit">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <MapWrapper shows={[show]} />
            </div>

            {seriesEvents.length > 1 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-base font-bold text-gray-900 mb-2">📅 Event Schedule & Repeat Dates</h2>
                <p className="text-xs text-gray-500 mb-3">Click any date below to view that occurrence:</p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 bg-gray-50 rounded-md border border-gray-100">
                  {seriesEvents.map((ev) => {
                    const isCurrent = ev.id === show.id;
                    const dateStr = new Date(ev.event_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                    const timeStr = new Date(ev.event_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    return (
                      <Link
                        key={ev.id}
                        href={`/event/${ev.id}`}
                        className={`p-2 rounded text-xs text-center border transition ${
                          isCurrent
                            ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-200'
                        }`}
                      >
                        <div>{dateStr}</div>
                        <div className={`text-[10px] ${isCurrent ? 'text-blue-100' : 'text-gray-500'}`}>{timeStr}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}