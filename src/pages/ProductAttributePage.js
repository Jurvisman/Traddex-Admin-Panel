import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner, TableRowActionMenu, ToggleSwitch } from '../components';
import { usePermissions } from '../shared/permissions';
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const paginateItems = (items, page, pageSize) => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  return { items: items.slice(start, end), totalItems, totalPages, page: safePage, start, end };
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
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [openActionRowId, setOpenActionRowId] = useState(null);
  const [defPage, setDefPage] = useState(1);
  const [defPageSize, setDefPageSize] = useState(25);
  const { hasPermission } = usePermissions();

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
      .sort((left, right) => (right.id ?? 0) - (left.id ?? 0));
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

  const selectedLibraryDefinition = useMemo(
    () => definitionLibrary.find((definition) => definition.id === expandedLibraryFieldId) || null,
    [definitionLibrary, expandedLibraryFieldId]
  );

  const paginatedDefinitions = useMemo(
    () => paginateItems(filteredDefinitionLibrary, defPage, defPageSize),
    [filteredDefinitionLibrary, defPage, defPageSize]
  );

  const totalFields = mappings.length;
  const activeFields = mappings.filter((item) => item.active !== false).length;
  const requiredFields = mappings.filter((item) => item.required).length;
  const inactiveFields = Math.max(0, totalFields - activeFields);

  const totalReusableFields = definitions.length;
  const activeLibraryFields = definitions.filter((item) => item.active !== false).length;
  const inactiveLibraryFields = Math.max(0, totalReusableFields - activeLibraryFields);
  const libraryFieldsInUse = definitionLibrary.filter((item) => (item.scopeCount || 0) > 0).length;

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
    <>
    <div className="attribute-admin-page">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Reusable Fields</h2>
          <p className="panel-subtitle">Advanced cleanup and reusable field management for product categories.</p>
        </div>
      </div>
      <Banner message={message} />

      {showDefinitionForm ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setShowDefinitionForm(false)}>
          <div
            className="admin-modal cat-unified-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  {editingDefinitionId ? 'Edit Library Field' : 'Create Library Field'}
                </h3>
                {definitionForm.label && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    Field Library › {definitionForm.label}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowDefinitionForm(false)}
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

            {/* Modal Body */}
            <form onSubmit={handleDefinitionSubmit}>
              <div style={{ padding: '24px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Row 1: Label + Data Type + Internal Key */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: 16 }}>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Field Label <span style={{ color: '#ef4444' }}>*</span>
                      </label>
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
                        placeholder="e.g. Battery Capacity"
                        required
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Data Type <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={definitionForm.dataType}
                        onChange={(event) => setDefinitionForm((prev) => ({ ...prev, dataType: event.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        {dataTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Internal Key
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          value={definitionForm.key}
                          onChange={(event) => { setDefinitionForm(p => ({ ...p, key: event.target.value })); setKeyEdited(true); }}
                          placeholder="key_name"
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <button type="button" className="ghost-btn" style={{ flexShrink: 0, padding: '0 8px', fontSize: 10, height: 38 }} onClick={() => { setDefinitionForm(p => ({ ...p, key: toKey(p.label || '') })); setKeyEdited(false); }}>Auto</button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Basic Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 16, alignItems: 'center' }}>
                    <ToggleSwitch
                      id="def-active-toggle"
                      checked={definitionForm.active}
                      onChange={(val) => setDefinitionForm(p => ({ ...p, active: val }))}
                      label="Available in Library"
                    />
                    {definitionForm.dataType === 'NUMBER' && (
                      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, whiteSpace: 'nowrap' }}>Unit:</label>
                        <input
                          type="text"
                          value={definitionForm.unit}
                          onChange={(event) => setDefinitionForm((prev) => ({ ...prev, unit: event.target.value }))}
                          placeholder="e.g. mAh"
                          style={{ width: '120px' }}
                        />
                      </div>
                    )}
                  </div>

                  {definitionForm.dataType === 'ENUM' && (
                    <div style={{ padding: '16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                        Dropdown Values
                      </label>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
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
                          placeholder="Type option and press Enter..."
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <button type="button" className="primary-btn" style={{ flexShrink: 0, padding: '0 16px' }} onClick={addEnumOption}>
                          Add
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {definitionForm.enumOptions.length > 0 ? (
                          definitionForm.enumOptions.map((option) => (
                            <span key={option} style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', 
                              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b' 
                            }}>
                              {option}
                              <button 
                                type="button" 
                                onClick={() => removeEnumOption(option)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: 0, display: 'flex' }}
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        ) : (
                          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No values defined.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Validation Group */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setShowDefinitionAdvanced(!showDefinitionAdvanced)}
                      style={{ 
                        width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left' 
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Validation Rules</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{showDefinitionAdvanced ? 'Collapse' : 'Expand'}</span>
                    </button>
                    {showDefinitionAdvanced && (
                      <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {definitionForm.dataType === 'STRING' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="field">
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Min Length</label>
                              <input type="number" value={definitionForm.minLength} onChange={(e) => setDefinitionForm(p => ({ ...p, minLength: e.target.value }))} placeholder="0" />
                            </div>
                            <div className="field">
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Max Length</label>
                              <input type="number" value={definitionForm.maxLength} onChange={(e) => setDefinitionForm(p => ({ ...p, maxLength: e.target.value }))} placeholder="255" />
                            </div>
                          </div>
                        )}
                        {definitionForm.dataType === 'NUMBER' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="field">
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Min Value</label>
                              <input type="number" value={definitionForm.minValue} onChange={(e) => setDefinitionForm(p => ({ ...p, minValue: e.target.value }))} placeholder="0" />
                            </div>
                            <div className="field">
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Max Value</label>
                              <input type="number" value={definitionForm.maxValue} onChange={(e) => setDefinitionForm(p => ({ ...p, maxValue: e.target.value }))} placeholder="9999" />
                            </div>
                          </div>
                        )}
                        {definitionForm.dataType === 'STRING' && (
                          <div className="field">
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Regex Pattern</label>
                            <input type="text" value={definitionForm.pattern} onChange={(e) => setDefinitionForm(p => ({ ...p, pattern: e.target.value }))} placeholder="e.g. ^[A-Z0-9]+$" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>


                  {/* Description */}
                  <div className="field">
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Internal Description
                    </label>
                    <textarea
                      rows="3"
                      value={definitionForm.description}
                      onChange={(event) => setDefinitionForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Brief note about this field for other admins..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: 14 }}
                    />
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'flex-end', gap: 12,
                background: '#fafafa',
              }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowDefinitionForm(false)}
                  style={{ minWidth: 100 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isLoading}
                  style={{ minWidth: 140 }}
                >
                  {isLoading ? 'Saving...' : editingDefinitionId ? 'Update Library Field' : 'Create Library Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showMappingForm ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setShowMappingForm(false)}>
          <div
            className="admin-modal cat-unified-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px 14px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  {editingMappingId ? 'Edit Field Assignment' : 'Assign Field to Category'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                   {mappingForm.label || 'New Assignment'} › {selectedScopeLabel || 'No scope selected'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMappingForm(false)}
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

            {/* Modal Body */}
            <form onSubmit={handleMappingSubmit}>
              <div style={{ padding: '24px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  
                  {/* Left Column: Field Selection & Basic Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                        Field Source
                      </label>
                      <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
                        <button
                          type="button"
                          onClick={() => { setMappingDefinitionMode('existing'); clearMappingDefinitionSelection(); }}
                          style={{ 
                            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: isUsingExistingDefinition ? '#fff' : 'transparent',
                            boxShadow: isUsingExistingDefinition ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            color: isUsingExistingDefinition ? '#1e293b' : '#64748b'
                          }}
                        >
                          Reuse from Library
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMappingDefinitionMode('new'); clearMappingDefinitionSelection(); }}
                          style={{ 
                            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: !isUsingExistingDefinition ? '#fff' : 'transparent',
                            boxShadow: !isUsingExistingDefinition ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            color: !isUsingExistingDefinition ? '#1e293b' : '#64748b'
                          }}
                        >
                          Create Specific
                        </button>
                      </div>
                    </div>

                    {isUsingExistingDefinition && (
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Pick Library Field <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          value={mappingForm.attributeId}
                          onChange={(event) => {
                            const nextId = event.target.value;
                            if (!nextId) { clearMappingDefinitionSelection(); return; }
                            const definition = definitionMap.get(Number(nextId));
                            if (definition) applyDefinitionToMappingForm(definition);
                          }}
                          required
                          style={{ width: '100%' }}
                        >
                          <option value="">-- Choose Field --</option>
                          {definitionLibrary.map((def) => (
                            <option key={def.id} value={def.id}>{def.label} ({def.dataType})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Display Label <span style={{ color: '#ef4444' }}>*</span>
                      </label>
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
                        disabled={isUsingExistingDefinition}
                        placeholder="e.g. Dimensions"
                        required
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Field Key</label>
                        <input type="text" value={mappingForm.key} disabled={isUsingExistingDefinition} placeholder="dimensions" style={{ width: '100%', background: isUsingExistingDefinition ? '#f8fafc' : 'transparent' }} />
                      </div>
                      <div className="field">
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Type</label>
                        <input type="text" value={typeLabel(selectedType)} disabled style={{ width: '100%', background: '#f8fafc' }} />
                      </div>
                    </div>

                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Placeholder Text</label>
                      <input
                        type="text"
                        value={mappingForm.placeholder}
                        onChange={(e) => setMappingForm(p => ({ ...p, placeholder: e.target.value }))}
                        placeholder="e.g. Length x Width x Height"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Scope & Visibility */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    <div style={{ padding: '16px', borderRadius: 12, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                        Scope (Assign To)
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <select 
                          value={mappingForm.mainCategoryId} 
                          onChange={(e) => setMappingForm(p => ({ ...p, mainCategoryId: e.target.value, categoryId: '', subCategoryId: '' }))}
                          style={{ width: '100%', fontSize: 13 }}
                        >
                          <option value="">Category Group...</option>
                          {filteredMainCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        <select 
                          value={mappingForm.categoryId} 
                          disabled={!mappingForm.mainCategoryId}
                          onChange={(e) => setMappingForm(p => ({ ...p, categoryId: e.target.value, subCategoryId: '' }))}
                          style={{ width: '100%', fontSize: 13 }}
                        >
                          <option value="">Category...</option>
                          {mappingCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        <select 
                          value={mappingForm.subCategoryId} 
                          disabled={!mappingForm.categoryId}
                          onChange={(e) => setMappingForm(p => ({ ...p, subCategoryId: e.target.value }))}
                          style={{ width: '100%', fontSize: 13 }}
                        >
                          <option value="">All Sub-categories</option>
                          {mappingSubCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Field Settings
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <ToggleSwitch
                          id="map-required-toggle"
                          checked={mappingForm.required}
                          onChange={(val) => setMappingForm(p => ({ ...p, required: val }))}
                          label="Required (Must fill)"
                        />
                        <ToggleSwitch
                          id="map-filterable-toggle"
                          checked={mappingForm.filterable}
                          onChange={(val) => setMappingForm(p => ({ ...p, filterable: val }))}
                          label="Visible in App Filters"
                        />
                        <ToggleSwitch
                          id="map-searchable-toggle"
                          checked={mappingForm.searchable}
                          onChange={(val) => setMappingForm(p => ({ ...p, searchable: val }))}
                          label="Searchable in App"
                        />
                        <ToggleSwitch
                          id="map-active-toggle"
                          checked={mappingForm.active}
                          onChange={(val) => setMappingForm(p => ({ ...p, active: val }))}
                          label="Active Status"
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Display Order</label>
                      <input
                        type="number"
                        value={mappingForm.sortOrder}
                        onChange={(e) => setMappingForm(p => ({ ...p, sortOrder: e.target.value }))}
                        placeholder="1"
                        style={{ width: '80px' }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'flex-end', gap: 12,
                background: '#fafafa',
              }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowMappingForm(false)}
                  style={{ minWidth: 100 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isLoading}
                  style={{ minWidth: 140 }}
                >
                  {isLoading ? 'Saving...' : editingMappingId ? 'Update Assignment' : 'Assign Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className={`mv-layout${selectedLibraryDefinition ? ' mv-layout--split' : ''}`}>
        <div className="panel card users-table-card">
          <div className="gsc-datatable-toolbar">
            <div className="gsc-datatable-toolbar-left" />
            <div className="gsc-datatable-toolbar-right">
            <div className="gsc-toolbar-search">
              <input
                type="search"
                value={definitionQuery}
                onChange={(event) => { setDefinitionQuery(event.target.value); setDefPage(1); }}
                placeholder="Search"
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
              onClick={openDefinitionForm}
              title="Create field"
              aria-label="Create field"
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
          {filteredDefinitionLibrary.length === 0 ? (
            <p className="empty-state">No library fields found.</p>
          ) : (
            <>
              <div className="table-shell">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Field name</th>
                      <th>Type</th>
                      <th>Key</th>
                      <th>Used in</th>
                      <th>Status</th>
                      <th className="table-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDefinitions.items.map((definition, index) => {
                      const scopeLabel = `${definition.scopeCount || 0} ${
                        (definition.scopeCount || 0) === 1 ? 'place' : 'places'
                      }`;
                      return (
                        <tr
                          key={definition.id}
                          className={expandedLibraryFieldId === definition.id ? 'mv-row-active' : ''}
                          onClick={() =>
                            setExpandedLibraryFieldId((prev) =>
                              prev === definition.id ? null : definition.id
                            )
                          }
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{paginatedDefinitions.start + index + 1}</td>
                          <td>{definition.label || '-'}</td>
                          <td>{typeLabel(definition.dataType)}</td>
                          <td>{definition.key || '-'}</td>
                          <td>{scopeLabel}</td>
                          <td>
                            <span className={definition.active !== false ? 'status-verified' : 'status-inactive'}>
                              {definition.active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="table-actions" onClick={(event) => event.stopPropagation()}>
                            {(() => {
                              const actions = [
                                {
                                  label: 'View',
                                  onClick: () => setExpandedLibraryFieldId((prev) => prev === definition.id ? null : definition.id),
                                },
                              ];
                              if (hasPermission('ADMIN_DYNAMIC_FIELDS_UPDATE')) {
                                actions.push({
                                  label: 'Edit',
                                  onClick: () => handleEditDefinition(definition),
                                });
                              }
                              if (hasPermission('ADMIN_DYNAMIC_FIELDS_DELETE')) {
                                actions.push({
                                  label: 'Delete',
                                  onClick: () => handleDeleteDefinition(definition.id),
                                  danger: true,
                                });
                              }
                              return (
                                <TableRowActionMenu
                                  rowId={definition.id}
                                  openRowId={openActionRowId}
                                  onToggle={setOpenActionRowId}
                                  actions={actions}
                                />
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bv-table-footer">
                <div className="table-record-count">
                  <span>
                    {paginatedDefinitions.totalItems === 0
                      ? '0 records'
                      : `Showing ${paginatedDefinitions.start + 1}–${paginatedDefinitions.end} of ${paginatedDefinitions.totalItems}`}
                  </span>
                </div>
                <div className="product-pagination-controls">
                  <label className="product-pagination-size">
                    <span>Rows</span>
                    <select value={defPageSize} onChange={(e) => { setDefPageSize(Number(e.target.value)); setDefPage(1); }}>
                      {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <div className="bv-table-pagination">
                    <button type="button" className="secondary-btn" disabled={paginatedDefinitions.page <= 1} onClick={() => setDefPage((p) => p - 1)}>{'< Prev'}</button>
                    <span>Page {paginatedDefinitions.page} / {paginatedDefinitions.totalPages}</span>
                    <button type="button" className="secondary-btn" disabled={paginatedDefinitions.page >= paginatedDefinitions.totalPages} onClick={() => setDefPage((p) => p + 1)}>{'Next >'}</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedLibraryDefinition ? (
          <div className="mv-panel card">
            {/* Header */}
            <div className="mv-panel-header">
              <div className="mv-panel-title-row">
                <button type="button" className="mv-back-btn" onClick={() => setExpandedLibraryFieldId(null)}>
                  ← Back
                </button>
                <h3 className="mv-panel-title">{selectedLibraryDefinition.label}</h3>
                <span className={selectedLibraryDefinition.active !== false ? 'status-active' : 'status-inactive'}>
                  {selectedLibraryDefinition.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              {hasPermission('ADMIN_DYNAMIC_FIELDS_UPDATE') && (
                <button type="button" className="ghost-btn small" onClick={() => handleEditDefinition(selectedLibraryDefinition)}>
                  Edit
                </button>
              )}
            </div>

            {/* Field Details */}
            <div className="mv-section">
              <p className="mv-section-label">Field Details</p>
              <div className="mv-detail-grid">
                <span className="mv-detail-label">Field Name</span>
                <span className="mv-detail-value">{selectedLibraryDefinition.label || '-'}</span>
                <span className="mv-detail-label">Key</span>
                <span className="mv-detail-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{selectedLibraryDefinition.key || '-'}</span>
                <span className="mv-detail-label">Data Type</span>
                <span className="mv-detail-value">{typeLabel(selectedLibraryDefinition.dataType)}</span>
                <span className="mv-detail-label">Used In</span>
                <span className="mv-detail-value">
                  {selectedLibraryDefinition.scopeCount || 0} {(selectedLibraryDefinition.scopeCount || 0) === 1 ? 'place' : 'places'} · {selectedLibraryDefinition.activeMappingCount || 0} active
                </span>
              </div>
              {Array.isArray(selectedLibraryDefinition.options?.values) && selectedLibraryDefinition.options.values.length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <span className="mv-detail-label">Options</span>
                  <div className="mv-child-grid" style={{ marginTop: 6 }}>
                    {selectedLibraryDefinition.options.values.map((opt) => (
                      <div key={opt} className="mv-child-card" style={{ minWidth: 'auto', padding: '4px 10px' }}>
                        <span className="mv-child-name" style={{ fontSize: 12, marginBottom: 0 }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Assigned in categories */}
            <div className="mv-section">
              <p className="mv-section-label">
                Assigned in categories
                {selectedLibraryDefinition.locations?.length > 0 && (
                  <span className="mv-count-badge">{selectedLibraryDefinition.locations.length}</span>
                )}
              </p>
              {selectedLibraryDefinition.locations?.length ? (
                <div className="mv-child-grid">
                  {selectedLibraryDefinition.locations.map((location) => (
                    <div
                      key={`${selectedLibraryDefinition.id}-${location.scopeKey}`}
                      className="mv-child-card"
                      style={{ flexBasis: '100%', minWidth: 0 }}
                    >
                      <div className="mv-child-name" style={{ fontSize: 12, marginBottom: 4 }}>{location.label}</div>
                      <div className="mv-child-meta">
                        <span className={location.active ? 'status-active' : 'status-inactive'}>
                          {location.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mv-empty">Not assigned to any category yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}

export default ProductAttributePage;
