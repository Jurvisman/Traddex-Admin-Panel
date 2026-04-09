import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components';
import { fetchBusinessDetails, listBusinessTypes, listIndustries, updateBusinessProfile } from '../services/adminApi';

const getUserName = (user) =>
  user?.name || user?.full_name || user?.fullName || user?.username || user?.mobile || `Business #${user?.id || ''}`;

/* ── Hours presets (same as create form) ───────────────────────── */
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

const NATURE_OPTIONS = [
  'Manufacturer', 'Wholesaler', 'Retailer', 'Distributor', 'Service Provider',
  'Consultant', 'Importer', 'Exporter', 'Trader', 'Other',
];

/* ── Field definitions ──────────────────────────────────────────── */
// type: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'tel'
//       'industry' | 'segment' | 'businessType' | 'hours' | 'nature' | 'modeOfService'
const BUSINESS_PROFILE_FIELDS = [
  { key: 'businessName',        label: 'Business Name',          required: true, span: true },
  { key: 'ownerName',           label: 'Owner Name' },
  { key: 'contactNumber',       label: 'Contact Number',         type: 'tel' },
  { key: 'whatsappNumber',      label: 'WhatsApp Number',        type: 'tel' },
  { key: 'email',               label: 'Business Email',         type: 'email' },
  { key: 'industry',            label: 'Industry',               type: 'industry' },
  { key: 'businessSegment',     label: 'Business Segment',       type: 'segment' },
  { key: 'businessType',        label: 'Business Type',          type: 'businessType' },
  { key: 'gstNumber',           label: 'GST Number' },
  { key: 'businessPan',         label: 'Business PAN' },
  { key: 'udyam',               label: 'Udyam Registration' },
  { key: 'nature',              label: 'Nature of Business',     type: 'nature' },
  { key: 'experience',          label: 'Experience' },
  { key: 'hours',               label: 'Business Hours',         type: 'hours' },
  { key: 'serviceArea',         label: 'Service Area' },
  { key: 'serviceRadius',       label: 'Service Radius',         type: 'number' },
  { key: 'modeOfService',       label: 'Mode of Service',        type: 'modeOfService' },
  { key: 'languagesSupported',  label: 'Languages Supported' },
  { key: 'primaryCategoryId',   label: 'Primary Category ID',   type: 'number' },
  { key: 'primarySubCategoryId',label: 'Primary Sub-Category ID', type: 'number' },
  { key: 'address',             label: 'Address',                type: 'textarea', span: true },
  { key: 'formattedAddress',    label: 'Formatted Address',      type: 'textarea', span: true },
  { key: 'placeId',             label: 'Place ID' },
  { key: 'plotNo',              label: 'Plot No' },
  { key: 'landmark',            label: 'Landmark' },
  { key: 'postalCode',          label: 'Postal Code' },
  { key: 'countryCode',         label: 'Country Code' },
  { key: 'stateCode',           label: 'State Code' },
  { key: 'cityCode',            label: 'City Code' },
  { key: 'latitude',            label: 'Latitude',               type: 'number' },
  { key: 'longitude',           label: 'Longitude',              type: 'number' },
  { key: 'logo',                label: 'Logo URL' },
  { key: 'website',             label: 'Website',                type: 'url' },
  { key: 'branchAddress',       label: 'Branch Address',         type: 'textarea', span: true },
  { key: 'description',         label: 'Description',            type: 'textarea', span: true },
  { key: 'mapLink',             label: 'Map Link' },
  { key: 'licenseNumber',       label: 'License Number' },
  { key: 'paymentMethods',      label: 'Payment Methods',        type: 'textarea', span: true },
  { key: 'refundPolicy',        label: 'Refund Policy',          type: 'textarea', span: true },
  { key: 'serviceHighlights',   label: 'Service Highlights',     type: 'textarea', span: true },
  { key: 'accountHolderName',   label: 'Account Holder Name' },
  { key: 'bankName',            label: 'Bank Name' },
  { key: 'accountNumber',       label: 'Account Number' },
  { key: 'ifscCode',            label: 'IFSC Code' },
  { key: 'razorpayKey',         label: 'Razorpay Key' },
];

const SPECIAL_TYPES = new Set(['industry', 'segment', 'businessType', 'hours', 'nature', 'modeOfService']);

const getEditTabForField = (key) => {
  const generalKeys = new Set([
    'businessName', 'ownerName', 'contactNumber', 'whatsappNumber', 'email',
    'industry', 'businessSegment', 'businessType', 'gstNumber', 'businessPan', 'udyam',
    'nature', 'experience', 'hours', 'serviceArea', 'serviceRadius', 'modeOfService',
    'languagesSupported', 'logo', 'website', 'licenseNumber', 'description',
    'primaryCategoryId', 'primarySubCategoryId',
  ]);
  const addressKeys = new Set([
    'address', 'formattedAddress', 'placeId', 'plotNo', 'landmark', 'postalCode',
    'countryCode', 'stateCode', 'cityCode', 'latitude', 'longitude', 'branchAddress', 'mapLink',
  ]);
  const bankingKeys = new Set(['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'razorpayKey']);
  const policyKeys  = new Set(['paymentMethods', 'refundPolicy', 'serviceHighlights']);

  if (generalKeys.has(key)) return 'general';
  if (addressKeys.has(key)) return 'address';
  if (bankingKeys.has(key)) return 'bank';
  if (policyKeys.has(key))  return 'policy';
  return 'general';
};

const buildBusinessFormState = (profile) =>
  BUSINESS_PROFILE_FIELDS.reduce((acc, field) => {
    const value = profile?.[field.key];
    acc[field.key] = value !== null && value !== undefined ? value : '';
    return acc;
  }, {});

const buildBusinessPayload = (form) =>
  BUSINESS_PROFILE_FIELDS.reduce((acc, field) => {
    const value = form?.[field.key];
    if (value === null || value === undefined || value === '') {
      acc[field.key] = null;
      return acc;
    }
    if (field.type === 'number') {
      const parsed = Number(value);
      acc[field.key] = Number.isNaN(parsed) ? null : parsed;
      return acc;
    }
    acc[field.key] = typeof value === 'string' ? value.trim() : value;
    return acc;
  }, {});

/* ── Validation ────────────────────────────────────────────────── */
const PHONE_RE  = /^[0-9]{10}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_RE    = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE    = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE   = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const POSTAL_RE = /^[0-9]{6}$/;
const URL_RE    = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;

const validateBusinessForm = (form) => {
  const errors = {};

  if (!form.businessName?.trim()) {
    errors.businessName = 'Business name is required.';
  }
  if (form.email?.trim() && !EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid business email address.';
  }
  if (form.contactNumber?.trim() && !PHONE_RE.test(form.contactNumber.trim())) {
    errors.contactNumber = 'Phone number must be exactly 10 digits.';
  }
  if (form.whatsappNumber?.trim() && !PHONE_RE.test(form.whatsappNumber.trim())) {
    errors.whatsappNumber = 'WhatsApp number must be exactly 10 digits.';
  }
  if (form.gstNumber?.trim() && !GST_RE.test(form.gstNumber.trim().toUpperCase())) {
    errors.gstNumber = 'Invalid GST number format (e.g. 22AAAAA0000A1Z5).';
  }
  if (form.businessPan?.trim() && !PAN_RE.test(form.businessPan.trim().toUpperCase())) {
    errors.businessPan = 'Invalid PAN format (e.g. AAAAA0000A).';
  }
  if (form.ifscCode?.trim() && !IFSC_RE.test(form.ifscCode.trim().toUpperCase())) {
    errors.ifscCode = 'Invalid IFSC code format (e.g. SBIN0001234).';
  }
  if (form.postalCode?.trim() && !POSTAL_RE.test(form.postalCode.trim())) {
    errors.postalCode = 'Postal code must be 6 digits.';
  }
  if (form.website?.trim() && !URL_RE.test(form.website.trim())) {
    errors.website = 'Enter a valid website URL.';
  }
  if (form.latitude?.toString().trim()) {
    const lat = Number(form.latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be between -90 and 90.';
    }
  }
  if (form.longitude?.toString().trim()) {
    const lng = Number(form.longitude);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = 'Longitude must be between -180 and 180.';
    }
  }
  if (form.accountNumber?.trim() && !/^[0-9]{9,18}$/.test(form.accountNumber.trim())) {
    errors.accountNumber = 'Account number must be 9–18 digits.';
  }

  return errors;
};

/* ── Select field renderer ─────────────────────────────────────── */
function SelectField({ value, onChange, options, placeholder, disabled }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options.map((opt) => {
        const val  = typeof opt === 'string' ? opt : (opt.value || opt.id || opt.typeName || opt.name || String(opt));
        const label = typeof opt === 'string' ? opt : (opt.label || opt.typeName || opt.name || val);
        return <option key={val} value={val}>{label}</option>;
      })}
    </select>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
function BusinessProfileEditPage({ token }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [message, setMessage]     = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [viewUser, setViewUser]   = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [form, setForm]           = useState(() => buildBusinessFormState(null));
  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState('general');

  // Reference data for dropdowns
  const [industries, setIndustries]   = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [customHours, setCustomHours] = useState(false);

  /* ── Load industries on mount ──────────────────────────────── */
  useEffect(() => {
    listIndustries(token).then((res) => {
      setIndustries(Array.isArray(res?.data) ? res.data : []);
    }).catch(() => setIndustries([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Reload business types when segment changes ─────────────── */
  useEffect(() => {
    if (!form.businessSegment) { setBusinessTypes([]); return; }
    listBusinessTypes(token, form.businessSegment).then((res) => {
      setBusinessTypes(Array.isArray(res?.data) ? res.data : []);
    }).catch(() => setBusinessTypes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.businessSegment]);

  /* ── Load profile ──────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      setMessage({ type: 'info', text: '' });
      try {
        const response = await fetchBusinessDetails(token, id);
        const data = response?.data || {};
        setViewUser(data.user || null);
        const profile = data.businessProfile || null;
        setBusinessProfile(profile);
        setForm(buildBusinessFormState(profile));
        // Detect if current hours value is a custom (non-preset) value
        const currentHours = profile?.hours || '';
        const isCustom = currentHours && !HOURS_PRESETS.find((p) => p.value === currentHours && p.value !== '__custom__');
        setCustomHours(Boolean(isCustom));
      } catch (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to load business profile.' });
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
    // When segment changes, clear businessType
    if (key === 'businessSegment') {
      setForm((prev) => ({ ...prev, businessSegment: value, businessType: '' }));
    }
  };

  const handleHoursPreset = (val) => {
    if (val === '__custom__') {
      setCustomHours(true);
      handleChange('hours', '');
    } else {
      setCustomHours(false);
      handleChange('hours', val);
    }
  };

  const saveProfile = async () => {
    if (!businessProfile?.userId) {
      setMessage({ type: 'error', text: 'Business profile is missing user information.' });
      return;
    }

    const errors = validateBusinessForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErrorTab = getEditTabForField(Object.keys(errors)[0]);
      setActiveTab(firstErrorTab);
      setMessage({ type: 'error', text: 'Please fix the validation errors before saving.' });
      return;
    }

    setIsSaving(true);
    setFormErrors({});
    setMessage({ type: 'info', text: '' });

    try {
      const payload = buildBusinessPayload(form);
      // Uppercase GST and PAN before saving
      if (payload.gstNumber) payload.gstNumber = payload.gstNumber.toUpperCase();
      if (payload.businessPan) payload.businessPan = payload.businessPan.toUpperCase();
      if (payload.ifscCode) payload.ifscCode = payload.ifscCode.toUpperCase();
      await updateBusinessProfile(token, businessProfile.userId, payload);
      setMessage({ type: 'success', text: 'Business profile updated.' });
      navigate(`/admin/businesses/${businessProfile.userId}`);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update business profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await saveProfile();
  };

  /* ── Render a single field ─────────────────────────────────── */
  const renderField = (field) => {
    const value = form?.[field.key] ?? '';
    const error = formErrors[field.key];
    const commonProps = { className: error ? 'input-error' : undefined };

    let input;
    const fieldType = field.type || 'text';

    if (fieldType === 'textarea') {
      input = (
        <textarea
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          {...commonProps}
        />
      );
    } else if (fieldType === 'industry') {
      const industryOptions = industries.map((ind) => ({
        value: ind?.name || ind?.industryName || String(ind?.id || ''),
        label: ind?.name || ind?.industryName || ind?.title || String(ind?.id || ''),
      }));
      input = (
        <SelectField
          value={value}
          onChange={(v) => handleChange(field.key, v)}
          options={industryOptions}
          placeholder="— Select industry —"
        />
      );
    } else if (fieldType === 'segment') {
      input = (
        <SelectField
          value={value}
          onChange={(v) => handleChange(field.key, v)}
          options={[
            { value: 'B2B', label: 'B2B (Business to Business)' },
            { value: 'B2C', label: 'B2C (Business to Customer)' },
          ]}
          placeholder="— Select segment —"
        />
      );
    } else if (fieldType === 'businessType') {
      const fallbackTypes = ['Manufacturer', 'Trader / Distributor', 'Retailer', 'Service Provider',
        'Wholesaler', 'Importer / Exporter', 'Consultant', 'Other'];
      const typeOptions = businessTypes.length > 0
        ? businessTypes.map((t) => ({
            value: t?.typeName || t?.name || String(t),
            label: t?.typeName || t?.name || String(t),
          }))
        : fallbackTypes.map((n) => ({ value: n, label: n }));
      input = (
        <SelectField
          value={value}
          onChange={(v) => handleChange(field.key, v)}
          options={typeOptions}
          placeholder={form.businessSegment ? '— Select type —' : '— Select segment first —'}
          disabled={!form.businessSegment && businessTypes.length === 0}
        />
      );
    } else if (fieldType === 'nature') {
      input = (
        <SelectField
          value={value}
          onChange={(v) => handleChange(field.key, v)}
          options={NATURE_OPTIONS}
          placeholder="— Select nature —"
        />
      );
    } else if (fieldType === 'modeOfService') {
      input = (
        <SelectField
          value={value}
          onChange={(v) => handleChange(field.key, v)}
          options={['Online', 'Offline', 'Both']}
          placeholder="— Select mode —"
        />
      );
    } else if (fieldType === 'hours') {
      const selectedPreset = HOURS_PRESETS.find((p) => p.value === value && p.value !== '__custom__')
        ? value : (customHours || (value && !HOURS_PRESETS.find((p) => p.value === value)) ? '__custom__' : '');
      input = (
        <>
          <select
            value={selectedPreset}
            onChange={(e) => handleHoursPreset(e.target.value)}
            className={error ? 'input-error' : undefined}
          >
            <option value="">— Select hours —</option>
            {HOURS_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {(customHours || (value && !HOURS_PRESETS.find((p) => p.value === value && p.value !== '__custom__'))) ? (
            <input
              type="text"
              placeholder="e.g. Mon – Sat 9:00 AM – 8:00 PM, Sun closed"
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              style={{ marginTop: 8 }}
              className={error ? 'input-error' : undefined}
            />
          ) : null}
        </>
      );
    } else if (fieldType === 'number') {
      input = (
        <input
          type="number"
          value={value}
          step={field.key === 'latitude' || field.key === 'longitude' ? 'any' : undefined}
          onChange={(e) => handleChange(field.key, e.target.value)}
          required={Boolean(field.required)}
          {...commonProps}
        />
      );
    } else {
      // text, email, tel, url
      const htmlType = ['email', 'tel', 'url'].includes(fieldType) ? fieldType : 'text';
      input = (
        <input
          type={htmlType}
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          required={Boolean(field.required)}
          {...commonProps}
        />
      );
    }

    return (
      <label
        key={`business-edit-${field.key}`}
        className={`field ${field.span ? 'field-span' : ''} ${error ? 'field-error' : ''}`}
      >
        <span>
          {field.label}
          {field.required && <span className="field-required"> *</span>}
        </span>
        {input}
        {error && <span className="field-error-msg">{error}</span>}
      </label>
    );
  };

  const titleName = businessProfile?.businessName || getUserName(viewUser);

  return (
    <div className="users-page business-page business-profile-edit-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">Edit Business Profile</h2>
          <p className="panel-subtitle">{titleName || 'Update business KYC and details.'}</p>
        </div>
      </div>

      <Banner message={message} />

      <div className="panel card business-profile-edit-card">
        {isLoading ? (
          <p className="empty-state">Loading business profile...</p>
        ) : (
          <>
            <div className="user-view-tabs">
              {[
                { key: 'general', label: 'General Details' },
                { key: 'address', label: 'Address Details' },
                { key: 'bank',    label: 'Banking Details' },
                { key: 'policy',  label: 'Policies & Highlights' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`user-view-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form id="business-edit-form" className="field-grid business-profile-edit-grid" onSubmit={handleSubmit}>
              {BUSINESS_PROFILE_FIELDS
                .filter((field) => getEditTabForField(field.key) === activeTab)
                .map((field) => renderField(field))}
            </form>

            <div className="business-edit-footer">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => navigate(`/admin/businesses/${id || businessProfile?.userId || ''}`)}
              >
                Cancel
              </button>
              <button type="submit" form="business-edit-form" className="primary-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BusinessProfileEditPage;
