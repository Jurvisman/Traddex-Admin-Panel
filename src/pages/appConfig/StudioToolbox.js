import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { StudioIcons, getToolboxIcon } from './appConfigStudioIcons';
import { toolboxItems as defaultToolboxItems } from './appConfigConstants';

const DEFAULT_TOOLBOX_GROUPS = [
  { id: 'marketing', label: 'Banners & Promos', description: 'Hero banners, offers, campaigns, and visual story cards' },
  { id: 'commerce', label: 'Products', description: 'Live product shelves, product cards, and product grids' },
  { id: 'categories', label: 'Categories & Brands', description: 'Category navigation, showcases, and brand discovery' },
  { id: 'discovery', label: 'Shops & Navigation', description: 'Nearby shops, quick actions, shortcuts, and chips' },
  { id: 'content', label: 'Content Blocks', description: 'Text, icon lists, section titles, and manual content rows' },
  { id: 'header', label: 'Header', description: 'Top-of-screen location, search, and navigation blocks' },
  { id: 'fixed', label: 'Legacy / Fixed', description: 'Hardcoded industry blocks kept for compatibility' },
];

const DraggableStudioBlockCard = ({ item, onAdd }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `toolbox:${item.key}`,
    data: { item, type: 'toolbox' },
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const blockType = item?.section?.blockType || item?.section?.type || item.key;
  const IconComponent = getToolboxIcon(item.key, blockType);

  const modeLabel =
    item.mode === 'Dynamic'
      ? 'Live'
      : item.mode === 'Hybrid'
        ? 'Live + backup'
        : item.mode === 'Manual'
          ? 'Manual'
          : item.mode;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`studio-block-card ${isDragging ? 'is-dragging' : ''}`}
      onClick={() => onAdd && onAdd(item)}
      title={item.hint || item.bestFor || item.label}
      {...attributes}
      {...listeners}
    >
      <div className="studio-block-icon-wrap">
        <IconComponent />
      </div>
      <span className="studio-block-title">{item.label}</span>
      {item.mode ? (
        <span className={`studio-mode-chip mode-${String(item.mode).toLowerCase()}`}>
          {modeLabel}
        </span>
      ) : null}
    </div>
  );
};

export const StudioToolbox = ({
  items = defaultToolboxItems,
  groups = DEFAULT_TOOLBOX_GROUPS,
  onAddBlock,
}) => {
  const [activeTab, setActiveTab] = useState('blocks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMode, setSelectedMode] = useState('ALL');
  const [openGroups, setOpenGroups] = useState({
    marketing: true,
    commerce: true,
    categories: true,
    discovery: true,
    content: true,
    header: true,
    fixed: true,
  });

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Group items by groupId
  const visibleGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryClean = query.replace(/ /g, '').replace(/_/g, '');

    const filteredItems = (Array.isArray(items) ? items : []).filter((item) => {
      const mode = String(item.mode || '').toUpperCase();
      const matchesMode = selectedMode === 'ALL' || mode === selectedMode;
      const groupId = item.groupId || 'content';
      const matchesCategory = selectedCategory === 'ALL' || groupId === selectedCategory;

      if (!matchesMode || !matchesCategory) return false;

      if (!query) return true;

      const searchText = [
        item.label,
        item.hint,
        item.bestFor,
        item.mode,
        item.section?.blockType,
        item.section?.type,
        item.key,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const textClean = searchText.replace(/ /g, '').replace(/_/g, '');

      return (
        searchText.includes(query) ||
        searchText.replace(/_/g, ' ').includes(query) ||
        textClean.includes(queryClean)
      );
    });

    const byGroup = new Map();
    filteredItems.forEach((item) => {
      const gId = item.groupId || (item.scope === 'header' ? 'header' : 'content');
      if (!byGroup.has(gId)) byGroup.set(gId, []);
      byGroup.get(gId).push(item);
    });

    return (Array.isArray(groups) ? groups : DEFAULT_TOOLBOX_GROUPS)
      .map((group) => ({
        ...group,
        items: byGroup.get(group.id) || [],
      }))
      .filter((group) => group.items.length > 0);
  }, [items, groups, searchQuery, selectedCategory, selectedMode]);

  const totalCount = useMemo(() => {
    return visibleGroups.reduce((acc, group) => acc + group.items.length, 0);
  }, [visibleGroups]);

  return (
    <div className="studio-toolbox">
      {/* Panel Header */}
      <div className="studio-panel-header">
        <div className="studio-panel-title-group">
          <h3>Toolbox</h3>
          <p>Drag & drop blocks to build your page</p>
        </div>
        <span className="studio-count-badge">{totalCount} Blocks</span>
      </div>

      {/* Tabs: Blocks | Saved Blocks */}
      <div className="studio-tabs-row">
        <button
          type="button"
          className={`studio-tab-btn ${activeTab === 'blocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocks')}
        >
          Blocks
        </button>
        <button
          type="button"
          className={`studio-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved Blocks
        </button>
      </div>

      {/* Search Input */}
      <div className="studio-search-bar">
        <span className="studio-search-icon">
          <StudioIcons.Search />
        </span>
        <input
          type="search"
          placeholder="Search blocks (product, category, banner...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Row: Category Dropdown & Data Mode */}
      <div className="studio-filters-row" style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <select
          className="studio-category-dropdown"
          style={{ flex: 1, margin: 0 }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {(Array.isArray(groups) ? groups : DEFAULT_TOOLBOX_GROUPS).map((group) => (
            <option key={group.id} value={group.id}>
              {group.label}
            </option>
          ))}
        </select>
        <select
          className="studio-category-dropdown"
          style={{ width: '110px', margin: 0 }}
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
        >
          <option value="ALL">All Modes</option>
          <option value="DYNAMIC">Live Feed</option>
          <option value="HYBRID">Live + Backup</option>
          <option value="MANUAL">Manual</option>
          <option value="FIXED">Fixed</option>
        </select>
      </div>

      {/* Accordion Groups */}
      <div className="studio-accordion-list">
        {visibleGroups.length > 0 ? (
          visibleGroups.map((group) => {
            const isOpen = openGroups[group.id] !== false;
            return (
              <div key={group.id} className="studio-accordion-group">
                <div
                  className="studio-accordion-header"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{group.label}</span>
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>({group.items.length})</span>
                  </div>
                  {isOpen ? <StudioIcons.ChevronDown /> : <StudioIcons.ChevronRight />}
                </div>

                {isOpen ? (
                  <div className="studio-block-grid">
                    {group.items.map((item) => (
                      <DraggableStudioBlockCard
                        key={item.key}
                        item={item}
                        onAdd={onAddBlock}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 12px', color: '#94a3b8', fontSize: '13px' }}>
            No blocks found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};