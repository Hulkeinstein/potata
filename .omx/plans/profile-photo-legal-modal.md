# Profile photo and legal modal

## Goal

Complete the onboarding profile experience without changing the existing authentication or consent semantics.

## Scope

- Add an optional profile-photo control to profile onboarding.
- Preserve the Google profile photo as the initial value when present.
- Allow a signed-in user to upload, preview, replace, and remove their own photo.
- Store profile photos through a dedicated Supabase Storage bucket configuration and persist only the resulting public URL in `User.avatar`.
- Show Terms, Privacy, and Marketing text in an accessible modal without leaving onboarding.
- Keep the existing standalone legal pages as canonical linkable pages.
- Fail closed when Storage is not configured; never fabricate or persist a local-only URL.

## TODOs

- [x] 1. Lock contracts with failing tests
  - Avatar API rejects unauthenticated, invalid type, oversized file, and foreign operations.
  - Avatar API accepts a valid image and supports replacement/removal with cleanup.
  - Onboarding UI shows current image, local preview, change/remove states, and clear upload errors.
  - Legal links open a modal with the correct versioned document, close button, Escape, overlay close, focus containment, and focus restoration.

- [x] 2. Add profile image storage and owner-only API
  - Add a dedicated profile bucket environment variable and storage helpers.
  - Add authenticated POST/DELETE routes that derive the owner from the server session.
  - Validate MIME, extension, size, and empty payload at the API boundary.
  - Persist the public URL transactionally and clean up replaced uploads after a successful update.

- [x] 3. Share legal document content
  - Move the three versioned document definitions to one typed module.
  - Make standalone pages and modal render the same source of truth.
  - Preserve the current pre-launch/legal-review wording and version.

- [x] 4. Build onboarding photo and legal modal UX
  - Add optional circular preview with Google/current image fallback.
  - Upload only on explicit user action, show progress, replacement, and removal.
  - Replace new-tab legal links with modal triggers and retain a secondary full-page link.
  - Match the existing dark premium visual language on desktop and mobile.

- [x] 5. Verification and cleanup
  - Run focused tests, full tests, typecheck, lint, and production build.
  - Perform real desktop and mobile browser QA for preview, modal close paths, focus restoration, and failure messaging.
  - Confirm no secrets, test users, uploads, screenshots, or debug logs enter tracked changes.

## Guardrails

- No schema migration: `User.avatar` already exists.
- No changes to Google OAuth, login callbacks, consent requirements, or legal acceptance recording.
- No upload if Supabase profile storage configuration is absent.
- No arbitrary remote URL input and no client-supplied user ID.
- Do not alter product, OOTD, or review storage behavior.

## Acceptance

- A new Google user sees their Google photo by default and can keep it unchanged.
- A signed-in user can preview and upload a supported profile image, replace it, or remove it.
- Invalid/oversized images and missing Storage configuration produce safe actionable errors.
- Each legal document opens in-place, can be closed immediately by button/Escape/overlay, restores focus, and has a full-page link.
- Existing standalone legal URLs continue to render identical content.
- Focused and full quality gates pass.
