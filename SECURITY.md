# Security

Report a suspected vulnerability privately through the repository owner's GitHub profile. Do not include credentials in public issues.

All generation, image and LinkedIn routes require a server-verified application session. Unsafe requests also require an exact Origin match and a session-bound CSRF header. Credentials are compared on the server. Sessions and LinkedIn credentials use authenticated encryption via jose (A256GCM), HttpOnly cookies and Secure cookies on HTTPS. OAuth state is random, expires after ten minutes and is tied to the signing-in session.

## Operational limits

* This is a single-owner app. Login is limited globally to ten attempts per five-minute bucket; generation is ten requests per owner per minute. A denial-of-service against login is still possible.
* Memory rate limits are process-local. Set both Redis REST variables for shared enforcement; configured Redis errors fail closed.
* Logout deletes browser cookies. Stateless tokens already stolen remain valid until expiry. Rotating SESSION_SECRET invalidates all sessions; changing APP_PASSWORD invalidates app sessions too.
* Secure production operation requires an HTTPS APP_URL and a strong random SESSION_SECRET. Never put secrets in VITE_ variables or source control.
* Generated carousel HTML runs in a sandboxed iframe. Provider content is escaped when rendered. Review model output before publishing.
* No automated test contacts paid generation providers or publishes to LinkedIn. Real provider permissions, quota and supported API version require deployment validation.
* Browser-local topics and draft history are not encrypted and are not a backup. Clearing site storage removes them.
