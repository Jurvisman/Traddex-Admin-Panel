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
  listIndustries,
  listMainCategories,
  listSubCategories,
  purgeAllAttributeDefinitions,
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
  label: '',
  key: '',
  dataType: 'STRING',
  enumOptions: [],
  scope: 'category',
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
  placeholder: '',
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
const getMappingScopeKey = (mapping) => {
  if (mapping?.subCategoryId) return `sub:${mapping.subCategoryId}`;
  if (mapping?.categoryId) return `category:${mapping.categoryId}`;
  if (mapping?.mainCategoryId) return `main:${mapping.mainCategoryId}`;
  return '';
};
const getScopeLabelFromMapping = (mapping, industryMap, mainCategoryMap, categoryMap, subCategoryMap) => {
  if (mapping?.subCategoryId) {
    const subCategory = subCategoryMap.get(String(mapping.subCategoryId));
    const category = subCategory?.categoryId ? categoryMap.get(String(subCategory.categoryId)) : null;
    const mainCategory =
      category?.mainCategoryId ? mainCategoryMap.get(String(category.mainCategoryId)) : null;
    const industry =
      mainCategory?.industryId ? industryMap.get(String(mainCategory.industryId)) : null;
    const parts = [
      industry?.name || null,
      mainCategory?.name || null,
      category?.name || null,
      subCategory?.name || `Sub-category #${mapping.subCategoryId}`,
    ].filter(Boolean);
    return parts.join(' / ');
  }
  if (mapping?.categoryId) {
    const category = categoryMap.get(String(mapping.categoryId));
    const mainCategory =
      category?.mainCategoryId ? mainCategoryMap.get(String(category.mainCategoryId)) : null;
    const industry =
      mainCategory?.industryId ? industryMap.get(String(mainCategory.industryId)) : null;
    const parts = [
      industry?.name || null,
      mainCategory?.name || null,
      category?.name || `Category #${mapping.categoryId}`,
    ].filter(Boolean);
    return parts.join(' / ');
  }
  if (mapping?.mainCategoryId) {
    const mainCategory = mainCategoryMap.get(String(mapping.mainCategoryId));
    const industry =
      mainCategory?.industryId ? industryMap.get(String(mainCategory.industryId)) : null;
    return [industry?.name || null, mainCategory?.name || `Category group #${mapping.mainCategoryId}`]
      .filter(Boolean)
      .join(' / ');
  }
  return '';
};

function ProductAttributePage({ token }) {
  const [definitions, setDefinitions] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [allMappings, setAllMappings] = useState([]);
  const [definitionForm, setDefinitionForm] = useState(definitionInitial);
  const [mappingForm, setMappingForm] = useState(mappingInitial);
  const [filterForm, setFilterForm] = useState(filterInitial);
  const [editingDefinitionId, setEditingDefinitionId] = useState(null);
  const [editingMappingId, setEditingMappingId] = useState(null);
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [showDefinitionAdvanced, setShowDefinitionAdvanced] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [optionDraft, setOptionDraft] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [mappingKeyEdited, setMappingKeyEdited] = useState(false);
  const [definitionQuery, setDefinitionQuery] = useState('');
  const [mappingDefinitionMode, setMappingDefinitionMode] = useState('new');
  const [expandedLibraryFieldId, setExpandedLibraryFieldId] = useState(null);
  const didInitRef = useRef(false);

  const [industries, setIndustries] = useState([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState('');
  const [mainCategories, setMainCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [categoryOptionsByMain, setCategoryOptionsByMain] = useState({});
  const [subCategoryOptionsByCategory, setSubCategoryOptionsByCategory] = useState({});

  const definitionMap = useMemo(() => {
    const map = new Map();
    definitions.forEach((definition) => {
      map.set(definition.id, definition);
    });
    return map;
  }, [definitions]);

  const industryMap = useMemo(() => {
    const map = new Map();
    industries.forEach((item) => {
      const id = item?.id ?? item?.industryId;
      if (id !== null && id !== undefined) {
        map.set(String(id), item);
      }
    });
    return map;
  }, [industries]);

  const mainCategoryMap = useMemo(() => {
    const map = new Map();
    mainCategories.forEach((item) => {
      const id = item?.id ?? item?.mainCategoryId;
      if (id !== null && id !== undefined) {
        map.set(String(id), item);
      }
    });
    return map;
  }, [mainCategories]);

  const allCategoryMap = useMemo(() => {
    const map = new Map();
    allCategories.forEach((item) => {
      const id = item?.id ?? item?.categoryId;
      if (id !== null && id !== undefined) {
        map.set(String(id), item);
      }
    });
    return map;
  }, [allCategories]);

  const allSubCategoryMap = useMemo(() => {
    const map = new Map();
    allSubCategories.forEach((item) => {
      const id = item?.id ?? item?.subCategoryId;
      if (id !== null && id !== undefined) {
        map.set(String(id), item);
      }
    });
    return map;
  }, [allSubCategories]);

  const selectedDefinition = useMemo(() => {
    const id = Number(mappingForm.attributeId);
    if (!id) return null;
    return definitionMap.get(id) || null;
  }, [definitionMap, mappingForm.attributeId]);

  const filteredMainCategories = useMemo(() => {
    if (!selectedIndustryId) return [];
    return mainCategories.filter(
      (item) => String(item.industryId) === String(selectedIndustryId)
    );
  }, [mainCategories, selectedIndustryId]);

  const filterCategories = useMemo(() => {
    if (!filterForm.mainCategoryId) return [];
    return categoryOptionsByMain[String(filterForm.mainCategoryId)] || [];
  }, [categoryOptionsByMain, filterForm.mainCategoryId]);

  const filterSubCategories = useMemo(() => {
    if (!filterForm.categoryId) return [];
    return subCategoryOptionsByCategory[String(filterForm.categoryId)] || [];
  }, [subCategoryOptionsByCategory, filterForm.categoryId]);

  const mappingCategories = useMemo(() => {
    if (!mappingForm.mainCategoryId) return [];
    return categoryOptionsByMain[String(mappingForm.mainCategoryId)] || [];
  }, [categoryOptionsByMain, mappingForm.mainCategoryId]);

  const mappingSubCategories = useMemo(() => {
    if (!mappingForm.categoryId) return [];
    return subCategoryOptionsByCategory[String(mappingForm.categoryId)] || [];
  }, [subCategoryOptionsByCategory, mappingForm.categoryId]);

  const selectedCategory = useMemo(() => {
    if (!filterForm.categoryId) return null;
    return filterCategories.find((item) => String(item.id) === String(filterForm.categoryId)) || null;
  }, [filterCategories, filterForm.categoryId]);

  const selectedIndustry = useMemo(() => {
    if (!selectedIndustryId) return null;
    return industries.find((item) => String(item.id) === String(selectedIndustryId)) || null;
  }, [industries, selectedIndustryId]);

  const selectedMainCategory = useMemo(() => {
    if (!filterForm.mainCategoryId) return null;
    return mainCategoryMap.get(String(filterForm.mainCategoryId)) || null;
  }, [filterForm.mainCategoryId, mainCategoryMap]);

  const selectedSubCategory = useMemo(() => {
    if (!filterForm.subCategoryId) return null;
    return (
      filterSubCategories.find((item) => String(item.id) === String(filterForm.subCategoryId)) || null
    );
  }, [filterForm.subCategoryId, filterSubCategories]);

  const selectedScopeLabel = useMemo(() => {
    const parts = [
      selectedIndustry?.name || null,
      selectedMainCategory?.name || null,
      selectedCategory?.name || null,
      selectedSubCategory?.name || (filterForm.categoryId ? 'All sub-categories' : null),
    ].filter(Boolean);
    return parts.join(' / ');
  }, [
    filterForm.categoryId,
    selectedCategory,
    selectedIndustry,
    selectedMainCategory,
    selectedSubCategory,
  ]);

  const selectedScopeDescription = useMemo(() => {
    if (selectedSubCategory) {
      return 'Only products in this sub-category will see these fields.';
    }
    if (selectedCategory) {
      return 'These fields will appear for this category unless a sub-category-specific field overrides them.';
    }
    return 'Select a category first, then assign an existing field or create a new one.';
  }, [selectedCategory, selectedSubCategory]);

  const currentScopeKey = useMemo(() => {
    if (filterForm.subCategoryId) return `sub:${filterForm.subCategoryId}`;
    if (filterForm.categoryId) return `category:${filterForm.categoryId}`;
    if (filterForm.mainCategoryId) return `main:${filterForm.mainCategoryId}`;
    return '';
  }, [filterForm.categoryId, filterForm.mainCategoryId, filterForm.subCategoryId]);

  const currentMappingAttributeIds = useMemo(
    () => new Set(mappings.map((mapping) => Number(mapping.attributeId)).filter(Boolean)),
    [mappings]
  );

  const definitionUsageMap = useMemo(() => {
    const usage = new Map();
    allMappings.forEach((mapping) => {
      const attributeId = Number(mapping?.attributeId);
      if (!attributeId) return;
      const scopeKey = getMappingScopeKey(mapping);
      if (!usage.has(attributeId)) {
        usage.set(attributeId, {
          mappingCount: 0,
          activeCount: 0,
          scopeKeys: new Set(),
          mappingRefs: [],
        });
      }
      const entry = usage.get(attributeId);
      entry.mappingCount += 1;
      if (mapping?.active !== false) entry.activeCount += 1;
      if (scopeKey) entry.scopeKeys.add(scopeKey);
      entry.mappingRefs.push(mapping);
    });
    return usage;
  }, [allMappings]);

  const definitionLibrary = useMemo(() => {
    return [...definitions]
      .map((definition) => {
        const usage = definitionUsageMap.get(Number(definition.id));
        const locationMap = new Map();
        (usage?.mappingRefs || []).forEach((mapping) => {
          const scopeKey = getMappingScopeKey(mapping) || `mapping:${mapping.id}`;
          const label = getScopeLabelFromMapping(
            mapping,
            industryMap,
            mainCategoryMap,
            allCategoryMap,
            allSubCategoryMap
          );
          if (!label) return;
          if (!locationMap.has(scopeKey)) {
            locationMap.set(scopeKey, {
              scopeKey,
              label,
              active: mapping?.active !== false,
              isCurrentScope: Boolean(currentScopeKey && scopeKey === currentScopeKey),
            });
            return;
          }
          const existing = locationMap.get(scopeKey);
          existing.active = existing.active || mapping?.active !== false;
          existing.isCurrentScope =
            existing.isCurrentScope || Boolean(currentScopeKey && scopeKey === currentScopeKey);
        });
        const locations = Array.from(locationMap.values()).sort((left, right) => {
          if (left.isCurrentScope !== right.isCurrentScope) {
            return left.isCurrentScope ? -1 : 1;
          }
          if (left.active !== right.active) {
            return left.active ? -1 : 1;
          }
          return (left.label || '').localeCompare(right.label || '');
        });
        return {
          ...definition,
          mappingCount: usage?.mappingCount || 0,
          activeMappingCount: usage?.activeCount || 0,
          scopeCount: usage?.scopeKeys?.size || 0,
          locations,
          assignedHere: currentMappingAttributeIds.has(Number(definition.id)),
          sharedAcrossScopes: (usage?.scopeKeys?.size || 0) > 1,
          assignedToCurrentScope: Boolean(
            currentScopeKey && usage?.scopeKeys instanceof Set && usage.scopeKeys.has(currentScopeKey)
          ),
        };
      })
      .sort((left, right) => (left.label || '').localeCompare(right.label || ''));
  }, [
    allCategoryMap,
    allSubCategoryMap,
    currentMappingAttributeIds,
    currentScopeKey,
    definitionUsageMap,
    definitions,
    industryMap,
    mainCategoryMap,
  ]);

  const filteredDefinitionLibrary = useMemo(() => {
    const term = definitionQuery.trim().toLowerCase();
    if (!term) return definitionLibrary;
    return definitionLibrary.filter((definition) => {
      const haystack = [definition.label, definition.key, definition.dataType]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(term);
    });
  }, [definitionLibrary, definitionQuery]);

  const totalFields = mappings.length;
  const activeFields = mappings.filter((item) => item.active !== false).length;
  const requiredFields = mappings.filter((item) => item.required).length;
  const inactiveFields = Math.max(0, totalFields - activeFields);

  const loadDefinitions = async () => {
    const response = await listAttributeDefinitions(token);
    setDefinitions(response?.data?.definitions || []);
  };

  const loadAllMappings = async () => {
    const response = await listAttributeMappings(token);
    setAllMappings(response?.data?.mappings || []);
  };

  const loadMappings = async (overrideFilters) => {
    const source = overrideFilters || filterForm;
    if (!source.categoryId) {
      setMappings([]);
      return;
    }
    const filters = {};
    if (source.subCategoryId) {
      filters.subCategoryId = Number(source.subCategoryId);
    } else {
      filters.categoryId = Number(source.categoryId);
    }
    if (source.active === 'true') filters.active = true;
    if (source.active === 'false') filters.active = false;
    const response = await listAttributeMappings(token, filters);
    setMappings(response?.data?.mappings || []);
  };

  const loadIndustries = async () => {
    const response = await listIndustries(token);
    const list = (response?.data || []).map((item) => ({
      ...item,
      id: item.id ?? item.industryId,
      industryId: item.industryId ?? item.id,
    }));
    setIndustries(list);
  };

  const loadMainCategories = async () => {
    const response = await listMainCategories(token);
    setMainCategories(response?.data || []);
  };

  const loadAllCategories = async () => {
    const response = await listCategories(token);
    setAllCategories(response?.data || []);
  };

  const loadAllSubCategories = async () => {
    const response = await listSubCategories(token);
    setAllSubCategories(response?.data || []);
  };

  const ensureCategories = async (mainCategoryId) => {
    if (!mainCategoryId) return [];
    const cacheKey = String(mainCategoryId);
    if (categoryOptionsByMain[cacheKey]) {
      return categoryOptionsByMain[cacheKey];
    }
    const response = await listCategories(token, mainCategoryId);
    const list = response?.data || [];
    setCategoryOptionsByMain((prev) => ({
      ...prev,
      [cacheKey]: list,
    }));
    return list;
  };

  const ensureSubCategories = async (categoryId) => {
    if (!categoryId) return [];
    const cacheKey = String(categoryId);
    if (subCategoryOptionsByCategory[cacheKey]) {
      return subCategoryOptionsByCategory[cacheKey];
    }
    const response = await listSubCategories(token, categoryId);
    const list = response?.data || [];
    setSubCategoryOptionsByCategory((prev) => ({
      ...prev,
      [cacheKey]: list,
    }));
    return list;
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    Promise.all([
      loadDefinitions(),
      loadAllMappings(),
      loadMappings(),
      loadMainCategories(),
      loadAllCategories(),
      loadAllSubCategories(),
      loadIndustries(),
    ])
      .catch((error) => {
        setMessage({ type: 'error', text: error.message || 'Failed to load attribute data.' });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMappings().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterForm.mainCategoryId, filterForm.categoryId, filterForm.subCategoryId, filterForm.active]);

  useEffect(() => {
    if (!filterForm.mainCategoryId) return;
    ensureCategories(filterForm.mainCategoryId).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load categories.' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterForm.mainCategoryId]);

  useEffect(() => {
    if (!filterForm.categoryId) return;
    ensureSubCategories(filterForm.categoryId).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load sub-categories.' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterForm.categoryId]);

  useEffect(() => {
    if (!showMappingForm || !mappingForm.mainCategoryId) return;
    ensureCategories(mappingForm.mainCategoryId).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load categories.' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMappingForm, mappingForm.mainCategoryId]);

  useEffect(() => {
    if (!showMappingForm || !mappingForm.categoryId) return;
    ensureSubCategories(mappingForm.categoryId).catch((error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to load sub-categories.' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMappingForm, mappingForm.categoryId]);

  useEffect(() => {
    setMappingForm((prev) => ({
      ...prev,
      defaultValueText: '',
      defaultValueBool: '',
      defaultValueList: '',
      defaultValueJson: '',
    }));
  }, [mappingForm.attributeId]);

  const applyDefinitionToMappingForm = (definition, scopeOverrides = {}) => {
    const enumOptions = Array.isArray(definition?.options?.values) ? definition.options.values : [];
    setMappingForm((prev) => ({
      ...prev,
      ...scopeOverrides,
      attributeId: definition?.id ? String(definition.id) : '',
      label: definition?.label || '',
      key: definition?.key || '',
      dataType: definition?.dataType || 'STRING',
      enumOptions,
      defaultValueText: '',
      defaultValueBool: '',
      defaultValueList: '',
      defaultValueJson: '',
    }));
    setMappingKeyEdited(true);
  };

  const clearMappingDefinitionSelection = () => {
    setMappingForm((prev) => ({
      ...prev,
      attributeId: '',
      label: '',
      key: '',
      dataType: 'STRING',
      enumOptions: [],
      defaultValueText: '',
      defaultValueBool: '',
      defaultValueList: '',
      defaultValueJson: '',
      placeholder: '',
      uiConfig: '',
    }));
    setMappingKeyEdited(false);
  };

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

  const addMappingOption = () => {
    const raw = optionDraft.trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setMappingForm((prev) => {
      const nextOptions = [...(prev.enumOptions || [])];
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

  const removeMappingOption = (option) => {
    setMappingForm((prev) => ({
      ...prev,
      enumOptions: (prev.enumOptions || []).filter((item) => item !== option),
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
    const type = selectedType || 'STRING';

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
    const placeholder = mappingForm.placeholder?.trim();
    if (!raw) {
      if (!placeholder) return { config: null, error: null };
      return { config: { placeholder }, error: null };
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        return { config: null, error: 'UI config must be a JSON object.' };
      }
      if (placeholder) {
        return { config: { ...parsed, placeholder }, error: null };
      }
      return { config: parsed, error: null };
    } catch (error) {
      return { config: null, error: 'UI config must be valid JSON.' };
    }
  };

  const buildFieldDefinitionPayload = () => {
    const payload = {
      key: mappingForm.key.trim(),
      label: mappingForm.label.trim(),
      dataType: selectedType || mappingForm.dataType,
      active: true,
    };

    if (selectedType === 'ENUM' && selectedOptions && selectedOptions.length > 0) {
      payload.options = { values: selectedOptions };
    }

    return payload;
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
      await Promise.all([loadDefinitions(), loadAllMappings(), loadMappings()]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save attribute definition.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingSubmit = async (event) => {
    event.preventDefault();
    if (!mappingForm.categoryId) {
      setMessage({ type: 'error', text: 'Select a category.' });
      return;
    }

    const isUsingExistingDefinition = mappingDefinitionMode === 'existing' || Boolean(mappingForm.attributeId);
    if (isUsingExistingDefinition && !mappingForm.attributeId) {
      setMessage({ type: 'error', text: 'Select an existing field from the library.' });
      return;
    }
    if (!isUsingExistingDefinition && !mappingForm.label.trim()) {
      setMessage({ type: 'error', text: 'Field label is required.' });
      return;
    }
    if (!isUsingExistingDefinition && !mappingForm.key.trim()) {
      setMessage({ type: 'error', text: 'Field name is required.' });
      return;
    }
    if (!isUsingExistingDefinition && selectedType === 'ENUM' && (!selectedOptions || selectedOptions.length === 0)) {
      setMessage({ type: 'error', text: 'Add at least one option for dropdown fields.' });
      return;
    }

    const payload = {
      required: Boolean(mappingForm.required),
      filterable: Boolean(mappingForm.filterable),
      searchable: Boolean(mappingForm.searchable),
      active: Boolean(mappingForm.active),
    };

    const sortOrder = toInteger(mappingForm.sortOrder);
    if (sortOrder !== null) payload.sortOrder = sortOrder;

    if (mappingForm.subCategoryId) {
      payload.subCategoryId = Number(mappingForm.subCategoryId);
    } else {
      payload.categoryId = Number(mappingForm.categoryId);
    }

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
      let attributeId = mappingForm.attributeId ? Number(mappingForm.attributeId) : null;
      if (!attributeId) {
        const definitionPayload = buildFieldDefinitionPayload();
        const definitionResponse = await createAttributeDefinition(token, definitionPayload);
        attributeId = definitionResponse?.data?.attribute_id ?? null;
      }

      if (!attributeId) {
        throw new Error('Failed to save field definition.');
      }

      const duplicateMapping = mappings.find(
        (mapping) =>
          Number(mapping.attributeId) === Number(attributeId) &&
          Number(mapping.id) !== Number(editingMappingId || 0)
      );
      if (duplicateMapping) {
        throw new Error('This field is already assigned to the selected category scope.');
      }

      payload.attributeId = attributeId;

      if (editingMappingId) {
        await updateAttributeMapping(token, editingMappingId, payload);
        setMessage({ type: 'success', text: 'Field updated.' });
      } else {
        await createAttributeMapping(token, payload);
        setMessage({ type: 'success', text: 'Field added.' });
      }
      setMappingForm(mappingInitial);
      setMappingKeyEdited(false);
      setEditingMappingId(null);
      setShowMappingForm(false);
      await Promise.all([loadMappings(), loadDefinitions(), loadAllMappings()]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save field.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDefinition = async (id) => {
    try {
      setIsLoading(true);
      const response = await deleteAttributeDefinition(token, id);
      await Promise.all([loadDefinitions(), loadAllMappings(), loadMappings()]);
      const productsUpdated = response?.data?.productsUpdated ?? 0;
      setMessage({
        type: 'success',
        text:
          productsUpdated > 0
            ? `Attribute definition deleted. Removed linked values from ${productsUpdated} product${
                productsUpdated === 1 ? '' : 's'
              }.`
            : 'Attribute definition deleted.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete attribute definition.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurgeAllDefinitions = async () => {
    if (!definitions.length) {
      setMessage({ type: 'info', text: 'No reusable fields to delete.' });
      return;
    }

    const shouldContinue = window.confirm(
      `Delete all ${definitions.length} reusable field${definitions.length === 1 ? '' : 's'}? This will also remove linked values from products.`
    );
    if (!shouldContinue) {
      return;
    }

    const finalConfirm = window.confirm(
      'This cannot be undone from the admin panel. Continue with safe cleanup and delete?'
    );
    if (!finalConfirm) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await purgeAllAttributeDefinitions(token);
      setDefinitionForm(definitionInitial);
      setMappingForm(mappingInitial);
      setEditingDefinitionId(null);
      setEditingMappingId(null);
      setShowDefinitionForm(false);
      setShowMappingForm(false);
      setShowDefinitionAdvanced(false);
      setExpandedLibraryFieldId(null);
      setDefinitionQuery('');
      await Promise.all([loadDefinitions(), loadAllMappings(), loadMappings()]);

      const summary = response?.data || {};
      setMessage({
        type: 'success',
        text: `Deleted ${summary.definitionsDeleted ?? 0} fields, ${summary.mappingsDeleted ?? 0} category links, and cleaned ${summary.productsUpdated ?? 0} product${
          summary.productsUpdated === 1 ? '' : 's'
        }.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete all reusable fields.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMapping = async (id) => {
    try {
      setIsLoading(true);
      await deleteAttributeMapping(token, id);
      await Promise.all([loadMappings(), loadAllMappings()]);
      setMessage({ type: 'success', text: 'Field deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete field.' });
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
    const definition = mapping.attributeId ? definitionMap.get(mapping.attributeId) : null;
    const type = definition?.dataType || mapping.dataType || 'STRING';
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
    const placeholder =
      mapping.uiConfig?.placeholder || mapping.uiConfig?.hint || mapping.uiConfig?.helpText || '';
    const label = definition?.label || mapping.label || '';
    const key = definition?.key || mapping.attributeKey || '';
    const enumOptions = Array.isArray(definition?.options?.values) ? definition.options.values : [];
    setMappingForm({
      attributeId: mapping.attributeId ? String(mapping.attributeId) : '',
      label,
      key,
      dataType: type,
      enumOptions,
      mainCategoryId:
        mapping.mainCategoryId
          ? String(mapping.mainCategoryId)
          : filterForm.mainCategoryId
          ? String(filterForm.mainCategoryId)
          : '',
      categoryId: mapping.categoryId ? String(mapping.categoryId) : '',
      subCategoryId: mapping.subCategoryId ? String(mapping.subCategoryId) : '',
      required: Boolean(mapping.required),
      filterable: Boolean(mapping.filterable),
      searchable: Boolean(mapping.searchable),
      sortOrder: toInputValue(mapping.sortOrder),
      uiConfig,
      placeholder,
      active: mapping.active !== false,
      ...defaults,
    });
    setMappingKeyEdited(true);
    setOptionDraft('');
    setEditingMappingId(mapping.id);
    setMappingDefinitionMode('existing');
    setShowMappingForm(true);
  };

  const handleIndustryChange = (value) => {
    setSelectedIndustryId(value);
    setFilterForm((prev) => ({
      ...prev,
      mainCategoryId: '',
      categoryId: '',
      subCategoryId: '',
    }));
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
    setSelectedIndustryId('');
    setFilterForm(filterInitial);
    loadMappings(filterInitial).catch(() => {});
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      await Promise.all([
        loadDefinitions(),
        loadAllMappings(),
        loadMappings(),
        loadMainCategories(),
        loadAllCategories(),
        loadAllSubCategories(),
        loadIndustries(),
      ]);
      setMessage({ type: 'success', text: 'Attribute data refreshed.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to refresh attribute data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const openDefinitionForm = () => {
    setDefinitionForm(definitionInitial);
    setEditingDefinitionId(null);
    setShowDefinitionForm(true);
    setShowDefinitionAdvanced(false);
    setKeyEdited(false);
    setOptionDraft('');
  };

  const getScopeDefaults = () => ({
    scope: filterForm.subCategoryId ? 'sub' : 'category',
    mainCategoryId: filterForm.mainCategoryId,
    categoryId: filterForm.categoryId,
    subCategoryId: filterForm.subCategoryId,
  });

  const openMappingFormForNew = () => {
    if (!filterForm.categoryId) {
      setMessage({ type: 'error', text: 'Select an industry and category first.' });
      return;
    }
    setMappingDefinitionMode('new');
    setMappingForm({
      ...mappingInitial,
      ...getScopeDefaults(),
    });
    setMappingKeyEdited(false);
    setOptionDraft('');
    setEditingMappingId(null);
    setShowMappingForm(true);
  };

  const openMappingFormForExisting = (definition = null) => {
    if (!filterForm.categoryId) {
      setMessage({ type: 'error', text: 'Select an industry and category first.' });
      return;
    }
    const nextState = {
      ...mappingInitial,
      ...getScopeDefaults(),
    };
    setMappingDefinitionMode('existing');
    setMappingForm(nextState);
    setOptionDraft('');
    setEditingMappingId(null);
    setShowMappingForm(true);
    setMappingKeyEdited(true);
    if (definition) {
      applyDefinitionToMappingForm(definition, getScopeDefaults());
    }
  };

  const selectedType = mappingForm.dataType || selectedDefinition?.dataType || 'STRING';
  const selectedOptions =
    mappingForm.dataType === 'ENUM' && Array.isArray(mappingForm.enumOptions) && mappingForm.enumOptions.length
      ? mappingForm.enumOptions
      : Array.isArray(selectedDefinition?.options?.values)
      ? selectedDefinition.options.values
      : null;
  const isUsingExistingDefinition = mappingDefinitionMode === 'existing' || Boolean(mappingForm.attributeId);
  const selectedDefinitionUsage = selectedDefinition ? definitionUsageMap.get(Number(selectedDefinition.id)) : null;

  return (
    <div className="attribute-admin-page">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Reusable Fields</h2>
          <p className="panel-subtitle">Advanced cleanup and reusable field management for product categories.</p>
        </div>
        <div className="attribute-admin-head-actions">
          <button type="button" className="ghost-btn" onClick={handleRefresh} disabled={isLoading}>
            Refresh
          </button>
          <button
            type="button"
            className="ghost-btn danger"
            onClick={handlePurgeAllDefinitions}
            disabled={isLoading || definitions.length === 0}
          >
            Delete All Fields
          </button>
        </div>
      </div>
      <Banner message={message} />

      <div className="stat-grid">
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#8B5CF6' }}>
          <p className="stat-label">Total fields</p>
          <p className="stat-value">{totalFields}</p>
          <p className="stat-sub">
            {selectedSubCategory
              ? `Sub-category: ${selectedSubCategory.name}`
              : selectedCategory
              ? `Category: ${selectedCategory.name}`
              : 'Select a category'}
          </p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#16A34A' }}>
          <p className="stat-label">Active</p>
          <p className="stat-value">{activeFields}</p>
          <p className="stat-sub">Visible in product form</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Required</p>
          <p className="stat-value">{requiredFields}</p>
          <p className="stat-sub">Must be filled</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#EF4444' }}>
          <p className="stat-label">Inactive</p>
          <p className="stat-value">{inactiveFields}</p>
          <p className="stat-sub">Hidden from form</p>
        </div>
      </div>

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
                {editingMappingId ? 'Edit field' : 'Add field'}
              </h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowMappingForm(false)}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <div className="field field-span">
                <span>Field source</span>
                <div className="inline-row">
                  <button
                    type="button"
                    className={`ghost-btn small${isUsingExistingDefinition ? ' is-selected' : ''}`}
                    onClick={() => {
                      setMappingDefinitionMode('existing');
                      clearMappingDefinitionSelection();
                    }}
                  >
                    Use existing field
                  </button>
                  <button
                    type="button"
                    className={`ghost-btn small${!isUsingExistingDefinition ? ' is-selected' : ''}`}
                    onClick={() => {
                      setMappingDefinitionMode('new');
                      clearMappingDefinitionSelection();
                    }}
                  >
                    Create new field
                  </button>
                </div>
                <p className="field-help">
                  Reuse existing fields like Shelf Life across multiple categories. Create new only when the meaning is
                  genuinely different.
                </p>
              </div>
              {isUsingExistingDefinition ? (
                <label className="field field-span">
                  <span>Field library</span>
                  <select
                    value={mappingForm.attributeId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      if (!nextId) {
                        clearMappingDefinitionSelection();
                        return;
                      }
                      const definition = definitionMap.get(Number(nextId));
                      if (!definition) return;
                      applyDefinitionToMappingForm(definition);
                    }}
                    required
                  >
                    <option value="">Select existing field</option>
                    {definitionLibrary.map((definition) => (
                      <option key={definition.id} value={definition.id}>
                        {definition.label} - {typeLabel(definition.dataType)} - Used in {definition.scopeCount || 0}{' '}
                        {(definition.scopeCount || 0) === 1 ? 'place' : 'places'}
                      </option>
                    ))}
                  </select>
                  <p className="field-help">
                    {selectedDefinition
                      ? `${selectedDefinition.label} is already used in ${
                          selectedDefinitionUsage?.scopeKeys?.size || 0
                        } ${(selectedDefinitionUsage?.scopeKeys?.size || 0) === 1 ? 'category scope' : 'category scopes'}.`
                      : 'Pick a field from the library to assign it to this category.'}
                  </p>
                </label>
              ) : null}
              <label className="field">
                <span>Label</span>
                <input
                  type="text"
                  value={mappingForm.label}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMappingForm((prev) => ({
                      ...prev,
                      label: value,
                      key: mappingKeyEdited ? prev.key : toKey(value),
                    }));
                  }}
                  placeholder="e.g. Shelf Life"
                  disabled={isUsingExistingDefinition}
                  required
                />
              </label>
              <label className="field">
                <span>Field name</span>
                <div className="inline-row">
                  <input
                    type="text"
                    value={mappingForm.key}
                    onChange={(event) => {
                      setMappingKeyEdited(true);
                      setMappingForm((prev) => ({ ...prev, key: event.target.value }));
                    }}
                    placeholder="e.g. shelf_life"
                    disabled={isUsingExistingDefinition}
                    required
                  />
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => {
                      setMappingForm((prev) => ({ ...prev, key: toKey(prev.label || '') }));
                      setMappingKeyEdited(false);
                    }}
                    disabled={isUsingExistingDefinition}
                  >
                    Auto
                  </button>
                </div>
                <p className="field-help">
                  {isUsingExistingDefinition
                    ? 'Field name comes from the shared library field. Edit it from Field Library if needed.'
                    : 'Used as the key in product data.'}
                </p>
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={selectedType}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, dataType: event.target.value }))
                  }
                  disabled={isUsingExistingDefinition}
                >
                  {dataTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedType === 'ENUM' ? (
                <div className="field field-span">
                  <span>Dropdown options</span>
                  {!isUsingExistingDefinition ? (
                    <div className="inline-row">
                      <input
                        type="text"
                        value={optionDraft}
                        onChange={(event) => setOptionDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addMappingOption();
                          }
                        }}
                        placeholder="Add options separated by commas"
                      />
                      <button type="button" className="ghost-btn small" onClick={addMappingOption}>
                        Add
                      </button>
                    </div>
                  ) : null}
                  {selectedOptions && selectedOptions.length ? (
                    <div className="tag-row">
                      {selectedOptions.map((option) => (
                        <span className="tag" key={option}>
                          {option}
                          {!isUsingExistingDefinition ? (
                            <button type="button" onClick={() => removeMappingOption(option)}>
                              x
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="field-help">
                      {isUsingExistingDefinition
                        ? 'This shared field does not have any dropdown options configured yet.'
                        : 'Options will show as a dropdown in the product form.'}
                    </p>
                  )}
                </div>
              ) : null}
              <label className="field">
                <span>Category group</span>
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
                  <option value="">Select category group</option>
                  {filteredMainCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="field-help">Used only to load categories.</p>
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
                  disabled={!mappingForm.mainCategoryId}
                  required
                >
                  <option value="">Select category</option>
                  {mappingCategories.map((item) => (
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
                  onChange={(event) =>
                    setMappingForm((prev) => ({
                      ...prev,
                      subCategoryId: event.target.value,
                    }))
                  }
                  disabled={!mappingForm.categoryId}
                >
                  <option value="">All sub-categories</option>
                  {mappingSubCategories.map((item) => (
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
              <label className="field">
                <span>Placeholder</span>
                <input
                  type="text"
                  value={mappingForm.placeholder}
                  onChange={(event) =>
                    setMappingForm((prev) => ({ ...prev, placeholder: event.target.value }))
                  }
                  placeholder="Optional placeholder text"
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
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save field'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <div>
              <h3 className="panel-subheading">Category fields</h3>
              <p className="panel-subtitle">
                {selectedSubCategory
                  ? `These fields appear only for products in ${selectedSubCategory.name}.`
                  : selectedCategory
                  ? `These fields appear for products in ${selectedCategory.name}.`
                  : 'Pick a category, then assign or create fields.'}
              </p>
            </div>
            <div className="inline-row">
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => openMappingFormForExisting()}
                disabled={!filterForm.categoryId}
              >
                Assign field
              </button>
              <button
                type="button"
                className="primary-btn compact"
                onClick={openMappingFormForNew}
                disabled={!filterForm.categoryId}
              >
                New field
              </button>
            </div>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Industry</span>
              <select value={selectedIndustryId} onChange={(event) => handleIndustryChange(event.target.value)}>
                <option value="">Select industry</option>
                {industries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Category group</span>
              <select
                value={filterForm.mainCategoryId}
                onChange={(event) => handleFilterChange('mainCategoryId', event.target.value)}
                disabled={!selectedIndustryId}
              >
                <option value="">Select category group</option>
                {filteredMainCategories.map((item) => (
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
                <option value="">Select category</option>
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
                <option value="">All sub-categories</option>
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
                <button type="button" className="ghost-btn small" onClick={resetFilter} disabled={isLoading}>
                  Reset
                </button>
              </div>
            </div>
          </div>
          <div className="attribute-context-bar">
            <div className="attribute-context-copy">
              <span className="attribute-context-label">Current target</span>
              <strong>{selectedScopeLabel || 'No category selected'}</strong>
              <p>{selectedScopeDescription}</p>
            </div>
            <div className="attribute-metric-row">
              <span className="attribute-metric-pill">
                Assigned <strong>{filterForm.categoryId ? totalFields : '-'}</strong>
              </span>
              <span className="attribute-metric-pill">
                Active <strong>{filterForm.categoryId ? activeFields : '-'}</strong>
              </span>
              <span className="attribute-metric-pill">
                Required <strong>{filterForm.categoryId ? requiredFields : '-'}</strong>
              </span>
              <span className="attribute-metric-pill">
                Inactive <strong>{filterForm.categoryId ? inactiveFields : '-'}</strong>
              </span>
            </div>
          </div>
          {!filterForm.categoryId ? (
            <p className="empty-state">
              Select industry, category group, and category first. Then use Assign field or New field.
            </p>
          ) : mappings.length === 0 ? (
            <p className="empty-state">
              No fields assigned yet for {selectedScopeLabel || selectedCategory?.name || 'this category'}. Use
              Assign field if it already exists in the library, or New field for a brand new concept.
            </p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
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
                      <td>{typeLabel(mapping.dataType || definitionMap.get(mapping.attributeId)?.dataType)}</td>
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
        <div className="panel card">
          <div className="panel-split">
            <div>
              <h3 className="panel-subheading">Field library</h3>
              <p className="panel-subtitle">
                Reusable fields. Click a field to see assignments and actions.
              </p>
            </div>
            <div className="inline-row">
              <button type="button" className="primary-btn compact" onClick={openDefinitionForm}>
                New field
              </button>
            </div>
          </div>
          <div className="field-grid">
            <label className="field field-span">
              <span>Search fields</span>
              <input
                type="search"
                value={definitionQuery}
                onChange={(event) => setDefinitionQuery(event.target.value)}
                placeholder="Search by label, key, or type"
              />
              <p className="field-help">
                Search examples: `shelf`, `moq`, `enum`, `weight`. Click a field to open details.
              </p>
            </label>
          </div>
          {filteredDefinitionLibrary.length === 0 ? (
            <p className="empty-state">No library fields found.</p>
          ) : (
            <div className="attribute-library-list">
              {filteredDefinitionLibrary.map((definition) => {
                const isExpanded = expandedLibraryFieldId === definition.id;
                const scopeLabel = `${definition.scopeCount || 0} ${
                  (definition.scopeCount || 0) === 1 ? 'scope' : 'scopes'
                }`;
                const activeMappingLabel = `${definition.activeMappingCount || 0} active mapping${
                  (definition.activeMappingCount || 0) === 1 ? '' : 's'
                }`;

                return (
                  <article
                    key={definition.id}
                    className={`attribute-accordion-item${
                      definition.assignedToCurrentScope ? ' is-current-scope' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className={`attribute-accordion-trigger${isExpanded ? ' is-open' : ''}`}
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedLibraryFieldId((prev) => (prev === definition.id ? null : definition.id))
                      }
                    >
                      <div className="attribute-accordion-main">
                        <div className="attribute-library-stack">
                          <span className="attribute-library-primary">{definition.label || '-'}</span>
                          <span className="attribute-library-secondary">Key: {definition.key || '-'}</span>
                        </div>
                        <div className="attribute-library-badges">
                          <span className="attribute-badge">{typeLabel(definition.dataType)}</span>
                          <span className="attribute-badge">{scopeLabel}</span>
                          <span className="attribute-badge">{activeMappingLabel}</span>
                          <span
                            className={`attribute-badge ${
                              definition.active !== false ? 'is-active' : 'is-inactive'
                            }`}
                          >
                            {definition.active !== false ? 'Active' : 'Inactive'}
                          </span>
                          {definition.assignedToCurrentScope ? (
                            <span className="attribute-badge is-selected">Assigned here</span>
                          ) : null}
                        </div>
                      </div>
                      <span className={`attribute-accordion-caret${isExpanded ? ' is-open' : ''}`} aria-hidden="true">
                        {isExpanded ? '-' : '+'}
                      </span>
                    </button>
                    {isExpanded ? (
                      <div className="attribute-accordion-panel">
                        <div className="attribute-accordion-section">
                          <span className="attribute-library-meta-label">Assigned in</span>
                          {definition.locations?.length ? (
                            <div className="attribute-location-list">
                              {definition.locations.map((location) => (
                                <div
                                  key={`${definition.id}-${location.scopeKey}`}
                                  className={`attribute-location-item${
                                    location.isCurrentScope ? ' is-current' : ''
                                  }`}
                                >
                                  <span className="attribute-location-text">{location.label}</span>
                                  <span
                                    className={`attribute-badge ${
                                      location.active ? ' is-active' : ' is-inactive'
                                    }`}
                                  >
                                    {location.isCurrentScope
                                      ? 'Selected'
                                      : location.active
                                      ? 'Active'
                                      : 'Inactive'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="attribute-library-secondary">Not assigned yet</span>
                          )}
                        </div>
                        <div className="attribute-accordion-actions">
                          <button
                            type="button"
                            className="ghost-btn small"
                            onClick={() => openMappingFormForExisting(definition)}
                            disabled={!filterForm.categoryId || definition.assignedToCurrentScope}
                            title={
                              !filterForm.categoryId
                                ? 'Select a category first.'
                                : definition.assignedToCurrentScope
                                ? 'Already assigned to the selected category scope.'
                                : 'Assign this field to the selected category scope.'
                            }
                          >
                            {definition.assignedToCurrentScope ? 'Assigned' : 'Assign'}
                          </button>
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
                            disabled={definition.mappingCount > 0}
                            title={
                              definition.mappingCount > 0
                                ? 'Remove category mappings before deleting this field from the library.'
                                : 'Delete this library field.'
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductAttributePage;
