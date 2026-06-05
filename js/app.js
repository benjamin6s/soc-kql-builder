const elements = {
  queryForm: document.getElementById("query-form"),
  presetSelect: document.getElementById("preset-select"),
  schemaSearchInput: document.getElementById("schema-search-input"),
  schemaSearchResults: document.getElementById("schema-search-results"),
  categorySelect: document.getElementById("category-select"),
  tableSelect: document.getElementById("table-select"),
  timeRangeSelect: document.getElementById("time-range-select"),
  templateNameInput: document.getElementById("template-name-input"),
  templateSelect: document.getElementById("template-select"),
  saveTemplateButton: document.getElementById("save-template-button"),
  loadTemplateButton: document.getElementById("load-template-button"),
  deleteTemplateButton: document.getElementById("delete-template-button"),
  exportTemplatesButton: document.getElementById("export-templates-button"),
  importTemplatesInput: document.getElementById("import-templates-input"),
  templateStatus: document.getElementById("template-status"),
  filterList: document.getElementById("filter-list"),
  addFilterButton: document.getElementById("add-filter-button"),
  columnCheckboxes: document.getElementById("column-checkboxes"),
  sortColumnSelect: document.getElementById("sort-column-select"),
  sortDirectionSelect: document.getElementById("sort-direction-select"),
  limitInput: document.getElementById("limit-input"),
  kqlOutput: document.getElementById("kql-output"),
  validationWarnings: document.getElementById("validation-warnings"),
  queryExplanation: document.getElementById("query-explanation"),
  copyButton: document.getElementById("copy-button"),
  copyStatus: document.getElementById("copy-status")
};

const TEMPLATE_STORAGE_KEY = "socKqlBuilderTemplates";
const MAX_SEARCH_RESULTS = 8;
const CATEGORY_ORDER = [
  "Microsoft Defender for Endpoint",
  "Microsoft Defender for Identity",
  "Microsoft Entra ID",
  "Microsoft Sentinel / Log Analytics"
];

// Older local templates used shorter category names. Keep them loadable after v1.7.
const LEGACY_CATEGORY_MAP = {
  Endpoint: "Microsoft Defender for Endpoint"
};

const LEGACY_IDENTITY_TABLE_CATEGORIES = {
  IdentityLogonEvents: "Microsoft Defender for Identity",
  IdentityInfo: "Microsoft Defender for Identity",
  IdentityQueryEvents: "Microsoft Defender for Identity",
  IdentityDirectoryEvents: "Microsoft Defender for Identity",
  SigninLogs: "Microsoft Entra ID",
  EntraIdSignInEvents: "Microsoft Entra ID",
  AADServicePrincipalSignInLogs: "Microsoft Entra ID",
  AADNonInteractiveUserSignInLogs: "Microsoft Entra ID",
  AuditLogs: "Microsoft Entra ID",
  AADProvisioningLogs: "Microsoft Entra ID",
  AADRiskyUsers: "Microsoft Entra ID"
};

const FILTER_OPERATORS_BY_TYPE = {
  string: [
    { value: "==", label: "==" },
    { value: "!=", label: "!=" },
    { value: "in", label: "in" },
    { value: "!in", label: "!in" },
    { value: "contains", label: "contains" },
    { value: "!contains", label: "!contains" },
    { value: "has", label: "has" },
    { value: "!has", label: "!has" },
    { value: "startswith", label: "startswith" },
    { value: "endswith", label: "endswith" },
    { value: "matches regex", label: "matches regex" }
  ],
  datetime: [
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
    { value: "between", label: "between" }
  ],
  int: [
    { value: "==", label: "==" },
    { value: "!=", label: "!=" },
    { value: "in", label: "in" },
    { value: "!in", label: "!in" },
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
    { value: "between", label: "between" }
  ],
  long: [
    { value: "==", label: "==" },
    { value: "!=", label: "!=" },
    { value: "in", label: "in" },
    { value: "!in", label: "!in" },
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
    { value: "between", label: "between" }
  ],
  real: [
    { value: "==", label: "==" },
    { value: "!=", label: "!=" },
    { value: "in", label: "in" },
    { value: "!in", label: "!in" },
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
    { value: "between", label: "between" }
  ],
  bool: [
    { value: "==", label: "==" },
    { value: "!=", label: "!=" }
  ],
  dynamic: [
    { value: "contains", label: "contains" },
    { value: "has", label: "has" },
    { value: "!has", label: "!has" },
    { value: "array_length() >", label: "array_length() >" }
  ]
};

let filterRowId = 0;
let filters = [];
let latestPlainKql = "";

function markCustomQuery() {
  elements.presetSelect.value = "";
}

// Build category and table lists from the local schema metadata.
function getCategories() {
  const categories = new Set(SOC_SCHEMAS.map((schema) => schema.category));

  return CATEGORY_ORDER.filter((category) => categories.has(category));
}

function getTablesForCategory(category) {
  return SOC_SCHEMAS.filter((schema) => schema.category === category);
}

function getSelectedSchema() {
  return SOC_SCHEMAS.find((schema) => schema.table === elements.tableSelect.value) || SOC_SCHEMAS[0];
}

function getColumnByName(schema, columnName) {
  return schema.columns.find((column) => column.name === columnName) || schema.columns[0];
}

function getExactColumnByName(schema, columnName) {
  return schema.columns.find((column) => column.name === columnName);
}

function setOptions(selectElement, options, selectedValue) {
  selectElement.innerHTML = "";

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    selectElement.appendChild(optionElement);
  });

  if (selectedValue) {
    selectElement.value = selectedValue;
  }
}

function renderCategoryOptions() {
  const categories = getCategories().map((category) => ({
    value: category,
    label: category
  }));

  setOptions(elements.categorySelect, categories, categories[0].value);
}

function renderPresetOptions() {
  const presetOptions = [
    { value: "", label: "Custom query" },
    ...SOC_PRESETS.map((preset) => ({
      value: preset.name,
      label: preset.name
    }))
  ];

  setOptions(elements.presetSelect, presetOptions, "");
}

function getSearchableText(schema) {
  const columnText = schema.columns.map((column) => `${column.name} ${column.type}`).join(" ");
  return `${schema.category} ${schema.table} ${schema.description || ""} ${columnText}`.toLowerCase();
}

function getMatchingColumns(schema, searchTerm) {
  return schema.columns.filter((column) => {
    return column.name.toLowerCase().includes(searchTerm) || column.type.toLowerCase().includes(searchTerm);
  });
}

function getSchemaSearchResults(searchTerm) {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  if (!normalizedTerm) {
    return [];
  }

  return SOC_SCHEMAS.filter((schema) => getSearchableText(schema).includes(normalizedTerm))
    .map((schema) => ({
      schema,
      matchingColumns: getMatchingColumns(schema, normalizedTerm)
    }))
    .slice(0, MAX_SEARCH_RESULTS);
}

function hideSchemaSearchResults() {
  elements.schemaSearchResults.hidden = true;
  elements.schemaSearchResults.innerHTML = "";
  elements.schemaSearchInput.setAttribute("aria-expanded", "false");
}

function createSearchResultButton(result) {
  const button = document.createElement("button");
  const matchingColumnNames = result.matchingColumns.map((column) => column.name);

  button.type = "button";
  button.className = "search-result-button";

  const title = document.createElement("span");
  title.className = "search-result-title";
  title.textContent = result.schema.table;

  const category = document.createElement("span");
  category.className = "search-result-category";
  category.textContent = result.schema.category;

  const description = document.createElement("span");
  description.className = "search-result-description";
  description.textContent = result.schema.description || "No table description available.";

  button.appendChild(title);
  button.appendChild(category);
  button.appendChild(description);

  if (matchingColumnNames.length > 0) {
    const columns = document.createElement("span");
    columns.className = "search-result-columns";
    columns.textContent = `Matching columns: ${matchingColumnNames.slice(0, 5).join(", ")}`;
    button.appendChild(columns);
  }

  button.addEventListener("click", () => {
    selectSchemaSearchResult(result.schema, matchingColumnNames[0]);
  });

  return button;
}

function renderSchemaSearchResults() {
  const results = getSchemaSearchResults(elements.schemaSearchInput.value);

  elements.schemaSearchResults.innerHTML = "";

  if (!elements.schemaSearchInput.value.trim()) {
    hideSchemaSearchResults();
    return;
  }

  elements.schemaSearchResults.hidden = false;
  elements.schemaSearchInput.setAttribute("aria-expanded", "true");

  if (results.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "search-empty";
    emptyMessage.textContent = "No matching tables or columns found.";
    elements.schemaSearchResults.appendChild(emptyMessage);
    return;
  }

  results.forEach((result) => {
    elements.schemaSearchResults.appendChild(createSearchResultButton(result));
  });
}

function getSavedTemplates() {
  let savedTemplates = "";

  try {
    savedTemplates = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  } catch (error) {
    return [];
  }

  if (!savedTemplates) {
    return [];
  }

  try {
    const parsedTemplates = JSON.parse(savedTemplates);
    return Array.isArray(parsedTemplates) ? parsedTemplates : [];
  } catch (error) {
    return [];
  }
}

function normalizeCategoryForTable(category, table) {
  if (category === "Identity / Entra ID" && LEGACY_IDENTITY_TABLE_CATEGORIES[table]) {
    return LEGACY_IDENTITY_TABLE_CATEGORIES[table];
  }

  return LEGACY_CATEGORY_MAP[category] || category;
}

function normalizeTemplateCategory(template) {
  return {
    ...template,
    category: normalizeCategoryForTable(template.category, template.table)
  };
}

function saveTemplates(templates) {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch (error) {
    return false;
  }
}

function isKnownTable(category, table) {
  return SOC_SCHEMAS.some((schema) => schema.category === category && schema.table === table);
}

function isKnownColumn(table, columnName) {
  const schema = SOC_SCHEMAS.find((item) => item.table === table);
  return Boolean(schema && schema.columns.some((column) => column.name === columnName));
}

function hasRequiredTemplateFields(template) {
  return (
    template &&
    typeof template.name === "string" &&
    template.name.trim().length > 0 &&
    typeof template.category === "string" &&
    typeof template.table === "string" &&
    typeof template.timeRange === "string" &&
    Array.isArray(template.filters) &&
    Array.isArray(template.outputColumns) &&
    typeof template.sortColumn === "string" &&
    typeof template.sortDirection === "string" &&
    (typeof template.limit === "string" || typeof template.limit === "number")
  );
}

function isValidTemplate(template) {
  const normalizedTemplate = hasRequiredTemplateFields(template) ? normalizeTemplateCategory(template) : template;

  if (!hasRequiredTemplateFields(normalizedTemplate) || !isKnownTable(normalizedTemplate.category, normalizedTemplate.table)) {
    return false;
  }

  const filtersAreValid = normalizedTemplate.filters.every((filter) => {
    if (!filter || typeof filter.column !== "string" || typeof filter.operator !== "string" || typeof filter.value !== "string") {
      return false;
    }

    const schema = SOC_SCHEMAS.find((item) => item.table === normalizedTemplate.table);
    const operators = schema ? getFilterOperatorsForColumn(schema, filter.column) : [];

    return (
      isKnownColumn(normalizedTemplate.table, filter.column) &&
      operators.some((operator) => operator.value === filter.operator)
    );
  });

  const outputColumnsAreValid = normalizedTemplate.outputColumns.every((columnName) => {
    return typeof columnName === "string" && isKnownColumn(normalizedTemplate.table, columnName);
  });

  return (
    filtersAreValid &&
    outputColumnsAreValid &&
    isKnownColumn(normalizedTemplate.table, normalizedTemplate.sortColumn) &&
    (normalizedTemplate.sortDirection === "asc" || normalizedTemplate.sortDirection === "desc")
  );
}

function normalizeTemplate(template) {
  const normalizedTemplate = normalizeTemplateCategory(template);

  // Keep only builder state fields. Extra fields, including generated KQL text, are ignored.
  return {
    name: normalizedTemplate.name.trim(),
    category: normalizedTemplate.category,
    table: normalizedTemplate.table,
    timeRange: normalizedTemplate.timeRange,
    filters: normalizedTemplate.filters.map((filter) => ({
      column: filter.column,
      operator: filter.operator,
      value: filter.value
    })),
    outputColumns: [...normalizedTemplate.outputColumns],
    sortColumn: normalizedTemplate.sortColumn,
    sortDirection: normalizedTemplate.sortDirection,
    limit: String(normalizedTemplate.limit)
  };
}

function renderTemplateOptions() {
  const templates = getSavedTemplates();
  const templateOptions = [
    { value: "", label: "Select a saved template" },
    ...templates.map((template) => ({
      value: template.name,
      label: template.name
    }))
  ];

  setOptions(elements.templateSelect, templateOptions, "");
}

function renderTableOptions() {
  const tables = getTablesForCategory(elements.categorySelect.value).map((schema) => ({
    value: schema.table,
    label: schema.table
  }));

  setOptions(elements.tableSelect, tables, tables[0].value);
}

function renderColumnOptions(schema) {
  setOptions(
    elements.sortColumnSelect,
    schema.columns.map((column) => ({
      value: column.name,
      label: column.name
    })),
    schema.timeColumn
  );
}

function renderColumnCheckboxes(schema) {
  elements.columnCheckboxes.innerHTML = "";

  // Default columns start checked so a useful query appears on first load.
  schema.columns.forEach((column) => {
    const label = document.createElement("label");
    label.className = "checkbox-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = column.name;
    checkbox.checked = schema.defaultColumns.includes(column.name);

    checkbox.addEventListener("change", () => {
      markCustomQuery();
      updateQueryOutput();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(column.name));
    elements.columnCheckboxes.appendChild(label);
  });
}

function getColumnOptions(schema) {
  return schema.columns.map((column) => ({
    value: column.name,
    label: `${column.name} (${column.type})`
  }));
}

function getFilterOperatorsForColumn(schema, columnName) {
  const selectedColumn = getColumnByName(schema, columnName);
  return FILTER_OPERATORS_BY_TYPE[selectedColumn.type] || FILTER_OPERATORS_BY_TYPE.string;
}

function renderFilterOperatorOptions(operatorSelect, schema, columnName, selectedOperator) {
  const selectedColumn = getColumnByName(schema, columnName);
  const operators = FILTER_OPERATORS_BY_TYPE[selectedColumn.type] || FILTER_OPERATORS_BY_TYPE.string;

  // The first operator is the safest default for the selected type.
  setOptions(operatorSelect, operators, selectedOperator || operators[0].value);
}

function createFilterRow() {
  const schema = getSelectedSchema();
  const defaultColumn = schema.defaultColumns[0];
  const defaultOperator = getFilterOperatorsForColumn(schema, defaultColumn)[0].value;

  return {
    id: filterRowId++,
    column: defaultColumn,
    operator: defaultOperator,
    value: ""
  };
}

function createFilterFromPreset(presetFilter, schema) {
  const column = getColumnByName(schema, presetFilter.column);
  const operators = getFilterOperatorsForColumn(schema, column.name);
  const operatorExists = operators.some((operator) => operator.value === presetFilter.operator);

  return {
    id: filterRowId++,
    column: column.name,
    operator: operatorExists ? presetFilter.operator : operators[0].value,
    value: presetFilter.value
  };
}

function resetFilters() {
  filters = [createFilterRow()];
  renderFilterRows();
}

function setFirstFilterColumn(columnName) {
  const schema = getSelectedSchema();
  const matchedColumn = getExactColumnByName(schema, columnName);

  if (!matchedColumn || filters.length === 0) {
    return;
  }

  filters[0] = {
    ...filters[0],
    column: matchedColumn.name,
    operator: getFilterOperatorsForColumn(schema, matchedColumn.name)[0].value,
    value: ""
  };
  renderFilterRows();
}

function selectSchemaSearchResult(schema, matchedColumnName) {
  markCustomQuery();
  elements.categorySelect.value = schema.category;
  renderTableOptions();
  elements.tableSelect.value = schema.table;
  refreshTableFields();

  // When a column caused the match, make the first filter row ready to use it.
  if (matchedColumnName) {
    setFirstFilterColumn(matchedColumnName);
    updateQueryOutput();
  }

  hideSchemaSearchResults();
}

function addFilterRow() {
  markCustomQuery();
  filters.push(createFilterRow());
  renderFilterRows();
  updateQueryOutput();
}

function removeFilterRow(filterId) {
  markCustomQuery();
  filters = filters.filter((filter) => filter.id !== filterId);

  if (filters.length === 0) {
    filters.push(createFilterRow());
  }

  renderFilterRows();
  updateQueryOutput();
}

function setSelectedOutputColumns(outputColumns) {
  const selectedColumns = new Set(outputColumns);
  const checkboxes = elements.columnCheckboxes.querySelectorAll("input[type='checkbox']");

  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectedColumns.has(checkbox.value);
  });
}

function getTemplateState(templateName) {
  const schema = getSelectedSchema();

  // Save only builder state. Generated KQL is rebuilt when the template loads.
  return {
    name: templateName,
    category: schema.category,
    table: schema.table,
    timeRange: elements.timeRangeSelect.value,
    filters: filters.map((filter) => ({
      column: filter.column,
      operator: filter.operator,
      value: filter.value
    })),
    outputColumns: getSelectedOutputColumns(),
    sortColumn: elements.sortColumnSelect.value,
    sortDirection: elements.sortDirectionSelect.value,
    limit: elements.limitInput.value
  };
}

function applySavedState(savedState) {
  const normalizedState = normalizeTemplateCategory(savedState);

  // Rebuild dependent controls in order: category, table, columns, filters, then output.
  elements.presetSelect.value = "";
  elements.categorySelect.value = normalizedState.category;
  renderTableOptions();
  elements.tableSelect.value = normalizedState.table;

  const schema = getSelectedSchema();
  elements.timeRangeSelect.value = normalizedState.timeRange;
  renderColumnOptions(schema);
  renderColumnCheckboxes(schema);
  setSelectedOutputColumns(normalizedState.outputColumns || []);

  filters = (normalizedState.filters || []).map((filter) => createFilterFromPreset(filter, schema));
  if (filters.length === 0) {
    filters.push(createFilterRow());
  }

  renderFilterRows();
  elements.sortColumnSelect.value = normalizedState.sortColumn;
  elements.sortDirectionSelect.value = normalizedState.sortDirection;
  elements.limitInput.value = normalizedState.limit;
  updateQueryOutput();
}

function saveCurrentTemplate() {
  const templateName = elements.templateNameInput.value.trim();

  if (!templateName) {
    elements.templateStatus.textContent = "Enter a template name before saving.";
    return;
  }

  const templates = getSavedTemplates();
  const savedState = getTemplateState(templateName);
  const existingIndex = templates.findIndex((template) => template.name === templateName);

  if (existingIndex >= 0) {
    templates[existingIndex] = savedState;
  } else {
    templates.push(savedState);
  }

  if (!saveTemplates(templates)) {
    elements.templateStatus.textContent = "Could not save. Browser localStorage may be disabled.";
    return;
  }

  renderTemplateOptions();
  elements.templateSelect.value = templateName;
  elements.templateStatus.textContent = `Saved local template: ${templateName}.`;
}

function loadSelectedTemplate() {
  const templateName = elements.templateSelect.value;
  const template = getSavedTemplates().find((savedTemplate) => savedTemplate.name === templateName);

  if (!template) {
    elements.templateStatus.textContent = "Select a saved template to load.";
    return;
  }

  elements.templateNameInput.value = template.name;
  applySavedState(template);
  elements.templateStatus.textContent = `Loaded local template: ${template.name}.`;
}

function deleteSelectedTemplate() {
  const templateName = elements.templateSelect.value;

  if (!templateName) {
    elements.templateStatus.textContent = "Select a saved template to delete.";
    return;
  }

  const templates = getSavedTemplates().filter((template) => template.name !== templateName);
  if (!saveTemplates(templates)) {
    elements.templateStatus.textContent = "Could not delete. Browser localStorage may be disabled.";
    return;
  }

  renderTemplateOptions();
  elements.templateStatus.textContent = `Deleted local template: ${templateName}.`;
}

function exportTemplatesToJson() {
  const templates = getSavedTemplates();

  if (templates.length === 0) {
    elements.templateStatus.textContent = "No saved templates to export.";
    return;
  }

  const jsonText = JSON.stringify(templates, null, 2);
  const blob = new Blob([jsonText], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = "soc-kql-builder-templates.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);

  elements.templateStatus.textContent = `Exported ${templates.length} local template(s).`;
}

function importTemplatesFromText(jsonText) {
  let parsedTemplates;

  try {
    parsedTemplates = JSON.parse(jsonText);
  } catch (error) {
    elements.templateStatus.textContent = "Import failed. The selected file is not valid JSON.";
    return;
  }

  if (!Array.isArray(parsedTemplates)) {
    elements.templateStatus.textContent = "Import failed. Template JSON must be an array.";
    return;
  }

  const validTemplates = parsedTemplates.filter(isValidTemplate).map(normalizeTemplate);
  if (validTemplates.length !== parsedTemplates.length || validTemplates.length === 0) {
    elements.templateStatus.textContent = "Import failed. One or more templates are missing required fields or use unsupported tables/columns.";
    return;
  }

  const savedTemplates = getSavedTemplates();
  const mergedTemplates = [...savedTemplates];

  validTemplates.forEach((template) => {
    const existingIndex = mergedTemplates.findIndex((savedTemplate) => savedTemplate.name === template.name);

    if (existingIndex >= 0) {
      mergedTemplates[existingIndex] = template;
    } else {
      mergedTemplates.push(template);
    }
  });

  if (!saveTemplates(mergedTemplates)) {
    elements.templateStatus.textContent = "Import failed. Browser localStorage may be disabled.";
    return;
  }

  renderTemplateOptions();
  elements.templateStatus.textContent = `Imported ${validTemplates.length} local template(s).`;
}

function importTemplatesFromFile(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    importTemplatesFromText(String(reader.result || ""));
    elements.importTemplatesInput.value = "";
  });
  reader.addEventListener("error", () => {
    elements.templateStatus.textContent = "Import failed. Could not read the selected file.";
    elements.importTemplatesInput.value = "";
  });
  reader.readAsText(file);
}

function applyPreset(presetName) {
  const preset = SOC_PRESETS.find((item) => item.name === presetName);
  if (!preset) {
    return;
  }

  elements.categorySelect.value = preset.category;
  renderTableOptions();
  elements.tableSelect.value = preset.table;

  const schema = getSelectedSchema();
  elements.timeRangeSelect.value = preset.timeRange;
  renderColumnOptions(schema);
  renderColumnCheckboxes(schema);
  setSelectedOutputColumns(preset.outputColumns);

  filters = preset.filters.map((filter) => createFilterFromPreset(filter, schema));
  if (filters.length === 0) {
    filters.push(createFilterRow());
  }

  renderFilterRows();
  elements.sortColumnSelect.value = preset.sortColumn;
  elements.sortDirectionSelect.value = preset.sortDirection;
  elements.limitInput.value = preset.limit;
  updateQueryOutput();
}

function updateFilterRow(filterId, changes) {
  const schema = getSelectedSchema();
  markCustomQuery();

  filters = filters.map((filter) => {
    if (filter.id !== filterId) {
      return filter;
    }

    const updatedFilter = { ...filter, ...changes };

    // Changing column type may make the old operator invalid, so reset it.
    if (Object.prototype.hasOwnProperty.call(changes, "column")) {
      updatedFilter.operator = getFilterOperatorsForColumn(schema, updatedFilter.column)[0].value;
    }

    return updatedFilter;
  });

  renderFilterRows();
  updateQueryOutput();
}

function renderFilterRows() {
  const schema = getSelectedSchema();
  elements.filterList.innerHTML = "";

  filters.forEach((filter) => {
    const row = document.createElement("div");
    row.className = "filter-controls";

    const columnField = document.createElement("div");
    columnField.className = "field-row";
    const columnLabel = document.createElement("label");
    columnLabel.textContent = "Column";
    const columnSelect = document.createElement("select");
    setOptions(columnSelect, getColumnOptions(schema), filter.column);
    columnSelect.addEventListener("change", () => {
      updateFilterRow(filter.id, { column: columnSelect.value });
    });
    columnField.appendChild(columnLabel);
    columnField.appendChild(columnSelect);

    const operatorField = document.createElement("div");
    operatorField.className = "field-row";
    const operatorLabel = document.createElement("label");
    operatorLabel.textContent = "Operator";
    const operatorSelect = document.createElement("select");
    renderFilterOperatorOptions(operatorSelect, schema, filter.column, filter.operator);
    operatorSelect.addEventListener("change", () => {
      updateFilterRow(filter.id, { operator: operatorSelect.value });
    });
    operatorField.appendChild(operatorLabel);
    operatorField.appendChild(operatorSelect);

    const valueField = document.createElement("div");
    valueField.className = "field-row";
    const valueLabel = document.createElement("label");
    valueLabel.textContent = "Value";
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "Demo value";
    valueInput.autocomplete = "off";
    valueInput.value = filter.value;
    valueInput.addEventListener("input", () => {
      markCustomQuery();
      filter.value = valueInput.value;
      updateQueryOutput();
    });
    valueField.appendChild(valueLabel);
    valueField.appendChild(valueInput);

    const removeField = document.createElement("div");
    removeField.className = "field-row";
    const removeLabel = document.createElement("label");
    removeLabel.textContent = "Action";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-filter-button";
    removeButton.textContent = "Remove";
    removeButton.disabled = filters.length === 1;
    removeButton.addEventListener("click", () => {
      removeFilterRow(filter.id);
    });
    removeField.appendChild(removeLabel);
    removeField.appendChild(removeButton);

    row.appendChild(columnField);
    row.appendChild(operatorField);
    row.appendChild(valueField);
    row.appendChild(removeField);
    elements.filterList.appendChild(row);
  });
}

function refreshTableFields() {
  const schema = getSelectedSchema();

  renderColumnOptions(schema);
  renderColumnCheckboxes(schema);
  resetFilters();
  updateQueryOutput();
}

function resetBuilderToDefault() {
  elements.presetSelect.value = "";
  elements.templateNameInput.value = "";
  elements.templateSelect.value = "";
  elements.timeRangeSelect.value = "24h";
  elements.sortDirectionSelect.value = "desc";
  elements.limitInput.value = "100";
  renderCategoryOptions();
  renderTableOptions();
  refreshTableFields();
  elements.templateStatus.textContent = "Started a new default query.";
}

function getSelectedOutputColumns() {
  const checkedBoxes = elements.columnCheckboxes.querySelectorAll("input:checked");
  return Array.from(checkedBoxes).map((checkbox) => checkbox.value);
}

function getCurrentState() {
  const schema = getSelectedSchema();
  const limit = Number.parseInt(elements.limitInput.value, 10);

  // This object is the only input the query builder needs.
  return {
    table: schema.table,
    timeColumn: schema.timeColumn,
    timeRange: elements.timeRangeSelect.value,
    filters: filters.map((filter) => {
      const column = getColumnByName(schema, filter.column);

      return {
        column: column.name,
        type: column.type,
        operator: filter.operator,
        value: filter.value
      };
    }),
    outputColumns: getSelectedOutputColumns(),
    sortColumn: elements.sortColumnSelect.value,
    sortDirection: elements.sortDirectionSelect.value,
    limit: Number.isFinite(limit) ? limit : 100
  };
}

function getTimeRangeLabel(timeRange) {
  const selectedOption = elements.timeRangeSelect.querySelector(`option[value="${timeRange}"]`);
  return selectedOption ? selectedOption.textContent : timeRange;
}

function getSortDirectionLabel(sortDirection) {
  return sortDirection === "asc" ? "oldest to newest" : "newest to oldest";
}

function isValidBooleanText(value) {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === "true" || normalizedValue === "false";
}

function isValidDatetimeText(value) {
  const trimmedValue = value.trim();
  return isKqlDateFunction(trimmedValue) || isIsoLikeDate(trimmedValue);
}

function getInvalidInValues(value, type) {
  const values = splitCommaValues(value);

  if (values.length === 0) {
    return values;
  }

  if (type === "int" || type === "long" || type === "real") {
    return values.filter((item) => !isValidNumericValue(item, type));
  }

  return [];
}

function getBetweenValues(value) {
  return splitCommaValues(value);
}

function createWarningItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function getValidationWarnings(state) {
  const warnings = [];
  const rawLimit = elements.limitInput.value.trim();

  state.filters.forEach((filter) => {
    const value = filter.value.trim();

    if (!value) {
      return;
    }

    if ((filter.type === "int" || filter.type === "long" || filter.type === "real") && !isValidNumericValue(value, filter.type)) {
      const usesListOrRange = filter.operator === "in" || filter.operator === "!in" || filter.operator === "between";
      if (!usesListOrRange) {
        warnings.push(`${filter.column} expects a valid ${filter.type} number. This filter will not be added until the value is numeric.`);
      }
    }

    if (filter.type === "bool" && !isValidBooleanText(value)) {
      warnings.push(`${filter.column} is a boolean column. Use true or false.`);
    }

    if (filter.type === "datetime" && filter.operator !== "between" && !isValidDatetimeText(value)) {
      warnings.push(`${filter.column} expects ago(...), datetime(...), or an ISO-like date such as 2026-01-01.`);
    }

    if (filter.operator === "in" || filter.operator === "!in") {
      const values = splitCommaValues(value);
      if (values.length === 0) {
        warnings.push(`${filter.column} ${filter.operator} needs at least one comma-separated value.`);
      }

      const invalidValues = getInvalidInValues(value, filter.type);
      if ((filter.type === "int" || filter.type === "long" || filter.type === "real") && invalidValues.length === values.length) {
        warnings.push(`${filter.column} ${filter.operator} has no valid numeric values.`);
      }

      if (invalidValues.length > 0) {
        warnings.push(`${filter.column} ${filter.operator} contains non-numeric value(s): ${invalidValues.join(", ")}.`);
      }
    }

    if (filter.operator === "between") {
      const values = getBetweenValues(value);
      if (values.length !== 2) {
        warnings.push(`${filter.column} between needs exactly two comma-separated values.`);
      } else if ((filter.type === "int" || filter.type === "long" || filter.type === "real") && values.some((item) => !isValidNumericValue(item, filter.type))) {
        warnings.push(`${filter.column} between values must both be valid numbers.`);
      } else if (filter.type === "datetime" && values.some((item) => !isValidDatetimeText(item))) {
        warnings.push(`${filter.column} between values must use ago(...), datetime(...), or ISO-like dates.`);
      }
    }

    if (filter.operator === "array_length() >" && !isValidNumericValue(value, "real")) {
      warnings.push(`${filter.column} array_length() > needs a numeric value.`);
    }
  });

  if (!rawLimit) {
    warnings.push("Limit is empty. The app will fall back to 100 rows.");
  } else if (!Number.isFinite(Number(rawLimit))) {
    warnings.push("Limit must be a number.");
  } else if (!Number.isInteger(Number(rawLimit))) {
    warnings.push("Limit should be a whole number.");
  } else if (Number(rawLimit) < 1) {
    warnings.push("Limit should be at least 1.");
  } else if (Number(rawLimit) > 1000) {
    warnings.push("Limit is unusually high for a learning query. Consider using 1000 rows or fewer.");
  }

  return warnings;
}

function updateValidationWarnings(state) {
  const warnings = getValidationWarnings(state);
  elements.validationWarnings.innerHTML = "";

  if (warnings.length === 0) {
    const status = document.createElement("p");
    status.textContent = "No validation issues found.";
    elements.validationWarnings.appendChild(status);
  } else {
    const list = document.createElement("ul");
    warnings.forEach((warning) => {
      list.appendChild(createWarningItem(warning));
    });
    elements.validationWarnings.appendChild(list);
  }

  const safetyNote = document.createElement("p");
  safetyNote.className = "safety-note";
  safetyNote.textContent =
    "Safety reminder: do not include real usernames, hostnames, tenant IDs, workspace IDs, tokens, or production indicators in saved or shared queries.";
  elements.validationWarnings.appendChild(safetyNote);
}

function createExplanationItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapKqlToken(className, value) {
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function findStringEnd(line, startIndex) {
  let index = startIndex + 1;

  while (index < line.length) {
    if (line[index] === '"' && line[index - 1] !== "\\") {
      return index + 1;
    }

    index += 1;
  }

  return line.length;
}

function highlightKqlLine(line, isTableLine) {
  const keywordPattern = /^(where|project|sort|by|take|extend|summarize|join|order|limit)\b/i;
  const operatorPattern = /^(matches\s+regex|!contains\b|!has\b|!in\b|contains\b|startswith\b|endswith\b|between\b|has\b|in\b|==|!=|>=|<=|>|<)/i;
  const functionPattern = /^(ago|datetime|array_length)\s*\([^)]*\)/i;
  const numberPattern = /^-?\d+(\.\d+)?\b/;
  let highlightedLine = "";
  let index = 0;

  if (isTableLine) {
    return wrapKqlToken("kql-token-table", line);
  }

  while (index < line.length) {
    const remainingLine = line.slice(index);

    if (line[index] === '"') {
      const endIndex = findStringEnd(line, index);
      highlightedLine += wrapKqlToken("kql-token-string", line.slice(index, endIndex));
      index = endIndex;
      continue;
    }

    if (line[index] === "|") {
      highlightedLine += wrapKqlToken("kql-token-pipe", "|");
      index += 1;
      continue;
    }

    const functionMatch = remainingLine.match(functionPattern);
    if (functionMatch) {
      highlightedLine += wrapKqlToken("kql-token-function", functionMatch[0]);
      index += functionMatch[0].length;
      continue;
    }

    const keywordMatch = remainingLine.match(keywordPattern);
    if (keywordMatch) {
      highlightedLine += wrapKqlToken("kql-token-keyword", keywordMatch[0]);
      index += keywordMatch[0].length;
      continue;
    }

    const operatorMatch = remainingLine.match(operatorPattern);
    if (operatorMatch) {
      highlightedLine += wrapKqlToken("kql-token-operator", operatorMatch[0]);
      index += operatorMatch[0].length;
      continue;
    }

    const numberMatch = remainingLine.match(numberPattern);
    if (numberMatch) {
      highlightedLine += wrapKqlToken("kql-token-number", numberMatch[0]);
      index += numberMatch[0].length;
      continue;
    }

    highlightedLine += escapeHtml(line[index]);
    index += 1;
  }

  return highlightedLine;
}

function highlightKql(kqlText) {
  const lines = kqlText.split("\n");

  // The first generated line is always the selected table name.
  return lines.map((line, index) => highlightKqlLine(line, index === 0)).join("\n");
}

function describeFilter(filter) {
  if (!filter.value.trim()) {
    return "";
  }

  if (filter.type === "bool") {
    return `${filter.column} must be ${filter.value.trim().toLowerCase()}.`;
  }

  return `${filter.column} ${filter.operator} ${filter.value.trim()}.`;
}

function updateQueryExplanation(state) {
  const schema = getSelectedSchema();
  const activeFilters = state.filters.filter((filter) => buildFilterLine(filter));
  const filterDescriptions = activeFilters.map(describeFilter).filter(Boolean);
  const outputColumnText =
    state.outputColumns.length > 0 ? state.outputColumns.join(", ") : "all columns because no output columns are selected";

  elements.queryExplanation.innerHTML = "";

  const intro = document.createElement("p");
  intro.textContent = schema.description || `This query searches the ${state.table} table.`;

  const list = document.createElement("ul");
  list.appendChild(createExplanationItem(`Searches ${state.table} in the ${schema.category} category.`));
  list.appendChild(createExplanationItem(`Limits results to ${getTimeRangeLabel(state.timeRange)} using ${schema.timeColumn}.`));

  if (filterDescriptions.length > 0) {
    filterDescriptions.forEach((description) => {
      list.appendChild(createExplanationItem(`Filters where ${description}`));
    });
  } else {
    list.appendChild(createExplanationItem("Does not add any extra filters beyond the time range."));
  }

  list.appendChild(createExplanationItem(`Shows these output columns: ${outputColumnText}.`));
  list.appendChild(
    createExplanationItem(`Sorts by ${state.sortColumn} ${state.sortDirection} (${getSortDirectionLabel(state.sortDirection)}).`)
  );
  list.appendChild(createExplanationItem(`Returns up to ${state.limit} rows.`));

  elements.queryExplanation.appendChild(intro);
  elements.queryExplanation.appendChild(list);
}

function updateQueryOutput() {
  const state = getCurrentState();
  latestPlainKql = buildKqlQuery(state);
  elements.kqlOutput.innerHTML = highlightKql(latestPlainKql);
  updateValidationWarnings(state);
  updateQueryExplanation(state);
  elements.copyStatus.textContent = "";
}

async function copyQueryToClipboard() {
  try {
    await navigator.clipboard.writeText(latestPlainKql);
    elements.copyStatus.textContent = "Query copied.";
  } catch (error) {
    elements.copyStatus.textContent = "Copy failed. Select the query text and copy it manually.";
  }
}

function handleKeyboardShortcuts(event) {
  const pressedKey = event.key.toLowerCase();

  // Only these exact shortcut combinations prevent the browser's default action.
  if (event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && pressedKey === "c") {
    event.preventDefault();
    copyQueryToClipboard();
    return;
  }

  if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && pressedKey === "s") {
    event.preventDefault();

    if (!elements.templateNameInput.value.trim()) {
      elements.templateStatus.textContent = "Enter a template name before using Ctrl+S.";
      return;
    }

    saveCurrentTemplate();
    return;
  }

  if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && pressedKey === "n") {
    event.preventDefault();
    resetBuilderToDefault();
  }
}

function bindEvents() {
  elements.queryForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  elements.presetSelect.addEventListener("change", () => {
    applyPreset(elements.presetSelect.value);
  });

  elements.schemaSearchInput.addEventListener("input", renderSchemaSearchResults);

  elements.categorySelect.addEventListener("change", () => {
    elements.presetSelect.value = "";
    hideSchemaSearchResults();
    renderTableOptions();
    refreshTableFields();
  });

  elements.tableSelect.addEventListener("change", () => {
    elements.presetSelect.value = "";
    hideSchemaSearchResults();
    refreshTableFields();
  });
  elements.timeRangeSelect.addEventListener("change", () => {
    markCustomQuery();
    updateQueryOutput();
  });
  elements.addFilterButton.addEventListener("click", addFilterRow);
  elements.saveTemplateButton.addEventListener("click", saveCurrentTemplate);
  elements.loadTemplateButton.addEventListener("click", loadSelectedTemplate);
  elements.deleteTemplateButton.addEventListener("click", deleteSelectedTemplate);
  elements.exportTemplatesButton.addEventListener("click", exportTemplatesToJson);
  elements.importTemplatesInput.addEventListener("change", importTemplatesFromFile);
  elements.sortColumnSelect.addEventListener("change", () => {
    markCustomQuery();
    updateQueryOutput();
  });
  elements.sortDirectionSelect.addEventListener("change", () => {
    markCustomQuery();
    updateQueryOutput();
  });
  elements.limitInput.addEventListener("input", () => {
    markCustomQuery();
    updateQueryOutput();
  });
  elements.copyButton.addEventListener("click", copyQueryToClipboard);
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

function initApp() {
  renderPresetOptions();
  renderTemplateOptions();
  renderCategoryOptions();
  renderTableOptions();
  refreshTableFields();
  bindEvents();
}

initApp();
