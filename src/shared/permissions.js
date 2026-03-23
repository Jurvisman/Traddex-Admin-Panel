import { createContext, useContext } from 'react';

// Default, permissive shape to avoid crashes before permissions load
export const PermissionsContext = createContext({
  allowedPaths: new Set(),
  allowedActions: new Set(),
  hasPermission: () => true,
  hasAny: () => true,
  hasAll: () => true,
});

export const usePermissions = () => useContext(PermissionsContext);

