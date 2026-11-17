# Secure Notes Frontend

Basic functional frontend for the Secure Notes interview task. Plain HTML, CSS,
and JavaScript, written without a template. Includes registration/login, private
note CRUD, public posts, and role-based admin views.

Backend source: https://github.com/tonmoybiswas07/securenotes

Live frontend: https://securenotes-frontend-liard.vercel.app

Live API: https://securenotes-api-rho.vercel.app

## Local development

Requires Node.js 24. Start the backend separately on port 5001, then:

```sh
cp .env.example .env
npm run dev
```

Open http://localhost:5173. No dependencies need installing for this buildless
frontend. `PUBLIC_API_BASE_URL` defaults to `http://localhost:5001/api`.

The backend's `CLIENT_ORIGIN` must be `http://localhost:5173` for local browser
requests. JWTs stay in browser memory; a page refresh signs out.

## Vercel

Import this repository as its own Vercel project. The included `vercel.json` sets
`npm run build` and output directory `dist`. Set `PUBLIC_API_BASE_URL` to the
backend's real HTTPS URL ending in `/api`. This is a public URL, not a secret.
The backend must allow this frontend's actual origin using `CLIENT_ORIGIN`.

```sh
npm run check
npm run build
```

The build copies static assets and generates `dist/config.js` from the public API
URL. Database credentials and JWT signing secrets belong only in the backend's
hosting environment; this project never needs them.
