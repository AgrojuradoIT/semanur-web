# Web hosting security

The production build copies `public/.htaccess` into `dist/.htaccess`. Deploy the
entire contents of `dist/`, including this hidden file. LiteSpeed/Apache must have
`mod_headers` and authorization directives enabled for the document root.

## Deployment requirements

1. Configure `VITE_API_BASE_URL` through CI or an untracked `.env.local` file.
   Production builds fail when the value is missing or is not HTTPS.
2. Build with `pnpm build`; never upload source archives, `.env` files, SQL dumps,
   logs, or test artifacts into the document root.
3. Delete legacy artifacts such as `dist.zip` from the server. The `.htaccess`
   deny rule is defense in depth, not a substitute for removal.
4. Confirm that these response headers are present after deployment:
   `Content-Security-Policy`, `Content-Security-Policy-Report-Only`,
   `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`,
   `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and
   `Cross-Origin-Resource-Policy`.
5. If the API or realtime host changes, update `connect-src` in
   `public/.htaccess` before deployment. Do not broaden it to `*`.

## CSP rollout

The enforced policy removes script injection, framing, plugins, base-tag
hijacking, and unapproved network connections while temporarily retaining
`'unsafe-inline'` for styles because the existing SPA uses Vue style bindings and
inline style attributes.

The report-only policy deliberately tests removal of inline styles and Trusted
Types enforcement. Violations appear in browser developer tools. Before adding a
`Reporting-Endpoints` header, create a same-origin authenticated/rate-limited
collector that strips query strings, tokens, and personal data. Observe real
traffic before moving report-only directives into enforcement.

Do not add `'unsafe-inline'` to `script-src` and do not add a wildcard to
`connect-src` to silence violations.
