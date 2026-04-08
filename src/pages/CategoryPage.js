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
  attributeId: '',
  label: '',
  dataType: 'STRING',
  unit: '',
  enumOptions: [],
  required: false,
  sortOrder: '',
  placeholder: '',
  active: true,
};

const fieldTypes = [
  { value: 'STRING', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'DATE', label: 'Date' },
  { value: 'ENUM', label: 'Dropdown' },
  { value: 'LIST', label: 'List' },
  { value: 'OBJECT', label: 'Advanced JSON' },
];

const simpleFieldTypes = fieldTypes.filter((item) =>
  ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM'].includes(item.value)
);

const typeLabel = (value) => fieldTypes.find((item) => item.value === value)?.label || value || '-';

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
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'active'].includes(normalized)) return true;
  if (['false', '0', 'no', 'inactive'].includes(normalized)) return false;
  return fallback;
};

const getDefinitionId = (definition) => definition?.id ?? definition?.attributeId ?? null;

const getDefinitionOptions = (definition) =>
  Array.isArray(definition?.options?.values) ? definition.options.values : [];

const getCreatedDefinitionId = (response) =>
  response?.data?.attribute_id ??
  response?.data?.attributeId ??
  response?.data?.id ??
  response?.data?.definitionId ??
  null;

function CategoryPage({ token }) {
  const [items, setItems] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [fieldMessage, setFieldMessage] = useState({ type: 'info', text: '' });
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isFieldsLoading, setIsFieldsLoading] = useState(false);
  const [isSavingField, setIsSavingField] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showFieldManager, setShowFieldManager] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [categoryFields, setCategoryFields] = useState([]);
  const [fieldEditor, setFieldEditor] = useState(initialFieldEditor);
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [fieldOptionDraft, setFieldOptionDraft] = useState('');
  const [addFieldMode, setAddFieldMode] = useState('new');
  const [selectedExistingFieldId, setSelectedExistingFieldId] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [touched, setTouched] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // View panel state
  const [viewItem, setViewItem] = useState(null);      // { category, subCategories, attributeMappings }
  const [isViewLoading, setIsViewLoading] = useState(false);

  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PRODUCT_MASTER_PERMISSIONS.category.create);
  const canUpdate = hasPermission(PRODUCT_MASTER_PERMISSIONS.category.update);
  const canDelete = hasPermission(PRODUCT_MASTER_PERMISSIONS.category.delete);
  const canManageFields = hasPermission('ADMIN_DYNAMIC_FIELDS_UPDATE');

  const definitionById = useMemo(() => {
    const map = new Map();
    fieldDefinitions.forEach((definition) => {
      const id = getDefinitionId(definition);
      if (id !== null && id !== undefined) {
        map.set(String(id), definition);
      }
    });
    return map;
  }, [fieldDefinitions]);

  const assignedDefinitionIds = useMemo(
    () =>
      new Set(
        categoryFields
          .map((mapping) => mapping?.attributeId)
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value))
      ),
    [categoryFields]
  );

  const filteredReusableFields = useMemo(() => {
    const search = fieldSearchQuery.trim().toLowerCase();
    return fieldDefinitions.filter((definition) => {
      const id = String(getDefinitionId(definition) || '');
      if (!id) return false;
      if (!readBoolean(definition?.active, true)) return false;
      if (assignedDefinitionIds.has(id)) return false;
      if (!search) return true;
      const haystack = [
        definition?.label,
        definition?.key,
        definition?.dataType,
        typeLabel(definition?.dataType),
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(search);
    });
  }, [assignedDefinitionIds, fieldDefinitions, fieldSearchQuery]);

  const assignedFields = useMemo(() => {
    return [...categoryFields]
      .sort((left, right) => {
        const leftOrder = Number.isFinite(Number(left?.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER;
        const rightOrder =
          Number.isFinite(Number(right?.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        const leftLabel = definitionById.get(String(left?.attributeId || ''))?.label || left?.label || left?.attributeKey || '';
        const rightLabel =
          definitionById.get(String(right?.attributeId || ''))?.label || right?.label || right?.attributeKey || '';
        return leftLabel.localeCompare(rightLabel);
      })
      .map((mapping) => {
        const definition = definitionById.get(String(mapping?.attributeId || '')) || null;
        return {
          mappingId: mapping.id,
          label: definition?.label || mapping?.label || mapping?.attributeKey || '-',
          type: typeLabel(definition?.dataType || mapping?.dataType),
          active: readBoolean(mapping?.active, true),
        };
      });
  }, [categoryFields, definitionById]);

  const loadData = async () => {
    setIsPageLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [categoriesResult, mainCategoriesResult] = await Promise.allSettled([
        listCategories(token),
        listMainCategories(token),
      ]);
      if (categoriesResult.status !== 'fulfilled') {
        throw categoriesResult.reason;
      }
      setItems(categoriesResult.value?.data || []);
      setMainCategories(mainCategoriesResult.status === 'fulfilled' ? mainCategoriesResult.value?.data || [] : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch categories.' });
    } finally {
      setIsPageLoading(false);
    }
  };

  const loadFieldDefinitions = async () => {
    const response = await listAttributeDefinitions(token);
    setFieldDefinitions(response?.data?.definitions || []);
  };

  const loadCategoryFields = async (categoryId) => {
    if (!categoryId) {
      setCategoryFields([]);
      return;
    }
    const response = await listAttributeMappings(token, { categoryId: Number(categoryId) });
    setCategoryFields(response?.data?.mappings || []);
  };

  const refreshFieldManager = async (categoryId = selectedCategory?.id) => {
    if (!categoryId) return;
    setIsFieldsLoading(true);
    try {
      await Promise.all([loadFieldDefinitions(), loadCategoryFields(categoryId)]);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to load product fields.' });
    } finally {
      setIsFieldsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = items.filter((item) => Number(item.active) === 1).length;
  const inactiveCount = Math.max(0, items.length - activeCount);
  const categoryPath = [selectedCategory?.mainCategoryName, selectedCategory?.name].filter(Boolean).join(' / ');
  const requestedOrdering = parseOrderingInput(form.ordering);
  const orderingConflict = useMemo(
    () =>
      findOrderingConflict({
        items,
        requestedOrder: requestedOrdering,
        currentItemId: editItem?.id,
        matchesScope: (item) => String(item.mainCategoryId ?? item.main_category_id ?? '') === String(form.mainCategoryId ?? ''),
      }),
    [editItem?.id, form.mainCategoryId, items, requestedOrdering]
  );
  const suggestedOrdering = useMemo(
    () =>
      findNextAvailableOrdering({
        items,
        currentItemId: editItem?.id,
        matchesScope: (item) => String(item.mainCategoryId ?? item.main_category_id ?? '') === String(form.mainCategoryId ?? ''),
      }),
    [editItem?.id, form.mainCategoryId, items]
  );
  const orderingWarning = buildOrderingWarning(requestedOrdering, orderingConflict, suggestedOrdering);

  const filteredItems = items
    .filter((item) => {
      const q = categorySearchQuery.trim().toLowerCase();
      if (!q) return true;
      const haystack = `${item.name || ''} ${item.mainCategoryName || item.main_category_name || ''}`.toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      const orderA = a.ordering != null ? Number(a.ordering) : Infinity;
      const orderB = b.ordering != null ? Number(b.ordering) : Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return (a.id ?? 0) - (b.id ?? 0);
    });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  const validate = (f) => {
    const errs = {};
    if (!f.name.trim()) errs.name = 'Name is required.';
    else if (f.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!f.mainCategoryId) errs.mainCategoryId = 'Main category is required.';
    if (f.ordering !== '' && f.ordering !== null) {
      const n = parseOrderingInput(f.ordering);
      if (Number.isNaN(n)) errs.ordering = 'Must be a whole number ≥ 1.';
    }
    if (f.path && !f.path.startsWith('/')) errs.path = 'Path must start with /';
    return errs;
  };

  const errors = validate(form);
  const fieldErr = (key) => touched[key] && errors[key];

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

  const handleEdit = (item) => {
    if (!canUpdate) {
      setMessage({ type: 'error', text: 'You do not have permission to update categories.' });
      return;
    }
    setEditItem(item);
    setForm({
      name: item.name || '',
      mainCategoryId: String(item.mainCategoryId ?? item.main_category_id ?? ''),
      categoryIcon: item.categoryIcon ?? item.category_icon ?? '',
      imageUrl: item.imageUrl ?? item.image_url ?? '',
      ordering: item.ordering != null ? String(item.ordering) : '',
      path: item.path ?? '',
      active: item.active != null ? String(Number(item.active) === 1 ? '1' : '0') : '1',
      hasSubCategory: item.hasSubCategory != null ? String(Number(item.hasSubCategory) === 1 ? '1' : '0') : '1',
    });
    setTouched({});
    setShowForm(true);
  };

  const closeFormModal = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(initialForm);
    setTouched({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ name: true, mainCategoryId: true, ordering: true, path: true });
    if (editItem ? !canUpdate : !canCreate) {
      setMessage({
        type: 'error',
        text: editItem ? 'You do not have permission to update categories.' : 'You do not have permission to create categories.',
      });
      return;
    }
    const submitErrors = validate(form);
    if (Object.keys(submitErrors).length > 0) {
      setMessage({ type: 'error', text: Object.values(submitErrors)[0] });
      return;
    }
    const payload = {
      name: form.name.trim(),
      mainCategoryId: Number(form.mainCategoryId),
      categoryIcon: form.categoryIcon || null,
      imageUrl: form.imageUrl || null,
      ordering: requestedOrdering,
      path: form.path || null,
      active: Number(form.active),
      hasSubCategory: Number(form.hasSubCategory),
    };
    try {
      setIsPageLoading(true);
      if (editItem) {
        await updateCategory(token, editItem.id, payload);
        setEditItem(null);
        setMessage({ type: 'success', text: 'Category updated.' });
      } else {
        await createCategory(token, payload);
        setMessage({ type: 'success', text: 'Category created.' });
      }
      setForm(initialForm);
      setShowForm(false);
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || (editItem ? 'Failed to update category.' : 'Failed to create category.') });
    } finally {
      setIsPageLoading(false);
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

  const resetFieldEditor = () => {
    setFieldEditor(initialFieldEditor);
    setFieldOptionDraft('');
    setFieldSearchQuery('');
    setSelectedExistingFieldId('');
  };

  const closeFieldManager = () => {
    setShowFieldManager(false);
    setSelectedCategory(null);
    setFieldDefinitions([]);
    setCategoryFields([]);
    setSelectedExistingFieldId('');
    setAddFieldMode('new');
    setFieldMessage({ type: 'info', text: '' });
    resetFieldEditor();
  };

  const openFieldManager = async (category) => {
    if (!canManageFields) {
      setFieldMessage({ type: 'error', text: 'You do not have permission to manage reusable fields.' });
      return;
    }
    setShowForm(false);
    setSelectedCategory(category);
    setShowFieldManager(true);
    setFieldMessage({ type: 'info', text: '' });
    setSelectedExistingFieldId('');
    setAddFieldMode('new');
    resetFieldEditor();
    setIsFieldsLoading(true);
    try {
      await Promise.all([loadFieldDefinitions(), loadCategoryFields(category?.id)]);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to load product fields.' });
    } finally {
      setIsFieldsLoading(false);
    }
  };

  const handleFieldEditorChange = (key, value) => {
    setFieldEditor((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddOption = () => {
    const raw = fieldOptionDraft.trim();
    if (!raw) return;
    const nextOptions = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!nextOptions.length) return;
    setFieldEditor((prev) => {
      const existing = new Set((prev.enumOptions || []).map((value) => value.toLowerCase()));
      const merged = [...(prev.enumOptions || [])];
      nextOptions.forEach((value) => {
        const normalized = value.toLowerCase();
        if (!existing.has(normalized)) {
          existing.add(normalized);
          merged.push(value);
        }
      });
      return { ...prev, enumOptions: merged };
    });
    setFieldOptionDraft('');
  };

  const handleRemoveOption = (option) => {
    setFieldEditor((prev) => ({
      ...prev,
      enumOptions: (prev.enumOptions || []).filter((item) => item !== option),
    }));
  };

  const buildDefinitionPayload = () => {
    const payload = {
      key: toFieldKey(fieldEditor.label),
      label: fieldEditor.label.trim(),
      dataType: fieldEditor.dataType,
      active: true,
    };
    if (fieldEditor.dataType === 'NUMBER' && fieldEditor.unit.trim()) {
      payload.unit = fieldEditor.unit.trim();
    }
    if (fieldEditor.dataType === 'ENUM' && fieldEditor.enumOptions.length > 0) {
      payload.options = { values: fieldEditor.enumOptions };
    }
    return payload;
  };

  const handleFieldSubmit = async (event) => {
    event.preventDefault();
    if (!canManageFields) {
      setFieldMessage({ type: 'error', text: 'You do not have permission to manage reusable fields.' });
      return;
    }
    if (!selectedCategory?.id) {
      setFieldMessage({ type: 'error', text: 'Select a category first.' });
      return;
    }

    const label = fieldEditor.label.trim();
    const normalizedKey = toFieldKey(label);

    if (!label) {
      setFieldMessage({ type: 'error', text: 'Field name is required.' });
      return;
    }

    if (!normalizedKey) {
      setFieldMessage({ type: 'error', text: 'Field name must contain letters or numbers.' });
      return;
    }

    if (fieldEditor.dataType === 'ENUM' && fieldEditor.enumOptions.length === 0) {
      setFieldMessage({ type: 'error', text: 'Add at least one dropdown option.' });
      return;
    }

    const maxSortOrder = categoryFields.reduce((max, mapping) => {
      const numeric = Number(mapping?.sortOrder);
      return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
    }, 0);

    setIsSavingField(true);
    setFieldMessage({ type: 'info', text: '' });

    try {
      const definitionResponse = await createAttributeDefinition(token, buildDefinitionPayload());
      const attributeId = getCreatedDefinitionId(definitionResponse);
      if (!attributeId) {
        throw new Error('Failed to create the field definition.');
      }

      await createAttributeMapping(token, {
        attributeId: Number(attributeId),
        categoryId: Number(selectedCategory.id),
        required: false,
        active: true,
        filterable: false,
        searchable: false,
        sortOrder: maxSortOrder + 1,
      });
      setFieldMessage({ type: 'success', text: 'Field added to this category.' });

      resetFieldEditor();
      setAddFieldMode('existing');
      await refreshFieldManager(selectedCategory.id);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to save the field.' });
    } finally {
      setIsSavingField(false);
    }
  };

  const handleAddExistingField = async () => {
    if (!canManageFields) {
      setFieldMessage({ type: 'error', text: 'You do not have permission to manage reusable fields.' });
      return;
    }
    if (!selectedCategory?.id) {
      setFieldMessage({ type: 'error', text: 'Select a category first.' });
      return;
    }

    const normalizedId = String(selectedExistingFieldId || '');
    if (!normalizedId || assignedDefinitionIds.has(normalizedId)) {
      setFieldMessage({ type: 'error', text: 'Select a field to add.' });
      return;
    }

    const maxSortOrder = categoryFields.reduce((max, mapping) => {
      const numeric = Number(mapping?.sortOrder);
      return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
    }, 0);

    setIsSavingField(true);
    setFieldMessage({ type: 'info', text: '' });

    try {
      await createAttributeMapping(token, {
        attributeId: Number(normalizedId),
        categoryId: Number(selectedCategory.id),
        required: false,
        active: true,
        filterable: false,
        searchable: false,
        sortOrder: maxSortOrder + 1,
      });
      setSelectedExistingFieldId('');
      setFieldMessage({ type: 'success', text: 'Field added to this category.' });
      await refreshFieldManager(selectedCategory.id);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to add the field.' });
    } finally {
      setIsSavingField(false);
    }
  };

  const handleRemoveField = async (mapping) => {
    if (!canManageFields) {
      setFieldMessage({ type: 'error', text: 'You do not have permission to manage reusable fields.' });
      return;
    }
    if (!window.confirm('Remove this field from the selected category?')) {
      return;
    }

    try {
      setIsSavingField(true);
      await deleteAttributeMapping(token, mapping.id);
      setFieldMessage({ type: 'success', text: 'Field removed from this category.' });
      await refreshFieldManager(selectedCategory?.id);
    } catch (error) {
      setFieldMessage({ type: 'error', text: error.message || 'Failed to remove the field.' });
    } finally {
      setIsSavingField(false);
    }
  };

  const handleView = async (item) => {
    setIsViewLoading(true);
    setViewItem(null);
    setShowForm(false);
    try {
      const [categoryResponse, mappingsResponse] = await Promise.allSettled([
        getCategory(token, item.id),
        listAttributeMappings(token, { categoryId: item.id }),
      ]);
      const baseData = categoryResponse.status === 'fulfilled'
        ? (categoryResponse.value?.data ?? { category: item, subCategories: [] })
        : { category: item, subCategories: [] };
      const attributeMappings = mappingsResponse.status === 'fulfilled'
        ? (mappingsResponse.value?.data?.mappings || [])
        : [];
      setViewItem({ ...baseData, attributeMappings });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load category details.' });
    } finally {
      setIsViewLoading(false);
    }
  };

  const renderViewPanel = () => {
    if (isViewLoading) {
      return (
        <div className="mv-panel card">
          <p className="mv-loading">Loading details…</p>
        </div>
      );
    }
    if (!viewItem) return null;

    const cat = viewItem.category ?? {};
    const subCategories = Array.isArray(viewItem.subCategories) ? viewItem.subCategories : [];
    const attrMappings = Array.isArray(viewItem.attributeMappings) ? viewItem.attributeMappings : [];
    const mainCatName = cat.mainCategoryName || mainCategories.find((mc) => mc.id === cat.mainCategoryId)?.name || '-';

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
              <button type="button" className="ghost-btn small" onClick={() => { setViewItem(null); openFieldManager(cat); }}>
                Manage Fields
              </button>
            )}
            {canUpdate && (
              <button type="button" className="ghost-btn small" onClick={() => { setViewItem(null); handleEdit(cat); }}>
                Edit
              </button>
            )}
          </div>
        </div>

        {/* parent chain */}
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
            <div className="mv-detail-row"><span className="mv-detail-label">Has Sub-categories</span><span className="mv-detail-value">{cat.hasSubCategory === 1 ? 'Yes' : 'No'}</span></div>
            <div className="mv-detail-row"><span className="mv-detail-label">Status</span><span className="mv-detail-value">{Number(cat.active) === 1 ? 'Active' : 'Inactive'}</span></div>
          </div>
        </div>

        {/* images */}
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
            <p className="mv-empty">No specification fields. Use <strong>Manage Fields</strong> to add fields.</p>
          ) : (
            <table className="admin-table mv-spec-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Field Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Status</th>
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

  return (
    <div className="category-page">
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={closeFormModal}>
          <form
            className="admin-modal category-create-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">{editItem ? 'Edit category' : 'Create category'}</h3>
              <button type="button" className="ghost-btn small" onClick={closeFormModal}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className={`field${fieldErr('name') ? ' field-error' : ''}`}>
                <span>Name <span className="field-required">*</span></span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={fieldErr('name') ? 'input-error' : ''}
                  placeholder="e.g. Soft Drink"
                />
                {fieldErr('name') && <span className="field-error-msg">{errors.name}</span>}
              </label>
              <label className={`field${fieldErr('mainCategoryId') ? ' field-error' : ''}`}>
                <span>Main category <span className="field-required">*</span></span>
                <select
                  value={form.mainCategoryId}
                  onChange={(event) => handleChange('mainCategoryId', event.target.value)}
                  onBlur={() => handleBlur('mainCategoryId')}
                  className={fieldErr('mainCategoryId') ? 'input-error' : ''}
                >
                  <option value="">Select main category</option>
                  {mainCategories.map((mainCategory) => (
                    <option key={mainCategory.id} value={mainCategory.id}>
                      {mainCategory.name}
                    </option>
                  ))}
                </select>
                {fieldErr('mainCategoryId') && <span className="field-error-msg">{errors.mainCategoryId}</span>}
              </label>
              <label className="field">
                <span>Has sub-categories</span>
                <select
                  value={form.hasSubCategory}
                  onChange={(event) => handleChange('hasSubCategory', event.target.value)}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>
              <label className={`field${fieldErr('ordering') ? ' field-error' : ''}`}>
                <span>Ordering</span>
                <input
                  type="number"
                  value={form.ordering}
                  onChange={(event) => handleChange('ordering', event.target.value)}
                  onBlur={() => handleBlur('ordering')}
                  className={fieldErr('ordering') ? 'input-error' : ''}
                  placeholder="1"
                  min="1"
                  step="1"
                />
                {fieldErr('ordering')
                  ? <span className="field-error-msg">{errors.ordering}</span>
                  : orderingWarning ? <span className="field-help field-warning">{orderingWarning}</span> : null}
              </label>
              <label className={`field${fieldErr('path') ? ' field-error' : ''}`}>
                <span>Path</span>
                <input
                  type="text"
                  value={form.path}
                  onChange={(event) => handleChange('path', event.target.value)}
                  onBlur={() => handleBlur('path')}
                  className={fieldErr('path') ? 'input-error' : ''}
                  placeholder="/soft-drinks"
                />
                {fieldErr('path') && <span className="field-error-msg">{errors.path}</span>}
              </label>
              <label className="field">
                <span>Active</span>
                <select value={form.active} onChange={(event) => handleChange('active', event.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Icon URL</span>
                <input
                  type="text"
                  value={form.categoryIcon}
                  onChange={(event) => handleChange('categoryIcon', event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="field">
                <span>Image URL</span>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(event) => handleChange('imageUrl', event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
            <button type="submit" className="primary-btn full" disabled={isPageLoading}>
              {isPageLoading ? 'Saving...' : editItem ? 'Update category' : 'Save category'}
            </button>
          </form>
        </div>
      ) : null}
      {showFieldManager && selectedCategory ? (
        <div className="admin-modal-backdrop" onClick={closeFieldManager}>
          <div
            className="admin-modal category-field-manager-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h3 className="panel-subheading">Manage Fields</h3>
                <p className="panel-subtitle">{categoryPath || selectedCategory.name}</p>
              </div>
              <button type="button" className="ghost-btn small" onClick={closeFieldManager}>
                Close
              </button>
            </div>
            <div className="admin-modal-body category-field-manager-stack">
              <Banner message={fieldMessage} />

              <div className="panel card">
                <div className="category-field-add">
                  <h4 className="panel-subheading">Add field</h4>
                  <p className="panel-subtitle">Choose to create a new field or reuse one that already exists.</p>

                  <div className="field field-span">
                    <span>Choose an option</span>
                    <div className="inline-radio-row">
                      <label className={`chip-radio${addFieldMode === 'existing' ? ' is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="addFieldMode"
                          value="existing"
                          checked={addFieldMode === 'existing'}
                          onChange={() => setAddFieldMode('existing')}
                        />
                        <span>Use existing field</span>
                      </label>
                      <label className={`chip-radio${addFieldMode === 'new' ? ' is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="addFieldMode"
                          value="new"
                          checked={addFieldMode === 'new'}
                          onChange={() => setAddFieldMode('new')}
                        />
                        <span>Create new field</span>
                      </label>
                    </div>
                  </div>

                  {addFieldMode === 'existing' ? (
                    <div className="field-grid">
                      <label className="field">
                        <span>Select field</span>
                        <select
                          value={selectedExistingFieldId}
                          onChange={(event) => setSelectedExistingFieldId(event.target.value)}
                        >
                          <option value="">Select a field</option>
                          {filteredReusableFields.map((definition) => {
                            const id = String(getDefinitionId(definition) || '');
                            const options = getDefinitionOptions(definition);
                            return (
                              <option key={id} value={id}>
                                {definition.label || '-'} · {typeLabel(definition?.dataType)}
                                {definition?.unit ? ` · ${definition.unit}` : ''}
                                {options.length ? ` · ${options.length} options` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <div className="category-field-actions">
                        <button
                          type="button"
                          className="primary-btn compact"
                          onClick={handleAddExistingField}
                          disabled={isSavingField}
                        >
                          {isSavingField ? 'Adding...' : 'Add to category'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form className="category-field-minimal-form" onSubmit={handleFieldSubmit}>
                      <div className="field-grid">
                        <label className="field">
                          <span>Field name</span>
                          <input
                            type="text"
                            value={fieldEditor.label}
                            onChange={(event) => handleFieldEditorChange('label', event.target.value)}
                            placeholder="e.g. Brand"
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Field type</span>
                          <select
                            value={fieldEditor.dataType}
                            onChange={(event) => handleFieldEditorChange('dataType', event.target.value)}
                          >
                            {simpleFieldTypes.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {fieldEditor.dataType === 'NUMBER' ? (
                          <label className="field">
                            <span>Unit</span>
                            <input
                              type="text"
                              value={fieldEditor.unit}
                              onChange={(event) => handleFieldEditorChange('unit', event.target.value)}
                              placeholder="e.g. ml, L, %"
                            />
                          </label>
                        ) : null}
                        {fieldEditor.dataType === 'ENUM' ? (
                          <div className="field field-span">
                            <span>Dropdown options</span>
                            <div className="inline-row">
                              <input
                                type="text"
                                value={fieldOptionDraft}
                                onChange={(event) => setFieldOptionDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleAddOption();
                                  }
                                }}
                                placeholder="Add options separated by commas"
                              />
                              <button type="button" className="ghost-btn small" onClick={handleAddOption}>
                                Add
                              </button>
                            </div>
                            {fieldEditor.enumOptions.length > 0 ? (
                              <div className="tag-row">
                                {fieldEditor.enumOptions.map((option) => (
                                  <span className="tag" key={option}>
                                    {option}
                                    <button type="button" onClick={() => handleRemoveOption(option)}>
                                      x
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="field-help">These values will appear in the product form dropdown.</p>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className="category-field-actions">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => {
                            resetFieldEditor();
                            setAddFieldMode('new');
                          }}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="primary-btn compact" disabled={isSavingField}>
                          {isSavingField ? 'Saving...' : 'Create & add field'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="panel-divider" />

                <div>
                  <div className="panel-split">
                    <div>
                      <h3 className="panel-subheading">Fields in this category</h3>
                      <p className="panel-subtitle">These fields will appear on the product form when this category is selected.</p>
                    </div>
                    <span className="pill-label">{assignedFields.length} field{assignedFields.length === 1 ? '' : 's'}</span>
                  </div>

                  {isFieldsLoading ? (
                    <p className="empty-state">Loading fields...</p>
                  ) : assignedFields.length === 0 ? (
                    <p className="empty-state">No fields yet. Add fields so products in this category collect the right information.</p>
                  ) : (
                    <div className="category-field-chip-row">
                      {assignedFields.map((field) => (
                        <div
                          key={field.mappingId}
                          className={`category-field-chip${field.active ? '' : ' is-inactive'}`}
                          title={field.type}
                        >
                          <span>{field.label}</span>
                          <button
                            type="button"
                            className="category-field-chip-remove"
                            onClick={() => handleRemoveField({ id: field.mappingId })}
                            disabled={isSavingField}
                            aria-label={`Remove ${field.label}`}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
                  placeholder="Search"
                  value={categorySearchQuery}
                  onChange={(event) => { setCategorySearchQuery(event.target.value); setPage(1); }}
                  aria-label="Search categories"
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
              {canCreate ? (
                <button
                  type="button"
                  className="gsc-create-btn"
                  onClick={() => {
                    if (!showForm) {
                      setEditItem(null);
                      setForm(initialForm);
                    }
                    setShowForm((prev) => !prev);
                  }}
                  title="Create category"
                  aria-label="Create category"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              ) : null}
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
                    <th>Main category</th>
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
                            actions.push({ label: 'Manage Fields', onClick: () => openFieldManager(item) });
                          }
                          if (canUpdate) {
                            actions.push({ label: 'Edit', onClick: () => handleEdit(item) });
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

        {/* ── View panel ── */}
        {renderViewPanel()}
      </div>
    </div>
  );
}

export default CategoryPage;
