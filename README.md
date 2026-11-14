# House Concept Studio

The expanded application is in this folder. Start locally without Docker or API keys:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Open http://127.0.0.1:5173/ and use your existing admin account.

Read [GUIDE.md](GUIDE.md) for the full workflow, optional AI/GPU configuration, native VPS deployment, backups, verification and practical design limits.

For a directly rented GPU (including the selected AIC RTX 4090), follow [GPU-SETUP.md](GPU-SETUP.md). This path supports a local application through SSH without a public VPS. Blender and the supplied worker must be running on the rental; an API key alone is insufficient. API source changes require restarting the local server; Vite still reloads frontend changes automatically.

See [the latest build report](BUILD-REPORT-2026-11-14.md) for delivered changes, verification and remaining live GPU/browser checks.
