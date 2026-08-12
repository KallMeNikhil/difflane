# Difflane — Docker

`docker-compose.yml` runs the core application stack (client, server, PostgreSQL) for local
development.

`docker-compose.judge0.yml` runs a self-hosted Judge0 execution backend on an internal-only
Docker network for the Terminal + Code Execution feature. It is deployed and operated separately
from the core stack. See `../docs/TERMINAL_EXECUTION_INFRASTRUCTURE.md` for the full architecture,
the Judge0/gVisor deployment boundary decision, and the manual verification checklist required
before enabling code execution against real infrastructure.
