import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DropZone, SortablePreviewItem, HeaderBlockPreview, PreviewSection } from './AppConfigDndComponents';

export const StudioCanvas = ({
  selectedPage,
  headerDrop,
  screenDrop,
  previewHeaderStyle,
  openHeaderSettings,
  headerDragIds = [],
  selectedHeaderSections = [],
  activePanel,
  editingHeaderSectionIndex,
  editingSectionIndex,
  openEditHeaderSection,
  openEditSection,
  industries = [],
  headerAttachedEntries = [],
  bodyDragIds = [],
  bodySectionEntries = [],
  collections = [],
  mainCategories = [],
  productCollections = [],
  pageThemePreset = 'default',
  buildDragId,
}) => {
  return (
    <div className="studio-canvas-container">
      {/* Smartphone Hardware Frame */}
      <div className="studio-phone-mockup">
        {/* Inner Phone Screen */}
        <div className="studio-phone-screen">
          {/* Status Bar with Dynamic Island (Seamlessly matching header background) */}
          <div
            className="studio-phone-status-bar"
            style={{
              backgroundColor: previewHeaderStyle?.backgroundColor || '#6345ED',
              backgroundImage: previewHeaderStyle?.backgroundImage || undefined,
              color: previewHeaderStyle?.color || '#ffffff',
            }}
          >
            <span className="studio-status-time">9:41</span>
            <div className="studio-phone-notch" />
            <div className="studio-status-icons">
              {/* Cellular Signal Icon */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
                <path d="M1 8.5h2v-2H1v2zm3 0h2v-4H4v4zm3 0h2v-6H7v6zm3 0h2V0h-2v8.5z" />
              </svg>
              {/* Wifi Icon */}
              <svg width="13" height="10" viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4.24-3.24a6 6 0 018.48 0l-1.06 1.06a4.5 4.5 0 00-6.36 0L3.76 6.26zM1.64 4.14a9 9 0 0112.72 0l-1.06 1.06a7.5 7.5 0 00-10.6 0L1.64 4.14z" />
              </svg>
              {/* Battery Icon */}
              <svg width="20" height="10" viewBox="0 0 24 12" fill="currentColor">
                <rect x="1" y="1" width="19" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="3" width="13" height="6" rx="1.5" />
                <path d="M22 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Header Droppable Area */}
          <DropZone
            id="drop-header"
            isOver={headerDrop?.isOver}
            className="preview-header"
            style={previewHeaderStyle}
            onClick={(e) => {
              if (
                e.target === e.currentTarget ||
                e.target?.classList?.contains('preview-header-stack') ||
                e.target?.classList?.contains('preview-header')
              ) {
                if (selectedHeaderSections.length > 0) {
                  openEditHeaderSection(editingHeaderSectionIndex !== null ? editingHeaderSectionIndex : 0);
                } else {
                  openHeaderSettings();
                }
              }
            }}
          >
            <SortableContext items={headerDragIds} strategy={verticalListSortingStrategy}>
              {selectedHeaderSections.length ? (
                <div className="preview-header-stack">
                  {selectedHeaderSections.map((section, index) => {
                    const isActive = activePanel === 'header' && editingHeaderSectionIndex === index;
                    const isHidden = section?.enabled === false;
                    return (
                      <SortablePreviewItem
                        key={headerDragIds[index]}
                        id={headerDragIds[index]}
                        className={`preview-header-block ${isActive ? 'is-active' : ''} ${
                          isHidden ? 'is-hidden' : ''
                        }`}
                        onClick={(e) => {
                          e?.stopPropagation?.();
                          openEditHeaderSection(index);
                        }}
                      >
                        <HeaderBlockPreview block={section} industries={industries} />
                      </SortablePreviewItem>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="studio-header-drop-placeholder"
                  onClick={(e) => {
                    e?.stopPropagation?.();
                    openHeaderSettings();
                  }}
                >
                  <span>Header Area (Click to configure or drop header blocks)</span>
                </div>
              )}
            </SortableContext>

            {headerAttachedEntries?.length ? (
              <div className="preview-header-attached">
                {headerAttachedEntries.map((entry) => {
                  const isActive = activePanel === 'screen' && editingSectionIndex === entry.index;
                  return (
                    <div
                      key={`header-attached-${entry.index}`}
                      className={`preview-attached-item ${isActive ? 'is-active' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditSection(entry.index);
                      }}
                    >
                      <PreviewSection
                        section={entry.section}
                        index={entry.index}
                        collections={collections}
                        mainCategories={mainCategories}
                        productCollections={productCollections}
                        pageThemePreset={pageThemePreset}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </DropZone>

          {/* Main Feed Content Droppable Screen Area */}
          <DropZone id="drop-screen" isOver={screenDrop?.isOver} className="studio-screen-body">
            <SortableContext items={bodyDragIds} strategy={verticalListSortingStrategy}>
              {bodySectionEntries.length ? (
                bodySectionEntries.map((entry) => {
                  const isActive = activePanel === 'screen' && editingSectionIndex === entry.index;
                  const dragId = buildDragId ? buildDragId(entry.section, entry.index, 'section') : `section-${entry.index}`;
                  return (
                    <SortablePreviewItem
                      key={dragId}
                      id={dragId}
                      className={`studio-sortable-block-wrap ${isActive ? 'is-active' : ''}`}
                      onClick={() => openEditSection(entry.index)}
                    >
                      <PreviewSection
                        section={entry.section}
                        index={entry.index}
                        collections={collections}
                        mainCategories={mainCategories}
                        productCollections={productCollections}
                        pageThemePreset={pageThemePreset}
                      />
                    </SortablePreviewItem>
                  );
                })
              ) : (
                <div className="studio-screen-empty-placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M12 8v8" />
                    <path d="M8 12h8" />
                  </svg>
                  <strong>Drop blocks here to build page</strong>
                  <span>Drag blocks from the toolbox or click Add</span>
                </div>
              )}
            </SortableContext>
          </DropZone>
        </div>
      </div>
    </div>
  );
};