import { expect, test as base } from '@playwright/test';

import { TEST_ORIGIN } from '../test-config.js';

const stubbedStaticOrigins = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]);

export const test = base.extend({
  externalNetworkGuard: [async ({ context }, use) => {
    const unexpectedExternalRequests = new Set();

    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());

      if (url.origin === TEST_ORIGIN) {
        await route.continue();
        return;
      }

      if (stubbedStaticOrigins.has(url.origin)) {
        await route.fulfill({ status: 204, body: '' });
        return;
      }

      unexpectedExternalRequests.add(`${route.request().method()} ${url.origin}${url.pathname}`);
      await route.fulfill({
        status: 599,
        contentType: 'text/plain',
        body: 'External network access blocked by the Playwright safety guard.',
      });
    });

    await use();
    expect([...unexpectedExternalRequests], 'Playwright attempted external network access').toEqual([]);
  }, { auto: true }],
});

export { expect };
