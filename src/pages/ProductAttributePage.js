import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner, TableRowActionMenu } from '../components';
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
        <div className="admin-modal-backdrop" onClick={() => setShowDefinitionForm(false)}>
          <form
            className="admin-modal attribute-definition-modal"
            onSubmit={handleDefinitionSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">
                {editingDefinitionId ? 'Edit attribute definition' : 'Add Dynamic Field'}
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
