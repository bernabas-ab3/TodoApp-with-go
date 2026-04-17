# Render Deployment

This project is prepared for Render with:

- `render.yaml` for a Blueprint-based setup
- automatic database migrations on startup
- default Render-friendly port handling (`10000`)

## What Render will create

- A Go web service named `focusflow-api`
- A Postgres database named `focusflow-db`

## Deploy steps

1. Push this repository to GitHub.
2. In Render, open `New` -> `Blueprint`.
3. Connect the GitHub repository.
4. Render will detect `render.yaml` and show the web service plus database.
5. Create the Blueprint.
6. Wait for the first deploy to finish.

## App URL

After deploy, open the Render web service URL, usually:

- `https://<your-service-name>.onrender.com`

## Important notes

- `JWT_SECRET` is generated automatically by Render from `render.yaml`.
- `DATABASE_URL` is wired from the managed Postgres instance automatically.
- Migrations run every time the app starts, so the schema is created on first deploy.
- The free plan may sleep when idle, so the first request can be slow.

## Sources used

- Render Go web service docs: https://render.com/docs/deploy-go-nethttp
- Render Blueprint reference: https://render.com/docs/blueprint-spec
- Render environment variables docs: https://render.com/docs/environment-variables
