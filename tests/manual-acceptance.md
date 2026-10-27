# Connected-service acceptance checklist

Run these against an isolated PostgreSQL database and Midtrans Sandbox before production:

- Run migrations twice; second run must be a no-op. Bootstrap owner twice; password must not reset.
- Register customer, verify email, log in. Access `/admin` and every `/api/admin/*` operation as customer: denied.
- Owner: create draft project; public page must 404. Publish; page appears without deployment. Edit/archive and verify.
- Upload public PNG, video and optimized GLB using direct Blob upload. Test callback metadata and progress.
- Upload private ZIP via signed S3 PUT. Anonymous GET of bucket object must deny. Attach it to draft product, set two license prices, publish.
- Edit hero text, image, accent and section order. Reload public site from another session.
- Customer: add product, select license, submit invalid price fields/coupon. Server must use database prices.
- Run Midtrans Sandbox success, expiry, deny and refund. Re-send webhook. Exactly one entitlement per order item. Invalid signature must deny.
- Visit success URL without payment: order must remain PENDING. Poll order status from account.
- Concurrent coupon checkouts at usage limit: no oversubscription; serialization failure can be retried by customer.
- Customer A downloads owned asset; customer B and anonymous users must get 403/401. Revoked/refunded entitlement must deny.
- Test a GLB with animation clips; inspect rotate, zoom, pan, reset, wireframe, playback, fullscreen and screenshot.
- Submit contact/commission and verify database inbox. Repeated submits must rate-limit.
- Interrupt email service; order and entitlement remain committed. Retry outbox after restoring email.
- Change password, then attempt access from old session: denied.
- Test mobile widths 360/390/768 and desktop 1440. Keyboard navigation, focus and reduced-motion settings.
- Configure bucket CORS for exact origin, test upload rejection for wrong MIME/size and path.

These connected-service tests are not reported as passed without real services and credentials.
