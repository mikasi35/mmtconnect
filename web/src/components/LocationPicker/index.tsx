'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./_MapPicker'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', background: 'var(--gray-100)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--gray-400)' }}>
      Loading map…
    </div>
  ),
});

export interface LocationData {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  value: LocationData;
  onChange: (data: LocationData) => void;
  apiKey?: string;
}

interface Suggestion {
  formatted: string;
  components: {
    house_number?: string;
    road?: string;
    suburb?: string;
    town?: string;
    city?: string;
    state?: string;
    state_code?: string;
    postcode?: string;
  };
  geometry: { lat: number; lng: number };
}

const OPENCAGE_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY ?? '';

const AU_STATES: Record<string, string> = {
  'New South Wales': 'NSW', 'Victoria': 'VIC', 'Queensland': 'QLD',
  'Western Australia': 'WA', 'South Australia': 'SA', 'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT', 'Northern Territory': 'NT',
  NSW: 'NSW', VIC: 'VIC', QLD: 'QLD', WA: 'WA', SA: 'SA', TAS: 'TAS', ACT: 'ACT', NT: 'NT',
};

function normaliseState(raw?: string): string {
  if (!raw) return '';
  return AU_STATES[raw] ?? AU_STATES[raw.toUpperCase()] ?? raw.toUpperCase().slice(0, 3);
}

async function geocode(q: string): Promise<Suggestion[]> {
  if (!OPENCAGE_KEY || !q.trim()) return [];
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(q)}&key=${OPENCAGE_KEY}&limit=5&countrycode=au&no_annotations=1`;
  const res = await fetch(url);
  const json = await res.json();
  return json.results ?? [];
}

async function reverseGeocode(lat: number, lng: number): Promise<LocationData | null> {
  if (!OPENCAGE_KEY) return null;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_KEY}&limit=1&countrycode=au&no_annotations=1`;
  const res  = await fetch(url);
  const json = await res.json();
  const r: Suggestion = json.results?.[0];
  if (!r) return null;
  return suggestionToData(r);
}

function suggestionToData(s: Suggestion): LocationData {
  const c = s.components;
  const streetNum = c.house_number ? `${c.house_number} ` : '';
  const road      = c.road ?? '';
  return {
    address:  (streetNum + road).trim(),
    suburb:   c.suburb ?? c.town ?? c.city ?? '',
    state:    normaliseState(c.state_code ?? c.state),
    postcode: c.postcode ?? '',
    lat:      s.geometry.lat,
    lng:      s.geometry.lng,
  };
}

export default function LocationPicker({ value, onChange }: Props) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [showDrop,    setShowDrop]    = useState(false);
  const [manualEdit,  setManualEdit]  = useState(false);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);

  const mapLat = value.lat ?? -33.8688;
  const mapLng = value.lng ?? 151.2093;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length < 3) { setSuggestions([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await geocode(v);
      setSuggestions(results);
      setShowDrop(results.length > 0);
      setSearching(false);
    }, 400);
  };

  const selectSuggestion = (s: Suggestion) => {
    const data = suggestionToData(s);
    onChange(data);
    setQuery(s.formatted);
    setShowDrop(false);
    setManualEdit(false);
  };

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const data = await reverseGeocode(lat, lng);
    if (data) {
      onChange(data);
      setQuery(data.address ? `${data.address}, ${data.suburb} ${data.state}` : '');
      setManualEdit(false);
    } else {
      onChange({ ...value, lat, lng });
    }
  }, [value, onChange]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const data = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (data) {
        onChange(data);
        setQuery(data.address ? `${data.address}, ${data.suburb} ${data.state}` : '');
      }
    });
  };

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Search bar */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              className="form-input"
              placeholder="Search address… (e.g. 12 Smith St, Manly NSW)"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              style={{ paddingRight: 32 }}
            />
            {searching && (
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            title="Use my current location"
            style={{
              flexShrink: 0, padding: '0 12px', height: 40,
              borderRadius: 8, border: '0.5px solid var(--gray-300)',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: 'var(--brand)', fontSize: 18,
            }}
          >
            ◎
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showDrop && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
            background: '#fff', border: '0.5px solid var(--gray-200)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: 220, overflowY: 'auto', marginTop: 4,
          }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                onMouseDown={() => selectSuggestion(s)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                  borderBottom: i < suggestions.length - 1 ? '0.5px solid var(--gray-100)' : 'none',
                  lineHeight: 1.4, color: 'var(--gray-800)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div style={{ fontWeight: 500 }}>{s.formatted.split(',')[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                  {s.formatted.split(',').slice(1).join(',').trim()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ height: 220, borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--gray-200)' }}>
        <MapPicker lat={mapLat} lng={mapLng} onMapClick={handleMapClick} />
      </div>

      {/* Parsed fields */}
      {(value.address || value.suburb) && !manualEdit && (
        <div style={{ background: 'var(--brand-subtle)', border: '0.5px solid var(--brand-light)', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Selected location</span>
            <button type="button" onClick={() => setManualEdit(true)} style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Edit manually
            </button>
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-800)', display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
            {value.address && <span><b>Street:</b> {value.address}</span>}
            {value.suburb  && <span><b>Suburb:</b> {value.suburb}</span>}
            {value.state   && <span><b>State:</b> {value.state}</span>}
            {value.postcode && <span><b>Postcode:</b> {value.postcode}</span>}
          </div>
        </div>
      )}

      {/* Manual edit fallback */}
      {(manualEdit || (!value.address && !value.suburb)) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Street address *</label>
            <input className="form-input" value={value.address} onChange={e => onChange({ ...value, address: e.target.value })} placeholder="12 Example St" />
          </div>
          <div className="form-group">
            <label className="form-label">Suburb *</label>
            <input className="form-input" value={value.suburb} onChange={e => onChange({ ...value, suburb: e.target.value })} placeholder="Manly" />
          </div>
          <div className="form-group">
            <label className="form-label">State *</label>
            <select className="form-select" value={value.state} onChange={e => onChange({ ...value, state: e.target.value })}>
              <option value="">Select…</option>
              {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Postcode</label>
            <input className="form-input" value={value.postcode} onChange={e => onChange({ ...value, postcode: e.target.value })} placeholder="2095" />
          </div>
        </div>
      )}
    </div>
  );
}
