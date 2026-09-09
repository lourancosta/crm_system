# Contributing

## Branching model

This repo uses trunk-based development:

- `main` is protected and always deployable. No one pushes to it directly — all changes land via Merge Request.
- Work happens on short-lived branches cut from `main`:
  - `feature/short-description` — new functionality
  - `fix/short-description` — bug fixes
  - `chore/short-description` — tooling, deps, refactors with no behavior change

Keep branches small and short-lived. Rebase on `main` before opening a Merge Request if it's fallen behind.

## Workflow

1. Create a branch off `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b feature/short-description
   ```
2. Commit your changes with clear, descriptive messages.
3. Push the branch and open a Merge Request into `main`.
4. Fill in what changed and why. Link any related issue/ticket.
5. Request review. At least **1 approval** is required before merging.
6. Once approved and pipelines pass, merge using **squash and merge**, and delete the source branch.

## Merge Request requirements

- CI pipeline (lint/build/test) must pass.
- No direct pushes or force-pushes to `main` — it's a protected branch.

## Commit messages

Write commit messages that explain _why_, not just _what_. Keep the subject line concise; use the body for context if needed.

## Local setup

See `README.md` for environment setup and running the app locally.
