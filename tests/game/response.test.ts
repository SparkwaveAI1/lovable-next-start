import { ensureGameResponse } from "../../src/lib/game/response";

test("ensureGameResponse adds toJSON()", () => {
  const r = ensureGameResponse({ ok: true, result: { a: 1 } });
  expect(typeof (r as any).toJSON).toBe("function");
  expect(JSON.parse(JSON.stringify(r))).toEqual({ ok: true, result: { a: 1 } });
});