# University page browser regressions

Build the frontend and serve `frontend/build` with the existing SPA fallback server:

```bash
npm --prefix frontend run build
python3 tests/landing-regressions/spa_fallback_server.py frontend/build
```

In another shell, run:

```bash
BASE=http://localhost:4173 python3 tests/university-regressions/regress_uni.py
```
