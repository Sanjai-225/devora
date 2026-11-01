# Project Overview — Devora

## Product Vision

Devora is an AI-powered website development platform that allows users to create complete websites through natural-language instructions without manually writing all the code.

## What Devora Does

1. **Understands requirements** — User describes a website; the AI agent extracts structured requirements
2. **Asks smart clarifications** — Only essential questions; infers reasonable defaults
3. **Confirms technology stack** — Respects user choices, fills gaps, suggests when unspecified
4. **Offers optional design** — User can preview and iterate on visual design before building
5. **Generates a visual prototype** — Interactive Sandpack-rendered frontend prototype
6. **Collects configuration** — Only the credentials/settings the specific website needs
7. **Creates an implementation plan** — Shows what will be built, gets user approval
8. **Generates source code** — Real, structured, production-quality code
9. **Installs and runs** — Sets up dependencies, builds, and starts the application
10. **Tests automatically** — Runs build checks, browser tests, error analysis
11. **Provides live preview** — Separate preview URL per project
12. **Supports modifications** — Incremental edits without full regeneration
13. **Exports source code** — ZIP download with README and .env.example
14. **Optional GitHub push** — Push to user's own repository
15. **Optional deployment** — Deploy to Vercel/Render through user's account

## What Devora Is NOT

- Not a simple chatbot wrapper
- Not a template-based site builder
- Not a no-code drag-and-drop tool
- Not a hosting provider (it deploys to the user's own accounts)
- Not a replacement for professional developers (it's an accelerator)

## Target Users

- Developers who want to scaffold projects faster
- Technical founders building MVPs
- Designers who want functional prototypes
- Agencies handling multiple client websites
- Anyone with a clear website idea but limited coding time

## Core Principles

1. **User owns the code** — Downloaded source is fully independent
2. **No vendor lock-in** — All providers are replaceable adapters
3. **Security first** — Secrets never leak, projects are isolated
4. **Honest results** — Never fabricate test results or deployment status
5. **Incremental work** — Small changes don't regenerate everything
6. **Design is optional** — Users choose their workflow
7. **Free-tier friendly** — Built on open-source and free tiers where practical
