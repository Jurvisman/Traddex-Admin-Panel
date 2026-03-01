import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createUserAccount,
  deleteUser,
  deleteUsersBulk,
  fetchUserDetails,
  fetchUsers,
  getUserBusinessScore,
  getUserBusinessScoreHistory,
  listRoles,
  listProductsByUser,
  updateBusinessProfile,
  updateBusinessProfileStatus,
  updateUser,
} from '../services/adminApi';

const normalize = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const resolveLoginStatus = (user) => {
  if (user?.logout !== undefined && user?.logout !== null) {
    return Number(user.logout) === 0;
  }
  if (user?.active !== undefined && user?.active !== null) {
    return Number(user.active) === 1;
  }
  const raw =
    user?.login_status ??
    user?.loginStatus ??
    user?.is_logged_in ??
    user?.isLoggedIn ??
    user?.is_online ??
    user?.isOnline ??
    user?.online ??
    user?.current_session;

  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'string') {
    const value = raw.toLowerCase();
    if (['login', 'loggedin', 'online', 'true', 'yes', 'active'].includes(value)) return true;
    if (['logout', 'loggedout', 'offline', 'false', 'no', 'inactive'].includes(value)) return false;
  }
  if (raw && typeof raw === 'object') return true;
  return false;
};

const getUserName = (user) =>
  user?.name || user?.full_name || user?.fullName || user?.username || user?.mobile || `User #${user?.id || ''}`;

const getUserEmail = (user) => user?.email || user?.email_id || user?.user_email || user?.contact_email || '-';

const getUserType = (user) => {
  const raw = user?.userType || user?.type || user?.role || 'USER';
  const value = String(raw || '').toUpperCase();
  if (value === 'BUSINESS') return 'Business';
  if (value === 'LOGISTIC') return 'Logistic';
  if (value === 'INSURANCE') return 'Insurance';
  return 'User';
};

const getSubscriptionLabel = (user) => {
  const plan = user?.subscriptionPlan || user?.subscription_plan;
  return (
    plan?.name ||
    plan?.plan_name ||
    user?.plan_name ||
    user?.subscription ||
    user?.plan ||
    user?.current_plan ||
    'Free'
  );
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const isBusinessUser = (user) => {
  const raw = user?.userType || user?.type || user?.role;
  return String(raw || '').toUpperCase() === 'BUSINESS';
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
  if (['PENDING_REVIEW', 'PENDING', 'COMPLETED'].includes(normalized)) {
    return { label: 'Pending', className: 'pending', isVerified: false };
  }
  return { label: normalized, className: 'pending', isVerified: false };
};

const resolveVerification = (user) => {
  if (isBusinessUser(user)) {
    return resolveBusinessVerification(user?.kycStatus);
  }
  const verified = Number(user?.verify) === 1;
  return { label: verified ? 'Verified' : 'Pending', className: verified ? 'verified' : 'pending', isVerified: verified };
};

const getInitials = (user) => {
  const name = getUserName(user);
  if (!name) return 'U';
  const words = String(name).trim().split(' ').filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

const formatProductStatus = (status) => {
  if (!status) return 'Pending';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join(' ');
};

const formatEventLabel = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join(' ');

const formatDelta = (delta) => {
  if (delta === null || delta === undefined) return '-';
  return `${delta >= 0 ? '+' : ''}${delta}`;
};

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

const USER_TYPE_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'LOGISTIC', label: 'Logistic' },
  { value: 'INSURANCE', label: 'Insurance' },
];

const INITIAL_CREATE_FORM = {
  name: '',
  number: '',
  userType: 'USER',
  role: '',
  timeZone: '',
};

function AdminUsersPage({ token, allowedActions }) {
  const navigate = useNavigate();
  const { id: routeUserId } = useParams();
  const isDetailRoute = Boolean(routeUserId);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [viewDetails, setViewDetails] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState('overview');
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    number: '',
    verify: '0',
    active: '1',
    logout: '0',
    timeZone: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [isLinkedLoading, setIsLinkedLoading] = useState(false);
  const [businessScore, setBusinessScore] = useState(null);
  const [businessScoreHistory, setBusinessScoreHistory] = useState([]);
  const [isBusinessScoreLoading, setIsBusinessScoreLoading] = useState(false);
  const [businessScoreError, setBusinessScoreError] = useState('');
  const [editBusinessProfile, setEditBusinessProfile] = useState(null);
  const [editBusinessForm, setEditBusinessForm] = useState(() => buildBusinessFormState(null));
  const [isBusinessSaving, setIsBusinessSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [createRoles, setCreateRoles] = useState([]);
  const [isCreateRoleLoading, setIsCreateRoleLoading] = useState(false);
  const [isCreateSaving, setIsCreateSaving] = useState(false);

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
  const canUserCreate = !hasActionModel || allowedActionSet.has('ADMIN_USERS_CREATE');
  const canUserRead = !hasActionModel || allowedActionSet.has('ADMIN_USERS_READ');
  const canUserUpdate = !hasActionModel || allowedActionSet.has('ADMIN_USERS_UPDATE');
  const canUserDelete = !hasActionModel || allowedActionSet.has('ADMIN_USERS_DELETE');

  const loadUsers = async () => {
    if (!canUserRead) {
      setUsers([]);
      setSelectedIds(new Set());
      setMessage({ type: 'error', text: 'You do not have permission to view users.' });
      return;
    }
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await fetchUsers(token);
      const list = response?.data || [];
      list.sort((a, b) => {
        const aDate = new Date(a?.createdAt || a?.created_at || 0).getTime();
        const bDate = new Date(b?.createdAt || b?.created_at || 0).getTime();
        return bDate - aDate;
      });
      setUsers(list);
      setSelectedIds(new Set());
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load users.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDetailRoute) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailRoute]);

  const filteredUsers = useMemo(() => {
    const term = normalize(query);
    if (!term) return users;
    return users.filter((user) => {
      const haystack = [
        getUserName(user),
        getUserEmail(user),
        user?.mobile,
        user?.phone,
        user?.userType,
        user?.status,
      ]
        .map(normalize)
        .join(' ');
      return haystack.includes(term);
    });
  }, [query, users]);

  const loginCount = useMemo(() => users.filter((user) => resolveLoginStatus(user)).length, [users]);
  const logoutCount = Math.max(0, users.length - loginCount);
  const pendingCount = useMemo(() => users.filter((user) => !resolveVerification(user).isVerified).length, [users]);
  const verifiedCount = Math.max(0, users.length - pendingCount);
  const selectedCount = selectedIds.size;
  const allSelected =
    filteredUsers.length > 0 && filteredUsers.every((user) => user?.id && selectedIds.has(user.id));

  const toggleSelect = (userId) => {
    if (!userId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      filteredUsers.forEach((user) => {
        if (user?.id) next.add(user.id);
      });
      return next;
    });
  };

  const loadCreateRoles = async () => {
    setIsCreateRoleLoading(true);
    try {
      const response = await listRoles(token);
      const roles = Array.isArray(response?.data) ? response.data : [];
      setCreateRoles(roles);
      if (roles.length > 0) {
        const firstRole = roles[0];
        const firstRoleId = firstRole?.id || firstRole?.roles_id || firstRole?.roleId;
        if (firstRoleId) {
          setCreateForm((prev) => (prev.role ? prev : { ...prev, role: String(firstRoleId) }));
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load roles.' });
    } finally {
      setIsCreateRoleLoading(false);
    }
  };

  const openCreateUserModal = async () => {
    if (!canUserCreate) {
      setMessage({ type: 'error', text: 'You do not have permission to create users.' });
      return;
    }
    setCreateForm(INITIAL_CREATE_FORM);
    setShowCreateModal(true);
    await loadCreateRoles();
  };

  const handleCreateChange = (key, value) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  };

  const openEdit = (user) => {
    if (!canUserUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update users.' });
      return;
    }
    setEditUser(user);
    setEditForm({
      name: user?.name || '',
      number: user?.number || user?.mobile || user?.phone || '',
      verify: user?.verify !== undefined && user?.verify !== null ? String(user.verify) : '0',
      active: user?.active !== undefined && user?.active !== null ? String(user.active) : '1',
      logout: user?.logout !== undefined && user?.logout !== null ? String(user.logout) : '0',
      timeZone: user?.timeZone || user?.time_zone || '',
    });
  };

  const handleEditChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!canUserUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update users.' });
      return;
    }
    if (!editUser?.id) return;
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateUser(token, editUser.id, {
        name: editForm.name.trim(),
        number: editForm.number.trim(),
        verify: Number(editForm.verify),
        active: Number(editForm.active),
        logout: Number(editForm.logout),
        timeZone: editForm.timeZone.trim() || null,
      });
      await loadUsers();
      setEditUser(null);
      setMessage({ type: 'success', text: 'User updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update user.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!canUserCreate) {
      setMessage({ type: 'error', text: 'You do not have permission to create users.' });
      return;
    }

    const payload = {
      name: createForm.name.trim(),
      number: createForm.number.trim(),
      userType: createForm.userType,
      role: createForm.role,
      timeZone: createForm.timeZone.trim() || null,
    };

    if (payload.userType === 'BUSINESS') {
      payload.businessGeneral = {
        businessName: payload.name,
        phoneNumber: payload.number,
        industry: 'GENERAL',
        type: 'B2B',
      };
    }

    if (!payload.name || !payload.number || !payload.userType || !payload.role) {
      setMessage({ type: 'error', text: 'Name, number, type and role are required.' });
      return;
    }

    setIsCreateSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await createUserAccount(token, payload);
      await loadUsers();
      setShowCreateModal(false);
      setCreateForm(INITIAL_CREATE_FORM);
      setMessage({ type: 'success', text: 'User created successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create user.' });
    } finally {
      setIsCreateSaving(false);
    }
  };

  const handleVerify = async (user) => {
    if (!canUserUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update users.' });
      return;
    }
    if (!user?.id) return;
    setIsSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateUser(token, user.id, { verify: 1 });
      await loadUsers();
      setMessage({ type: 'success', text: 'User verified successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to verify user.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!canUserDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete users.' });
      return;
    }
    if (!user?.id) return;
    const ok = window.confirm(`Delete ${getUserName(user)}? This will remove the user from the list.`);
    if (!ok) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteUser(token, user.id);
      await loadUsers();
      setMessage({ type: 'success', text: 'User deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete user.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!canUserDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete users.' });
      return;
    }
    if (!selectedCount) return;
    const ok = window.confirm(`Delete ${selectedCount} users? This will remove them from the list.`);
    if (!ok) return;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await deleteUsersBulk(token, Array.from(selectedIds));
      await loadUsers();
      setMessage({ type: 'success', text: 'Users deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete users.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDetails = async (user) => {
    if (!canUserRead) {
      setMessage({ type: 'error', text: 'You do not have permission to view users.' });
      return;
    }
    if (!user?.id) return;
    setActiveViewTab('overview');
    setViewDetails({ user });
    setIsViewLoading(true);
    setMessage({ type: 'info', text: '' });
    setLinkedProducts([]);
    setBusinessScore(null);
    setBusinessScoreHistory([]);
    setBusinessScoreError('');
    try {
      const response = await fetchUserDetails(token, user.id);
      setViewDetails(response?.data || { user });
      if (isBusinessUser(user)) {
        await loadLinkedProducts(user.id);
      }
      await loadBusinessScore(user.id);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load user details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const handleView = (user) => {
    if (!canUserRead) {
      setMessage({ type: 'error', text: 'You do not have permission to view users.' });
      return;
    }
    if (!user?.id) return;
    navigate(`/admin/users/${user.id}`);
  };

  const loadLinkedProducts = async (userId) => {
    if (!userId) return;
    setIsLinkedLoading(true);
    try {
      const response = await listProductsByUser(token, userId);
      setLinkedProducts(response?.data?.products || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load linked products.' });
    } finally {
      setIsLinkedLoading(false);
    }
  };

  const loadBusinessScore = async (userId) => {
    if (!userId) return;
    setIsBusinessScoreLoading(true);
    setBusinessScoreError('');
    try {
      const [scoreResp, historyResp] = await Promise.all([
        getUserBusinessScore(token, userId),
        getUserBusinessScoreHistory(token, userId, 25),
      ]);
      setBusinessScore(scoreResp?.data || null);
      setBusinessScoreHistory(historyResp?.data || []);
    } catch (error) {
      setBusinessScoreError(error.message || 'Failed to load business score.');
    } finally {
      setIsBusinessScoreLoading(false);
    }
  };

  const refreshViewDetails = async (userId) => {
    if (!userId) return;
    setIsViewLoading(true);
    try {
      const response = await fetchUserDetails(token, userId);
      setViewDetails(response?.data || { user: viewDetails?.user });
      await loadLinkedProducts(userId);
      await loadBusinessScore(userId);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to refresh user details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  useEffect(() => {
    if (!isDetailRoute) {
      setViewDetails(null);
      setIsViewLoading(false);
      setLinkedProducts([]);
      setBusinessScore(null);
      setBusinessScoreHistory([]);
      setBusinessScoreError('');
      setActiveViewTab('overview');
      return;
    }
    const parsedId = Number(routeUserId);
    const safeId = Number.isNaN(parsedId) ? routeUserId : parsedId;
    loadUserDetails({ id: safeId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailRoute, routeUserId]);

  const openBusinessEdit = (profile) => {
    if (!profile) return;
    setEditBusinessProfile(profile);
    setEditBusinessForm(buildBusinessFormState(profile));
  };

  const handleBusinessChange = (key, value) => {
    setEditBusinessForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBusinessSave = async (event) => {
    event.preventDefault();
    if (!canUserUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update users.' });
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
      await updateBusinessProfile(token, editBusinessProfile.userId, payload, 'VERIFIED');
      await loadUsers();
      await refreshViewDetails(editBusinessProfile.userId);
      setEditBusinessProfile(null);
      setMessage({ type: 'success', text: 'Business profile saved and verified.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update business profile.' });
    } finally {
      setIsBusinessSaving(false);
    }
  };

  const handleBusinessApprove = async () => {
    if (!canUserUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update users.' });
      return;
    }
    if (!viewBusinessProfile?.profileId) return;
    setIsBusinessSaving(true);
    setMessage({ type: 'info', text: '' });
    try {
      await updateBusinessProfileStatus(token, viewBusinessProfile.profileId, 'VERIFIED');
      await loadUsers();
      await refreshViewDetails(viewBusinessProfile.userId || viewUser?.id);
      setMessage({ type: 'success', text: 'Business profile verified successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to verify business profile.' });
    } finally {
      setIsBusinessSaving(false);
    }
  };

  const viewUser = viewDetails?.user || null;
  const viewUserProfile = viewDetails?.userProfile || null;
  const viewBusinessProfile = viewDetails?.businessProfile || null;
  const viewLogisticProfile = viewDetails?.logisticProfile || null;
  const viewInsuranceProfile = viewDetails?.insuranceProfile || null;
  const businessStatusMeta = viewBusinessProfile
    ? resolveBusinessVerification(viewBusinessProfile?.status || viewUser?.kycStatus)
    : null;
  const formatFieldLabel = (key) =>
    String(key || '')
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim();

  const accountPrimaryFields = [
    { label: 'Phone', value: viewUser?.number || viewUser?.mobile || '-' },
    { label: 'User Type', value: getUserType(viewUser) },
    { label: 'Role', value: viewUser?.roleName || '-' },
    { label: 'Time Zone', value: viewUser?.timeZone || '-' },
  ];

  const accountSecondaryFields = [
    { label: 'Subscription', value: getSubscriptionLabel(viewUser) },
    { label: 'Login Status', value: resolveLoginStatus(viewUser) ? 'Login' : 'Logout' },
    { label: 'Verification', value: resolveVerification(viewUser).label },
  ];

  const accountMetaFields = [
    { label: 'Active', value: viewUser?.active !== undefined && viewUser?.active !== null ? String(viewUser.active) : '-' },
    { label: 'Joined', value: formatDate(viewUser?.createdAt || viewUser?.created_at || viewUser?.joined_at) },
    { label: 'Last Active', value: formatDate(viewUser?.lastActive || viewUser?.last_active) },
    { label: 'Subscription Status', value: viewUser?.subscriptionStatus || '-' },
  ];

  const viewTabs = [
    { key: 'overview', label: 'General Details' },
    { key: 'score', label: 'Business Score' },
    {
      key: 'profiles',
      label: 'Profiles',
      visible: Boolean(viewUserProfile || viewBusinessProfile || viewLogisticProfile || viewInsuranceProfile),
    },
    { key: 'products', label: 'Linked Products', visible: Boolean(viewUser && isBusinessUser(viewUser)) },
  ].filter((tab) => tab.visible !== false);
  const resolvedViewTab = viewTabs.some((tab) => tab.key === activeViewTab)
    ? activeViewTab
    : viewTabs[0]?.key || 'overview';

  return (
    <div className="users-page">
      <div className="users-head">
        <div>
          <h2 className="panel-title">{isDetailRoute ? 'User Details' : 'Users'}</h2>
          <p className="panel-subtitle">
            {isDetailRoute ? (viewUser ? getUserName(viewUser) : 'Loading user details...') : `Manage all ${users.length} registered users.`}
          </p>
        </div>
        <div className="users-head-actions">
          {isDetailRoute ? (
            <>
              <button type="button" className="ghost-btn" onClick={() => navigate('/admin/users')}>
                Back to Users
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => refreshViewDetails(viewUser?.id || routeUserId)}
                disabled={isViewLoading}
              >
                {isViewLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ghost-btn" onClick={loadUsers} disabled={isLoading}>
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
              {canUserDelete ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleBulkDelete}
                  disabled={isLoading || selectedCount === 0}
                >
                  Delete Selected{selectedCount ? ` (${selectedCount})` : ''}
                </button>
              ) : null}
              {canUserCreate ? (
                <button type="button" className="primary-btn" onClick={openCreateUserModal}>
                  Add User
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Banner message={message} />

      {!isDetailRoute ? (
        <>
      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#4F46E5' }}>
          <p className="stat-label">Total users</p>
          <p className="stat-value">{users.length}</p>
          <p className="stat-sub">All registered accounts</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
          <p className="stat-label">Logged in</p>
          <p className="stat-value">{loginCount}</p>
          <p className="stat-sub">Active sessions</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Verified</p>
          <p className="stat-value">{verifiedCount}</p>
          <p className="stat-sub">KYC complete</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F97316' }}>
          <p className="stat-label">Pending</p>
          <p className="stat-value">{pendingCount}</p>
          <p className="stat-sub">Needs verification</p>
        </div>
      </div>

      <div className="users-filters">
        <span className="status-chip login">{loginCount} Login</span>
        <span className="status-chip logout">{logoutCount} Logout</span>
        <span className="status-chip pending">{pendingCount} Pending</span>
      </div>

      <div className="panel card users-table-card">
        <div className="users-search">
          <span className="icon icon-search" />
          <input
            type="search"
            placeholder="Search users by name or email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="ghost-btn small" onClick={() => setQuery('')}>
              Clear
            </button>
          ) : null}
        </div>

        {filteredUsers.length === 0 ? (
          <p className="empty-state">No users found.</p>
        ) : (
          <div className="table-shell">
            <table className="admin-table users-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="select-checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={!canUserDelete}
                      aria-label="Select all users"
                    />
                  </th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Subscription</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="table-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const isLoggedIn = resolveLoginStatus(user);
                  const statusLabel = isLoggedIn ? 'Login' : 'Logout';
                  const statusClass = isLoggedIn ? 'login' : 'logout';
                  const userType = getUserType(user);
                  const verificationMeta = resolveVerification(user);
                  const verificationStatus = verificationMeta.label;
                  const verificationClass = verificationMeta.className;
                  return (
                    <tr key={user?.id || user?.user_id || index}>
                      <td>
                        <input
                          type="checkbox"
                          className="select-checkbox"
                          checked={user?.id ? selectedIds.has(user.id) : false}
                          onChange={() => toggleSelect(user?.id)}
                          disabled={!canUserDelete}
                          aria-label={`Select ${getUserName(user)}`}
                        />
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className={`user-avatar ${statusClass}`}>
                            <span>{getInitials(user)}</span>
                            <span className={`user-presence ${statusClass}`} />
                          </div>
                          <div>
                            <p className="user-name">{getUserName(user)}</p>
                            <p className="user-email">{getUserEmail(user)}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`type-pill ${normalize(userType)}`}>{userType}</span>
                      </td>
                      <td>
                        <span className="subscription-pill">{getSubscriptionLabel(user)}</span>
                      </td>
                      <td>
                        <span className={`verify-pill ${verificationClass}`}>{verificationStatus}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td>{formatDate(user?.created_at || user?.createdAt || user?.joined_at)}</td>
                      <td className="table-actions">
                        <div className="table-action-group">
                          {canUserRead ? (
                            <button type="button" className="ghost-btn small" onClick={() => handleView(user)}>
                              View
                            </button>
                          ) : null}
                          {canUserUpdate ? (
                            <button type="button" className="ghost-btn small" onClick={() => openEdit(user)}>
                              Edit
                            </button>
                          ) : null}
                          {canUserUpdate && verificationStatus !== 'Verified' && !isBusinessUser(user) ? (
                            <button
                              type="button"
                              className="ghost-btn small"
                              onClick={() => handleVerify(user)}
                              disabled={isSaving}
                            >
                              Verify
                            </button>
                          ) : null}
                          {canUserDelete ? (
                            <button type="button" className="ghost-btn small" onClick={() => handleDelete(user)}>
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : null}

      {isDetailRoute ? (
        <div className="panel card users-detail-page">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">User Details</h3>
                <p className="panel-subtitle">{viewUser ? getUserName(viewUser) : 'Loading...'}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => navigate('/admin/users')}>
                Back
              </button>
            </div>

            {isViewLoading ? <p className="empty-state">Loading user details...</p> : null}

            {viewUser ? (
              <>
                <div className="user-view-shell">
                  <div className="user-view-tabs">
                    {viewTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`user-view-tab ${resolvedViewTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveViewTab(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="user-view-panel">
                    {resolvedViewTab === 'overview' ? (
                      <div className="detail-section user-view-section">
                        <h4 className="detail-section-title">Account</h4>
                        <div className="user-view-grid user-view-grid-4">
                          {accountPrimaryFields.map((field) => (
                            <div key={`primary-${field.label}`} className="user-view-card">
                              <p className="user-view-label">{field.label}</p>
                              <p className="user-view-value">{field.value || '-'}</p>
                            </div>
                          ))}
                        </div>
                        <div className="user-view-grid user-view-grid-3">
                          {accountSecondaryFields.map((field) => (
                            <div key={`secondary-${field.label}`} className="user-view-card">
                              <p className="user-view-label">{field.label}</p>
                              <p className="user-view-value">{field.value || '-'}</p>
                            </div>
                          ))}
                        </div>
                        <div className="user-view-grid user-view-grid-4">
                          {accountMetaFields.map((field) => (
                            <div key={`meta-${field.label}`} className="user-view-card">
                              <p className="user-view-label">{field.label}</p>
                              <p className="user-view-value">{field.value || '-'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {resolvedViewTab === 'score' ? (
                      <div className="detail-section">
                  <div className="panel-split">
                    <div>
                      <h4 className="detail-section-title">Business Score</h4>
                      <p className="panel-subtitle">Latest score and activity history.</p>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn small"
                      onClick={() => loadBusinessScore(viewUser?.id)}
                      disabled={isBusinessScoreLoading}
                    >
                      {isBusinessScoreLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                  {isBusinessScoreLoading ? <p className="empty-state">Loading business score...</p> : null}
                  {businessScoreError ? <p className="empty-state">{businessScoreError}</p> : null}
                  {businessScore ? (
                    <div className="user-detail-grid">
                      <div className="user-detail-card">
                        <p className="user-detail-label">Score</p>
                        <p className="user-detail-value">{businessScore?.score ?? '-'}</p>
                      </div>
                      <div className="user-detail-card">
                        <p className="user-detail-label">Band</p>
                        <p className="user-detail-value">{businessScore?.band || '-'}</p>
                      </div>
                      <div className="user-detail-card">
                        <p className="user-detail-label">Range</p>
                        <p className="user-detail-value">
                          {businessScore?.min_score ?? '-'} - {businessScore?.max_score ?? '-'}
                        </p>
                      </div>
                      <div className="user-detail-card">
                        <p className="user-detail-label">Updated</p>
                        <p className="user-detail-value">{formatDate(businessScore?.updated_on)}</p>
                      </div>
                    </div>
                  ) : null}
                  {businessScoreHistory.length === 0 && !isBusinessScoreLoading && !businessScoreError ? (
                    <p className="empty-state">No business score history yet.</p>
                  ) : null}
                  {businessScoreHistory.length > 0 ? (
                    <div className="table-shell">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Event</th>
                            <th>Delta</th>
                            <th>Score after</th>
                            <th>Reason</th>
                            <th>Order</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {businessScoreHistory.map((entry) => {
                            const delta = entry?.delta ?? 0;
                            const deltaClass = delta >= 0 ? 'approved' : 'rejected';
                            return (
                              <tr key={entry?.id || `${entry?.event_type}-${entry?.created_on}`}>
                                <td>{formatEventLabel(entry?.event_type) || '-'}</td>
                                <td>
                                  <span className={`status-pill ${deltaClass}`}>{formatDelta(delta)}</span>
                                </td>
                                <td>{entry?.score_after ?? '-'}</td>
                                <td>{entry?.reason || '-'}</td>
                                <td>{entry?.order_id ?? '-'}</td>
                                <td>{formatDate(entry?.created_on)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
                    ) : null}

                {resolvedViewTab === 'profiles' && viewUserProfile ? (
                  <div className="detail-section">
                    <h4 className="detail-section-title">User Profile</h4>
                    <div className="user-detail-grid">
                      {Object.entries(viewUserProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        return (
                          <div key={`user-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{formatFieldLabel(key)}</p>
                            <p className="user-detail-value">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {resolvedViewTab === 'profiles' && viewBusinessProfile ? (
                  <div className="detail-section">
                    <div className="panel-split detail-section-head">
                      <div className="detail-heading-wrap">
                        <h4 className="detail-section-title">Business Profile</h4>
                        {businessStatusMeta ? (
                          <span className={`verify-pill profile-status-pill ${businessStatusMeta.className}`}>
                            <span className="profile-status-dot" />
                            <span>{businessStatusMeta.label}</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="inline-row detail-section-actions">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => openBusinessEdit(viewBusinessProfile)}
                        >
                          Edit KYC
                        </button>
                        <button
                          type="button"
                          className="primary-btn compact"
                          onClick={handleBusinessApprove}
                          disabled={isBusinessSaving || businessStatusMeta?.isVerified}
                        >
                          {businessStatusMeta?.isVerified ? 'Verified' : isBusinessSaving ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                    <div className="user-detail-grid">
                      {Object.entries(viewBusinessProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        return (
                          <div key={`biz-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{formatFieldLabel(key)}</p>
                            <p className="user-detail-value">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {resolvedViewTab === 'products' && viewUser && isBusinessUser(viewUser) ? (
                  <div className="detail-section">
                    <div className="panel-split">
                      <div>
                        <h4 className="detail-section-title">Linked Products</h4>
                        <p className="panel-subtitle">Products created by this business.</p>
                      </div>
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() => loadLinkedProducts(viewUser.id)}
                        disabled={isLinkedLoading}
                      >
                        {isLinkedLoading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                    {isLinkedLoading ? (
                      <p className="empty-state">Loading products...</p>
                    ) : linkedProducts.length === 0 ? (
                      <p className="empty-state">No products linked yet.</p>
                    ) : (
                      <div className="table-shell">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Category</th>
                              <th>Price</th>
                              <th>Status</th>
                              <th>Updated</th>
                              <th className="table-actions">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedProducts.map((product) => {
                              const statusValue = product?.approvalStatus || '';
                              const statusClass = `status-pill ${
                                statusValue ? statusValue.toLowerCase().replace(/_/g, '-') : 'pending'
                              }`;
                              return (
                                <tr key={product?.id || product?.productId}>
                                  <td>{product?.productName || '-'}</td>
                                  <td>
                                    {product?.category?.subCategoryName ||
                                      product?.category?.categoryName ||
                                      product?.category?.mainCategoryName ||
                                      '-'}
                                  </td>
                                  <td>{product?.sellingPrice ?? '-'}</td>
                                  <td>
                                    <span className={statusClass}>{formatProductStatus(statusValue)}</span>
                                  </td>
                                  <td>{formatDate(product?.updatedOn || product?.updated_on || product?.createdOn)}</td>
                                  <td className="table-actions">
                                    <div className="table-action-group">
                                      <button
                                        type="button"
                                        className="ghost-btn small"
                                        onClick={() => navigate(`/admin/products/${product?.id || product?.productId}`)}
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost-btn small"
                                        onClick={() =>
                                          navigate(`/admin/products/${product?.id || product?.productId}/edit`)
                                        }
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}

                {resolvedViewTab === 'profiles' && viewLogisticProfile ? (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Logistic Profile</h4>
                    <div className="user-detail-grid">
                      {Object.entries(viewLogisticProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        return (
                          <div key={`log-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{formatFieldLabel(key)}</p>
                            <p className="user-detail-value">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {resolvedViewTab === 'profiles' && viewInsuranceProfile ? (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Insurance Profile</h4>
                    <div className="user-detail-grid">
                      {Object.entries(viewInsuranceProfile).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        const display =
                          typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
                        return (
                          <div key={`ins-${key}`} className="user-detail-card">
                            <p className="user-detail-label">{formatFieldLabel(key)}</p>
                            <p className="user-detail-value">{display}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                  </div>
                </div>
              </>
            ) : null}
        </div>
      ) : null}

      {!isDetailRoute && showCreateModal ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">Add User</h3>
                <p className="panel-subtitle">Create a customer/business/logistic/insurance account.</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setShowCreateModal(false)}>
                Close
              </button>
            </div>

            <form className="field-grid" onSubmit={handleCreateUser}>
              <label className="field field-span">
                <span>Name</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) => handleCreateChange('name', event.target.value)}
                  required
                />
              </label>
              <label className="field field-span">
                <span>Phone</span>
                <input
                  type="text"
                  value={createForm.number}
                  onChange={(event) => handleCreateChange('number', event.target.value)}
                  placeholder="10-digit mobile"
                  required
                />
              </label>
              <label className="field">
                <span>User Type</span>
                <select value={createForm.userType} onChange={(event) => handleCreateChange('userType', event.target.value)}>
                  {USER_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Role</span>
                <select
                  value={createForm.role}
                  onChange={(event) => handleCreateChange('role', event.target.value)}
                  disabled={isCreateRoleLoading}
                  required
                >
                  <option value="">{isCreateRoleLoading ? 'Loading roles...' : 'Select role'}</option>
                  {createRoles.map((role) => {
                    const roleId = role?.id || role?.roles_id || role?.roleId;
                    const roleName = role?.name || role?.role_name || role?.roleName;
                    return (
                      <option key={roleId || roleName} value={roleId ? String(roleId) : roleName}>
                        {roleName}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="field field-span">
                <span>Time Zone</span>
                <input
                  type="text"
                  value={createForm.timeZone}
                  onChange={(event) => handleCreateChange('timeZone', event.target.value)}
                  placeholder="Asia/Kolkata"
                />
              </label>
              <div className="field field-span form-actions">
                <button type="button" className="ghost-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isCreateSaving || isCreateRoleLoading}>
                  {isCreateSaving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {!isDetailRoute && editUser ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">Edit User</h3>
                <p className="panel-subtitle">{getUserName(editUser)}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setEditUser(null)}>
                Close
              </button>
            </div>

            <form className="field-grid" onSubmit={handleUpdate}>
              <label className="field field-span">
                <span>Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) => handleEditChange('name', event.target.value)}
                  required
                />
              </label>
              <label className="field field-span">
                <span>Phone</span>
                <input
                  type="text"
                  value={editForm.number}
                  onChange={(event) => handleEditChange('number', event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Verified</span>
                <select value={editForm.verify} onChange={(event) => handleEditChange('verify', event.target.value)}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </label>
              <label className="field">
                <span>Active</span>
                <select value={editForm.active} onChange={(event) => handleEditChange('active', event.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Logout</span>
                <select value={editForm.logout} onChange={(event) => handleEditChange('logout', event.target.value)}>
                  <option value="0">Login</option>
                  <option value="1">Logout</option>
                </select>
              </label>
              <label className="field">
                <span>Time Zone</span>
                <input
                  type="text"
                  value={editForm.timeZone}
                  onChange={(event) => handleEditChange('timeZone', event.target.value)}
                  placeholder="Asia/Kolkata"
                />
              </label>
              <div className="field field-span form-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editBusinessProfile ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">Edit Business Profile</h3>
                <p className="panel-subtitle">{viewUser ? getUserName(viewUser) : 'Business user'}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={() => setEditBusinessProfile(null)}>
                Close
              </button>
            </div>

            <form className="field-grid" onSubmit={handleBusinessSave}>
              {BUSINESS_PROFILE_FIELDS.map((field) => {
                const value = editBusinessForm?.[field.key] ?? '';
                const isTextArea = field.type === 'textarea';
                const isNumber = field.type === 'number';
                return (
                  <label key={`biz-edit-${field.key}`} className={`field ${field.span ? 'field-span' : ''}`}>
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

export default AdminUsersPage;
