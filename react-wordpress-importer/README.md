# React WordPress Importer (SPA)

## Status (Jan 27, 2026)
- Upload + parse + IndexedDB save is working (worker + main-thread fallback).
- Posts/Pages/Tags/Categories/Authors/Comments/Attachments/Post Meta views are wired.
- Post editor added (local-only edits).
- Media Manifest view is working.
- Content QA screen added (flags formatting issues + word stats).
- SEO Audit + Remediation dashboard added (missing titles/desc).
- Taxonomy Cleaner added (similar tag clustering + merge).
- Knowledge Graph prep added (internal link graph JSON export).
- BlogCMS exports available: JSON, CSV, ZIP bundles.
- BlogCMS export pack + API import screen added.
- Asset Laundromat export added (clean media zip + rewritten references).

Known gaps / issues:
- Internal Links view can lag on large datasets (now capped by default; Load all optional).
- Cleanup tools implemented (clear DB, remove empty posts/pages).
- BlogCMS export pack implemented (JSON/CSV/ZIP).

## Run
```
npm install
npm run dev
```

## Import flow
1) Upload WXR XML
2) Parse + map (in worker or main thread)
3) Store in IndexedDB
4) Browse views / edit posts locally
