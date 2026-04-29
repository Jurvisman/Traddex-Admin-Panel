import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listServices,
  getService,
  updateService,
  deleteService,
  listMainCategories,
  listCategories,
  listSubCategories,
} from '../services/adminApi';

const ADMIN_API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

const resolveMediaUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${ADMIN_API_BASE}${trimmed}`;
  return `${ADMIN_API_BASE}/${trimmed.replace(/^\.?\//, '')}`;
};

const ACTION_ICONS = {
  view: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c5.2 0 9.3 3.6 10.6 6.7a1 1 0 0 1 0 .6C21.3 15.4 17.2 19 12 19S2.7 15.4 1.4 12.3a1 1 0 0 1 0-.6C2.7 8.6 6.8 5 12 5Zm0 2c-4 0-7.2 2.7-8.4 5 1.2 2.3 4.4 5 8.4 5s7.2-2.7 8.4-5c-1.2-2.3-4.4-5-8.4-5Zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill="currentColor" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 16.7V19h2.3l9.9-9.9-2.3-2.3-9.9 9.9Zm13.7-8.4a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.3 1.3 2.3 2.3 1.3-1.3Z" fill="currentColor" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Z" fill="currentColor" />
    </svg>
  ),
  approve: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 6.3-6.3 1.4 1.4-7.7 7.7Z" fill="currentColor" />
    </svg>
  ),
  reject: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7.4 6 10.6 10.6-1.4 1.4L6 7.4 7.4 6Zm9.2 0 1.4 1.4L8.4 18.9 7 17.5 16.6 6Z" fill="currentColor" />
    </svg>
  ),
  requestChanges: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 1-6.4 2.6L4.2 7 3 5.8l2.4-2.4L7.8 5l-1.2 1.2A7 7 0 1 0 12 5c-1.6 0-3 .5-4.2 1.4L6.6 8A9 9 0 0 1 12 3Zm-.8 5h1.6v5h-1.6V8Zm0 6.5h1.6V16h-1.6v-1.5Z" fill="currentColor" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm9 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm9 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" fill="currentColor" />
    </svg>
  ),
};

const SERVICE_TABLE_COLUMN_OPTIONS = [
  { key: 'image', label: 'Image', minWidth: 88 },
  { key: 'code', label: 'Code', minWidth: 140 },
  { key: 'name', label: 'Name', minWidth: 220 },
  { key: 'business', label: 'Business', minWidth: 200 },
  { key: 'mainCategory', label: 'Main Category', minWidth: 170 },
  { key: 'category', label: 'Category', minWidth: 170 },
  { key: 'subCategory', label: 'Sub-Category', minWidth: 170 },
  { key: 'serviceUom', label: 'UOM', minWidth: 110 },
  { key: 'basePrice', label: 'Base Price', minWidth: 130 },
  { key: 'priceUnit', label: 'Price Unit', minWidth: 130 },
  { key: 'taxRate', label: 'GST %', minWidth: 90 },
  { key: 'duration', label: 'Duration', minWidth: 130 },
  { key: 'coverageArea', label: 'Coverage', minWidth: 150 },
  { key: 'targetAudience', label: 'Audience', minWidth: 150 },
  { key: 'status', label: 'Status', minWidth: 160 },
  { key: 'createdOn', label: 'Created On', minWidth: 155 },
  { key: 'updatedOn', label: 'Updated On', minWidth: 155 },
];

const INITIAL_SERVICE_COLUMN_VISIBILITY = {
  image: true,
  code: true,
  name: true,
  business: true,
  mainCategory: true,
  category: true,
  subCategory: false,
  serviceUom: true,
  basePrice: true,
  priceUnit: false,
  taxRate: false,
  duration: false,
  coverageArea: false,
  targetAudience: false,
  status: true,
  createdOn: false,
  updatedOn: true,
};

const SERVICE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CHANGES_REQUIRED', label: 'Changes Required' },
  { value: 'REJECTED', label: 'Rejected' },
];

const SERVICE_PAGE_SIZE_OPTIONS = [10, 25, 50];

const SERVICE_VIEW_TABS = [
  { key: 'overview', label: 'Service Detail' },
  { key: 'review', label: 'Review Workspace' },
  { key: 'pricing', label: 'Pricing & Tax' },
  { key: 'media', label: 'Media' },
  { key: 'description', label: 'Description' },
];

const toArray = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.data)
      ? v.data
      : Array.isArray(v?.content)
        ? v.content
        : [];

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch (e) { return '[Object]'; }
  }
  return String(value);
};

const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = parseDateValue(value);
  if (!date) return formatValue(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const formatStatus = (status) => {
  if (!status) return 'Pending';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join(' ');
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return formatValue(value);
  return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const statusClass = (status) =>
  `pvh-status-${String(status || 'DRAFT').toLowerCase().replace(/_/g, '-')}`;

const getServiceId = (svc) => svc?.serviceId || svc?.id;

function ServiceThumb({ imageUrl, alt }) {
  const [hasError, setHasError] = useState(false);
  const url = hasError ? '' : resolveMediaUrl(imageUrl);
  if (!url) {
    return (
      <div className="pvr-hero-thumb pvr-hero-thumb-empty" style={{ width: 44, height: 44 }}>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5Z" fill="#CBD5E1" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }}
    />
  );
}

function ServicePage({ token, adminUserId }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isViewing = Boolean(id);

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(INITIAL_SERVICE_COLUMN_VISIBILITY);
  const [serviceFilters, setServiceFilters] = useState({
    status: '',
    mainCategory: '',
    category: '',
    business: '',
  });

  const [openServiceActionId, setOpenServiceActionId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showViewActionMenu, setShowViewActionMenu] = useState(false);
  const [activeServiceViewTab, setActiveServiceViewTab] = useState('review');

  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [assignment, setAssignment] = useState({ mainId: '', catId: '', subId: '' });
  const [reviewRemarks, setReviewRemarks] = useState('');

  const toolbarRef = useRef(null);
  const actionMenuRef = useRef(null);
  const viewActionMenuRef = useRef(null);

  // ---------- Load list ----------
  useEffect(() => {
    if (isViewing) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await listServices(token, { status: serviceFilters.status, query, page, size: 200 });
        const list = res?.data?.services || res?.services || res?.data?.content || res?.content || toArray(res?.data) || toArray(res);
        if (!cancelled) setServices(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setMessage({ type: 'error', text: e.message || 'Failed to load services.' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token, serviceFilters.status, query, page, isViewing]);

  // ---------- Load detail ----------
  useEffect(() => {
    if (!id) {
      setSelectedService(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await getService(token, id);
        const svc = res?.data || res || {};
        if (cancelled) return;
        setSelectedService(svc);
        setReviewRemarks(svc.reviewRemarks || '');
        const cat = svc.category || {};
        setAssignment({
          mainId: cat.mainCategoryId || svc.mainCategoryId || '',
          catId: cat.categoryId || svc.categoryId || '',
          subId: cat.subCategoryId || svc.subCategoryId || '',
        });
        const mains = await listMainCategories(token);
        if (!cancelled) setMainCategories(toArray(mains));
        const mainId = cat.mainCategoryId || svc.mainCategoryId;
        const catId = cat.categoryId || svc.categoryId;
        if (mainId) {
          const cats = await listCategories(token, mainId);
          if (!cancelled) setCategories(toArray(cats));
        }
        if (catId) {
          const subs = await listSubCategories(token, catId);
          if (!cancelled) setSubCategories(toArray(subs));
        }
      } catch (e) {
        if (!cancelled) setMessage({ type: 'error', text: e.message || 'Failed to load service.' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, token]);

  // ---------- Close menus on outside click ----------
  useEffect(() => {
    const handler = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowFilterPanel(false);
        setShowColumnPicker(false);
        setShowImportExportMenu(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenServiceActionId(null);
      }
      if (viewActionMenuRef.current && !viewActionMenuRef.current.contains(e.target)) {
        setShowViewActionMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---------- Filter options ----------
  const businessFilterOptions = useMemo(() => {
    const set = new Set();
    services.forEach((s) => { if (s?.businessName) set.add(s.businessName); });
    return Array.from(set).sort();
  }, [services]);

  const mainCategoryFilterOptions = useMemo(() => {
    const set = new Set();
    services.forEach((s) => {
      const name = s?.category?.mainCategoryName || s?.mainCategoryName;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [services]);

  const categoryFilterOptions = useMemo(() => {
    const set = new Set();
    services.forEach((s) => {
      const name = s?.category?.categoryName || s?.categoryName;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [services]);

  // ---------- Filtered services ----------
  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (serviceFilters.business && (s.businessName || '') !== serviceFilters.business) return false;
      const mainName = s?.category?.mainCategoryName || s?.mainCategoryName || '';
      const catName = s?.category?.categoryName || s?.categoryName || '';
      if (serviceFilters.mainCategory && mainName !== serviceFilters.mainCategory) return false;
      if (serviceFilters.category && catName !== serviceFilters.category) return false;
      if (q) {
        const haystack = [
          s.serviceName, s.serviceCode, s.businessName, mainName, catName,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [services, query, serviceFilters]);

  const visibleColumns = useMemo(
    () => SERVICE_TABLE_COLUMN_OPTIONS.filter((c) => columnVisibility[c.key]),
    [columnVisibility]
  );

  const tableMinWidth = useMemo(
    () => visibleColumns.reduce((sum, c) => sum + (c.minWidth || 100), 56 + 80),
    [visibleColumns]
  );

  const totalElements = filteredServices.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filteredServices.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const pageStart = totalElements === 0 ? 0 : safePage * pageSize + 1;
  const pageEnd = safePage * pageSize + pageItems.length;

  const activeFilterCount = Object.values(serviceFilters).filter(Boolean).length;
  const selectedServiceCategory = selectedService?.category || {};
  const serviceStatusValue = String(selectedService?.approvalStatus || 'PENDING_REVIEW').toUpperCase();
  const serviceStatusLabel = formatStatus(serviceStatusValue);
  const serviceIsApproved = serviceStatusValue === 'APPROVED';
  const serviceIsRejected = serviceStatusValue === 'REJECTED';
  const serviceIsFinalized = serviceIsApproved || serviceIsRejected;
  const originalAssignment = useMemo(() => ({
    mainId: selectedServiceCategory.mainCategoryId || selectedService?.mainCategoryId || '',
    catId: selectedServiceCategory.categoryId || selectedService?.categoryId || '',
    subId: selectedServiceCategory.subCategoryId || selectedService?.subCategoryId || '',
  }), [selectedService, selectedServiceCategory.mainCategoryId, selectedServiceCategory.categoryId, selectedServiceCategory.subCategoryId]);
  const reviewCategoryComplete = Boolean(assignment.mainId && assignment.catId);
  const reviewCategoryDirty = Boolean(selectedService) && (
    String(assignment.mainId || '') !== String(originalAssignment.mainId || '') ||
    String(assignment.catId || '') !== String(originalAssignment.catId || '') ||
    String(assignment.subId || '') !== String(originalAssignment.subId || '')
  );
  const assignmentMainName =
    mainCategories.find((item) => String(item.id) === String(assignment.mainId))?.name ||
    selectedServiceCategory.mainCategoryName ||
    selectedService?.mainCategoryName;
  const assignmentCategoryName =
    categories.find((item) => String(item.id) === String(assignment.catId))?.name ||
    selectedServiceCategory.categoryName ||
    selectedService?.categoryName;
  const assignmentSubCategoryName =
    subCategories.find((item) => String(item.id) === String(assignment.subId))?.name ||
    selectedServiceCategory.subCategoryName ||
    selectedService?.subCategoryName;
  const serviceReviewChecklist = useMemo(() => {
    const svc = selectedService || {};
    const gallery = Array.isArray(svc.galleryImages) ? svc.galleryImages : [];
    const hasPrice = svc.basePrice !== null && svc.basePrice !== undefined && svc.basePrice !== '';
    const hasDescription = Boolean(svc.shortDescription || svc.fullDescription);
    const categoryDetail = reviewCategoryComplete
      ? [assignmentMainName, assignmentCategoryName, assignmentSubCategoryName]
          .filter(Boolean)
          .join(' / ')
      : 'Main category and category are required before approval.';

    return [
      {
        label: 'Category Assignment',
        status: reviewCategoryComplete ? 'ready' : 'missing',
        detail: categoryDetail || 'Category path selected.',
      },
      {
        label: 'Service Details',
        status: svc.serviceName && hasDescription ? 'ready' : 'missing',
        detail: svc.serviceName && hasDescription
          ? 'Name and description are available.'
          : 'Name plus short or full description should be present.',
      },
      {
        label: 'Pricing & Tax',
        status: hasPrice ? 'ready' : 'missing',
        detail: hasPrice
          ? `${formatPrice(svc.basePrice)}${svc.taxRate != null ? `, GST ${svc.taxRate}%` : ''}`
          : 'Base price is missing.',
      },
      {
        label: 'Media',
        status: resolveMediaUrl(svc.serviceImageLogo) || gallery.length ? 'ready' : 'missing',
        detail: resolveMediaUrl(svc.serviceImageLogo)
          ? 'Primary service image is available.'
          : gallery.length
            ? `${gallery.length} gallery image(s) available.`
            : 'No service image or gallery media uploaded.',
      },
      {
        label: 'Coverage & Availability',
        status: svc.coverageArea || svc.serviceAvailability ? 'ready' : 'missing',
        detail: svc.coverageArea || svc.serviceAvailability
          ? [svc.coverageArea, svc.serviceAvailability].filter(Boolean).join(' / ')
          : 'Coverage area or availability is missing.',
      },
    ];
  }, [
    selectedService,
    reviewCategoryComplete,
    assignmentMainName,
    assignmentCategoryName,
    assignmentSubCategoryName,
  ]);
  const serviceReadyCount = serviceReviewChecklist.filter((item) => item.status === 'ready').length;
  const serviceAllReady = serviceReviewChecklist.every((item) => item.status === 'ready');
  const hasServiceReviewActions = Boolean(selectedService && !serviceIsFinalized);
  const disableServiceApprove = isUpdating || !selectedService || serviceIsFinalized || !reviewCategoryComplete;
  const disableServiceReject = isUpdating || !selectedService || serviceStatusValue === 'REJECTED';
  const disableServiceRequestChanges = isUpdating || !selectedService || serviceIsFinalized;

  // ---------- Helpers ----------
  const getAdminId = () => {
    if (!adminUserId) {
      setMessage({ type: 'error', text: 'Admin user ID missing. Please log in again.' });
      return null;
    }
    return Number(adminUserId);
  };

  const toggleColumn = (key) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelect = (svcId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(svcId)) next.delete(svcId); else next.add(svcId);
      return next;
    });
  };

  const allSelected = pageItems.length > 0 && pageItems.every((s) => selectedIds.has(getServiceId(s)));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageItems.forEach((s) => next.delete(getServiceId(s)));
      } else {
        pageItems.forEach((s) => next.add(getServiceId(s)));
      }
      return next;
    });
  };

  const clearFilters = () => {
    setServiceFilters({ status: '', mainCategory: '', category: '', business: '' });
    setPage(0);
  };

  const reloadList = async () => {
    try {
      const res = await listServices(token, { status: serviceFilters.status, query, page: 0, size: 200 });
      const list = res?.data?.services || res?.services || res?.data?.content || res?.content || toArray(res?.data) || toArray(res);
      setServices(Array.isArray(list) ? list : []);
    } catch (e) { /* noop */ }
  };

  const reloadSelectedService = async (svcId = id) => {
    if (!svcId) return null;
    const res = await getService(token, svcId);
    const svc = res?.data || res || {};
    const cat = svc.category || {};
    setSelectedService(svc);
    setReviewRemarks(svc.reviewRemarks || '');
    setAssignment({
      mainId: cat.mainCategoryId || svc.mainCategoryId || '',
      catId: cat.categoryId || svc.categoryId || '',
      subId: cat.subCategoryId || svc.subCategoryId || '',
    });
    return svc;
  };

  const handleRowStatusUpdate = async (svcId, nextStatus) => {
    if (!svcId) return;
    if (nextStatus === 'CHANGES_REQUIRED') {
      setActiveServiceViewTab('review');
      navigate(`/admin/services/${svcId}`);
      setMessage({ type: 'info', text: 'Open the review workspace to request structured changes.' });
      return;
    }
    if (nextStatus === 'APPROVED') {
      const rowService = services.find((svc) => String(getServiceId(svc)) === String(svcId));
      const rowCat = rowService?.category || {};
      const hasCategory = Boolean(
        (rowCat.mainCategoryId || rowService?.mainCategoryId) &&
        (rowCat.categoryId || rowService?.categoryId)
      );
      if (!hasCategory) {
        setActiveServiceViewTab('review');
        navigate(`/admin/services/${svcId}`);
        setMessage({ type: 'error', text: 'Assign main category and category before approval.' });
        return;
      }
    }
    const adminId = getAdminId();
    if (!adminId) return;
    try {
      setIsUpdating(true);
      await updateService(token, svcId, { approvalStatus: nextStatus, userId: adminId });
      await reloadList();
      setMessage({
        type: 'success',
        text: nextStatus === 'APPROVED' ? 'Service approved successfully.' : 'Service rejected successfully.',
      });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to update service status.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (svcId) => {
    if (!svcId) return;
    if (!window.confirm('Delete this service? This cannot be undone.')) return;
    try {
      setIsUpdating(true);
      await deleteService(token, svcId);
      setMessage({ type: 'success', text: 'Service deleted successfully.' });
      if (isViewing) {
        navigate('/admin/services');
      } else {
        await reloadList();
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to delete service.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMainChange = async (mainId) => {
    setAssignment({ mainId, catId: '', subId: '' });
    setCategories([]);
    setSubCategories([]);
    if (mainId) {
      const cats = await listCategories(token, mainId);
      setCategories(toArray(cats));
    }
  };

  const handleCatChange = async (catId) => {
    setAssignment((prev) => ({ ...prev, catId, subId: '' }));
    setSubCategories([]);
    if (catId) {
      const subs = await listSubCategories(token, catId);
      setSubCategories(toArray(subs));
    }
  };

  const buildReviewCategoryPayload = () => ({
    mainCategoryId: Number(assignment.mainId),
    categoryId: Number(assignment.catId),
    subCategoryId: assignment.subId ? Number(assignment.subId) : null,
  });

  const handleSaveReviewCategory = async () => {
    if (!selectedService) return;
    if (!reviewCategoryComplete) {
      setMessage({ type: 'error', text: 'Select main category and category before saving.' });
      return;
    }
    const adminId = getAdminId();
    if (!adminId) return;
    const svcId = getServiceId(selectedService);
    try {
      setIsUpdating(true);
      await updateService(token, svcId, {
        userId: adminId,
        ...buildReviewCategoryPayload(),
      });
      await reloadSelectedService(svcId);
      setMessage({ type: 'success', text: 'Service category saved successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to save service category.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedService) return;
    if (!reviewCategoryComplete) {
      setMessage({ type: 'error', text: 'Main category and category mapping are required.' });
      return;
    }
    const adminId = getAdminId();
    if (!adminId) return;
    const svcId = getServiceId(selectedService);
    setIsUpdating(true);
    try {
      await updateService(token, svcId, {
        approvalStatus: 'APPROVED',
        userId: adminId,
        ...buildReviewCategoryPayload(),
      });
      await reloadSelectedService(svcId);
      setMessage({ type: 'success', text: 'Service approved successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to approve service.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedService) return;
    if (serviceIsFinalized) {
      setMessage({ type: 'error', text: 'This service is already finalized.' });
      return;
    }
    if (!reviewCategoryComplete) {
      setMessage({ type: 'error', text: 'Main category and category mapping are required before requesting changes.' });
      return;
    }
    const note = reviewRemarks.trim();
    if (!note) {
      setMessage({ type: 'error', text: 'Add a note explaining the requested changes.' });
      return;
    }
    const adminId = getAdminId();
    if (!adminId) return;
    const svcId = getServiceId(selectedService);
    try {
      setIsUpdating(true);
      await updateService(token, svcId, {
        approvalStatus: 'CHANGES_REQUIRED',
        userId: adminId,
        reviewRemarks: note,
        ...buildReviewCategoryPayload(),
      });
      await reloadSelectedService(svcId);
      setMessage({ type: 'success', text: 'Changes requested successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to request changes.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedService) return;
    const adminId = getAdminId();
    if (!adminId) return;
    const svcId = getServiceId(selectedService);
    const note = reviewRemarks.trim();
    try {
      setIsUpdating(true);
      await updateService(token, svcId, {
        approvalStatus: 'REJECTED',
        userId: adminId,
        reviewRemarks: note || undefined,
      });
      await reloadSelectedService(svcId);
      setMessage({ type: 'success', text: 'Service rejected successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to reject service.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // ---------- Cell renderer ----------
  const getServiceCellValue = (svc, key) => {
    const cat = svc?.category || {};
    const mainName = cat.mainCategoryName || svc?.mainCategoryName;
    const catName = cat.categoryName || svc?.categoryName;
    const subName = cat.subCategoryName || svc?.subCategoryName;
    switch (key) {
      case 'image':
        return (
          <div className="product-image-cell">
            <ServiceThumb imageUrl={svc?.serviceImageLogo || svc?.thumbnailImage} alt={svc?.serviceName} />
          </div>
        );
      case 'code':
        return <span className="product-table-code">{svc?.serviceCode || `SRV-${getServiceId(svc) || ''}`}</span>;
      case 'name':
        return <p className="user-name">{svc?.serviceName || '—'}</p>;
      case 'business':
        return <span className="product-table-primary">{svc?.businessName || '—'}</span>;
      case 'mainCategory':
        return <span className="product-table-primary">{formatValue(mainName)}</span>;
      case 'category':
        return <span className="product-table-primary">{formatValue(catName)}</span>;
      case 'subCategory':
        return <span className="product-table-secondary">{formatValue(subName)}</span>;
      case 'serviceUom':
        return <span className="product-table-primary">{formatValue(svc?.serviceUom)}</span>;
      case 'basePrice':
        return <span className="product-price-main">{formatPrice(svc?.basePrice)}</span>;
      case 'priceUnit':
        return <span className="product-table-primary">{formatValue(svc?.priceUnit)}</span>;
      case 'taxRate':
        return <span className="product-table-primary">{svc?.taxRate != null ? `${svc.taxRate}%` : '—'}</span>;
      case 'duration':
        return <span className="product-table-primary">{formatValue(svc?.serviceDuration)}</span>;
      case 'coverageArea':
        return <span className="product-table-primary">{formatValue(svc?.coverageArea)}</span>;
      case 'targetAudience':
        return <span className="product-table-primary">{formatValue(svc?.targetAudience)}</span>;
      case 'status': {
        const sv = svc?.approvalStatus || '';
        return (
          <span className={`status-pill product-status-pill ${sv ? sv.toLowerCase().replace(/_/g, '-') : 'pending'}`}>
            {formatStatus(sv)}
          </span>
        );
      }
      case 'createdOn':
        return <span className="product-table-primary">{formatDateTime(svc?.createdOn)}</span>;
      case 'updatedOn':
        return <span className="product-table-primary">{formatDateTime(svc?.updatedOn || svc?.createdOn)}</span>;
      default:
        return <span className="product-table-primary">{formatValue(svc?.[key])}</span>;
    }
  };

  // ---------- View body ----------
  const renderReviewWorkspace = () => (
    <div className="rws-wrap">
      <div className={`rws-decision-banner${serviceIsApproved ? ' approved' : serviceIsRejected ? ' rejected' : ''}`}>
        <div className="rws-decision-left">
          <div className={`rws-decision-icon${serviceIsApproved ? ' approved' : serviceIsRejected ? ' rejected' : ''}`}>
            {serviceIsApproved ? 'OK' : serviceIsRejected ? 'X' : '?'}
          </div>
          <div>
            <p className="rws-decision-status">
              {serviceIsApproved ? 'Service Approved' : serviceIsRejected ? 'Service Rejected' : `Status: ${serviceStatusLabel}`}
            </p>
            <p className="rws-decision-hint">
              {serviceIsFinalized
                ? `This service has been ${serviceStatusLabel.toLowerCase()}. No further review action is needed.`
                : !reviewCategoryComplete
                  ? 'Assign main category and category before approving this service.'
                  : !serviceAllReady
                    ? `${serviceReadyCount} of ${serviceReviewChecklist.length} checklist items are ready. Request changes if business data needs correction.`
                    : 'All checklist items are ready. You can approve or take another review action.'}
            </p>
          </div>
        </div>
        {hasServiceReviewActions ? (
          <div className="rws-decision-actions">
            <button
              type="button"
              className="rws-btn-approve"
              onClick={handleApprove}
              disabled={disableServiceApprove}
            >
              {isUpdating ? 'Approving...' : 'Approve'}
            </button>
            <button
              type="button"
              className="rws-btn-changes"
              onClick={handleRequestChanges}
              disabled={disableServiceRequestChanges}
            >
              Request Changes
            </button>
            <button
              type="button"
              className="rws-btn-reject"
              onClick={handleReject}
              disabled={disableServiceReject}
            >
              Reject
            </button>
          </div>
        ) : null}
      </div>

      <div className="rws-card">
        <div className="rws-card-head">
          <p className="rws-card-title">Review Checklist</p>
          <span className={`rws-badge${serviceAllReady ? ' green' : ' amber'}`}>
            {serviceReadyCount}/{serviceReviewChecklist.length} Ready
          </span>
        </div>
        <div className="rws-checklist">
          {serviceReviewChecklist.map((item) => {
            const ok = item.status === 'ready';
            return (
              <div key={item.label} className={`rws-checklist-row${ok ? ' ok' : ' warn'}`}>
                <div className={`rws-check-icon${ok ? ' ok' : ' warn'}`}>{ok ? 'OK' : '!'}</div>
                <div className="rws-check-body">
                  <p className="rws-check-label">{item.label}</p>
                  <p className="rws-check-detail">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rws-card">
        <div className="rws-card-head">
          <p className="rws-card-title">Category Assignment</p>
          {reviewCategoryDirty ? <span className="rws-badge amber">Unsaved changes</span> : null}
        </div>
        <p className="rws-card-desc">Confirm or correct the catalog path before finalising the service review.</p>
        <div className="rws-fields-row">
          <label className="rws-field">
            <span>Main category</span>
            <select
              value={assignment.mainId}
              onChange={(e) => handleMainChange(e.target.value)}
              disabled={serviceIsFinalized || isUpdating}
            >
              <option value="">Select main category</option>
              {mainCategories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="rws-field">
            <span>Category</span>
            <select
              value={assignment.catId}
              onChange={(e) => handleCatChange(e.target.value)}
              disabled={serviceIsFinalized || isUpdating || !assignment.mainId}
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="rws-field">
            <span>Sub-category</span>
            <select
              value={assignment.subId}
              onChange={(e) => setAssignment((prev) => ({ ...prev, subId: e.target.value }))}
              disabled={serviceIsFinalized || isUpdating || !assignment.catId}
            >
              <option value="">{assignment.catId ? 'All sub-categories' : 'Select category first'}</option>
              {subCategories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="rws-save-btn"
          onClick={handleSaveReviewCategory}
          disabled={isUpdating || serviceIsFinalized || !reviewCategoryDirty || !reviewCategoryComplete}
        >
          {isUpdating ? 'Saving...' : 'Save Category'}
        </button>
      </div>

      <div className="rws-card">
        <div className="rws-card-head">
          <p className="rws-card-title">Review Note to Business</p>
          {selectedService?.reviewRemarks ? <span className="rws-badge amber">Last sent</span> : null}
        </div>
        <p className="rws-card-desc">Use this note when sending the service back for business-side changes.</p>
        <label className="rws-field">
          <span>Admin note</span>
          <textarea
            rows={4}
            value={reviewRemarks}
            onChange={(e) => setReviewRemarks(e.target.value)}
            placeholder="Explain what needs to be changed before approval."
            disabled={serviceIsFinalized || isUpdating}
          />
        </label>
        <div className={`rws-note-box${selectedService?.reviewRemarks ? '' : ' empty'}`} style={{ marginTop: 12 }}>
          {selectedService?.reviewRemarks
            ? <pre className="rws-note-pre">{selectedService.reviewRemarks}</pre>
            : <p className="rws-note-empty">No review note has been sent yet.</p>}
        </div>
      </div>
    </div>
  );

  const renderViewBody = () => {
    if (!selectedService) return null;
    const cat = selectedService.category || {};
    switch (activeServiceViewTab) {
      case 'review':
        return renderReviewWorkspace();
      case 'pricing':
        return (
          <div className="field-grid">
            <div className="field"><span>Base Price</span><strong>{formatPrice(selectedService.basePrice)}</strong></div>
            <div className="field"><span>Price Unit</span><strong>{formatValue(selectedService.priceUnit)}</strong></div>
            <div className="field"><span>UOM</span><strong>{formatValue(selectedService.serviceUom)}</strong></div>
            <div className="field"><span>Discount</span><strong>{selectedService.discount != null ? `${selectedService.discount}%` : '—'}</strong></div>
            <div className="field"><span>Additional Charges</span><strong>{formatPrice(selectedService.additionalCharges)}</strong></div>
            <div className="field"><span>Tax Rate</span><strong>{selectedService.taxRate != null ? `${selectedService.taxRate}%` : '—'}</strong></div>
            <div className="field"><span>Tax Inclusive</span><strong>{formatValue(selectedService.taxInclusive)}</strong></div>
          </div>
        );
      case 'media': {
        const gallery = Array.isArray(selectedService.galleryImages) ? selectedService.galleryImages : [];
        const logo = resolveMediaUrl(selectedService.serviceImageLogo);
        return (
          <div>
            {logo ? (
              <div style={{ marginBottom: 16 }}>
                <p className="field-label" style={{ marginBottom: 6 }}>Service Logo</p>
                <img src={logo} alt="Service logo" style={{ maxWidth: 220, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </div>
            ) : null}
            <p className="field-label" style={{ marginBottom: 6 }}>Gallery ({gallery.length})</p>
            {gallery.length === 0 ? (
              <p className="empty-state">No gallery images.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {gallery.map((img, idx) => (
                  <img key={idx} src={resolveMediaUrl(img)} alt={`Gallery ${idx + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                ))}
              </div>
            )}
            {selectedService.demoVideoPresentation ? (
              <p style={{ marginTop: 16 }}>
                <span className="field-label">Demo / Presentation:</span>{' '}
                <a href={resolveMediaUrl(selectedService.demoVideoPresentation)} target="_blank" rel="noreferrer">Open</a>
              </p>
            ) : null}
            {selectedService.certificatesBrochures ? (
              <p style={{ marginTop: 8 }}>
                <span className="field-label">Certificates / Brochures:</span>{' '}
                <a href={resolveMediaUrl(selectedService.certificatesBrochures)} target="_blank" rel="noreferrer">Open</a>
              </p>
            ) : null}
          </div>
        );
      }
      case 'description':
        return (
          <div className="field-grid">
            <div className="field field-span"><span>Short Description</span><p>{selectedService.shortDescription || '—'}</p></div>
            <div className="field field-span"><span>Full Description</span><p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.fullDescription || '—'}</p></div>
            <div className="field field-span"><span>Key Features</span><p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.keyFeatures || '—'}</p></div>
            <div className="field field-span"><span>Tools Used</span><p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.toolsUsed || '—'}</p></div>
            <div className="field field-span"><span>Why Choose</span><p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.whyChoose || '—'}</p></div>
          </div>
        );
      case 'overview':
      default:
        return (
          <div className="field-grid">
            <div className="field"><span>Service Code</span><strong>{selectedService.serviceCode || '—'}</strong></div>
            <div className="field"><span>Business</span><strong>{selectedService.businessName || '—'}</strong></div>
            <div className="field"><span>Main Category</span><strong>{cat.mainCategoryName || '—'}</strong></div>
            <div className="field"><span>Category</span><strong>{cat.categoryName || '—'}</strong></div>
            <div className="field"><span>Sub-Category</span><strong>{cat.subCategoryName || '—'}</strong></div>
            <div className="field"><span>Target Audience</span><strong>{formatValue(selectedService.targetAudience)}</strong></div>
            <div className="field"><span>Service Duration</span><strong>{formatValue(selectedService.serviceDuration)}</strong></div>
            <div className="field"><span>Availability</span><strong>{formatValue(selectedService.serviceAvailability)}</strong></div>
            <div className="field"><span>Coverage Area</span><strong>{formatValue(selectedService.coverageArea)}</strong></div>
            <div className="field"><span>Created On</span><strong>{formatDateTime(selectedService.createdOn)}</strong></div>
            <div className="field"><span>Updated On</span><strong>{formatDateTime(selectedService.updatedOn || selectedService.createdOn)}</strong></div>
            <div className="field"><span>Status</span>
              <span className={`status-pill pvh-status-badge ${statusClass(selectedService.approvalStatus)}`}>
                {formatStatus(selectedService.approvalStatus)}
              </span>
            </div>
            <div className="field field-span"><span>Admin Review Note</span><p style={{ whiteSpace: 'pre-wrap' }}>{selectedService.reviewRemarks || 'â€”'}</p></div>
          </div>
        );
    }
  };

  return (
    <div className="users-page product-page">
      {message ? (
        <div className={`form-message ${message.type}`} style={{ marginBottom: 12 }}>
          <span>{message.text}</span>
          <button type="button" className="ghost-btn small" onClick={() => setMessage(null)}>Dismiss</button>
        </div>
      ) : null}

      {!isViewing ? (
        <div className="panel card users-table-card">
          <div className="product-table-toolbar-shell" ref={toolbarRef}>
            <div className="gsc-datatable-toolbar">
              <div className="gsc-datatable-toolbar-left">
                <div className="bdt-toolbar-wrap">
                  <button
                    type="button"
                    className={`gsc-toolbar-btn ${showFilterPanel ? 'active filter-active' : ''}`}
                    title="Filter"
                    onClick={() => {
                      setShowFilterPanel((prev) => !prev);
                      setShowColumnPicker(false);
                      setShowImportExportMenu(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h6" /></svg>
                    Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
                  </button>
                </div>

                <div className="bdt-toolbar-wrap">
                  <button
                    type="button"
                    className={`gsc-toolbar-btn ${showColumnPicker ? 'active' : ''}`}
                    title="Columns"
                    onClick={() => {
                      setShowColumnPicker((prev) => !prev);
                      setShowFilterPanel(false);
                      setShowImportExportMenu(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="18" rx="1" />
                      <rect x="14" y="3" width="7" height="18" rx="1" />
                    </svg>
                    Columns
                  </button>
                  {showColumnPicker ? (
                    <div className="bdt-dropdown-panel bdt-column-picker">
                      <p className="bdt-dropdown-label">Visible Columns</p>
                      {SERVICE_TABLE_COLUMN_OPTIONS.map((column) => (
                        <label key={column.key} className="bdt-column-toggle">
                          <input type="checkbox" checked={!!columnVisibility[column.key]} onChange={() => toggleColumn(column.key)} />
                          {column.label}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="bdt-toolbar-wrap">
                  <button
                    type="button"
                    className={`gsc-toolbar-btn ${showImportExportMenu ? 'active' : ''}`}
                    title="Import/Export"
                    onClick={() => {
                      setShowImportExportMenu((prev) => !prev);
                      setShowFilterPanel(false);
                      setShowColumnPicker(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    Import/Export
                  </button>
                  {showImportExportMenu ? (
                    <div className="bdt-dropdown-panel product-toolbar-panel">
                      <p className="bdt-dropdown-label">Export</p>
                      <button type="button" className="bdt-dropdown-option" disabled>
                        Export Filtered Rows
                      </button>
                      <button type="button" className="bdt-dropdown-option" disabled>
                        Export Selected Rows
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="gsc-datatable-toolbar-right">
                <div className="gsc-toolbar-search">
                  <input
                    type="search"
                    placeholder="Search"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                    aria-label="Search services"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <button
                  type="button"
                  className="gsc-create-btn"
                  title="Create service"
                  aria-label="Create service"
                  onClick={() => navigate('/admin/services/create')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>

            {showFilterPanel ? (
              <div className="product-filter-strip">
                <div className="product-filter-grid">
                  <label className="product-filter-field">
                    <span>Main Category</span>
                    <select
                      value={serviceFilters.mainCategory}
                      onChange={(e) => { setServiceFilters((p) => ({ ...p, mainCategory: e.target.value })); setPage(0); }}
                    >
                      <option value="">Select Main Category</option>
                      {mainCategoryFilterOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>

                  <label className="product-filter-field">
                    <span>Category</span>
                    <select
                      value={serviceFilters.category}
                      onChange={(e) => { setServiceFilters((p) => ({ ...p, category: e.target.value })); setPage(0); }}
                    >
                      <option value="">Select Category</option>
                      {categoryFilterOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>

                  <label className="product-filter-field">
                    <span>Business</span>
                    <select
                      value={serviceFilters.business}
                      onChange={(e) => { setServiceFilters((p) => ({ ...p, business: e.target.value })); setPage(0); }}
                    >
                      <option value="">Select Business</option>
                      {businessFilterOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>

                  <label className="product-filter-field">
                    <span>Status</span>
                    <select
                      value={serviceFilters.status}
                      onChange={(e) => { setServiceFilters((p) => ({ ...p, status: e.target.value })); setPage(0); }}
                    >
                      {SERVICE_STATUS_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>

                  <button type="button" className="product-filter-clear" onClick={clearFilters} disabled={!activeFilterCount}>
                    Clear Filters
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {pageItems.length === 0 ? (
            <p className="empty-state">{isLoading ? 'Loading services...' : 'No services found.'}</p>
          ) : (
            <>
              <div className="table-shell product-table-shell">
                <table className="admin-table users-table product-table" style={{ minWidth: `${tableMinWidth}px` }}>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          className="select-checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all services"
                        />
                      </th>
                      {visibleColumns.map((column) => (
                        <th key={column.key} style={{ minWidth: column.minWidth }}>{column.label}</th>
                      ))}
                      <th className="table-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((svc) => {
                      const svcId = getServiceId(svc);
                      const statusValue = String(svc?.approvalStatus || '').toUpperCase();
                      const canModerate = ['PENDING_REVIEW', 'CHANGES_REQUIRED'].includes(statusValue);
                      return (
                        <tr
                          key={svcId}
                          className="table-row-clickable"
                          onClick={() => navigate(`/admin/services/${svcId}`)}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="select-checkbox"
                              checked={svcId ? selectedIds.has(svcId) : false}
                              onChange={() => toggleSelect(svcId)}
                              aria-label={`Select ${svc?.serviceName || 'service'}`}
                            />
                          </td>
                          {visibleColumns.map((column) => (
                            <td key={`${svcId}-${column.key}`} style={{ minWidth: column.minWidth }}>
                              {getServiceCellValue(svc, column.key)}
                            </td>
                          ))}
                          <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                            <div
                              className="product-table-action-menu"
                              ref={openServiceActionId === svcId ? actionMenuRef : null}
                            >
                              <button
                                type="button"
                                className="icon-btn product-table-action-trigger"
                                aria-label="Actions"
                                aria-expanded={openServiceActionId === svcId}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenServiceActionId((prev) => (prev === svcId ? null : svcId));
                                }}
                              >
                                {ACTION_ICONS.more}
                              </button>
                              {openServiceActionId === svcId ? (
                                <div className="product-table-action-dropdown">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenServiceActionId(null);
                                      navigate(`/admin/services/${svcId}`);
                                    }}
                                  >
                                    <span className="gsc-product-view-menu-icon view">{ACTION_ICONS.view}</span>
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenServiceActionId(null);
                                      navigate(`/admin/services/${svcId}/edit`);
                                    }}
                                  >
                                    <span className="gsc-product-view-menu-icon edit">{ACTION_ICONS.edit}</span>
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenServiceActionId(null);
                                      handleDelete(svcId);
                                    }}
                                  >
                                    <span className="gsc-product-view-menu-icon delete">{ACTION_ICONS.trash}</span>
                                    Delete
                                  </button>
                                  {canModerate ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setOpenServiceActionId(null);
                                          handleRowStatusUpdate(svcId, 'APPROVED');
                                        }}
                                      >
                                        <span className="gsc-product-view-menu-icon approve">{ACTION_ICONS.approve}</span>
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setOpenServiceActionId(null);
                                          handleRowStatusUpdate(svcId, 'CHANGES_REQUIRED');
                                        }}
                                      >
                                        <span className="gsc-product-view-menu-icon request-changes">{ACTION_ICONS.requestChanges}</span>
                                        Request changes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setOpenServiceActionId(null);
                                          handleRowStatusUpdate(svcId, 'REJECTED');
                                        }}
                                      >
                                        <span className="gsc-product-view-menu-icon reject">{ACTION_ICONS.reject}</span>
                                        Reject
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bv-table-footer">
                <div className="table-record-count">
                  Showing {pageStart}-{pageEnd} of {totalElements} services
                </div>
                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value) || 25); setPage(0); }}
                    >
                      {SERVICE_PAGE_SIZE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>
                  <div className="bv-table-pagination">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={safePage === 0 || isLoading}
                      onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    >
                      {'< Prev'}
                    </button>
                    <span>Page {safePage + 1} / {totalPages}</span>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={safePage >= totalPages - 1 || isLoading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {'Next >'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="product-view-shell">
          {selectedService ? (
            <>
              <div className="pvr-topbar">
                <button
                  type="button"
                  className="pvr-back-btn"
                  onClick={() => { setShowViewActionMenu(false); navigate('/admin/services'); }}
                >
                  ‹ Back
                </button>
                <div className="gsc-product-view-menu-shell" ref={viewActionMenuRef}>
                  <button
                    type="button"
                    className="gsc-product-view-menu-trigger"
                    aria-label="Open service actions"
                    aria-expanded={showViewActionMenu}
                    onClick={() => setShowViewActionMenu((prev) => !prev)}
                  >
                    {ACTION_ICONS.more}
                  </button>
                  {showViewActionMenu ? (
                    <div className="gsc-product-view-menu-panel">
                      <button
                        type="button"
                        className="gsc-product-view-menu-item"
                        onClick={() => { setShowViewActionMenu(false); navigate(`/admin/services/${getServiceId(selectedService)}/edit`); }}
                      >
                        <span className="gsc-product-view-menu-icon edit">{ACTION_ICONS.edit}</span>
                        <span>Edit</span>
                      </button>
                      {hasServiceReviewActions ? (
                        <>
                          <button
                            type="button"
                            className="gsc-product-view-menu-item"
                            onClick={() => {
                              setShowViewActionMenu(false);
                              setActiveServiceViewTab('review');
                              handleApprove();
                            }}
                            disabled={disableServiceApprove}
                          >
                            <span className="gsc-product-view-menu-icon approve">{ACTION_ICONS.approve}</span>
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            className="gsc-product-view-menu-item"
                            onClick={() => {
                              setShowViewActionMenu(false);
                              setActiveServiceViewTab('review');
                              handleRequestChanges();
                            }}
                            disabled={disableServiceRequestChanges}
                          >
                            <span className="gsc-product-view-menu-icon request-changes">{ACTION_ICONS.requestChanges}</span>
                            <span>Request changes</span>
                          </button>
                          <button
                            type="button"
                            className="gsc-product-view-menu-item"
                            onClick={() => {
                              setShowViewActionMenu(false);
                              setActiveServiceViewTab('review');
                              handleReject();
                            }}
                            disabled={disableServiceReject}
                          >
                            <span className="gsc-product-view-menu-icon reject">{ACTION_ICONS.reject}</span>
                            <span>Reject</span>
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="gsc-product-view-menu-item delete"
                        onClick={() => { setShowViewActionMenu(false); handleDelete(getServiceId(selectedService)); }}
                        disabled={isUpdating}
                      >
                        <span className="gsc-product-view-menu-icon delete">{ACTION_ICONS.trash}</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="pvr-hero panel card">
                <div className="pvr-hero-left">
                  {resolveMediaUrl(selectedService.serviceImageLogo) ? (
                    <img
                      src={resolveMediaUrl(selectedService.serviceImageLogo)}
                      alt={selectedService.serviceName || 'Service'}
                      className="pvr-hero-thumb"
                    />
                  ) : (
                    <div className="pvr-hero-thumb pvr-hero-thumb-empty">
                      <svg viewBox="0 0 24 24" width="32" height="32"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5Z" fill="#CBD5E1" /></svg>
                    </div>
                  )}
                </div>
                <div className="pvr-hero-body">
                  <div className="pvr-hero-name-group">
                    <h2 className="pvr-hero-name">{selectedService.serviceName || '—'}</h2>
                    <span className={`status-pill pvh-status-badge ${statusClass(selectedService.approvalStatus)}`}>
                      {formatStatus(selectedService.approvalStatus)}
                    </span>
                  </div>
                  <p className="pvr-hero-secondary">
                    {[
                      selectedService.businessName,
                      selectedService.serviceCode ? `Code: ${selectedService.serviceCode}` : null,
                      selectedService.category?.categoryName || selectedService.category?.mainCategoryName,
                    ].filter(Boolean).join('  ·  ')}
                  </p>
                  <div className="pvr-kpi-strip">
                    {[
                      { label: 'Base Price', value: formatPrice(selectedService.basePrice) },
                      { label: 'UOM', value: selectedService.serviceUom || '—' },
                      { label: 'GST Rate', value: selectedService.taxRate != null ? `${selectedService.taxRate}%` : '—' },
                      { label: 'Duration', value: selectedService.serviceDuration || '—' },
                      { label: 'Coverage', value: selectedService.coverageArea || '—' },
                      { label: 'Updated', value: formatDateTime(selectedService.updatedOn || selectedService.createdOn) },
                    ].map((kpi) => (
                      <div className="pvr-kpi-cell" key={kpi.label}>
                        <span className="pvr-kpi-val">{kpi.value}</span>
                        <span className="pvr-kpi-lbl">{kpi.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bv-panel panel card">
                <div className="bv-tab-bar">
                  {SERVICE_VIEW_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`bv-tab-btn ${activeServiceViewTab === tab.key ? 'active' : ''}`}
                      onClick={() => setActiveServiceViewTab(tab.key)}
                    >
                      <span className="bv-tab-btn-label">{tab.label}</span>
                    </button>
                  ))}
                </div>
                <div className="bv-tab-content">
                  {renderViewBody()}
                </div>
              </div>
            </>
          ) : (
            <p className="empty-state">{isLoading ? 'Loading service details...' : 'Service details not available.'}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ServicePage;
