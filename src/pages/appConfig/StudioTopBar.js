import React from 'react';
import { StudioIcons } from './appConfigStudioIcons';
import { formatDate } from './appConfigConstants';

export const StudioTopBar = ({
  pages = [],
  selectedPageKey,
  onSelectPageKey,
  pagePresets = [],
  getPageLabel,
  getPageKey,
  showManagePages,
  onToggleManagePages,
  showManageTabs,
  onToggleManageTabs,
  latestUpdated,
  hasUnsavedChanges,
  version,
  versionCount = 0,
  versions = [],
  showVersionDropdown,
  onToggleVersionDropdown,
  versionDropdownRef,
  onRequestRollback,
  onCreateBaseConfig,
  onEnsureHeaderPages,
  onSaveDraft,
  onPublish,
  isLoading,
}) => {
  return (
    <div className="studio-topbar">
      {/* Left section: Pages selector and all primary Action Buttons */}
      <div className="studio-topbar-left">
        <div className="studio-badge-logo">
          <StudioIcons.Pages />
          <span>Pages</span>
        </div>

        <div className="studio-page-select-wrap">
          <select
            className="studio-page-select"
            value={selectedPageKey}
            onChange={(e) => onSelectPageKey(e.target.value)}
          >
            <option value="">Select page</option>
            {pages.map((page, index) => {
              const key = getPageKey(page, index);
              return (
                <option key={key} value={key}>
                  {getPageLabel(page, index, pagePresets)}
                </option>
              );
            })}
          </select>
          <span className="studio-select-chevron">
            <StudioIcons.ChevronDown />
          </span>
        </div>

        <button
          type="button"
          className={`studio-btn studio-btn-outline ${showManagePages ? 'is-active' : ''}`}
          onClick={onToggleManagePages}
          title="Manage Pages"
        >
          <StudioIcons.ManagePages />
          <span>Manage Pages</span>
        </button>

        <button
          type="button"
          className={`studio-btn studio-btn-outline ${showManageTabs ? 'is-active' : ''}`}
          onClick={onToggleManageTabs}
          title="Manage Tabs"
        >
          <StudioIcons.ManageTabs />
          <span>Manage Tabs</span>
        </button>

        <div className="version-dropdown-wrap" ref={versionDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="studio-btn studio-btn-outline"
            onClick={onToggleVersionDropdown}
            title="Version History"
          >
            <StudioIcons.History />
            <span>History ({versionCount})</span>
          </button>
          {showVersionDropdown && versions.length > 0 ? (
            <div className="version-dropdown">
              <div className="version-dropdown-header">Recent Versions</div>
              {versions.slice(0, 5).map((item) => (
                <div key={item.id} className="version-dropdown-row">
                  <div className="version-dropdown-info">
                    <span className="version-dropdown-id">#{item.id}</span>
                    <span className="version-dropdown-status">{item.status || 'draft'}</span>
                    <span className="version-dropdown-date">{formatDate(item.updated_on || item.published_on)}</span>
                  </div>
                  <button
                    type="button"
                    className="ghost-btn small danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestRollback(item.id);
                    }}
                    disabled={isLoading}
                  >
                    Rollback
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="studio-btn studio-btn-outline"
          onClick={onCreateBaseConfig}
          disabled={isLoading}
          title="Create Base Configuration"
        >
          <StudioIcons.CreateBase />
          <span>Base Config</span>
        </button>

        <button
          type="button"
          className="studio-btn studio-btn-outline"
          onClick={onEnsureHeaderPages}
          disabled={isLoading}
          title="Ensure Header Pages"
        >
          <StudioIcons.EnsureHeaders />
          <span>Ensure Headers</span>
        </button>

        <button
          type="button"
          className="studio-btn studio-btn-draft"
          onClick={onSaveDraft}
          disabled={isLoading}
          title="Save Draft"
        >
          <StudioIcons.SaveDraft />
          <span>{isLoading ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          type="button"
          className="studio-btn studio-btn-publish"
          onClick={onPublish}
          disabled={isLoading}
          title="Publish Configuration"
        >
          <StudioIcons.Publish />
          <span>{isLoading ? 'Publishing...' : 'Publish'}</span>
        </button>
      </div>

      {/* Right section: Version Status & Last Updated info */}
      <div className="studio-topbar-right">
        <span className="studio-meta-info">
          {latestUpdated ? `Last updated: ${formatDate(latestUpdated)}` : 'Last updated: Just now'}
        </span>

        {hasUnsavedChanges ? (
          <span className="studio-version-pill" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
            Unsaved
          </span>
        ) : null}

        <span className="studio-version-pill">
          v{version || '1.0.0'}
        </span>
      </div>
    </div>
  );
};