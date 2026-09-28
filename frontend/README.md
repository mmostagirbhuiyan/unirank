# unirank frontend

The frontend is a dependency-light Vite application. It reads the published ranking files from `public/data` and writes the deployable site to `build`.

## Development

Use Node.js 22.12 or newer. Install the exact tool version declared in `package.json`, then start the development server.

```bash
npm install
npm start
```

Run the frontend tests and production build with:

```bash
npm test
npm run build
```

## Environment

`VITE_BASE_PATH` controls the public asset path and defaults to `/`. `VITE_SITE_URL` is the absolute deployment root used for sitemap and robots output. Production values live in `.env.production`. Other targets can override either variable without changing the application code.
