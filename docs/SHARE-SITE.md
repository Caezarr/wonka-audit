# Shareable Website Contract

## Product boundary

The detailed HTML, PDF, JSON and methodology remain local. Public sharing is a separate, explicit action:

```bash
npx wonka-audit --share
```

This creates the private audit and a separate `public-share/` website in one run. Existing exports and canonical URLs remain available as advanced operator options.

The bundle contains only:

- `index.html`;
- `share-card.svg`;
- `public-share.json`.

It excludes organization, team, participant pseudonym, source coverage, file paths, prompt text, raw conversations and token details. The page is `noindex,nofollow` and exposes an explicit directional-score disclaimer.

## Hosting phases

### Phase 1: static bundle

Upload the generated directory to an approved static host. The `--share-url` must be its final HTTPS URL so LinkedIn receives canonical Open Graph metadata.

### Phase 2: Wonka share service

The recommended hosted product should accept only `public-share.json`, never the full audit. Required controls:

- random 128-bit opaque URL;
- explicit preview and publish confirmation;
- expiration: 7, 30 or 90 days;
- one-click revocation through a separate secret delete token;
- no analytics cookies by default;
- rate limiting and abuse reporting;
- immutable payload after publication;
- server-side PNG rendering for LinkedIn Open Graph previews;
- CSP, HSTS and `X-Content-Type-Options: nosniff`;
- tenant-configurable sharing disable switch.

## LinkedIn limitation

LinkedIn does not support pre-filling arbitrary post text from a normal web link. The page therefore uses the shortest reliable flow: one click copies the complete privacy-safe draft and opens LinkedIn; the user pastes it into the composer. When a canonical `--share-url` is present, LinkedIn also receives that public URL for its link preview.

The local bundle includes an SVG card. LinkedIn preview reliability is best with a server-rendered 1200×627 PNG. The future share service should render that PNG from the same public payload and expose it as `og:image`.
