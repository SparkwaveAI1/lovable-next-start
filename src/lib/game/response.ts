// src/lib/game/response.ts
type OkResult<T> = { ok: true; result: T };

// Some GAME SDK versions call `toJSON()` on the response.
// This ensures the object is serializable in both paths.
export function ensureGameResponse<T>(res: OkResult<T>): OkResult<T> & { toJSON(): OkResult<T> } {
  const withToJSON = res as OkResult<T> & { toJSON?: () => OkResult<T> };
  if (typeof withToJSON.toJSON !== "function") {
    Object.defineProperty(withToJSON, "toJSON", {
      value: () => res,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  return withToJSON as OkResult<T> & { toJSON(): OkResult<T> };
}