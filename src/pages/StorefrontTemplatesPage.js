import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Banner, TableRowActionMenu } from '../components';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listSubscriptionPlans } from '../services/adminApi';
import '../styles/TemplateView.css';

const API_BASE = (process.env.REACT_APP_API_BASE || 'http://localhost:8080').replace(/\/+$/, '');
const buildUrl = (path) => `${API_BASE}/api${path.startsWith('/') ? path : '/' + path}`;

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
};

const toTemplateKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s/]+/g, '-')
    .replace(/-+/g, '-');

const ensureStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
};

const ensureObjectList = (value, fieldMap = {}) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const { valueKey, ...defaults } = fieldMap;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const normalized = { ...defaults, ...item };
        if (valueKey && !normalized[valueKey] && normalized.value) {
          normalized[valueKey] = String(normalized.value).trim();
        }
        return normalized;
      }
      if (item == null) return null;
      const normalized = { ...defaults };
      if (valueKey) {
        normalized[valueKey] = String(item).trim();
      }
      return normalized;
    })
    .filter(Boolean);
};

const parseTemplateConfig = (configJson) => {
  if (!configJson) return {};
  try {
    const parsed = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    console.error('Failed to parse configJson', e);
    return {};
  }
};

const unpackTemplate = (tpl) => {
  if (!tpl) return null;
  const config = parseTemplateConfig(tpl.configJson);

  let pagesList = [];
  try {
    pagesList = JSON.parse(tpl.includedPagesJson || '[]');
  } catch (e) {
    console.error("Failed to parse includedPagesJson", e);
  }

  return {
    ...tpl,
    technologies: ensureStringList(tpl.technologies ?? config.technologies),
    browsers: ensureStringList(tpl.browsers ?? config.browsers),
    author: config.author || 'Webcraft Inc.',
    supportEmail: config.supportEmail || 'support@webcraft.com',
    templateType: config.templateType || 'Multipurpose',
    layoutStyle: config.layoutStyle || 'Modern',
    documentationUrl: config.documentationUrl || '',
    createdOn: config.createdOn || new Date().toISOString().split('T')[0],
    features: ensureObjectList(tpl.features ?? config.features, { title: '', description: '', valueKey: 'title' }),
    faqs: ensureObjectList(tpl.faqs ?? config.faqs, { question: '', answer: '', valueKey: 'question' }),
    pages: pagesList
  };
};

const packTemplate = (data) => {
  if (!data) return null;
  const config = {
    technologies: ensureStringList(data.technologies),
    browsers: ensureStringList(data.browsers),
    author: data.author || '',
    supportEmail: data.supportEmail || '',
    templateType: data.templateType || '',
    layoutStyle: data.layoutStyle || '',
    documentationUrl: data.documentationUrl || '',
    createdOn: data.createdOn || '',
    features: ensureObjectList(data.features, { title: '', description: '', valueKey: 'title' }),
    faqs: ensureObjectList(data.faqs, { question: '', answer: '', valueKey: 'question' }),
  };

  return {
    id: data.id,
    templateKey: data.templateKey,
    name: data.name,
    industry: data.industry,
    version: data.version,
    tier: data.tier,
    planRequired: data.planRequired || data.tier,
    configJson: JSON.stringify(config),
    previewImage: data.previewImage || (data.media && data.media[0] ? data.media[0].imageUrl : ''),
    status: data.status,
    shortDescription: data.shortDescription,
    fullDescription: data.fullDescription,
    bestFor: data.bestFor,
    includedPagesJson: JSON.stringify(data.pages || []),
    deliveryEstimate: data.deliveryEstimate,
    displayOrder: data.displayOrder || 0,
    technologies: config.technologies,
    browsers: config.browsers,
    features: config.features,
    faqs: config.faqs,
  };
};

function SortableImage({ item, onRemove, idx }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id || item.imageUrl || item.url || Math.random().toString() });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: 140,
    height: 180,
    flexShrink: 0,
    position: 'relative',
    cursor: 'grab'
  };

  const imgUrl = item.imageUrl || item.url || '';

  return (
    <div ref={setNodeRef} style={style}>
      <div 
        {...attributes} 
        {...listeners} 
        style={{ position: 'relative', width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}
      >
        {imgUrl ? (
            <img src={resolveImageUrl(imgUrl)} alt={item.pageLabel} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
        ) : (
            <div style={{ width: '100%', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>No Image</div>
        )}
        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 11, textAlign: 'center', background: 'rgba(15, 23, 42, 0.75)', color: 'white', padding: '8px 4px', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500}}>
            {item.pageLabel || `PAGE ${idx+1}`}
        </div>
      </div>
      <button 
        type="button" 
        style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', borderRadius: '50%', border: '2px solid white', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold', padding: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        onClick={(e) => { e.stopPropagation(); onRemove(item); }}
      >
        &times;
      </button>
    </div>
  );
}

function StorefrontTemplatesPage({ token }) {
  const [templates, setTemplates] = useState([]);
  
  // Read initial state from URL parameters to preserve mode on refresh
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode') || 'list';
  const initialId = urlParams.get('id');

  const [viewMode, setViewMode] = useState(initialMode); // 'list', 'view', 'edit'
  const [viewItem, setViewItem] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [openActionRowId, setOpenActionRowId] = useState(null);

  // View specific states
  const [activeViewTab, setActiveViewTab] = useState('Overview');
  const [expandedFaqIdx, setExpandedFaqIdx] = useState(null);
  const carouselRef = useRef(null);

  // Editor specific states
  const [activeEditorTab, setActiveEditorTab] = useState('Basic Information');
  const [techInput, setTechInput] = useState('');
  const [browserInput, setBrowserInput] = useState('');
  const [industriesList, setIndustriesList] = useState([]);
  const [plansList, setPlansList] = useState([]);

  // Editor nested lists states
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // Helper to update URL without reloading
  const updateUrl = (mode, id = null) => {
    const url = new URL(window.location);
    if (mode === 'list') {
        url.searchParams.delete('mode');
        url.searchParams.delete('id');
    } else {
        url.searchParams.set('mode', mode);
        if (id) url.searchParams.set('id', id);
    }
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    console.log("StorefrontTemplatesPage token status:", token ? "TOKEN_EXISTS" : "NO_TOKEN");
    
    // Fetch active industries from public endpoint to avoid 403 Forbidden
    console.log("StorefrontTemplatesPage: Fetching public industries...");
    fetch(buildUrl('/hierarchy/industries'))
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => {
        console.log("StorefrontTemplatesPage: industries resolved data:", data);
        setIndustriesList(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("StorefrontTemplatesPage: industries fetch error:", err));

    if (token) {
      console.log("StorefrontTemplatesPage: Fetching subscription plans...");
      listSubscriptionPlans(token).then(res => { 
          console.log("StorefrontTemplatesPage: plans raw response:", res);
          const data = res?.data?.plans || res?.plans || [];
          console.log("StorefrontTemplatesPage: plans resolved data:", data);
          setPlansList(Array.isArray(data) ? data : []);
      }).catch(err => console.error("StorefrontTemplatesPage: plans fetch error:", err));
    }
  }, [token]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleTemplateNameChange = (value) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const previousAutoKey = toTemplateKey(prev.name);
      const nextAutoKey = toTemplateKey(value);
      const currentKey = String(prev.templateKey || '').trim();
      const shouldAutoUpdateKey = !currentKey || currentKey === previousAutoKey;

      return {
        ...prev,
        name: value,
        templateKey: shouldAutoUpdateKey ? nextAutoKey : prev.templateKey,
      };
    });
  };

  const handleTemplateKeyChange = (value) => {
    setFormData((prev) => (
      prev
        ? {
            ...prev,
            templateKey: toTemplateKey(value),
          }
        : prev
    ));
  };

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(buildUrl('/admin/storefront-templates'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const loadedTemplates = data.data || [];
      setTemplates(loadedTemplates);
      
      // If we initialized with an ID from URL, load it into state now that we have data
      if (initialId && !viewItem) {
          const tpl = loadedTemplates.find(t => t.id.toString() === initialId);
          if (tpl) {
              const unpacked = unpackTemplate(tpl);
              setViewItem(unpacked);
              setFormData(unpacked);
          } else {
              // Not found, fallback to list
              setViewMode('list');
              updateUrl('list');
          }
      }
    } catch (error) {
      console.error('Failed to load templates', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, initialId, viewItem]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleView = (tpl) => {
    const unpacked = unpackTemplate(tpl);
    setViewItem(unpacked);
    setFormData(unpacked);
    setOpenActionRowId(null);
    setViewMode('view');
    setActiveViewTab('Overview');
    updateUrl('view', tpl.id);
  };

  const handleEdit = (tpl) => {
    const unpacked = unpackTemplate(tpl);
    setViewItem(unpacked);
    setFormData(unpacked);
    setOpenActionRowId(null);
    setViewMode('edit');
    setActiveEditorTab('Basic Information');
    updateUrl('edit', tpl.id);
  };

  const handleCreateNew = () => {
    const newTpl = {
      name: 'New Template',
      version: 'v1.0.0',
      status: 'DRAFT',
      tier: 'BASIC',
      media: [],
      includedPagesJson: '[]',
      configJson: '{}'
    };
    const unpacked = unpackTemplate(newTpl);
    setViewItem(unpacked);
    setFormData(unpacked);
    setViewMode('edit');
    setActiveEditorTab('Basic Information');
    updateUrl('edit');
  };

  const persistTemplate = async (data, options = {}) => {
    const {
      switchToView = false,
      successMessage = null,
    } = options;

    const isNew = !data.id;
    const method = isNew ? 'POST' : 'PUT';
    const endpoint = isNew ? '/admin/storefront-templates' : `/admin/storefront-templates/${data.id}`;
    const packed = packTemplate(data);

    const response = await fetch(buildUrl(endpoint), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(packed)
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(responseData?.message || 'Failed to save template.');

    const savedItem = responseData.data || data;
    const unpacked = unpackTemplate(savedItem);
    setViewItem(unpacked);
    setFormData(unpacked);
    await loadTemplates();

    if (switchToView) {
      setViewMode('view');
      updateUrl('view', unpacked.id);
    } else if (unpacked.id) {
      updateUrl('edit', unpacked.id);
    }

    if (successMessage) {
      setMessage({ type: 'success', text: successMessage });
    }

    return unpacked;
  };

  const ensureTemplateReadyForMediaUpload = async () => {
    if (formData?.id) return formData;

    const templateName = String(formData?.name || '').trim();
    const templateKey = toTemplateKey(formData?.templateKey || templateName);
    const industry = String(formData?.industry || '').trim();

    if (!templateName) {
      setActiveEditorTab('Basic Information');
      throw new Error('Template name is required before uploading screenshots.');
    }
    if (!templateKey) {
      setActiveEditorTab('Basic Information');
      throw new Error('Template key is required before uploading screenshots.');
    }
    if (!industry) {
      setActiveEditorTab('Basic Information');
      throw new Error('Please select an industry before uploading screenshots.');
    }

    return persistTemplate(
      {
        ...formData,
        templateKey,
        version: formData?.version || 'v1.0.0',
        status: formData?.status || 'DRAFT',
        tier: formData?.tier || 'BASIC',
      },
      {
        switchToView: false,
        successMessage: 'Template draft created. You can now upload screenshots.',
      }
    );
  };

  const handleSave = async () => {
    try {
      const isNew = !formData.id;
      const normalizedTemplateKey = toTemplateKey(formData.templateKey || formData.name);
      await persistTemplate(
        {
          ...formData,
          templateKey: normalizedTemplateKey,
        },
        {
          switchToView: true,
          successMessage: `Template ${isNew ? 'created' : 'updated'} successfully.`,
        }
      );
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save template.' });
    }
  };

  const handleDelete = async (tpl) => {
      if (!window.confirm(`Are you sure you want to delete ${tpl.name}?`)) return;
      try {
        const response = await fetch(buildUrl(`/admin/storefront-templates/${tpl.id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Delete failed');
        setMessage({ type: 'success', text: `Template deleted successfully.` });
        await loadTemplates();
        setViewItem(null);
        setViewMode('list');
        updateUrl('list');
      } catch(error) {
        setMessage({ type: 'error', text: error.message || 'Failed to delete template.' });
      }
  };

  const handleMediaUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const pageLabel = prompt('Enter a label for this image (e.g. Home Page, Collection Page):', 'Home Page');
      if (pageLabel === null) {
          e.target.value = '';
          return;
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('pageLabel', pageLabel || 'Screenshot');

      try {
          const template = await ensureTemplateReadyForMediaUpload();
          const response = await fetch(buildUrl(`/admin/storefront-templates/${template.id}/media`), {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: fd
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.message || 'Failed to upload media.');
          
          // Refresh template to get new media ID
          await loadTemplates();
          const updatedTemplates = await fetch(buildUrl(`/admin/storefront-templates`), {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json());
          
          const updatedTpl = updatedTemplates.data.find(t => t.id === template.id);
          if (updatedTpl) {
            const unpacked = unpackTemplate(updatedTpl);
            setFormData(unpacked);
            setViewItem(unpacked);
          }

      } catch(error) {
          setMessage({ type: 'error', text: error.message || 'Failed to upload media.' });
      } finally {
          e.target.value = '';
      }
  };

  const handleRemoveMedia = async (mediaItem) => {
      if (!window.confirm('Delete this screenshot?')) return;
      try {
          if (mediaItem.id) {
              await fetch(buildUrl(`/admin/storefront-templates/media/${mediaItem.id}`), {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` }
              });
              // We ignore the response ok check just in case it's a 404, we still want to remove it from UI.
          }
      } catch(error) {
          console.error("Failed to delete from server:", error);
      } finally {
          setFormData(prev => ({
              ...prev,
              media: (prev.media || []).filter(m => {
                  if (mediaItem.id && m.id) {
                      return m.id !== mediaItem.id;
                  }
                  const mUrl = m.imageUrl || m.url;
                  const itemUrl = mediaItem.imageUrl || mediaItem.url;
                  if (mUrl && itemUrl) {
                      return mUrl !== itemUrl;
                  }
                  return m !== mediaItem;
              })
          }));
      }
  };

  const handleDragEnd = (event) => {
      const { active, over } = event;
      if (active.id !== over.id) {
          setFormData((prev) => {
              const oldIndex = prev.media.findIndex((m) => (m.id || m.imageUrl) === active.id);
              const newIndex = prev.media.findIndex((m) => (m.id || m.imageUrl) === over.id);
              const reorderedMedia = arrayMove(prev.media, oldIndex, newIndex);
              
              // Call API to reorder on server in background
              const mediaIds = reorderedMedia.map(m => m.id).filter(Boolean);
              if (mediaIds.length > 0) {
                  fetch(buildUrl(`/admin/storefront-templates/${prev.id}/media/reorder`), {
                      method: 'POST',
                      headers: { 
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}` 
                      },
                      body: JSON.stringify(mediaIds)
                  }).catch(err => console.error("Failed to save reorder", err));
              }

              return {
                  ...prev,
                  media: reorderedMedia
              };
          });
      }
  };

  const handleCarouselScroll = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 240;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const renderViewDashboard = () => {
    if (!viewItem) return null;
    const tpl = viewItem;

    return (
        <div className="template-view-dashboard">
            <div className="tv-header-section">
                <div className="tv-breadcrumbs">
                    <span onClick={() => { setViewMode('list'); updateUrl('list'); }}>Templates</span>
                    <span className="separator">&gt;</span>
                    <span className="current">{tpl.name}</span>
                </div>
                
                <div className="tv-header-main">
                    <div className="tv-title-group">
                        <div className="tv-title-row">
                            <h1>{tpl.name}</h1>
                            <span className={`tv-status-badge ${tpl.status?.toLowerCase() || 'draft'}`}>
                                {tpl.status || 'Published'}
                            </span>
                        </div>
                        <p className="tv-subtitle">{tpl.shortDescription || 'Professional template'}</p>
                        <div className="tv-meta-row">
                            <span><i className="tv-icon-id"></i> Template Key: {tpl.templateKey || 'N/A'}</span>
                            <span><i className="tv-icon-calendar"></i> Created on: {tpl.createdOn || 'N/A'}</span>
                            <span><i className="tv-icon-clock"></i> Version: {tpl.version || 'v1.0.0'}</span>
                        </div>
                    </div>
                    <div className="tv-header-actions">
                        <button className="tv-btn-primary" onClick={() => { setViewMode('edit'); updateUrl('edit', tpl.id); }}><i className="tv-icon-edit"></i> Edit Template</button>
                    </div>
                </div>

                <div className="tv-tabs">
                    {['Overview', 'Screenshots', 'Pages', 'Features', 'FAQs'].map(tab => (
                        <div 
                            key={tab} 
                            className={`tv-tab ${activeViewTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveViewTab(tab)}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
            </div>

            <div className="tv-content-grid">
                <div className="tv-content-left" style={{ gridColumn: activeViewTab === 'Overview' ? '1' : '1 / span 2' }}>
                    
                    {/* OVERVIEW TAB */}
                    {activeViewTab === 'Overview' && (
                        <>
                            {/* Screenshots Carousel */}
                            <div className="tv-card">
                                <h3 className="tv-card-title">Template Screenshots</h3>
                                <div className="tv-carousel">
                                    <button className="tv-carousel-btn prev" onClick={() => handleCarouselScroll('left')}>&lt;</button>
                                    <div className="tv-carousel-track" ref={carouselRef}>
                                        {tpl.media && tpl.media.length > 0 ? (
                                            tpl.media.map(m => (
                                                <div key={m.id} className="tv-carousel-item" style={{ flex: '0 0 160px' }}>
                                                    <img src={resolveImageUrl(m.imageUrl)} alt={m.pageLabel} onError={(e) => { e.target.style.display = 'none'; }} />
                                                    <div className="tv-carousel-label">{m.pageLabel || 'Screenshot'}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', width: '100%', color: '#94a3b8', padding: '24px 0', fontSize: 13 }}>No screenshots uploaded yet.</div>
                                        )}
                                    </div>
                                    <button className="tv-carousel-btn next" onClick={() => handleCarouselScroll('right')}>&gt;</button>
                                </div>
                            </div>

                            <div className="tv-card">
                                <h3 className="tv-card-title">Description</h3>
                                <div className="tv-description-content">
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{tpl.fullDescription || tpl.shortDescription || 'No description provided.'}</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* SCREENSHOTS TAB */}
                    {activeViewTab === 'Screenshots' && (
                        <div className="tv-card">
                            <h3 className="tv-card-title">Screenshots Gallery</h3>
                            {tpl.media && tpl.media.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
                                    {tpl.media.map((m, idx) => (
                                        <div key={m.id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <img src={resolveImageUrl(m.imageUrl)} alt={m.pageLabel} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                                            <div style={{ padding: 12, fontSize: 12, fontWeight: 600, color: '#334155', textAlign: 'center', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                {m.pageLabel || `Page ${idx + 1}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px 0' }}>No screenshots uploaded yet.</div>
                            )}
                        </div>
                    )}

                    {/* PAGES TAB */}
                    {activeViewTab === 'Pages' && (
                        <div className="tv-card">
                            <h3 className="tv-card-title">Included Pages ({tpl.pages?.length || 0})</h3>
                            {tpl.pages && tpl.pages.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                    {tpl.pages.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{p.name}</div>
                                                <code style={{ background: '#e0e7ff', color: '#4f46e5', padding: '2px 6px', borderRadius: 4, fontSize: 11, display: 'inline-block', marginTop: 4 }}>{p.path}</code>
                                            </div>
                                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>#{idx + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px 0' }}>No pages specified.</div>
                            )}
                        </div>
                    )}

                    {/* FEATURES TAB */}
                    {activeViewTab === 'Features' && (
                        <div className="tv-card">
                            <h3 className="tv-card-title">Template Features</h3>
                            {tpl.features && tpl.features.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                                    {tpl.features.map((f, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                            <div style={{ background: '#ecfdf5', color: '#10b981', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: 14 }}>✓</div>
                                            <div>
                                                <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{f.title || f}</h4>
                                                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{f.description || 'Premium included feature.'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px 0' }}>No features specified.</div>
                            )}
                        </div>
                    )}

                    {/* FAQS TAB */}
                    {activeViewTab === 'FAQs' && (
                        <div className="tv-card">
                            <h3 className="tv-card-title">Frequently Asked Questions</h3>
                            {tpl.faqs && tpl.faqs.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {tpl.faqs.map((faq, idx) => {
                                        const isExpanded = expandedFaqIdx === idx;
                                        return (
                                            <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                                                <div 
                                                    onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                                                    style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 600, color: '#0f172a', background: isExpanded ? '#f8fafc' : '#fff' }}
                                                >
                                                    <span style={{ fontSize: 14 }}>{faq.question}</span>
                                                    <span style={{ fontSize: 18, color: '#6366f1' }}>{isExpanded ? '−' : '+'}</span>
                                                </div>
                                                {isExpanded && (
                                                    <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#fff' }}>
                                                        {faq.answer}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px 0' }}>No FAQs specified.</div>
                            )}
                        </div>
                    )}

                </div>

                {/* RIGHT SIDEBAR (Only visible in Overview mode for details, tags, status) */}
                {activeViewTab === 'Overview' && (
                    <div className="tv-content-right">
                        
                        {/* Details */}
                        <div className="tv-card">
                            <h3 className="tv-card-title">Template Details</h3>
                            <div className="tv-details-grid">
                                <div className="tv-detail-item">
                                    <span className="tv-detail-label">Template Type</span>
                                    <span className="tv-detail-val">{tpl.templateType || 'Multipurpose'}</span>
                                </div>
                                <div className="tv-detail-item">
                                    <span className="tv-detail-label">Layout Style</span>
                                    <span className="tv-detail-val">{tpl.layoutStyle || 'Modern'}</span>
                                </div>
                                <div className="tv-detail-item">
                                    <span className="tv-detail-label">Author</span>
                                    <span className="tv-detail-val">{tpl.author || 'Webcraft Inc.'}</span>
                                </div>
                                <div className="tv-detail-item">
                                    <span className="tv-detail-label">Technologies</span>
                                    <span className="tv-detail-val">
                                        {tpl.technologies && tpl.technologies.length > 0 ? (
                                            tpl.technologies.map((tech, idx) => (
                                                <span key={idx} className="tv-tech-tag">{tech}</span>
                                            ))
                                        ) : (
                                            <span style={{ color: '#94a3b8' }}>None</span>
                                        )}
                                    </span>
                                </div>
                                <div className="tv-detail-item">
                                    <span className="tv-detail-label">Compatible Browsers</span>
                                    <span className="tv-detail-val">
                                        {tpl.browsers && tpl.browsers.length > 0 ? tpl.browsers.join(', ') : 'Chrome, Firefox, Safari'}
                                    </span>
                                </div>
                                <div className="tv-detail-item">
                                    <span className="tv-detail-label">Documentation</span>
                                    <span className="tv-detail-val">
                                        {tpl.documentationUrl ? (
                                            <a href={tpl.documentationUrl} target="_blank" rel="noreferrer" className="tv-link"><i className="tv-icon-doc"></i> View Docs</a>
                                        ) : (
                                            <span style={{ color: '#94a3b8' }}>No documentation</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Info Box */}
                        <div className="tv-card">
                            <h3 className="tv-card-title">Quick Info</h3>
                            <div className="tv-info-list">
                                <div className="tv-info-item">
                                    <span>Plan Required</span>
                                    <span className="tv-badge outline-primary">{tpl.tier || 'BASIC'}</span>
                                </div>
                                <div className="tv-info-item">
                                    <span>Industry</span>
                                    <span className="tv-badge solid-primary">{tpl.industry || 'General'}</span>
                                </div>
                                <div className="tv-info-item block">
                                    <span>Support Email</span>
                                    <a href={`mailto:${tpl.supportEmail || 'support@webcraft.com'}`} className="tv-link-dark"><i className="tv-icon-mail"></i> {tpl.supportEmail || 'support@webcraft.com'}</a>
                                </div>
                            </div>
                        </div>

                        {/* Actions Box */}
                        <div className="tv-card">
                            <h3 className="tv-card-title">Actions</h3>
                            <div className="tv-actions-list">
                                <button className="tv-action-btn danger" onClick={() => handleDelete(tpl)}><i className="tv-icon-trash"></i> Delete Template</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderFormEditor = () => {
    if (!formData) return null;
    const isNew = !formData.id;

    return (
        <div className="template-form-editor">
            <div className="tv-header-section tfe-header-section">
                <div className="tv-header-main" style={{ marginBottom: 16 }}>
                    <div className="tv-title-group">
                        <div className="tv-title-row">
                            <h1 style={{ fontSize: 22 }}>{isNew ? 'Add Template' : 'Edit Template'}</h1>
                        </div>
                        <p className="tv-subtitle" style={{ fontSize: 13, color: '#64748b' }}>Manage template details, screenshots, features and other information.</p>
                    </div>
                    <div className="tfe-actions">
                        <button className="tfe-btn-cancel" onClick={() => { setViewMode(isNew ? 'list' : 'view'); updateUrl(isNew ? 'list' : 'view', formData?.id); }}>Cancel</button>
                        <button className="tfe-btn-save" onClick={handleSave}>Save Changes</button>
                    </div>
                </div>

                <div className="tv-tabs">
                    {['Basic Information', 'Screenshots', 'Page List', 'Features', 'FAQs'].map(tab => (
                        <div 
                            key={tab} 
                            className={`tv-tab ${activeEditorTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveEditorTab(tab)}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
            </div>

            {/* BASIC INFORMATION TAB */}
            {activeEditorTab === 'Basic Information' && (
                <div className="tv-content-grid" style={{ paddingTop: 32 }}>
                    {/* LEFT COLUMN */}
                    <div className="tv-content-left">
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Basic Information</h3>
                            
                            <div className="tfe-form-group">
                                <label>Template Name <span className="tfe-required">*</span></label>
                                <input type="text" className="tfe-input" value={formData.name || ''} onChange={e => handleTemplateNameChange(e.target.value)} placeholder="e.g. Traditional Mix" />
                            </div>
                            
                            <div className="tfe-form-group">
                                <label>Slug / Template Key <span className="tfe-required">*</span></label>
                                <input type="text" className="tfe-input" value={formData.templateKey || ''} onChange={e => handleTemplateKeyChange(e.target.value)} placeholder="e.g. traditional-mix" />
                            </div>
                            
                            <div className="tfe-grid-2">
                                <div className="tfe-form-group">
                                    <label>Category (Tier) <span className="tfe-required">*</span></label>
                                    <select className="tfe-input" value={formData.tier || ''} onChange={e => setFormData({...formData, tier: e.target.value, planRequired: e.target.value})}>
                                        <option value="">Select Category</option>
                                        {(plansList || []).map(p => {
                                            const nameValue = p.plan_name || p.planName || '';
                                            const tierValue = nameValue.toUpperCase();
                                            return (
                                                <option key={p.id || p.plan_id || p.planCode} value={tierValue}>
                                                    {nameValue}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="tfe-form-group">
                                    <label>Industry <span className="tfe-required">*</span></label>
                                    <select className="tfe-input" value={formData.industry || ''} onChange={e => setFormData({...formData, industry: e.target.value})}>
                                        <option value="">Select Industry</option>
                                        {(industriesList || []).map(i => (
                                            <option key={i.industryId || i.id} value={i.name}>
                                                {i.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="tfe-form-group">
                                <label>Short Description <span className="tfe-required">*</span></label>
                                <textarea className="tfe-input" rows="2" value={formData.shortDescription || ''} onChange={e => setFormData({...formData, shortDescription: e.target.value})} placeholder="Professional template for fashion and traditional wear stores."></textarea>
                                <div className="tfe-char-count">{(formData.shortDescription || '').length}/160</div>
                            </div>

                            <div className="tfe-form-group">
                                <label>Long Description <span className="tfe-required">*</span></label>
                                <div className="tfe-editor-mock">
                                    <div className="tfe-editor-toolbar">
                                        <div className="tfe-toolbar-icons">
                                            <b>B</b> <i>I</i> <u>U</u> <span className="tfe-icon-list"></span>
                                        </div>
                                    </div>
                                    <textarea className="tfe-editor-area" rows="6" value={formData.fullDescription || ''} onChange={e => setFormData({...formData, fullDescription: e.target.value})} placeholder="Traditional Mix is a beautifully designed eCommerce template..."></textarea>
                                </div>
                            </div>

                            <div className="tfe-form-group">
                                <label>Technologies Used (Press Enter to add)</label>
                                <div className="tfe-tags-input">
                                    {(formData.technologies || []).map((t, idx) => (
                                        <span key={idx} className="tfe-tag-pill" onClick={() => setFormData({...formData, technologies: formData.technologies.filter((_, i) => i !== idx)})}>{t} ✕</span>
                                    ))}
                                    <input type="text" value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => {
                                        if (e.key === 'Enter' && techInput.trim()) {
                                            e.preventDefault();
                                            if (!formData.technologies.includes(techInput.trim())) {
                                                setFormData({...formData, technologies: [...(formData.technologies || []), techInput.trim()]});
                                            }
                                            setTechInput('');
                                        }
                                    }} placeholder="Type and press enter..." />
                                </div>
                            </div>

                            <div className="tfe-form-group">
                                <label>Compatible Browsers (Press Enter to add)</label>
                                <div className="tfe-tags-input">
                                    {(formData.browsers || []).map((b, idx) => (
                                        <span key={idx} className="tfe-tag-pill" onClick={() => setFormData({...formData, browsers: formData.browsers.filter((_, i) => i !== idx)})}>{b} ✕</span>
                                    ))}
                                    <input type="text" value={browserInput} onChange={e => setBrowserInput(e.target.value)} onKeyDown={e => {
                                        if (e.key === 'Enter' && browserInput.trim()) {
                                            e.preventDefault();
                                            if (!formData.browsers.includes(browserInput.trim())) {
                                                setFormData({...formData, browsers: [...(formData.browsers || []), browserInput.trim()]});
                                            }
                                            setBrowserInput('');
                                        }
                                    }} placeholder="Type and press enter..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="tv-content-right">
                        {/* Status Box */}
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Template Status</h3>
                            <div className="tv-status-form">
                                <div className="tfe-form-group">
                                    <label>Status</label>
                                    <select className="tfe-input" value={formData.status || 'DRAFT'} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="DRAFT">Draft</option>
                                        <option value="PUBLISHED">Published</option>
                                        <option value="ACTIVE">Active</option>
                                    </select>
                                </div>
                                <div className="tfe-form-group">
                                    <label>Template Version</label>
                                    <input type="text" className="tfe-input" value={formData.version || ''} onChange={e => setFormData({...formData, version: e.target.value})} placeholder="v1.0.0" />
                                </div>
                            </div>
                        </div>

                        {/* Template Metadata Details */}
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Template Details</h3>
                            <div className="tfe-form-group">
                                <label>Template Type</label>
                                <select className="tfe-input" value={formData.templateType || 'Multipurpose'} onChange={e => setFormData({...formData, templateType: e.target.value})}>
                                    <option value="Multipurpose">Multipurpose</option>
                                    <option value="Single Product">Single Product</option>
                                    <option value="B2B Store">B2B Store</option>
                                    <option value="Portfolio">Portfolio</option>
                                </select>
                            </div>
                            <div className="tfe-form-group">
                                <label>Author</label>
                                <input type="text" className="tfe-input" value={formData.author || ''} onChange={e => setFormData({...formData, author: e.target.value})} placeholder="Webcraft Inc." />
                            </div>
                            <div className="tfe-form-group">
                                <label>Layout Style</label>
                                <select className="tfe-input" value={formData.layoutStyle || 'Modern'} onChange={e => setFormData({...formData, layoutStyle: e.target.value})}>
                                    <option value="Modern">Modern</option>
                                    <option value="Minimal">Minimal</option>
                                    <option value="Grid">Grid</option>
                                    <option value="Traditional">Traditional</option>
                                </select>
                            </div>
                            <div className="tfe-form-group">
                                <label>Support Email</label>
                                <input type="email" className="tfe-input" value={formData.supportEmail || ''} onChange={e => setFormData({...formData, supportEmail: e.target.value})} placeholder="support@webcraft.com" />
                            </div>
                            <div className="tfe-form-group">
                                <label>Documentation URL</label>
                                <input type="text" className="tfe-input" value={formData.documentationUrl || ''} onChange={e => setFormData({...formData, documentationUrl: e.target.value})} placeholder="https://docs.webcraft.com/..." />
                            </div>
                            <div className="tfe-form-group">
                                <label>Created On</label>
                                <input type="date" className="tfe-input" value={formData.createdOn || ''} onChange={e => setFormData({...formData, createdOn: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SCREENSHOTS TAB */}
            {activeEditorTab === 'Screenshots' && (
                <div style={{ padding: '32px 32px 64px' }}>
                    <div className="tv-card tfe-card">
                        <div className="tfe-card-header">
                            <h3 className="tv-card-title m-0">Screenshots Management</h3>
                            <label className="tfe-btn-upload">
                                <i className="tv-icon-upload-small"></i> Add Screenshots
                                <input type="file" hidden onChange={handleMediaUpload} />
                            </label>
                        </div>
                        
                        <div className="tfe-screenshots-area">
                            {formData.id ? (
                                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                                        <SortableContext items={(formData.media || []).map(m => m.id || m.imageUrl || m.url || Math.random().toString())} strategy={horizontalListSortingStrategy}>
                                            {(formData.media || []).length > 0 ? (formData.media || []).map((m, idx) => (
                                                <SortableImage key={m.id || m.imageUrl || idx} item={m} idx={idx} onRemove={handleRemoveMedia} />
                                            )) : (
                                                <div className="tfe-empty-state">No images uploaded yet. Click 'Add Screenshots' above.</div>
                                            )}
                                        </SortableContext>
                                    </div>
                                </DndContext>
                            ) : (
                                <div className="tfe-empty-state">Fill basic info and click 'Add Screenshots'. A draft template will be created automatically on first upload.</div>
                            )}
                            <div className="tfe-drag-hint">
                                <i className="tv-icon-drag"></i> Drag & drop images to reorder
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PAGES TAB */}
            {activeEditorTab === 'Page List' && (
                <div className="tv-content-grid" style={{ paddingTop: 32 }}>
                    <div className="tv-content-left">
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Add New Page</h3>
                            <div className="tfe-form-group">
                                <label>Page Name <span className="tfe-required">*</span></label>
                                <input type="text" className="tfe-input" value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="e.g. Product Page" />
                            </div>
                            <div className="tfe-form-group">
                                <label>Path / Slug <span className="tfe-required">*</span></label>
                                <input type="text" className="tfe-input" value={newPagePath} onChange={e => setNewPagePath(e.target.value)} placeholder="e.g. /product/:id" />
                            </div>
                            <button 
                                type="button" 
                                className="tv-btn-primary" 
                                onClick={() => {
                                    if (!newPageName.trim() || !newPagePath.trim()) return;
                                    const updatedPages = [...(formData.pages || []), { name: newPageName.trim(), path: newPagePath.trim() }];
                                    setFormData({ ...formData, pages: updatedPages });
                                    setNewPageName('');
                                    setNewPagePath('');
                                }}
                            >
                                Add Page
                            </button>
                        </div>
                    </div>
                    <div className="tv-content-right">
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Pages List ({formData.pages?.length || 0})</h3>
                            {(formData.pages || []).length > 0 ? (
                                <table className="admin-table" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Path</th>
                                            <th style={{ width: 80, textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(formData.pages || []).map((p, idx) => (
                                            <tr key={idx}>
                                                <td><span style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</span></td>
                                                <td><code>{p.path}</code></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button 
                                                        type="button"
                                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                                        onClick={() => {
                                                            const updated = (formData.pages || []).filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, pages: updated });
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="tfe-empty-state">No pages added yet. Use the form on the left to add pages.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FEATURES TAB */}
            {activeEditorTab === 'Features' && (
                <div className="tv-content-grid" style={{ paddingTop: 32 }}>
                    <div className="tv-content-left">
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Add New Feature</h3>
                            <div className="tfe-form-group">
                                <label>Feature Title <span className="tfe-required">*</span></label>
                                <input type="text" className="tfe-input" value={newFeatureTitle} onChange={e => setNewFeatureTitle(e.target.value)} placeholder="e.g. 1-Click Checkout" />
                            </div>
                            <div className="tfe-form-group">
                                <label>Feature Description</label>
                                <textarea className="tfe-input" rows="3" value={newFeatureDesc} onChange={e => setNewFeatureDesc(e.target.value)} placeholder="e.g. Faster buying experience resulting in higher conversion." />
                            </div>
                            <button 
                                type="button" 
                                className="tv-btn-primary" 
                                onClick={() => {
                                    if (!newFeatureTitle.trim()) return;
                                    const updated = [...(formData.features || []), { title: newFeatureTitle.trim(), description: newFeatureDesc.trim() }];
                                    setFormData({ ...formData, features: updated });
                                    setNewFeatureTitle('');
                                    setNewFeatureDesc('');
                                }}
                            >
                                Add Feature
                            </button>
                        </div>
                    </div>
                    <div className="tv-content-right">
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Features List ({formData.features?.length || 0})</h3>
                            {(formData.features || []).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {(formData.features || []).map((f, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                            <div style={{ marginRight: 16 }}>
                                                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{f.title || f}</h4>
                                                <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{f.description || 'No description'}</p>
                                            </div>
                                            <button 
                                                type="button"
                                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                                                onClick={() => {
                                                    const updated = (formData.features || []).filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, features: updated });
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="tfe-empty-state">No features added yet. Use the form on the left to add features.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FAQS TAB */}
            {activeEditorTab === 'FAQs' && (
                <div className="tv-content-grid" style={{ paddingTop: 32 }}>
                    <div className="tv-content-left">
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">Add New FAQ</h3>
                            <div className="tfe-form-group">
                                <label>Question <span className="tfe-required">*</span></label>
                                <input type="text" className="tfe-input" value={newFaqQuestion} onChange={e => setNewFaqQuestion(e.target.value)} placeholder="e.g. Is it search engine optimized?" />
                            </div>
                            <div className="tfe-form-group">
                                <label>Answer <span className="tfe-required">*</span></label>
                                <textarea className="tfe-input" rows="3" value={newFaqAnswer} onChange={e => setNewFaqAnswer(e.target.value)} placeholder="e.g. Yes, all page templates follow best SEO practices." />
                            </div>
                            <button 
                                type="button" 
                                className="tv-btn-primary" 
                                onClick={() => {
                                    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
                                    const updated = [...(formData.faqs || []), { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }];
                                    setFormData({ ...formData, faqs: updated });
                                    setNewFaqQuestion('');
                                    setNewFaqAnswer('');
                                }}
                            >
                                Add FAQ
                            </button>
                        </div>
                    </div>
                    <div className="tv-content-right">
                        <div className="tv-card tfe-card">
                            <h3 className="tv-card-title">FAQs List ({formData.faqs?.length || 0})</h3>
                            {(formData.faqs || []).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {(formData.faqs || []).map((faq, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                            <div style={{ marginRight: 16 }}>
                                                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{faq.question}</h4>
                                                <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{faq.answer}</p>
                                            </div>
                                            <button 
                                                type="button"
                                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                                                onClick={() => {
                                                    const updated = (formData.faqs || []).filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, faqs: updated });
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="tfe-empty-state">No FAQs added yet. Use the form on the left to add FAQs.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  // Derived Data for UI
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(t => (t.name || '').toLowerCase().includes(q) || (t.templateKey || '').toLowerCase().includes(q));
    }
    if (industryFilter) result = result.filter(t => t.industry === industryFilter);
    if (tierFilter) result = result.filter(t => t.tier === tierFilter);
    if (statusFilter) result = result.filter(t => (t.status || '').toLowerCase() === statusFilter.toLowerCase());
    return result;
  }, [templates, searchQuery, industryFilter, tierFilter, statusFilter]);

  const uniqueIndustries = useMemo(() => [...new Set(templates.map(t => t.industry).filter(Boolean))], [templates]);

  return (
    <div>
      <Banner message={message} />

      {viewMode === 'list' && (
        <div className="mv-layout">
          <div className="panel card users-table-card">
            <div className="gsc-datatable-toolbar">
                <div className="gsc-datatable-toolbar-left" style={{ position: 'relative' }}>
                  <button className="gsc-toolbar-btn" onClick={() => setShowFilters(!showFilters)}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    Filter
                  </button>
                  {showFilters && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
                      {uniqueIndustries.length > 0 && (
                          <select className="gsc-toolbar-btn storefront-filter-select" value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}>
                              <option value="">All Industries</option>
                              {uniqueIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                          </select>
                      )}
                      <select className="gsc-toolbar-btn storefront-filter-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
                          <option value="">All Tiers</option>
                          <option value="BASIC">Basic</option>
                          <option value="PREMIUM">Premium</option>
                          <option value="GROWTH">Growth</option>
                          <option value="ENTERPRISE">Enterprise</option>
                      </select>
                      <select className="gsc-toolbar-btn storefront-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                          <option value="">All Statuses</option>
                          <option value="PUBLISHED">Published</option>
                          <option value="ACTIVE">Active</option>
                          <option value="DRAFT">Draft</option>
                      </select>
                    </div>
                  )}
                </div>
              <div className="gsc-datatable-toolbar-right">
                <div className="gsc-toolbar-search">
                  <input type="text" placeholder="Search templates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button className="gsc-create-btn" onClick={handleCreateNew}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>

            <div className="table-shell">
              <table className="admin-table storefront-master-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Preview</th>
                    <th>Template Name</th>
                    <th>Industry</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Loading...</td></tr>
                  ) : filteredTemplates.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No templates found.</td></tr>
                  ) : filteredTemplates.map(tpl => (
                    <tr
                      key={tpl.id}
                      className={viewItem?.id === tpl.id ? 'mv-row-active' : ''}
                      onClick={() => handleView(tpl)}
                    >
                      <td>
                          <div style={{ width: 44, height: 32, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0', margin: '0 auto' }}>
                              {tpl.media && tpl.media.length > 0 ? (
                                  <img src={resolveImageUrl(tpl.media[0].imageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : tpl.previewImage ? (
                                  <img src={resolveImageUrl(tpl.previewImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : null}
                          </div>
                      </td>
                      <td>
                          <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 14 }}>{tpl.name}</div>
                          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>ID: {tpl.templateKey}</div>
                      </td>
                      <td>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: '#f3e8ff', color: '#7e22ce', fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
                              {tpl.industry}
                          </span>
                      </td>
                      <td>
                          <span style={{ fontWeight: 600, color: '#475569' }}>
                              {tpl.tier || 'BASIC'}
                          </span>
                      </td>
                      <td>
                          <span className={`status-pill storefront-status ${tpl.status?.toLowerCase() === 'active' || tpl.status?.toLowerCase() === 'published' ? 'active' : 'pending'}`}>
                              {tpl.status}
                          </span>
                      </td>
                      <td className="table-actions" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                          <TableRowActionMenu 
                              rowId={tpl.id}
                              openRowId={openActionRowId}
                              onToggle={(id) => setOpenActionRowId(id)}
                              actions={[
                                { label: 'View Details', onClick: () => handleView(tpl) },
                                { label: 'Edit Template', onClick: () => handleEdit(tpl) },
                                { label: 'Delete', danger: true, onClick: () => handleDelete(tpl) }
                              ]}
                          />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {!isLoading && (
              <div className="table-record-count">
                <span>{filteredTemplates.length} templates</span>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'view' && renderViewDashboard()}
      {viewMode === 'edit' && renderFormEditor()}
    </div>
  );
}

export default StorefrontTemplatesPage;
