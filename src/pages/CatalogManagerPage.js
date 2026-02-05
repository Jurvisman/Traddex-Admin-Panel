
import { useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
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
} from '../services/adminApi';

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

function CatalogManagerPage({ token }) {
  const [industries, setIndustries] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
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

  const loadMainCategories = async (industryId) => {
    if (!industryId) {
      setMainCategories([]);
      return;
    }
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const response = await listMainCategories(token);
      const list = (response?.data || []).filter((item) => String(item.industryId) === String(industryId));
      setMainCategories(list);
      const nextId = list[0]?.id ? String(list[0].id) : '';
      setSelectedMainId(nextId);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch main categories.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async (mainCategoryId) => {
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
      const nextId = list[0]?.id ? String(list[0].id) : '';
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

  useEffect(() => {
    loadIndustries(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const handleIndustrySubmit = async (event) => {
    event.preventDefault();
    if (!industryForm.name.trim()) {
      setMessage({ type: 'error', text: 'Industry name is required.' });
      return;
    }
    try {
      setIsLoading(true);
      await createIndustry(token, {
        name: industryForm.name.trim(),
        industryIcon: industryForm.industryIcon || null,
        industryImage: industryForm.industryImage || null,
        ordering: industryForm.ordering ? Number(industryForm.ordering) : null,
        path: industryForm.path || null,
        active: Number(industryForm.active),
      });
      setIndustryForm(initialIndustryForm);
      await loadIndustries(false);
      setMessage({ type: 'success', text: 'Industry created.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create industry.' });
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
    try {
      setIsLoading(true);
      await createMainCategory(token, {
        name: mainForm.name.trim(),
        industryId: Number(mainForm.industryId),
        mainCategoryIcon: mainForm.mainCategoryIcon || null,
        imageUrl: mainForm.imageUrl || null,
        ordering: mainForm.ordering ? Number(mainForm.ordering) : null,
        path: mainForm.path || null,
        active: Number(mainForm.active),
      });
      setMainForm((prev) => ({ ...initialMainForm, industryId: prev.industryId }));
      await loadMainCategories(mainForm.industryId);
      setMessage({ type: 'success', text: 'Main category created.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create main category.' });
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
    try {
      setIsLoading(true);
      await createCategory(token, {
        name: categoryForm.name.trim(),
        mainCategoryId: Number(categoryForm.mainCategoryId),
        categoryIcon: categoryForm.categoryIcon || null,
        imageUrl: categoryForm.imageUrl || null,
        ordering: categoryForm.ordering ? Number(categoryForm.ordering) : null,
        path: categoryForm.path || null,
        active: Number(categoryForm.active),
        hasSubCategory: Number(categoryForm.hasSubCategory),
      });
      setCategoryForm((prev) => ({ ...initialCategoryForm, mainCategoryId: prev.mainCategoryId }));
      await loadCategories(categoryForm.mainCategoryId);
      setMessage({ type: 'success', text: 'Category created.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create category.' });
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
    try {
      setIsLoading(true);
      await createSubCategory(token, {
        name: subForm.name.trim(),
        categoryId: Number(subForm.categoryId),
        subCategoryIcon: subForm.subCategoryIcon || null,
        imageUrl: subForm.imageUrl || null,
        ordering: subForm.ordering ? Number(subForm.ordering) : null,
        path: subForm.path || null,
        active: Number(subForm.active),
      });
      setSubForm((prev) => ({ ...initialSubForm, categoryId: prev.categoryId }));
      await loadSubCategories(subForm.categoryId);
      setMessage({ type: 'success', text: 'Sub-category created.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create sub-category.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIndustry = async (id) => {
    try {
      setIsLoading(true);
      await deleteIndustry(token, id);
      await loadIndustries(false);
      setMessage({ type: 'success', text: 'Industry deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete industry.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMain = async (id) => {
    try {
      setIsLoading(true);
      await deleteMainCategory(token, id);
      await loadMainCategories(selectedIndustryId);
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
                />
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
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Add main category'}
            </button>
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
                />
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
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Add category'}
            </button>
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
                />
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
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Add sub-category'}
            </button>
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
                />
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
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Add industry'}
            </button>
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
          <button type="button" className="ghost-btn" onClick={() => loadIndustries(false)} disabled={isLoading}>
            Refresh
          </button>
        </div>
      </div>

      <Banner message={message} />

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
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {industries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty-cell">No industries yet.</td>
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
                          <td>{item.active === 1 ? 'Yes' : 'No'}</td>
                          <td className="table-actions">
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
                    <th>Order</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mainCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty-cell">No main categories yet.</td>
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
                          <td>{item.ordering ?? '-'}</td>
                          <td className="table-actions">
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
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="empty-cell">No categories yet.</td>
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
                          <td className="table-actions">
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
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {subCategories.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="empty-cell">No sub-categories yet.</td>
                    </tr>
                  ) : (
                    subCategories.map((item) => (
                      <tr key={item.id} className="catalog-row">
                        <td>{item.name}</td>
                        <td className="table-actions">
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
    </div>
  );
}

export default CatalogManagerPage;
