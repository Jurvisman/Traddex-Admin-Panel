import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchBusinessDetails,
  fetchBusinesses,
  listProductsByBusinessUser,
  updateBusinessProfile,
  updateBusinessProfileStatus,
  updateBusinessAccount,
} from '../services/adminApi';
import { BUSINESS_PERMISSIONS, REVIEW_MODERATION_PERMISSIONS } from '../constants/adminPermissions';
import { usePermissions } from '../shared/permissions';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatTimeOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const isBusinessUser = (user) => {
  const raw = user?.userType || user?.type || user?.role;
  return String(raw || '').toUpperCase() === 'BUSINESS';
};

const getUserName = (user) =>
  user?.name || user?.full_name || user?.fullName || user?.username || user?.mobile || `Business #${user?.id || ''}`;

const getUserEmail = (user) => user?.email || user?.email_id || user?.user_email || user?.contact_email || '-';

const getInitials = (user, businessProfile) => {
  const label = businessProfile?.businessName || getUserName(user);
  if (!label) return 'B';
  const words = String(label).trim().split(' ').filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

const resolveBusinessVerification = (statusValue) => {
  const normalized = normalizeStatus(statusValue);
  if (!normalized) return { label: 'Pending', className: 'pending', isVerified: false };
  if (['VERIFIED', 'APPROVED'].includes(normalized)) {
    return { label: 'Verified', className: 'verified', isVerified: true };
  }
  if (normalized === 'REJECTED') {
    return { label: 'Rejected', className: 'rejected', isVerified: false };
  }
  return { label: 'Pending', className: 'pending', isVerified: false };
};

const formatFieldLabel = (key) =>
  String(key || '')
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim();

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

const PERSONAL_INFO_KEYS = new Set([
  'ownerName',
  'contactNumber',
  'whatsappNumber',
  'email',
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
  'languagesSupported',
  'mapLink',
]);

const BANK_INFO_KEYS = new Set(['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'razorpayKey']);

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

const buildUserUpdatePayload = (user, nextActive) => ({
  name: String(user?.name || user?.full_name || user?.fullName || user?.username || '').trim(),
  number: String(user?.number || user?.mobile || user?.phone || '').trim(),
  verify: Number(user?.verify) === 1 ? 1 : 0,
  active: nextActive,
  logout: user?.logout !== undefined && user?.logout !== null ? Number(user.logout) : 0,
  timeZone: String(user?.timeZone || user?.time_zone || '').trim() || null,
});

const pickObjectFields = (record, filterFn) =>
  Object.entries(record || {})
    .filter(([key, value]) => filterFn(key) && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: BUSINESS_PROFILE_FIELDS.find((field) => field.key === key)?.label || formatFieldLabel(key),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));

const pickUserProfileFields = (record) =>
  Object.entries(record || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: formatFieldLabel(key),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));

function BusinessPage({ token, allowedActions }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { id: routeBusinessId } = useParams();
  const isDetailRoute = Boolean(routeBusinessId);
  const [businesses, setBusinesses] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [viewDetails, setViewDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [linkedProductCount, setLinkedProductCount] = useState(0);
  const [activeUserId, setActiveUserId] = useState(null);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [editBusinessProfile, setEditBusinessProfile] = useState(null);
  const [editBusinessForm, setEditBusinessForm] = useState(() => buildBusinessFormState(null));
  const [isBusinessSaving, setIsBusinessSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const allowedActionSet = useMemo(() => {
    const next = new Set();
    const source = allowedActions instanceof Set ? Array.from(allowedActions) : Array.isArray(allowedActions) ? allowedActions : [];
    source.forEach((code) => {
      const normalizedCode = String(code || '').trim().toUpperCase();
      if (normalizedCode) {
        next.add(normalizedCode);
      }
    });
    return next;
  }, [allowedActions]);

  const hasActionModel = allowedActionSet.size > 0;
  const canRead = !hasActionModel || allowedActionSet.has(BUSINESS_PERMISSIONS.read);
  const canEditKyc = !hasActionModel || allowedActionSet.has(BUSINESS_PERMISSIONS.kycUpdate);
  const canApprove = !hasActionModel || allowedActionSet.has(BUSINESS_PERMISSIONS.approve);
  const canViewReviewModeration = hasPermission(REVIEW_MODERATION_PERMISSIONS.read);

  const loadBusinesses = async () => {
    if (!canRead) {
      setBusinesses([]);
      setMessage({ type: 'error', text: 'You do not have permission to view businesses.' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchBusinesses(token);
      const list = Array.isArray(response?.data) ? response.data : [];
      const filtered = list
        .filter((user) => isBusinessUser(user))
        .sort((a, b) => {
          const aDate = new Date(a?.createdAt || a?.created_at || 0).getTime();
          const bDate = new Date(b?.createdAt || b?.created_at || 0).getTime();
          return bDate - aDate;
        });
      setBusinesses(filtered);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load businesses.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDetailRoute) return;
    loadBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailRoute]);

  const loadBusinessDetails = async (userId) => {
    if (!userId) return;
    setIsViewLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [detailsResponse, productsResponse] = await Promise.all([
        fetchBusinessDetails(token, userId),
        listProductsByBusinessUser(token, userId),
      ]);
      setViewDetails(detailsResponse?.data || null);
      setLinkedProductCount(Array.isArray(productsResponse?.data?.products) ? productsResponse.data.products.length : 0);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load business details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  useEffect(() => {
    if (!isDetailRoute) {
      setViewDetails(null);
      setLinkedProductCount(0);
      setActiveTab('personal');
      return;
    }
    const parsedId = Number(routeBusinessId);
    const safeId = Number.isNaN(parsedId) ? routeBusinessId : parsedId;
    loadBusinessDetails(safeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailRoute, routeBusinessId]);

  const filteredBusinesses = useMemo(() => {
    const term = normalize(query);
    if (!term) return businesses;
    return businesses.filter((user) => {
      const haystack = [
        getUserName(user),
        getUserEmail(user),
        user?.number,
        user?.mobile,
        user?.phone,
        user?.businessName,
        user?.status,
      ]
        .map(normalize)
        .join(' ');
      return haystack.includes(term);
    });
  }, [query, businesses]);

  const activeCount = useMemo(() => businesses.filter((user) => Number(user?.active) === 1).length, [businesses]);
  const inactiveCount = Math.max(0, businesses.length - activeCount);
  const verifiedCount = useMemo(() => {
    return businesses.filter((user) => resolveBusinessVerification(user?.kycStatus).isVerified).length;
  }, [businesses]);
  const pendingCount = Math.max(0, businesses.length - verifiedCount);

  const handleView = (user) => {
    if (!canRead) {
      setMessage({ type: 'error', text: 'You do not have permission to view businesses.' });
      return;
    }
    if (!user?.id) return;
    navigate(`/admin/businesses/${user.id}`);
  };

  const handleToggleActive = async (user) => {
    if (!canApprove) {
      setMessage({ type: 'error', text: 'You do not have permission to approve or manage businesses.' });
      return;
    }
    if (!user?.id) return;

    const nextActive = Number(user?.active) === 1 ? 0 : 1;
    const payload = buildUserUpdatePayload(user, nextActive);
    if (!payload.name || !payload.number) {
      setMessage({ type: 'error', text: 'Business account is missing required name or phone fields for update.' });
      return;
    }

    setActiveUserId(user.id);
    setMessage({ type: 'info', text: '' });
    try {
      await updateBusinessAccount(token, user.id, payload);
      await loadBusinesses();
      if ((viewDetails?.user?.id || viewDetails?.user?.user_id) === user.id) {
        await loadBusinessDetails(user.id);
      }
      setMessage({
        type: 'success',
        text: `${getUserName(user)} ${nextActive === 1 ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update business status.' });
    } finally {
      setActiveUserId(null);
    }
  };

  const openBusinessEdit = (profile) => {
    if (!canEditKyc || !profile) return;
    setEditBusinessProfile(profile);
    setEditBusinessForm(buildBusinessFormState(profile));
  };

  const handleBusinessChange = (key, value) => {
    setEditBusinessForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBusinessSave = async (event) => {
    event.preventDefault();
    if (!canEditKyc) {
      setMessage({ type: 'error', text: 'You do not have permission to edit business KYC.' });
      return;
    }
    if (!editBusinessProfile?.userId) return;

    setIsBusinessSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      const payload = buildBusinessPayload(editBusinessForm);
      if (!payload.businessName) {
        throw new Error('Business name is required.');
      }
      await updateBusinessProfile(token, editBusinessProfile.userId, payload);
      await loadBusinesses();
      await loadBusinessDetails(editBusinessProfile.userId);
      setEditBusinessProfile(null);
      setMessage({ type: 'success', text: 'Business profile updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update business profile.' });
    } finally {
      setIsBusinessSaving(false);
    }
  };

  const viewUser = viewDetails?.user || null;
  const viewUserProfile = viewDetails?.userProfile || null;
  const viewBusinessProfile = viewDetails?.businessProfile || null;
  const verificationMeta = resolveBusinessVerification(viewBusinessProfile?.status || viewUser?.kycStatus);

  const approvalInfo = useMemo(() => {
    if (!verificationMeta.isVerified || !viewBusinessProfile) return null;
    const approvedAt =
      viewBusinessProfile.verifiedAt ||
      viewBusinessProfile.approvedAt ||
      viewBusinessProfile.statusUpdatedAt ||
      viewBusinessProfile.updatedAt ||
      viewBusinessProfile.updated_at ||
      viewBusinessProfile.createdAt ||
      viewBusinessProfile.created_at ||
      null;
    const approvedByName =
      viewBusinessProfile.approvedByName ||
      viewBusinessProfile.verifiedBy ||
      viewBusinessProfile.statusUpdatedBy ||
      viewBusinessProfile.updatedByName ||
      '';
    const approvedById = viewBusinessProfile.approvedBy || viewBusinessProfile.approved_by || null;
    if (!approvedAt && !approvedByName && !approvedById) return null;
    return { approvedAt, approvedByName, approvedById };
  }, [verificationMeta.isVerified, viewBusinessProfile]);

  const handleBusinessApprove = async () => {
    if (!canApprove) {
      setMessage({ type: 'error', text: 'You do not have permission to approve businesses.' });
      return;
    }
    if (!viewBusinessProfile?.profileId) return;

    setIsBusinessSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateBusinessProfileStatus(token, viewBusinessProfile.profileId, 'VERIFIED');
      await loadBusinesses();
      await loadBusinessDetails(viewBusinessProfile.userId || viewUser?.id);
      setMessage({ type: 'success', text: 'Business profile verified successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to verify business profile.' });
    } finally {
      setIsBusinessSaving(false);
    }
  };

  const personalFields = useMemo(() => {
    const accountFields = [
      { key: 'account-name', label: 'Account Name', value: getUserName(viewUser) },
      { key: 'account-email', label: 'Account Email', value: getUserEmail(viewUser) },
      { key: 'account-phone', label: 'Phone', value: viewUser?.number || viewUser?.mobile || viewUser?.phone || '-' },
      { key: 'account-timezone', label: 'Time Zone', value: viewUser?.timeZone || viewUser?.time_zone || '-' },
      { key: 'account-joined', label: 'Joined On', value: formatDate(viewUser?.createdAt || viewUser?.created_at) },
    ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '');

    return [
      ...accountFields,
      ...pickUserProfileFields(viewUserProfile),
      ...pickObjectFields(viewBusinessProfile, (key) => PERSONAL_INFO_KEYS.has(key)),
    ];
  }, [viewBusinessProfile, viewUser, viewUserProfile]);

  const businessInfoFields = useMemo(() => {
    return pickObjectFields(
      {
        ...viewBusinessProfile,
        verificationStatus: verificationMeta.label,
      },
      (key) => !PERSONAL_INFO_KEYS.has(key) && !BANK_INFO_KEYS.has(key)
    );
  }, [verificationMeta.label, viewBusinessProfile]);

  const bankFields = useMemo(() => {
    return pickObjectFields(viewBusinessProfile, (key) => BANK_INFO_KEYS.has(key));
  }, [viewBusinessProfile]);
  const businessReviewSummaryCards = [
    {
      label: 'Average Rating',
      value:
        viewBusinessProfile?.rating !== null && viewBusinessProfile?.rating !== undefined
          ? Number(viewBusinessProfile.rating).toFixed(1)
          : '0.0',
    },
    { label: 'Ratings', value: String(viewBusinessProfile?.ratingCount ?? 0) },
    { label: 'Reviews', value: String(viewBusinessProfile?.reviewCount ?? 0) },
    { label: 'Photo Reviews', value: String(viewBusinessProfile?.photoReviewCount ?? 0) },
  ];

  const renderFieldGrid = (items, emptyText) => {
    if (!items.length) {
      return <p className="empty-state">{emptyText}</p>;
    }
    return (
      <div className="user-detail-grid">
        {items.map((field) => (
          <div key={field.key} className="user-detail-card">
            <p className="user-detail-label">{field.label}</p>
            <p className="user-detail-value">{field.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="users-page business-page">
      {isDetailRoute ? (
        <div className="users-head">
          <div>
            <h2 className="panel-title">Business Details</h2>
            <p className="panel-subtitle">
              {viewBusinessProfile?.businessName || getUserName(viewUser) || 'Loading business details...'}
            </p>
          </div>
        </div>
      ) : null}

      <Banner message={message} />

      {!isDetailRoute ? (
        <>
          <div className="users-filters">
            <span className="status-chip login">{activeCount} Active</span>
            <span className="status-chip logout">{inactiveCount} Inactive</span>
            <span className="status-chip pending">{pendingCount} Pending Review</span>
          </div>

          <div className="panel card users-table-card">
            <div className="panel-split">
              <div className="category-list-head-left">
                <h3 className="panel-subheading">Business list</h3>
                <div className="gsc-datatable-toolbar-left">
                  <button type="button" className="gsc-toolbar-btn" title="Filter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h10M4 18h6" />
                    </svg>
                    Filter
                  </button>
                  <button type="button" className="gsc-toolbar-btn" title="Columns">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="18" rx="1" />
                      <rect x="14" y="3" width="7" height="18" rx="1" />
                    </svg>
                    Columns
                  </button>
                  <button type="button" className="gsc-toolbar-btn" title="Import/Export">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Import/Export
                  </button>
                </div>
              </div>
              <div className="gsc-datatable-toolbar-right">
                <div className="gsc-toolbar-search">
                  <input
                    type="search"
                    placeholder="Search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search businesses"
                  />
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
              </div>
            </div>

            {filteredBusinesses.length === 0 ? (
              <p className="empty-state">No business accounts found.</p>
            ) : (
              <div className="table-shell business-table-shell">
                <table className="admin-table users-table business-datatable">
                  <thead>
                    <tr>
                      <th className="bdt-checkbox-col">
                        <input
                          type="checkbox"
                          className="select-checkbox"
                          checked={selectedRows.size === filteredBusinesses.length && filteredBusinesses.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(new Set(filteredBusinesses.map((u) => u?.id || u?.user_id)));
                            } else {
                              setSelectedRows(new Set());
                            }
                          }}
                        />
                      </th>
                      <th>Sr. No.</th>
                      <th>Name</th>
                      <th>Company Name/Code</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Verification</th>
                      <th>Status</th>
                      <th>Created By</th>
                      <th>Joined</th>
                      <th className="table-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBusinesses.map((user, index) => {
                      const rowVerification = resolveBusinessVerification(user?.kycStatus);
                      const isActive = Number(user?.active) === 1;
                      const rowId = user?.id || user?.user_id;
                      return (
                        <tr key={rowId || getUserEmail(user)} className={selectedRows.has(rowId) ? 'bdt-row-selected' : ''}>
                          <td className="bdt-checkbox-col">
                            <input
                              type="checkbox"
                              className="select-checkbox"
                              checked={selectedRows.has(rowId)}
                              onChange={(e) => {
                                setSelectedRows((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(rowId);
                                  else next.delete(rowId);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td>{index + 1}</td>
                          <td>
                            <span className="bdt-name-link" onClick={() => handleView(user)} role="button" tabIndex={0}>
                              {getUserName(user)}
                            </span>
                          </td>
                          <td>{user?.businessName || '-'}</td>
                          <td>{user?.number || user?.mobile || user?.phone || '-'}</td>
                          <td className="bdt-email-cell">{getUserEmail(user)}</td>
                          <td>
                            <span className={`verify-pill ${rowVerification.className}`}>{rowVerification.label}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${isActive ? 'approved' : 'rejected'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{user?.createdByName || '-'}</td>
                          <td>{formatDate(user?.created_at || user?.createdAt || user?.joined_at)}</td>
                          <td className="table-actions">
                            <div className="table-action-group">
                              <TableRowActionMenu
                                rowId={rowId}
                                openRowId={openActionRowId}
                                onToggle={setOpenActionRowId}
                                actions={[
                                  {
                                    label: 'View',
                                    onClick: () => handleView(user),
                                  },
                                  ...(canApprove
                                    ? [
                                        {
                                          label: isActive ? 'Deactivate' : 'Activate',
                                          onClick: () => handleToggleActive(user),
                                          danger: isActive,
                                        },
                                      ]
                                    : []),
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="table-record-count">
                  <span>
                    Showing {filteredBusinesses.length} of {businesses.length} records
                  </span>
                  <span className="bdt-no-more">No more records to show</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      {isDetailRoute ? (
        <div className="panel card users-detail-page">
          {isViewLoading ? <p className="empty-state">Loading business details...</p> : null}

          {viewUser ? (
            <>
              <div className="user-view-shell">
                <div className="panel-split detail-section-head">
                  <div className="detail-heading-wrap">
                    <h4 className="detail-section-title">Business Profile</h4>
                    <span className={`verify-pill profile-status-pill ${verificationMeta.className}`}>
                      <span className="profile-status-dot" />
                      <span>{verificationMeta.label}</span>
                    </span>
                  </div>
                  <div className="inline-row detail-section-actions">
                    {canEditKyc && viewBusinessProfile ? (
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() =>
                          navigate(`/admin/businesses/${viewBusinessProfile.userId || viewUser?.id || ''}/edit`)
                        }
                      >
                        Edit KYC
                      </button>
                    ) : null}
                    {canApprove ? (
                      <button
                        type="button"
                        className="primary-btn compact"
                        onClick={handleBusinessApprove}
                        disabled={isBusinessSaving || verificationMeta.isVerified || !viewBusinessProfile?.profileId}
                      >
                        {verificationMeta.isVerified ? 'Verified' : isBusinessSaving ? 'Approving...' : 'Approve'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  {businessReviewSummaryCards.map((item) => (
                    <div
                      key={`business-review-summary-${item.label}`}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: 16,
                        padding: 16,
                        background: '#FFFFFF',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {canViewReviewModeration ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button
                      type="button"
                      className="ghost-btn small"
                      onClick={() => navigate('/admin/orders/reviews')}
                    >
                      Open Review Moderation
                    </button>
                  </div>
                ) : null}

                <div className="user-view-tabs">
                  <button
                    type="button"
                    className={`user-view-tab ${activeTab === 'personal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('personal')}
                  >
                    Personal Info
                  </button>
                  <button
                    type="button"
                    className={`user-view-tab ${activeTab === 'business' ? 'active' : ''}`}
                    onClick={() => setActiveTab('business')}
                  >
                    Business Info
                  </button>
                  <button
                    type="button"
                    className={`user-view-tab ${activeTab === 'bank' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bank')}
                  >
                    Bank Details
                  </button>
                </div>

                <div className="user-view-panel">
                  {activeTab === 'personal' ? renderFieldGrid(personalFields, 'No personal information available.') : null}
                  {activeTab === 'business' ? renderFieldGrid(businessInfoFields, 'No business information available.') : null}
                  {activeTab === 'bank' ? renderFieldGrid(bankFields, 'No bank details available.') : null}
                </div>

                <div className="business-approval-strip">
                  {verificationMeta.isVerified ? (
                    <div className="business-approval-status">
                      <span className="business-approval-dot approved" />
                      <div className="business-approval-text">
                        <p className="business-approval-title">KYC Approved</p>
                        <div className="business-approval-meta">
                          {approvalInfo?.approvedAt ? (
                            <>
                              <div className="business-approval-meta-line">
                                Approved On {formatDateOnly(approvalInfo.approvedAt)} {formatTimeOnly(approvalInfo.approvedAt)}
                              </div>
                              <div className="business-approval-meta-line secondary">
                                {approvalInfo?.approvedByName
                                  ? `By ${approvalInfo.approvedByName}`
                                  : approvalInfo?.approvedById
                                    ? `By Admin #${approvalInfo.approvedById}`
                                    : ''}
                              </div>
                            </>
                          ) : (
                            <div className="business-approval-meta-line">
                              This business KYC is approved.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="business-approval-status">
                      <span className="business-approval-dot pending" />
                      <div className="business-approval-text">
                        <p className="business-approval-title">KYC Pending</p>
                        <p className="business-approval-meta">This business has not been approved yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : !isViewLoading ? (
            <p className="empty-state">Business details not found.</p>
          ) : null}
        </div>
      ) : null}

      {editBusinessProfile ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal business-profile-edit-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">Edit Business Profile</h3>
                <p className="panel-subtitle">{viewBusinessProfile?.businessName || getUserName(viewUser)}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setEditBusinessProfile(null)}>
                Close
              </button>
            </div>

            <form className="field-grid business-profile-edit-grid" onSubmit={handleBusinessSave}>
              {BUSINESS_PROFILE_FIELDS.map((field) => {
                const value = editBusinessForm?.[field.key] ?? '';
                const isTextArea = field.type === 'textarea';
                const isNumber = field.type === 'number';
                return (
                  <label key={`business-edit-${field.key}`} className={`field ${field.span ? 'field-span' : ''}`}>
                    <span>{field.label}</span>
                    {isTextArea ? (
                      <textarea value={value} onChange={(event) => handleBusinessChange(field.key, event.target.value)} />
                    ) : (
                      <input
                        type={isNumber ? 'number' : 'text'}
                        value={value}
                        step={isNumber && (field.key === 'latitude' || field.key === 'longitude') ? 'any' : undefined}
                        onChange={(event) => handleBusinessChange(field.key, event.target.value)}
                        required={Boolean(field.required)}
                      />
                    )}
                  </label>
                );
              })}

              <div className="field field-span form-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditBusinessProfile(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isBusinessSaving}>
                  {isBusinessSaving ? 'Saving...' : 'Save & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BusinessPage;
