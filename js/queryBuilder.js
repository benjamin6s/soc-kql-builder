// Escape text values so generated KQL remains plain text and readable.
function escapeKqlString(value) {
  return String(value).replace(/"/g, '\\"');
}

function isValidNumericValue(value, type) {
  if (type === "int" || type === "long") {
    return /^-?\d+$/.test(value);
  }

  return Number.isFinite(Number(value));
}

function isKqlDateFunction(value) {
  return /^ago\([^)]+\)$/i.test(value) || /^datetime\([^)]+\)$/i.test(value);
}

function isIsoLikeDate(value) {
  return /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?)?$/.test(value);
}

function splitCommaValues(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDatetimeValue(value) {
  const trimmedValue = value.trim();

  if (isKqlDateFunction(trimmedValue)) {
    return trimmedValue;
  }

  return isIsoLikeDate(trimmedValue) ? `datetime("${escapeKqlString(trimmedValue)}")` : "";
}

function formatFilterValue(value, type) {
  const trimmedValue = value.trim();

  if (type === "string" || type === "dynamic") {
    return `"${escapeKqlString(trimmedValue)}"`;
  }

  if (type === "datetime") {
    return formatDatetimeValue(trimmedValue);
  }

  if (type === "bool") {
    const normalizedValue = trimmedValue.toLowerCase();
    return normalizedValue === "true" || normalizedValue === "false" ? normalizedValue : "";
  }

  if (type === "int" || type === "long" || type === "real") {
    return isValidNumericValue(trimmedValue, type) ? trimmedValue : "";
  }

  return trimmedValue;
}

function formatInList(value, type) {
  const values = splitCommaValues(value);

  if (values.length === 0) {
    return "";
  }

  if (type === "string") {
    return values.map((item) => `"${escapeKqlString(item)}"`).join(", ");
  }

  if (type === "int" || type === "long" || type === "real") {
    const validValues = values.filter((item) => isValidNumericValue(item, type));
    return validValues.length === values.length ? validValues.join(", ") : "";
  }

  return "";
}

function formatBetweenValues(value, type) {
  const values = splitCommaValues(value);

  if (values.length !== 2) {
    return "";
  }

  if (type === "datetime") {
    const formattedValues = values.map(formatDatetimeValue);
    return formattedValues.every(Boolean) ? `${formattedValues[0]} .. ${formattedValues[1]}` : "";
  }

  if (type === "int" || type === "long" || type === "real") {
    return values.every((item) => isValidNumericValue(item, type)) ? `${values[0]} .. ${values[1]}` : "";
  }

  return "";
}

function buildFilterLine(filter) {
  if (!filter.column || !filter.operator || !filter.value.trim()) {
    return "";
  }

  if (filter.operator === "in" || filter.operator === "!in") {
    const values = formatInList(filter.value, filter.type);
    return values ? `| where ${filter.column} ${filter.operator} (${values})` : "";
  }

  if (filter.operator === "between") {
    const values = formatBetweenValues(filter.value, filter.type);
    return values ? `| where ${filter.column} between (${values})` : "";
  }

  if (filter.operator === "array_length() >") {
    const value = filter.value.trim();
    return isValidNumericValue(value, "real") ? `| where array_length(${filter.column}) > ${value}` : "";
  }

  const value = formatFilterValue(filter.value, filter.type);
  if (!value) {
    return "";
  }

  return `| where ${filter.column} ${filter.operator} ${value}`;
}

function buildKqlQuery(state) {
  const lines = [state.table];

  if (state.timeColumn && state.timeRange) {
    lines.push(`| where ${state.timeColumn} > ago(${state.timeRange})`);
  }

  const filters = state.filters || [];

  filters.forEach((filter) => {
    const filterLine = buildFilterLine(filter);
    if (filterLine) {
      lines.push(filterLine);
    }
  });

  if (state.outputColumns.length > 0) {
    lines.push(`| project ${state.outputColumns.join(", ")}`);
  }

  if (state.sortColumn) {
    lines.push(`| sort by ${state.sortColumn} ${state.sortDirection}`);
  }

  if (state.limit > 0) {
    lines.push(`| take ${state.limit}`);
  }

  return lines.join("\n");
}
