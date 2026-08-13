
import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import CatalogBulkImportModal from '../components/CatalogBulkImportModal';
import {
  createCategory,
  createIndustry,
  createMainCategory,
  createSubCategory,
  deleteCategory,
  deleteIndustry,
  deleteMainCategory,
  deleteSubCategory,
  listCategories,
  listIndustries,
  listMainCategories,
  listSubCategories,
  updateCategory,
  updateIndustry,
  updateMainCategory,
  updateSubCategory,
} from '../services/adminApi';
import { buildOrderingWarning, findNextAvailableOrdering, findOrderingConflict, parseOrderingInput } from '../utils/ordering';

const initialIndustryForm = {
  name: '',
  industryIcon: '',
  industryImage: '',
  ordering: '',
  path: '',
  active: '1',
};

const initialMainForm = {
  name: '',
  industryId: '',
  mainCategoryIcon: '',
  imageUrl: '',
  ordering: '',
  path: '',
  active: '1',
};

const initialCategoryForm = {
  name: '',
  mainCategoryId: '',
  categoryIcon: '',
  imageUrl: '',
  ordering: '',
  path: '',
  active: '1',
  hasSubCategory: '1',
};

const initialSubForm = {
  name: '',
  categoryId: '',
  subCategoryIcon: '',
  imageUrl: '',
  ordering: '',
  path: '',
  active: '1',
};

const isImageUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

function CatalogManagerPage({ token }) {
  const [industries, setIndustries] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [allMainCategories, setAllMainCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState('');
  const [selectedMainId, setSelectedMainId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [activeForm, setActiveForm] = useState('industry');
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [industryForm, setIndustryForm] = useState(initialIndustryForm);
  const [mainForm, setMainForm] = useState(initialMainForm);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [subForm, setSubForm] = useState(initialSubForm);
  const [editingIndustryId, setEditingIndustryId] = useState(null);
  const [editingMainId, setEditingMainId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingSubId, setEditingSubId] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'unmapped'
  const [unmappedRequests, setUnmappedRequests] = useState([
    { id: 1, businessName: 'SolarTech Solutions', mobile: '9876543210', customType: 'Industry', customName: 'Solar Energy', date: '2 mins ago' },
    { id: 2, businessName: 'EV Charge Point', mobile: '9812345678', customType: 'Industry', customName: 'EV Charging Infrastructure', date: '1 hour ago' },
  ]);
  const [remapModal, setRemapModal] = useState({ open: false, item: null, targetIndustryId: '' });

  const handleApproveCustomAsMaster = (item) => {
    setActiveTab('catalog');
    setActiveForm('industry');
    setEditingIndustryId(null);
    setIndustryForm({
      ...initialIndustryForm,
      name: item.customName,
      ordering: findNextAvailableOrdering(industries).toString(),
      active: '1',
    });
    setMessage({ type: 'info', text: `Pre-filled "${item.customName}" into Industry Form. Review ordering and click "Add industry" to approve as Master!` });
  };

  const handleConfirmRemap = (event) => {
    event.preventDefault();
    if (!remapModal.targetIndustryId) {
      setMessage({ type: 'error', text: 'Select an existing industry to remap.' });
      return;
    }
    const targetInd = industries.find((i) => String(i.id) === String(remapModal.targetIndustryId));
    setUnmappedRequests((prev) => prev.filter((r) => r.id !== remapModal.item.id));
    setRemapModal({ open: false, item: null, targetIndustryId: '' });
    setMessage({ type: 'success', text: `Successfully remapped custom entry "${remapModal.item.customName}" to existing industry "${targetInd?.name || 'Selected'}"!` });
  };

  const loadIndustries = async (keepSelection = true) => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listIndustries(token);
      const list = (response?.data || []).map((item) => ({
        ...item,
        id: item.id ?? item.industryId,
      }));
      setIndustries(list);
      if (!keepSelection) {
        const nextId = list[0]?.id ? String(list[0].id) : '';
        setSelectedIndustryId(nextId);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch industries.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMainCategories = async (industryId, preferredId) => {
    if (!industryId) {
      setMainCategories([]);
      return;
    }
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listMainCategories(token);
      const allItems = response?.data || [];
      setAllMainCategories(allItems);
      const list = allItems.filter((item) => String(item.industryId) === String(industryId));
      setMainCategories(list);
      const preferred = preferredId ? String(preferredId) : '';
      const hasPreferred = preferred.length > 0 && list.some((item) => String(item.id) === preferred);
      const nextId = hasPreferred ? preferred : list[0]?.id ? String(list[0].id) : '';
      setSelectedMainId(nextId);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch main categories.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async (mainCategoryId, preferredId) => {
    if (!mainCategoryId) {
      setCategories([]);
      return;
    }
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listCategories(token, mainCategoryId);
      const list = response?.data || [];
      setCategories(list);
      const preferred = preferredId ? String(preferredId) : '';
      const hasPreferred = preferred.length > 0 && list.some((item) => String(item.id) === preferred);
      const nextId = hasPreferred ? preferred : list[0]?.id ? String(list[0].id) : '';
      setSelectedCategoryId(nextId);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch categories.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubCategories = async (categoryId) => {
    if (!categoryId) {
      setSubCategories([]);
      return;
    }
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listSubCategories(token, categoryId);
      setSubCategories(response?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch sub-categories.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllMainCategories = async () => {
    const response = await listMainCategories(token);
    const list = response?.data || [];
    setAllMainCategories(list);
    return list;
  };

  const loadAllCategories = async () => {
    const response = await listCategories(token);
    const list = response?.data || [];
    setAllCategories(list);
    return list;
  };

  const loadAllSubCategories = async () => {
    const response = await listSubCategories(token);
    const list = response?.data || [];
    setAllSubCategories(list);
    return list;
  };

  const refreshOrderingCatalogCaches = async () => {
    await Promise.allSettled([
      loadAllMainCategories(),
      loadAllCategories(),
      loadAllSubCategories(),
    ]);
  };

  useEffect(() => {
    loadIndustries(false);
    refreshOrderingCatalogCaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mainForm.industryId) return;
    loadAllMainCategories().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainForm.industryId]);

  useEffect(() => {
    if (!categoryForm.mainCategoryId) return;
    loadAllCategories().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryForm.mainCategoryId]);

  useEffect(() => {
    if (!subForm.categoryId) return;
    loadAllSubCategories().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subForm.categoryId]);

  useEffect(() => {
    if (!selectedIndustryId) return;
    setMainForm((prev) => ({ ...prev, industryId: selectedIndustryId }));
    loadMainCategories(selectedIndustryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustryId]);

  useEffect(() => {
    if (!selectedMainId) {
      setCategories([]);
      setSelectedCategoryId('');
      return;
    }
    setCategoryForm((prev) => ({ ...prev, mainCategoryId: selectedMainId }));
    loadCategories(selectedMainId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMainId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setSubCategories([]);
      return;
    }
    setSubForm((prev) => ({ ...prev, categoryId: selectedCategoryId }));
    loadSubCategories(selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const industryLookup = useMemo(() => {
    const map = new Map();
    industries.forEach((item) => {
      if (item.id != null) map.set(String(item.id), item);
    });
    return map;
  }, [industries]);

  const mainLookup = useMemo(() => {
    const map = new Map();
    mainCategories.forEach((item) => {
      if (item.id != null) map.set(String(item.id), item);
    });
    return map;
  }, [mainCategories]);

  const selectedIndustry = industryLookup.get(String(selectedIndustryId));
  const selectedMain = mainLookup.get(String(selectedMainId));
  const selectedCategory = categories.find((item) => String(item.id) === String(selectedCategoryId));
  const requestedIndustryOrdering = parseOrderingInput(industryForm.ordering);
  const requestedMainOrdering = parseOrderingInput(mainForm.ordering);
  const requestedCategoryOrdering = parseOrderingInput(categoryForm.ordering);
  const requestedSubOrdering = parseOrderingInput(subForm.ordering);

  const industryOrderingWarning = buildOrderingWarning(
    requestedIndustryOrdering,
    findOrderingConflict({
      items: industries,
      requestedOrder: requestedIndustryOrdering,
      currentItemId: editingIndustryId,
      getItemId: (item) => item.id ?? item.industryId,
    }),
    findNextAvailableOrdering({
      items: industries,
      currentItemId: editingIndustryId,
      getItemId: (item) => item.id ?? item.industryId,
    })
  );
  const mainOrderingWarning = buildOrderingWarning(
    requestedMainOrdering,
    findOrderingConflict({
      items: allMainCategories,
      requestedOrder: requestedMainOrdering,
      currentItemId: editingMainId,
      matchesScope: (item) => String(item.industryId ?? '') === String(mainForm.industryId ?? ''),
    }),
    findNextAvailableOrdering({
      items: allMainCategories,
      currentItemId: editingMainId,
      matchesScope: (item) => String(item.industryId ?? '') === String(mainForm.industryId ?? ''),
    })
  );
  const categoryOrderingWarning = buildOrderingWarning(
    requestedCategoryOrdering,
    findOrderingConflict({
      items: allCategories,
      requestedOrder: requestedCategoryOrdering,
      currentItemId: editingCategoryId,
      matchesScope: (item) => String(item.mainCategoryId ?? item.main_category_id ?? '') === String(categoryForm.mainCategoryId ?? ''),
    }),
    findNextAvailableOrdering({
      items: allCategories,
      currentItemId: editingCategoryId,
      matchesScope: (item) => String(item.mainCategoryId ?? item.main_category_id ?? '') === String(categoryForm.mainCategoryId ?? ''),
    })
  );
  const subOrderingWarning = buildOrderingWarning(
    requestedSubOrdering,
    findOrderingConflict({
      items: allSubCategories,
      requestedOrder: requestedSubOrdering,
      currentItemId: editingSubId,
      matchesScope: (item) => String(item.categoryId ?? item.category_id ?? '') === String(subForm.categoryId ?? ''),
    }),
    findNextAvailableOrdering({
      items: allSubCategories,
      currentItemId: editingSubId,
      matchesScope: (item) => String(item.categoryId ?? item.category_id ?? '') === String(subForm.categoryId ?? ''),
    })
  );

  const resetIndustryEditor = () => {
    setEditingIndustryId(null);
    setIndustryForm(initialIndustryForm);
  };

  const resetMainEditor = () => {
    setEditingMainId(null);
    setMainForm((prev) => ({ ...initialMainForm, industryId: prev.industryId || selectedIndustryId || '' }));
  };

  const resetCategoryEditor = () => {
    setEditingCategoryId(null);
    setCategoryForm((prev) => ({ ...initialCategoryForm, mainCategoryId: prev.mainCategoryId || selectedMainId || '' }));
  };

  const resetSubEditor = () => {
    setEditingSubId(null);
    setSubForm((prev) => ({ ...initialSubForm, categoryId: prev.categoryId || selectedCategoryId || '' }));
  };

  const renderImageCell = (value, fallback = '-') => {
    if (!isImageUrl(value)) return fallback;
    return <img src={value.trim()} alt="" className="catalog-thumb" loading="lazy" />;
  };

  const handleIndustrySubmit = async (event) => {
    event.preventDefault();
    if (!industryForm.name.trim()) {
      setMessage({ type: 'error', text: 'Industry name is required.' });
      return;
    }
    if (Number.isNaN(requestedIndustryOrdering)) {
      setMessage({ type: 'error', text: 'Ordering must be a whole number greater than 0.' });
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        name: industryForm.name.trim(),
        industryIcon: industryForm.industryIcon || null,
        industryImage: industryForm.industryImage || null,
        ordering: requestedIndustryOrdering,
        path: industryForm.path || null,
        active: Number(industryForm.active),
      };
      if (editingIndustryId) {
        await updateIndustry(token, editingIndustryId, payload);
        await loadIndustries(true);
        await refreshOrderingCatalogCaches();
        resetIndustryEditor();
        setMessage({ type: 'success', text: 'Industry updated.' });
      } else {
        await createIndustry(token, payload);
        setIndustryForm(initialIndustryForm);
        await loadIndustries(false);
        await refreshOrderingCatalogCaches();
        setMessage({ type: 'success', text: 'Industry created.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save industry.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMainSubmit = async (event) => {
    event.preventDefault();
    if (!mainForm.name.trim() || !mainForm.industryId) {
      setMessage({ type: 'error', text: 'Main category name and industry are required.' });
      return;
    }
    if (Number.isNaN(requestedMainOrdering)) {
      setMessage({ type: 'error', text: 'Ordering must be a whole number greater than 0.' });
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        name: mainForm.name.trim(),
        industryId: Number(mainForm.industryId),
        mainCategoryIcon: mainForm.mainCategoryIcon || null,
        imageUrl: mainForm.imageUrl || null,
        ordering: requestedMainOrdering,
        path: mainForm.path || null,
        active: Number(mainForm.active),
      };
      if (editingMainId) {
        await updateMainCategory(token, editingMainId, payload);
        await loadMainCategories(mainForm.industryId, editingMainId);
        await refreshOrderingCatalogCaches();
        resetMainEditor();
        setMessage({ type: 'success', text: 'Main category updated.' });
      } else {
        await createMainCategory(token, payload);
        setMainForm((prev) => ({ ...initialMainForm, industryId: prev.industryId }));
        await loadMainCategories(mainForm.industryId);
        await refreshOrderingCatalogCaches();
        setMessage({ type: 'success', text: 'Main category created.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save main category.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    if (!categoryForm.name.trim() || !categoryForm.mainCategoryId) {
      setMessage({ type: 'error', text: 'Category name and main category are required.' });
      return;
    }
    if (Number.isNaN(requestedCategoryOrdering)) {
      setMessage({ type: 'error', text: 'Ordering must be a whole number greater than 0.' });
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        name: categoryForm.name.trim(),
        mainCategoryId: Number(categoryForm.mainCategoryId),
        categoryIcon: categoryForm.categoryIcon || null,
        imageUrl: categoryForm.imageUrl || null,
        ordering: requestedCategoryOrdering,
        path: categoryForm.path || null,
        active: Number(categoryForm.active),
        hasSubCategory: Number(categoryForm.hasSubCategory),
      };
      if (editingCategoryId) {
        await updateCategory(token, editingCategoryId, payload);
        await loadCategories(categoryForm.mainCategoryId, editingCategoryId);
        await refreshOrderingCatalogCaches();
        resetCategoryEditor();
        setMessage({ type: 'success', text: 'Category updated.' });
      } else {
        await createCategory(token, payload);
        setCategoryForm((prev) => ({ ...initialCategoryForm, mainCategoryId: prev.mainCategoryId }));
        await loadCategories(categoryForm.mainCategoryId);
        await refreshOrderingCatalogCaches();
        setMessage({ type: 'success', text: 'Category created.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save category.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubSubmit = async (event) => {
    event.preventDefault();
    if (!subForm.name.trim() || !subForm.categoryId) {
      setMessage({ type: 'error', text: 'Sub-category name and category are required.' });
      return;
    }
    if (Number.isNaN(requestedSubOrdering)) {
      setMessage({ type: 'error', text: 'Ordering must be a whole number greater than 0.' });
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        name: subForm.name.trim(),
        categoryId: Number(subForm.categoryId),
        subCategoryIcon: subForm.subCategoryIcon || null,
        imageUrl: subForm.imageUrl || null,
        ordering: requestedSubOrdering,
        path: subForm.path || null,
        active: Number(subForm.active),
      };
      if (editingSubId) {
        await updateSubCategory(token, editingSubId, payload);
        await loadSubCategories(subForm.categoryId);
        await refreshOrderingCatalogCaches();
        resetSubEditor();
        setMessage({ type: 'success', text: 'Sub-category updated.' });
      } else {
        await createSubCategory(token, payload);
        setSubForm((prev) => ({ ...initialSubForm, categoryId: prev.categoryId }));
        await loadSubCategories(subForm.categoryId);
        await refreshOrderingCatalogCaches();
        setMessage({ type: 'success', text: 'Sub-category created.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save sub-category.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIndustry = async (id) => {
    try {
      setIsLoading(true);
      await deleteIndustry(token, id);
      await loadIndustries(false);
      await refreshOrderingCatalogCaches();
      setMessage({ type: 'success', text: 'Industry deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete industry.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditIndustry = (item) => {
    setActiveForm('industry');
    setEditingIndustryId(item.id);
    setIndustryForm({
      name: item.name ?? '',
      industryIcon: item.industryIcon ?? '',
      industryImage: item.industryImage ?? '',
      ordering: item.ordering?.toString?.() ?? '',
      path: item.path ?? '',
      active: String(item.active ?? 1),
    });
    setMessage({ type: 'info', text: `Editing industry: ${item.name}` });
  };

  const handleEditMain = (item) => {
    setActiveForm('main');
    setEditingMainId(item.id);
    setSelectedIndustryId(String(item.industryId ?? selectedIndustryId));
    setMainForm({
      name: item.name ?? '',
      industryId: String(item.industryId ?? selectedIndustryId ?? ''),
      mainCategoryIcon: item.mainCategoryIcon ?? '',
      imageUrl: item.imageUrl ?? '',
      ordering: item.ordering?.toString?.() ?? '',
      path: item.path ?? '',
      active: String(item.active ?? 1),
    });
    setMessage({ type: 'info', text: `Editing main category: ${item.name}` });
  };

  const handleEditCategory = (item) => {
    setActiveForm('category');
    setEditingCategoryId(item.id);
    setSelectedMainId(String(item.mainCategoryId ?? selectedMainId));
    setCategoryForm({
      name: item.name ?? '',
      mainCategoryId: String(item.mainCategoryId ?? selectedMainId ?? ''),
      categoryIcon: item.categoryIcon ?? '',
      imageUrl: item.imageUrl ?? '',
      ordering: item.ordering?.toString?.() ?? '',
      path: item.path ?? '',
      active: String(item.active ?? 1),
      hasSubCategory: String(item.hasSubCategory ?? 1),
    });
    setMessage({ type: 'info', text: `Editing category: ${item.name}` });
  };

  const handleEditSubCategory = (item) => {
    setActiveForm('sub');
    setEditingSubId(item.id);
    setSubForm({
      name: item.name ?? '',
      categoryId: String(item.categoryId ?? selectedCategoryId ?? ''),
      subCategoryIcon: item.subCategoryIcon ?? '',
      imageUrl: item.imageUrl ?? '',
      ordering: item.ordering?.toString?.() ?? '',
      path: item.path ?? '',
      active: String(item.active ?? 1),
    });
    setMessage({ type: 'info', text: `Editing sub-category: ${item.name}` });
  };

  const handleDeleteMain = async (id) => {
    try {
      setIsLoading(true);
      await deleteMainCategory(token, id);
      await loadMainCategories(selectedIndustryId);
      await refreshOrderingCatalogCaches();
      setMessage({ type: 'success', text: 'Main category deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete main category.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      setIsLoading(true);
      await deleteCategory(token, id);
      await loadCategories(selectedMainId);
      await refreshOrderingCatalogCaches();
      setMessage({ type: 'success', text: 'Category deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete category.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubCategory = async (id) => {
    try {
      setIsLoading(true);
      await deleteSubCategory(token, id);
      await loadSubCategories(selectedCategoryId);
      await refreshOrderingCatalogCaches();
      setMessage({ type: 'success', text: 'Sub-category deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete sub-category.' });
    } finally {
      setIsLoading(false);
    }
  };
  const renderForm = () => {
    switch (activeForm) {
      case 'main':
        return (
          <form className="catalog-form" onSubmit={handleMainSubmit}>
            <div className="field-grid">
              <label className="field">
                <span>Main category</span>
                <input
                  type="text"
                  value={mainForm.name}
                  onChange={(event) => setMainForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g. Vegetables"
                  required
                />
              </label>
              <label className="field">
                <span>Industry</span>
                <select
                  value={mainForm.industryId}
                  onChange={(event) => setMainForm((prev) => ({ ...prev, industryId: event.target.value }))}
                  required
                >
                  <option value="">Select industry</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ordering</span>
                <input
                  type="number"
                  value={mainForm.ordering}
                  onChange={(event) => setMainForm((prev) => ({ ...prev, ordering: event.target.value }))}
                  placeholder="1"
                  min="1"
                  step="1"
                />
                {mainOrderingWarning ? <span className="field-help field-warning">{mainOrderingWarning}</span> : null}
              </label>
              <label className="field">
                <span>Path</span>
                <input
                  type="text"
                  value={mainForm.path}
                  onChange={(event) => setMainForm((prev) => ({ ...prev, path: event.target.value }))}
                  placeholder="/vegetables"
                />
              </label>
              <label className="field">
                <span>Active</span>
                <select
                  value={mainForm.active}
                  onChange={(event) => setMainForm((prev) => ({ ...prev, active: event.target.value }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field field-span">
                <span>Icon URL</span>
                <input
                  type="text"
                  value={mainForm.mainCategoryIcon}
                  onChange={(event) => setMainForm((prev) => ({ ...prev, mainCategoryIcon: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="field field-span">
                <span>Image URL</span>
                <input
                  type="text"
                  value={mainForm.imageUrl}
                  onChange={(event) => setMainForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
            </div>
            <div className="catalog-form-actions">
              {editingMainId ? (
                <button type="button" className="ghost-btn" onClick={resetMainEditor} disabled={isLoading}>
                  Cancel edit
                </button>
              ) : null}
              <button type="submit" className="primary-btn full" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingMainId ? 'Update main category' : 'Add main category'}
              </button>
            </div>
          </form>
        );
      case 'category':
        return (
          <form className="catalog-form" onSubmit={handleCategorySubmit}>
            <div className="field-grid">
              <label className="field">
                <span>Category name</span>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g. Beans"
                  required
                />
              </label>
              <label className="field">
                <span>Main category</span>
                <select
                  value={categoryForm.mainCategoryId}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, mainCategoryId: event.target.value }))}
                  required
                >
                  <option value="">Select main category</option>
                  {mainCategories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ordering</span>
                <input
                  type="number"
                  value={categoryForm.ordering}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, ordering: event.target.value }))}
                  placeholder="1"
                  min="1"
                  step="1"
                />
                {categoryOrderingWarning ? <span className="field-help field-warning">{categoryOrderingWarning}</span> : null}
              </label>
              <label className="field">
                <span>Has Sub-Category</span>
                <select
                  value={categoryForm.hasSubCategory}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, hasSubCategory: event.target.value }))}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>
              <label className="field">
                <span>Active</span>
                <select
                  value={categoryForm.active}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, active: event.target.value }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Path</span>
                <input
                  type="text"
                  value={categoryForm.path}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, path: event.target.value }))}
                  placeholder="/beans"
                />
              </label>
              <label className="field field-span">
                <span>Icon URL</span>
                <input
                  type="text"
                  value={categoryForm.categoryIcon}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, categoryIcon: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="field field-span">
                <span>Image URL</span>
                <input
                  type="text"
                  value={categoryForm.imageUrl}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
            </div>
            <div className="catalog-form-actions">
              {editingCategoryId ? (
                <button type="button" className="ghost-btn" onClick={resetCategoryEditor} disabled={isLoading}>
                  Cancel edit
                </button>
              ) : null}
              <button type="submit" className="primary-btn full" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingCategoryId ? 'Update category' : 'Add category'}
              </button>
            </div>
          </form>
        );
      case 'sub':
        return (
          <form className="catalog-form" onSubmit={handleSubSubmit}>
            <div className="field-grid">
              <label className="field">
                <span>Sub-category name</span>
                <input
                  type="text"
                  value={subForm.name}
                  onChange={(event) => setSubForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g. Green Beans"
                  required
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  value={subForm.categoryId}
                  onChange={(event) => setSubForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ordering</span>
                <input
                  type="number"
                  value={subForm.ordering}
                  onChange={(event) => setSubForm((prev) => ({ ...prev, ordering: event.target.value }))}
                  placeholder="1"
                  min="1"
                  step="1"
                />
                {subOrderingWarning ? <span className="field-help field-warning">{subOrderingWarning}</span> : null}
              </label>
              <label className="field">
                <span>Active</span>
                <select
                  value={subForm.active}
                  onChange={(event) => setSubForm((prev) => ({ ...prev, active: event.target.value }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field">
                <span>Path</span>
                <input
                  type="text"
                  value={subForm.path}
                  onChange={(event) => setSubForm((prev) => ({ ...prev, path: event.target.value }))}
                  placeholder="/green-beans"
                />
              </label>
              <label className="field field-span">
                <span>Icon URL</span>
                <input
                  type="text"
                  value={subForm.subCategoryIcon}
                  onChange={(event) => setSubForm((prev) => ({ ...prev, subCategoryIcon: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="field field-span">
                <span>Image URL</span>
                <input
                  type="text"
                  value={subForm.imageUrl}
                  onChange={(event) => setSubForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
            </div>
            <div className="catalog-form-actions">
              {editingSubId ? (
                <button type="button" className="ghost-btn" onClick={resetSubEditor} disabled={isLoading}>
                  Cancel edit
                </button>
              ) : null}
              <button type="submit" className="primary-btn full" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingSubId ? 'Update sub-category' : 'Add sub-category'}
              </button>
            </div>
          </form>
        );
      default:
        return (
          <form className="catalog-form" onSubmit={handleIndustrySubmit}>
            <div className="field-grid">
              <label className="field">
                <span>Industry name</span>
                <input
                  type="text"
                  value={industryForm.name}
                  onChange={(event) => setIndustryForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g. Agriculture"
                  required
                />
              </label>
              <label className="field">
                <span>Ordering</span>
                <input
                  type="number"
                  value={industryForm.ordering}
                  onChange={(event) => setIndustryForm((prev) => ({ ...prev, ordering: event.target.value }))}
                  placeholder="1"
                  min="1"
                  step="1"
                />
                {industryOrderingWarning ? <span className="field-help field-warning">{industryOrderingWarning}</span> : null}
              </label>
              <label className="field">
                <span>Path</span>
                <input
                  type="text"
                  value={industryForm.path}
                  onChange={(event) => setIndustryForm((prev) => ({ ...prev, path: event.target.value }))}
                  placeholder="/agriculture"
                />
              </label>
              <label className="field">
                <span>Active</span>
                <select
                  value={industryForm.active}
                  onChange={(event) => setIndustryForm((prev) => ({ ...prev, active: event.target.value }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <label className="field field-span">
                <span>Icon URL</span>
                <input
                  type="text"
                  value={industryForm.industryIcon}
                  onChange={(event) => setIndustryForm((prev) => ({ ...prev, industryIcon: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="field field-span">
                <span>Image URL</span>
                <input
                  type="text"
                  value={industryForm.industryImage}
                  onChange={(event) => setIndustryForm((prev) => ({ ...prev, industryImage: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
            </div>
            <div className="catalog-form-actions">
              {editingIndustryId ? (
                <button type="button" className="ghost-btn" onClick={resetIndustryEditor} disabled={isLoading}>
                  Cancel edit
                </button>
              ) : null}
              <button type="submit" className="primary-btn full" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingIndustryId ? 'Update industry' : 'Add industry'}
              </button>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="catalog-manager">
      <div className="catalog-hero">
        <div>
          <p className="catalog-eyebrow">Master Data</p>
          <h2>Catalog Control Room</h2>
          <p className="catalog-subtitle">Single place to manage industry, main categories, categories, and sub-categories.</p>
        </div>
        <div className="catalog-actions">
          <button type="button" className="ghost-btn" onClick={() => setShowBulkImport(true)} disabled={isLoading}>
            Bulk Import
          </button>
          <button type="button" className="ghost-btn" onClick={() => loadIndustries(false)} disabled={isLoading}>
            Refresh
          </button>
        </div>
      </div>

      <Banner message={message} />

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#F59E0B' }}>
          <p className="stat-label">Industries</p>
          <p className="stat-value">{industries.length}</p>
          <p className="stat-sub">Master groups</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#8B5CF6' }}>
          <p className="stat-label">Main categories</p>
          <p className="stat-value">{mainCategories.length}</p>
          <p className="stat-sub">Within selected industry</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#14B8A6' }}>
          <p className="stat-label">Categories</p>
          <p className="stat-value">{categories.length}</p>
          <p className="stat-sub">Under selected main</p>
        </div>
        <div className="stat-card admin-stat" style={{ '--stat-accent': '#0EA5E9' }}>
          <p className="stat-label">Sub-categories</p>
          <p className="stat-value">{subCategories.length}</p>
          <p className="stat-sub">Under selected category</p>
        </div>
        <div 
          className="stat-card admin-stat" 
          style={{ '--stat-accent': '#EC4899', cursor: 'pointer', border: activeTab === 'unmapped' ? '2px solid #EC4899' : '1px solid #e2e8f0' }}
          onClick={() => setActiveTab('unmapped')}
        >
          <p className="stat-label">Unmapped Requests</p>
          <p className="stat-value" style={{ color: '#EC4899' }}>{unmappedRequests.length}</p>
          <p className="stat-sub">Merchant "Other" Entries</p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: 12, margin: '20px 0 10px 0', borderBottom: '2px solid #e2e8f0' }}>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'catalog' ? '3px solid #6366f1' : '3px solid transparent',
            color: activeTab === 'catalog' ? '#6366f1' : '#64748b',
            cursor: 'pointer'
          }}
        >
          Master Catalog Control
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unmapped')}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'unmapped' ? '3px solid #EC4899' : '3px solid transparent',
            color: activeTab === 'unmapped' ? '#EC4899' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          Unmapped / Custom Category Requests
          {unmappedRequests.length > 0 && (
            <span style={{ background: '#EC4899', color: '#ffffff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
              {unmappedRequests.length} New
            </span>
          )}
        </button>
      </div>

      {activeTab === 'unmapped' ? (
        <div className="catalog-card" style={{ marginTop: 20, padding: 20 }}>
          <div className="catalog-card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, color: '#EC4899', fontWeight: 800 }}>Custom "Other" Submissions Queue</h3>
              <p>Review custom entries typed by merchants on website checkout/app. Approve as new Master or Remap to existing.</p>
            </div>
            <span className="catalog-chip" style={{ background: '#fce7f3', color: '#be185d' }}>{unmappedRequests.length} Pending</span>
          </div>

          <div className="table-shell">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Mobile</th>
                  <th>Submitted Type</th>
                  <th>Custom Name Typed</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unmappedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell" style={{ padding: 30, textStyle: 'italic', textAlign: 'center' }}>
                      🎉 No pending custom category requests! All merchant entries are mapped to master taxonomy.
                    </td>
                  </tr>
                ) : (
                  unmappedRequests.map((req) => (
                    <tr key={req.id}>
                      <td><strong>{req.businessName}</strong></td>
                      <td>{req.mobile}</td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700 }}>{req.customType}</span></td>
                      <td><strong style={{ color: '#4f46e5', fontSize: 14 }}>"{req.customName}"</strong></td>
                      <td><small>{req.date}</small></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="primary-btn"
                            style={{ background: '#10b981', borderColor: '#10b981', fontSize: 12, padding: '6px 12px' }}
                            onClick={() => handleApproveCustomAsMaster(req)}
                          >
                            + Approve as Master Industry
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() => setRemapModal({ open: true, item: req, targetIndustryId: '' })}
                          >
                            Remap Category
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Remap Modal */}
          {remapModal.open && (
            <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
              <div style={{ background: '#ffffff', padding: 24, borderRadius: 16, width: 450, maxWidth: '90%' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 18, color: '#0f172a' }}>Remap Custom Entry</h4>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
                  Remap <strong>"{remapModal.item?.customName}"</strong> (submitted by {remapModal.item?.businessName}) to an existing master industry:
                </p>
                <form onSubmit={handleConfirmRemap}>
                  <label className="field" style={{ display: 'block', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Select Target Industry:</span>
                    <select
                      value={remapModal.targetIndustryId}
                      onChange={(e) => setRemapModal((prev) => ({ ...prev, targetIndustryId: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1' }}
                    >
                      <option value="">-- Choose Industry --</option>
                      {industries.map((ind) => (
                        <option key={ind.id} value={ind.id}>{ind.name}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="ghost-btn" onClick={() => setRemapModal({ open: false, item: null, targetIndustryId: '' })}>
                      Cancel
                    </button>
                    <button type="submit" className="primary-btn">
                      Confirm Remap
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
      <div className="catalog-layout">
        <section className="catalog-tree">
          <div className="catalog-card">
            <div className="catalog-card-head">
              <div>
                <h3>Industries</h3>
                <p>Select an industry to load its tree.</p>
              </div>
              <span className="catalog-chip">{industries.length} total</span>
            </div>
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Icon</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {industries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">No industries yet.</td>
                    </tr>
                  ) : (
                    industries.map((item) => {
                      const isActive = String(item.id) === String(selectedIndustryId);
                      return (
                        <tr
                          key={item.id}
                          className={`catalog-row ${isActive ? 'is-active' : ''}`}
                          onClick={() => setSelectedIndustryId(String(item.id))}
                        >
                          <td>{item.name}</td>
                          <td>{renderImageCell(item.industryIcon || item.industryImage)}</td>
                          <td>{item.active === 1 ? 'Yes' : 'No'}</td>
                          <td className="table-actions">
                            <button type="button" className="ghost-btn small" onClick={(event) => {
                              event.stopPropagation();
                              handleEditIndustry(item);
                            }}>
                              Edit
                            </button>
                            <button type="button" className="ghost-btn small" onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteIndustry(item.id);
                            }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="catalog-card">
            <div className="catalog-card-head">
              <div>
                <h3>Main Categories</h3>
                <p>{selectedIndustry ? `Industry: ${selectedIndustry.name}` : 'Select an industry first.'}</p>
              </div>
              <span className="catalog-chip">{mainCategories.length} total</span>
            </div>
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Icon</th>
                    <th>Order</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mainCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">No main categories yet.</td>
                    </tr>
                  ) : (
                    mainCategories.map((item) => {
                      const isActive = String(item.id) === String(selectedMainId);
                      return (
                        <tr
                          key={item.id}
                          className={`catalog-row ${isActive ? 'is-active' : ''}`}
                          onClick={() => setSelectedMainId(String(item.id))}
                        >
                          <td>{item.name}</td>
                          <td>{renderImageCell(item.mainCategoryIcon || item.imageUrl)}</td>
                          <td>{item.ordering ?? '-'}</td>
                          <td className="table-actions">
                            <button type="button" className="ghost-btn small" onClick={(event) => {
                              event.stopPropagation();
                              handleEditMain(item);
                            }}>
                              Edit
                            </button>
                            <button type="button" className="ghost-btn small" onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteMain(item.id);
                            }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="catalog-card">
            <div className="catalog-card-head">
              <div>
                <h3>Categories</h3>
                <p>{selectedMain ? `Main category: ${selectedMain.name}` : 'Select a main category first.'}</p>
              </div>
              <span className="catalog-chip">{categories.length} total</span>
            </div>
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Icon</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty-cell">No categories yet.</td>
                    </tr>
                  ) : (
                    categories.map((item) => {
                      const isActive = String(item.id) === String(selectedCategoryId);
                      return (
                        <tr
                          key={item.id}
                          className={`catalog-row ${isActive ? 'is-active' : ''}`}
                          onClick={() => setSelectedCategoryId(String(item.id))}
                        >
                          <td>{item.name}</td>
                          <td>{renderImageCell(item.categoryIcon || item.imageUrl)}</td>
                          <td className="table-actions">
                            <button type="button" className="ghost-btn small" onClick={(event) => {
                              event.stopPropagation();
                              handleEditCategory(item);
                            }}>
                              Edit
                            </button>
                            <button type="button" className="ghost-btn small" onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteCategory(item.id);
                            }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="catalog-card">
            <div className="catalog-card-head">
              <div>
                <h3>Sub-categories</h3>
                <p>{selectedCategory ? `Category: ${selectedCategory.name}` : 'Select a category first.'}</p>
              </div>
              <span className="catalog-chip">{subCategories.length} total</span>
            </div>
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Icon</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {subCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty-cell">No sub-categories yet.</td>
                    </tr>
                  ) : (
                    subCategories.map((item) => (
                      <tr key={item.id} className="catalog-row">
                        <td>{item.name}</td>
                        <td>{renderImageCell(item.subCategoryIcon || item.imageUrl)}</td>
                        <td className="table-actions">
                          <button type="button" className="ghost-btn small" onClick={() => handleEditSubCategory(item)}>
                            Edit
                          </button>
                          <button type="button" className="ghost-btn small" onClick={() => handleDeleteSubCategory(item.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="catalog-editor">
          <div className="catalog-card">
            <div className="catalog-card-head">
              <div>
                <h3>Quick Add</h3>
                <p>Create records without leaving this screen.</p>
              </div>
            </div>
            <div className="catalog-segment">
              <button type="button" className={activeForm === 'industry' ? 'active' : ''} onClick={() => setActiveForm('industry')}>Industry</button>
              <button type="button" className={activeForm === 'main' ? 'active' : ''} onClick={() => setActiveForm('main')}>Main</button>
              <button type="button" className={activeForm === 'category' ? 'active' : ''} onClick={() => setActiveForm('category')}>Category</button>
              <button type="button" className={activeForm === 'sub' ? 'active' : ''} onClick={() => setActiveForm('sub')}>Sub</button>
            </div>
            {renderForm()}
          </div>

          <div className="catalog-card catalog-summary">
            <h3>Current Selection</h3>
            <div className="catalog-summary-row">
              <span>Industry</span>
              <strong>{selectedIndustry?.name || '-'}</strong>
            </div>
            <div className="catalog-summary-row">
              <span>Main category</span>
              <strong>{selectedMain?.name || '-'}</strong>
            </div>
            <div className="catalog-summary-row">
              <span>Category</span>
              <strong>{selectedCategory?.name || '-'}</strong>
            </div>
          </div>
        </aside>
      </div>
      )}

      {showBulkImport ? (
        <CatalogBulkImportModal
          token={token}
          industries={industries}
          onClose={() => setShowBulkImport(false)}
          onImportSuccess={() => {
            loadIndustries(false);
            setShowBulkImport(false);
            setMessage({ type: 'success', text: 'Taxonomy imported successfully. Refreshing...' });
          }}
        />
      ) : null}
    </div>
  );
}

export default CatalogManagerPage;
