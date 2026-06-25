# Security Follow-Up

## Dependency Audit Follow-Up

Current state after the immediate dependency patch:

- `my-app`: `npm audit` reports `0 vulnerabilities`.
- `backend`: `npm audit` reports `8 moderate vulnerabilities`, all from the
  `firebase-admin -> @google-cloud/firestore/@google-cloud/storage -> uuid` chain.

## Remaining Backend Item

### Firebase Admin transitive `uuid` advisory

- Advisory: `uuid < 11.1.1` missing buffer bounds check when v3/v5/v6 are called with
  an explicit buffer.
- Current path:
  - `firebase-admin@13.10.0`
  - `@google-cloud/firestore@7.11.6`
  - `google-gax@4.6.1`
  - `gaxios` / `teeny-request` / `retry-request`
  - `uuid`
- Current severity: moderate.
- Practical risk in this app appears limited because the backend does not call uuid
  v3/v5/v6 directly with user-controlled buffers; the vulnerable package is transitive.

## Recommended Next Step

Handle this in a focused Firebase Admin upgrade task:

1. Test `firebase-admin@14.x` in a branch.
2. Verify Firebase Admin initialization with the existing env-based service-account fields.
3. Verify `verifyIdToken` through protected backend routes.
4. Verify registration/login/profile flows from the frontend against the backend.
5. Run:
   - `cd backend && npm run build && npm test && npm audit`
   - `cd my-app && npm run build && npm run lint && npm test`
6. If `firebase-admin@14.x` is not compatible, consider a documented npm `overrides`
   strategy only after confirming it does not break Firestore/Auth/Admin SDK behavior.

## Recurring Gate

Before launch and before dependency-sensitive releases:

```bash
cd backend && npm audit --omit=dev
cd my-app && npm audit --omit=dev
```

Use full `npm audit` for maintenance visibility, but treat `--omit=dev` as the runtime
release gate.
