import { useEffect, useMemo, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { usePermissions } from '../shared/permissions';
import {
  createAttributeDefinition,
  createAttributeMapping,
  createCategory,
  deleteAttributeMapping,
  deleteCategory,
  getCategory,
  listAttributeDefinitions,
  listAttributeMappings,
  listCategories,
  listMainCategories,
  updateCategory,
} from '../services/adminApi';
import { buildOrderingWarning, findNextAvailableOrdering, findOrderingConflict, parseOrderingInput } from '../utils/ordering';
import { PRODUCT_MASTER_PERMISSIONS } from '../constants/adminPermissions';

/* ── Constants ──────────────────────────────────────────────── */
const initialForm = {
  name: '',
  mainCategoryId: '',
  categoryIcon: '',
  imageUrl: '',
  ordering: '',
  path: '',
  active: '1',
  hasSubCategory: '1',
};

const initialFieldEditor = {
  label: '',
  dataType: 'STRING',
  unit: '',
  enumOptions: [],
  required: false,
  filterable: false,
};

const fieldTypes = [
  { value: 'STRING', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'DATE', label: 'Date' },
  { value: 'ENUM', label: 'Dropdown' },
];

const typeLabel = (value) => fieldTypes.find((t) => t.value === value)?.label || value || '-';

const toFieldKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

const readBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const n = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'active'].includes(n)) return true;
  if (['false', '0', 'no', 'inactive'].includes(n)) return false;
  return fallback;
};

const getDefinitionId = (def) => def?.id ?? def?.attributeId ?? null;

const getDefinitionOptions = (def) =>
  Array.isArray(def?.options?.values) ? def.options.values : [];

const getCreatedDefinitionId = (res) =>
  res?.data?.attribute_id ??
  res?.data?.attributeId ??
  res?.data?.id ??
  res?.data?.definitionId ??
  null;

/* ── Small toggle switch component ─────────────────────────── */
function ToggleSwitch({ id, checked, onChange, label, disabled }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
      }}
    >
      <span style={{
        position: 'relative', display: 'inline-block', width: 36, height: 20, flexShrink: 0,
      }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          background: checked ? 'var(--accent)' : '#d1d5db',
          transition: 'background 0.2s',
        }} />
        <span style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3, width: 14, height: 14,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </span>
      {label && <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</span>}
    </label>
  );
}

/* ── Type badge ─────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const colors = {
    TEXT:    { bg: '#eff6ff', color: '#3b82f6' },
    NUMBER:  { bg: '#fef3c7', color: '#d97706' },
    'YES / NO': { bg: '#f0fdf4', color: '#16a34a' },
    DATE:    { bg: '#fdf4ff', color: '#a855f7' },
    DROPDOWN:{ bg: '#fff7ed', color: '#ea580c' },
  };
  const c = colors[type] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
      background: c.bg, color: c.color, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {type}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function CategoryPage({ token }) {
  /* ── Core data ── */
  const [items, setItems] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);

  /* ── Page state ── */
  const [message, setMessage]         = useState({ type: 'info', text: '' });
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(20);

  /* ── View panel ── */
  const [viewItem, setViewItem]       = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);

  /* ── Unified modal ── */
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [modalTab, setModalTab]       = useState('details'); // 'details' | 'fields'
  const [editItem, setEditItem]       = useState(null);

  /* ── Details form ── */
  const [form, setForm]               = useState(initialForm);
  const [touched, setTouched]         = useState({});
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: 'info', text: '' });
  // Track the active category for the fields tab (could be editItem or newly created)
  const [fieldsTargetCategory, setFieldsTargetCategory] = useState(null);

  /* ── Field manager ── */
  const [fieldMessage, setFieldMessage] = useState({ type: 'info', text: '' });
  const [isFieldsLoading, setIsFieldsLoading] = useState(false);
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [categoryFields, setCategoryFields]     = useState([]);
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [fieldOptionDraft, setFieldOptionDraft] = useState('');
  const [addFieldMode, setAddFieldMode]         = useState('existing'); // 'existing' | 'new'
  const [fieldEditor, setFieldEditor]           = useState(initialFieldEditor);
  const [selectedExistingFieldId, setSelectedExistingFieldId] = useState('');
  const [existingFieldRequired, setExistingFieldRequired]     = useState(false);

  /* ── Permissions ── */
  const { hasPermission } = usePermissions();
  const canCreate      = hasPermission(PRODUCT_MASTER_PERMISSIONS.category.create);
  const canUpdate      = hasPermission(PRODUCT_MASTER_PERMISSIONS.category.update);
  const canDelete      = hasPermission(PRODUCT_MASTER_PERMISSIONS.category.delete);
  const canManageFields = hasPermission('ADMIN_DYNAMIC_FIELDS_UPDATE');

  /* ── Derived data ── */
  const definitionById = useMemo(() => {
    const map = new Map();
    fieldDefinitions.forEach((def) => {
      const id = getDefinitionId(def);
      if (id !== null && id !== undefined) map.set(String(id), def);
    });
    return map;
  }, [fieldDefinitions]);

  const assignedDefinitionIds = useMemo(
    () =>
      new Set(
        categoryFields
          .map((m) => m?.attributeId)
          .filter((v) => v !== null && v !== undefined)
          .map((v) => String(v))
      ),
    [categoryFields]
  );

  const filteredReusableFields = useMemo(() => {
    const search = fieldSearchQuery.trim().toLowerCase();
    return fieldDefinitions.filter((def) => {
      const id = String(getDefinitionId(def) || '');
      if (!id) return false;
      if (!readBoolean(def?.active, true)) return false;
      if (assignedDefinitionIds.has(id)) return false;
      if (!search) return true;
      const hay = [def?.label, def?.key, def?.dataType, typeLabel(def?.dataType)]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return hay.includes(search);
    });
  }, [assignedDefinitionIds, fieldDefinitions, fieldSearchQuery]);

  const assignedFields = useMemo(() =>
    [...categoryFields]
      .sort((a, b) => {
        const ao = Number.isFinite(Number(a?.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
        const bo = Number.isFinite(Number(b?.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        const aLabel = definitionById.get(String(a?.attributeId || ''))?.label || a?.label || '';
        const bLabel = definitionById.get(String(b?.attributeId || ''))?.label || b?.label || '';
        return aLabel.localeCompare(bLabel);
      })
      .map((mapping) => {
        const def = definitionById.get(String(mapping?.attributeId || '')) || null;
        return {
          mappingId:  mapping.id,
          mappingObj: mapping,
          label:      def?.label || mapping?.label || mapping?.attributeKey || '-',
          type:       typeLabel(def?.dataType || mapping?.dataType),
          required:   readBoolean(mapping?.required, false),
          active:     readBoolean(mapping?.active, true),
        };
      }),
    [categoryFields, definitionById]
  );

  /* ── Ordering helpers ── */
  const requestedOrdering  = parseOrderingInput(form.ordering);
  const orderingConflict   = useMemo(
    () =>
      findOrderingConflict({
        items,
        requestedOrder: requestedOrdering,
        currentItemId: editItem?.id,
        matchesScope: (item) =>
          String(item.mainCategoryId ?? item.main_category_id ?? '') === String(form.mainCategoryId ?? ''),
      }),
    [editItem?.id, form.mainCategoryId, items, requestedOrdering]
  );
  const suggestedOrdering  = useMemo(
    () =>
      findNextAvailableOrdering({
        items,
        currentItemId: editItem?.id,
        matchesScope: (item) =>
          String(item.mainCategoryId ?? item.main_category_id ?? '') === String(form.mainCategoryId ?? ''),
      }),
    [editItem?.id, form.mainCategoryId, items]
  );
  const orderingWarning = buildOrderingWarning(requestedOrdering, orderingConflict, suggestedOrdering);

  /* ── Filters & pagination ── */
  const filteredItems = items
    .filter((item) => {
      const q = categorySearchQuery.trim().toLowerCase();
      if (!q) return true;
      return `${item.name || ''} ${item.mainCategoryName || item.main_category_name || ''}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeCount   = items.filter((item) => Number(item.active) === 1).length;
  const inactiveCount = Math.max(0, items.length - activeCount);

  /* ── Validation ── */
  const validate = (f) => {
    const errs = {};
    if (!f.name.trim()) errs.name = 'Name is required.';
    else if (f.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!f.mainCategoryId) errs.mainCategoryId = 'Main category is required.';
    if (f.ordering !== '' && f.ordering !== null) {
      const n = parseOrderingInput(f.ordering);
      if (Number.isNaN(n)) errs.ordering = 'Must be a whole number ≥ 1.';
    }
    if (f.path && !f.path.startsWith('/')) f.path = '/' + f.path;
    return errs;
  };

  const errors   = validate(form);
  const fieldErr = (key) => touched[key] && errors[key];

  /* ── Data loaders ── */
  const loadData = async () => {
    setIsPageLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [catRes, mainCatRes] = await Promise.allSettled([
        listCategories(token),
        listMainCategories(token),
      ]);
      if (catRes.status !== 'fulfilled') throw catRes.reason;
      setItems(catRes.value?.data || []);
      setMainCategories(mainCatRes.status === 'fulfilled' ? mainCatRes.value?.data || [] : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch categories.' });
    } finally {
      setIsPageLoading(false);
    }
  };

  const loadFieldDefinitions = async () => {
    const res = await listAttributeDefinitions(token);
    setFieldDefinitions(res?.data?.definitions || []);
  };

  const loadCategoryFields = async (categoryId) => {
    if (!categoryId) { setCategoryFields([]); return; }
    const res = await listAttributeMappings(token, { categoryId: Number(categoryId) });
    setCategoryFields(res?.data?.mappings || []);
  };

  const refreshFields = async (categoryId) => {
    if (!categoryId) return;
    setIsFieldsLoading(true);
    try {
      await Promise.all([loadFieldDefinitions(), loadCategoryFields(categoryId)]);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to load fields.' });
    } finally {
      setIsFieldsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Modal helpers ── */
  const resetFieldEditor = () => {
    setFieldEditor(initialFieldEditor);
    setFieldOptionDraft('');
    setFieldSearchQuery('');
    setSelectedExistingFieldId('');
    setExistingFieldRequired(false);
  };

  const closeModal = () => {
    setShowCategoryModal(false);
    setModalTab('details');
    setEditItem(null);
    setForm(initialForm);
    setTouched({});
    setFormMessage({ type: 'info', text: '' });
    setFieldsTargetCategory(null);
    setFieldDefinitions([]);
    setCategoryFields([]);
    setAddFieldMode('existing');
    setFieldMessage({ type: 'info', text: '' });
    resetFieldEditor();
  };

  const openCreateModal = () => {
    setEditItem(null);
    setForm(initialForm);
    setTouched({});
    setFormMessage({ type: 'info', text: '' });
    setFieldsTargetCategory(null);
    setFieldDefinitions([]);
    setCategoryFields([]);
    setModalTab('details');
    setAddFieldMode('existing');
    setFieldMessage({ type: 'info', text: '' });
    resetFieldEditor();
    setShowCategoryModal(true);
  };

  const openEditModal = (item) => {
    if (!canUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update categories.' });
      return;
    }
    setEditItem(item);
    setForm({
      name:           item.name || '',
      mainCategoryId: String(item.mainCategoryId ?? item.main_category_id ?? ''),
      categoryIcon:   item.categoryIcon ?? item.category_icon ?? '',
      imageUrl:       item.imageUrl ?? item.image_url ?? '',
      ordering:       item.ordering != null ? String(item.ordering) : '',
      path:           item.path ?? '',
      active:         item.active != null ? String(Number(item.active) === 1 ? '1' : '0') : '1',
      hasSubCategory: item.hasSubCategory != null ? String(Number(item.hasSubCategory) === 1 ? '1' : '0') : '1',
    });
    setTouched({});
    setFormMessage({ type: 'info', text: '' });
    setFieldsTargetCategory(item);
    setFieldMessage({ type: 'info', text: '' });
    setAddFieldMode('existing');
    resetFieldEditor();
    setModalTab('details');
    setShowCategoryModal(true);
    // Pre-load fields in background
    if (canManageFields) refreshFields(item.id);
  };

  const openFieldsModal = async (category) => {
    if (!canManageFields) {
      setMessage({ type: 'error', text: 'You do not have permission to manage fields.' });
      return;
    }
    setEditItem(category);
    setFieldsTargetCategory(category);
    setFieldMessage({ type: 'info', text: '' });
    setAddFieldMode('existing');
    resetFieldEditor();
    setModalTab('fields');
    setShowCategoryModal(true);
    await refreshFields(category.id);
  };

  /* ── Form submit (Details tab) ── */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ name: true, mainCategoryId: true, ordering: true, path: true });
    if (editItem ? !canUpdate : !canCreate) {
      setFormMessage({
        type: 'error',
        text: editItem ? 'No permission to update categories.' : 'No permission to create categories.',
      });
      return;
    }
    const submitErrors = validate(form);
    if (Object.keys(submitErrors).length > 0) {
      setFormMessage({ type: 'error', text: Object.values(submitErrors)[0] });
      return;
    }
    const payload = {
      name:           form.name.trim(),
      mainCategoryId: Number(form.mainCategoryId),
      categoryIcon:   form.categoryIcon || null,
      imageUrl:       form.imageUrl || null,
      ordering:       requestedOrdering,
      path:           form.path || null,
      active:         Number(form.active),
      hasSubCategory: Number(form.hasSubCategory),
    };
    try {
      setIsFormSaving(true);
      setFormMessage({ type: 'info', text: '' });
      if (editItem) {
        await updateCategory(token, editItem.id, payload);
        setFormMessage({ type: 'success', text: 'Category updated successfully.' });
      } else {
        const res = await createCategory(token, payload);
        const newId = res?.data?.id ?? res?.data?.categoryId ?? null;
        const newCat = { ...payload, id: newId, mainCategoryName: mainCategories.find((m) => m.id === payload.mainCategoryId)?.name };
        setFieldsTargetCategory(newCat);
        setEditItem(newCat);
        setFormMessage({ type: 'success', text: 'Category created! You can optionally add fields below.' });
        // Auto-switch to fields tab if user has permission
        if (canManageFields && newId) {
          await refreshFields(newId);
          setModalTab('fields');
        }
      }
      await loadData();
    } catch (error) {
      setFormMessage({ type: 'error', text: error.message || (editItem ? 'Failed to update.' : 'Failed to create.') });
    } finally {
      setIsFormSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete categories.' });
      return;
    }
    try {
      setIsPageLoading(true);
      await deleteCategory(token, id);
      await loadData();
      setMessage({ type: 'success', text: 'Category deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete category.' });
    } finally {
      setIsPageLoading(false);
    }
  };

  /* ── Field editor ── */
  const handleAddOption = () => {
    const raw = fieldOptionDraft.trim();
    if (!raw) return;
    const opts = raw.split(',').map((v) => v.trim()).filter(Boolean);
    setFieldEditor((prev) => {
      const existing = new Set((prev.enumOptions || []).map((v) => v.toLowerCase()));
      const merged = [...(prev.enumOptions || [])];
      opts.forEach((v) => {
        if (!existing.has(v.toLowerCase())) { existing.add(v.toLowerCase()); merged.push(v); }
      });
      return { ...prev, enumOptions: merged };
    });
    setFieldOptionDraft('');
  };

  const handleRemoveOption = (opt) =>
    setFieldEditor((prev) => ({
      ...prev,
      enumOptions: (prev.enumOptions || []).filter((o) => o !== opt),
    }));

  const handleFieldSubmit = async (event) => {
    event.preventDefault();
    if (!canManageFields) {
      setFieldMessage({ type: 'error', text: 'No permission to manage fields.' });
      return;
    }
    const targetId = fieldsTargetCategory?.id;
    if (!targetId) {
      setFieldMessage({ type: 'error', text: 'No category selected.' });
      return;
    }
    const label = fieldEditor.label.trim();
    const key   = toFieldKey(label);
    if (!label) { setFieldMessage({ type: 'error', text: 'Field name is required.' }); return; }
    if (!key)   { setFieldMessage({ type: 'error', text: 'Field name must contain letters or numbers.' }); return; }
    if (fieldEditor.dataType === 'ENUM' && fieldEditor.enumOptions.length === 0) {
      setFieldMessage({ type: 'error', text: 'Add at least one dropdown option.' });
      return;
    }

    const maxSort = categoryFields.reduce((max, m) => {
      const n = Number(m?.sortOrder);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);

    const definitionPayload = {
      key, label, dataType: fieldEditor.dataType, active: true,
      ...(fieldEditor.dataType === 'NUMBER' && fieldEditor.unit.trim() ? { unit: fieldEditor.unit.trim() } : {}),
      ...(fieldEditor.dataType === 'ENUM' && fieldEditor.enumOptions.length > 0 ? { options: { values: fieldEditor.enumOptions } } : {}),
    };

    setIsSavingField(true);
    setFieldMessage({ type: 'info', text: '' });
    try {
      const defRes     = await createAttributeDefinition(token, definitionPayload);
      const attributeId = getCreatedDefinitionId(defRes);
      if (!attributeId) throw new Error('Failed to create field definition.');
      await createAttributeMapping(token, {
        attributeId: Number(attributeId),
        categoryId:  Number(targetId),
        required:    fieldEditor.required,
        active:      true,
        filterable:  fieldEditor.filterable,
        searchable:  false,
        sortOrder:   maxSort + 1,
      });
      setFieldMessage({ type: 'success', text: `"${label}" field added.` });
      resetFieldEditor();
      setAddFieldMode('existing');
      await refreshFields(targetId);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to save field.' });
    } finally {
      setIsSavingField(false);
    }
  };

  const handleAddExistingField = async () => {
    if (!canManageFields) {
      setFieldMessage({ type: 'error', text: 'No permission to manage fields.' });
      return;
    }
    const targetId = fieldsTargetCategory?.id;
    if (!targetId) {
      setFieldMessage({ type: 'error', text: 'No category selected.' });
      return;
    }
    const normId = String(selectedExistingFieldId || '');
    if (!normId || assignedDefinitionIds.has(normId)) {
      setFieldMessage({ type: 'error', text: 'Select a field to add.' });
      return;
    }
    const maxSort = categoryFields.reduce((max, m) => {
      const n = Number(m?.sortOrder);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    setIsSavingField(true);
    setFieldMessage({ type: 'info', text: '' });
    try {
      await createAttributeMapping(token, {
        attributeId: Number(normId),
        categoryId:  Number(targetId),
        required:    existingFieldRequired,
        active:      true,
        filterable:  false,
        searchable:  false,
        sortOrder:   maxSort + 1,
      });
      const addedDef = definitionById.get(normId);
      setFieldMessage({ type: 'success', text: `"${addedDef?.label || 'Field'}" added.` });
      setSelectedExistingFieldId('');
      setExistingFieldRequired(false);
      await refreshFields(targetId);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to add field.' });
    } finally {
      setIsSavingField(false);
    }
  };

  const handleRemoveField = async (mappingId) => {
    if (!canManageFields) {
      setFieldMessage({ type: 'error', text: 'No permission to manage fields.' });
      return;
    }
    if (!window.confirm('Remove this field from the category?')) return;
    try {
      setIsSavingField(true);
      await deleteAttributeMapping(token, mappingId);
      setFieldMessage({ type: 'success', text: 'Field removed.' });
      await refreshFields(fieldsTargetCategory?.id);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to remove field.' });
    } finally {
      setIsSavingField(false);
    }
  };

  /* ── View panel ── */
  const handleView = async (item) => {
    setIsViewLoading(true);
    setViewItem(null);
    setShowCategoryModal(false);
    try {
      const [catRes, mapRes] = await Promise.allSettled([
        getCategory(token, item.id),
        listAttributeMappings(token, { categoryId: item.id }),
      ]);
      const baseData = catRes.status === 'fulfilled'
        ? (catRes.value?.data ?? { category: item, subCategories: [] })
        : { category: item, subCategories: [] };
      const attributeMappings = mapRes.status === 'fulfilled'
        ? (mapRes.value?.data?.mappings || [])
        : [];
      setViewItem({ ...baseData, attributeMappings });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load category details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  /* ── Render: Modal ── */
  const renderModal = () => {
    if (!showCategoryModal) return null;
    const isCreating    = !editItem;
    const canUseFields  = !!fieldsTargetCategory?.id;
    const targetCatName = fieldsTargetCategory?.name || form.name || '';
    const mainCatName   = mainCategories.find(
      (m) => String(m.id) === String(fieldsTargetCategory?.mainCategoryId ?? form.mainCategoryId)
    )?.name;

    return (
      <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeModal}>
        <div
          className="admin-modal cat-unified-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Modal Header ── */}
          <div style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                {isCreating ? 'Create Category' : `Edit — ${editItem.name}`}
              </h3>
              {targetCatName && mainCatName && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  {mainCatName} › {targetCatName}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              style={{
                background: '#f1f5f9', border: 'none', borderRadius: 8,
                width: 32, height: 32, cursor: 'pointer', color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Tab Bar ── */}
          <div style={{
            display: 'flex', background: '#fafafa', borderBottom: '1px solid #f1f5f9',
            padding: '0 24px',
          }}>
            {[
              { key: 'details', label: '① Details' },
              { key: 'fields', label: '② Fields', optional: true },
            ].map((tab) => {
              const isActive   = modalTab === tab.key;
              const isDisabled = tab.key === 'fields' && !canUseFields;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => !isDisabled && setModalTab(tab.key)}
                  disabled={isDisabled}
                  style={{
                    padding: '11px 16px 10px',
                    border: 'none', background: 'none',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    color: isDisabled ? '#d1d5db' : isActive ? 'var(--accent)' : '#64748b',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13, cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                  {tab.optional && <span style={{ marginLeft: 4, fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(optional)</span>}
                </button>
              );
            })}
          </div>

          {/* ── Tab Content ── */}
          <div style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>

            {/* ─── DETAILS TAB ─── */}
            {modalTab === 'details' && (
              <form onSubmit={handleSubmit} style={{ padding: '22px 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {formMessage.text && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, fontSize: 13,
                    background: formMessage.type === 'success' ? '#f0fdf4' : formMessage.type === 'error' ? '#fef2f2' : '#eff6ff',
                    border: `1px solid ${formMessage.type === 'success' ? '#bbf7d0' : formMessage.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
                    color: formMessage.type === 'success' ? '#15803d' : formMessage.type === 'error' ? '#b91c1c' : '#1d4ed8',
                  }}>
                    {formMessage.text}
                  </div>
                )}

                {/* Row 1: Name + Main Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className={`field${fieldErr('name') ? ' field-error' : ''}`}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                      placeholder="e.g. Soft Drink"
                      className={fieldErr('name') ? 'input-error' : ''}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    {fieldErr('name') && <span className="field-error-msg">{errors.name}</span>}
                  </div>
                  <div className={`field${fieldErr('mainCategoryId') ? ' field-error' : ''}`}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Main Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={form.mainCategoryId}
                      onChange={(e) => setForm((p) => ({ ...p, mainCategoryId: e.target.value }))}
                      onBlur={() => setTouched((p) => ({ ...p, mainCategoryId: true }))}
                      className={fieldErr('mainCategoryId') ? 'input-error' : ''}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">Select main category</option>
                      {mainCategories.map((mc) => (
                        <option key={mc.id} value={mc.id}>{mc.name}</option>
                      ))}
                    </select>
                    {fieldErr('mainCategoryId') && <span className="field-error-msg">{errors.mainCategoryId}</span>}
                  </div>
                </div>

                {/* Row 2: Ordering + Path + Status Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.6fr) minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16, alignItems: 'end' }}>
                  <div className={`field${fieldErr('ordering') ? ' field-error' : ''}`}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Ordering
                    </label>
                    <input
                      type="number"
                      value={form.ordering}
                      onChange={(e) => setForm((p) => ({ ...p, ordering: e.target.value }))}
                      onBlur={() => setTouched((p) => ({ ...p, ordering: true }))}
                      placeholder="1"
                      min="1" step="1"
                      className={fieldErr('ordering') ? 'input-error' : ''}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    {fieldErr('ordering')
                      ? <span className="field-error-msg">{errors.ordering}</span>
                      : orderingWarning ? <span className="field-help field-warning">{orderingWarning}</span> : null}
                  </div>
                  <div className={`field${fieldErr('path') ? ' field-error' : ''}`}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Path
                    </label>
                    <input
                      type="text"
                      value={form.path}
                      onChange={(e) => setForm((p) => ({ ...p, path: e.target.value }))}
                      onBlur={() => setTouched((p) => ({ ...p, path: true }))}
                      placeholder="/soft-drinks"
                      className={fieldErr('path') ? 'input-error' : ''}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    {fieldErr('path') && <span className="field-error-msg">{errors.path}</span>}
                  </div>
                  <div style={{ paddingBottom: 6 }}>
                    <ToggleSwitch
                      id="cat-active"
                      checked={form.active === '1'}
                      onChange={(v) => setForm((p) => ({ ...p, active: v ? '1' : '0' }))}
                      label={form.active === '1' ? 'Active' : 'Inactive'}
                    />
                  </div>
                </div>

                {/* Row 3: Icon URL + Banner URL + SubCat Toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Icon URL
                    </label>
                    <input
                      type="text"
                      value={form.categoryIcon}
                      onChange={(e) => setForm((p) => ({ ...p, categoryIcon: e.target.value }))}
                      placeholder="https://..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Banner URL
                    </label>
                    <input
                      type="text"
                      value={form.imageUrl}
                      onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ paddingBottom: 6 }}>
                    <ToggleSwitch
                      id="cat-subcategory"
                      checked={form.hasSubCategory === '1'}
                      onChange={(v) => setForm((p) => ({ ...p, hasSubCategory: v ? '1' : '0' }))}
                      label={form.hasSubCategory === '1' ? 'Sub-categories: Yes' : 'Sub-categories: No'}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 16, borderTop: '1px solid #f1f5f9', gap: 12,
                }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {canUseFields && (
                      <button
                        type="button"
                        onClick={() => setModalTab('fields')}
                        style={{
                          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                          border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
                        }}
                      >
                        Manage Fields →
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isFormSaving}
                      style={{
                        padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: 'none', cursor: isFormSaving ? 'not-allowed' : 'pointer',
                        background: isFormSaving ? '#e2e8f0' : 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                        color: isFormSaving ? '#9ca3af' : '#fff',
                        boxShadow: isFormSaving ? 'none' : '0 4px 10px rgba(110,70,255,0.25)',
                      }}
                    >
                      {isFormSaving ? 'Saving…' : isCreating ? 'Save & Continue' : 'Update Category'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ─── FIELDS TAB ─── */}
            {modalTab === 'fields' && (
              <div style={{ padding: '0 0 24px' }}>
                {/* Fields banner */}
                {fieldMessage.text && (
                  <div style={{
                    margin: '16px 24px 0', padding: '10px 14px', borderRadius: 8, fontSize: 13,
                    background: fieldMessage.type === 'success' ? '#f0fdf4' : fieldMessage.type === 'error' ? '#fef2f2' : '#eff6ff',
                    border: `1px solid ${fieldMessage.type === 'success' ? '#bbf7d0' : fieldMessage.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
                    color: fieldMessage.type === 'success' ? '#15803d' : fieldMessage.type === 'error' ? '#b91c1c' : '#1d4ed8',
                  }}>
                    {fieldMessage.text}
                  </div>
                )}

                {/* ─ Add field section ─ */}
                <div style={{ padding: '18px 24px 0' }}>
                  {/* Mode toggle */}
                  <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#f3f4f6', borderRadius: 10, padding: 3 }}>
                    {[
                      { key: 'existing', label: '🔗 Use Existing Field' },
                      { key: 'new',      label: '✦ Create New Field' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setAddFieldMode(key); resetFieldEditor(); }}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                          fontSize: 13, fontWeight: addFieldMode === key ? 600 : 500,
                          background: addFieldMode === key ? '#fff' : 'transparent',
                          color: addFieldMode === key ? 'var(--accent)' : '#6b7280',
                          boxShadow: addFieldMode === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* ── Use Existing ── */}
                  {addFieldMode === 'existing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Search */}
                      <div style={{ position: 'relative' }}>
                        <input
                          type="search"
                          placeholder="Search fields by name or type…"
                          value={fieldSearchQuery}
                          onChange={(e) => { setFieldSearchQuery(e.target.value); setSelectedExistingFieldId(''); }}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 36px',
                            border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none',
                          }}
                        />
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15 }}>
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                      </div>

                      {/* Field list */}
                      {isFieldsLoading ? (
                        <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Loading fields…</p>
                      ) : filteredReusableFields.length === 0 ? (
                        <div style={{
                          padding: '20px', borderRadius: 10, background: '#f8fafc', border: '1.5px dashed #e2e8f0',
                          textAlign: 'center', color: '#94a3b8', fontSize: 13,
                        }}>
                          {fieldSearchQuery ? 'No matching fields.' : 'All available fields are already assigned, or none exist. Create a new one!'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 224, overflowY: 'auto', paddingRight: 2 }}>
                          {filteredReusableFields.map((def) => {
                            const id      = String(getDefinitionId(def) || '');
                            const options = getDefinitionOptions(def);
                            const selected = selectedExistingFieldId === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setSelectedExistingFieldId(selected ? '' : id)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  gap: 12, width: '100%', padding: '10px 14px', textAlign: 'left',
                                  border: selected ? '1.5px solid var(--accent)' : '1.5px solid #e2e8f0',
                                  borderRadius: 10, background: selected ? '#faf5ff' : '#fff',
                                  cursor: 'pointer', transition: 'all 0.12s',
                                  boxShadow: selected ? '0 0 0 3px rgba(110,70,255,0.1)' : 'none',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{def.label || '-'}</div>
                                  {options.length > 0 && (
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                      {options.slice(0, 4).join(', ')}{options.length > 4 ? ` +${options.length - 4} more` : ''}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <TypeBadge type={typeLabel(def.dataType)} />
                                  {selected && (
                                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" style={{ width: 10, height: 10 }}>
                                        <path d="M2 6l3 3 5-5" />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected field controls */}
                      {selectedExistingFieldId && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: 10, background: '#faf5ff',
                          border: '1.5px solid #e9d5ff', gap: 12, flexWrap: 'wrap',
                        }}>
                          <ToggleSwitch
                            id="existing-required"
                            checked={existingFieldRequired}
                            onChange={setExistingFieldRequired}
                            label="Mark as Required"
                          />
                          <button
                            type="button"
                            onClick={handleAddExistingField}
                            disabled={isSavingField}
                            style={{
                              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
                              background: isSavingField ? '#e2e8f0' : 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                              color: isSavingField ? '#9ca3af' : '#fff', cursor: isSavingField ? 'not-allowed' : 'pointer',
                              boxShadow: isSavingField ? 'none' : '0 3px 8px rgba(110,70,255,0.25)',
                            }}
                          >
                            {isSavingField ? 'Adding…' : '+ Add to Category'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Create New Field ── */}
                  {addFieldMode === 'new' && (
                    <form onSubmit={handleFieldSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Label + Type in one row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Field Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={fieldEditor.label}
                            onChange={(e) => setFieldEditor((p) => ({ ...p, label: e.target.value }))}
                            placeholder="e.g. Brand"
                            required
                            style={{ width: '100%', boxSizing: 'border-box' }}
                          />
                          {fieldEditor.label && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                              Key: <code style={{ color: 'var(--accent)' }}>{toFieldKey(fieldEditor.label) || '—'}</code>
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Field Type
                          </label>
                          <select
                            value={fieldEditor.dataType}
                            onChange={(e) => setFieldEditor((p) => ({ ...p, dataType: e.target.value, enumOptions: [] }))}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                          >
                            {fieldTypes.map((ft) => (
                              <option key={ft.value} value={ft.value}>{ft.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Unit — only for NUMBER */}
                      {fieldEditor.dataType === 'NUMBER' && (
                        <div style={{ maxWidth: 200 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Unit
                          </label>
                          <input
                            type="text"
                            value={fieldEditor.unit}
                            onChange={(e) => setFieldEditor((p) => ({ ...p, unit: e.target.value }))}
                            placeholder="e.g. ml, kg, %"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                      )}

                      {/* Options — only for ENUM */}
                      {fieldEditor.dataType === 'ENUM' && (
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            Dropdown Options <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input
                              type="text"
                              value={fieldOptionDraft}
                              onChange={(e) => setFieldOptionDraft(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                              placeholder="Type options, separate with comma"
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              onClick={handleAddOption}
                              style={{
                                padding: '0 14px', height: 38, borderRadius: 8, border: '1.5px solid var(--accent)',
                                background: 'transparent', color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              Add
                            </button>
                          </div>
                          {fieldEditor.enumOptions.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {fieldEditor.enumOptions.map((opt) => (
                                <span key={opt} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  padding: '4px 10px', borderRadius: 999, background: '#ede9fe',
                                  color: '#5b21b6', fontSize: 12, fontWeight: 600,
                                }}>
                                  {opt}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(opt)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', lineHeight: 1, fontSize: 13, padding: 0 }}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Options will appear in product form dropdown.</p>
                          )}
                        </div>
                      )}

                      {/* Required + Filterable toggles */}
                      <div style={{
                        display: 'flex', gap: 24, flexWrap: 'wrap',
                        padding: '12px 14px', borderRadius: 10, background: '#f8fafc',
                        border: '1.5px solid #f1f5f9',
                      }}>
                        <ToggleSwitch
                          id="new-field-required"
                          checked={fieldEditor.required}
                          onChange={(v) => setFieldEditor((p) => ({ ...p, required: v }))}
                          label="Required field"
                        />
                        <ToggleSwitch
                          id="new-field-filterable"
                          checked={fieldEditor.filterable}
                          onChange={(v) => setFieldEditor((p) => ({ ...p, filterable: v }))}
                          label="Filterable"
                        />
                      </div>

                      {/* Submit */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => { resetFieldEditor(); setAddFieldMode('existing'); }}
                          style={{
                            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                            border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingField}
                          style={{
                            padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
                            background: isSavingField ? '#e2e8f0' : 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                            color: isSavingField ? '#9ca3af' : '#fff', cursor: isSavingField ? 'not-allowed' : 'pointer',
                            boxShadow: isSavingField ? 'none' : '0 3px 10px rgba(110,70,255,0.25)',
                          }}
                        >
                          {isSavingField ? 'Creating…' : 'Create & Add Field'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* ─ Divider ─ */}
                <div style={{ height: 1, background: '#f1f5f9', margin: '20px 0' }} />

                {/* ─ Assigned Fields Table ─ */}
                <div style={{ padding: '0 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Fields in this category</h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        These appear on the product form when this category is selected.
                      </p>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999, background: '#ede9fe',
                      color: 'var(--accent)', fontSize: 12, fontWeight: 700,
                    }}>
                      {assignedFields.length} {assignedFields.length === 1 ? 'field' : 'fields'}
                    </span>
                  </div>

                  {isFieldsLoading ? (
                    <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading…</p>
                  ) : assignedFields.length === 0 ? (
                    <div style={{
                      padding: '28px 20px', borderRadius: 12, border: '1.5px dashed #e2e8f0',
                      background: '#f8fafc', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                        No fields yet. Add fields above so products in this category collect the right information.
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#c4b5fd' }}>Fields are optional — you can skip this step.</p>
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['#', 'Field Name', 'Type', 'Required', ''].map((h) => (
                              <th key={h} style={{
                                padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                                color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                                borderBottom: '1px solid #e2e8f0',
                              }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {assignedFields.map((field, idx) => (
                            <tr
                              key={field.mappingId}
                              style={{
                                background: idx % 2 === 0 ? '#fff' : '#fafafa',
                                opacity: field.active ? 1 : 0.5,
                              }}
                            >
                              <td style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8', fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                                {field.label}
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                <TypeBadge type={field.type} />
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                {field.required ? (
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                                    background: '#fef3c7', color: '#d97706',
                                  }}>Required</span>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Optional</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveField(field.mappingId)}
                                  disabled={isSavingField}
                                  title="Remove field"
                                  style={{
                                    width: 28, height: 28, borderRadius: 8, border: '1.5px solid #fee2e2',
                                    background: '#fff', color: '#ef4444', cursor: isSavingField ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                  }}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Render: View panel ── */
  const renderViewPanel = () => {
    if (isViewLoading) {
      return (
        <div className="mv-panel card">
          <p className="mv-loading">Loading details…</p>
        </div>
      );
    }
    if (!viewItem) return null;

    const cat            = viewItem.category ?? {};
    const subCategories  = Array.isArray(viewItem.subCategories) ? viewItem.subCategories : [];
    const attrMappings   = Array.isArray(viewItem.attributeMappings) ? viewItem.attributeMappings : [];
    const mainCatName    = cat.mainCategoryName ||
      mainCategories.find((mc) => mc.id === cat.mainCategoryId)?.name || '-';

    return (
      <div className="mv-panel card">
        {/* header */}
        <div className="mv-panel-header">
          <div className="mv-panel-title-row">
            <button type="button" className="mv-back-btn" onClick={() => setViewItem(null)}>
              ← Back
            </button>
            <h3 className="mv-panel-title">{cat.name}</h3>
            <span className={Number(cat.active) === 1 ? 'status-active' : 'status-inactive'}>
              {Number(cat.active) === 1 ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="mv-panel-header-actions">
            {canManageFields && (
              <button type="button" className="ghost-btn small" onClick={() => { setViewItem(null); openFieldsModal(cat); }}>
                Manage Fields
              </button>
            )}
            {canUpdate && (
              <button type="button" className="ghost-btn small" onClick={() => { setViewItem(null); openEditModal(cat); }}>
                Edit
              </button>
            )}
          </div>
        </div>

        {/* hierarchy */}
        <div className="mv-section">
          <p className="mv-section-label">Location in Hierarchy</p>
          <div className="mv-breadcrumb-chain">
            <span className="mv-chain-node">{mainCatName}</span>
            <span className="mv-chain-sep">›</span>
            <span className="mv-chain-node mv-chain-current">{cat.name}</span>
          </div>
        </div>

        {/* basic info */}
        <div className="mv-section">
          <p className="mv-section-label">Basic Info</p>
          <div className="mv-detail-grid">
            <div className="mv-detail-row"><span className="mv-detail-label">Name</span><span className="mv-detail-value">{cat.name}</span></div>
            <div className="mv-detail-row"><span className="mv-detail-label">Main Category</span><span className="mv-detail-value">{mainCatName}</span></div>
            <div className="mv-detail-row"><span className="mv-detail-label">Path</span><span className="mv-detail-value">{cat.path || '-'}</span></div>
            <div className="mv-detail-row"><span className="mv-detail-label">Order</span><span className="mv-detail-value">{cat.ordering ?? '-'}</span></div>
            <div className="mv-detail-row"><span className="mv-detail-label">Has Sub-cats</span><span className="mv-detail-value">{cat.hasSubCategory === 1 ? 'Yes' : 'No'}</span></div>
            <div className="mv-detail-row"><span className="mv-detail-label">Status</span><span className="mv-detail-value">{Number(cat.active) === 1 ? 'Active' : 'Inactive'}</span></div>
          </div>
        </div>

        {/* media */}
        {(cat.categoryIcon || cat.imageUrl) && (
          <div className="mv-section">
            <p className="mv-section-label">Media</p>
            <div className="mv-media-row">
              {cat.categoryIcon && (
                <div className="mv-media-item">
                  <span className="mv-media-caption">Icon</span>
                  <img src={cat.categoryIcon} alt="icon" className="mv-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
              {cat.imageUrl && (
                <div className="mv-media-item">
                  <span className="mv-media-caption">Banner</span>
                  <img src={cat.imageUrl} alt="banner" className="mv-banner-img" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* sub-categories */}
        <div className="mv-section">
          <p className="mv-section-label">
            Sub-Categories
            <span className="mv-count-badge">{subCategories.length}</span>
          </p>
          {subCategories.length === 0 ? (
            <p className="mv-empty">No sub-categories linked to this category.</p>
          ) : (
            <div className="mv-child-grid">
              {[...subCategories]
                .sort((a, b) => (a.ordering ?? Infinity) - (b.ordering ?? Infinity))
                .map((sc) => (
                  <div key={sc.id} className="mv-child-card">
                    <div className="mv-child-name">{sc.name}</div>
                    <div className="mv-child-meta">
                      <span className={sc.active === 1 ? 'status-active' : 'status-inactive'}>
                        {sc.active === 1 ? 'Active' : 'Inactive'}
                      </span>
                      {sc.ordering != null && <span className="mv-child-order">Order: {sc.ordering}</span>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* spec fields */}
        <div className="mv-section">
          <p className="mv-section-label">
            Specification Fields
            <span className="mv-count-badge">{attrMappings.length}</span>
          </p>
          {attrMappings.length === 0 ? (
            <p className="mv-empty">No fields. Use <strong>Manage Fields</strong> to add them.</p>
          ) : (
            <table className="admin-table mv-spec-table">
              <thead>
                <tr>
                  <th>#</th><th>Field Name</th><th>Type</th><th>Required</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...attrMappings]
                  .sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity))
                  .map((mapping, idx) => (
                    <tr key={mapping.id ?? idx}>
                      <td>{idx + 1}</td>
                      <td>{mapping.label || mapping.attributeKey || '-'}</td>
                      <td>{typeLabel(mapping.dataType)}</td>
                      <td>{mapping.required ? 'Yes' : 'No'}</td>
                      <td>
                        <span className={mapping.active ? 'status-active' : 'status-inactive'}>
                          {mapping.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  /* ── Main Render ── */
  return (
    <div className="category-page">
      <Banner message={message} />

      {/* Unified Category Modal */}
      {renderModal()}

      <div className={`mv-layout${viewItem || isViewLoading ? ' mv-layout--split' : ''}`}>
        <div className="panel card users-table-card">
          <div className="panel-split">
            <div className="category-list-head-left">
              <h3 className="panel-subheading">Category list</h3>
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
                  placeholder="Search categories…"
                  value={categorySearchQuery}
                  onChange={(e) => { setCategorySearchQuery(e.target.value); setPage(1); }}
                  aria-label="Search categories"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: 18, height: 18, color: '#6b7280', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              {canCreate && (
                <button
                  type="button"
                  className="gsc-create-btn"
                  onClick={openCreateModal}
                  title="Create category"
                  aria-label="Create category"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="empty-state">No categories yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Name</th>
                    <th>Main Category</th>
                    <th>Status</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={viewItem?.category?.id === item.id ? 'mv-row-active' : ''}
                      onClick={() => handleView(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{(safePage - 1) * pageSize + index + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.mainCategoryName || item.main_category_name || '-'}</td>
                      <td>
                        <span className={Number(item.active) === 1 ? 'status-active' : 'status-inactive'}>
                          {Number(item.active) === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const actions = [];
                          actions.push({ label: 'View', onClick: () => handleView(item) });
                          if (canManageFields) {
                            actions.push({ label: 'Manage Fields', onClick: () => openFieldsModal(item) });
                          }
                          if (canUpdate) {
                            actions.push({ label: 'Edit', onClick: () => openEditModal(item) });
                          }
                          if (canDelete) {
                            actions.push({ label: 'Delete', onClick: () => handleDelete(item.id), danger: true });
                          }
                          if (actions.length === 0) return null;
                          return (
                            <TableRowActionMenu
                              rowId={item.id}
                              openRowId={openActionRowId}
                              onToggle={setOpenActionRowId}
                              actions={actions}
                            />
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bv-table-footer">
                <div className="table-record-count">
                  <span>{filteredItems.length === 0 ? '0 records' : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredItems.length)} of ${filteredItems.length}`}</span>
                </div>
                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <div className="bv-table-pagination">
                    <button type="button" className="secondary-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{'< Prev'}</button>
                    <span>Page {safePage} / {totalPages}</span>
                    <button type="button" className="secondary-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{'Next >'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View panel */}
        {renderViewPanel()}
      </div>
    </div>
  );
}

export default CategoryPage;
