export const parseOrderingInput = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return Number.NaN;
  }
  return parsed;
};

export const findOrderingConflict = ({
  items,
  requestedOrder,
  currentItemId = null,
  matchesScope = () => true,
  getItemId = (item) => item?.id,
  getItemOrder = (item) => item?.ordering,
}) => {
  if (!Number.isInteger(requestedOrder) || requestedOrder < 1) {
    return null;
  }

  return (items || []).find((item) => {
    if (!matchesScope(item)) return false;
    const itemId = getItemId(item);
    if (currentItemId != null && itemId != null && String(itemId) === String(currentItemId)) {
      return false;
    }
    return Number(getItemOrder(item)) === requestedOrder;
  }) || null;
};

export const findNextAvailableOrdering = ({
  items,
  currentItemId = null,
  matchesScope = () => true,
  getItemId = (item) => item?.id,
  getItemOrder = (item) => item?.ordering,
}) => {
  const usedOrders = new Set(
    (items || [])
      .filter((item) => {
        if (!matchesScope(item)) return false;
        const itemId = getItemId(item);
        return !(currentItemId != null && itemId != null && String(itemId) === String(currentItemId));
      })
      .map((item) => Number(getItemOrder(item)))
      .filter((order) => Number.isInteger(order) && order >= 1)
  );

  let candidate = 1;
  while (usedOrders.has(candidate)) {
    candidate += 1;
  }
  return candidate;
};

export const buildOrderingWarning = (requestedOrder, conflictingItem, suggestedOrder = null) => {
  if (!conflictingItem || !Number.isInteger(requestedOrder) || requestedOrder < 1) {
    return '';
  }
  const label = conflictingItem?.name ? ` for "${conflictingItem.name}"` : '';
  const suggestion =
    Number.isInteger(suggestedOrder) && suggestedOrder >= 1
      ? ` Suggested available order: ${suggestedOrder}.`
      : '';
  return `Order ${requestedOrder} already exists${label}. Saving will place this item at position ${requestedOrder} and shift the remaining items down.${suggestion}`;
};
