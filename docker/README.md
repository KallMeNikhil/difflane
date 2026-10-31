# Difflane — Docker

`docker-compose.yml` runs the core application stack (client, server, PostgreSQL) for local
development.

Code execution and the terminal need no extra containers:

- **Run** sends the workspace snapshot to a hosted [Judge0](https://judge0.com) API. By default the
  server uses the free public instance at `https://ce.judge0.com`. For real traffic, set
  `JUDGE0_BASE_URL` / `JUDGE0_AUTH_HEADER` / `JUDGE0_AUTH_TOKEN` in `apps/server/.env` to a paid
  plan (for example RapidAPI: `https://judge0-ce.p.rapidapi.com` with `X-RapidAPI-Key`) or to a
  self-hosted Judge0 running on a Linux host with cgroup v1. Self-hosted Judge0 does **not** work
  under Docker Desktop (cgroup v2).
- **Terminal** is a virtual shell that runs in the browser against the shared workspace files, so
  it behaves identically locally and in production.
