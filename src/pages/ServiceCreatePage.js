import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Banner } from '../components';
import {
  createService,
  fetchUsers,
  getService,
  listAttributeDefinitions,
  listAttributeMappings,
  listCategories,
  listMainCategories,
  listSubCategories,
  updateService,
  uploadBannerImages,
} from '../services/adminApi';

const ADMIN_API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

const FORM_TABS = [
  { key: 'general', label: 'General Details' },
  { key: 'pricing', label: 'Pricing & Taxation' },
  { key: 'media', label: 'Media' },
];

const PRICE_UNITS = [
  { label: 'Per Visit', value: 'Visit' },
  { label: 'Per Hour', value: 'Hour' },
  { label: 'Per Day', value: 'Day' },
  { label: 'Per Project', value: 'Project' },
];

const GST_SLABS = [0, 5, 12, 18, 28];

const INITIAL_FORM = {
  userId: '',
  mainCategoryId: '',
  categoryId: '',
  subCategoryId: '',
  serviceName: '',
  serviceDuration: '',
  coverageArea: '',
  keyFeatures: '',
  fullDescription: '',
  basePrice: '',
  priceUnit: 'Visit',
  gstRate: '18',
  taxInclusive: true,
  thumbnailImage: '',
  galleryImagesText: '',
};

const FORM_FIELD_TAB_MAP = {
  userId: 'general',
  mainCategoryId: 'general',
  categoryId: 'general',
  subCategoryId: 'general',
  serviceName: 'general',
  serviceDuration: 'general',
  coverageArea: 'general',
  keyFeatures: 'general',
  fullDescription: 'general',
  basePrice: 'pricing',
  priceUnit: 'pricing',
  gstRate: 'pricing',
  thumbnailImage: 'media',
  galleryImagesText: 'media',
};

const toArray = (v) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.content) ? v.content : [];

const isBusinessAccount = (u) =>
  String(u?.userType || u?.type || u?.role || '').trim().toUpperCase() === 'BUSINESS';
const getBusinessName = (u) =>
  u?.businessName || u?.companyName || u?.name || u?.fullName || u?.mobile || `Business #${u?.id || ''}`;

const normalizeDynamicKey = (v) =>
  String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const humanizeKey = (v) =>
  String(v || '').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim().replace(/^./, (c) => c.toUpperCase());
const resolveMediaUrl = (v) => {
  const t = String(v || '').trim();
  if (!t) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(t)) return t;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('/')) return `${ADMIN_API_BASE}${t}`;
  return `${ADMIN_API_BASE}/${t.replace(/^\.?\//, '')}`;
};
const parseList = (v) =>
  String(v || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

function validateField(key, value) {
  const v = String(value ?? '').trim();
  switch (key) {
    case 'userId':         return !v ? 'Select a business account.' : null;
    case 'mainCategoryId': return !v ? 'Select a main category.' : null;
    case 'categoryId':     return !v ? 'Select a category.' : null;
    case 'serviceName':    return !v ? 'Service name is required.' : v.length < 2 ? 'Min 2 characters.' : null;
    case 'basePrice':      return !v ? 'Base price is required.' : isNaN(Number(v)) || Number(v) <= 0 ? 'Enter a valid price.' : null;
    case 'gstRate':        return v && isNaN(Number(v)) ? 'Enter a valid number.' : null;
    default: return null;
  }
}

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

function MediaThumb({ url, onRemove }) {
  const [err, setErr] = useState(false);
  const resolved = err ? '' : resolveMediaUrl(url);
  if (!resolved) return null;
  return (
    <div className="pcc-gallery-thumb">
      <img src={resolved} alt="" onError={() => setErr(true)} />
      <button type="button" className="pcc-gallery-remove" onClick={onRemove} title="Remove">✕</button>
    </div>
  );
}

function ServiceCreatePage({ token }) {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const isEdit = Boolean(routeId);
  const [searchParams] = useSearchParams();
  const prefilledBusinessId = searchParams.get('businessId') || '';
  const mediaInputRef = useRef(null);
  const saveMenuRef = useRef(null);

  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingService, setIsLoadingService] = useState(isEdit);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  const [businesses, setBusinesses] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState([]);
  const [attributeMappings, setAttributeMappings] = useState([]);
  const [dynamicValues, setDynamicValues] = useState({});

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null);
  const editLoadGuardRef = useRef(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!saveMenuRef.current?.contains(event.target)) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      fetchUsers(token),
      listMainCategories(token),
      listAttributeDefinitions(token, true),
    ]).then(([usersRes, mainCatRes, defsRes]) => {
      if (usersRes.status === 'fulfilled') {
        const all = toArray(usersRes.value);
        setBusinesses(
          all.filter(isBusinessAccount)
            .sort((a, b) => getBusinessName(a).localeCompare(getBusinessName(b)))
        );
        if (prefilledBusinessId) {
          const match = all.find((u) => String(u?.id) === prefilledBusinessId);
          if (match) {
            setForm((prev) => ({ ...prev, userId: prefilledBusinessId }));
            setTouched((prev) => ({ ...prev, userId: true }));
          }
        }
      }
      if (mainCatRes.status === 'fulfilled') setMainCategories(toArray(mainCatRes.value));
      if (defsRes.status === 'fulfilled') {
        const defs = defsRes.value?.data?.definitions || toArray(defsRes.value);
        setAttributeDefinitions(defs);
      }
    });
  }, [token, prefilledBusinessId]);

  useEffect(() => {
    if (!isEdit || !routeId) return;
    let cancelled = false;
    setIsLoadingService(true);
    editLoadGuardRef.current = true;
    getService(token, routeId)
      .then((res) => {
        if (cancelled) return;
        const s = res?.data || res || {};
        const cat = s.category || {};
        const gallery = Array.isArray(s.galleryImages) ? s.galleryImages : [];
        setForm({
          userId: s.userId != null ? String(s.userId) : '',
          mainCategoryId: cat.mainCategoryId != null ? String(cat.mainCategoryId) : '',
          categoryId: cat.categoryId != null ? String(cat.categoryId) : '',
          subCategoryId: cat.subCategoryId != null ? String(cat.subCategoryId) : '',
          serviceName: s.serviceName || '',
          serviceDuration: s.serviceDuration || '',
          coverageArea: s.coverageArea || '',
          keyFeatures: s.keyFeatures || '',
          fullDescription: s.fullDescription || '',
          basePrice: s.basePrice != null ? String(s.basePrice) : '',
          priceUnit: s.priceUnit || 'Visit',
          gstRate: s.taxRate != null ? String(s.taxRate) : '18',
          taxInclusive: s.taxInclusive !== false,
          thumbnailImage: s.serviceImageLogo || '',
          galleryImagesText: gallery.join(', '),
        });
        if (s.dynamicAttributes && typeof s.dynamicAttributes === 'object') {
          setDynamicValues(s.dynamicAttributes);
        }
        setTimeout(() => { editLoadGuardRef.current = false; }, 0);
      })
      .catch((err) => {
        editLoadGuardRef.current = false;
        if (!cancelled) setMessage({ type: 'error', text: err.message || 'Failed to load service.' });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingService(false);
      });
    return () => { cancelled = true; };
  }, [isEdit, routeId, token]);

  const handleChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    const err = validateField(key, value);
    setErrors((prev) => ({ ...prev, [key]: err || undefined }));
  }, []);

  const handleBlur = useCallback((key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({
      ...prev,
      [key]: validateField(key, form[key]) || undefined,
    }));
  }, [form]);

  useEffect(() => {
    if (!editLoadGuardRef.current) {
      setCategories([]); setSubCategories([]);
      handleChange('categoryId', ''); handleChange('subCategoryId', '');
    }
    if (!form.mainCategoryId) { setAttributeMappings([]); setDynamicValues({}); return; }
    listCategories(token, form.mainCategoryId)
      .then((r) => setCategories(toArray(r)))
      .catch(() => setCategories([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mainCategoryId]);

  useEffect(() => {
    if (!editLoadGuardRef.current) {
      setSubCategories([]);
      handleChange('subCategoryId', '');
    }
    if (!form.categoryId) { setAttributeMappings([]); setDynamicValues({}); return; }
    listSubCategories(token, form.categoryId)
      .then((r) => setSubCategories(toArray(r)))
      .catch(() => setSubCategories([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId]);

  useEffect(() => {
    const mainId = form.mainCategoryId ? Number(form.mainCategoryId) : null;
    const catId  = form.categoryId     ? Number(form.categoryId)     : null;
    const subId  = form.subCategoryId  ? Number(form.subCategoryId)  : null;
    if (!mainId && !catId && !subId) { setAttributeMappings([]); return; }

    const calls = [];
    if (mainId) calls.push(listAttributeMappings(token, { mainCategoryId: mainId, active: true }));
    if (catId)  calls.push(listAttributeMappings(token, { categoryId: catId, active: true }));
    if (subId)  calls.push(listAttributeMappings(token, { subCategoryId: subId, active: true }));

    Promise.allSettled(calls).then((results) => {
      const merged = new Map();
      results.forEach((r) => {
        if (r.status !== 'fulfilled') return;
        const list = r.value?.data?.mappings || toArray(r.value);
        (Array.isArray(list) ? list : []).forEach((m) => {
          if (!m?.attributeKey) return;
          merged.set(m.attributeKey, m);
        });
      });
      const sorted = Array.from(merged.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setAttributeMappings(sorted);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mainCategoryId, form.categoryId, form.subCategoryId]);

  const definitionById = useMemo(() => {
    const m = new Map();
    attributeDefinitions.forEach((d) => m.set(d.id, d));
    return m;
  }, [attributeDefinitions]);

  const handleDynamicChange = (key, value) => {
    setDynamicValues((prev) => ({ ...prev, [key]: value }));
  };

  const tabErrors = (tabKey) =>
    Object.entries(errors).filter(([k, v]) => FORM_FIELD_TAB_MAP[k] === tabKey && v).length;

  const openUpload = (field) => {
    setMediaTarget({ field });
    if (mediaInputRef.current) { mediaInputRef.current.value = ''; mediaInputRef.current.click(); }
  };

  const handleMediaFiles = async (e) => {
    const files = e?.target?.files;
    if (!files || !files.length || !mediaTarget) return;
    setIsUploadingMedia(true);
    try {
      const res = await uploadBannerImages(token, Array.from(files));
      const urls = res?.data?.urls || res?.data || [];
      const list = (Array.isArray(urls) ? urls : []).map((u) => (typeof u === 'string' ? u : u?.url || u?.imageUrl)).filter(Boolean);
      if (!list.length) throw new Error('No URLs returned.');

      if (mediaTarget.field === 'thumbnail') {
        handleChange('thumbnailImage', list[0]);
      } else {
        const current = parseList(form.galleryImagesText);
        const merged = Array.from(new Set([...current, ...list])).join(', ');
        handleChange('galleryImagesText', merged);
        if (!form.thumbnailImage) handleChange('thumbnailImage', list[0]);
      }
      setMessage({ type: 'success', text: 'Image uploaded.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Upload failed.' });
    } finally {
      setIsUploadingMedia(false);
      setMediaTarget(null);
    }
  };

  const normalizeListValue = (v) => (Array.isArray(v) ? v.join(', ') : String(v || ''));
  const normalizeObjectValue = (v) => {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v, null, 2); } catch { return ''; }
  };
  const getAttributeOptions = (mapping) => {
    const def = mapping.attributeId ? definitionById.get(mapping.attributeId) : null;
    const opts = def?.options || mapping.options;
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') {
      try { return JSON.parse(opts); } catch { return opts.split(',').map((s) => s.trim()); }
    }
    return null;
  };

  const renderDynamicField = (mapping) => {
    const type = String(mapping.dataType || 'STRING').toUpperCase();
    const options = getAttributeOptions(mapping);
    const def = mapping.attributeId ? definitionById.get(mapping.attributeId) : null;
    const nKey = normalizeDynamicKey(mapping.attributeKey || '');
    const value = dynamicValues[mapping.attributeKey] ?? dynamicValues[nKey] ?? '';
    const label = `${mapping.label || humanizeKey(mapping.attributeKey)}${mapping.required ? ' *' : ''}`;
    const hint = def?.description || (type === 'NUMBER' && def?.unit ? `Unit: ${def.unit}` : '');

    if (type === 'BOOLEAN') {
      const bv = value === true ? 'true' : value === false ? 'false' : '';
      return (
        <div className="bc-field" key={mapping.id || mapping.attributeKey}>
          <label className="bc-field-label">{label}</label>
          <select value={bv} onChange={(e) => handleDynamicChange(mapping.attributeKey, e.target.value)} required={mapping.required}>
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          {hint ? <span className="bc-hint">{hint}</span> : null}
        </div>
      );
    }
    if ((type === 'ENUM' || type === 'SELECT') && Array.isArray(options)) {
      return (
        <div className="bc-field" key={mapping.id || mapping.attributeKey}>
          <label className="bc-field-label">{label}</label>
          <select value={value} onChange={(e) => handleDynamicChange(mapping.attributeKey, e.target.value)} required={mapping.required}>
            <option value="">Select</option>
            {options.map((o, i) => {
              const val = typeof o === 'string' ? o : (o.value ?? o.label);
              const lbl = typeof o === 'string' ? o : (o.label ?? o.value);
              return <option key={`${val}-${i}`} value={val}>{lbl}</option>;
            })}
          </select>
          {hint ? <span className="bc-hint">{hint}</span> : null}
        </div>
      );
    }
    if (type === 'LIST') {
      return (
        <div className="bc-field bc-span2" key={mapping.id || mapping.attributeKey}>
          <label className="bc-field-label">{label}</label>
          <input type="text" value={normalizeListValue(value)} onChange={(e) => handleDynamicChange(mapping.attributeKey, e.target.value)} placeholder="e.g. red, blue" required={mapping.required} />
          <span className="bc-hint">Comma-separated values.</span>
          {hint ? <span className="bc-hint">{hint}</span> : null}
        </div>
      );
    }
    if (type === 'OBJECT') {
      return (
        <div className="bc-field bc-span2" key={mapping.id || mapping.attributeKey}>
          <label className="bc-field-label">{label}</label>
          <textarea rows={3} value={normalizeObjectValue(value)} onChange={(e) => handleDynamicChange(mapping.attributeKey, e.target.value)} placeholder='{"key":"value"}' required={mapping.required} />
          {hint ? <span className="bc-hint">{hint}</span> : null}
        </div>
      );
    }
    return (
      <div className="bc-field" key={mapping.id || mapping.attributeKey}>
        <label className="bc-field-label">{label}</label>
        <input
          type={type === 'NUMBER' ? 'number' : type === 'DATE' ? 'date' : 'text'}
          value={value}
          onChange={(e) => handleDynamicChange(mapping.attributeKey, e.target.value)}
          placeholder={mapping.attributeKey}
          required={mapping.required}
        />
        {hint ? <span className="bc-hint">{hint}</span> : null}
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setIsSaveMenuOpen(false);

    const allTouched = {};
    Object.keys(INITIAL_FORM).forEach((k) => { allTouched[k] = true; });
    const allErrors = {};
    Object.keys(INITIAL_FORM).forEach((k) => {
      const err = validateField(k, form[k]);
      if (err) allErrors[k] = err;
    });
    attributeMappings.forEach((m) => {
      if (m.required) {
        const v = dynamicValues[m.attributeKey];
        if (v === undefined || v === null || String(v).trim() === '') {
          allErrors[`dyn_${m.attributeKey}`] = 'Required.';
        }
      }
    });
    setTouched(allTouched);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      const firstKey = Object.keys(allErrors).find((k) => FORM_FIELD_TAB_MAP[k]);
      if (firstKey) setActiveTab(FORM_FIELD_TAB_MAP[firstKey]);
      setMessage({ type: 'error', text: 'Please fix the highlighted errors before submitting.' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const dynamicAttributes = {};
      attributeMappings.forEach((m) => {
        const rawVal = dynamicValues[m.attributeKey];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          dynamicAttributes[m.attributeKey] = rawVal;
        }
      });

      const galleryImages = parseList(form.galleryImagesText);
      const payload = {
        userId: Number(form.userId),
        serviceName: form.serviceName.trim(),
        serviceCode: `SRV-${Date.now()}`,
        basePrice: Number(form.basePrice),
        priceUnit: form.priceUnit || 'Visit',
        serviceDuration: form.serviceDuration?.trim() || undefined,
        fullDescription: form.fullDescription?.trim() || undefined,
        coverageArea: form.coverageArea?.trim() || undefined,
        keyFeatures: form.keyFeatures?.trim() || undefined,
        taxRate: form.gstRate !== '' ? Number(form.gstRate) : undefined,
        taxInclusive: Boolean(form.taxInclusive),
        mainCategoryId: Number(form.mainCategoryId),
        categoryId: Number(form.categoryId),
        subCategoryId: form.subCategoryId ? Number(form.subCategoryId) : undefined,
        serviceImageLogo: form.thumbnailImage?.trim() || undefined,
        galleryImages: galleryImages.length ? galleryImages : undefined,
      };
      if (Object.keys(dynamicAttributes).length > 0) payload.dynamicAttributes = dynamicAttributes;

      if (isEdit) {
        delete payload.serviceCode;
        await updateService(token, routeId, payload);
        navigate(`/admin/services/${routeId}`, {
          state: { success: `Service "${form.serviceName}" updated.` },
        });
      } else {
        await createService(token, payload);
        navigate('/admin/services', {
          state: { success: `Service "${form.serviceName}" created.` },
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || (isEdit ? 'Failed to update service.' : 'Failed to create service.') });
    } finally {
      setIsSaving(false);
    }
  };

  const inp = (key, extra = {}) => ({
    value: form[key],
    onChange: (e) => handleChange(key, e.target.value),
    onBlur: () => handleBlur(key),
    ...extra,
  });

  const galleryUrls = parseList(form.galleryImagesText).map(resolveMediaUrl).filter(Boolean);
  const thumbnailUrl = resolveMediaUrl(form.thumbnailImage);
  const finalPrice = useMemo(() => {
    const base = Number(form.basePrice) || 0;
    const rate = Number(form.gstRate) || 0;
    return form.taxInclusive ? base : base + (base * rate) / 100;
  }, [form.basePrice, form.gstRate, form.taxInclusive]);

  return (
    <div className="pcc-page">
      <input ref={mediaInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleMediaFiles} />

      <div className="pcc-topbar">
        <span className="pcc-breadcrumb">Catalog / Services / {isEdit ? 'Edit' : 'Create New'}</span>
        <button
          type="button"
          className="pcc-back-btn"
          onClick={() => navigate(isEdit ? `/admin/services/${routeId}` : '/admin/services')}
        >
          ‹ Back
        </button>
      </div>

      <Banner message={message} />

      <form id="svc-form" className="pcc-form-card" onSubmit={handleSubmit} noValidate>

        <div className="pcc-tab-bar">
          {FORM_TABS.map((tab) => {
            const errs = tabErrors(tab.key);
            return (
              <button
                key={tab.key}
                type="button"
                className={`pcc-tab-btn${activeTab === tab.key ? ' active' : ''}${errs > 0 ? ' has-error' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {errs > 0 ? <span className="pcc-tab-badge pcc-tab-badge-error">{errs}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="pcc-form-body">

          {activeTab === 'general' ? (
            <>
              <div className="pcc-top-card pcc-top-card-setup">
                <div className="pcc-top-card-head">
                  <div>
                    <h3 className="pcc-subsection-title">Setup Basics</h3>
                    <p className="pcc-specs-sub">Select business and category path first. Category-specific fields will load below in this same tab.</p>
                  </div>
                </div>
                <div className="pcc-fgrid pcc-fgrid-setup">
                  <Field label="Business Account" required error={errors.userId} touched={touched.userId}>
                    <select {...inp('userId')} disabled={isEdit || Boolean(prefilledBusinessId && form.userId === prefilledBusinessId)}>
                      <option value="">Select business account</option>
                      {businesses.map((b) => <option key={b.id} value={b.id}>{getBusinessName(b)}</option>)}
                    </select>
                    {isEdit ? (
                      <span className="bc-hint">Business cannot be changed after creation</span>
                    ) : prefilledBusinessId && form.userId === prefilledBusinessId ? (
                      <span className="bc-hint">Pre-selected from Business View page</span>
                    ) : null}
                  </Field>
                  <Field label="Main Category" required error={errors.mainCategoryId} touched={touched.mainCategoryId}>
                    <select {...inp('mainCategoryId')}>
                      <option value="">Select main category</option>
                      {mainCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Category" required error={errors.categoryId} touched={touched.categoryId}>
                    <select {...inp('categoryId')} disabled={!form.mainCategoryId}>
                      <option value="">{form.mainCategoryId ? 'Select category' : 'Select main category first'}</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Sub-category">
                    <select {...inp('subCategoryId')} disabled={!form.categoryId}>
                      <option value="">{form.categoryId ? 'All sub-categories (optional)' : 'Select category first'}</option>
                      {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <p className="pcc-section-label">Service Information</p>
              <div className="pcc-fgrid">
                <Field label="Service Name" required error={errors.serviceName} touched={touched.serviceName} span2>
                  <input type="text" placeholder="e.g. AC Servicing, Deep Cleaning" {...inp('serviceName')} />
                </Field>
                <Field label="Service Duration">
                  <input type="text" placeholder="e.g. 2 hours" {...inp('serviceDuration')} />
                </Field>
                <Field label="Coverage Area">
                  <input type="text" placeholder="e.g. Within 10 km of Ahmedabad" {...inp('coverageArea')} />
                </Field>
                <Field label="Key Features" span2>
                  <input type="text" placeholder="Comma-separated highlights" {...inp('keyFeatures')} />
                </Field>
                <Field label="Full Description" span2>
                  <textarea
                    rows={3}
                    placeholder="Work description, inclusions, what the customer gets…"
                    value={form.fullDescription}
                    onChange={(e) => handleChange('fullDescription', e.target.value)}
                    onBlur={() => handleBlur('fullDescription')}
                  />
                </Field>
              </div>

              {form.categoryId ? (
                attributeMappings.length > 0 ? (
                  <>
                    <div className="pcc-section-label-row">
                      <span className="pcc-section-label" style={{ marginBottom: 0 }}>
                        Category Specifications
                      </span>
                      <span className="pcc-specs-count">
                        {attributeMappings.length} field{attributeMappings.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="pcc-fgrid">
                      {attributeMappings.map((mapping) => renderDynamicField(mapping))}
                    </div>
                  </>
                ) : (
                  <p className="pcc-hint-text">No specification fields configured for this category.</p>
                )
              ) : null}
            </>
          ) : null}

          {activeTab === 'pricing' ? (
            <>
              <p className="pcc-section-label">Pricing & Taxation</p>
              <div className="pcc-fgrid">
                <Field label="Base Price (Rs)" required error={errors.basePrice} touched={touched.basePrice}>
                  <input type="number" placeholder="0.00" min="0" step="0.01" {...inp('basePrice')} />
                </Field>
                <Field label="Per Unit">
                  <select {...inp('priceUnit')}>
                    {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </Field>
                <Field label="GST Rate (%)" error={errors.gstRate} touched={touched.gstRate}>
                  <select {...inp('gstRate')}>
                    {GST_SLABS.map((s) => <option key={s} value={s}>{s}%</option>)}
                  </select>
                </Field>
                <Field label="Tax Treatment">
                  <select
                    value={form.taxInclusive ? 'inclusive' : 'exclusive'}
                    onChange={(e) => handleChange('taxInclusive', e.target.value === 'inclusive')}
                  >
                    <option value="inclusive">Tax Inclusive</option>
                    <option value="exclusive">Tax Exclusive</option>
                  </select>
                </Field>
                <Field
                  label="Estimated Total"
                  hint={form.taxInclusive ? 'GST included in base price' : `Base + ${form.gstRate || 0}% GST`}
                  span2
                >
                  <input type="text" value={`Rs ${finalPrice.toFixed(2)}`} readOnly />
                </Field>
              </div>
            </>
          ) : null}

          {activeTab === 'media' ? (
            <>
              <p className="pcc-section-label">Service Logo / Thumbnail</p>
              <div className="pcc-media-row">
                <div className="pcc-thumb-box">
                  {thumbnailUrl
                    ? <img src={thumbnailUrl} alt="Thumbnail preview" className="pcc-thumb-img" />
                    : <div className="pcc-thumb-empty"><span>No thumbnail</span></div>}
                </div>
                <div className="pcc-thumb-actions">
                  <p className="pcc-media-hint">Shown in service cards and listings. Square image recommended.</p>
                  <div className="pcc-media-btns">
                    <button type="button" className="primary-btn small"
                      onClick={() => openUpload('thumbnail')} disabled={isUploadingMedia}>
                      {isUploadingMedia && mediaTarget?.field === 'thumbnail' ? 'Uploading…' : 'Upload Thumbnail'}
                    </button>
                    {form.thumbnailImage
                      ? <button type="button" className="ghost-btn small" onClick={() => handleChange('thumbnailImage', '')}>Clear</button>
                      : null}
                  </div>
                  <div className="bc-field" style={{ marginTop: 10 }}>
                    <label className="bc-field-label">Or paste URL</label>
                    <input type="text" placeholder="https://..." value={form.thumbnailImage}
                      onChange={(e) => handleChange('thumbnailImage', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="pcc-section-label-row" style={{ marginTop: 20 }}>
                <span className="pcc-section-label" style={{ marginBottom: 0 }}>Gallery Images ({galleryUrls.length})</span>
                <button type="button" className="primary-btn small"
                  onClick={() => openUpload('gallery')} disabled={isUploadingMedia}>
                  {isUploadingMedia && mediaTarget?.field === 'gallery' ? 'Uploading…' : '+ Add Images'}
                </button>
              </div>
              {galleryUrls.length > 0 ? (
                <div className="pcc-gallery-grid">
                  {galleryUrls.map((url, i) => (
                    <MediaThumb key={`${url}-${i}`} url={url}
                      onRemove={() => { const next = galleryUrls.filter((_, idx) => idx !== i); handleChange('galleryImagesText', next.join(', ')); }} />
                  ))}
                </div>
              ) : (
                <div className="pcc-gallery-empty">No gallery images added yet.</div>
              )}
            </>
          ) : null}

        </div>

        <div className="pcc-form-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => navigate(isEdit ? `/admin/services/${routeId}` : '/admin/services')}
            disabled={isSaving}
          >
            Cancel
          </button>
          <div className={`pcc-save-actions${isSaveMenuOpen ? ' is-open' : ''}`} ref={saveMenuRef}>
            <button
              type="button"
              className="primary-btn pcc-save-main-btn"
              disabled={isSaving || isLoadingService}
              onClick={() => { setIsSaveMenuOpen(false); handleSubmit(); }}
            >
              {isSaving ? 'Saving...' : isLoadingService ? 'Loading...' : isEdit ? 'Update Service' : 'Save Service'}
            </button>
          </div>
          <button type="submit" className="primary-btn hidden-submit" disabled={isSaving || isLoadingService}>
            {isSaving ? (isEdit ? 'Updating…' : 'Creating…') : 'Save'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default ServiceCreatePage;
