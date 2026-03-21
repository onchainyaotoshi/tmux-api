# Tmux Visual Tutorial Website — Design Spec

## Overview

Website pembelajaran interaktif untuk fitur-fitur inti tmux, disajikan secara visual dalam bahasa Indonesia. Dockerized, diakses via port 9997.

**Target audiens:** Pengguna tmux yang ingin mendalami fitur lanjutan.

## Stack & Arsitektur

- **Frontend:** React + Vite (SPA)
- **Styling:** CSS Modules
- **Serving:** Nginx (alpine)
- **Container:** Docker multi-stage build
- **Port:** 9997 (host) → 80 (container)
- **Backend:** Tidak ada — pure static site

## Struktur Direktori

```
tmux-management/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Section.jsx
│   │   ├── TerminalSimulator.jsx
│   │   └── DiagramPane.jsx
│   ├── sections/
│   │   ├── SessionSection.jsx
│   │   ├── WindowSection.jsx
│   │   ├── PaneSection.jsx
│   │   ├── NavigationSection.jsx
│   │   ├── ResizeSection.jsx
│   │   └── CopyModeSection.jsx
│   └── styles/
└── public/
```

## Layout & Navigasi

**Pendekatan:** Single page scrollable dengan sidebar navigasi.

- **Sidebar:** Fixed di kiri, berisi daftar section. Scroll-spy untuk highlight section aktif. Collapse jadi hamburger menu di mobile.
- **Main content:** Area scroll di kanan sidebar, berisi section-section tutorial secara berurutan.

## Konten per Section

Setiap section memiliki struktur yang sama:

1. **Judul + penjelasan singkat** — deskripsi konsep dalam bahasa Indonesia
2. **Diagram visual** — SVG/CSS yang menggambarkan konsep
3. **Cheatsheet shortcut** — tabel key binding dengan highlight prefix `Ctrl+B`
4. **Simulasi terminal** — div styled seperti terminal, tombol interaktif yang trigger animasi CSS

### 6 Section:

| # | Section | Konten |
|---|---------|--------|
| 1 | Session | Apa itu session, create, attach, detach, list, kill |
| 2 | Window | Create, rename, switch, close window |
| 3 | Pane | Split horizontal/vertical, close pane |
| 4 | Navigasi | Pindah antar pane/window, shortcut keys |
| 5 | Resize | Resize pane dengan keyboard |
| 6 | Copy Mode | Scroll, search, copy-paste dalam tmux |

## Komponen UI

### Sidebar
- Fixed position di kiri
- List link ke setiap section
- Scroll-spy: highlight section yang sedang terlihat di viewport
- Responsive: collapse ke hamburger di layar kecil

### TerminalSimulator
- Container bergaya terminal (background hitam, font monospace, border radius)
- Menampilkan "output" tmux yang disimulasikan
- Tombol interaktif yang trigger animasi CSS (split pane, new window, dll)
- Animasi transisi saat state berubah (pane terbagi, window berpindah)

### DiagramPane
- SVG atau CSS-based diagram
- Menunjukkan hierarki: Session → Window → Pane
- Diagram relasi dan flow navigasi

### Section
- Wrapper reusable untuk setiap topik
- Props: title, description, children

## Docker Setup

### Dockerfile (multi-stage)
- **Stage 1:** `node:alpine` — install dependencies, build Vite
- **Stage 2:** `nginx:alpine` — copy build output, serve static files

### docker-compose.yml
- Single service `tmux-tutorial`
- Port mapping: `9997:80`
- Restart policy: `unless-stopped`

### Nginx Config
- Serve static files dari `/usr/share/nginx/html`
- SPA fallback: semua route → `index.html`

## Desain Visual

- **Tema:** Dark theme (cocok dengan estetika terminal)
- **Warna accent:** Hijau terminal (#00ff41) untuk highlight
- **Font:** Monospace untuk simulasi terminal, sans-serif untuk teks penjelasan
- **Animasi:** CSS transitions untuk simulasi terminal (split, resize, switch)

## Scope Boundaries

**Termasuk:**
- 6 section fitur inti tmux
- Simulasi terminal interaktif ringan (CSS animations)
- Diagram SVG/CSS
- Cheatsheet shortcut
- Docker deployment

**Tidak termasuk:**
- Plugin tmux (tpm)
- Hook & advanced scripting
- tmux.conf customization lengkap
- Pair programming setup
- Backend/database
- User authentication
