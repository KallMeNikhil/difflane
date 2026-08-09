# DIFFLANE

**A browser-based real-time collaborative coding workspace with integrated code review and discussion.**

Difflane is a collaborative development platform that brings coding,
discussions, and code review into a shared workspace. Instead of
switching between multiple tools, teams can work together in a single
environment while keeping their repositories synchronized with their
workspace.

------------------------------------------------------------------------

## Table of Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Repository Structure](#repository-structure)
-   [Getting Started](#getting-started)
-   [Available Scripts](#available-scripts)
-   [Docker](#docker)
-   [Continuous Integration](#continuous-integration)
-   [Documentation](#documentation)
-   [Contributing](#contributing)
-   [License](#license)
-   [Authors](#authors)

------------------------------------------------------------------------

## Overview

Difflane is designed for collaborative software development. It provides
a shared coding workspace where collaborators can edit code, discuss
changes, review implementations, and synchronize projects from connected
repositories.

Unlike traditional review-first platforms, collaboration is the primary
workflow while code review is integrated naturally into the development
experience.

### Intended Users

-   Software engineering teams
-   Student project groups
-   Open-source contributors
-   Academic collaborations
-   Developers working remotely

------------------------------------------------------------------------

## Features

### Current

-   Responsive React application
-   Modern dark interface
-   Workspace creation and joining
-   Shared component architecture
-   Client-side validation
-   Reusable layouts and design system
-   Collaborative workspace
-   Monaco code editor
-   File explorer
-   Diff viewer
-   Discussion panel
-   Live collaboration
-   GitHub repository synchronization
-   Session history and summaries
-   Notifications
-   Global search

------------------------------------------------------------------------

## Technology Stack

  Category     Technology
  ------------ -------------------------
  Frontend     React, TypeScript, Vite
  Styling      Tailwind CSS
  Routing      React Router
  Animation    Framer Motion
  Backend      Node.js, Express
  Real-time    Yjs, Socket.io
  Editor       Monaco Editor
  Repository   GitHub API
  Tooling      npm, Git, GitHub

------------------------------------------------------------------------

## Repository Structure

``` text
apps/          Applications
packages/      Shared packages
docs/          Project documentation
docker/        Container configuration
.github/       GitHub workflows and templates
```

------------------------------------------------------------------------

## Getting Started

### Prerequisites

-   Node.js (LTS)
-   npm
-   Git
-   PostgreSQL 14+ (or use `docker compose up postgres` from the
    [Docker](#docker) section instead of a local install)

### Installation

``` bash
git clone <repository-url>
cd difflane
npm install
```

### Environment

Copy the example environment files and adjust values as needed:

``` bash
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env
```

`apps/server/.env.example` documents every variable the server reads,
including safe development defaults for JWT secrets and rate limits.
`GOOGLE_OAUTH_*` and `GITHUB_OAUTH_*` can be left blank in development;
only the corresponding sign-in provider will be unavailable until real
OAuth app credentials are supplied. Set `DATABASE_URL` to point at a
running PostgreSQL instance (see Database below).

### Database

Point `DATABASE_URL` in `apps/server/.env` at a running PostgreSQL
instance, then apply the schema:

``` bash
npx prisma migrate deploy --schema apps/server/prisma/schema.prisma
```

Use `npx prisma migrate dev --schema apps/server/prisma/schema.prisma`
instead during active schema development, as it also creates new
migrations from schema changes. `npm run build -w apps/server` and
`npm run typecheck -w apps/server` regenerate the Prisma client
automatically (`prebuild`/`pretypecheck` scripts); run
`npm run prisma:generate -w apps/server` directly if you only need to
regenerate the client without a full build or typecheck.

### Development

``` bash
npm run dev
```

Client: http://localhost:7777 · Server: http://localhost:4000

------------------------------------------------------------------------

## Available Scripts

``` bash
npm run dev         # Start development server
npm run build       # Production build
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript type checking
```

------------------------------------------------------------------------

## Docker

Difflane can run fully containerized for local development or
production. See [`docker/README.md`](docker/README.md) for a quick
start and [`docs/DOCKER_AND_CI.md`](docs/DOCKER_AND_CI.md) for full
architecture, environment variables, and troubleshooting.

``` bash
cd docker
cp .env.example .env
docker compose up --build
```

------------------------------------------------------------------------

## Continuous Integration

Every push and pull request runs through GitHub Actions
(`.github/workflows/ci.yml`): install, Prisma generate, typecheck,
lint, build, and a Docker image build validation step. See
[`docs/DOCKER_AND_CI.md`](docs/DOCKER_AND_CI.md) for pipeline details
and troubleshooting common CI failures.

------------------------------------------------------------------------

## Documentation

Additional technical documentation, design specifications, and
implementation guides are available in the `docs/` directory.

------------------------------------------------------------------------

## Contributing

Contributions are welcome.

Before submitting changes:

-   Keep implementations consistent with the existing project structure.
-   Reuse existing components whenever possible.
-   Ensure the project builds successfully.
-   Ensure linting and type checking pass.
-   Open an issue before proposing major architectural or feature
    changes.

------------------------------------------------------------------------

## License

This project is licensed under the **MIT License** unless stated
otherwise.

------------------------------------------------------------------------

## Authors

**Difflane Development Team**