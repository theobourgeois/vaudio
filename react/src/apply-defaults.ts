export function applyDefaults<T>(defaults: T, overrides: Partial<T>): T {
  return { ...defaults, ...overrides };
}