import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components';
import { fetchBusinessDetails, updateBusinessProfile } from '../services/adminApi';

const getUserName = (user) =>
  user?.name || user?.full_name || user?.fullName || user?.username || user?.mobile || `Business #${user?.id || ''}`;

const BUSINESS_PROFILE_FIELDS = [
  { key: 'businessName', label: 'Business Name', required: true, span: true },
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'whatsappNumber', label: 'WhatsApp Number' },
  { key: 'email', label: 'Email' },
  { key: 'industry', label: 'Industry' },
  { key: 'businessType', label: 'Business Type' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'businessPan', label: 'Business PAN' },
  { key: 'udyam', label: 'Udyam' },
  { key: 'primaryCategoryId', label: 'Primary Category ID', type: 'number' },
  { key: 'primarySubCategoryId', label: 'Primary Sub-Category ID', type: 'number' },
  { key: 'address', label: 'Address', type: 'textarea', span: true },
  { key: 'formattedAddress', label: 'Formatted Address', type: 'textarea', span: true },
  { key: 'placeId', label: 'Place ID' },
  { key: 'plotNo', label: 'Plot No' },
  { key: 'landmark', label: 'Landmark' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'countryCode', label: 'Country Code' },
  { key: 'stateCode', label: 'State Code' },
  { key: 'cityCode', label: 'City Code' },
  { key: 'latitude', label: 'Latitude', type: 'number' },
  { key: 'longitude', label: 'Longitude', type: 'number' },
  { key: 'logo', label: 'Logo URL' },
  { key: 'website', label: 'Website' },
  { key: 'nature', label: 'Nature' },
  { key: 'branchAddress', label: 'Branch Address', type: 'textarea', span: true },
  { key: 'description', label: 'Description', type: 'textarea', span: true },
  { key: 'experience', label: 'Experience' },
  { key: 'hours', label: 'Hours' },
  { key: 'serviceArea', label: 'Service Area' },
  { key: 'serviceRadius', label: 'Service Radius', type: 'number' },
  { key: 'modeOfService', label: 'Mode of Service' },
  { key: 'paymentMethods', label: 'Payment Methods', type: 'textarea', span: true },
  { key: 'refundPolicy', label: 'Refund Policy', type: 'textarea', span: true },
  { key: 'serviceHighlights', label: 'Service Highlights', type: 'textarea', span: true },
  { key: 'languagesSupported', label: 'Languages Supported' },
  { key: 'licenseNumber', label: 'License Number' },
  { key: 'mapLink', label: 'Map Link' },
  { key: 'accountHolderName', label: 'Account Holder Name' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'accountNumber', label: 'Account Number' },
  { key: 'ifscCode', label: 'IFSC Code' },
  { key: 'razorpayKey', label: 'Razorpay Key' },
];

const getEditTabForField = (key) => {
  const generalKeys = new Set([
    'businessName',
    'ownerName',
    'contactNumber',
    'whatsappNumber',
    'email',
    'industry',
    'businessType',
    'gstNumber',
    'businessPan',
    'udyam',
    'nature',
    'experience',
    'hours',
    'serviceArea',
    'serviceRadius',
    'modeOfService',
    'languagesSupported',
  ]);
  const addressKeys = new Set([
    'address',
    'formattedAddress',
    'placeId',
    'plotNo',
    'landmark',
    'postalCode',
    'countryCode',
    'stateCode',
    'cityCode',
    'latitude',
    'longitude',
    'branchAddress',
    'mapLink',
  ]);
  const bankingKeys = new Set(['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'razorpayKey']);
  const policyKeys = new Set(['paymentMethods', 'refundPolicy', 'serviceHighlights']);

  if (generalKeys.has(key)) return 'general';
  if (addressKeys.has(key)) return 'address';
  if (bankingKeys.has(key)) return 'bank';
  if (policyKeys.has(key)) return 'policy';
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

function BusinessProfileEditPage({ token }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [form, setForm] = useState(() => buildBusinessFormState(null));
  const [activeTab, setActiveTab] = useState('general');

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
  };

  const saveProfile = async () => {
    if (!businessProfile?.userId) {
      setMessage({ type: 'error', text: 'Business profile is missing user information.' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: 'info', text: '' });

    try {
      const payload = buildBusinessPayload(form);
      if (!payload.businessName) {
        throw new Error('Business name is required.');
      }
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
              <button
                type="button"
                className={`user-view-tab ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                General Details
              </button>
              <button
                type="button"
                className={`user-view-tab ${activeTab === 'address' ? 'active' : ''}`}
                onClick={() => setActiveTab('address')}
              >
                Address Details
              </button>
              <button
                type="button"
                className={`user-view-tab ${activeTab === 'bank' ? 'active' : ''}`}
                onClick={() => setActiveTab('bank')}
              >
                Banking Details
              </button>
              <button
                type="button"
                className={`user-view-tab ${activeTab === 'policy' ? 'active' : ''}`}
                onClick={() => setActiveTab('policy')}
              >
                Policies & Highlights
              </button>
            </div>

            <form id="business-edit-form" className="field-grid business-profile-edit-grid" onSubmit={handleSubmit}>
              {BUSINESS_PROFILE_FIELDS.map((field) => {
                if (getEditTabForField(field.key) !== activeTab) return null;
                const value = form?.[field.key] ?? '';
                const isTextArea = field.type === 'textarea';
                const isNumber = field.type === 'number';
                return (
                  <label key={`business-edit-${field.key}`} className={`field ${field.span ? 'field-span' : ''}`}>
                    <span>{field.label}</span>
                    {isTextArea ? (
                      <textarea value={value} onChange={(event) => handleChange(field.key, event.target.value)} />
                    ) : (
                      <input
                        type={isNumber ? 'number' : 'text'}
                        value={value}
                        step={isNumber && (field.key === 'latitude' || field.key === 'longitude') ? 'any' : undefined}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        required={Boolean(field.required)}
                      />
                    )}
                  </label>
                );
              })}
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
