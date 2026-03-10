import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import {
  createAttributeDefinition,
  createAttributeMapping,
  createCategory,
  deleteAttributeMapping,
  deleteCategory,
  listAttributeDefinitions,
  listAttributeMappings,
  listCategories,
  listMainCategories,
  updateCategory,
} from '../services/adminApi';

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
      const [categories, mainCategoryList] = await Promise.all([
        listCategories(token),
        listMainCategories(token),
      ]);
      setItems(categories?.data || []);
      setMainCategories(mainCategoryList?.data || []);
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

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = (item) => {
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
    setShowForm(true);
  };

  const closeFormModal = () => {
    setShowForm(false);
    setEditItem(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.mainCategoryId) {
      setMessage({ type: 'error', text: 'Name and main category are required.' });
      return;
    }
    const payload = {
      name: form.name.trim(),
      mainCategoryId: Number(form.mainCategoryId),
      categoryIcon: form.categoryIcon || null,
      imageUrl: form.imageUrl || null,
      ordering: form.ordering ? Number(form.ordering) : null,
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
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="e.g. Soft Drink"
                  required
                />
              </label>
              <label className="field">
                <span>Main category</span>
                <select
                  value={form.mainCategoryId}
                  onChange={(event) => handleChange('mainCategoryId', event.target.value)}
                  required
                >
                  <option value="">Select main category</option>
                  {mainCategories.map((mainCategory) => (
                    <option key={mainCategory.id} value={mainCategory.id}>
                      {mainCategory.name}
                    </option>
                  ))}
                </select>
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
              <label className="field">
                <span>Ordering</span>
                <input
                  type="number"
                  value={form.ordering}
                  onChange={(event) => handleChange('ordering', event.target.value)}
                  placeholder="1"
                />
              </label>
              <label className="field">
                <span>Path</span>
                <input
                  type="text"
                  value={form.path}
                  onChange={(event) => handleChange('path', event.target.value)}
                  placeholder="/soft-drinks"
                />
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
      <div className="panel-grid">
        <div className="panel card">
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
                  onChange={(event) => setCategorySearchQuery(event.target.value)}
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
            </div>
          </div>
          {items.length === 0 ? (
            <p className="empty-state">No categories yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Main category</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((item) => {
                      const q = categorySearchQuery.trim().toLowerCase();
                      if (!q) return true;
                      const haystack = `${item.name || ''} ${item.mainCategoryName || ''}`.toLowerCase();
                      return haystack.includes(q);
                    })
                    .map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.mainCategoryName || '-'}</td>
                      <td>{Number(item.active) === 1 ? 'Yes' : 'No'}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={() => openFieldManager(item)}>
                          Manage Fields
                        </button>
                        <button type="button" className="ghost-btn small" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                        <button type="button" className="ghost-btn small" onClick={() => handleDelete(item.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryPage;
