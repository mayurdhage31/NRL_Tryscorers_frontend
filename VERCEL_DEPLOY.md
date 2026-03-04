# Seeing changes at https://nrl-tryscorers-frontend.vercel.app/

1. **Frontend** — Pushes to this repo trigger an automatic Vercel redeploy. Your latest UI is live after the build completes.

2. **Backend** — Deploy [NRL_TryScorers_backend](https://github.com/mayurdhage31/NRL_TryScorers_backend) (e.g. Railway, Render). In Vercel → this project → **Settings → Environment Variables**, set:
   - `NEXT_PUBLIC_API_URL` = your deployed backend URL (e.g. `https://your-backend.up.railway.app`)

3. **Redeploy** — After changing env vars, trigger a redeploy (Vercel → Deployments → ⋮ → Redeploy) so the site uses the new API URL.

4. **CORS** — On the backend, set `CORS_ORIGINS` to include `https://nrl-tryscorers-frontend.vercel.app`.
