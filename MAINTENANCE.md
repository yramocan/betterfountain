# Maintenance Assessment (Fork)

Assessment date: March 2025. This document summarizes the state of the fork and recommended updates.

---

## 1. Security (npm audit)

### Done (March 2025 maintenance)
- **`npm audit fix`** applied; then **Jest 29** and **@vscode/test-electron** (replacing vscode-test), **d3 v7** (stats webview), **TypeScript 5**, **@types/node** ^20, **pdfkit** ^0.15, **textbox-for-pdfkit** ^0.2.3, **webpack** `mode: 'production'`.
- Vulnerability count reduced from **78 → 7 moderate** (remaining in transitive dev deps).

### Remaining (~7 moderate)

- Mostly transitive; run `npm audit` for current list. No critical/high in direct or key runtime deps.

---

## 2. Outdated Dependencies (npm outdated)

- **Addressed:** @types/vscode ^1.74, @types/node ^20, typescript ^5.6, pdfkit ^0.15, textbox-for-pdfkit ^0.2.3, jest 29, ts-jest 29, d3 v7, webpack mode set.
- **Optional later:** @vscode/extension-telemetry (telemetry is no-op without aiKey), @vscode/codicons, css-loader 7.x.

---

## 3. Deprecated / Manifest

- **activationEvents:** Still valid. VS Code 1.74+ can infer many events; you can keep the current list or trim it later. No change required.
- **vscode-test:** Deprecated in favor of **@vscode/test-electron**. Update when touching tests.
- **vscode-extension-telemetry:** Renamed to **@vscode/extension-telemetry**. Plan to swap the dependency and import when doing telemetry changes.
- **createStatusBarItem(alignment, priority):** Two-argument form is still supported; no change required unless you want to adopt the newer overloads.

---

## 4. Telemetry and `aiKey`

- **Done:** `aiKey` removed from package.json. Telemetry is **no-op** when no key is present (reporter only created if `packageinfo?.aiKey`). Extension ID centralized as `FOUNTAIN_EXTENSION_ID` (fork: `yramocan.betterfountain`) with fallback to upstream for compatibility.

---

## 5. Tooling and Config

- **Done:** `engines`: `vscode: ^1.74.0`, `node: >=18`. TypeScript 5, webpack stats config has `mode: 'production'`.
- **TypeScript:** target/lib still `es6`; can move to `es2020`+ later if desired.

---

## 6. Recommended Order of Work

- **Completed in March 2025:** Fork metadata and engines, telemetry no-op, Jest 29 + @vscode/test-electron, d3 v7 (stats webview), TypeScript 5, @types/node and @types/vscode, pdfkit and textbox-for-pdfkit, webpack mode. Test fixtures updated for current FountainConfig/ExportConfig.
- **Later:** Migrate to **@vscode/extension-telemetry** if re-enabling telemetry; optionally **css-loader** 7.x and **@vscode/codicons** refresh.

---

## 7. Build and Tests

- **Compile:** `npm run compile` — succeeds.
- **Tests:** `npm test` — scenenumbering suite passes. Statistics suite may hit a Node 23–specific crash (fs/internal); run on Node 18/20 LTS if needed.
