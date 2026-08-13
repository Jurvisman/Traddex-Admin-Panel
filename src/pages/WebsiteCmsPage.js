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

const DEFAULT_FALLBACK_POLICIES = {
  terms: {
    title: 'Terms & Conditions',
    updated: 'May 29, 2026',
    intro: 'Welcome to Deal360. Deal360 is built to help Indian businesses grow with fair leads, digital presence, better order records, payment options, delivery support and Mini ERP tools. These Terms explain how Deal360 works, what support we provide and what responsibilities users should follow while using our website, application, merchant admin panel, lead engine, website builder, payment tools, delivery integrations and Mini ERP features.',
    sections: [
      { heading: '1. Acceptance Of Terms', body: ['By using Deal360, creating an account, submitting a lead, listing a product or service, accepting an offer, making payment, using merchant admin or accessing any Deal360 service, you agree to these Terms.', 'If you are using Deal360 on behalf of a business, you confirm that you are authorized to represent that business.'] },
      { heading: '2. What Deal360 Provides', body: ['Deal360 provides technology tools for buyer and seller discovery, lead and inquiry management, product and service listing, offer and negotiation workflow, purchase order and sales order records, payment options, delivery partner integrations, business website setup, merchant admin panel and Mini ERP features.', 'Deal360 works as a platform and support system. The actual commercial transaction remains between the buyer and seller.'] },
      { heading: '3. Fair Lead Distribution', body: ['Deal360 uses smart matching to help genuine buyer requirements reach relevant businesses. Leads may be matched based on buyer search or intent, product or service relevance, category, location, service area, business profile quality, activity, subscription plan, cooldown bucket logic and rules designed to reduce spam.', 'Higher subscription plans may receive higher limits, better visibility or priority as mentioned in the plan. However, Deal360\'s goal is to keep opportunity distribution fair and useful for all eligible businesses.', 'A lead is an opportunity to connect. It is not a guaranteed sale, confirmed order or assured revenue. If a business receives fake, irrelevant or abusive leads, they can report it to Deal360 support for review.'] },
      { heading: '4. Buyer And Seller Responsibilities', body: ['Buyers and sellers are expected to act honestly and professionally. Users are responsible for correct business information, genuine product or service details, price, quantity, MOQ, GST or tax details, payment terms, credit terms, dispatch commitments, delivery expectations, returns and communication with the other party.', 'Deal360 may provide records and support tools, but users must verify commercial terms before confirming any deal.'] },
      { heading: '5. Product And Service Listings', body: ['Merchants must ensure that listed products or services are legal, genuine, accurately described and available as shown.', 'Deal360 may review, hide, reject or remove listings that are misleading, illegal, unsafe, counterfeit, abusive or against platform rules.'] },
      { heading: '6. Product Visibility And Mini ERP', body: ['Deal360 may allow products to be managed under visibility states such as ERP Only, Website Visible, App Listing Requested, App Approved or App Rejected.', 'A product created in Mini ERP does not automatically become visible in the Deal360 marketplace. The merchant stays in control of where the product should appear, and app marketplace listing may require request and approval.'] },
      { heading: '7. Payments', body: ['Deal360 may provide online payment options through trusted payment partners to make transactions easier to track. Online payment is a convenience feature and may not be compulsory unless a specific plan, feature or transaction clearly requires it.', 'Buyer and seller may mutually choose offline settlement through UPI, bank transfer, cash or another agreed method. In such cases, both parties should keep proper proof and confirm terms clearly.'] },
      { heading: '8. Order Lifecycle', body: ['Deal360 provides a structured order flow for offer acceptance, purchase order, sales order, proforma invoice, payment proof, payment confirmation, dispatch, delivery, return request and dispute request.', 'These tools are designed to reduce confusion and improve trust. Actual product quality, dispatch, delivery handover, payment confirmation and return handling depend on the buyer, seller and delivery partner involved.'] },
      { heading: '9. Delivery And Logistics', body: ['Deal360 may connect users with third-party logistics partners such as Borzo, Shiprocket or other providers. Delivery charges, serviceability, pickup time, delivery estimate, tracking status and final delivery performance are provided by the logistics partner.'] },
      { heading: '10. Website Builder And Business Websites', body: ['Deal360 may provide business website setup, templates, subdomains, catalog pages, banners, website orders and related tools.', 'Merchants are responsible for their website content, logo, images, product details, offers, pricing, business claims and legal compliance.'] },
      { heading: '11. Mini ERP And Reports', body: ['Deal360 Mini ERP helps merchants manage products, stock, purchases, sales, bills, contacts and reports. These tools are designed for better business organization.'] },
      { heading: '12. Subscriptions, Plans And Feature Access', body: ['Deal360 may offer free, paid or promotional plans. Plan features, limits, lead access, website access, product limits, visibility priority, support level and pricing may vary by plan.'] },
      { heading: '13. Refunds And Cancellations', body: ['Refunds, cancellations, duplicate payments, failed payments, subscription charges, website setup fees, ad charges and service charges will be handled as per Deal360\'s Refund & Cancellation Policy.'] },
      { heading: '14. Advertisement And Promotions', body: ['Deal360 may provide advertisement, banner or paid visibility features. Approval or purchase of promotional placement does not guarantee impressions, clicks, leads, orders, revenue or profit.'] },
      { heading: '15. Prohibited Use', body: ['Users must not upload, post, or list any content containing nudity, sexual or adult material, graphic violence, hate speech, counterfeit goods, illegal products, fake leads, spam, fraud, false payment proof, abusive communication, stolen content, misleading claims, unauthorized data collection, security attacks, or anything that violates applicable law.', 'Deal360 reserves the absolute right to reject, block, suspend, or terminate any product, advertisement, image, website, or user account immediately if such prohibited content or misuse is detected by our automated AI gatekeeper or moderation team.'] },
      { heading: '16. Support And Issue Resolution', body: ['Deal360 is built to support fair and transparent business. If a problem occurs, users can contact support. Our team may review available platform records such as leads, offers, order steps, payment proofs, dispatch proofs and delivery updates.'] },
      { heading: '17. Third-Party Services', body: ['Deal360 may use or connect with third-party services for payments, delivery, maps, SMS or OTP, cloud storage, analytics, hosting or other platform functions.'] },
      { heading: '18. Communication Consent', body: ['By using Deal360, users agree to receive service-related communication through phone, SMS, WhatsApp, email, app notifications or other channels for OTP, onboarding, support, leads, orders, payments, delivery, subscription and platform updates.'] },
      { heading: '19. Data And Privacy', body: ['Use of personal and business information is explained in our Privacy Policy. By using Deal360, users agree to the collection and processing of information required to operate the platform and provide requested services.'] },
      { heading: '20. Platform Availability', body: ['Deal360 works to keep the platform reliable. Temporary downtime may happen due to maintenance, updates, network issues, hosting issues or third-party service failures.'] },
      { heading: '21. Limitation Of Liability', body: ['Deal360 provides tools, support and platform records to help users do business more transparently. However, Deal360 cannot guarantee business outcomes such as lead conversion, order confirmation, profit, payment collection, delivery success or dispute-free transactions.'] },
      { heading: '22. Grievance And Support', body: ['Grievance Officer: Deal360 Grievance Team', 'Email: support.deal360@gmail.com', 'Location: Ahmedabad, Gujarat'] },
      { heading: '23. Governing Law', body: ['These Terms are governed by the laws of India. Courts located in Ahmedabad, Gujarat will have jurisdiction, subject to applicable law.'] }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'May 29, 2026',
    intro: 'Deal360 respects your privacy and business trust. This Privacy Policy explains how we collect, use, share, store and protect information when you use our website, mobile application, merchant admin panel, lead engine, website builder, marketplace tools, payment features, delivery integrations and Mini ERP services.',
    sections: [
      { heading: '1. Information We Collect', body: ['We may collect information such as name, mobile number, email address, city, address, business name, business type, GST, PAN, license and KYC details where required, product and service details, lead and inquiry activity, offers, negotiation and order records, payment proof, payment status, dispatch proof, delivery records, website content, banners, business media, inventory, bill and report data, device information, IP address, location information where required, support conversations and feedback.'] },
      { heading: '2. Why We Collect Information', body: ['We use information to create and manage accounts, verify OTP login, manage business profiles, improve lead matching, show relevant products and services, process inquiries, offers and orders, provide website builder features, support payment and delivery workflows, manage merchant admin and Mini ERP tools, provide support and issue resolution, prevent fraud, improve safety and comply with legal requirements.'] },
      { heading: '3. Lead Matching And Personalization', body: ['Deal360 may use search intent, category interest, product or service data, location, business profile, subscription plan and platform activity to match leads with relevant businesses.'] },
      { heading: '4. Sharing Of Information', body: ['We may share necessary information with buyers and sellers involved in a transaction, payment gateway providers, logistics partners, OTP, SMS, email or WhatsApp providers, cloud hosting and storage providers, analytics and security tools, support and onboarding teams, and legal, regulatory or government authorities where required.'] },
      { heading: '5. Payment Information', body: ['Payments may be processed by third-party payment gateways. Deal360 does not store full card numbers, UPI PINs, net banking passwords or sensitive payment credentials.'] },
      { heading: '6. Delivery Information', body: ['If a user chooses delivery support, order and address details may be shared with delivery partners to check serviceability, calculate charges, arrange pickup, generate tracking and complete delivery.'] },
      { heading: '7. Documents And Uploads', body: ['Business documents, KYC files, product images, banners, payment proofs, dispatch proofs, PODs and return proofs may be stored securely on Deal360 systems or trusted cloud storage providers.'] },
      { heading: '8. Communication', body: ['We may contact users through phone, SMS, WhatsApp, email, app notifications or other channels for OTP and login, onboarding, lead alerts, order updates, payment updates, delivery updates, support, subscription reminders, platform announcements and promotional offers where permitted.'] },
      { heading: '9. Data Security', body: ['We use reasonable technical and organizational measures to protect information, including secure transmission, controlled access and trusted infrastructure.'] },
      { heading: '10. Data Retention', body: ['We retain information as long as needed for account operation, transaction records, legal compliance, tax and accounting purposes, dispute support, fraud prevention, audit, security and platform improvement.'] },
      { heading: '11. User Rights', body: ['Subject to applicable law, users may request access to certain personal data, correction of inaccurate information, update of business details, withdrawal of consent where applicable, deletion of data where legally possible and grievance redressal.'] },
      { heading: '12. Consent', body: ['By using Deal360, creating an account, submitting details, posting requirements, listing products, accepting offers or using platform features, users consent to the collection and processing of information as described in this Privacy Policy.'] },
      { heading: '13. Children', body: ['Deal360 is intended for business and commercial users. Users below the legally permitted age should not use Deal360 without proper guardian consent where applicable.'] },
      { heading: '14. Third-Party Links And Services', body: ['Deal360 may include links or integrations with third-party services such as payment gateways, delivery partners, maps or external websites.'] },
      { heading: '15. Updates To This Policy', body: ['We may update this Privacy Policy from time to time. Updated versions will be posted on our website, app or merchant panel.'] },
      { heading: '16. Contact And Grievance', body: ['Grievance Officer: Deal360 Grievance Team', 'Email: support.deal360@gmail.com', 'Location: Ahmedabad, Gujarat'] }
    ]
  },
  'refund-policy': {
    title: 'Refund & Cancellation Policy',
    updated: 'May 29, 2026',
    intro: 'Deal360 aims to keep pricing, subscriptions and payment-related support transparent for businesses.',
    sections: [
      { heading: '1. Subscription Payments', body: ['Subscription fees are charged for access to Deal360 features as per the selected plan. Once a subscription period has started, subscription charges may be non-refundable except where required by law or approved by Deal360 in special cases.'] },
      { heading: '2. Duplicate Or Failed Payments', body: ['If a user is charged twice or payment is deducted but service is not activated, the user should contact Deal360 support with payment proof.'] },
      { heading: '3. Website Setup Fees', body: ['Website setup or template fees may be non-refundable once setup work, template allocation, subdomain reservation or website configuration has started.'] },
      { heading: '4. Advertisement Charges', body: ['Ad or promotion charges may be non-refundable once the campaign is submitted, reviewed, scheduled, approved or made live.'] },
      { heading: '5. Delivery Charges', body: ['Delivery charges are handled as per the logistics partner\'s policy. Once pickup is assigned or delivery is initiated, delivery charges may not be refundable.'] },
      { heading: '6. Refund Timeline', body: ['Approved refunds may take 7 to 10 business days or as per payment gateway and bank timelines.'] },
      { heading: '7. Cancellation', body: ['Users may cancel renewal or stop using paid features by contacting support or using available account options.'] }
    ]
  },
  'lead-distribution-policy': {
    title: 'Lead Distribution Policy',
    updated: 'May 29, 2026',
    intro: 'Deal360 is designed to provide fair and useful business opportunities while reducing spam and low-quality lead flow.',
    sections: [
      { heading: '1. How Leads Are Generated', body: ['Leads may be generated from buyer search, buyer requirement posting, product or service interest, business profile discovery, website inquiry, category or location-based matching and marketplace activity.'] },
      { heading: '2. How Leads Are Matched', body: ['Deal360 may use category relevance, location relevance, product or service match, business activity, profile quality, subscription plan, cooldown bucket logic, lead limits, system availability and anti-spam checks to match leads with businesses.'] }
    ]
  },
  'shipping-delivery-policy': {
    title: 'Shipping & Delivery Policy',
    updated: 'May 29, 2026',
    intro: 'Deal360 provides logistics partner integrations to help merchants and buyers handle orders efficiently.',
    sections: [
      { heading: '1. Serviceability', body: ['Delivery serviceability depends on pickup and delivery pincodes, package size, weight and partner coverage.'] },
      { heading: '2. Dispatch And Handover', body: ['Merchants are responsible for timely packaging, accurate details and handing over items to the assigned delivery executive.'] }
    ]
  }
};

const normalizePageForm = (page, currentSlug = '') => {
  const targetSlug = page?.slug || currentSlug;
  const parsedSections = parseContentSections(page?.contentJson || '[]');
  const fallback = DEFAULT_FALLBACK_POLICIES[targetSlug];
  
  const finalSections = parsedSections.length > 0 ? parsedSections : (fallback?.sections || []);
  const finalIntro = page?.intro || fallback?.intro || '';
  const finalTitle = page?.title || fallback?.title || '';

  return {
    slug: targetSlug,
    title: finalTitle,
    lastUpdatedLabel: page?.lastUpdatedLabel || fallback?.updated || 'May 29, 2026',
    intro: finalIntro,
    status: page?.status || 'DRAFT',
    sections: finalSections,
  };
};

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
      setPageForm(normalizePageForm(unwrap(response, null), selectedSlug));
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
