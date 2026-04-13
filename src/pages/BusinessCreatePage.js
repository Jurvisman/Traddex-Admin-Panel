import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components';
import {
  createUserAccount,
  listBusinessTypes,
  listCities,
  listCountries,
  listIndustries,
  listRoles,
  listStates,
  sendBusinessCreateOtp,
  updateBusinessProfile,
  verifyBusinessCreateOtp,
} from '../services/adminApi';

/* ── Validation regexes ──────────────────────────────────────── */
const RE_PHONE  = /^[6-9][0-9]{9}$/;
const RE_EMAIL  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_GST    = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const RE_PAN    = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const RE_IFSC   = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const RE_POSTAL = /^[1-9][0-9]{5}$/;
const RE_URL    = /^https?:\/\/.+\..+/;

/* ── Business Hours presets ───────────────────────────────────── */
const HOURS_PRESETS = [
  { label: 'Mon – Sat, 9:00 AM – 6:00 PM', value: 'Mon – Sat, 9:00 AM – 6:00 PM' },
  { label: 'Mon – Sat, 10:00 AM – 7:00 PM', value: 'Mon – Sat, 10:00 AM – 7:00 PM' },
  { label: 'Mon – Sun, 9:00 AM – 9:00 PM', value: 'Mon – Sun, 9:00 AM – 9:00 PM' },
  { label: 'Mon – Sun, 24 Hours', value: 'Mon – Sun, 24 Hours' },
  { label: 'Mon – Fri, 9:00 AM – 6:00 PM', value: 'Mon – Fri, 9:00 AM – 6:00 PM' },
  { label: 'Mon – Fri, 10:00 AM – 7:00 PM', value: 'Mon – Fri, 10:00 AM – 7:00 PM' },
  { label: 'Mon – Sat, 8:00 AM – 8:00 PM', value: 'Mon – Sat, 8:00 AM – 8:00 PM' },
  { label: 'Tue – Sun, 11:00 AM – 10:00 PM', value: 'Tue – Sun, 11:00 AM – 10:00 PM' },
  { label: 'Custom', value: '__custom__' },
];

/* ── Tabs ────────────────────────────────────────────────────── */
const TABS = [
  { key: 'account',  label: 'Account',  icon: '👤' },
  { key: 'business', label: 'Business', icon: '🏢' },
  { key: 'address',  label: 'Address',  icon: '📍' },
  { key: 'banking',  label: 'Banking',  icon: '🏦' },
];

const INITIAL_FORM = {
  ownerName: '', phone: '', roleId: '', email: '',
  businessName: '', industry: '', segment: '', gstNumber: '', businessPan: '',
  udyam: '', website: '', description: '', experience: '', hours: '', businessType: '',
  address: '', plotNo: '', landmark: '', postalCode: '', cityCode: '', stateCode: '',
  countryCode: 'IN', latitude: '', longitude: '',
  accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '',
};

const FIELD_TAB_MAP = {
  ownerName: 'account', phone: 'account', roleId: 'account', email: 'account',
  businessName: 'business', industry: 'business', segment: 'business',
  gstNumber: 'business', businessPan: 'business', udyam: 'business',
  website: 'business', description: 'business', experience: 'business',
  hours: 'business', businessType: 'business',
  address: 'address', plotNo: 'address', landmark: 'address', postalCode: 'address',
  cityCode: 'address', stateCode: 'address', countryCode: 'address',
  latitude: 'address', longitude: 'address',
  accountHolderName: 'banking', bankName: 'banking', accountNumber: 'banking', ifscCode: 'banking',
};

/* ── Per-field validation ────────────────────────────────────── */
function validateField(key, value) {
  const v = String(value ?? '').trim();
  switch (key) {
    case 'ownerName':    return !v ? 'Owner name is required.' : v.length < 2 ? 'Min 2 characters.' : null;
    case 'phone':        return !v ? 'Phone number is required.' : !RE_PHONE.test(v) ? 'Enter a valid 10-digit Indian mobile number.' : null;
    case 'email':        return v && !RE_EMAIL.test(v) ? 'Enter a valid email address.' : null;
    case 'businessName': return !v ? 'Business name is required.' : v.length < 2 ? 'Min 2 characters.' : null;
    case 'industry':     return !v ? 'Industry is required.' : null;
    case 'segment':      return !v ? 'Segment is required.' : null;
    case 'businessType': return !v ? 'Business type is required.' : null;
    case 'gstNumber':    return !v ? 'GST number is required.' : !RE_GST.test(v.toUpperCase()) ? 'Invalid GST. Example: 22AAAAA0000A1Z5' : null;
    case 'businessPan':  return !v ? 'PAN number is required.' : !RE_PAN.test(v.toUpperCase()) ? 'Invalid PAN. Example: AAAAA0000A' : null;
    case 'website':      return v && !RE_URL.test(v) ? 'Must start with http:// or https://' : null;
    case 'address':      return !v ? 'Address is required.' : null;
    case 'postalCode':   return !v ? 'PIN code is required.' : !RE_POSTAL.test(v) ? 'Enter a valid 6-digit PIN code.' : null;
    case 'countryCode':  return null;
    case 'stateCode':    return null;
    case 'cityCode':     return null;
    case 'ifscCode':     return v && !RE_IFSC.test(v.toUpperCase()) ? 'Invalid IFSC. Example: SBIN0001234' : null;
    case 'accountNumber': return v && !/^[0-9]{9,18}$/.test(v) ? 'Enter 9–18 digit account number.' : null;
    case 'latitude': { if (!v) return null; const n = Number(v); return Number.isNaN(n) || n < -90 || n > 90 ? 'Latitude must be –90 to 90.' : null; }
    case 'longitude': { if (!v) return null; const n = Number(v); return Number.isNaN(n) || n < -180 || n > 180 ? 'Longitude must be –180 to 180.' : null; }
    default: return null;
  }
}

function validateAll(form) {
  const errors = {};
  Object.keys(form).forEach((k) => { const e = validateField(k, form[k]); if (e) errors[k] = e; });
  return errors;
}

/* ── Nominatim address search ────────────────────────────────── */
async function searchNominatim(query) {
  if (!query || query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&countrycodes=in`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return [];
  return res.json();
}

/* ── Leaflet Map Picker ──────────────────────────────────────── */
function MapPicker({ lat, lng, onPick }) {
  const mapInstanceRef = useRef(null);
  const markerRef      = useRef(null);
  const leafletRef     = useRef(null);
  const containerRef   = useRef(null);
  const destroyedRef   = useRef(false);

  useEffect(() => {
    destroyedRef.current = false;

    // Clean up any previous instance on this DOM node
    if (containerRef.current?._leaflet_id) {
      containerRef.current._leaflet_id = null;
    }
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch (_) {}
      mapInstanceRef.current = null;
      markerRef.current = null;
    }

    import('leaflet').then((L) => {
      if (destroyedRef.current || !containerRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (containerRef.current._leaflet_id) containerRef.current._leaflet_id = null;

      const initLat = lat || 22.3039;
      const initLng = lng || 70.8022;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([initLat, initLng], lat ? 14 : 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng();
          onPick(p.lat.toFixed(6), p.lng.toFixed(6));
        });
      }

      map.on('click', (e) => {
        const { lat: cLat, lng: cLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([cLat, cLng]);
        } else {
          markerRef.current = L.marker([cLat, cLng], { draggable: true }).addTo(map);
          markerRef.current.on('dragend', () => {
            const p = markerRef.current.getLatLng();
            onPick(p.lat.toFixed(6), p.lng.toFixed(6));
          });
        }
        onPick(cLat.toFixed(6), cLng.toFixed(6));
      });

      mapInstanceRef.current = map;
      leafletRef.current = L;
    });

    return () => {
      destroyedRef.current = true;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      if (containerRef.current) containerRef.current._leaflet_id = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes to the map (e.g. from address search)
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletRef.current || !lat || !lng) return;
    const L = leafletRef.current;
    const pos = [Number(lat), Number(lng)];
    mapInstanceRef.current.setView(pos, 15);
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      markerRef.current = L.marker(pos, { draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        onPick(p.lat.toFixed(6), p.lng.toFixed(6));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return <div ref={containerRef} className="bc-map-container" />;
}

/* ── Address Search Box ──────────────────────────────────────── */
function AddressSearchBox({ onSelect }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDrop(true);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchNominatim(val)); }
      catch (_) { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  };

  const pick = (item) => {
    const addr = item.address || {};
    onSelect({
      displayName: item.display_name,
      lat: item.lat,
      lng: item.lon,
      address: [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(', ') || item.display_name.split(',').slice(0, 2).join(',').trim(),
      plotNo: addr.house_number || '',
      landmark: addr.road || addr.pedestrian || '',
      postalCode: addr.postcode || '',
      cityCode: addr.city || addr.town || addr.village || addr.county || '',
      stateCode: addr.state || '',
      countryCode: addr.country_code ? addr.country_code.toUpperCase() : 'IN',
    });
    setQuery(item.display_name);
    setShowDrop(false);
  };

  return (
    <div className="bc-addr-search-wrap" ref={wrapRef}>
      <div className="bc-addr-search-input-row">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="bc-addr-search-icon">
          <circle cx="9" cy="9" r="6" /><path d="m15 15 3 3" />
        </svg>
        <input
          type="text"
          className="bc-addr-search-input"
          placeholder="Search address, area, city…"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          autoComplete="off"
        />
        {isLoading ? <span className="bc-addr-spinner" /> : null}
        {query ? (
          <button type="button" className="bc-addr-clear" onClick={() => { setQuery(''); setResults([]); setShowDrop(false); }}>✕</button>
        ) : null}
      </div>
      {showDrop && results.length > 0 ? (
        <ul className="bc-addr-dropdown">
          {results.map((item, i) => {
            const parts = item.display_name.split(',');
            const main  = parts.slice(0, 2).join(',').trim();
            const sub   = parts.slice(2, 5).join(',').trim();
            return (
              <li key={i} className="bc-addr-option" onMouseDown={() => pick(item)}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="bc-addr-opt-icon">
                  <path d="M10 2C6.686 2 4 4.686 4 8c0 4.418 6 10 6 10s6-5.582 6-10c0-3.314-2.686-6-6-6z" />
                  <circle cx="10" cy="8" r="2" />
                </svg>
                <div>
                  <p className="bc-addr-opt-main">{main}</p>
                  {sub ? <p className="bc-addr-opt-sub">{sub}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : showDrop && query.length >= 3 && !isLoading ? (
        <div className="bc-addr-dropdown bc-addr-no-results">No results found</div>
      ) : null}
    </div>
  );
}

/* ── Field wrapper ───────────────────────────────────────────── */
function Field({ label, required, error, touched, hint, span2, children }) {
  const showErr = error && touched;
  return (
    <div className={`bc-field${span2 ? ' bc-span2' : ''}${showErr ? ' bc-field-error' : ''}`}>
      <label className="bc-field-label">
        {label}{required ? <span className="bc-required"> *</span> : null}
      </label>
      {children}
      {showErr
        ? <span className="bc-error-msg">{error}</span>
        : hint ? <span className="bc-hint">{hint}</span> : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
function BusinessCreatePage({ token }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [form, setForm]           = useState(INITIAL_FORM);
  const [errors, setErrors]       = useState({});
  const [touched, setTouched]     = useState({});
  const [roles, setRoles]             = useState([]);
  const [industries, setIndustries]   = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [countries, setCountries]     = useState([]);
  const [states, setStates]           = useState([]);
  const [cities, setCities]           = useState([]);
  const [customHours, setCustomHours] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [message, setMessage]     = useState({ type: 'info', text: '' });

  // OTP flow
  const [otpSent, setOtpSent]           = useState(false);
  const [otpCode, setOtpCode]           = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpLoading, setOtpLoading]     = useState(false);
  const [otpError, setOtpError]         = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const timerRef = useRef(null);
  const activeTabIndex = TABS.findIndex((tab) => tab.key === activeTab);
  const isLastTab = activeTabIndex === TABS.length - 1;

  /* ── Load reference data ────────────────────────────────────── */
  useEffect(() => {
    Promise.allSettled([
      listRoles(token),
      listIndustries(token),
      listCountries(token),
    ]).then(([rolesRes, indRes, countriesRes]) => {
      if (rolesRes.status === 'fulfilled') {
        const list = Array.isArray(rolesRes.value?.data) ? rolesRes.value.data : [];
        setRoles(list);
        if (list.length > 0) {
          const firstId = String(list[0]?.id || list[0]?.roles_id || list[0]?.roleId || '');
          setForm((p) => ({ ...p, roleId: firstId }));
        }
      }
      if (indRes.status === 'fulfilled') {
        const list = Array.isArray(indRes.value?.data) ? indRes.value.data : [];
        setIndustries(list);
      }
      if (countriesRes.status === 'fulfilled') {
        const list = Array.isArray(countriesRes.value?.data) ? countriesRes.value.data : [];
        setCountries(list);
      }
    });
    // Load states for default country IN
    listStates(token, 'IN').then((res) => {
      const list = Array.isArray(res?.data) ? res.data : [];
      setStates(list);
    }).catch(() => {});
  }, [token]);

  // When countryCode changes → reload states & clear state/city
  useEffect(() => {
    if (!form.countryCode) { setStates([]); setCities([]); return; }
    listStates(token, form.countryCode).then((res) => {
      setStates(Array.isArray(res?.data) ? res.data : []);
      setCities([]);
    }).catch(() => { setStates([]); setCities([]); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.countryCode]);

  // When stateCode changes → reload cities & clear city
  useEffect(() => {
    if (!form.stateCode) { setCities([]); return; }
    listCities(token, form.stateCode).then((res) => {
      setCities(Array.isArray(res?.data) ? res.data : []);
    }).catch(() => setCities([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.stateCode]);

  // When segment changes → reload business types & clear selected type
  useEffect(() => {
    if (!form.segment) { setBusinessTypes([]); return; }
    listBusinessTypes(token, form.segment).then((res) => {
      const list = Array.isArray(res?.data) ? res.data : [];
      setBusinessTypes(list);
    }).catch(() => setBusinessTypes([]));
    // Clear businessType when segment changes
    setForm((prev) => ({ ...prev, businessType: '' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.segment]);

  /* ── Field change / blur ────────────────────────────────────── */
  const handleChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    const err = validateField(key, value);
    setErrors((prev) => ({ ...prev, [key]: err || undefined }));
    if (key === 'phone') {
      setPhoneVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
    }
  }, []);

  const handleBlur = useCallback((key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: validateField(key, form[key]) || undefined }));
  }, [form]);

  /* ── Hours picker ───────────────────────────────────────────── */
  const handleHoursPreset = (val) => {
    if (val === '__custom__') {
      setCustomHours(true);
      handleChange('hours', '');
    } else {
      setCustomHours(false);
      handleChange('hours', val);
    }
  };

  /* ── Map pick ───────────────────────────────────────────────── */
  const handleMapPick = useCallback((lat, lng) => {
    handleChange('latitude', lat);
    handleChange('longitude', lng);
  }, [handleChange]);

  /* ── Address search result → fill fields ─────────────────────── */
  const handleAddressSelect = useCallback((place) => {
    // Fuzzy-match state name from Nominatim against loaded states list
    const matchCode = (list, nameKey, codeKey, query) => {
      if (!query) return '';
      const q = query.toLowerCase().trim();
      const exact = list.find((i) => (i[nameKey] || '').toLowerCase() === q);
      if (exact) return exact[codeKey];
      const partial = list.find((i) => (i[nameKey] || '').toLowerCase().startsWith(q) || q.startsWith((i[nameKey] || '').toLowerCase()));
      return partial ? partial[codeKey] : '';
    };

    const newCountry = place.countryCode || 'IN';

    // Load states for the matched country, then match state, then city
    listStates(token, newCountry).then((stRes) => {
      const stList = Array.isArray(stRes?.data) ? stRes.data : [];
      setStates(stList);
      const matchedState = matchCode(stList, 'name', 'code', place.stateCode);

      if (matchedState) {
        listCities(token, matchedState).then((ctRes) => {
          const ctList = Array.isArray(ctRes?.data) ? ctRes.data : [];
          setCities(ctList);
          const matchedCity = matchCode(ctList, 'name', 'code', place.cityCode);
          setForm((prev) => ({
            ...prev,
            address:     place.address    || prev.address,
            plotNo:      place.plotNo     || prev.plotNo,
            landmark:    place.landmark   || prev.landmark,
            postalCode:  place.postalCode || prev.postalCode,
            countryCode: newCountry,
            stateCode:   matchedState,
            cityCode:    matchedCity || '',
            latitude:    place.lat || prev.latitude,
            longitude:   place.lng || prev.longitude,
          }));
        }).catch(() => {
          setForm((prev) => ({
            ...prev,
            address: place.address || prev.address, plotNo: place.plotNo || prev.plotNo,
            landmark: place.landmark || prev.landmark, postalCode: place.postalCode || prev.postalCode,
            countryCode: newCountry, stateCode: matchedState, cityCode: '',
            latitude: place.lat || prev.latitude, longitude: place.lng || prev.longitude,
          }));
        });
      } else {
        setForm((prev) => ({
          ...prev,
          address: place.address || prev.address, plotNo: place.plotNo || prev.plotNo,
          landmark: place.landmark || prev.landmark, postalCode: place.postalCode || prev.postalCode,
          countryCode: newCountry, stateCode: '', cityCode: '',
          latitude: place.lat || prev.latitude, longitude: place.lng || prev.longitude,
        }));
      }
    }).catch(() => {
      setForm((prev) => ({
        ...prev,
        address: place.address || prev.address, postalCode: place.postalCode || prev.postalCode,
        countryCode: newCountry, latitude: place.lat || prev.latitude, longitude: place.lng || prev.longitude,
      }));
    });

    const addrKeys = ['address','plotNo','landmark','postalCode','cityCode','stateCode','countryCode','latitude','longitude'];
    setTouched((prev) => { const n = { ...prev }; addrKeys.forEach((k) => { n[k] = true; }); return n; });
  }, [token]);

  /* ── OTP handlers ───────────────────────────────────────────── */
  const startResendTimer = () => {
    setOtpResendTimer(30);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const phone = form.phone.trim();
    if (!RE_PHONE.test(phone)) {
      setErrors((p) => ({ ...p, phone: 'Enter a valid 10-digit Indian mobile number.' }));
      setTouched((p) => ({ ...p, phone: true }));
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      await sendBusinessCreateOtp(token, phone);
      setOtpSent(true);
      setOtpCode('');
      setPhoneVerified(false);
      startResendTimer();
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      setOtpError('Enter the OTP sent to your mobile number.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      await verifyBusinessCreateOtp(token, form.phone.trim(), otpCode);
      setPhoneVerified(true);
      setOtpSent(false);
      setOtpCode('');
      clearInterval(timerRef.current);
    } catch (err) {
      setOtpError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  /* ── Geolocate ───────────────────────────────────────────────── */
  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { handleChange('latitude', pos.coords.latitude.toFixed(6)); handleChange('longitude', pos.coords.longitude.toFixed(6)); },
      () => setMessage({ type: 'error', text: 'Could not get location. Please allow location access.' })
    );
  };

  /* ── Tab error count ─────────────────────────────────────────── */
  const tabErrors = (tabKey) =>
    Object.entries(errors).filter(([k, v]) => FIELD_TAB_MAP[k] === tabKey && v).length;

  const validateTab = useCallback((tabKey) => {
    const tabFields = Object.keys(FIELD_TAB_MAP).filter((fieldKey) => FIELD_TAB_MAP[fieldKey] === tabKey);
    const nextTouched = {};
    const nextErrors = {};

    tabFields.forEach((fieldKey) => {
      nextTouched[fieldKey] = true;
      const fieldError = validateField(fieldKey, form[fieldKey]);
      if (fieldError) {
        nextErrors[fieldKey] = fieldError;
      }
    });

    setTouched((prev) => ({ ...prev, ...nextTouched }));
    setErrors((prev) => {
      const updated = { ...prev };
      tabFields.forEach((fieldKey) => {
        delete updated[fieldKey];
      });
      return { ...updated, ...nextErrors };
    });

    if (tabKey === 'account' && !phoneVerified) {
      setMessage({ type: 'error', text: 'Please verify the mobile number with OTP before proceeding.' });
      return false;
    }

    if (Object.keys(nextErrors).length > 0) {
      setMessage({ type: 'error', text: 'Please fix the highlighted errors before continuing.' });
      return false;
    }

    setMessage((prev) => (prev.type === 'error' ? { type: 'info', text: '' } : prev));
    return true;
  }, [form, phoneVerified]);

  const handleNextTab = useCallback(() => {
    if (activeTabIndex >= TABS.length - 1) return;
    if (!validateTab(activeTab)) return;
    setActiveTab(TABS[activeTabIndex + 1].key);
  }, [activeTab, activeTabIndex, validateTab]);

  const handleNextClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    handleNextTab();
  }, [handleNextTab]);

  const handleBackClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeTabIndex <= 0) return;
    setActiveTab(TABS[activeTabIndex - 1].key);
  }, [activeTabIndex]);

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLastTab) {
      handleNextTab();
      return;
    }
    const allErrors = validateAll(form);
    const allTouched = {};
    Object.keys(form).forEach((k) => { allTouched[k] = true; });
    setErrors(allErrors);
    setTouched(allTouched);
    if (Object.keys(allErrors).length > 0) {
      const firstKey = Object.keys(allErrors)[0];
      setActiveTab(FIELD_TAB_MAP[firstKey]);
      setMessage({ type: 'error', text: 'Please fix the highlighted errors before submitting.' });
      return;
    }
    if (!phoneVerified) {
      setActiveTab('account');
      setMessage({ type: 'error', text: 'Please verify the mobile number with OTP before submitting.' });
      return;
    }
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const gst = form.gstNumber.trim().toUpperCase();
      const pan = form.businessPan.trim().toUpperCase();
      const accountResp = await createUserAccount(token, {
        name: form.ownerName.trim(),
        number: form.phone.trim(),
        userType: 'BUSINESS',
        role: form.roleId || 'BUSINESS',
        businessGeneral: {
          businessName: form.businessName.trim(),
          phoneNumber: form.phone.trim(),
          industry: form.industry.trim(),
          type: form.segment || undefined,
        },
        businessMain: (gst || pan) ? {
          gstNumber: gst || undefined,
          panNumber: pan || undefined,
        } : undefined,
      });
      const newUserId =
        accountResp?.data?.id || accountResp?.data?.user_id ||
        accountResp?.data?.userId || accountResp?.id;
      if (!newUserId) throw new Error('Account created but user ID not returned.');
      await updateBusinessProfile(token, newUserId, {
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim() || null,
        industry: form.industry || null,
        businessType: form.businessType || null,
        gstNumber: form.gstNumber.trim().toUpperCase() || null,
        businessPan: form.businessPan.trim().toUpperCase() || null,
        udyam: form.udyam.trim() || null, website: form.website.trim() || null,
        description: form.description.trim() || null, experience: form.experience.trim() || null,
        hours: form.hours.trim() || null,
        address: form.address.trim() || null, postalCode: form.postalCode.trim() || null,
        plotNo: form.plotNo.trim() || null, landmark: form.landmark.trim() || null,
        cityCode: form.cityCode.trim() || null, stateCode: form.stateCode.trim() || null,
        countryCode: form.countryCode.trim() || null,
        latitude:  form.latitude  !== '' ? Number(form.latitude)  : null,
        longitude: form.longitude !== '' ? Number(form.longitude) : null,
        accountHolderName: form.accountHolderName.trim() || null,
        bankName: form.bankName.trim() || null, accountNumber: form.accountNumber.trim() || null,
        ifscCode: form.ifscCode.trim().toUpperCase() || null,
      });
      navigate('/admin/businesses', { state: { success: `Business "${form.businessName}" created successfully.` } });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create business.' });
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Shorthand input props ───────────────────────────────────── */
  const inp = (key, extra = {}) => ({
    value: form[key],
    onChange: (e) => handleChange(key, e.target.value),
    onBlur:   () => handleBlur(key),
    ...extra,
  });

  const mapLat = form.latitude  ? Number(form.latitude)  : null;
  const mapLng = form.longitude ? Number(form.longitude) : null;

  /* ── Selected hours preset (for controlling the select value) ── */
  const selectedPreset = HOURS_PRESETS.find((p) => p.value === form.hours && p.value !== '__custom__')
    ? form.hours : (customHours || (form.hours && !HOURS_PRESETS.find((p) => p.value === form.hours)) ? '__custom__' : '');

  return (
    <div className="bc-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="bc-page-header">
        <div className="bc-header-left">
          <button type="button" className="bv-back-link" onClick={() => navigate('/admin/businesses')}>
            ← All Businesses
          </button>
        </div>
        <div className="bc-header-actions">
          <button type="button" className="ghost-btn" onClick={() => navigate('/admin/businesses')} disabled={isSaving}>
            Cancel
          </button>
          {isLastTab ? (
            <button key="header-submit" type="submit" form="bc-form" className="primary-btn" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Business'}
            </button>
          ) : (
            <button
              key="header-next"
              type="button"
              className="primary-btn"
              onClick={handleNextClick}
              disabled={isSaving || (activeTab === 'account' && !phoneVerified)}
              title={activeTab === 'account' && !phoneVerified ? 'Verify mobile number first' : ''}
            >
              Next
            </button>
          )}
        </div>
      </div>

      <Banner message={message} />

      <div className="bc-body">
        {/* ── Tab Sidebar ──────────────────────────────────────── */}
        <div className="bc-tab-sidebar">
          {TABS.map((tab) => {
            const errs = tabErrors(tab.key);
            return (
              <button key={tab.key} type="button"
                className={`bc-tab-item ${activeTab === tab.key ? 'active' : ''} ${errs > 0 ? 'has-error' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="bc-tab-icon">{tab.icon}</span>
                <span className="bc-tab-label">{tab.label}</span>
                {errs > 0 ? <span className="bc-tab-err-badge">{errs}</span> : null}
              </button>
            );
          })}

          {/* Progress hint */}
          <div className="bc-sidebar-progress">
            {TABS.map((tab, i) => {
              const errs = tabErrors(tab.key);
              const isDone = errs === 0 && activeTab !== tab.key &&
                Object.keys(touched).some((k) => FIELD_TAB_MAP[k] === tab.key);
              return (
                <div key={tab.key} className={`bc-prog-dot ${activeTab === tab.key ? 'active' : ''} ${isDone ? 'done' : ''} ${errs > 0 ? 'err' : ''}`}
                  title={tab.label} onClick={() => setActiveTab(tab.key)}
                />
              );
            })}
          </div>
        </div>

        {/* ── Form Panel ───────────────────────────────────────── */}
        <form id="bc-form" className="bc-form-panel" onSubmit={handleSubmit} noValidate>

          {/* ═══ ACCOUNT ═══════════════════════════════════════ */}
          {activeTab === 'account' ? (
            <div className="bc-section">
              <div className="bc-section-head">
                <h2 className="bc-section-title">Account Details</h2>
                <p className="bc-section-sub">Enter the business owner's name and verify their mobile number via OTP.</p>
              </div>
              <div className="bc-grid">
                <Field label="Owner / Account Name" required error={errors.ownerName} touched={touched.ownerName}>
                  <input type="text" placeholder="Full name" {...inp('ownerName')} />
                </Field>

                {/* Mobile + OTP */}
                <div className={`bc-field${errors.phone && touched.phone ? ' bc-field-error' : ''}`}>
                  <label className="bc-field-label">
                    Mobile Number<span className="bc-required"> *</span>
                  </label>
                  <div className="bc-otp-phone-row">
                    <input
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      {...inp('phone')}
                      readOnly={phoneVerified}
                      className={phoneVerified ? 'bc-input-verified' : ''}
                    />
                    {phoneVerified ? (
                      <span className="bc-verified-badge">✓ Verified</span>
                    ) : (
                      <button
                        type="button"
                        className="bc-send-otp-btn"
                        onClick={handleSendOtp}
                        disabled={otpLoading || !RE_PHONE.test(form.phone.trim()) || otpResendTimer > 0}
                      >
                        {otpLoading && !otpSent ? '…' : otpSent
                          ? (otpResendTimer > 0 ? `Resend in ${otpResendTimer}s` : 'Resend OTP')
                          : 'Send OTP'}
                      </button>
                    )}
                  </div>
                  {errors.phone && touched.phone
                    ? <span className="bc-error-msg">{errors.phone}</span>
                    : <span className="bc-hint">10-digit Indian mobile number</span>}
                </div>

                {/* OTP input — shown after send */}
                {otpSent && !phoneVerified ? (
                  <div className="bc-field bc-span2">
                    <label className="bc-field-label">Enter OTP</label>
                    <div className="bc-otp-verify-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 4–6 digit OTP"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                        className="bc-otp-input"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || !otpCode}
                      >
                        {otpLoading ? 'Verifying…' : 'Verify OTP'}
                      </button>
                    </div>
                    {otpError
                      ? <span className="bc-error-msg">{otpError}</span>
                      : <span className="bc-hint">OTP sent to +91 {form.phone}</span>}
                  </div>
                ) : null}

                {!phoneVerified && !otpSent && otpError ? (
                  <div className="bc-field bc-span2">
                    <span className="bc-error-msg">{otpError}</span>
                  </div>
                ) : null}

                <Field label="Business Email" error={errors.email} touched={touched.email} hint="Business contact email address">
                  <input type="email" placeholder="business@example.com" {...inp('email')} />
                </Field>

                <Field label="Role" error={errors.roleId} touched={touched.roleId}>
                  <select {...inp('roleId')}>
                    <option value="">— Default role —</option>
                    {roles.map((r) => {
                      const id = String(r?.id || r?.roles_id || r?.roleId || '');
                      return <option key={id} value={id}>{r?.name || r?.role_name || `Role ${id}`}</option>;
                    })}
                  </select>
                </Field>
              </div>

              {/* Warning if not verified */}
              {!phoneVerified ? (
                <div className="bc-verify-notice">
                  <span>📱</span>
                  <p>Mobile number must be verified before proceeding to the next step.</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ═══ BUSINESS ══════════════════════════════════════ */}
          {activeTab === 'business' ? (
            <div className="bc-section">
              <div className="bc-section-head">
                <h2 className="bc-section-title">Business Details</h2>
                <p className="bc-section-sub">Core business info, KYC documents and profile details.</p>
              </div>
              <div className="bc-grid">
                <Field label="Business Name" required error={errors.businessName} touched={touched.businessName} span2>
                  <input type="text" placeholder="Official registered business name" {...inp('businessName')} />
                </Field>

                {/* Industry — dropdown from API */}
                <Field label="Industry" required error={errors.industry} touched={touched.industry}>
                  <select {...inp('industry')}>
                    <option value="">— Select industry —</option>
                    {industries.map((ind) => {
                      const id   = String(ind?.id || ind?.industryId || '');
                      const name = ind?.name || ind?.industryName || ind?.title || id;
                      return <option key={id} value={name}>{name}</option>;
                    })}
                  </select>
                </Field>

                {/* Segment — B2B or B2C */}
                <Field label="Segment" required error={errors.segment} touched={touched.segment}>
                  <select {...inp('segment')}>
                    <option value="">— Select segment —</option>
                    <option value="B2B">B2B (Business to Business)</option>
                    <option value="B2C">B2C (Business to Customer)</option>
                  </select>
                </Field>

                <Field label="GST Number" required error={errors.gstNumber} touched={touched.gstNumber} hint="22AAAAA0000A1Z5">
                  <input type="text" placeholder="22AAAAA0000A1Z5" maxLength={15}
                    value={form.gstNumber}
                    onChange={(e) => handleChange('gstNumber', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('gstNumber')} />
                </Field>
                <Field label="Business PAN" required error={errors.businessPan} touched={touched.businessPan} hint="AAAAA0000A">
                  <input type="text" placeholder="AAAAA0000A" maxLength={10}
                    value={form.businessPan}
                    onChange={(e) => handleChange('businessPan', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('businessPan')} />
                </Field>

                <Field label="Business Type" required error={errors.businessType} touched={touched.businessType}
                  hint={!form.segment ? 'Select a segment first to load business types' : ''}>
                  <select {...inp('businessType')} disabled={!form.segment}>
                    <option value="">— Select type —</option>
                    {businessTypes.length > 0
                      ? businessTypes.map((t) => {
                          const name = t?.typeName || t?.name || t?.type || String(t);
                          return <option key={name} value={name}>{name}</option>;
                        })
                      : ['Manufacturer', 'Trader / Distributor', 'Retailer', 'Service Provider',
                          'Wholesaler', 'Importer / Exporter', 'Consultant', 'Other'].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))
                    }
                  </select>
                </Field>

                <Field label="Udyam Registration" error={errors.udyam} touched={touched.udyam}>
                  <input type="text" placeholder="UDYAM-XX-00-0000000" {...inp('udyam')} />
                </Field>

                <Field label="Website" error={errors.website} touched={touched.website} hint="https://...">
                  <input type="url" placeholder="https://yourbusiness.com" {...inp('website')} />
                </Field>

                <Field label="Experience" error={errors.experience} touched={touched.experience}>
                  <input type="text" placeholder="e.g. 10 years" {...inp('experience')} />
                </Field>

                {/* Business Hours — preset dropdown + optional custom */}
                <Field label="Business Hours" error={errors.hours} touched={touched.hours} span2>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handleHoursPreset(e.target.value)}
                    className={errors.hours && touched.hours ? 'bc-select-err' : ''}
                  >
                    <option value="">— Select hours —</option>
                    {HOURS_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {customHours || (form.hours && !HOURS_PRESETS.find((p) => p.value === form.hours && p.value !== '__custom__')) ? (
                    <input
                      type="text"
                      placeholder="e.g. Mon – Sat 9:00 AM – 8:00 PM, Sun closed"
                      {...inp('hours')}
                      style={{ marginTop: 8 }}
                    />
                  ) : null}
                </Field>

                <Field label="Description" error={errors.description} touched={touched.description} span2>
                  <textarea placeholder="Brief description of the business…" rows={4}
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    onBlur={() => handleBlur('description')} />
                </Field>
              </div>
            </div>
          ) : null}

          {/* ═══ ADDRESS ═══════════════════════════════════════ */}
          {activeTab === 'address' ? (
            <div className="bc-section">
              <div className="bc-section-head">
                <h2 className="bc-section-title">Address & Location</h2>
                <p className="bc-section-sub">Search for the business address, then confirm fields and pin the location on the map.</p>
              </div>

              {/* Address search box */}
              <div className="bc-addr-search-section">
                <p className="bc-addr-search-label">Search address</p>
                <AddressSearchBox onSelect={handleAddressSelect} />
                <p className="bc-addr-search-note">Selecting a result auto-fills the fields below and pins the location on the map.</p>
              </div>

              <div className="bc-grid" style={{ marginTop: 20 }}>
                <Field label="Full Address" required error={errors.address} touched={touched.address} span2>
                  <textarea placeholder="Street address, area, locality…" rows={3}
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')} />
                </Field>
                <Field label="Plot / Door No." error={errors.plotNo} touched={touched.plotNo}>
                  <input type="text" placeholder="e.g. 42-B" {...inp('plotNo')} />
                </Field>
                <Field label="Landmark" error={errors.landmark} touched={touched.landmark}>
                  <input type="text" placeholder="e.g. Near City Mall" {...inp('landmark')} />
                </Field>
                <Field label="PIN Code" required error={errors.postalCode} touched={touched.postalCode} hint="6-digit">
                  <input type="text" placeholder="380001" maxLength={6} {...inp('postalCode')} />
                </Field>
                <Field label="Country" required error={errors.countryCode} touched={touched.countryCode}>
                  <select
                    value={form.countryCode}
                    onChange={(e) => {
                      handleChange('countryCode', e.target.value);
                      setForm((p) => ({ ...p, stateCode: '', cityCode: '' }));
                    }}
                    onBlur={() => handleBlur('countryCode')}
                  >
                    <option value="">— Select country —</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="State" required error={errors.stateCode} touched={touched.stateCode}>
                  <select
                    value={form.stateCode}
                    onChange={(e) => {
                      handleChange('stateCode', e.target.value);
                      setForm((p) => ({ ...p, cityCode: '' }));
                    }}
                    onBlur={() => handleBlur('stateCode')}
                    disabled={!form.countryCode}
                  >
                    <option value="">— Select state —</option>
                    {states.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="City" required error={errors.cityCode} touched={touched.cityCode}>
                  <select
                    value={form.cityCode}
                    onChange={(e) => handleChange('cityCode', e.target.value)}
                    onBlur={() => handleBlur('cityCode')}
                    disabled={!form.stateCode}
                  >
                    <option value="">— Select city —</option>
                    {cities.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Map */}
              <div className="bc-map-section">
                <div className="bc-map-head">
                  <div>
                    <p className="bc-map-title">Pin on Map</p>
                    <p className="bc-map-sub">Click to drop a pin · Drag to adjust · Use My Location to auto-detect</p>
                  </div>
                  <button type="button" className="ghost-btn small" onClick={handleGeolocate}>
                    📍 Use My Location
                  </button>
                </div>
                <MapPicker lat={mapLat} lng={mapLng} onPick={handleMapPick} />
                <div className="bc-coords-row">
                  <Field label="Latitude" error={errors.latitude} touched={touched.latitude}>
                    <input type="number" step="any" placeholder="23.0225" {...inp('latitude')} />
                  </Field>
                  <Field label="Longitude" error={errors.longitude} touched={touched.longitude}>
                    <input type="number" step="any" placeholder="72.5714" {...inp('longitude')} />
                  </Field>
                </div>
                {mapLat && mapLng ? (
                  <p className="bc-coords-hint">
                    📍 {mapLat}, {mapLng}
                    <button type="button" className="bc-clear-coords"
                      onClick={() => { handleChange('latitude', ''); handleChange('longitude', ''); }}>
                      Clear
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ═══ BANKING ═══════════════════════════════════════ */}
          {activeTab === 'banking' ? (
            <div className="bc-section">
              <div className="bc-section-head">
                <h2 className="bc-section-title">Banking Details</h2>
                <p className="bc-section-sub">Bank account details for payments and settlements. (Optional)</p>
              </div>
              <div className="bc-grid">
                <Field label="Account Holder Name" error={errors.accountHolderName} touched={touched.accountHolderName}>
                  <input type="text" placeholder="As per bank records" {...inp('accountHolderName')} />
                </Field>
                <Field label="Bank Name" error={errors.bankName} touched={touched.bankName}>
                  <input type="text" placeholder="State Bank of India" {...inp('bankName')} />
                </Field>
                <Field label="Account Number" error={errors.accountNumber} touched={touched.accountNumber}>
                  <input type="text" placeholder="9–18 digit number" {...inp('accountNumber')} />
                </Field>
                <Field label="IFSC Code" error={errors.ifscCode} touched={touched.ifscCode} hint="SBIN0001234">
                  <input type="text" placeholder="SBIN0001234" maxLength={11}
                    value={form.ifscCode}
                    onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('ifscCode')} />
                </Field>
              </div>
            </div>
          ) : null}

          {/* Tab footer nav */}
          <div className="bc-tab-footer">
            {activeTabIndex > 0
              ? <button type="button" className="ghost-btn" onClick={handleBackClick}>
                ← Back</button>
              : <div />}
            {!isLastTab
              ? <button key="footer-next" type="button" className="primary-btn"
                  disabled={activeTab === 'account' && !phoneVerified}
                  title={activeTab === 'account' && !phoneVerified ? 'Verify mobile number first' : ''}
                  onClick={handleNextClick}>
                  Next →</button>
              : <button key="footer-submit" type="submit" form="bc-form" className="primary-btn" disabled={isSaving}>
                  {isSaving ? 'Creating…' : 'Create Business'}
                </button>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default BusinessCreatePage;
