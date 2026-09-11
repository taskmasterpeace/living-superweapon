// Presentation references are sparse: choosing one motion or weapon must not
// erase the other families. Studio validation and live forms use this same rule.
export function mergeAuthoredSelection(base, patch) {
  if (base === undefined && patch === undefined) return undefined;
  const result = {...base, ...patch};
  for (const family of ['motion', 'equipment']) {
    if (base?.[family] !== undefined || patch?.[family] !== undefined)
      result[family] = {...base?.[family], ...patch?.[family]};
  }
  return result;
}
