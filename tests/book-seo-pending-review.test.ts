import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('/book/seo pending-review intake contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/pages/BookSEO.tsx'), 'utf8');

  it('writes SEO requests into the shared pending-review booking table', () => {
    expect(source).toContain('.from("sparkwave_booking_requests")');
    expect(source).toContain('status: "pending"');
    expect(source).toContain('topic: "SEO Strategy Call"');
  });

  it('preserves page/source attribution through the shared attribution helper', () => {
    expect(source).toContain('getLeadAttribution');
    expect(source).toContain('...attribution');
  });

  it('does not fire page-level confirmation or internal brief emails before manual review', () => {
    expect(source).not.toContain('.invoke("send-email"');
    expect(source).toContain('pending manual review');
  });
});
