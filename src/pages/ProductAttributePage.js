import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner } from '../components';
import {
  createAttributeDefinition,
  createAttributeMapping,
  deleteAttributeDefinition,
  deleteAttributeMapping,
  listAttributeDefinitions,
  listAttributeMappings,
  listCategories,
  listMainCategories,
  listSubCategories,
  updateAttributeDefinition,
  updateAttributeMapping,
} from '../services/adminApi';

const definitionInitial = {
  key: '',
  label: '',
  dataType: 'STRING',
  unit: '',
  description: '',
  active: true,
  enumOptions: [],
  minLength: '',
  maxLength: '',
  minValue: '',
  maxValue: '',
  minItems: '',
  maxItems: '',
  pattern: '',
};

const mappingInitial = {
  attributeId: '',
  scope: 'sub',
  mainCategoryId: '',
  categoryId: '',
  subCategoryId: '',
  required: false,
  filterable: false,
  searchable: false,
  sortOrder: '',
  defaultValueText: '',
  defaultValueBool: '',
  defaultValueList: '',
  defaultValueJson: '',
  uiConfig: '',
  active: true,
};

const filterInitial = {
  mainCategoryId: '',
  categoryId: '',
  subCategoryId: '',
  active: '',
};

const dataTypes = [
  { value: 'STRING', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes/No' },
  { value: 'DATE', label: 'Date' },
  { value: 'ENUM', label: 'Single choice (dropdown)' },
  { value: 'LIST', label: 'Multiple values (list)' },
  { value: 'OBJECT', label: 'Custom object (advanced)' },
];

const typeLabel = (value) => dataTypes.find((item) => item.value === value)?.label || value;

const toKey = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const toInteger = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.trunc(num);
};

const toInputValue = (value) => (value === null || value === undefined ? '' : String(value));

function ProductAttributePage({ token }) {
  const [definitions, setDefinitions] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [definitionForm, setDefinitionForm] = useState(definitionInitial);
  const [mappingForm, setMappingForm] = useState(mappingInitial);
  const [filterForm, setFilterForm] = useState(filterInitial);
  const [editingDefinitionId, setEditingDefinitionId] = useState(null);
  const [editingMappingId, setEditingMappingId] = useState(null);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [showDefinitionAdvanced, setShowDefinitionAdvanced] = useState(false);
  const [showMappingAdvanced, setShowMappingAdvanced] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [optionDraft, setOptionDraft] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const didInitRef = useRef(false);

  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterSubCategories, setFilterSubCategories] = useState([]);

  const definitionMap = useMemo(() => {
    const map = new Map();
    definitions.forEach((definition) => {
      map.set(definition.id, definition);
    });
    return map;
  }, [definitions]);

  const selectedDefinition = useMemo(() => {
    const id = Number(mappingForm.attributeId);
    if (!id) return null;
    return definitionMap.get(id) || null;
  }, [definitionMap, mappingForm.attributeId]);

  const loadDefinitions = async () => {
    const response = await listAttributeDefinitions(token);
    setDefinitions(response?.data?.definitions || []);
  };

  const loadMappings = async (overrideFilters) => {
    const source = overrideFilters || filterForm;
    const filters = {};
    if (source.mainCategoryId) filters.mainCategoryId = Number(source.mainCategoryId);
    if (source.categoryId) filters.categoryId = Number(source.categoryId);
    if (source.subCategoryId) filters.subCategoryId = Number(source.subCategoryId);
    if (source.active === 'true') filters.active = true;
    if (source.active === 'false') filters.active = false;
    const response = await listAttributeMappings(token, filters);
    setMappings(response?.data?.mappings || []);
  };

  const loadMainCategories = async () => {
    const response = await listMainCategories(token);
    setMainCategories(response?.data || []);
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    Promise.all([loadDefinitions(), loadMappings(), loadMainCategories()])
      .catch((error) => {
        setMessage({ type: 'error', text: error.message || 'Failed to load attribute data.' });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mappingForm.mainCategoryId) {
      setCategories([]);
      setSubCategories([]);
      return;
    }
    listCategories(token, mappingForm.mainCategoryId)
      .then((response) => setCategories(response?.data || []))
      .catch(() => setCategories([]));
  }, [mappingForm.mainCategoryId, token]);

  useEffect(() => {
    if (!mappingForm.categoryId) {
      setSubCategories([]);
      return;
    }
    listSubCategories(token, mappingForm.categoryId)
      .then((response) => setSubCategories(response?.data || []))
      .catch(() => setSubCategories([]));
  }, [mappingForm.categoryId, token]);

  useEffect(() => {
    if (!filterForm.mainCategoryId) {
      setFilterCategories([]);
      setFilterSubCategories([]);
      return;
    }
    listCategories(token, filterForm.mainCategoryId)
      .then((response) => setFilterCategories(response?.data || []))
      .catch(() => setFilterCategories([]));
  }, [filterForm.mainCategoryId, token]);

  useEffect(() => {
    if (!filterForm.categoryId) {
      setFilterSubCategories([]);
      return;
    }
    listSubCategories(token, filterForm.categoryId)
      .then((response) => setFilterSubCategories(response?.data || []))
      .catch(() => setFilterSubCategories([]));
  }, [filterForm.categoryId, token]);

  useEffect(() => {
    setMappingForm((prev) => ({
      ...prev,
      defaultValueText: '',
      defaultValueBool: '',
      defaultValueList: '',
      defaultValueJson: '',
    }));
  }, [mappingForm.attributeId]);

  const addEnumOption = () => {
    const raw = optionDraft.trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setDefinitionForm((prev) => {
      const nextOptions = [...prev.enumOptions];
      const existing = new Set(nextOptions.map((value) => value.toLowerCase()));
      parts.forEach((value) => {
        const key = value.toLowerCase();
        if (!existing.has(key)) {
          existing.add(key);
          nextOptions.push(value);
        }
      });
      return { ...prev, enumOptions: nextOptions };
    });
    setOptionDraft('');
  };

  const removeEnumOption = (option) => {
    setDefinitionForm((prev) => ({
      ...prev,
      enumOptions: prev.enumOptions.filter((item) => item !== option),
    }));
  };

  const buildDefinitionPayload = () => {
    const payload = {
      key: definitionForm.key.trim(),
      label: definitionForm.label.trim(),
      dataType: definitionForm.dataType,
      unit: definitionForm.unit.trim() || null,
      description: definitionForm.description.trim() || null,
      active: definitionForm.active,
    };

    const options = {};
    const validation = {};

    if (definitionForm.dataType === 'ENUM' && definitionForm.enumOptions.length > 0) {
      options.values = definitionForm.enumOptions;
    }

    if (definitionForm.dataType === 'STRING') {
      const minLength = toInteger(definitionForm.minLength);
      const maxLength = toInteger(definitionForm.maxLength);
      if (minLength !== null) validation.minLength = minLength;
      if (maxLength !== null) validation.maxLength = maxLength;
      if (definitionForm.pattern.trim()) validation.regex = definitionForm.pattern.trim();
    }

    if (definitionForm.dataType === 'NUMBER') {
      const min = toNumber(definitionForm.minValue);
      const max = toNumber(definitionForm.maxValue);
      if (min !== null) validation.min = min;
      if (max !== null) validation.max = max;
    }

    if (definitionForm.dataType === 'LIST') {
      const minItems = toInteger(definitionForm.minItems);
      const maxItems = toInteger(definitionForm.maxItems);
      if (minItems !== null) validation.minItems = minItems;
      if (maxItems !== null) validation.maxItems = maxItems;
    }

    if (Object.keys(options).length) payload.options = options;
    if (Object.keys(validation).length) payload.validation = validation;

    return payload;
  };

  const buildDefaultValue = () => {
    if (!selectedDefinition) return { value: null, error: null };
    const type = selectedDefinition.dataType || 'STRING';

    if (type === 'BOOLEAN') {
      if (mappingForm.defaultValueBool === '') return { value: null, error: null };
      return { value: mappingForm.defaultValueBool === 'true', error: null };
    }

    if (type === 'NUMBER') {
      if (mappingForm.defaultValueText === '') return { value: null, error: null };
      const numberValue = Number(mappingForm.defaultValueText);
      if (Number.isNaN(numberValue)) {
        return { value: null, error: 'Default value must be a number.' };
      }
      return { value: numberValue, error: null };
    }

    if (type === 'ENUM' || type === 'STRING' || type === 'DATE') {
      const textValue = mappingForm.defaultValueText.trim();
      if (!textValue) return { value: null, error: null };
      return { value: textValue, error: null };
    }

    if (type === 'LIST') {
      const raw = mappingForm.defaultValueList.trim();
      if (!raw) return { value: null, error: null };
      if (raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            return { value: null, error: 'Default list must be a JSON array.' };
          }
          return { value: parsed, error: null };
        } catch (error) {
          return { value: null, error: 'Default list must be a JSON array or comma-separated values.' };
        }
      }
      const items = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (!items.length) return { value: null, error: null };
      return { value: items, error: null };
    }

    if (type === 'OBJECT') {
      const raw = mappingForm.defaultValueJson.trim();
      if (!raw) return { value: null, error: null };
      try {
        const parsed = JSON.parse(raw);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
          return { value: null, error: 'Default value must be a JSON object.' };
        }
        return { value: parsed, error: null };
      } catch (error) {
        return { value: null, error: 'Default value must be valid JSON.' };
      }
    }

    return { value: null, error: null };
  };

  const buildUiConfig = () => {
    const raw = mappingForm.uiConfig.trim();
    if (!raw) return { config: null, error: null };
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        return { config: null, error: 'UI config must be a JSON object.' };
      }
      return { config: parsed, error: null };
    } catch (error) {
      return { config: null, error: 'UI config must be valid JSON.' };
    }
  };

  const handleDefinitionSubmit = async (event) => {
    event.preventDefault();
    if (!definitionForm.label.trim()) {
      setMessage({ type: 'error', text: 'Attribute label is required.' });
      return;
    }
    if (!definitionForm.key.trim()) {
      setMessage({ type: 'error', text: 'Attribute key is required.' });
      return;
    }
    if (definitionForm.dataType === 'ENUM' && definitionForm.enumOptions.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one option for dropdown attributes.' });
      return;
    }

    const payload = buildDefinitionPayload();
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      if (editingDefinitionId) {
        await updateAttributeDefinition(token, editingDefinitionId, payload);
        setMessage({ type: 'success', text: 'Attribute definition updated.' });
      } else {
        await createAttributeDefinition(token, payload);
        setMessage({ type: 'success', text: 'Attribute definition created.' });
      }
      setDefinitionForm(definitionInitial);
      setEditingDefinitionId(null);
      setShowDefinitionForm(false);
      setShowDefinitionAdvanced(false);
      setKeyEdited(false);
      setOptionDraft('');
      await Promise.all([loadDefinitions(), loadMappings()]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save attribute definition.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingSubmit = async (event) => {
    event.preventDefault();
    if (!mappingForm.attributeId) {
      setMessage({ type: 'error', text: 'Select an attribute to map.' });
      return;
    }

    const scope = mappingForm.scope;
    if (scope === 'main' && !mappingForm.mainCategoryId) {
      setMessage({ type: 'error', text: 'Select a main category.' });
      return;
    }
    if (scope === 'category' && (!mappingForm.mainCategoryId || !mappingForm.categoryId)) {
      setMessage({ type: 'error', text: 'Select a main category and category.' });
      return;
    }
    if (
      scope === 'sub' &&
      (!mappingForm.mainCategoryId || !mappingForm.categoryId || !mappingForm.subCategoryId)
    ) {
      setMessage({ type: 'error', text: 'Select a main category, category, and sub-category.' });
      return;
    }

    const payload = {
      attributeId: Number(mappingForm.attributeId),
      required: Boolean(mappingForm.required),
      filterable: Boolean(mappingForm.filterable),
      searchable: Boolean(mappingForm.searchable),
      active: Boolean(mappingForm.active),
    };

    const sortOrder = toInteger(mappingForm.sortOrder);
    if (sortOrder !== null) payload.sortOrder = sortOrder;

    if (scope === 'main') payload.mainCategoryId = Number(mappingForm.mainCategoryId);
    if (scope === 'category') payload.categoryId = Number(mappingForm.categoryId);
    if (scope === 'sub') payload.subCategoryId = Number(mappingForm.subCategoryId);

    const { value, error } = buildDefaultValue();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }
    if (value !== null) payload.defaultValue = value;

    const uiConfig = buildUiConfig();
    if (uiConfig.error) {
      setMessage({ type: 'error', text: uiConfig.error });
      return;
    }
    if (uiConfig.config !== null) payload.uiConfig = uiConfig.config;

    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      if (editingMappingId) {
        await updateAttributeMapping(token, editingMappingId, payload);
        setMessage({ type: 'success', text: 'Attribute mapping updated.' });
      } else {
        await createAttributeMapping(token, payload);
        setMessage({ type: 'success', text: 'Attribute mapping created.' });
      }
      setMappingForm(mappingInitial);
      setEditingMappingId(null);
      setShowMappingForm(false);
      setShowMappingAdvanced(false);
      await loadMappings();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save attribute mapping.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDefinition = async (id) => {
    try {
      setIsLoading(true);
      await deleteAttributeDefinition(token, id);
      await Promise.all([loadDefinitions(), loadMappings()]);
      setMessage({ type: 'success', text: 'Attribute definition deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete attribute definition.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMapping = async (id) => {
    try {
      setIsLoading(true);
      await deleteAttributeMapping(token, id);
      await loadMappings();
      setMessage({ type: 'success', text: 'Attribute mapping deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete attribute mapping.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDefinition = (definition) => {
    const validation = definition.validation || {};
    const options = definition.options || {};
    setDefinitionForm({
      key: definition.key || '',
      label: definition.label || '',
      dataType: definition.dataType || 'STRING',
      unit: definition.unit || '',
      description: definition.description || '',
      active: definition.active !== false,
      enumOptions: Array.isArray(options.values) ? options.values : [],
      minLength: toInputValue(validation.minLength),
      maxLength: toInputValue(validation.maxLength),
      minValue: toInputValue(validation.min),
      maxValue: toInputValue(validation.max),
      minItems: toInputValue(validation.minItems),
      maxItems: toInputValue(validation.maxItems),
      pattern: validation.regex || '',
    });
    setEditingDefinitionId(definition.id);
    setShowDefinitionForm(true);
    setShowDefinitionAdvanced(Boolean(validation.regex));
    setKeyEdited(true);
    setOptionDraft('');
  };

  const handleEditMapping = (mapping) => {
    const type = mapping.dataType || definitionMap.get(mapping.attributeId)?.dataType || 'STRING';
    const defaultValue = mapping.defaultValue;
    const defaults = {
      defaultValueText: '',
      defaultValueBool: '',
      defaultValueList: '',
      defaultValueJson: '',
    };

    if (type === 'BOOLEAN') {
      if (defaultValue === true) defaults.defaultValueBool = 'true';
      if (defaultValue === false) defaults.defaultValueBool = 'false';
    } else if (type === 'LIST') {
      if (Array.isArray(defaultValue)) {
        defaults.defaultValueList = defaultValue.join(', ');
      } else if (defaultValue !== null && defaultValue !== undefined) {
        defaults.defaultValueList = String(defaultValue);
      }
    } else if (type === 'OBJECT') {
      if (defaultValue) {
        try {
          defaults.defaultValueJson = JSON.stringify(defaultValue, null, 2);
        } catch (error) {
          defaults.defaultValueJson = '';
        }
      }
    } else if (defaultValue !== null && defaultValue !== undefined) {
      defaults.defaultValueText = String(defaultValue);
    }

    const uiConfig = mapping.uiConfig ? JSON.stringify(mapping.uiConfig, null, 2) : '';
    const scope = mapping.subCategoryId ? 'sub' : mapping.categoryId ? 'category' : 'main';
    setMappingForm({
      attributeId: mapping.attributeId ? String(mapping.attributeId) : '',
      scope,
      mainCategoryId: mapping.mainCategoryId ? String(mapping.mainCategoryId) : '',
      categoryId: mapping.categoryId ? String(mapping.categoryId) : '',
      subCategoryId: mapping.subCategoryId ? String(mapping.subCategoryId) : '',
      required: Boolean(mapping.required),
      filterable: Boolean(mapping.filterable),
      searchable: Boolean(mapping.searchable),
      sortOrder: toInputValue(mapping.sortOrder),
      uiConfig,
      active: mapping.active !== false,
      ...defaults,
    });
    setEditingMappingId(mapping.id);
    setShowMappingForm(true);
    setShowMappingAdvanced(Boolean(uiConfig || type === 'OBJECT'));
  };

  const handleFilterChange = (key, value) => {
    setFilterForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mainCategoryId') {
        next.categoryId = '';
        next.subCategoryId = '';
      }
      if (key === 'categoryId') {
        next.subCategoryId = '';
      }
      return next;
    });
  };

  const resetFilter = () => {
    setFilterForm(filterInitial);
    loadMappings(filterInitial).catch(() => {});
  };

  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);
      await loadMappings();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load mappings.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await Promise.all([loadDefinitions(), loadMappings(), loadMainCategories()]);
      setMessage({ type: 'success', text: 'Attribute data refreshed.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to refresh attribute data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const scopeLabel = (mapping) => {
    if (mapping.subCategoryId) return `Sub-category #${mapping.subCategoryId}`;
    if (mapping.categoryId) return `Category #${mapping.categoryId}`;
    if (mapping.mainCategoryId) return `Main category #${mapping.mainCategoryId}`;
    return 'Unscoped';
  };

  const openDefinitionForm = () => {
    setDefinitionForm(definitionInitial);
    setEditingDefinitionId(null);
    setShowDefinitionForm(true);
    setShowDefinitionAdvanced(false);
    setKeyEdited(false);
    setOptionDraft('');
  };

  const openMappingForm = () => {
    setMappingForm(mappingInitial);
    setEditingMappingId(null);
    setShowMappingForm(true);
    setShowMappingAdvanced(false);
  };

  const selectedType = selectedDefinition?.dataType || 'STRING';
  const selectedOptions = Array.isArray(selectedDefinition?.options?.values)
    ? selectedDefinition.options.values
    : null;

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Product attributes</h2>
          <p className="panel-subtitle">Create attributes and map them to categories.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={handleRefresh} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <Banner message={message} />

      {showDefinitionForm ? (
        <div className="admin-modal-backdrop" onClick={() => setShowDefinitionForm(false)}>
          <form
            className="admin-modal"
            onSubmit={handleDefinitionSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">
                {editingDefinitionId ? 'Edit attribute definition' : 'Create attribute definition'}
              </h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowDefinitionForm(false)}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Label</span>
                <input
                  type="text"
                  value={definitionForm.label}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDefinitionForm((prev) => ({
                      ...prev,
                      label: value,
                      key: keyEdited ? prev.key : toKey(value),
                    }));
                  }}
                  placeholder="e.g. Crop type"
                  required
                />
              </label>
              <label className="field">
                <span>Data type</span>
                <select
                  value={definitionForm.dataType}
                  onChange={(event) =>
                    setDefinitionForm((prev) => ({ ...prev, dataType: event.target.value }))
                  }
                >
                  {dataTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-span">
                <span>Key</span>
                <div className="inline-row">
                  <input
                    type="text"
                    value={definitionForm.key}
                    onChange={(event) => {
                      setDefinitionForm((prev) => ({ ...prev, key: event.target.value }));
                      setKeyEdited(true);
                    }}
                    placeholder="e.g. crop_type"
                  />
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => {
                      setDefinitionForm((prev) => ({ ...prev, key: toKey(prev.label || '') }));
                      setKeyEdited(false);
                    }}
                  >
                    Auto
                  </button>
                </div>
                <p className="field-help">Auto-generated from label. Use lowercase and underscore.</p>
              </label>
              {definitionForm.dataType === 'NUMBER' ? (
                <label className="field">
                  <span>Unit</span>
                  <input
                    type="text"
                    value={definitionForm.unit}
                    onChange={(event) =>
                      setDefinitionForm((prev) => ({ ...prev, unit: event.target.value }))
                    }
                    placeholder="kg, L, cm"
                  />
                </label>
              ) : null}
              <label className="field field-span">
                <span>Description</span>
                <input
                  type="text"
                  value={definitionForm.description}
                  onChange={(event) =>
                    setDefinitionForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Explain what this attribute captures"
                />
              </label>
              {definitionForm.dataType === 'ENUM' ? (
                <div className="field field-span">
                  <span>Dropdown options</span>
                  <div className="inline-row">
                    <input
                      type="text"
                      value={optionDraft}
                      onChange={(event) => setOptionDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addEnumOption();
                        }
                      }}
                      placeholder="Add options separated by commas"
                    />
                    <button type="button" className="ghost-btn small" onClick={addEnumOption}>
                      Add
                    </button>
                  </div>
                  {definitionForm.enumOptions.length ? (
                    <div className="tag-row">
                      {definitionForm.enumOptions.map((option) => (
                        <span className="tag" key={option}>
                          {option}
                          <button type="button" onClick={() => removeEnumOption(option)}>
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="field-help">Options will show as a dropdown in the product form.</p>
                  )}
                </div>
              ) : null}
              {definitionForm.dataType === 'STRING' ? (
                <>
                  <label className="field">
                    <span>Min length</span>
                    <input
                      type="number"
                      value={definitionForm.minLength}
                      onChange={(event) =>
                        setDefinitionForm((prev) => ({ ...prev, minLength: event.target.value }))
                      }
                      placeholder="0"
                    />
                  </label>
                  <label className="field">
                    <span>Max length</span>
                    <input
                      type="number"
                      value={definitionForm.maxLength}
                      onChange={(event) =>
                        setDefinitionForm((prev) => ({ ...prev, maxLength: event.target.value }))
                      }
                      placeholder="120"
                    />
                  </label>
                </>
              ) : null}
              {definitionForm.dataType === 'NUMBER' ? (
                <>
                  <label className="field">
                    <span>Minimum value</span>
                    <input
                      type="number"
                      value={definitionForm.minValue}
                      onChange={(event) =>
                        setDefinitionForm((prev) => ({ ...prev, minValue: event.target.value }))
                      }
                      placeholder="0"
                    />
                  </label>
                  <label className="field">
                    <span>Maximum value</span>
                    <input
                      type="number"
                      value={definitionForm.maxValue}
                      onChange={(event) =>
                        setDefinitionForm((prev) => ({ ...prev, maxValue: event.target.value }))
                      }
                      placeholder="9999"
                    />
                  </label>
                </>
              ) : null}
              {definitionForm.dataType === 'LIST' ? (
                <>
                  <label className="field">
                    <span>Minimum items</span>
                    <input
                      type="number"
                      value={definitionForm.minItems}
                      onChange={(event) =>
                        setDefinitionForm((prev) => ({ ...prev, minItems: event.target.value }))
                      }
                      placeholder="0"
                    />
                  </label>
                  <label className="field">
                    <span>Maximum items</span>
                    <input
                      type="number"
                      value={definitionForm.maxItems}
                      onChange={(event) =>
                        setDefinitionForm((prev) => ({ ...prev, maxItems: event.target.value }))
                      }
                      placeholder="10"
                    />
                  </label>
                </>
              ) : null}
              <label className="field">
                <span>Status</span>
                <select
                  value={definitionForm.active ? 'true' : 'false'}
                  onChange={(event) =>
                    setDefinitionForm((prev) => ({
                      ...prev,
                      active: event.target.value === 'true',
                    }))
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <div className="field field-span">
                <div className="inline-row">
                  <span>Advanced</span>
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => setShowDefinitionAdvanced((prev) => !prev)}
                  >
                    {showDefinitionAdvanced ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showDefinitionAdvanced && definitionForm.dataType === 'STRING' ? (
                  <label className="field field-span">
                    <span>Pattern (regex)</span>
                    <input
                      type="text"
                      value={definitionForm.pattern}
                      onChange={(event) =>
                        setDefinitionForm((prev) => ({ ...prev, pattern: event.target.value }))
                      }
                      placeholder="e.g. ^[A-Za-z0-9]+$"
                    />
                    <p className="field-help">Use only if you need a strict format.</p>
                  </label>
                ) : null}
                {!showDefinitionAdvanced ? (
                  <p className="field-help">
                    {definitionForm.dataType === 'STRING'
                      ? 'Optional: add a regex for text validation.'
                      : 'Optional advanced settings.'}
                  </p>
                ) : null}
              </div>
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save attribute'}
            </button>
          </form>
        </div>
      ) : null}

      {showMappingForm ? (
        <div className="admin-modal-backdrop" onClick={() => setShowMappingForm(false)}>
          <form
            className="admin-modal"
            onSubmit={handleMappingSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">
                {editingMappingId ? 'Edit attribute mapping' : 'Create attribute mapping'}
              </h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowMappingForm(false)}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field field-span">
                <span>Attribute</span>
                <select
                  value={mappingForm.attributeId}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, attributeId: event.target.value }))
                  }
                  required
                >
                  <option value="">Select attribute</option>
                  {definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.label} ({typeLabel(definition.dataType)})
                      {definition.active ? '' : ' - inactive'}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDefinition ? (
                <div className="field-span">
                  <p className="field-help">
                    Type: {typeLabel(selectedDefinition.dataType)}
                    {selectedDefinition.unit ? ` | Unit: ${selectedDefinition.unit}` : ''}
                  </p>
                  {selectedDefinition.description ? (
                    <p className="field-help">{selectedDefinition.description}</p>
                  ) : null}
                </div>
              ) : null}
              <label className="field">
                <span>Applies to</span>
                <select
                  value={mappingForm.scope}
                  onChange={(event) =>
                    setMappingForm((prev) => {
                      const next = { ...prev, scope: event.target.value };
                      if (event.target.value === 'main') {
                        next.categoryId = '';
                        next.subCategoryId = '';
                      }
                      if (event.target.value === 'category') {
                        next.subCategoryId = '';
                      }
                      return next;
                    })
                  }
                >
                  <option value="main">Main category</option>
                  <option value="category">Category</option>
                  <option value="sub">Sub-category</option>
                </select>
              </label>
              <label className="field">
                <span>Main category</span>
                <select
                  value={mappingForm.mainCategoryId}
                  onChange={(event) =>
                    setMappingForm((prev) => ({
                      ...prev,
                      mainCategoryId: event.target.value,
                      categoryId: '',
                      subCategoryId: '',
                    }))
                  }
                  required
                >
                  <option value="">Select main category</option>
                  {mainCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  value={mappingForm.categoryId}
                  onChange={(event) =>
                    setMappingForm((prev) => ({
                      ...prev,
                      categoryId: event.target.value,
                      subCategoryId: '',
                    }))
                  }
                  disabled={mappingForm.scope === 'main' || !mappingForm.mainCategoryId}
                  required={mappingForm.scope !== 'main'}
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Sub-category</span>
                <select
                  value={mappingForm.subCategoryId}
                  onChange={(event) => setMappingForm((prev) => ({ ...prev, subCategoryId: event.target.value }))}
                  disabled={mappingForm.scope !== 'sub' || !mappingForm.categoryId}
                  required={mappingForm.scope === 'sub'}
                >
                  <option value="">Select sub-category</option>
                  {subCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Display order</span>
                <input
                  type="number"
                  value={mappingForm.sortOrder}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                  }
                  placeholder="1"
                />
              </label>
              <div className="field field-span">
                <span>Visibility</span>
                <div className="checkbox-grid">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={mappingForm.required}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, required: event.target.checked }))
                      }
                    />
                    Must fill in product form
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={mappingForm.filterable}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, filterable: event.target.checked }))
                      }
                    />
                    Show in filters
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={mappingForm.searchable}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, searchable: event.target.checked }))
                      }
                    />
                    Searchable
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={mappingForm.active}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, active: event.target.checked }))
                      }
                    />
                    Active
                  </label>
                </div>
              </div>
              <div className="field field-span">
                <span>Default value</span>
                {!selectedDefinition ? (
                  <p className="field-help">Select an attribute to set a default value.</p>
                ) : selectedType === 'BOOLEAN' ? (
                  <select
                    value={mappingForm.defaultValueBool}
                    onChange={(event) =>
                      setMappingForm((prev) => ({ ...prev, defaultValueBool: event.target.value }))
                    }
                  >
                    <option value="">None</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : selectedType === 'ENUM' ? (
                  Array.isArray(selectedOptions) ? (
                    <select
                      value={mappingForm.defaultValueText}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, defaultValueText: event.target.value }))
                      }
                    >
                      <option value="">None</option>
                      {selectedOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="field-help">Add dropdown options in the attribute definition first.</p>
                  )
                ) : selectedType === 'LIST' ? (
                  <>
                    <input
                      type="text"
                      value={mappingForm.defaultValueList}
                      onChange={(event) =>
                        setMappingForm((prev) => ({ ...prev, defaultValueList: event.target.value }))
                      }
                      placeholder="e.g. red, blue, green"
                    />
                    <p className="field-help">Enter comma-separated values.</p>
                  </>
                ) : selectedType === 'OBJECT' ? (
                  <p className="field-help">This attribute stores structured data. Use Advanced to set a default.</p>
                ) : (
                  <input
                    type={selectedType === 'NUMBER' ? 'number' : selectedType === 'DATE' ? 'date' : 'text'}
                    value={mappingForm.defaultValueText}
                    onChange={(event) =>
                      setMappingForm((prev) => ({ ...prev, defaultValueText: event.target.value }))
                    }
                    placeholder="Default value"
                  />
                )}
              </div>
              <div className="field field-span">
                <div className="inline-row">
                  <span>Advanced</span>
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => setShowMappingAdvanced((prev) => !prev)}
                  >
                    {showMappingAdvanced ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showMappingAdvanced ? (
                  <>
                    {selectedType === 'OBJECT' ? (
                      <label className="field field-span">
                        <span>Default value (JSON)</span>
                        <textarea
                          rows={3}
                          value={mappingForm.defaultValueJson}
                          onChange={(event) =>
                            setMappingForm((prev) => ({ ...prev, defaultValueJson: event.target.value }))
                          }
                          placeholder='{"key":"value"}'
                        />
                      </label>
                    ) : null}
                    <label className="field field-span">
                      <span>UI config (JSON)</span>
                      <textarea
                        rows={3}
                        value={mappingForm.uiConfig}
                        onChange={(event) =>
                          setMappingForm((prev) => ({ ...prev, uiConfig: event.target.value }))
                        }
                        placeholder='{"placeholder":"Optional hint"}'
                      />
                    </label>
                  </>
                ) : (
                  <p className="field-help">Optional settings for advanced UI behavior.</p>
                )}
              </div>
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save mapping'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Attribute definitions</h3>
            <button type="button" className="primary-btn compact" onClick={openDefinitionForm}>
              Create
            </button>
          </div>
          {definitions.length === 0 ? (
            <p className="empty-state">No attribute definitions yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {definitions.map((definition) => (
                    <tr key={definition.id}>
                      <td>{definition.label}</td>
                      <td>{definition.key}</td>
                      <td>{typeLabel(definition.dataType)}</td>
                      <td>{definition.active ? 'Active' : 'Inactive'}</td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleEditDefinition(definition)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleDeleteDefinition(definition.id)}
                        >
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

        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Category mappings</h3>
            <button type="button" className="primary-btn compact" onClick={openMappingForm}>
              Create
            </button>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Main category</span>
              <select
                value={filterForm.mainCategoryId}
                onChange={(event) => handleFilterChange('mainCategoryId', event.target.value)}
              >
                <option value="">All</option>
                {mainCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={filterForm.categoryId}
                onChange={(event) => handleFilterChange('categoryId', event.target.value)}
                disabled={!filterForm.mainCategoryId}
              >
                <option value="">All</option>
                {filterCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sub-category</span>
              <select
                value={filterForm.subCategoryId}
                onChange={(event) => handleFilterChange('subCategoryId', event.target.value)}
                disabled={!filterForm.categoryId}
              >
                <option value="">All</option>
                {filterSubCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select value={filterForm.active} onChange={(event) => handleFilterChange('active', event.target.value)}>
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <div className="field field-span">
              <div className="inline-row">
                <button type="button" className="ghost-btn small" onClick={handleApplyFilters} disabled={isLoading}>
                  Apply filters
                </button>
                <button type="button" className="ghost-btn small" onClick={resetFilter}>
                  Reset
                </button>
              </div>
            </div>
          </div>
          {mappings.length === 0 ? (
            <p className="empty-state">No attribute mappings yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Scope</th>
                    <th>Required</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => (
                    <tr key={mapping.id}>
                      <td>{mapping.label || mapping.attributeKey}</td>
                      <td>{scopeLabel(mapping)}</td>
                      <td>{mapping.required ? 'Yes' : 'No'}</td>
                      <td>{mapping.sortOrder ?? '-'}</td>
                      <td>{mapping.active ? 'Active' : 'Inactive'}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={() => handleEditMapping(mapping)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost-btn small"
                          onClick={() => handleDeleteMapping(mapping.id)}
                        >
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

export default ProductAttributePage;
