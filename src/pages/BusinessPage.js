import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createUserAccount,
  deleteUsersBulk,
  fetchBusinessDetails,
  fetchBusinesses,
  getAddonHistory,
  getBusinessFeatureUsage,
  getBusinessLeadSummary,
  getBusinessOrderSummary,
  getBusinessPaymentSummary,
  getUserBusinessScore,
  listProductsByBusinessUser,
  listRoles,
  listSubscriptionAssignments,
  updateBusinessProfile,
  updateBusinessProfileStatus,
  updateBusinessAccount,
} from '../services/adminApi';
import { BUSINESS_PERMISSIONS, REVIEW_MODERATION_PERMISSIONS } from '../constants/adminPermissions';
import { usePermissions } from '../shared/permissions';

const normalize = (value) => String(value || '').toLowerCase();
const DETAIL_PAGE_SIZE = 10;
const BUSINESS_LIST_PAGE_SIZE_OPTIONS = [10, 25, 50];

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

const formatCurrency = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `₹${number.toLocaleString('en-IN')}`;
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const paginateItems = (items, page, pageSize = DETAIL_PAGE_SIZE) => {
  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, totalItems);

  return {
    items: list.slice(start, end),
    totalItems,
    totalPages,
    page: safePage,
    start,
    end,
  };
};

const buildStatusOptions = (items, picker) => (
  Array.from(new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => normalizeStatus(picker(item)))
      .filter(Boolean)
  ))
);

const getStatusPillClass = (value) => {
  const normalized = normalizeStatus(value);
  if (['ACTIVE', 'VERIFIED', 'APPROVED', 'PAID', 'SUCCESS', 'ACCEPTED', 'COMPLETED'].includes(normalized)) {
    return 'status-verified';
  }
  if (['FAILED', 'DECLINED', 'REJECTED', 'EXPIRED', 'INACTIVE', 'REFUNDED'].includes(normalized)) {
    return 'status-inactive';
  }
  return 'status-pending';
};

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
  if (normalized === 'UNDER_REVIEW') {
    return { label: 'Under Review', className: 'under-review', isVerified: false };
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

/* ── Create Business ─────────────────────────────────────── */
const CB_PHONE_RE = /^[0-9]{10}$/;
const CB_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CB_GST_RE   = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CB_PAN_RE   = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const CB_IFSC_RE  = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const CB_POSTAL_RE = /^[0-9]{6}$/;

const INITIAL_CREATE_BUSINESS_FORM = {
  // Account
  ownerName: '', phone: '', role: '',
  // Business
  businessName: '', industry: '', businessType: '', gstNumber: '', businessPan: '',
  udyam: '', website: '', description: '', experience: '', hours: '', nature: '',
  // Address
  address: '', postalCode: '', plotNo: '', landmark: '', cityCode: '', stateCode: '',
  countryCode: '', latitude: '', longitude: '',
  // Banking
  accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '',
};

const CREATE_BUSINESS_TABS = [
  { key: 'account',  label: 'Account Details' },
  { key: 'business', label: 'Business Details' },
  { key: 'address',  label: 'Address Details' },
  { key: 'banking',  label: 'Banking Details' },
];

const getCreateTabForField = (key) => {
  const accountKeys  = new Set(['ownerName', 'phone', 'role']);
  const businessKeys = new Set(['businessName','industry','businessType','gstNumber','businessPan','udyam','website','description','experience','hours','nature']);
  const addressKeys  = new Set(['address','postalCode','plotNo','landmark','cityCode','stateCode','countryCode','latitude','longitude']);
  const bankingKeys  = new Set(['accountHolderName','bankName','accountNumber','ifscCode']);
  if (accountKeys.has(key))  return 'account';
  if (businessKeys.has(key)) return 'business';
  if (addressKeys.has(key))  return 'address';
  if (bankingKeys.has(key))  return 'banking';
  return 'business';
};

const CREATE_BUSINESS_FIELDS = [
  // Account
  { key: 'ownerName',    label: 'Owner Name',    tab: 'account',  required: true },
  { key: 'phone',        label: 'Phone Number',  tab: 'account',  required: true, hint: '10-digit mobile number' },
  { key: 'role',         label: 'Role',          tab: 'account',  type: 'role' },
  // Business
  { key: 'businessName', label: 'Business Name', tab: 'business', required: true, span: true },
  { key: 'industry',     label: 'Industry',      tab: 'business' },
  { key: 'businessType', label: 'Business Type', tab: 'business' },
  { key: 'gstNumber',    label: 'GST Number',    tab: 'business', hint: 'e.g. 22AAAAA0000A1Z5' },
  { key: 'businessPan',  label: 'Business PAN',  tab: 'business', hint: 'e.g. AAAAA0000A' },
  { key: 'udyam',        label: 'Udyam',         tab: 'business' },
  { key: 'website',      label: 'Website',       tab: 'business' },
  { key: 'experience',   label: 'Experience',    tab: 'business' },
  { key: 'hours',        label: 'Business Hours',tab: 'business' },
  { key: 'nature',       label: 'Nature',        tab: 'business' },
  { key: 'description',  label: 'Description',   tab: 'business', type: 'textarea', span: true },
  // Address
  { key: 'address',      label: 'Full Address',  tab: 'address',  type: 'textarea', span: true },
  { key: 'plotNo',       label: 'Plot / Door No',tab: 'address' },
  { key: 'landmark',     label: 'Landmark',      tab: 'address' },
  { key: 'postalCode',   label: 'Postal Code',   tab: 'address',  hint: '6-digit PIN' },
  { key: 'cityCode',     label: 'City',          tab: 'address' },
  { key: 'stateCode',    label: 'State',         tab: 'address' },
  { key: 'countryCode',  label: 'Country Code',  tab: 'address' },
  { key: 'latitude',     label: 'Latitude',      tab: 'address',  type: 'number' },
  { key: 'longitude',    label: 'Longitude',     tab: 'address',  type: 'number' },
  // Banking
  { key: 'accountHolderName', label: 'Account Holder Name', tab: 'banking' },
  { key: 'bankName',           label: 'Bank Name',           tab: 'banking' },
  { key: 'accountNumber',      label: 'Account Number',      tab: 'banking' },
  { key: 'ifscCode',           label: 'IFSC Code',           tab: 'banking', hint: 'e.g. SBIN0001234' },
];

const validateCreateBusinessForm = (form) => {
  const errors = {};
  if (!form.ownerName?.trim())    errors.ownerName    = 'Owner name is required.';
  if (!form.phone?.trim())        errors.phone        = 'Phone number is required.';
  else if (!CB_PHONE_RE.test(form.phone.trim())) errors.phone = 'Phone must be exactly 10 digits.';
  if (!form.businessName?.trim()) errors.businessName = 'Business name is required.';
  if (form.gstNumber?.trim()  && !CB_GST_RE.test(form.gstNumber.trim().toUpperCase()))
    errors.gstNumber  = 'Invalid GST format (e.g. 22AAAAA0000A1Z5).';
  if (form.businessPan?.trim() && !CB_PAN_RE.test(form.businessPan.trim().toUpperCase()))
    errors.businessPan = 'Invalid PAN format (e.g. AAAAA0000A).';
  if (form.ifscCode?.trim()   && !CB_IFSC_RE.test(form.ifscCode.trim().toUpperCase()))
    errors.ifscCode   = 'Invalid IFSC format (e.g. SBIN0001234).';
  if (form.postalCode?.trim() && !CB_POSTAL_RE.test(form.postalCode.trim()))
    errors.postalCode = 'Postal code must be 6 digits.';
  if (form.latitude?.toString().trim()) {
    const lat = Number(form.latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude must be -90 to 90.';
  }
  if (form.longitude?.toString().trim()) {
    const lng = Number(form.longitude);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) errors.longitude = 'Longitude must be -180 to 180.';
  }
  return errors;
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
  const [viewProducts, setViewProducts] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [editBusinessProfile, setEditBusinessProfile] = useState(null);
  const [editBusinessForm, setEditBusinessForm] = useState(() => buildBusinessFormState(null));
  const [isBusinessSaving, setIsBusinessSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [businessListPage, setBusinessListPage] = useState(0);
  const [businessListPageSize, setBusinessListPageSize] = useState(10);
  const [columnVisibility, setColumnVisibility] = useState({
    srNo: true,
    businessName: true,
    businessEmail: true,
    ownerName: true,
    phone: true,
    personalEmail: true,
    status: true,
    createdBy: true,
    createdOn: true,
    businessArea: true,
  });
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Create business modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTab, setCreateTab] = useState('account');
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_BUSINESS_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [isCreateSaving, setIsCreateSaving] = useState(false);
  const [createRoles, setCreateRoles] = useState([]);

  // View-page tab data
  const [viewSubscriptions, setViewSubscriptions] = useState([]);
  const [viewFeatureUsage, setViewFeatureUsage] = useState([]); // [{ subscription_id, plan_name, features: [...] }]
  const [viewLeads, setViewLeads] = useState(null);
  const [viewOrders, setViewOrders] = useState(null);
  const [viewPayments, setViewPayments] = useState(null);
  const [viewBusinessScore, setViewBusinessScore] = useState(null);
  const [viewAddonHistory, setViewAddonHistory] = useState([]);
  const [isTabDataLoading, setIsTabDataLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [leadsPage, setLeadsPage] = useState(0);
  const [ordersPage, setOrdersPage] = useState(0);
  const [productStatusFilter, setProductStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState('');

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
      const productsList = Array.isArray(productsResponse?.data?.products)
        ? productsResponse.data.products
        : Array.isArray(productsResponse?.data) ? productsResponse.data : [];
      setViewProducts(productsList);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load business details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  useEffect(() => {
    if (!isDetailRoute) {
      setViewDetails(null);
      setViewProducts([]);
      setActiveTab('personal');
      setViewSubscriptions([]);
      setViewFeatureUsage([]);
      setViewLeads(null);
      setViewOrders(null);
      setViewPayments(null);
      setViewBusinessScore(null);
      setViewAddonHistory([]);
      setProductsPage(0);
      setPaymentsPage(0);
      setLeadsPage(0);
      setOrdersPage(0);
      setProductStatusFilter('');
      setPaymentStatusFilter('');
      setLeadStatusFilter('');
      setOrderStatusFilter('');
      setOrderPaymentStatusFilter('');
      return;
    }
    const parsedId = Number(routeBusinessId);
    const safeId = Number.isNaN(parsedId) ? routeBusinessId : parsedId;
    setProductsPage(0);
    setPaymentsPage(0);
    setLeadsPage(0);
    setOrdersPage(0);
    setProductStatusFilter('');
    setPaymentStatusFilter('');
    setLeadStatusFilter('');
    setOrderStatusFilter('');
    setOrderPaymentStatusFilter('');
    loadBusinessDetails(safeId);
    loadViewTabData(safeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailRoute, routeBusinessId]);

  const resolveUnifiedStatus = (user) => {
    const isActive = Number(user?.active) === 1;
    const kycNorm = normalizeStatus(user?.kycStatus);
    if (!isActive) return { label: 'Inactive', className: 'status-inactive' };
    if (kycNorm === 'REJECTED') return { label: 'Rejected', className: 'status-rejected' };
    if (['VERIFIED', 'APPROVED'].includes(kycNorm)) return { label: 'Verified & Active', className: 'status-verified' };
    return { label: 'Pending Review', className: 'status-pending' };
  };

  const filteredBusinesses = useMemo(() => {
    const term = normalize(query);
    return businesses.filter((user) => {
      if (term) {
        const bp = user?.businessProfile || user;
        const haystack = [
          getUserName(user),
          getUserEmail(user),
          user?.number,
          user?.mobile,
          user?.phone,
          bp?.businessName,
          bp?.email,
          bp?.ownerName,
          bp?.serviceArea,
        ]
          .map(normalize)
          .join(' ');
        if (!haystack.includes(term)) return false;
      }
      if (filterStatus) {
        const unified = resolveUnifiedStatus(user);
        if (unified.className !== filterStatus) return false;
      }
      return true;
    });
  }, [query, filterStatus, businesses]);

  const pagedBusinesses = useMemo(
    () => paginateItems(filteredBusinesses, businessListPage, businessListPageSize),
    [filteredBusinesses, businessListPage, businessListPageSize]
  );

  const visibleBusinessRowIds = useMemo(
    () =>
      pagedBusinesses.items
        .map((user) => user?.id || user?.user_id)
        .filter((value) => value !== null && value !== undefined && value !== ''),
    [pagedBusinesses.items]
  );

  const allVisibleBusinessesSelected =
    visibleBusinessRowIds.length > 0 &&
    visibleBusinessRowIds.every((rowId) => selectedRows.has(rowId));

  useEffect(() => {
    setBusinessListPage(0);
  }, [query, filterStatus]);

  useEffect(() => {
    if (businessListPage !== pagedBusinesses.page) {
      setBusinessListPage(pagedBusinesses.page);
    }
  }, [businessListPage, pagedBusinesses.page]);

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

  const handleBulkDelete = async () => {
    if (!selectedRows.size) return;
    setIsDeleting(true);
    setMessage({ type: 'info', text: '' });
    try {
      const ids = Array.from(selectedRows);
      await deleteUsersBulk(token, ids);
      setSelectedRows(new Set());
      setShowBulkDeleteConfirm(false);
      await loadBusinesses();
      setMessage({ type: 'success', text: `${ids.length} business(es) deleted successfully.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete businesses.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBusinessReject = async () => {
    if (!canApprove) {
      setMessage({ type: 'error', text: 'You do not have permission to reject businesses.' });
      return;
    }
    if (!viewBusinessProfile?.profileId) return;
    setIsRejecting(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateBusinessProfileStatus(token, viewBusinessProfile.profileId, 'REJECTED');
      await loadBusinesses();
      await loadBusinessDetails(viewBusinessProfile.userId || viewUser?.id);
      setShowRejectInput(false);
      setRejectReason('');
      setMessage({ type: 'success', text: 'Business KYC rejected.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to reject business KYC.' });
    } finally {
      setIsRejecting(false);
    }
  };

  const toggleColumn = (key) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ── Create Business ─────────────────────────────────────── */
  const openCreateBusiness = async () => {
    if (!canApprove && !canEditKyc) {
      setMessage({ type: 'error', text: 'You do not have permission to create businesses.' });
      return;
    }
    setCreateForm(INITIAL_CREATE_BUSINESS_FORM);
    setCreateErrors({});
    setCreateTab('account');
    setShowCreateModal(true);
    try {
      const resp = await listRoles(token);
      const roles = Array.isArray(resp?.data) ? resp.data : [];
      setCreateRoles(roles);
      if (roles.length > 0) {
        const firstId = roles[0]?.id || roles[0]?.roles_id || roles[0]?.roleId;
        if (firstId) setCreateForm((p) => ({ ...p, role: String(firstId) }));
      }
    } catch (_) {
      setCreateRoles([]);
    }
  };

  const handleCreateChange = (key, value) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    if (createErrors[key]) setCreateErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    const errors = validateCreateBusinessForm(createForm);
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      const firstKey = Object.keys(errors)[0];
      setCreateTab(getCreateTabForField(firstKey));
      return;
    }
    setIsCreateSaving(true);
    try {
      const accountPayload = {
        name: createForm.ownerName.trim(),
        number: createForm.phone.trim(),
        userType: 'BUSINESS',
        role: createForm.role || undefined,
      };
      const accountResp = await createUserAccount(token, accountPayload);
      const newUserId = accountResp?.data?.id || accountResp?.data?.user_id || accountResp?.id;
      if (!newUserId) throw new Error('Account created but user ID not returned. Please refresh and update KYC manually.');

      const profilePayload = {
        businessName: createForm.businessName.trim(),
        ownerName: createForm.ownerName.trim(),
        industry: createForm.industry.trim() || null,
        businessType: createForm.businessType.trim() || null,
        gstNumber: createForm.gstNumber.trim().toUpperCase() || null,
        businessPan: createForm.businessPan.trim().toUpperCase() || null,
        udyam: createForm.udyam.trim() || null,
        website: createForm.website.trim() || null,
        description: createForm.description.trim() || null,
        experience: createForm.experience.trim() || null,
        hours: createForm.hours.trim() || null,
        nature: createForm.nature.trim() || null,
        address: createForm.address.trim() || null,
        postalCode: createForm.postalCode.trim() || null,
        plotNo: createForm.plotNo.trim() || null,
        landmark: createForm.landmark.trim() || null,
        cityCode: createForm.cityCode.trim() || null,
        stateCode: createForm.stateCode.trim() || null,
        countryCode: createForm.countryCode.trim() || null,
        latitude: createForm.latitude !== '' ? Number(createForm.latitude) : null,
        longitude: createForm.longitude !== '' ? Number(createForm.longitude) : null,
        accountHolderName: createForm.accountHolderName.trim() || null,
        bankName: createForm.bankName.trim() || null,
        accountNumber: createForm.accountNumber.trim() || null,
        ifscCode: createForm.ifscCode.trim().toUpperCase() || null,
      };
      await updateBusinessProfile(token, newUserId, profilePayload);
      setShowCreateModal(false);
      await loadBusinesses();
      setMessage({ type: 'success', text: `Business "${profilePayload.businessName}" created successfully.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create business.' });
    } finally {
      setIsCreateSaving(false);
    }
  };

  /* ── View-tab data loaders ───────────────────────────────── */
  const loadViewTabData = async (userId) => {
    if (!userId) return;
    setIsTabDataLoading(true);
    try {
      const [subResp, leadsResp, ordersResp, paymentsResp, scoreResp, addonResp, featureUsageResp] = await Promise.all([
        listSubscriptionAssignments(token, { user_id: userId }),
        getBusinessLeadSummary(token, userId).catch(() => null),
        getBusinessOrderSummary(token, userId).catch(() => null),
        getBusinessPaymentSummary(token, userId).catch(() => null),
        getUserBusinessScore(token, userId).catch(() => null),
        getAddonHistory(token, userId).catch(() => null),
        getBusinessFeatureUsage(token, userId).catch(() => null),
      ]);
      setViewSubscriptions(
        Array.isArray(subResp?.data?.subscriptions) ? subResp.data.subscriptions :
        Array.isArray(subResp?.data) ? subResp.data : []
      );
      setViewFeatureUsage(Array.isArray(featureUsageResp?.data?.feature_usage) ? featureUsageResp.data.feature_usage : []);
      setViewLeads(leadsResp?.data || null);
      setViewOrders(ordersResp?.data || null);
      setViewPayments(paymentsResp?.data || null);
      setViewBusinessScore(scoreResp?.data || null);
      setViewAddonHistory(Array.isArray(addonResp?.data) ? addonResp.data : []);
    } catch (_) {
      setViewSubscriptions([]);
      setViewFeatureUsage([]);
      setViewLeads(null);
      setViewOrders(null);
      setViewPayments(null);
      setViewBusinessScore(null);
      setViewAddonHistory([]);
    } finally {
      setIsTabDataLoading(false);
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

  const productPendingCount = useMemo(() => (
    viewProducts.filter((product) => normalizeStatus(product?.approvalStatus || product?.status || product?.productStatus) === 'PENDING_REVIEW').length
  ), [viewProducts]);

  const paymentItems = useMemo(() => (
    Array.isArray(viewPayments?.payments) ? viewPayments.payments : []
  ), [viewPayments]);

  const leadItems = useMemo(() => (
    Array.isArray(viewLeads?.leads) ? viewLeads.leads : []
  ), [viewLeads]);

  const orderItems = useMemo(() => (
    Array.isArray(viewOrders?.orders) ? viewOrders.orders : []
  ), [viewOrders]);

  const productStatusOptions = useMemo(() => (
    buildStatusOptions(viewProducts, (product) => product?.approvalStatus || product?.status || product?.productStatus)
  ), [viewProducts]);

  const paymentStatusOptions = useMemo(() => (
    buildStatusOptions(paymentItems, (payment) => payment?.status)
  ), [paymentItems]);

  const leadStatusOptions = useMemo(() => (
    buildStatusOptions(leadItems, (lead) => lead?.status)
  ), [leadItems]);

  const orderStatusOptions = useMemo(() => (
    buildStatusOptions(orderItems, (order) => order?.status)
  ), [orderItems]);

  const orderPaymentStatusOptions = useMemo(() => (
    buildStatusOptions(orderItems, (order) => order?.paymentStatus)
  ), [orderItems]);

  const filteredProducts = useMemo(() => (
    viewProducts.filter((product) => {
      const status = normalizeStatus(product?.approvalStatus || product?.status || product?.productStatus);
      return !productStatusFilter || status === productStatusFilter;
    })
  ), [productStatusFilter, viewProducts]);

  const filteredPayments = useMemo(() => (
    paymentItems.filter((payment) => {
      const status = normalizeStatus(payment?.status);
      return !paymentStatusFilter || status === paymentStatusFilter;
    })
  ), [paymentItems, paymentStatusFilter]);

  const filteredLeads = useMemo(() => (
    leadItems.filter((lead) => {
      const status = normalizeStatus(lead?.status);
      return !leadStatusFilter || status === leadStatusFilter;
    })
  ), [leadItems, leadStatusFilter]);

  const filteredOrders = useMemo(() => (
    orderItems.filter((order) => {
      const status = normalizeStatus(order?.status);
      const paymentStatus = normalizeStatus(order?.paymentStatus);
      if (orderStatusFilter && status !== orderStatusFilter) return false;
      if (orderPaymentStatusFilter && paymentStatus !== orderPaymentStatusFilter) return false;
      return true;
    })
  ), [orderItems, orderPaymentStatusFilter, orderStatusFilter]);

  const pagedProducts = useMemo(() => paginateItems(filteredProducts, productsPage), [filteredProducts, productsPage]);
  const pagedPayments = useMemo(() => paginateItems(filteredPayments, paymentsPage), [filteredPayments, paymentsPage]);
  const pagedLeads = useMemo(() => paginateItems(filteredLeads, leadsPage), [filteredLeads, leadsPage]);
  const pagedOrders = useMemo(() => paginateItems(filteredOrders, ordersPage), [filteredOrders, ordersPage]);

  const detailTabs = useMemo(() => ([
    { key: 'personal', label: 'Personal' },
    { key: 'business', label: 'Business' },
    { key: 'bank', label: 'Banking' },
    { key: 'media', label: 'Media' },
    { key: 'products', label: 'Products', count: viewProducts.length, badgeCount: productPendingCount, badgeTone: 'danger' },
    { key: 'subscription', label: 'Subscription', count: viewSubscriptions.length },
    { key: 'payments', label: 'Payments', count: viewPayments?.totalPayments || 0 },
    { key: 'leads', label: 'Leads', count: viewLeads?.totalLeads || 0 },
    { key: 'orders', label: 'Orders', count: viewOrders?.totalOrders || 0 },
    { key: 'performance', label: 'Performance' },
  ]), [
    productPendingCount,
    viewLeads?.totalLeads,
    viewOrders?.totalOrders,
    viewPayments?.totalPayments,
    viewProducts.length,
    viewSubscriptions.length,
  ]);

  const openProductDetail = (product) => {
    const productId = product?.id || product?.productId || product?.product_id;
    if (!productId) return;
    navigate(`/admin/products/${productId}`);
  };

  const renderTableFooter = (paged, setPage, itemLabel) => {
    if (!paged.totalItems) return null;

    return (
      <div className="bv-table-footer">
        <div className="table-record-count">
          Showing {paged.start + 1}-{paged.end} of {paged.totalItems} {itemLabel}
        </div>
        {paged.totalPages > 1 ? (
          <div className="bv-table-pagination">
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '4px 10px', fontSize: 12 }}
              disabled={paged.page === 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              {'< Prev'}
            </button>
            <span>Page {paged.page + 1} / {paged.totalPages}</span>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '4px 10px', fontSize: 12 }}
              disabled={paged.page >= paged.totalPages - 1}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {'Next >'}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const renderTableFilters = (filters) => (
    <div className="bv-table-toolbar">
      {filters.map((filter) => (
        <label key={filter.key} className="bv-table-filter">
          <span className="bv-table-filter-label">{filter.label}</span>
          <select
            className="bv-table-filter-select"
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
          >
            <option value="">{filter.allLabel}</option>
            {filter.options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );

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
      <Banner message={message} />

      {!isDetailRoute ? (
        <>
          <div className="users-filters">
            <span className="status-chip login">{activeCount} Active</span>
            <span className="status-chip logout">{inactiveCount} Inactive</span>
            <span className="status-chip pending">{pendingCount} Pending Review</span>
            <button type="button" className="primary-btn small bdt-add-btn" onClick={() => navigate('/admin/businesses/create')}>
              + Add Business
            </button>
          </div>

          <div className="panel card users-table-card">
            {/* Toolbar */}
            <div className="panel-split">
              <div className="category-list-head-left">
                <div className="gsc-datatable-toolbar-left">
                  <div className="bdt-toolbar-wrap">
                    <button
                      type="button"
                      className={`gsc-toolbar-btn ${showFilterPanel ? 'active' : ''}`}
                      title="Filter"
                      onClick={() => { setShowFilterPanel((v) => !v); setShowColumnPicker(false); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 6h16M4 12h10M4 18h6" />
                      </svg>
                      Filter{filterStatus ? ' •' : ''}
                    </button>
                    {showFilterPanel && (
                      <div className="bdt-dropdown-panel">
                        <p className="bdt-dropdown-label">Status</p>
                        {[
                          { value: '', label: 'All' },
                          { value: 'status-verified', label: 'Verified & Active' },
                          { value: 'status-pending', label: 'Pending Review' },
                          { value: 'status-inactive', label: 'Inactive' },
                          { value: 'status-rejected', label: 'Rejected' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`bdt-dropdown-option ${filterStatus === opt.value ? 'selected' : ''}`}
                            onClick={() => { setFilterStatus(opt.value); setShowFilterPanel(false); }}
                          >
                            {opt.label}
                          </button>
                        ))}
                        {filterStatus ? (
                          <button
                            type="button"
                            className="bdt-dropdown-option danger"
                            onClick={() => { setFilterStatus(''); setShowFilterPanel(false); }}
                          >
                            Clear Filter
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="bdt-toolbar-wrap">
                    <button
                      type="button"
                      className={`gsc-toolbar-btn ${showColumnPicker ? 'active' : ''}`}
                      title="Columns"
                      onClick={() => { setShowColumnPicker((v) => !v); setShowFilterPanel(false); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="18" rx="1" />
                        <rect x="14" y="3" width="7" height="18" rx="1" />
                      </svg>
                      Columns
                    </button>
                    {showColumnPicker && (
                      <div className="bdt-dropdown-panel bdt-column-picker">
                        <p className="bdt-dropdown-label">Visible Columns</p>
                        {[
                          { key: 'srNo', label: 'Sr No' },
                          { key: 'businessName', label: 'Business Name' },
                          { key: 'businessEmail', label: 'Business Email' },
                          { key: 'ownerName', label: 'Owner Name' },
                          { key: 'phone', label: 'Phone' },
                          { key: 'personalEmail', label: 'Personal Email' },
                          { key: 'status', label: 'Status' },
                          { key: 'createdBy', label: 'Created By' },
                          { key: 'createdOn', label: 'Created On' },
                          { key: 'businessArea', label: 'Business Area' },
                        ].map((col) => (
                          <label key={col.key} className="bdt-column-toggle">
                            <input
                              type="checkbox"
                              checked={columnVisibility[col.key]}
                              onChange={() => toggleColumn(col.key)}
                            />
                            {col.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="gsc-datatable-toolbar-right">
                <div className="gsc-toolbar-search">
                  <input
                    type="search"
                    placeholder="Search businesses..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search businesses"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedRows.size > 0 && (
              <div className="bdt-bulk-bar">
                <span className="bdt-bulk-count">{selectedRows.size} selected</span>
                <button
                  type="button"
                  className="ghost-btn small danger"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                >
                  Delete Selected
                </button>
                <button type="button" className="ghost-btn small" onClick={() => setSelectedRows(new Set())}>
                  Clear Selection
                </button>
              </div>
            )}

            {/* Bulk delete confirm */}
            {showBulkDeleteConfirm && (
              <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
                <div className="admin-modal confirm-modal">
                  <h3 className="panel-subheading">Delete {selectedRows.size} Business(es)?</h3>
                  <p className="panel-subtitle">This action cannot be undone. All selected business accounts will be permanently removed.</p>
                  <div className="form-actions" style={{ marginTop: 20 }}>
                    <button type="button" className="ghost-btn" onClick={() => setShowBulkDeleteConfirm(false)} disabled={isDeleting}>
                      Cancel
                    </button>
                    <button type="button" className="primary-btn danger" onClick={handleBulkDelete} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredBusinesses.length === 0 ? (
              <p className="empty-state">{isLoading ? 'Loading...' : 'No businesses found.'}</p>
            ) : (
              <div className="table-shell business-table-shell">
                <table className="admin-table users-table business-datatable">
                  <thead>
                    <tr>
                      <th className="bdt-checkbox-col">
                        <input
                          type="checkbox"
                          className="select-checkbox"
                          checked={allVisibleBusinessesSelected}
                          onChange={(e) => {
                            const pageRowIds = visibleBusinessRowIds;
                            if (e.target.checked) {
                              setSelectedRows((prev) => {
                                const next = new Set(prev);
                                pageRowIds.forEach((rowId) => next.add(rowId));
                                return next;
                              });
                            } else {
                              setSelectedRows((prev) => {
                                const next = new Set(prev);
                                pageRowIds.forEach((rowId) => next.delete(rowId));
                                return next;
                              });
                            }
                          }}
                        />
                      </th>
                      {columnVisibility.srNo && <th>Sr No</th>}
                      {columnVisibility.businessName && <th>Business Name</th>}
                      {columnVisibility.businessEmail && <th>Business Email</th>}
                      {columnVisibility.ownerName && <th>Owner Name</th>}
                      {columnVisibility.phone && <th>Phone</th>}
                      {columnVisibility.personalEmail && <th>Personal Email</th>}
                      {columnVisibility.status && <th>Status</th>}
                      {columnVisibility.createdBy && <th>Created By</th>}
                      {columnVisibility.createdOn && <th>Created On</th>}
                      {columnVisibility.businessArea && <th>Business Area</th>}
                      <th className="table-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedBusinesses.items.map((user, index) => {
                      const rowId = user?.id || user?.user_id;
                      const bp = user?.businessProfile || user;
                      const unifiedStatus = resolveUnifiedStatus(user);
                      const isActive = Number(user?.active) === 1;
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
                          {columnVisibility.srNo && <td>{pagedBusinesses.start + index + 1}</td>}
                          {columnVisibility.businessName && (
                            <td>
                              <span className="bdt-name-link" onClick={() => handleView(user)} role="button" tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleView(user)}>
                                {bp?.businessName || getUserName(user)}
                              </span>
                            </td>
                          )}
                          {columnVisibility.businessEmail && <td className="bdt-email-cell">{bp?.email || '-'}</td>}
                          {columnVisibility.ownerName && <td>{bp?.ownerName || getUserName(user)}</td>}
                          {columnVisibility.phone && <td>{user?.number || user?.mobile || user?.phone || '-'}</td>}
                          {columnVisibility.personalEmail && <td className="bdt-email-cell">{getUserEmail(user)}</td>}
                          {columnVisibility.status && (
                            <td>
                              <span className={`status-pill ${unifiedStatus.className}`}>{unifiedStatus.label}</span>
                            </td>
                          )}
                          {columnVisibility.createdBy && <td>{user?.createdByName || '-'}</td>}
                          {columnVisibility.createdOn && <td>{formatDate(user?.created_at || user?.createdAt || user?.joined_at)}</td>}
                          {columnVisibility.businessArea && <td>{bp?.serviceArea || '-'}</td>}
                          <td className="table-actions">
                            <div className="table-action-group">
                              <TableRowActionMenu
                                rowId={rowId}
                                openRowId={openActionRowId}
                                onToggle={setOpenActionRowId}
                                actions={[
                                  { label: 'View', onClick: () => handleView(user) },
                                  ...(canApprove
                                    ? [{ label: isActive ? 'Deactivate' : 'Activate', onClick: () => handleToggleActive(user), danger: isActive }]
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
                <div className="bv-table-footer">
                  <div className="table-record-count">
                    <span>
                      Showing {pagedBusinesses.totalItems ? pagedBusinesses.start + 1 : 0}-{pagedBusinesses.end} of {filteredBusinesses.length} businesses
                    </span>
                    {query || filterStatus ? <span className="bdt-no-more">Filtered from {businesses.length} total</span> : null}
                  </div>
                  <div className="product-pagination-controls">
                    <label className="product-pagination-size">
                      <span>Rows</span>
                      <select
                        value={businessListPageSize}
                        onChange={(event) => {
                          setBusinessListPageSize(Number(event.target.value) || 10);
                          setBusinessListPage(0);
                        }}
                      >
                        {BUSINESS_LIST_PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="bv-table-pagination">
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={pagedBusinesses.page === 0 || isLoading}
                        onClick={() => setBusinessListPage((prev) => Math.max(prev - 1, 0))}
                      >
                        {'< Prev'}
                      </button>
                      <span>Page {pagedBusinesses.page + 1} / {pagedBusinesses.totalPages}</span>
                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={pagedBusinesses.page >= pagedBusinesses.totalPages - 1 || isLoading}
                        onClick={() =>
                          setBusinessListPage((prev) => Math.min(prev + 1, Math.max(pagedBusinesses.totalPages - 1, 0)))
                        }
                      >
                        {'Next >'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      {isDetailRoute ? (
        <div className="bv-page">
          <button type="button" className="bv-back-link" onClick={() => navigate('/admin/businesses')}>
            ← All Businesses
          </button>

          {isViewLoading && <p className="empty-state">Loading business details...</p>}
          {!isViewLoading && !viewUser && <p className="empty-state">Business details not found.</p>}

          {viewUser ? (
            <>
              {/* ── Hero card ─────────────────────────────────────── */}
              {/* ── Hero card ─────────────────────────────────────── */}
              <div className="bv-hero-card panel card">
                {/* Action buttons — pinned top-right */}
                <div className="bv-hero-actions">
                  {canEditKyc && viewBusinessProfile ? (
                    <button type="button" className="ghost-btn small" onClick={() => navigate('/admin/businesses/' + (viewBusinessProfile.userId || viewUser?.id || '') + '/edit')}>
                      Edit KYC
                    </button>
                  ) : null}
                  {canApprove && viewBusinessProfile?.profileId ? (
                    <>
                      {!verificationMeta.isVerified && normalizeStatus(viewBusinessProfile?.status || viewUser?.kycStatus) !== 'UNDER_REVIEW' ? (
                        <button type="button" className="ghost-btn small" disabled={isBusinessSaving}
                          onClick={async () => {
                            setIsBusinessSaving(true);
                            try {
                              await updateBusinessProfileStatus(token, viewBusinessProfile.profileId, 'UNDER_REVIEW');
                              await loadBusinesses();
                              await loadBusinessDetails(viewBusinessProfile.userId || viewUser?.id);
                              setMessage({ type: 'success', text: 'KYC marked as Under Review.' });
                            } catch (err) { setMessage({ type: 'error', text: err.message || 'Failed.' }); }
                            finally { setIsBusinessSaving(false); }
                          }}
                        >Mark Under Review</button>
                      ) : null}
                      <button type="button"
                        className={verificationMeta.isVerified ? 'ghost-btn small' : 'primary-btn compact'}
                        onClick={handleBusinessApprove}
                        disabled={isBusinessSaving || isRejecting || verificationMeta.isVerified}
                      >
                        {verificationMeta.isVerified ? 'Verified ✓' : isBusinessSaving ? 'Approving...' : 'Approve KYC'}
                      </button>
                      {!verificationMeta.isVerified ? (
                        <button type="button" className="ghost-btn small danger"
                          onClick={() => setShowRejectInput((v) => !v)}
                          disabled={isBusinessSaving || isRejecting}
                        >Reject</button>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <div className="bv-hero-left">
                  {viewBusinessProfile?.logo ? (
                    <img src={viewBusinessProfile.logo} alt="logo" className="bv-hero-avatar bv-hero-avatar-img" />
                  ) : (
                    <div className="bv-hero-avatar bv-hero-avatar-text">{getInitials(viewUser, viewBusinessProfile)}</div>
                  )}
                </div>

                <div className="bv-hero-body">
                  <div className="bv-hero-name-group">
                    <h2 className="bv-hero-name">{viewBusinessProfile?.businessName || getUserName(viewUser)}</h2>
                    <span className={'status-pill ' + verificationMeta.className}>{verificationMeta.label}</span>
                  </div>
                  <p className="bv-hero-secondary">
                    {[
                      viewBusinessProfile?.industry,
                      viewUser?.number || viewUser?.mobile || viewUser?.phone,
                      getUserEmail(viewUser) !== '-' ? getUserEmail(viewUser) : null,
                      (viewUser?.createdAt || viewUser?.created_at) ? 'Joined ' + formatDate(viewUser?.createdAt || viewUser?.created_at) : null,
                    ].filter(Boolean).join('  ·  ')}
                  </p>
                  <div className="bv-hero-kpi-strip">
                    <div className="bv-hero-kpi-cell">
                      <span className="bv-kpi-val">{Number(viewBusinessProfile?.rating ?? viewBusinessProfile?.averageRating ?? viewBusinessProfile?.ratingAvg ?? 0).toFixed(1)}</span>
                      <span className="bv-kpi-lbl">Avg Rating</span>
                    </div>
                    <div className="bv-hero-kpi-cell">
                      <span className="bv-kpi-val">{viewBusinessProfile?.ratingCount ?? viewBusinessProfile?.totalRatings ?? viewBusinessProfile?.ratings_count ?? 0}</span>
                      <span className="bv-kpi-lbl">Ratings</span>
                    </div>
                    <div className="bv-hero-kpi-cell">
                      <span className="bv-kpi-val">{viewBusinessProfile?.reviewCount ?? viewBusinessProfile?.totalReviews ?? viewBusinessProfile?.reviews_count ?? 0}</span>
                      <span className="bv-kpi-lbl">Reviews</span>
                    </div>
                    <div className="bv-hero-kpi-cell">
                      <span className="bv-kpi-val">{viewProducts.length}</span>
                      <span className="bv-kpi-lbl">Products</span>
                    </div>
                    <div className="bv-hero-kpi-cell">
                      <span className="bv-kpi-val">{viewSubscriptions.length}</span>
                      <span className="bv-kpi-lbl">Subscriptions</span>
                    </div>
                    <div className="bv-hero-kpi-cell">
                      <span className="bv-kpi-val">{viewBusinessProfile?.photoReviewCount ?? viewBusinessProfile?.photo_review_count ?? 0}</span>
                      <span className="bv-kpi-lbl">Photo Reviews</span>
                    </div>
                  </div>
                </div>
              </div>

              {showRejectInput ? (
                <div className="bdt-reject-panel panel card">
                  <p className="bdt-reject-label">Rejection Reason <span className="bdt-optional">(optional — noted internally)</span></p>
                  <textarea
                    className="bdt-reject-textarea"
                    placeholder="e.g. GST number mismatch, incomplete address, document unclear..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                  <div className="bdt-reject-actions">
                    <button type="button" className="ghost-btn small" onClick={() => { setShowRejectInput(false); setRejectReason(''); }} disabled={isRejecting}>
                      Cancel
                    </button>
                    <button type="button" className="primary-btn compact danger" onClick={handleBusinessReject} disabled={isRejecting}>
                      {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* ── Tab panel ──────────────────────────────────────── */}
              <div className="bv-panel panel card">
                <div className="bv-tab-bar">
                  {detailTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`bv-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span className="bv-tab-btn-label">
                        {tab.label}
                        {tab.count ? ` (${tab.count})` : ''}
                      </span>
                      {tab.badgeCount ? (
                        <span className={`bv-tab-badge ${tab.badgeTone || ''}`}>{tab.badgeCount}</span>
                      ) : null}
                    </button>
                  ))}
                </div>

                <div className="bv-tab-content">
                  {/* Personal Details */}
                  {activeTab === 'personal' ? renderFieldGrid(personalFields, 'No personal information available.') : null}

                  {/* Business Details */}
                  {activeTab === 'business' ? renderFieldGrid(businessInfoFields, 'No business information available.') : null}

                  {/* Banking Details */}
                  {activeTab === 'bank' ? renderFieldGrid(bankFields, 'No bank details available.') : null}

                  {/* Media */}
                  {activeTab === 'media' ? (() => {
                    const galleryImages = viewBusinessProfile?.images || viewBusinessProfile?.gallery || viewBusinessProfile?.galleryImages || viewBusinessProfile?.businessImages || viewBusinessProfile?.photos || [];
                    const logoUrl = viewBusinessProfile?.logo || viewBusinessProfile?.logoUrl || viewBusinessProfile?.logo_url;
                    return (
                      <div className="bv-media-tab">
                        {logoUrl ? (
                          <div className="bv-media-section">
                            <p className="bv-section-title">Business Logo</p>
                            <div className="bv-logo-wrap">
                              <img src={logoUrl} alt="Business logo" className="bv-logo-img" />
                            </div>
                          </div>
                        ) : null}
                        {galleryImages.length > 0 ? (
                          <div className="bv-media-section">
                            <p className="bv-section-title">Gallery ({galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''})</p>
                            <div className="bv-image-grid">
                              {galleryImages.map((img, i) => {
                                const src = typeof img === 'string' ? img : img?.url || img?.imageUrl || img?.path || '';
                                return src ? <img key={i} src={src} alt={`Gallery ${i + 1}`} className="bv-gallery-img" /> : null;
                              })}
                            </div>
                          </div>
                        ) : null}
                        {!logoUrl && galleryImages.length === 0 ? (
                          <p className="empty-state">No media uploaded for this business.</p>
                        ) : null}
                      </div>
                    );
                  })() : null}

                  {/* Products */}
                  {activeTab === 'products' ? (
                    <div className="bv-list-tab bv-list-tab-products">
                      {isTabDataLoading ? (
                        <p className="empty-state">Loading products...</p>
                      ) : viewProducts.length === 0 ? (
                        <p className="empty-state">No products linked to this business yet.</p>
                      ) : (
                        <>
                          {renderTableFilters([
                            {
                              key: 'product-status',
                              label: 'Status',
                              value: productStatusFilter,
                              onChange: (value) => {
                                setProductStatusFilter(value);
                                setProductsPage(0);
                              },
                              options: productStatusOptions,
                              allLabel: 'All statuses',
                            },
                          ])}
                          {filteredProducts.length === 0 ? (
                            <p className="empty-state" style={{ marginTop: 12 }}>No products match the selected status.</p>
                          ) : (
                        <div className="table-shell">
                          <table className="admin-table bv-detail-table bv-products-table">
                            <thead>
                              <tr>
                                <th>Sr</th>
                                <th>Product ID</th>
                                <th>Type</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Listed On</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedProducts.items.map((product, i) => {
                                const p = {
                                  ...product,
                                  status: product?.approvalStatus || product?.status || product?.productStatus || '',
                                };
                                const pStatus = p?.status || '';
                                const productId = p?.id || p?.product_id;
                                const pStatusClass = getStatusPillClass(pStatus);
                                return (
                                  <tr
                                    key={productId || i}
                                    className={productId ? 'bv-clickable-row' : ''}
                                    onClick={productId ? () => openProductDetail(p) : undefined}
                                  >
                                    <td>{pagedProducts.start + i + 1}</td>
                                    <td>{productId || '-'}</td>
                                    <td>{p?.productType || p?.product_type || p?.type || '-'}</td>
                                    <td>{p?.name || p?.productName || p?.title || '—'}</td>
                                    <td>{p?.category?.name || p?.category?.categoryName || p?.category?.subCategoryName || p?.categoryName || (typeof p?.category === 'string' ? p.category : '—')}</td>
                                    <td><span className={`status-pill ${pStatusClass}`}>{p?.status || '—'}</span></td>
                                    <td>{formatDate(p?.createdAt || p?.created_at)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {renderTableFooter(pagedProducts, setProductsPage, 'products')}
                        </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* Subscription */}
                  {activeTab === 'subscription' ? (
                    <div>
                      {isTabDataLoading ? (
                        <p className="empty-state">Loading subscription data...</p>
                      ) : viewSubscriptions.length === 0 ? (
                        <p className="empty-state">No subscription plans assigned to this business.</p>
                      ) : (
                        <>
                          {viewSubscriptions.map((sub, i) => {
                            const planName = sub?.plan?.name || sub?.plan_name || sub?.planName || '—';
                            const planPrice = sub?.plan?.price ?? sub?.plan?.amount ?? sub?.price ?? null;
                            const isSubActive = sub?.status === 'ACTIVE';
                            // match feature usage for this subscription
                            const subId = sub?.id;
                            const usageRecord = viewFeatureUsage.find(
                              (u) => u.subscription_id === subId || u.subscription_id === sub?.subscription_id
                            );
                            const featureRows = Array.isArray(usageRecord?.features) ? usageRecord.features : [];
                            return (
                              <div key={sub?.id || i} className="bv-sub-card">
                                <div className="bv-sub-card-head">
                                  <span className="bv-sub-plan-name">{planName}</span>
                                  <span className={`status-pill ${isSubActive ? 'status-verified' : 'status-inactive'}`}>{sub?.status || '—'}</span>
                                </div>
                                <div className="user-detail-grid">
                                  {planPrice !== null ? (
                                    <div className="user-detail-card">
                                      <p className="user-detail-label">Plan Price</p>
                                      <p className="user-detail-value">₹{Number(planPrice).toLocaleString('en-IN')}</p>
                                    </div>
                                  ) : null}
                                  <div className="user-detail-card">
                                    <p className="user-detail-label">Start Date</p>
                                    <p className="user-detail-value">{formatDate(sub?.startDate || sub?.start_date)}</p>
                                  </div>
                                  <div className="user-detail-card">
                                    <p className="user-detail-label">Expiry Date</p>
                                    <p className="user-detail-value">{formatDate(sub?.endDate || sub?.end_date)}</p>
                                  </div>
                                  {sub?.billingCycle ? (
                                    <div className="user-detail-card">
                                      <p className="user-detail-label">Billing Cycle</p>
                                      <p className="user-detail-value">{sub.billingCycle}</p>
                                    </div>
                                  ) : null}
                                  {sub?.plan?.duration ? (
                                    <div className="user-detail-card">
                                      <p className="user-detail-label">Duration</p>
                                      <p className="user-detail-value">{sub.plan.duration}</p>
                                    </div>
                                  ) : null}
                                  {sub?.plan?.description ? (
                                    <div className="user-detail-card" style={{ gridColumn: '1 / -1' }}>
                                      <p className="user-detail-label">Plan Description</p>
                                      <p className="user-detail-value">{sub.plan.description}</p>
                                    </div>
                                  ) : null}
                                </div>

                                {/* Feature Usage Table */}
                                <div className="bv-feature-usage-section">
                                  <p className="bv-feature-usage-title">
                                    Feature Usage
                                    {featureRows.length > 0 && (
                                      <span className="bv-feature-usage-count">{featureRows.length} feature{featureRows.length !== 1 ? 's' : ''}</span>
                                    )}
                                  </p>
                                  {featureRows.length === 0 ? (
                                    <p className="bv-feature-usage-empty">No feature data available for this plan.</p>
                                  ) : (
                                    <div className="table-shell">
                                      <table className="admin-table bv-feature-usage-table">
                                        <thead>
                                          <tr>
                                            <th>#</th>
                                            <th>Feature</th>
                                            <th>Limit</th>
                                            <th>Used</th>
                                            <th>Remaining</th>
                                            <th style={{ minWidth: 100 }}>Usage</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {featureRows.map((feat, fi) => {
                                            const limit = feat.total_limit;
                                            const used = feat.used_count ?? 0;
                                            const remaining = feat.remaining_count;
                                            const pct = limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;
                                            const barColor = pct == null ? '#8660ff' : pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a';
                                            return (
                                              <tr key={feat.feature_code || fi}>
                                                <td>{fi + 1}</td>
                                                <td>{feat.feature_name || feat.feature_code || '—'}</td>
                                                <td>{limit != null ? limit : '∞'}</td>
                                                <td>{used}</td>
                                                <td>
                                                  {remaining != null ? (
                                                    <span style={{ color: remaining === 0 ? '#dc2626' : remaining <= (limit * 0.2) ? '#d97706' : 'inherit', fontWeight: remaining === 0 ? 700 : 400 }}>
                                                      {remaining}
                                                    </span>
                                                  ) : '∞'}
                                                </td>
                                                <td>
                                                  {pct != null ? (
                                                    <div className="bv-feature-usage-bar-wrap">
                                                      <div className="bv-feature-usage-bar-track">
                                                        <div className="bv-feature-usage-bar" style={{ width: `${pct}%`, background: barColor }} />
                                                      </div>
                                                      <span className="bv-feature-usage-pct">{pct}%</span>
                                                    </div>
                                                  ) : (
                                                    <span style={{ color: '#6b7280', fontSize: 12 }}>Unlimited</span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {viewAddonHistory.length > 0 ? (
                            <div className="bv-sub-addons">
                              <p className="bv-sub-addons-title">Add-on History</p>
                              <div className="table-shell">
                                <table className="admin-table">
                                  <thead>
                                    <tr><th>Add-on</th><th>Amount</th><th>Purchased On</th><th>Status</th></tr>
                                  </thead>
                                  <tbody>
                                    {viewAddonHistory.map((addon, i) => (
                                      <tr key={addon?.id || i}>
                                        <td>{addon?.addonName || addon?.addon_name || addon?.name || '—'}</td>
                                        <td>{addon?.amount !== undefined ? `₹${Number(addon.amount).toLocaleString('en-IN')}` : '—'}</td>
                                        <td>{formatDate(addon?.createdAt || addon?.created_at || addon?.purchasedAt)}</td>
                                        <td>
                                          <span className={`status-pill ${addon?.status === 'ACTIVE' ? 'status-verified' : 'status-pending'}`}>
                                            {addon?.status || '—'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* Payments */}
                  {activeTab === 'payments' ? (
                    <div>
                      {isTabDataLoading ? (
                        <p className="empty-state">Loading payment history...</p>
                      ) : (
                        <>
                          <div className="bv-kpi-grid">
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Total Payments</p>
                              <p className="bv-kpi-card-val">{viewPayments?.totalPayments ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Successful</p>
                              <p className="bv-kpi-card-val">{viewPayments?.successfulPayments ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Pending</p>
                              <p className="bv-kpi-card-val">{viewPayments?.pendingPayments ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Total Paid Amount</p>
                              <p className="bv-kpi-card-val">{formatCurrency(viewPayments?.totalPaidAmount)}</p>
                            </div>
                          </div>
                          {paymentItems.length > 0 ? (
                            <>
                              {renderTableFilters([
                                {
                                  key: 'payment-status',
                                  label: 'Status',
                                  value: paymentStatusFilter,
                                  onChange: (value) => {
                                    setPaymentStatusFilter(value);
                                    setPaymentsPage(0);
                                  },
                                  options: paymentStatusOptions,
                                  allLabel: 'All statuses',
                                },
                              ])}
                              {filteredPayments.length === 0 ? (
                                <p className="empty-state" style={{ marginTop: 12 }}>No payments match the selected status.</p>
                              ) : (
                            <div className="table-shell" style={{ marginTop: 20 }}>
                              <table className="admin-table bv-detail-table bv-payments-table">
                                <thead>
                                  <tr><th>P-ID</th><th>Type</th><th>Razorpay ID</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                  {pagedPayments.items.map((payment, i) => (
                                    <tr key={payment?.paymentId || i}>
                                      <td>{payment?.paymentId ?? '-'}</td>
                                      <td>{payment?.type || '-'}</td>
                                      <td>{payment?.razorpayPaymentId || '-'}</td>
                                      <td>{formatCurrency(payment?.amount)}</td>
                                      <td>
                                        <span className={`status-pill ${getStatusPillClass(payment?.status)}`}>
                                          {payment?.status || '-'}
                                        </span>
                                      </td>
                                      <td>{formatDate(payment?.paymentDate)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {renderTableFooter(pagedPayments, setPaymentsPage, 'payments')}
                            </div>
                              )}
                            </>
                          ) : (
                            <p className="empty-state" style={{ marginTop: 20 }}>No payment records linked to this business account.</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* Leads */}
                  {activeTab === 'leads' ? (
                    <div>
                      {isTabDataLoading ? (
                        <p className="empty-state">Loading lead data...</p>
                      ) : (
                        <>
                          <div className="bv-kpi-grid">
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Total Leads</p>
                              <p className="bv-kpi-card-val">{viewLeads?.totalLeads ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Offers Sent</p>
                              <p className="bv-kpi-card-val">{viewLeads?.respondedLeads ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Awaiting Action</p>
                              <p className="bv-kpi-card-val">{viewLeads?.pendingLeads ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Accepted</p>
                              <p className="bv-kpi-card-val">{viewLeads?.acceptedLeads ?? 0}</p>
                            </div>
                          </div>
                          {leadItems.length > 0 ? (
                            <>
                              {renderTableFilters([
                                {
                                  key: 'lead-status',
                                  label: 'Status',
                                  value: leadStatusFilter,
                                  onChange: (value) => {
                                    setLeadStatusFilter(value);
                                    setLeadsPage(0);
                                  },
                                  options: leadStatusOptions,
                                  allLabel: 'All statuses',
                                },
                              ])}
                              {filteredLeads.length === 0 ? (
                                <p className="empty-state" style={{ marginTop: 12 }}>No leads match the selected status.</p>
                              ) : (
                            <div className="table-shell" style={{ marginTop: 20 }}>
                              <table className="admin-table bv-detail-table bv-leads-table">
                                <thead>
                                  <tr><th>Lead ID</th><th>Buyer</th><th>Requirement</th><th>Priority</th><th>Status</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                  {pagedLeads.items.map((lead, i) => (
                                    <tr key={lead?.id || i}>
                                      <td>{lead?.id ?? '-'}</td>
                                      <td>{lead?.buyerName || '-'}</td>
                                      <td className="bv-lead-msg">{lead?.requirement || '-'}</td>
                                      <td>{lead?.priority || '-'}</td>
                                      <td>
                                        <span className={`status-pill ${getStatusPillClass(lead?.status)}`}>
                                          {lead?.status || '-'}
                                        </span>
                                      </td>
                                      <td>{formatDate(lead?.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {renderTableFooter(pagedLeads, setLeadsPage, 'leads')}
                            </div>
                              )}
                            </>
                          ) : (
                            <p className="empty-state" style={{ marginTop: 20 }}>No leads linked to this business yet.</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* Orders */}
                  {activeTab === 'orders' ? (
                    <div>
                      {isTabDataLoading ? (
                        <p className="empty-state">Loading order data...</p>
                      ) : (
                        <>
                          <div className="bv-kpi-grid">
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Total Orders</p>
                              <p className="bv-kpi-card-val">{viewOrders?.totalOrders ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Purchase Orders</p>
                              <p className="bv-kpi-card-val">{viewOrders?.purchaseOrders ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Sales Orders</p>
                              <p className="bv-kpi-card-val">{viewOrders?.salesOrders ?? 0}</p>
                            </div>
                            <div className="bv-kpi-card">
                              <p className="bv-kpi-card-label">Total Order Value</p>
                              <p className="bv-kpi-card-val">{formatCurrency(viewOrders?.totalOrderValue)}</p>
                            </div>
                          </div>
                          {orderItems.length > 0 ? (
                            <>
                              {renderTableFilters([
                                {
                                  key: 'order-status',
                                  label: 'Status',
                                  value: orderStatusFilter,
                                  onChange: (value) => {
                                    setOrderStatusFilter(value);
                                    setOrdersPage(0);
                                  },
                                  options: orderStatusOptions,
                                  allLabel: 'All statuses',
                                },
                                {
                                  key: 'order-payment-status',
                                  label: 'Payment Status',
                                  value: orderPaymentStatusFilter,
                                  onChange: (value) => {
                                    setOrderPaymentStatusFilter(value);
                                    setOrdersPage(0);
                                  },
                                  options: orderPaymentStatusOptions,
                                  allLabel: 'All payment statuses',
                                },
                              ])}
                              {filteredOrders.length === 0 ? (
                                <p className="empty-state" style={{ marginTop: 12 }}>No orders match the selected filters.</p>
                              ) : (
                            <div className="table-shell" style={{ marginTop: 20 }}>
                              <table className="admin-table bv-detail-table bv-orders-table">
                                <thead>
                                  <tr><th>Order ID</th><th>Type</th><th>Counterparty</th><th>Requirement</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                  {pagedOrders.items.map((order, i) => (
                                    <tr key={`${order?.orderType || 'ORDER'}-${order?.orderId || i}`}>
                                      <td>{order?.orderId ?? '-'}</td>
                                      <td>{order?.orderType || '-'}</td>
                                      <td>{order?.counterpartyName || '-'}</td>
                                      <td>{order?.productKeyword || '-'}</td>
                                      <td>{formatCurrency(order?.amount)}</td>
                                      <td>
                                        <span className={`status-pill ${getStatusPillClass(order?.paymentStatus)}`}>
                                          {order?.paymentStatus || '-'}
                                        </span>
                                      </td>
                                      <td>
                                        <span className={`status-pill ${getStatusPillClass(order?.status)}`}>
                                          {order?.status || '-'}
                                        </span>
                                      </td>
                                      <td>{formatDate(order?.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {renderTableFooter(pagedOrders, setOrdersPage, 'orders')}
                            </div>
                              )}
                            </>
                          ) : (
                            <p className="empty-state" style={{ marginTop: 20 }}>No purchase or sales orders linked to this business yet.</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* Performance */}
                  {activeTab === 'performance' ? (() => {
                    const bp = viewBusinessProfile || {};
                    const ratingVal = bp.rating ?? bp.averageRating ?? bp.ratingAvg ?? bp.avg_rating ?? null;
                    const ratingCount = bp.ratingCount ?? bp.totalRatings ?? bp.ratings_count ?? bp.rating_count ?? null;
                    const reviewCount = bp.reviewCount ?? bp.totalReviews ?? bp.reviews_count ?? bp.review_count ?? null;
                    const photoReviews = bp.photoReviewCount ?? bp.photo_review_count ?? bp.photoReviews ?? null;
                    const score = viewBusinessScore?.score ?? viewBusinessScore?.totalScore ?? viewBusinessScore?.businessScore ?? null;
                    return (
                    <div>
                      <div className="bv-kpi-grid">
                        <div className="bv-kpi-card">
                          <p className="bv-kpi-card-label">Average Rating</p>
                          <p className="bv-kpi-card-val">{ratingVal !== null ? Number(ratingVal).toFixed(1) : '—'}</p>
                        </div>
                        <div className="bv-kpi-card">
                          <p className="bv-kpi-card-label">Total Ratings</p>
                          <p className="bv-kpi-card-val">{ratingCount ?? '—'}</p>
                        </div>
                        <div className="bv-kpi-card">
                          <p className="bv-kpi-card-label">Total Reviews</p>
                          <p className="bv-kpi-card-val">{reviewCount ?? '—'}</p>
                        </div>
                        <div className="bv-kpi-card">
                          <p className="bv-kpi-card-label">Photo Reviews</p>
                          <p className="bv-kpi-card-val">{photoReviews ?? '—'}</p>
                        </div>
                        <div className="bv-kpi-card">
                          <p className="bv-kpi-card-label">Products Listed</p>
                          <p className="bv-kpi-card-val">{viewProducts.length}</p>
                        </div>
                        {score !== null ? (
                          <div className="bv-kpi-card">
                            <p className="bv-kpi-card-label">Business Score</p>
                            <p className="bv-kpi-card-val">{score}</p>
                          </div>
                        ) : null}
                        {viewBusinessScore?.rank ? (
                          <div className="bv-kpi-card">
                            <p className="bv-kpi-card-label">Rank</p>
                            <p className="bv-kpi-card-val">#{viewBusinessScore.rank}</p>
                          </div>
                        ) : null}
                      </div>
                      {viewBusinessScore ? (
                        <div className="user-detail-grid" style={{ marginTop: 20 }}>
                          {[
                            { label: 'Profile Completeness', value: viewBusinessScore?.profileScore ?? viewBusinessScore?.profileCompleteness },
                            { label: 'Response Rate', value: viewBusinessScore?.responseRate ?? viewBusinessScore?.responseScore },
                            { label: 'Order Completion', value: viewBusinessScore?.orderCompletionRate ?? viewBusinessScore?.orderScore },
                            { label: 'Rating Score', value: viewBusinessScore?.ratingScore },
                          ].filter((item) => item.value !== null && item.value !== undefined).map((item) => (
                            <div key={item.label} className="user-detail-card">
                              <p className="user-detail-label">{item.label}</p>
                              <p className="user-detail-value">{typeof item.value === 'number' ? `${item.value}%` : item.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="bv-info-note" style={{ marginTop: 16 }}>Business performance score is not yet available for this account.</p>
                      )}
                      {canViewReviewModeration ? (
                        <div style={{ marginTop: 20 }}>
                          <button type="button" className="ghost-btn small" onClick={() => navigate('/admin/orders/reviews')}>
                            Open Review Moderation
                          </button>
                        </div>
                      ) : null}
                    </div>
                    );
                  })() : null}
                </div>
              </div>

              {/* ── Approval workflow strip ─────────────────────── */}
              <div className="bv-approval-strip panel card">
                <div className="bv-approval-steps">
                  <div className="bv-approval-step done">
                    <div className="bv-step-circle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="bv-step-text">
                      <p className="bv-step-label">Submitted</p>
                      <p className="bv-step-sub">{formatDate(viewBusinessProfile?.createdAt || viewBusinessProfile?.created_at || viewUser?.createdAt)}</p>
                    </div>
                  </div>
                  <div className="bv-step-connector" />
                  <div className={`bv-approval-step ${['UNDER_REVIEW','VERIFIED','APPROVED'].includes(normalizeStatus(viewBusinessProfile?.status || viewUser?.kycStatus)) ? 'done' : ''}`}>
                    <div className="bv-step-circle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="bv-step-text">
                      <p className="bv-step-label">Under Review</p>
                      <p className="bv-step-sub">KYC Review</p>
                    </div>
                  </div>
                  <div className="bv-step-connector" />
                  <div className={`bv-approval-step ${verificationMeta.isVerified ? 'done' : normalizeStatus(viewBusinessProfile?.status || viewUser?.kycStatus) === 'REJECTED' ? 'rejected' : ''}`}>
                    <div className="bv-step-circle">
                      {normalizeStatus(viewBusinessProfile?.status || viewUser?.kycStatus) === 'REJECTED' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <div className="bv-step-text">
                      <p className="bv-step-label">{normalizeStatus(viewBusinessProfile?.status || viewUser?.kycStatus) === 'REJECTED' ? 'Rejected' : 'KYC Approved'}</p>
                      <p className="bv-step-sub">{approvalInfo?.approvedAt ? formatDate(approvalInfo.approvedAt) : 'Pending decision'}</p>
                    </div>
                  </div>
                  <div className="bv-step-connector" />
                  <div className={`bv-approval-step ${verificationMeta.isVerified && Number(viewUser?.active) === 1 ? 'done' : ''}`}>
                    <div className="bv-step-circle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="bv-step-text">
                      <p className="bv-step-label">Active</p>
                      <p className="bv-step-sub">Live on Platform</p>
                    </div>
                  </div>
                </div>
                {approvalInfo?.approvedAt ? (
                  <p className="bv-approval-meta">
                    Verified on {formatDateOnly(approvalInfo.approvedAt)} at {formatTimeOnly(approvalInfo.approvedAt)}
                    {approvalInfo?.approvedByName ? ` · By ${approvalInfo.approvedByName}` : ''}
                  </p>
                ) : null}
              </div>
            </>
          ) : !isViewLoading ? (
            <p className="empty-state">Business details not found.</p>
          ) : null}
        </div>
      ) : null}

      {/* ── Create Business Modal ─────────────────────────────── */}
      {showCreateModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal create-business-modal">
            <div className="panel-split cb-modal-head">
              <div>
                <h3 className="panel-subheading">Add Business</h3>
                <p className="panel-subtitle">Fill in the details to register a new business account.</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setShowCreateModal(false)} disabled={isCreateSaving}>
                Close
              </button>
            </div>

            {/* Tab navigation */}
            <div className="user-view-tabs cb-tabs">
              {CREATE_BUSINESS_TABS.map((tab) => {
                const hasError = CREATE_BUSINESS_FIELDS.some(
                  (f) => f.tab === tab.key && createErrors[f.key]
                );
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`user-view-tab ${createTab === tab.key ? 'active' : ''} ${hasError ? 'tab-has-error' : ''}`}
                    onClick={() => setCreateTab(tab.key)}
                  >
                    {tab.label}{hasError ? ' !' : ''}
                  </button>
                );
              })}
            </div>

            <form id="create-business-form" className="field-grid business-profile-edit-grid" onSubmit={handleCreateBusiness}>
              {CREATE_BUSINESS_FIELDS.filter((f) => f.tab === createTab).map((field) => {
                const value = createForm[field.key] ?? '';
                const error = createErrors[field.key];
                if (field.type === 'role') {
                  return (
                    <label key={field.key} className="field">
                      <span>{field.label}</span>
                      <select value={value} onChange={(e) => handleCreateChange(field.key, e.target.value)}>
                        <option value="">— Select role —</option>
                        {createRoles.map((r) => {
                          const rId = r?.id || r?.roles_id || r?.roleId;
                          return <option key={rId} value={String(rId)}>{r?.name || r?.role_name || `Role ${rId}`}</option>;
                        })}
                      </select>
                    </label>
                  );
                }
                return (
                  <label key={field.key} className={`field ${field.span ? 'field-span' : ''} ${error ? 'field-error' : ''}`}>
                    <span>
                      {field.label}
                      {field.required && <span className="field-required"> *</span>}
                    </span>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={value}
                        onChange={(e) => handleCreateChange(field.key, e.target.value)}
                        className={error ? 'input-error' : ''}
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={value}
                        step={field.type === 'number' ? 'any' : undefined}
                        placeholder={field.hint || ''}
                        onChange={(e) => handleCreateChange(field.key, e.target.value)}
                        className={error ? 'input-error' : ''}
                      />
                    )}
                    {error && <span className="field-error-msg">{error}</span>}
                    {!error && field.hint && <span className="field-help">{field.hint}</span>}
                  </label>
                );
              })}
            </form>

            {/* Tab navigation footer */}
            <div className="cb-modal-footer">
              <div className="cb-footer-left">
                {CREATE_BUSINESS_TABS.findIndex((t) => t.key === createTab) > 0 && (
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => {
                      const idx = CREATE_BUSINESS_TABS.findIndex((t) => t.key === createTab);
                      setCreateTab(CREATE_BUSINESS_TABS[idx - 1].key);
                    }}
                  >
                    ← Back
                  </button>
                )}
              </div>
              <div className="cb-footer-right">
                {CREATE_BUSINESS_TABS.findIndex((t) => t.key === createTab) < CREATE_BUSINESS_TABS.length - 1 ? (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      const idx = CREATE_BUSINESS_TABS.findIndex((t) => t.key === createTab);
                      setCreateTab(CREATE_BUSINESS_TABS[idx + 1].key);
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button type="submit" form="create-business-form" className="primary-btn" disabled={isCreateSaving}>
                    {isCreateSaving ? 'Creating...' : 'Create Business'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessPage;
