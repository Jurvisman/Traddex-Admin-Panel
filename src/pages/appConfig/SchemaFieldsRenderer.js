// Generic field renderer driven by a block's schema (see headerBlockSchemas.js and future
// screen-block schema files) instead of hand-written JSX per block type. Adding a field to a
// block now means adding one line to its schema, not writing a new <label>/<input> block here.
export function SchemaFieldsRenderer({ fields, values, onChange, context }) {
  if (!Array.isArray(fields) || !fields.length) return null;

  return fields.map((field) => {
    const spanClass = field.span ? ' field-span' : '';

    if (field.type === 'text') {
      return (
        <label key={field.name} className={`field${spanClass}`}>
          <span>{field.label}</span>
          <input
            type="text"
            value={values?.[field.name] || ''}
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder={field.placeholder}
          />
        </label>
      );
    }

    if (field.type === 'checkbox-list') {
      // Value is stored as a CSV string (matches how it's already saved/parsed at save-time),
      // just presented as checkboxes instead of a free-text box. Options are either fixed
      // (field.options) or resolved dynamically from context (field.optionsFrom: 'industries').
      const options =
        field.options ||
        (field.optionsFrom === 'industries'
          ? (context.industries || [])
              .map((industry) => ({
                value: context.resolveIndustryId(industry),
                label: context.resolveIndustryLabel(industry),
              }))
              .filter((option) => option.value)
          : []);
      const current = context.parseCsvList(values?.[field.name] || '');
      const currentSet = new Set(current.map((value) => String(value).trim().toLowerCase()));
      return (
        <label key={field.name} className={`field${spanClass}`}>
          <span>{field.label}</span>
          {options.length ? (
            <div className="checkbox-grid">
              {options.map((option) => {
                const checked = currentSet.has(String(option.value).trim().toLowerCase());
                return (
                  <label key={option.value} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? current.filter(
                              (value) => String(value).trim().toLowerCase() !== String(option.value).trim().toLowerCase()
                            )
                          : [...current, option.value];
                        onChange(field.name, context.formatCsvList(next));
                      }}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="field-help">No options available.</p>
          )}
        </label>
      );
    }

    if (field.type === 'select') {
      return (
        <label key={field.name} className={`field${spanClass}`}>
          <span>{field.label}</span>
          <select
            value={values?.[field.name] || field.default || ''}
            onChange={(event) => onChange(field.name, event.target.value)}
          >
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.helpText ? <p className="field-help">{field.helpText}</p> : null}
        </label>
      );
    }

    if (field.type === 'csv-text') {
      return (
        <label key={field.name} className={`field${spanClass}`}>
          <span>{field.label}</span>
          <input
            type="text"
            value={(values?.[field.name] || []).join(', ')}
            onChange={(event) => onChange(field.name, context.parseCsvList(event.target.value))}
            placeholder={field.placeholder}
          />
        </label>
      );
    }

    if (field.type === 'industry-checkbox-grid') {
      const current = Array.isArray(values?.[field.name]) ? values[field.name] : [];
      return (
        <label key={field.name} className={`field${spanClass}`}>
          <span>{field.label}</span>
          {context.industries?.length ? (
            <div className="checkbox-grid">
              {context.industries.map((industry) => {
                const id = context.normalizeCollectionId(
                  industry?.id ??
                    industry?._id ??
                    industry?.slug ??
                    industry?.industryId ??
                    industry?.industry_id ??
                    industry?.name
                );
                if (!id) return null;
                const label = industry?.name || industry?.label || industry?.title || `Industry ${id}`;
                const checked = current.includes(id);
                return (
                  <label key={id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(current);
                        if (next.has(id)) {
                          next.delete(id);
                        } else {
                          next.add(id);
                        }
                        onChange(field.name, Array.from(next));
                      }}
                    />
                    {label} <span className="muted">({id})</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="field-help">No industries found yet.</p>
          )}
        </label>
      );
    }

    if (field.type === 'industry-creator') {
      return (
        <label key={field.name} className={`field${spanClass}`}>
          <span>{field.label}</span>
          <div className="inline-row">
            <input
              type="text"
              value={context.newIndustryName}
              onChange={(event) => context.setNewIndustryName(event.target.value)}
              placeholder="e.g., Electronics"
            />
            <button
              type="button"
              className="ghost-btn small"
              onClick={context.handleCreateIndustry}
              disabled={context.isCreatingIndustry}
            >
              {context.isCreatingIndustry ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="field-help">Creates a new industry and syncs a page for it.</p>
        </label>
      );
    }

    return null;
  });
}
