// Generic field renderer driven by a block's schema (see headerBlockSchemas.js and screenBlockSchemas.js)
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
        <div key={field.name} className={`studio-checkbox-field-group${spanClass}`}>
          <span className="studio-checkbox-group-title">{field.label}</span>
          {options.length ? (
            <div className="studio-checkbox-items-list">
              {options.map((option) => {
                const checked = currentSet.has(String(option.value).trim().toLowerCase());
                return (
                  <label key={option.value} className="studio-checkbox-row-item">
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
                    <span className="studio-checkbox-text">{option.label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="field-help">No options available.</p>
          )}
        </div>
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

    if (field.type === 'industry-checkbox-grid' || field.type === 'industry-multi-select') {
      const selectedIds = Array.isArray(values?.[field.name]) ? values[field.name] : [];
      return (
        <div key={field.name} className={`studio-checkbox-field-group${spanClass}`}>
          <span className="studio-checkbox-group-title">{field.label}</span>
          {context?.industries && context.industries.length ? (
            <div className="studio-checkbox-items-list checkbox-grid">
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
                const isChecked = selectedIds.includes(id);
                return (
                  <label key={id} className="studio-checkbox-row-item checkbox-row">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(id)) {
                          next.delete(id);
                        } else {
                          next.add(id);
                        }
                        onChange(field.name, Array.from(next));
                      }}
                    />
                    <span className="studio-checkbox-text">
                      {label} <small style={{ color: '#94a3b8' }}>({id})</small>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="field-help">No industries found yet.</p>
          )}
        </div>
      );
    }

    if (field.type === 'industry-creator') {
      return (
        <label key={field.name || 'industry-creator'} className={`field${spanClass}`}>
          <span>{field.label || 'Add new industry pill'}</span>
          <div className="inline-row">
            <input
              type="text"
              placeholder="e.g. Pharmacy, Pet Care"
              value={context?.newIndustryName || ''}
              onChange={(e) => context?.setNewIndustryName?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  context?.handleCreateIndustry?.();
                }
              }}
            />
            <button
              type="button"
              className="ghost-btn small"
              onClick={context?.handleCreateIndustry}
              disabled={!context?.newIndustryName?.trim() || context?.isCreatingIndustry}
            >
              {context?.isCreatingIndustry ? 'Creating...' : '+ Add'}
            </button>
          </div>
          <p className="field-help">Creates an active industry and adds it to the list of pills immediately.</p>
        </label>
      );
    }

    return null;
  });
}