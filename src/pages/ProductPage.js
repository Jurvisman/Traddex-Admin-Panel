import { useEffect, useState } from 'react';
import { Banner } from '../components';
import {
  createProduct,
  deleteProduct,
  listCategories,
  listMainCategories,
  listProducts,
  listSubCategories,
} from '../services/adminApi';

const initialForm = {
  productName: '',
  brandName: '',
  shortDescription: '',
  mainCategoryId: '',
  categoryId: '',
  subCategoryId: '',
  sellingPrice: '',
  mrp: '',
  gstRate: '',
  userId: '',
};

function ProductPage({ token }) {
  const [products, setProducts] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: 'info', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadProducts = async () => {
    const response = await listProducts(token);
    setProducts(response?.data?.products || []);
  };

  const loadMainCategories = async () => {
    const response = await listMainCategories(token);
    setMainCategories(response?.data || []);
  };

  useEffect(() => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    Promise.all([loadProducts(), loadMainCategories()])
      .catch((error) => {
        setMessage({ type: 'error', text: error.message || 'Failed to load products.' });
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form.mainCategoryId) {
      setCategories([]);
      setSubCategories([]);
      return;
    }
    listCategories(token, form.mainCategoryId)
      .then((response) => setCategories(response?.data || []))
      .catch(() => setCategories([]));
  }, [form.mainCategoryId, token]);

  useEffect(() => {
    if (!form.categoryId) {
      setSubCategories([]);
      return;
    }
    listSubCategories(token, form.categoryId)
      .then((response) => setSubCategories(response?.data || []))
      .catch(() => setSubCategories([]));
  }, [form.categoryId, token]);

  const handleChange = (key, value) => {
    setForm((prev) => {
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !form.productName.trim() ||
      !form.mainCategoryId ||
      !form.categoryId ||
      !form.subCategoryId ||
      !form.sellingPrice ||
      !form.mrp ||
      !form.gstRate
    ) {
      setMessage({ type: 'error', text: 'Fill all required product fields.' });
      return;
    }

    try {
      setIsLoading(true);
      await createProduct(token, {
        userId: form.userId ? Number(form.userId) : null,
        productName: form.productName.trim(),
        brandName: form.brandName || null,
        shortDescription: form.shortDescription || null,
        mainCategoryId: Number(form.mainCategoryId),
        categoryId: Number(form.categoryId),
        subCategoryId: Number(form.subCategoryId),
        sellingPrice: Number(form.sellingPrice),
        mrp: Number(form.mrp),
        gstRate: Number(form.gstRate),
      });
      setForm(initialForm);
      setShowForm(false);
      await loadProducts();
      setMessage({ type: 'success', text: 'Product created successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create product.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setIsLoading(true);
      await deleteProduct(token, id);
      await loadProducts();
      setMessage({ type: 'success', text: 'Product deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete product.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Product</h2>
          <p className="panel-subtitle">Create and manage products for businesses.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={loadProducts} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <Banner message={message} />
      {showForm ? (
        <div className="admin-modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="admin-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-split">
              <h3 className="panel-subheading">Create product</h3>
              <button type="button" className="ghost-btn small" onClick={() => setShowForm(false)}>
                Close
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Product name</span>
                <input
                  type="text"
                  value={form.productName}
                  onChange={(event) => handleChange('productName', event.target.value)}
                  placeholder="Product name"
                  required
                />
              </label>
              <label className="field">
                <span>Brand name</span>
                <input
                  type="text"
                  value={form.brandName}
                  onChange={(event) => handleChange('brandName', event.target.value)}
                  placeholder="Brand"
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
                  value={form.categoryId}
                  onChange={(event) => handleChange('categoryId', event.target.value)}
                  required
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
                  value={form.subCategoryId}
                  onChange={(event) => handleChange('subCategoryId', event.target.value)}
                  required
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
                <span>Selling price</span>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={(event) => handleChange('sellingPrice', event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="field">
                <span>MRP</span>
                <input
                  type="number"
                  value={form.mrp}
                  onChange={(event) => handleChange('mrp', event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="field">
                <span>GST rate</span>
                <input
                  type="number"
                  value={form.gstRate}
                  onChange={(event) => handleChange('gstRate', event.target.value)}
                  placeholder="18"
                  required
                />
              </label>
              <label className="field field-span">
                <span>Short description</span>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(event) => handleChange('shortDescription', event.target.value)}
                  placeholder="Short description"
                />
              </label>
              <label className="field">
                <span>Business user ID (optional)</span>
                <input
                  type="number"
                  value={form.userId}
                  onChange={(event) => handleChange('userId', event.target.value)}
                  placeholder="User ID"
                />
              </label>
            </div>
            <button type="submit" className="primary-btn full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save product'}
            </button>
          </form>
        </div>
      ) : null}
      <div className="panel-grid">
        <div className="panel card">
          <div className="panel-split">
            <h3 className="panel-subheading">Product list</h3>
            <button
              type="button"
              className="primary-btn compact"
              onClick={() => setShowForm((prev) => !prev)}
            >
              {showForm ? 'Close' : 'Create'}
            </button>
          </div>
          {products.length === 0 ? (
            <p className="empty-state">No products yet.</p>
          ) : (
            <div className="table-shell">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Selling price</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.productName}</td>
                      <td>{product.category?.subCategoryName || product.category?.categoryName || '-'}</td>
                      <td>{product.sellingPrice ?? '-'}</td>
                      <td>{product.approvalStatus || 'Pending'}</td>
                      <td className="table-actions">
                        <button type="button" className="ghost-btn small" onClick={() => handleDelete(product.id)}>
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

export default ProductPage;
