// Schema-driven properties for the 3 header blocks. Each block lists only the fields it
// actually needs — a shared renderer (SchemaFieldsRenderer.js) turns this data into the
// same form JSX that used to be hand-written per block type in AppConfigPage.js.
//
// Field shape: { name, label, type, span?, placeholder? }
// Supported types: 'text', 'csv-text', 'industry-checkbox-grid', 'industry-creator'
export const HEADER_BLOCK_SCHEMAS = {
  addressHeader: {
    label: 'Address Header',
    fields: [],
  },
  searchBar: {
    label: 'Search Bar',
    fields: [
      { name: 'placeholder', label: 'Search placeholder', type: 'text', span: true, placeholder: 'Search "yoga"' },
    ],
  },
  horizontalPills: {
    label: 'Horizontal Pills',
    fields: [
      { name: 'industryIds', label: 'Select industries', type: 'industry-checkbox-grid', span: true },
      {
        name: 'industryIds',
        label: 'Industry IDs (comma separated)',
        type: 'csv-text',
        span: true,
        placeholder: 'grocery, electronics',
      },
      { name: '__newIndustry', label: 'Add new industry pill', type: 'industry-creator', span: true },
    ],
  },
};
