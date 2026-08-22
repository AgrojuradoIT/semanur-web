export const TEST_HOST = '127.0.0.1';
export const TEST_PORT = 5173;
export const TEST_ORIGIN = `http://${TEST_HOST}:${TEST_PORT}`;
export const TEST_API_BASE_URL = `${TEST_ORIGIN}/__api__`;

const parsedTestApiUrl = new URL(TEST_API_BASE_URL);
if (parsedTestApiUrl.hostname !== TEST_HOST || parsedTestApiUrl.protocol !== 'http:') {
  throw new Error('Playwright API target must remain on the configured loopback host.');
}
