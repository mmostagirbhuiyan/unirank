# Landing page browser regressions

Build the frontend and serve `frontend/build` with an SPA fallback:

```bash
npm --prefix frontend run build
python3 tests/landing-regressions/spa_fallback_server.py frontend/build
```

`SERVE_ROOT`, `BIND`, and `PORT` are environment-variable equivalents for the fallback server inputs.

Then, in another shell, run:

```bash
BASE=http://localhost:4173 python3 tests/landing-regressions/test_landing_regressions.py
```

The service worker migration test needs a built copy of the former CRA deployment. It uses `frontend/build` as the new deployment, creates its own temporary working directory, and starts the fallback server itself:

```bash
python3 tests/landing-regressions/test_sw_migration.py --old-build /path/to/former-cra-build
```

`SW_OLD_BUILD`, `SW_NEW_BUILD`, `SW_WORK_DIR`, and `SW_BASE` are environment-variable equivalents for all migration inputs. The default `*.localhost` host is required because plain `localhost` suppresses the reproduced migration behavior.
