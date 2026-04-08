import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components';
import {
  createProduct,
  createUom,
  fetchUsers,
  listAttributeDefinitions,
  listAttributeMappings,
  listBrandOptions,
  listCategories,
  listMainCategories,
  listSubCategories,
  listUoms,
  uploadBannerImages,
} from '../services/adminApi';

/* ── Tabs ─────────────────────────────────────────────────────── */
const TABS = [
  { key: 'setup',    label: 'Setup',          icon: '⚙' },
  { key: 'details',  label: 'Details',         icon: '📋' },
  { key: 'media',    label: 'Media',           icon: '🖼' },
  { key: 'variants', label: 'Variants & UOM',  icon: '📦' },
];

void TABS;

const INITIAL_FORM = {
  userId: '',
  mainCategoryId: '', categoryId: '', subCategoryId: '',
  productType: 'Physical',
  productName: '', brandName: '', shortDescription: '', longDescription: '',
  hsnCode: '', countryOfOrigin: '',
  modelVariant: '', keywords: '', productLabel: '', certifications: '', warrantyPeriod: '',
  attributes: '', specifications: '',
  videoLink: '', accountCode: '', licenseCertificateId: '', licenseDocumentsText: '', internalNotes: '',
  sellingPrice: '', mrp: '', gstRate: '', minimumOrderQuantity: '',
  thumbnailImage: '', galleryImagesText: '',
  baseUomId: '', defaultStockInUomId: '', defaultStockOutUomId: '',
};

const FIELD_TAB_MAP = {
  userId: 'setup', mainCategoryId: 'setup', categoryId: 'setup', subCategoryId: 'setup',
  productName: 'details', brandName: 'details', shortDescription: 'details',
  longDescription: 'details', hsnCode: 'details', countryOfOrigin: 'details',
  sellingPrice: 'details', mrp: 'details', gstRate: 'details', minimumOrderQuantity: 'details',
  thumbnailImage: 'media', galleryImagesText: 'media',
  baseUomId: 'variants', defaultStockInUomId: 'variants', defaultStockOutUomId: 'variants',
};

void FIELD_TAB_MAP;

const FORM_TABS = [
  { key: 'general', label: 'General Details' },
  { key: 'pricing', label: 'Pricing & Variant Details' },
  { key: 'media', label: 'Media' },
];

const FORM_FIELD_TAB_MAP = {
  userId: 'general',
  mainCategoryId: 'general',
  categoryId: 'general',
  subCategoryId: 'general',
  productType: 'general',
  productName: 'general',
  brandName: 'general',
  shortDescription: 'general',
  longDescription: 'general',
  hsnCode: 'general',
  countryOfOrigin: 'general',
  modelVariant: 'general',
  keywords: 'general',
  productLabel: 'general',
  certifications: 'general',
  warrantyPeriod: 'general',
  attributes: 'general',
  specifications: 'general',
  videoLink: 'general',
  accountCode: 'general',
  licenseCertificateId: 'general',
  licenseDocumentsText: 'general',
  internalNotes: 'general',
  thumbnailImage: 'media',
  galleryImagesText: 'media',
  sellingPrice: 'pricing',
  mrp: 'pricing',
  gstRate: 'pricing',
  minimumOrderQuantity: 'pricing',
  baseUomId: 'pricing',
  defaultStockInUomId: 'pricing',
  defaultStockOutUomId: 'pricing',
};

const ADMIN_API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

/* ── Helpers ──────────────────────────────────────────────────── */
const normalize = (v) => String(v || '').toLowerCase();
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

const isBusinessAccount = (u) =>
  String(u?.userType || u?.type || u?.role || '').trim().toUpperCase() === 'BUSINESS';
const getBusinessName = (u) =>
  u?.businessName || u?.companyName || u?.name || u?.fullName || u?.mobile || `Business #${u?.id || ''}`;

const createVariantEntry = () => ({
  _id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  variantName: '', sku: '', barcode: '',
  sellingPrice: '', mrp: '', stockQuantity: '', lowStockAlert: '',
  thumbnailImage: '', galleryImagesText: '',
  attributes: [{ key: '', value: '' }],
});

const createUomConversionEntry = () => ({
  _id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  uomId: '', conversionFactor: '',
});

function validateField(key, value) {
  const v = String(value ?? '').trim();
  switch (key) {
    case 'userId':         return !v ? 'Select a business account.' : null;
    case 'mainCategoryId': return !v ? 'Select a main category.' : null;
    case 'categoryId':     return !v ? 'Select a category.' : null;
    case 'productName':    return !v ? 'Product name is required.' : v.length < 2 ? 'Min 2 characters.' : null;
    case 'sellingPrice':   return !v ? 'Selling price is required.' : isNaN(Number(v)) || Number(v) <= 0 ? 'Enter a valid price.' : null;
    case 'mrp':            return !v ? 'MRP is required.' : isNaN(Number(v)) || Number(v) <= 0 ? 'Enter a valid MRP.' : null;
    case 'gstRate':        return !v ? 'GST rate is required.' : isNaN(Number(v)) ? 'Enter a valid number.' : null;
    default: return null;
  }
}

/* ── Field wrapper ────────────────────────────────────────────── */
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

/* ── Brand Autocomplete ───────────────────────────────────────── */
function BrandAutocomplete({ value, onChange, brands }) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const term = normalize(value).trim();
    if (!term || term.length < 1) return [];
    return brands
      .filter((b) => normalize(b?.brandName).includes(term))
      .sort((a, b) => {
        const as = normalize(a?.brandName).startsWith(term) ? 0 : 1;
        const bs = normalize(b?.brandName).startsWith(term) ? 0 : 1;
        return as - bs;
      })
      .slice(0, 8);
  }, [brands, value]);

  return (
    <div className="pcc-brand-wrap">
      <input
        type="text"
        placeholder="Type brand name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 ? (
        <div className="pcc-brand-dropdown">
          {suggestions.map((b) => (
            <button
              key={b.id}
              type="button"
              className="pcc-brand-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(b.brandName); setOpen(false); }}
            >
              <span className="pcc-brand-name">{b.brandName}</span>
              {b.website ? <span className="pcc-brand-meta">{b.website}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Media Thumbnail ──────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════ */
function ProductCreatePage({ token }) {
  const navigate = useNavigate();
  const mediaInputRef = useRef(null);
  const variantMediaInputRef = useRef(null);
  const saveMenuRef = useRef(null);

  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitMode, setSubmitMode] = useState('draft');
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!saveMenuRef.current?.contains(event.target)) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  /* ── Reference data ──────────────────────────────────────── */
  const [businesses, setBusinesses] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState([]);
  const [attributeMappings, setAttributeMappings] = useState([]);
  const [dynamicValues, setDynamicValues] = useState({});

  /* ── UOM state ───────────────────────────────────────────── */
  const [uomConversions, setUomConversions] = useState([]);
  const [showNewUomForm, setShowNewUomForm] = useState(false);
  const [newUomForm, setNewUomForm] = useState({ uomCode: '', uomName: '', description: '' });
  const [isCreatingUom, setIsCreatingUom] = useState(false);

  /* ── Variants state ──────────────────────────────────────── */
  const [variants, setVariants] = useState([]);

  /* ── Media upload state ──────────────────────────────────── */
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null);

  /* ── Load all reference data on mount ───────────────────── */
  useEffect(() => {
    Promise.allSettled([
      fetchUsers(token),
      listMainCategories(token),
      listBrandOptions(token),
      listUoms(token),
      listAttributeDefinitions(token, true),
    ]).then(([usersRes, mainCatRes, brandsRes, uomsRes, defsRes]) => {
      if (usersRes.status === 'fulfilled') {
        const all = Array.isArray(usersRes.value?.data) ? usersRes.value.data : [];
        setBusinesses(
          all.filter(isBusinessAccount)
            .sort((a, b) => getBusinessName(a).localeCompare(getBusinessName(b)))
        );
      }
      if (mainCatRes.status === 'fulfilled')
        setMainCategories(mainCatRes.value?.data || []);
      if (brandsRes.status === 'fulfilled')
        setBrands(brandsRes.value?.data?.brands || []);
      if (uomsRes.status === 'fulfilled') {
        const list = uomsRes.value?.data?.uoms || [];
        setUoms([...list].sort((a, b) => (a.uomName || '').localeCompare(b.uomName || '')));
      }
      if (defsRes.status === 'fulfilled')
        setAttributeDefinitions(defsRes.value?.data?.definitions || []);
    });
  }, [token]);

  /* ── Cascade: main category → categories ────────────────── */
  useEffect(() => {
    setCategories([]); setSubCategories([]);
    handleChange('categoryId', ''); handleChange('subCategoryId', '');
    if (!form.mainCategoryId) { setAttributeMappings([]); setDynamicValues({}); return; }
    listCategories(token, form.mainCategoryId)
      .then((r) => setCategories(r?.data || []))
      .catch(() => setCategories([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mainCategoryId]);

  /* ── Cascade: category → subcategories ──────────────────── */
  useEffect(() => {
    setSubCategories([]);
    handleChange('subCategoryId', '');
    if (!form.categoryId) { setAttributeMappings([]); setDynamicValues({}); return; }
    listSubCategories(token, form.categoryId)
      .then((r) => setSubCategories(r?.data || []))
      .catch(() => setSubCategories([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId]);

  /* ── Load attribute mappings when category changes ───────── */
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
        const list = r.value?.data?.mappings || r.value?.data || [];
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

  /* ── Derived maps for dynamic fields ─────────────────────── */
  const definitionById = useMemo(() => {
    const m = new Map();
    attributeDefinitions.forEach((d) => m.set(d.id, d));
    return m;
  }, [attributeDefinitions]);

  const definitionByKey = useMemo(() => {
    const m = new Map();
    attributeDefinitions.forEach((d) => {
      const k = normalizeDynamicKey(d.key || d.attributeKey || '');
      if (k) m.set(k, d);
    });
    return m;
  }, [attributeDefinitions]);

  /* ── Field handlers ───────────────────────────────────────── */
  void definitionByKey;

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

  const handleDynamicChange = (key, value) => {
    setDynamicValues((prev) => ({ ...prev, [key]: value }));
  };

  /* ── Tab validation / navigation ─────────────────────────── */
  const tabErrors = (tabKey) =>
    Object.entries(errors).filter(([k, v]) => FORM_FIELD_TAB_MAP[k] === tabKey && v).length;

  /* ── UOM helpers ──────────────────────────────────────────── */
  const selectedBaseUom = uoms.find((u) => String(u.id) === String(form.baseUomId)) || null;
  const selectedBaseUomLabel = selectedBaseUom
    ? (selectedBaseUom.uomCode ? `${selectedBaseUom.uomName} (${selectedBaseUom.uomCode})` : selectedBaseUom.uomName)
    : '';

  const uomOptions = uoms.map((u) => ({
    value: String(u.id),
    label: u.uomCode ? `${u.uomName} (${u.uomCode})` : u.uomName,
  }));

  const combinedUomOptions = useMemo(() => {
    const base = form.baseUomId
      ? [{ value: form.baseUomId, label: `${selectedBaseUomLabel} (base)` }]
      : [];
    const extras = uomConversions
      .filter((r) => r.uomId && r.uomId !== form.baseUomId)
      .map((r) => {
        const u = uoms.find((x) => String(x.id) === r.uomId);
        return u ? { value: r.uomId, label: u.uomCode ? `${u.uomName} (${u.uomCode})` : u.uomName } : null;
      })
      .filter(Boolean);
    return [...base, ...extras];
  }, [form.baseUomId, selectedBaseUomLabel, uomConversions, uoms]);

  const handleAddUomRow = () => {
    if (!form.baseUomId) {
      setMessage({ type: 'error', text: 'Select the Base UOM first.' });
      return;
    }
    if (uomConversions.length >= 3) return;
    setUomConversions((prev) => [...prev, createUomConversionEntry()]);
  };

  const handleUomRowChange = (index, field, value) => {
    setUomConversions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveUomRow = (index) => {
    setUomConversions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateUom = async () => {
    if (!newUomForm.uomCode.trim() || !newUomForm.uomName.trim()) {
      setMessage({ type: 'error', text: 'UOM Code and Name are required.' });
      return;
    }
    setIsCreatingUom(true);
    try {
      await createUom(token, {
        uomCode: newUomForm.uomCode.trim().toUpperCase(),
        uomName: newUomForm.uomName.trim(),
        description: newUomForm.description.trim() || null,
        isActive: true,
      });
      const res = await listUoms(token);
      const list = res?.data?.uoms || [];
      setUoms([...list].sort((a, b) => (a.uomName || '').localeCompare(b.uomName || '')));
      setNewUomForm({ uomCode: '', uomName: '', description: '' });
      setShowNewUomForm(false);
      setMessage({ type: 'success', text: `UOM "${newUomForm.uomName}" created.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create UOM.' });
    } finally {
      setIsCreatingUom(false);
    }
  };

  /* ── Variant helpers ─────────────────────────────────────── */
  const handleAddVariant = () => setVariants((p) => [...p, createVariantEntry()]);
  const handleRemoveVariant = (id) => setVariants((p) => p.filter((v) => v._id !== id));
  const handleVariantChange = (id, field, value) => {
    setVariants((p) => p.map((v) => v._id === id ? { ...v, [field]: value } : v));
  };
  const handleVariantAttrChange = (variantId, attrIndex, field, value) => {
    setVariants((p) => p.map((v) => {
      if (v._id !== variantId) return v;
      const attrs = [...v.attributes];
      attrs[attrIndex] = { ...attrs[attrIndex], [field]: value };
      return { ...v, attributes: attrs };
    }));
  };
  const handleAddVariantAttr = (variantId) => {
    setVariants((p) => p.map((v) =>
      v._id === variantId ? { ...v, attributes: [...v.attributes, { key: '', value: '' }] } : v
    ));
  };
  const handleRemoveVariantAttr = (variantId, attrIndex) => {
    setVariants((p) => p.map((v) => {
      if (v._id !== variantId) return v;
      return { ...v, attributes: v.attributes.filter((_, i) => i !== attrIndex) };
    }));
  };

  /* ── Media upload ─────────────────────────────────────────── */
  const openUpload = (target) => {
    setMediaTarget(target);
    const ref = target.kind === 'variant' ? variantMediaInputRef : mediaInputRef;
    if (ref.current) { ref.current.value = ''; ref.current.click(); }
  };

  const handleMediaFiles = async (e) => {
    const files = e?.target?.files;
    if (!files || !files.length || !mediaTarget) return;
    setIsUploadingMedia(true);
    try {
      const res = await uploadBannerImages(token, Array.from(files));
      const urls = res?.data?.urls || [];
      if (!urls.length) throw new Error('No URLs returned.');

      if (mediaTarget.kind === 'product') {
        if (mediaTarget.field === 'thumbnail') {
          handleChange('thumbnailImage', urls[0]);
        } else {
          const current = parseList(form.galleryImagesText);
          const merged = Array.from(new Set([...current, ...urls])).join(', ');
          handleChange('galleryImagesText', merged);
          if (!form.thumbnailImage) handleChange('thumbnailImage', urls[0]);
        }
      } else {
        const vId = mediaTarget.variantId;
        if (mediaTarget.field === 'thumbnail') {
          handleVariantChange(vId, 'thumbnailImage', urls[0]);
        } else {
          const v = variants.find((x) => x._id === vId);
          const current = v ? parseList(v.galleryImagesText) : [];
          const merged = Array.from(new Set([...current, ...urls])).join(', ');
          handleVariantChange(vId, 'galleryImagesText', merged);
          if (v && !v.thumbnailImage) handleVariantChange(vId, 'thumbnailImage', urls[0]);
        }
      }
      setMessage({ type: 'success', text: 'Image uploaded.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Upload failed.' });
    } finally {
      setIsUploadingMedia(false);
      setMediaTarget(null);
    }
  };

  /* ── Dynamic field rendering ──────────────────────────────── */
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
    const type = mapping.dataType || 'STRING';
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
    if (type === 'ENUM' && Array.isArray(options)) {
      return (
        <div className="bc-field" key={mapping.id || mapping.attributeKey}>
          <label className="bc-field-label">{label}</label>
          <select value={value} onChange={(e) => handleDynamicChange(mapping.attributeKey, e.target.value)} required={mapping.required}>
            <option value="">Select</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
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

  /* ── Build payload & submit ───────────────────────────────── */
  const handleSubmit = async (e, mode = submitMode) => {
    e?.preventDefault?.();
    setIsSaveMenuOpen(false);

    const allTouched = {};
    Object.keys(INITIAL_FORM).forEach((k) => { allTouched[k] = true; });
    const allErrors = {};
    Object.keys(INITIAL_FORM).forEach((k) => {
      const err = validateField(k, form[k]);
      if (err) allErrors[k] = err;
    });
    setTouched(allTouched);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      const firstKey = Object.keys(allErrors)[0];
      setActiveTab(FORM_FIELD_TAB_MAP[firstKey] || 'general');
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

      const payload = {
        userId: Number(form.userId),
        productType: form.productType?.trim() || 'Physical',
        productName: form.productName.trim(),
        brandName: form.brandName.trim() || null,
        shortDescription: form.shortDescription.trim() || null,
        longDescription: form.longDescription.trim() || null,
        hsnCode: form.hsnCode.trim() || null,
        countryOfOrigin: form.countryOfOrigin.trim() || null,
        modelVariant: form.modelVariant.trim() || null,
        keywords: form.keywords.trim() || null,
        productLabel: form.productLabel.trim() || null,
        certifications: form.certifications.trim() || null,
        warrantyPeriod: form.warrantyPeriod.trim() || null,
        attributes: form.attributes.trim() || null,
        specifications: form.specifications.trim() || null,
        videoLink: form.videoLink.trim() || null,
        accountCode: form.accountCode.trim() || null,
        licenseCertificateId: form.licenseCertificateId.trim() || null,
        internalNotes: form.internalNotes.trim() || null,
        mainCategoryId: Number(form.mainCategoryId),
        categoryId: Number(form.categoryId),
        sellingPrice: Number(form.sellingPrice),
        mrp: Number(form.mrp),
        gstRate: Number(form.gstRate),
        minimumOrderQuantity: form.minimumOrderQuantity ? Number(form.minimumOrderQuantity) : null,
        thumbnailImage: form.thumbnailImage.trim() || '',
        galleryImages: parseList(form.galleryImagesText),
        approvalStatus: mode === 'submit' ? 'PENDING_REVIEW' : 'DRAFT',
      };

      const licenseDocuments = parseList(form.licenseDocumentsText);
      if (licenseDocuments.length > 0) {
        payload.licenseDocuments = licenseDocuments;
      }

      if (form.subCategoryId) {
        payload.subCategoryId = Number(form.subCategoryId);
      } else if (form.categoryId) {
        payload.applyToAllSubCategories = true;
      }

      if (form.baseUomId) {
        payload.baseUomId = Number(form.baseUomId);
        const purchaseUoms = uomConversions
          .filter((r) => r.uomId)
          .map((r) => ({ uomId: Number(r.uomId), conversionFactor: r.conversionFactor ? Number(r.conversionFactor) : undefined }));
        if (purchaseUoms.length) {
          payload.purchaseUoms = purchaseUoms;
          payload.salesUoms = purchaseUoms;
        }
        if (form.defaultStockInUomId) payload.uiConfig = JSON.stringify({
          uomDefaults: {
            stockInUomId: form.defaultStockInUomId || form.baseUomId,
            stockOutUomId: form.defaultStockOutUomId || form.baseUomId,
          },
        });
      }

      if (Object.keys(dynamicAttributes).length > 0)
        payload.dynamicAttributes = dynamicAttributes;

      const validVariants = variants
        .map((v) => {
          const hasContent = v.variantName?.trim() || v.sku?.trim() || v.thumbnailImage?.trim();
          if (!hasContent) return null;
          const attrs = (v.attributes || []).filter((a) => a.key?.trim());
          return {
            variantName: v.variantName.trim() || null,
            sku: v.sku.trim() || null,
            barcode: v.barcode.trim() || null,
            thumbnailImage: v.thumbnailImage.trim() || '',
            galleryImages: parseList(v.galleryImagesText),
            sellingPrice: v.sellingPrice !== '' ? Number(v.sellingPrice) : undefined,
            mrp: v.mrp !== '' ? Number(v.mrp) : undefined,
            stockQuantity: v.stockQuantity !== '' ? Number(v.stockQuantity) : undefined,
            lowStockAlert: v.lowStockAlert !== '' ? Number(v.lowStockAlert) : undefined,
            attributes: attrs.length ? attrs : undefined,
          };
        })
        .filter(Boolean);

      if (validVariants.length) payload.variants = validVariants;

      await createProduct(token, payload);
      navigate('/admin/products', {
        state: {
          success: mode === 'submit'
            ? `Product "${form.productName}" created and submitted for review.`
            : `Product "${form.productName}" saved as draft.`,
        },
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create product.' });
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Derived UI values ────────────────────────────────────── */
  const inp = (key, extra = {}) => ({
    value: form[key],
    onChange: (e) => handleChange(key, e.target.value),
    onBlur: () => handleBlur(key),
    ...extra,
  });

  const galleryUrls = parseList(form.galleryImagesText).map(resolveMediaUrl).filter(Boolean);
  const thumbnailUrl = resolveMediaUrl(form.thumbnailImage);
  const selectedBusiness = businesses.find((b) => String(b?.id) === String(form.userId)) || null;
  const selectedMainCat = mainCategories.find((c) => String(c?.id) === String(form.mainCategoryId)) || null;
  const selectedCat = categories.find((c) => String(c?.id) === String(form.categoryId)) || null;
  const selectedSubCat = subCategories.find((c) => String(c?.id) === String(form.subCategoryId)) || null;
  const selectedCategoryPath = [selectedMainCat?.name, selectedCat?.name, selectedSubCat?.name].filter(Boolean).join(' / ');

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="pcc-page">
      {/* Hidden file inputs */}
      <input ref={mediaInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleMediaFiles} />
      <input ref={variantMediaInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleMediaFiles} />

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="pcc-topbar">
        <span className="pcc-breadcrumb">Inventory / Products / Create New</span>
        <button type="button" className="pcc-back-btn" onClick={() => navigate('/admin/products')}>
          ‹ Back
        </button>
      </div>

      <Banner message={message} />

      <form id="pcc-form" className="pcc-form-card" onSubmit={handleSubmit} noValidate>

        {/* ── Tab bar ── */}
        <div className="pcc-tab-bar">
          {FORM_TABS.map((tab) => {
            const errs = tabErrors(tab.key);
            const showBadge = false;
            return (
              <button
                key={tab.key}
                type="button"
                className={`pcc-tab-btn${activeTab === tab.key ? ' active' : ''}${errs > 0 ? ' has-error' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {errs > 0 ? <span className="pcc-tab-badge pcc-tab-badge-error">{errs}</span> : null}
                {showBadge ? <span className="pcc-tab-badge">{attributeMappings.length}</span> : null}
              </button>
            );
          })}
        </div>

        {/* ── Form body ── */}
        <div className="pcc-form-body">

          {/* ── General Details ─────────────────────────────── */}
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
                    <select {...inp('userId')}>
                      <option value="">Select business account</option>
                      {businesses.map((business) => <option key={business.id} value={business.id}>{getBusinessName(business)}</option>)}
                    </select>
                  </Field>
                  <Field label="Main Category" required error={errors.mainCategoryId} touched={touched.mainCategoryId}>
                    <select {...inp('mainCategoryId')}>
                      <option value="">Select main category</option>
                      {mainCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Category" required error={errors.categoryId} touched={touched.categoryId}>
                    <select {...inp('categoryId')} disabled={!form.mainCategoryId}>
                      <option value="">{form.mainCategoryId ? 'Select category' : 'Select main category first'}</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Sub-category">
                    <select {...inp('subCategoryId')} disabled={!form.categoryId}>
                      <option value="">{form.categoryId ? 'All sub-categories (optional)' : 'Select category first'}</option>
                      {subCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="pcc-fgrid" style={{ marginTop: 20 }}>
              <Field label="Product Name" required error={errors.productName} touched={touched.productName} span2>
                <input type="text" placeholder="Enter product name" {...inp('productName')} />
              </Field>
              <Field label="Product Type">
                <select {...inp('productType')}>
                  <option value="Physical">Physical</option>
                  <option value="Digital">Digital</option>
                </select>
              </Field>
              <Field label="Brand Name">
                <BrandAutocomplete value={form.brandName} onChange={(v) => handleChange('brandName', v)} brands={brands} />
              </Field>
              <Field label="HSN Code">
                <input type="text" placeholder="e.g. 61091000" {...inp('hsnCode')} />
              </Field>
              <Field label="Country Of Origin">
                <input type="text" placeholder="e.g. India" {...inp('countryOfOrigin')} />
              </Field>
              <Field label="Minimum Order Qty">
                <input type="number" placeholder="e.g. 1" min="1" {...inp('minimumOrderQuantity')} />
              </Field>
              <Field label="Short Description" span2>
                <input type="text" placeholder="One-line summary" {...inp('shortDescription')} />
              </Field>
              <Field label="Long Description" span2>
                <textarea rows={3} placeholder="Detailed product description…" value={form.longDescription} onChange={(e) => handleChange('longDescription', e.target.value)} onBlur={() => handleBlur('longDescription')} />
              </Field>
              <Field label="Model Variant">
                <input type="text" placeholder="e.g. CT-212" {...inp('modelVariant')} />
              </Field>
              <Field label="Keywords" span2>
                <input type="text" placeholder="e.g. tyre, ceat, durable" {...inp('keywords')} />
              </Field>
              <Field label="Product Label">
                <input type="text" placeholder="e.g. Premium" {...inp('productLabel')} />
              </Field>
              <Field label="Certifications">
                <input type="text" placeholder="e.g. ISO 9001" {...inp('certifications')} />
              </Field>
              <Field label="Warranty Period">
                <input type="text" placeholder="e.g. 1 year" {...inp('warrantyPeriod')} />
              </Field>
              <Field label="Attributes" span2>
                <textarea rows={2} placeholder="General product attributes" value={form.attributes} onChange={(e) => handleChange('attributes', e.target.value)} onBlur={() => handleBlur('attributes')} />
              </Field>
              <Field label="Specifications" span2>
                <textarea rows={2} placeholder="General product specifications" value={form.specifications} onChange={(e) => handleChange('specifications', e.target.value)} onBlur={() => handleBlur('specifications')} />
              </Field>
              <Field label="Video Link" span2>
                <input type="text" placeholder="https://..." {...inp('videoLink')} />
              </Field>
              <Field label="Account Code">
                <input type="text" placeholder="Enter account code" {...inp('accountCode')} />
              </Field>
              <Field label="License Certificate ID">
                <input type="text" placeholder="Enter certificate ID" {...inp('licenseCertificateId')} />
              </Field>
              <Field label="License Documents" span2>
                <textarea rows={2} placeholder="Paste license document URLs separated by comma or new line" value={form.licenseDocumentsText} onChange={(e) => handleChange('licenseDocumentsText', e.target.value)} onBlur={() => handleBlur('licenseDocumentsText')} />
              </Field>
              <Field label="Internal Notes" span2>
                <textarea rows={2} placeholder="Internal admin note" value={form.internalNotes} onChange={(e) => handleChange('internalNotes', e.target.value)} onBlur={() => handleBlur('internalNotes')} />
              </Field>
              {form.categoryId && attributeMappings.length > 0 ? (
                attributeMappings.map((mapping) => renderDynamicField(mapping))
              ) : null}
            </div>
            </>
          ) : null}

          {/* ── Classification ──────────────────────────────── */}
          {activeTab === 'classification' ? (
            <>
              <div className="pcc-fgrid">
                <Field label="Business Account" required error={errors.userId} touched={touched.userId} span2>
                  <select {...inp('userId')}>
                    <option value="">— Select business —</option>
                    {businesses.map((b) => <option key={b.id} value={b.id}>{getBusinessName(b)}</option>)}
                  </select>
                </Field>
                <Field label="Main Category" required error={errors.mainCategoryId} touched={touched.mainCategoryId}>
                  <select {...inp('mainCategoryId')}>
                    <option value="">— Select main category —</option>
                    {mainCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Category" required error={errors.categoryId} touched={touched.categoryId}>
                  <select {...inp('categoryId')} disabled={!form.mainCategoryId}>
                    <option value="">{form.mainCategoryId ? '— Select category —' : 'Select main category first'}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Sub-category">
                  <select {...inp('subCategoryId')} disabled={!form.categoryId}>
                    <option value="">{form.categoryId ? 'All sub-categories (optional)' : 'Select category first'}</option>
                    {subCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              {selectedBusiness || selectedMainCat ? (
                <div className="pcc-setup-summary">
                  {selectedBusiness ? (
                    <div className="pcc-setup-pill">
                      <span className="pcc-setup-pill-label">Business</span>
                      <span className="pcc-setup-pill-value">{getBusinessName(selectedBusiness)}</span>
                    </div>
                  ) : null}
                  {selectedMainCat ? (
                    <div className="pcc-setup-pill">
                      <span className="pcc-setup-pill-label">Category Path</span>
                      <span className="pcc-setup-pill-value">
                        {[selectedMainCat?.name, selectedCat?.name, selectedSubCat?.name].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {form.categoryId ? (
                attributeMappings.length > 0 ? (
                  <div className="pcc-specs-section">
                    <div className="pcc-specs-header">
                      <h3 className="pcc-specs-title">
                        Specifications
                        <span className="pcc-specs-count">{attributeMappings.length} field{attributeMappings.length !== 1 ? 's' : ''}</span>
                      </h3>
                    </div>
                    <div className="pcc-fgrid pcc-specs-grid">
                      {attributeMappings.map((m) => renderDynamicField(m))}
                    </div>
                  </div>
                ) : (
                  <p className="pcc-hint-text">No specification fields configured for this category.</p>
                )
              ) : (
                <p className="pcc-hint-text">Select a category above to load category-specific specification fields.</p>
              )}
            </>
          ) : null}

          {/* ── Pricing Details ─────────────────────────────── */}
          {activeTab === 'pricing' ? (
            <>
              <p className="pcc-section-label">Base Pricing</p>
              <div className="pcc-fgrid">
                <Field label="Selling Price (Rs)" required error={errors.sellingPrice} touched={touched.sellingPrice}>
                  <input type="number" placeholder="0.00" min="0" step="0.01" {...inp('sellingPrice')} />
                </Field>
                <Field label="MRP (Rs)" required error={errors.mrp} touched={touched.mrp}>
                  <input type="number" placeholder="0.00" min="0" step="0.01" {...inp('mrp')} />
                </Field>
                <Field label="GST Rate (%)" required error={errors.gstRate} touched={touched.gstRate}>
                  <input type="number" placeholder="18" min="0" step="0.01" {...inp('gstRate')} />
                </Field>
                <Field label="Minimum Order Qty">
                  <input type="number" placeholder="e.g. 1" min="1" {...inp('minimumOrderQuantity')} />
                </Field>
              </div>

              <div className="pcc-section-label-row">
                <span className="pcc-section-label" style={{ marginBottom: 0 }}>Unit of Measure (UOM)</span>
                <button type="button" className="ghost-btn small" onClick={() => setShowNewUomForm((p) => !p)}>
                  {showNewUomForm ? 'Hide' : '+ New UOM'}
                </button>
              </div>
              {showNewUomForm ? (
                <div className="pcc-fgrid" style={{ marginBottom: 12 }}>
                  <div className="bc-field">
                    <label className="bc-field-label">UOM Code <span className="bc-required">*</span></label>
                    <input type="text" placeholder="e.g. KG" value={newUomForm.uomCode}
                      onChange={(e) => setNewUomForm((p) => ({ ...p, uomCode: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="bc-field">
                    <label className="bc-field-label">UOM Name <span className="bc-required">*</span></label>
                    <input type="text" placeholder="Kilogram" value={newUomForm.uomName}
                      onChange={(e) => setNewUomForm((p) => ({ ...p, uomName: e.target.value }))} />
                  </div>
                  <div className="bc-field">
                    <label className="bc-field-label">Description</label>
                    <input type="text" placeholder="Optional" value={newUomForm.description}
                      onChange={(e) => setNewUomForm((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="bc-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="button" className="primary-btn small" style={{ width: '100%' }} onClick={handleCreateUom} disabled={isCreatingUom}>
                      {isCreatingUom ? '…' : 'Save UOM'}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="pcc-fgrid">
                <Field label="Base UOM" hint="Selling price is per 1 unit of this UOM">
                  <select value={form.baseUomId} onChange={(e) => { handleChange('baseUomId', e.target.value); setUomConversions([]); handleChange('defaultStockInUomId', ''); handleChange('defaultStockOutUomId', ''); }}>
                    <option value="">{uoms.length === 0 ? 'No UOMs — create one above' : '— Select base UOM —'}</option>
                    {uomOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
              {form.baseUomId ? (
                <div className="pcc-uom-table-wrap">
                  {uomConversions.length > 0 ? (
                    <table className="pcc-uom-table">
                      <thead>
                        <tr>
                          <th>UOM</th>
                          <th style={{ width: 60 }}>Qty</th>
                          <th style={{ width: 30 }}></th>
                          <th>Base UOM</th>
                          <th style={{ width: 90 }}>Factor <span className="bc-required">*</span></th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {uomConversions.map((row, i) => (
                          <tr key={row._id}>
                            <td>
                              <select value={row.uomId} onChange={(e) => handleUomRowChange(i, 'uomId', e.target.value)}>
                                <option value="">Select UOM</option>
                                {uomOptions.filter((o) => o.value !== form.baseUomId).map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </td>
                            <td><input type="number" value="1" readOnly className="pcc-uom-fixed" /></td>
                            <td className="pcc-uom-eq">=</td>
                            <td><div className="pcc-uom-base-label">{selectedBaseUomLabel}</div></td>
                            <td>
                              <input type="number" step="0.000001" placeholder="e.g. 1000"
                                value={row.conversionFactor}
                                onChange={(e) => handleUomRowChange(i, 'conversionFactor', e.target.value)} />
                            </td>
                            <td>
                              <button type="button" className="pcc-uom-remove" onClick={() => handleRemoveUomRow(i)} title="Remove">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {uomConversions.length < 3 ? (
                    <button type="button" className="ghost-btn small" style={{ marginTop: 8 }} onClick={handleAddUomRow}>
                      + Add UOM Conversion
                    </button>
                  ) : null}
                  {uomConversions.length > 0 ? (
                    <div className="pcc-fgrid" style={{ marginTop: 16 }}>
                      <Field label="Default UOM for Stock In" required>
                        <select value={form.defaultStockInUomId} onChange={(e) => handleChange('defaultStockInUomId', e.target.value)}>
                          <option value="">Select UOM</option>
                          {combinedUomOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Default UOM for Stock Out" required>
                        <select value={form.defaultStockOutUomId} onChange={(e) => handleChange('defaultStockOutUomId', e.target.value)}>
                          <option value="">Select UOM</option>
                          {combinedUomOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </Field>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="pcc-section-label-row" style={{ marginTop: 8 }}>
                <span className="pcc-section-label" style={{ marginBottom: 0 }}>Variants ({variants.length})</span>
                <button type="button" className="primary-btn small" onClick={handleAddVariant}>+ Add Variant</button>
              </div>
              {variants.length === 0 ? (
                <div className="pcc-variants-empty">No variants added. Click "+ Add Variant" to begin.</div>
              ) : (
                <div className="pcc-variants-list">
                  {variants.map((v, idx) => {
                    const varThumb = resolveMediaUrl(v.thumbnailImage);
                    const varGallery = parseList(v.galleryImagesText).map(resolveMediaUrl).filter(Boolean);
                    return (
                      <div className="pcc-variant-card" key={v._id}>
                        <div className="pcc-variant-card-head">
                          <span className="pcc-variant-index">Variant {idx + 1}</span>
                          <button type="button" className="ghost-btn small" onClick={() => handleRemoveVariant(v._id)}>Remove</button>
                        </div>
                        <div className="pcc-fgrid">
                          <Field label="Variant Name">
                            <input type="text" placeholder="e.g. Red – Large" value={v.variantName}
                              onChange={(e) => handleVariantChange(v._id, 'variantName', e.target.value)} />
                          </Field>
                          <Field label="SKU">
                            <input type="text" placeholder="e.g. SKU-001" value={v.sku}
                              onChange={(e) => handleVariantChange(v._id, 'sku', e.target.value)} />
                          </Field>
                          <Field label="Barcode">
                            <input type="text" placeholder="e.g. 8901234567890" value={v.barcode}
                              onChange={(e) => handleVariantChange(v._id, 'barcode', e.target.value)} />
                          </Field>
                          <Field label="Selling Price (Rs)">
                            <input type="number" placeholder="0.00" value={v.sellingPrice}
                              onChange={(e) => handleVariantChange(v._id, 'sellingPrice', e.target.value)} />
                          </Field>
                          <Field label="MRP (Rs)">
                            <input type="number" placeholder="0.00" value={v.mrp}
                              onChange={(e) => handleVariantChange(v._id, 'mrp', e.target.value)} />
                          </Field>
                          <Field label="Stock Quantity">
                            <input type="number" placeholder="0" value={v.stockQuantity}
                              onChange={(e) => handleVariantChange(v._id, 'stockQuantity', e.target.value)} />
                          </Field>
                          <Field label="Low Stock Alert">
                            <input type="number" placeholder="0" value={v.lowStockAlert}
                              onChange={(e) => handleVariantChange(v._id, 'lowStockAlert', e.target.value)} />
                          </Field>
                        </div>
                        <div className="pcc-variant-media">
                          <div className="pcc-variant-thumb-box">
                            {varThumb ? <img src={varThumb} alt="Variant thumbnail" /> : <span>No image</span>}
                          </div>
                          <div className="pcc-variant-media-actions">
                            <button type="button" className="ghost-btn small"
                              onClick={() => openUpload({ kind: 'variant', variantId: v._id, field: 'thumbnail' })}
                              disabled={isUploadingMedia}>Upload Thumbnail</button>
                            <button type="button" className="ghost-btn small"
                              onClick={() => openUpload({ kind: 'variant', variantId: v._id, field: 'gallery' })}
                              disabled={isUploadingMedia}>+ Gallery</button>
                            {varGallery.length > 0 ? (
                              <div className="pcc-gallery-grid pcc-variant-gallery">
                                {varGallery.map((url, gi) => (
                                  <MediaThumb key={`${url}-${gi}`} url={url}
                                    onRemove={() => { const next = varGallery.filter((_, idx2) => idx2 !== gi); handleVariantChange(v._id, 'galleryImagesText', next.join(', ')); }} />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="pcc-variant-attrs">
                          <div className="pcc-variant-attrs-head">
                            <span className="pcc-media-label">Attributes</span>
                            <button type="button" className="ghost-btn small" onClick={() => handleAddVariantAttr(v._id)}>+ Add</button>
                          </div>
                          {(v.attributes || []).map((attr, ai) => (
                            <div className="pcc-attr-row" key={ai}>
                              <input type="text" placeholder="Key (e.g. color)" value={attr.key}
                                onChange={(e) => handleVariantAttrChange(v._id, ai, 'key', e.target.value)} />
                              <input type="text" placeholder="Value (e.g. Red)" value={attr.value}
                                onChange={(e) => handleVariantAttrChange(v._id, ai, 'value', e.target.value)} />
                              <button type="button" className="ghost-btn small" onClick={() => handleRemoveVariantAttr(v._id, ai)}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {/* ── Media ───────────────────────────────────────── */}
          {activeTab === 'media' ? (
            <>
              <p className="pcc-section-label">Thumbnail Image</p>
              <div className="pcc-media-row">
                <div className="pcc-thumb-box">
                  {thumbnailUrl
                    ? <img src={thumbnailUrl} alt="Thumbnail preview" className="pcc-thumb-img" />
                    : <div className="pcc-thumb-empty"><span>No thumbnail</span></div>}
                </div>
                <div className="pcc-thumb-actions">
                  <p className="pcc-media-hint">Shown in product cards and listings. Square image recommended.</p>
                  <div className="pcc-media-btns">
                    <button type="button" className="primary-btn small"
                      onClick={() => openUpload({ kind: 'product', field: 'thumbnail' })} disabled={isUploadingMedia}>
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
                  onClick={() => openUpload({ kind: 'product', field: 'gallery' })} disabled={isUploadingMedia}>
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

          {/* ── Company Mapping ─────────────────────────────── */}
          {activeTab === 'company' ? (
            <>
              <div className="pcc-fgrid">
                <Field label="Business Account" required error={errors.userId} touched={touched.userId} span2>
                  <select {...inp('userId')}>
                    <option value="">Select business account</option>
                    {businesses.map((b) => <option key={b.id} value={b.id}>{getBusinessName(b)}</option>)}
                  </select>
                </Field>
              </div>
              <div className="pcc-company-summary">
                <div className="pcc-company-card">
                  <span className="pcc-company-label">Business</span>
                  <strong>{selectedBusiness ? getBusinessName(selectedBusiness) : 'Select a business account'}</strong>
                  <p>New product records will be owned under this account.</p>
                </div>
                <div className="pcc-company-card">
                  <span className="pcc-company-label">Category Path</span>
                  <strong>{selectedCategoryPath || 'Complete classification first'}</strong>
                  <p>Classification should be finalized before publishing.</p>
                </div>
                <div className="pcc-company-card">
                  <span className="pcc-company-label">Setup Snapshot</span>
                  <strong>{selectedBaseUomLabel || 'Base UOM not selected yet'}</strong>
                  <p>{thumbnailUrl ? `Thumbnail added with ${galleryUrls.length} gallery image(s).` : 'Product media is not complete yet.'}</p>
                </div>
              </div>
            </>
          ) : null}

        </div>{/* end pcc-form-body */}

        {/* ── Footer actions ── */}
        <div className="pcc-form-actions">
          <button type="button" className="ghost-btn" onClick={() => navigate('/admin/products')} disabled={isSaving}>Cancel</button>
          <div className={`pcc-save-actions${isSaveMenuOpen ? ' is-open' : ''}`} ref={saveMenuRef}>
            <button
              type="button"
              className="primary-btn pcc-save-main-btn"
              disabled={isSaving}
              onClick={() => {
                setIsSaveMenuOpen(false);
                setSubmitMode('draft');
                handleSubmit(undefined, 'draft');
              }}
            >
              {isSaving && submitMode === 'draft' ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="primary-btn pcc-save-toggle-btn"
              disabled={isSaving}
              aria-label="Open save actions"
              aria-haspopup="menu"
              aria-expanded={isSaveMenuOpen}
              onClick={() => setIsSaveMenuOpen((prev) => !prev)}
            >
              ▾
            </button>
            {isSaveMenuOpen ? (
              <div className="pcc-save-menu" role="menu">
                <button
                  type="button"
                  className="pcc-save-menu-item"
                  role="menuitem"
                  disabled={isSaving}
                  onClick={() => {
                    setIsSaveMenuOpen(false);
                    setSubmitMode('submit');
                    handleSubmit(undefined, 'submit');
                  }}
                >
                  {isSaving && submitMode === 'submit' ? 'Submitting...' : 'Save & Submit'}
                </button>
              </div>
            ) : null}
          </div>
          <button type="submit" className="primary-btn" disabled={isSaving}>
            {isSaving ? 'Creating…' : 'Save'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default ProductCreatePage;
