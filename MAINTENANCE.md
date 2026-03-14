# Maintenance Assessment (Fork)

Assessment date: March 2025. This document summarizes the state of the fork and recommended updates.

---

## 1. Security (npm audit)

### Done
- **`npm audit fix`** was run; it applied safe updates and reduced vulnerabilities from **78 → 55** (23 fixed).
- Patched packages include: Babel, diff, webpack, koa, lodash, minimatch, and others.

### Remaining (55 vulnerabilities)

Most remaining issues are in **devDependencies** (not shipped to users):

| Source | Severity | Fix | Notes |
|--------|----------|-----|--------|
| **jest** (24.x) | moderate/high | Upgrade to jest@29 | Breaking; requires migrating tests (e.g. jest.config, globals). Fixes braces, form-data, node-notifier, qs, tough-cookie, yargs-parser (via ts-jest). |
| **vscode-test** (1.6.x) | high | Replace with `@vscode/test-electron` | Deprecated package; pulls in @tootallnate/once / http-proxy-agent. |
| **d3** (5.x) | high (ReDoS) | Upgrade to d3@7 | Breaking; stats webview uses d3. |
| **css-loader** (4.x) | moderate | Upgrade to 7.x | Breaking for webpack; may need style-loader update. |
| **ts-jest** (24.x) | moderate | Upgrade with jest to 29 | yargs-parser vuln. |

**Recommendation:** Treat runtime (production) deps as higher priority than test/build-only. The only **production** dependency with remaining audit issues is **d3** (used in the statistics webview). Upgrading d3 to v7 would fix the d3-color ReDoS and is the one runtime-related change to plan for.

---

## 2. Outdated Dependencies (npm outdated)

Notable gaps (current → latest):

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| **@types/vscode** | 1.75 (installed) | 1.110 | Bump to match target VS Code API. |
| **@types/node** | 8.10.66 | 25.x | Very old; bump to ^18 or ^20 LTS. |
| **typescript** | 4.9.5 | 5.9.x | Safe to bump to 5.x for better checking. |
| **pdfkit** | 0.12.3 | 0.17.2 | Check changelog for breaking changes. |
| **webpack** | 5.88 → 5.105 (after audit fix) | 5.105 | Already updated by audit fix. |
| **vscode-extension-telemetry** | 0.3.2 | 0.4.5 / **@vscode/extension-telemetry** | Package was renamed; consider migrating. |
| **textbox-for-pdfkit** | 0.2.1 | 0.2.3 | Patch-level. |
| **@vscode/codicons** | 0.0.32 | 0.0.45 | Optional refresh. |

---

## 3. Deprecated / Manifest

- **activationEvents:** Still valid. VS Code 1.74+ can infer many events; you can keep the current list or trim it later. No change required.
- **vscode-test:** Deprecated in favor of **@vscode/test-electron**. Update when touching tests.
- **vscode-extension-telemetry:** Renamed to **@vscode/extension-telemetry**. Plan to swap the dependency and import when doing telemetry changes.
- **createStatusBarItem(alignment, priority):** Two-argument form is still supported; no change required unless you want to adopt the newer overloads.

---

## 4. Telemetry and `aiKey`

- **package.json** has an **`aiKey`** (Application Insights instrumentation key). It is used in **src/telemetry.ts** to send events to the original author’s Azure Application Insights.
- **For the fork:** Either remove telemetry, make it a no-op, or replace with your own key and privacy policy. Leaving the original key would send your users’ usage data to the upstream author’s tenant.

---

## 5. Tooling and Config

- **TypeScript:** target `es6`, lib `es6`. Fine for extension host; could move to `es2020`+ later.
- **Node:** No `engines` field; de facto Node 18+ is typical for current VS Code extension development.
- **VS Code engine:** `^1.62.0`. Reasonable; can bump to e.g. `^1.74.0` if you rely on implicit activation, or leave as-is for wider compatibility.

---

## 6. Recommended Order of Work

1. **Low risk, high value**
   - Update **repository / bugs / sponsor** URLs in package.json to point to your fork (and remove or replace **aiKey** / telemetry if you don’t want to send data upstream).
   - Bump **@types/vscode** to the version matching your minimum VS Code (e.g. 1.110 if you support recent releases).
   - Bump **textbox-for-pdfkit** to 0.2.3.
   - Add **engines** (e.g. `"node": ">=18"`) and optionally bump **vscode** engine.

2. **Security (runtime)**
   - Upgrade **d3** to v7 and fix any stats webview API changes (only production dependency with an open audit finding).

3. **Security (dev)**
   - Replace **vscode-test** with **@vscode/test-electron** and update test scripts.
   - Upgrade **jest** to 29 and **ts-jest** to 29, then fix test config and any breaking changes.

4. **Later**
   - Migrate **vscode-extension-telemetry** → **@vscode/extension-telemetry** (or remove telemetry).
   - Consider **TypeScript 5** and **pdfkit** upgrade after checking changelogs.
   - Optionally modernize **webpack** config (e.g. set `mode`, reduce stats bundle size).

---

## 7. Build and Tests After `npm audit fix`

- **Compile:** `npm run compile` — succeeds.
- **Tests:** Not run in this assessment. Run `npm test` after any jest/ts-jest/vscode-test changes.
