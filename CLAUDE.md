# Olive App

## Project overview
Olive App is my main project. Use this file as persistent project memory.

## Working rules
- Make minimal and safe changes.
- Follow the existing code style.
- Do not change the database schema without explicit approval.
- Prefer simple and maintainable solutions.
- If something is unclear, inspect the codebase before proposing changes.

## Main stack
- Frontend: React 19 + Vite + Tailwind CSS v4
- Backend: Supabase (BaaS)
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Deployment: Vercel
- Charts: Recharts
- Maps: Leaflet / React-Leaflet
- Excel export: ExcelJS

## Important folders
- src/ : tous les composants sont à plat ici, pas de sous-dossier components/ ou pages/
- src/supabase.js : client Supabase partagé
- src/DataProvider.jsx : context global React qui charge toutes les données Supabase
- src/dateUtils.js : utilitaires de dates

## Architecture données
- DataProvider.jsx est le point d'entrée unique pour les données (useAppData hook).
- Tous les formulaires sont des composants dédiés : FormulaireXxx.jsx.
- Resume.jsx est la page principale de synthèse.
- La navigation est basée sur un système d'onglets (ongletActif dans App.jsx).

## Domaine métier
Application de gestion d'exploitation oléicole (production d'olives).
Entités principales : Campagnes, Récolte, Ventes, Charges.

### Onglets de navigation
resume | campagnes | recolte | ventes | charges

### Types de charges (clés en base Supabase)
- main_oeuvre → "Main d'oeuvre"
- repas → "Repas"
- essence → "Essence"
- don → "Dons"
- vehicule → "Autres charges véhicules"
- equipement → "Équipements"

## Commands
- Install dependencies:
  npm install

- Start development:
  npm run dev

- Build production:
  npm run build

- Run tests:
  npm test

## Notes for Claude
- Always check existing patterns before creating new ones.
- Reuse existing components and utilities when possible.
- Keep changes aligned with the current architecture.
- When modifying a feature, consider impact on related files.

## Business context
- Olive App is a business project.
- Prioritize reliability and clarity over cleverness.
- Avoid unnecessary refactoring.