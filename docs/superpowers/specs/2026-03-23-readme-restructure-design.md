# README Restructure Design

## Problem

The current README leads with 3 large mermaid diagrams before showing installation instructions. For the primary audience (developers who want to self-host), this creates friction — they have to scroll past architecture details to find how to install.

## Design

Reorder README sections to prioritize installation and usage. No content changes — purely structural.

### New Section Order

1. **Header** — title, npm badge, one-line description
2. **Quick Start** — Prerequisites, Local (Production), Local (Development), Docker, Expose to Internet
3. **Node.js SDK** — install + code example
4. **Usage Examples (curl)** — curl examples
5. **API Endpoints** — Authentication, Sessions, Windows, Panes tables, Scalar docs link
6. **Use Cases** — foreman reference
7. **Development** — dev commands
8. **Architecture** — 3 mermaid diagrams (Architecture, API Flow, Docker) moved here
9. **Project Structure** — tree
10. **License** — MIT

### Principles

- Install first, use second, deep dive last
- Target audience: developers who want to self-host
- No content added or removed — reorder only
