import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '../components';
import {
  deleteWebsiteSocialLink,
  fetchWebsiteCmsPage,
  fetchWebsiteCmsPages,
  fetchWebsiteSocialLinks,
  publishWebsiteCmsPage,
  saveWebsiteSocialLink,
  updateWebsiteCmsPage,
} from '../services/adminApi';
import { usePermissions } from '../shared/permissions';

const emptySocialForm = {
  id: null,
  platformKey: '',
  label: '',
  url: '',
  sortOrder: 0,
  active: true,
};

const unwrap = (response, fallback) => response?.data || response || fallback;

const parseContentSections = (value) => {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((section) => ({
      heading: String(section?.heading || ''),
      body: Array.isArray(section?.body)
        ? section.body.map((paragraph) => String(paragraph || ''))
        : [''],
    }));
  } catch (error) {
    return [];
  }
};

const createEmptySection = () => ({
  heading: '',
  body: [''],
});

const normalizePageForm = (page) => ({
  slug: page?.slug || '',
  title: page?.title || '',
  lastUpdatedLabel: page?.lastUpdatedLabel || '',
  intro: page?.intro || '',
  status: page?.status || 'DRAFT',
  sections: parseContentSections(page?.contentJson || '[]'),
});

const serializeSections = (sections = []) =>
  sections
    .map((section) => ({
      heading: String(section.heading || '').trim(),
      body: Array.isArray(section.body)
        ? section.body.map((paragraph) => String(paragraph || '').trim()).filter(Boolean)
        : [],
    }))
    .filter((section) => section.heading || section.body.length > 0);

function WebsiteCmsPage({ token }) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('ADMIN_WEBSITE_CMS_UPDATE');
  const [pages, setPages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [pageForm, setPageForm] = useState(normalizePageForm());
  const [socialLinks, setSocialLinks] = useState([]);
  const [socialForm, setSocialForm] = useState(emptySocialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [message, setMessage] = useState({ type: 'info', text: '' });

  const selectedPage = useMemo(
    () => pages.find((page) => page.slug === selectedSlug) || null,
    [pages, selectedSlug]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: '' });
    try {
      const [pageResponse, socialResponse] = await Promise.all([
        fetchWebsiteCmsPages(token),
        fetchWebsiteSocialLinks(token),
      ]);
      const pageList = unwrap(pageResponse, []);
      const socialList = unwrap(socialResponse, []);
      setPages(Array.isArray(pageList) ? pageList : []);
      setSocialLinks(Array.isArray(socialList) ? socialList : []);
      if (Array.isArray(pageList) && pageList.length > 0) {
        setSelectedSlug((current) => current || pageList[0].slug);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load website CMS.' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadPage = useCallback(async () => {
    if (!selectedSlug) return;
    try {
      const response = await fetchWebsiteCmsPage(token, selectedSlug);
      setPageForm(normalizePageForm(unwrap(response, null)));
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load selected CMS page.' });
    }
  }, [selectedSlug, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const updatePageField = (field, value) => {
    setPageForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSection = (sectionIndex, field, value) => {
    setPageForm((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section, index) =>
        index === sectionIndex ? { ...section, [field]: value } : section
      ),
    }));
  };

  const addSection = () => {
    setPageForm((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), createEmptySection()],
    }));
  };

  const removeSection = (sectionIndex) => {
    setPageForm((prev) => ({
      ...prev,
      sections: (prev.sections || []).filter((_, index) => index !== sectionIndex),
    }));
  };

  const updateParagraph = (sectionIndex, paragraphIndex, value) => {
    setPageForm((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section, index) => {
        if (index !== sectionIndex) return section;
        const body = Array.isArray(section.body) ? section.body : [''];
        return {
          ...section,
          body: body.map((paragraph, bodyIndex) => (bodyIndex === paragraphIndex ? value : paragraph)),
        };
      }),
    }));
  };

  const addParagraph = (sectionIndex) => {
    setPageForm((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section, index) =>
        index === sectionIndex
          ? { ...section, body: [...(Array.isArray(section.body) ? section.body : []), ''] }
          : section
      ),
    }));
  };

  const removeParagraph = (sectionIndex, paragraphIndex) => {
    setPageForm((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section, index) => {
        if (index !== sectionIndex) return section;
        const body = Array.isArray(section.body) ? section.body : [''];
        return { ...section, body: body.filter((_, bodyIndex) => bodyIndex !== paragraphIndex) };
      }),
    }));
  };

  const savePage = async (publishAfterSave = false) => {
    if (!canUpdate || !selectedSlug) return;
    setIsSavingPage(true);
    try {
      const sections = serializeSections(pageForm.sections);
      if (publishAfterSave && sections.length === 0) {
        throw new Error('Add at least one content section before publishing.');
      }

      const payload = {
        title: pageForm.title,
        lastUpdatedLabel: pageForm.lastUpdatedLabel,
        intro: pageForm.intro,
        status: publishAfterSave ? 'PUBLISHED' : pageForm.status,
        contentJson: JSON.stringify(sections),
      };
      const saved = await updateWebsiteCmsPage(token, selectedSlug, payload);
      const savedPage = unwrap(saved, null);
      if (publishAfterSave) {
        const published = await publishWebsiteCmsPage(token, selectedSlug);
        setPageForm(normalizePageForm(unwrap(published, savedPage)));
      } else {
        setPageForm(normalizePageForm(savedPage));
      }
      setMessage({
        type: 'success',
        text: publishAfterSave ? 'Website CMS page published.' : 'Website CMS page saved.',
      });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save CMS page.' });
    } finally {
      setIsSavingPage(false);
    }
  };

  const selectSocialLink = (link) => {
    setSocialForm({
      id: link.id,
      platformKey: link.platformKey || '',
      label: link.label || '',
      url: link.url || '',
      sortOrder: link.sortOrder ?? 0,
      active: link.active !== false,
    });
  };

  const saveSocial = async () => {
    if (!canUpdate) return;
    if (!socialForm.platformKey.trim() || !socialForm.label.trim()) {
      setMessage({ type: 'error', text: 'Platform key and label are required.' });
      return;
    }
    setIsSavingSocial(true);
    try {
      await saveWebsiteSocialLink(token, {
        platformKey: socialForm.platformKey,
        label: socialForm.label,
        url: socialForm.url,
        sortOrder: Number(socialForm.sortOrder) || 0,
        active: Boolean(socialForm.active),
      });
      const response = await fetchWebsiteSocialLinks(token);
      setSocialLinks(unwrap(response, []));
      setSocialForm(emptySocialForm);
      setMessage({ type: 'success', text: 'Website social link saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save social link.' });
    } finally {
      setIsSavingSocial(false);
    }
  };

  const removeSocial = async () => {
    if (!canUpdate || !socialForm.id) return;
    setIsSavingSocial(true);
    try {
      await deleteWebsiteSocialLink(token, socialForm.id);
      const response = await fetchWebsiteSocialLinks(token);
      setSocialLinks(unwrap(response, []));
      setSocialForm(emptySocialForm);
      setMessage({ type: 'success', text: 'Website social link deleted.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete social link.' });
    } finally {
      setIsSavingSocial(false);
    }
  };

  return (
    <div className="website-cms-page users-page">
      <Banner message={message} />

      <div className="website-cms-toolbar panel card">
        <div>
          <p className="eyebrow">Deal360 Website CMS</p>
          <h2>Website CMS</h2>
          <p>Manage legal page content and footer platform links without touching code.</p>
        </div>
        <div className="website-cms-toolbar-actions">
          <span>{pages.length} pages</span>
          <button type="button" className="secondary-action" onClick={loadData} disabled={isLoading}>
            Refresh
          </button>
        </div>
      </div>

      {!canUpdate ? (
        <div className="app-visibility-note">You can view this page, but update permission is required to save changes.</div>
      ) : null}

      {isLoading ? (
        <div className="empty-state">Loading website CMS...</div>
      ) : (
        <>
          <div className="website-cms-grid">
            <aside className="panel card website-cms-sidebar">
              <div className="panel-split">
                <div>
                  <h3 className="panel-subheading">Legal Pages</h3>
                  <p className="panel-subtitle">Published pages replace the website fallback content.</p>
                </div>
              </div>
              <div className="website-cms-page-list">
                {pages.map((page) => (
                  <button
                    type="button"
                    key={page.slug}
                    className={page.slug === selectedSlug ? 'active' : ''}
                    onClick={() => setSelectedSlug(page.slug)}
                  >
                    <span>{page.title}</span>
                    <small>{page.status}</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="panel card website-cms-editor">
              <div className="panel-split">
                <div>
                  <h3 className="panel-subheading">{selectedPage?.title || 'CMS Page'}</h3>
                  <p className="panel-subtitle">Slug: {selectedSlug || '-'}</p>
                </div>
                <span className={`status-pill ${pageForm.status === 'PUBLISHED' ? 'approved' : 'pending-review'}`}>
                  {pageForm.status}
                </span>
              </div>

              <div className="website-cms-form-grid">
                <label>
                  <span>Page Title</span>
                  <input
                    value={pageForm.title}
                    disabled={!canUpdate}
                    onChange={(event) => updatePageField('title', event.target.value)}
                  />
                </label>
                <label>
                  <span>Last Updated Label</span>
                  <input
                    value={pageForm.lastUpdatedLabel}
                    disabled={!canUpdate}
                    placeholder="May 29, 2026"
                    onChange={(event) => updatePageField('lastUpdatedLabel', event.target.value)}
                  />
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={pageForm.status}
                    disabled={!canUpdate}
                    onChange={(event) => updatePageField('status', event.target.value)}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                  </select>
                </label>
              </div>

              <label className="website-cms-field">
                <span>Intro</span>
                <textarea
                  rows={3}
                  value={pageForm.intro}
                  disabled={!canUpdate}
                  onChange={(event) => updatePageField('intro', event.target.value)}
                />
              </label>

              <div className="website-cms-content-head">
                <div>
                  <h4>Page Sections</h4>
                  <p>Each section becomes one heading with paragraphs on the public legal page.</p>
                </div>
                <button type="button" className="secondary-action" onClick={addSection} disabled={!canUpdate}>
                  Add Section
                </button>
              </div>

              <div className="website-cms-sections">
                {(pageForm.sections || []).length === 0 ? (
                  <div className="website-cms-empty">
                    No sections added yet. Add a section before publishing this page.
                  </div>
                ) : null}
                {(pageForm.sections || []).map((section, sectionIndex) => (
                  <div className="website-cms-section-card" key={`section-${sectionIndex}`}>
                    <div className="website-cms-section-top">
                      <label>
                        <span>Section {sectionIndex + 1} Heading</span>
                        <input
                          value={section.heading}
                          disabled={!canUpdate}
                          placeholder="Example: 1. Lead Distribution"
                          onChange={(event) => updateSection(sectionIndex, 'heading', event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary-action danger compact"
                        onClick={() => removeSection(sectionIndex)}
                        disabled={!canUpdate}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="website-cms-paragraphs">
                      {(section.body || ['']).map((paragraph, paragraphIndex) => (
                        <div className="website-cms-paragraph-row" key={`paragraph-${sectionIndex}-${paragraphIndex}`}>
                          <label>
                            <span>Paragraph {paragraphIndex + 1}</span>
                            <textarea
                              rows={3}
                              value={paragraph}
                              disabled={!canUpdate}
                              placeholder="Write clear website content here..."
                              onChange={(event) => updateParagraph(sectionIndex, paragraphIndex, event.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            className="secondary-action compact"
                            onClick={() => removeParagraph(sectionIndex, paragraphIndex)}
                            disabled={!canUpdate || (section.body || []).length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="secondary-action compact add-paragraph"
                      onClick={() => addParagraph(sectionIndex)}
                      disabled={!canUpdate}
                    >
                      Add Paragraph
                    </button>
                  </div>
                ))}
              </div>

              <div className="website-cms-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={loadPage}
                  disabled={isSavingPage}
                >
                  Reset Page
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => savePage(false)}
                  disabled={!canUpdate || isSavingPage}
                >
                  {isSavingPage ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => savePage(true)}
                  disabled={!canUpdate || isSavingPage}
                >
                  Publish
                </button>
              </div>
            </section>
          </div>

          <section className="panel card website-cms-social">
            <div className="panel-split">
              <div>
                <h3 className="panel-subheading">Footer Social Links</h3>
                <p className="panel-subtitle">Set the online platform links used by the website footer.</p>
              </div>
            </div>

            <div className="website-cms-social-grid">
              <div className="table-shell">
                <table className="admin-table users-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>URL</th>
                      <th>Order</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {socialLinks.map((link) => (
                      <tr key={link.id || link.platformKey} onClick={() => selectSocialLink(link)}>
                        <td>
                          <strong>{link.label}</strong>
                          <small style={{ display: 'block', color: 'var(--muted)' }}>{link.platformKey}</small>
                        </td>
                        <td style={{ wordBreak: 'break-all' }}>{link.url || '-'}</td>
                        <td>{link.sortOrder}</td>
                        <td>
                          <span className={`status-pill ${link.active ? 'approved' : 'pending'}`}>
                            {link.active ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="website-cms-social-form">
                <label>
                  <span>Platform Key</span>
                  <input
                    value={socialForm.platformKey}
                    disabled={!canUpdate}
                    placeholder="instagram"
                    onChange={(event) => setSocialForm((prev) => ({ ...prev, platformKey: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Label</span>
                  <input
                    value={socialForm.label}
                    disabled={!canUpdate}
                    placeholder="Instagram"
                    onChange={(event) => setSocialForm((prev) => ({ ...prev, label: event.target.value }))}
                  />
                </label>
                <label>
                  <span>URL</span>
                  <input
                    value={socialForm.url}
                    disabled={!canUpdate}
                    placeholder="https://www.instagram.com/deal360"
                    onChange={(event) => setSocialForm((prev) => ({ ...prev, url: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Sort Order</span>
                  <input
                    type="number"
                    value={socialForm.sortOrder}
                    disabled={!canUpdate}
                    onChange={(event) => setSocialForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  />
                </label>
                <label className="website-cms-checkbox">
                  <input
                    type="checkbox"
                    checked={socialForm.active}
                    disabled={!canUpdate}
                    onChange={(event) => setSocialForm((prev) => ({ ...prev, active: event.target.checked }))}
                  />
                  <span>Show in website footer</span>
                </label>
                <div className="website-cms-actions">
                  <button type="button" className="secondary-action" onClick={() => setSocialForm(emptySocialForm)}>
                    New
                  </button>
                  {socialForm.id ? (
                    <button
                      type="button"
                      className="secondary-action danger"
                      onClick={removeSocial}
                      disabled={!canUpdate || isSavingSocial}
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="primary-action"
                    onClick={saveSocial}
                    disabled={!canUpdate || isSavingSocial}
                  >
                    {isSavingSocial ? 'Saving...' : 'Save Link'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <style>{`
        .website-cms-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          margin-bottom: 18px;
          padding: 18px 20px !important;
          border-left: 4px solid var(--accent);
        }
        .website-cms-toolbar h2 {
          margin: 0 0 6px;
          font-size: 22px;
          color: var(--ink);
        }
        .website-cms-toolbar p {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
        }
        .website-cms-toolbar .eyebrow {
          margin: 0 0 4px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
          color: var(--accent);
        }
        .website-cms-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .website-cms-toolbar-actions span {
          background: #f8fafc;
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
          padding: 8px 12px;
        }
        .website-cms-toolbar .secondary-action,
        .website-cms-content-head .secondary-action,
        .website-cms-actions .secondary-action,
        .website-cms-actions .primary-action,
        .website-cms-social-form .primary-action,
        .website-cms-social-form .secondary-action {
          width: auto;
          min-width: 0;
          flex: 0 0 auto;
        }
        .website-cms-grid {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        .website-cms-sidebar,
        .website-cms-editor,
        .website-cms-social {
          padding: 18px 20px !important;
        }
        .website-cms-page-list {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }
        .website-cms-page-list button {
          border: 1px solid var(--line);
          background: #fff;
          border-radius: 10px;
          padding: 12px;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }
        .website-cms-page-list button.active {
          border-color: var(--accent);
          background: rgba(99, 69, 237, 0.08);
          color: var(--accent-strong);
        }
        .website-cms-page-list span {
          font-weight: 700;
        }
        .website-cms-page-list small {
          font-size: 10px;
          font-weight: 800;
          color: var(--muted);
        }
        .website-cms-page-list button.active small {
          color: var(--accent-strong);
        }
        .website-cms-form-grid,
        .website-cms-social-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .website-cms-social-grid {
          grid-template-columns: minmax(0, 1fr) 360px;
          align-items: start;
        }
        .website-cms-editor label,
        .website-cms-social-form label {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: var(--ink);
        }
        .website-cms-editor input,
        .website-cms-editor select,
        .website-cms-editor textarea,
        .website-cms-social-form input {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 12px;
          width: 100%;
          outline: none;
          background: #fff;
          color: var(--ink);
        }
        .website-cms-editor textarea,
        .website-cms-social-form textarea {
          resize: vertical;
          line-height: 1.55;
        }
        .website-cms-field {
          margin-top: 14px;
        }
        .website-cms-content-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--line);
        }
        .website-cms-content-head h4 {
          margin: 0 0 4px;
          font-size: 16px;
          color: var(--ink);
        }
        .website-cms-content-head p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }
        .website-cms-sections {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }
        .website-cms-empty {
          border: 1px dashed var(--line);
          border-radius: 12px;
          padding: 18px;
          color: var(--muted);
          background: #fbfafc;
          font-weight: 700;
        }
        .website-cms-section-card {
          border: 1px solid var(--line);
          background: #fbfafc;
          border-radius: 12px;
          padding: 14px;
          display: grid;
          gap: 12px;
        }
        .website-cms-section-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: end;
        }
        .website-cms-paragraphs {
          display: grid;
          gap: 10px;
        }
        .website-cms-paragraph-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: end;
        }
        .secondary-action.compact,
        .primary-action.compact {
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 12px;
        }
        .add-paragraph {
          justify-self: start;
        }
        .website-cms-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .website-cms-social {
          margin-top: 18px;
        }
        .website-cms-social-form {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px;
          display: grid;
          gap: 12px;
          background: #fbfafc;
        }
        .website-cms-checkbox {
          display: flex !important;
          grid-template-columns: auto 1fr;
          align-items: center;
          flex-direction: row;
        }
        .website-cms-checkbox input {
          width: auto;
        }
        .secondary-action.danger {
          color: #b91c1c;
          border-color: rgba(185, 28, 28, 0.25);
        }
        @media (max-width: 1100px) {
          .website-cms-grid,
          .website-cms-social-grid {
            grid-template-columns: 1fr;
          }
          .website-cms-form-grid {
            grid-template-columns: 1fr;
          }
          .website-cms-toolbar,
          .website-cms-content-head,
          .website-cms-section-top,
          .website-cms-paragraph-row {
            grid-template-columns: 1fr;
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}

export default WebsiteCmsPage;
