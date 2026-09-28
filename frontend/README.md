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

`VITE_BASE_PATH` is the only deployment-specific setting. It defaults to `/`. Set it to the public path, including its trailing slash, when the application is served below an origin root.
