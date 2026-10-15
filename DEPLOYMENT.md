# IKORI Vercel deployment

## Seeded frontend deployment

The frontend is intentionally deployable without the ML backend. Do not set a live API URL for the seeded demo.

1. Import the repository into Vercel.
2. Keep the detected framework as **Vite**.
3. Leave the install, build, and output settings on their repository defaults. `vercel.json` pins them to `npm ci`, `npm run deploy:check`, and `dist`.
4. Set `VITE_FABLE_MODE=recording` and `VITE_DEMO_MODE=true` if environment variables are configured explicitly.

`vercel.json` preserves SPA deep links including `/product`, `/results`, `/product/case/:id`, and `/complete-simulation`. Static hosts that recognize Netlify-style redirect files can use the included `public/_redirects` fallback.

## Switching to the backend

When the API is ready, configure these Vercel environment variables:

```text
VITE_FABLE_MODE=live
VITE_DEMO_MODE=false
VITE_API_URL=https://your-api.example.com
```

The backend must allow the deployed Vercel origin through CORS and return the versioned analysis contract in `src/api/analysisContract.ts`. Never store service credentials in `VITE_*` variables because Vite exposes them to the browser.

## Pre-deploy verification

```bash
npm ci
npm run deploy:check
```

The same check runs in GitHub Actions for every push and pull request to `main`. It type-checks the app, runs the deterministic tests, creates the production bundle, and verifies the emitted artifact plus SPA routing configuration.

The checked-in `.npmrc` keeps dependency resolution consistent across local machines, GitHub Actions, and Vercel while the React visualization packages complete their React 19 peer-dependency transition.

After deployment verify `/`, `/product?view=3d-graph`, `/product?view=matrix`, `/product?view=access-requests`, `/results`, `/complete-simulation`, and a direct `/product/case/104` load.
