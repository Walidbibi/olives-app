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

## UX/UI — Améliorations identifiées (session 2026-05-09)
Revue complète effectuée. Liste priorisée à implémenter lors des prochaines sessions.

### HAUTE priorité (bloquant pour l'usage mobile)
- [ ] **Tables → cards sur mobile** : Les tableaux Récolte, Ventes, Charges nécessitent un scroll horizontal sur téléphone. Basculer vers une vue en cartes sur petit écran (<768px).
- [ ] **Validation temps réel des formulaires** : Les erreurs n'apparaissent qu'au submit. Ajouter validation pendant la saisie.
- [x] **Messages de chargement spécifiques** : Remplacer "Chargement..." par des messages précis ("Chargement des récoltes..."). Afficher une erreur visible si la requête échoue (pas de spinner infini). ✅ Fait en session 2026-05-10 — messages précis dans tous les formulaires + DashboardTracteur, bouton Réessayer sur l'écran d'erreur global.
- [x] **Selects filtrables** : Les listes déroulantes (équipements, parcelles) ne sont pas recherchables. Ajouter un champ de recherche/autocomplete. ✅ Fait en session 2026-05-10 — composant SearchableSelect réutilisable, appliqué sur 5 selects (parcelles × 3, équipements × 2).
- [ ] **Fil d'Ariane dans la navigation imbriquée** : Quand l'utilisateur est dans Profil > Équipements > Dashboard Tracteur, aucun repère visuel. Ajouter un breadcrumb.

### MOYENNE priorité (qualité au quotidien)
- [x] **Tri des colonnes de tableau** : Permettre de cliquer sur les en-têtes pour trier (Récolte, Ventes, Charges). ✅ Fait en session 2026-05-10 — tri serveur (Supabase .order()) sur Récolte et Ventes, tri serveur sur Charges après migration pagination.
- [ ] **États vides unifiés** : Certaines sections affichent "Aucune donnée...", d'autres un tableau vide, d'autres rien. Créer un composant EmptyState réutilisable.
- [ ] **Tailles de boutons touch** : Les boutons de pagination sont en dessous du standard tactile 44×44px.
- [ ] **Accessibilité des modales** : Ajouter aria-modal, aria-labelledby, gestion du focus clavier sur le composant Modal.jsx.
- [ ] **Composant Notification réutilisable** : Les messages de succès/erreur utilisent des styles inline différents partout. Créer un composant partagé.

### BASSE priorité (confort et polish)
- [ ] **Graphiques dans le Résumé** : Recharts est installé mais pas utilisé dans Resume.jsx. Ajouter courbes d'évolution récolte/ventes.
- [ ] **Durée des notifications** : Les messages de succès disparaissent en 3s — augmenter à 5s ou rendre dismissible manuellement.
- [ ] **Skeleton loaders** : Remplacer le spinner par des placeholders animés pendant le chargement des données.
- [ ] **Précision décimale unifiée** : 2 décimales pour les quantités (kg), 3 pour les montants (DT). Appliquer partout.
- [ ] **Composant FilterModal partagé** : Récolte, Ventes et Charges réimplémentent chacun la même logique de filtre. Extraire en composant unique.

## Nouvelles fonctionnalités métier — Identifiées (session 2026-05-09)
Idées issues d'une réflexion terrain (point de vue agriculteur). À prioriser et implémenter progressivement.

### Faisable sans modification de la base de données
- [ ] **Stock d'huile** : Suivi des litres produits après pressage, vendus et restants. Nouveau module avec formulaire + tableau + KPIs.
- [ ] **Bons du moulin (maâsra)** : Enregistrer les bons de livraison au moulin — taux d'humidité, taux de matière grasse, rendement en huile, date. Lier à une campagne.
- [ ] **Main d'œuvre nominative** : Saisir les ouvriers par nom avec nombre de jours travaillés et montant payé, plutôt qu'un coût global. Permettre de retrouver les bons ouvriers d'une saison à l'autre.
- [ ] **Carnet de traitements phytosanitaires** : Enregistrer chaque traitement (produit, dose, parcelle, date). Historique consultable par parcelle et par campagne. ⚠️ EN ATTENTE — à confirmer avec le père (vérifie s'il fait des traitements sur l'oliveraie).
- [ ] **Tableau de rentabilité** : Vue synthétique — recettes vs charges par hectare, par arbre, par campagne. Basé sur les données existantes.
- [ ] **Alertes calendrier agricole** (détail session 2026-05-09) : Bannières dans le Résumé aux moments clés de la saison oléicole tunisienne. Calendrier pré-configuré : taille (jan-fév), débourrement (mars), floraison (avr-mai), surveillance mouche (juin-août), véraison (sept-oct), récolte (oct-nov), bilan (déc). Alertes déclenchées aussi par les données de l'app (DAR, retreatment, charges manquantes). Configurable : activer/désactiver, décaler les dates, ajouter alertes personnalisées. Pas de nouvelle table Supabase requise (calendrier en dur + localStorage). ✅ Validé par l'utilisateur.
- [ ] **Planning de taille** (détail session 2026-05-09) : Organiser le travail de taille hivernal. Vue calendrier par semaine (janvier-mars), assignation parcelle + équipe + type de taille (fructification, rajeunissement, sanitaire, formation). Suivi prévu vs réalisé avec coût estimé vs coût réel. Bilan de fin de saison. Nécessite une table `planning_taille` en base Supabase (accord requis). ✅ Validé par l'utilisateur.
- ~~**Irrigation parcelle par parcelle**~~ : ❌ Abandonné — données trop difficiles à mesurer sur le terrain sans capteurs IoT. Pas réaliste en saisie manuelle.

### Nécessite une clé API externe
- ~~**Météo intégrée**~~ : ❌ Abandonné — précision géographique insuffisante pour une parcelle rurale, pas d'historique gratuit, pas de données agronomiques utiles (sol, ET0). Décision prise en session 2026-05-09.

### Nécessite modification de la base de données (accord explicite requis)
- [ ] **Fiche par arbre** : Créer une table `arbres` en base. Chaque arbre lié à une parcelle, avec variété, âge, historique de rendement, état sanitaire. Visualisation sur carte Leaflet.
- [ ] **Carnet de traitements phytosanitaires** (détail session 2026-05-09) : Nécessite une table `traitements` en base. Champs : campagne_id, parcelle_nom, produit, cible (ravageur), dose, unité, surface_ha, date_traitement, delai_retreatment (jours), DAR (délai avant récolte), opérateur, notes. Ravageurs pré-configurés : Mouche de l'olive (Bactrocera oleae), Teigne (Prays oleae), Œil de paon (Spilocaea oleagina), Cochenille noire (Saissetia oleae), Verticilliose. Fonctions : alertes retreatment automatiques, alerte DAR avant récolte, historique par parcelle/campagne, coût total intrants. ⚠️ EN ATTENTE accord DB + confirmation terrain avec le père.

### Vision produit — Stratégie commerciale (session 2026-05-09)
Une seule app, un seul codebase. Deux niveaux d'accès :
- **Gratuit** : fonctionnalités de base (campagnes, récolte, ventes, charges)
- **Premium** : toutes les nouvelles fonctionnalités (alertes, planning taille, carnet traitements, etc.)
- Le père de Walid = premier utilisateur premium (compte gratuit à vie, sert de terrain de test)
- Pas de duplication de codebase — les fonctionnalités premium sont cachées derrière un feature flag (`plan: free | premium`) dans le profil utilisateur.

#### Cible commerciale immédiate
L'entourage du père (frères, sœurs, héritiers d'exploitations familiales) = premiers clients naturels. Acquisition par bouche-à-oreille terrain, sans marketing.

#### Vision long terme — Extension à d'autres cultures
L'app est aujourd'hui spécialisée oliveraie. À terme, l'architecture peut s'étendre à d'autres types de récoltes (agrumes, dattes, céréales, vignes). Le domaine métier (campagnes, récolte, ventes, charges) est générique — seuls les calendriers agricoles et les ravageurs sont spécifiques à la culture.

#### Internationalisation (i18n)
Système de langues à implémenter : **Français / Arabe / Anglais**.
- Français : langue actuelle, marché tunisien francophone
- Arabe : priorité pour toucher les agriculteurs moins francophones (arabe dialectal tunisien ou arabe standard)
- Anglais : ouverture à d'autres marchés méditerranéens (Maroc, Algérie, Espagne, Italie)
- Techniquement : utiliser `react-i18next` (bibliothèque standard React). Toutes les chaînes de texte externalisées dans des fichiers de traduction `fr.json` / `ar.json` / `en.json`. Support RTL (droite à gauche) pour l'arabe.
- ⚠️ À implémenter après la stabilisation des fonctionnalités — changer les textes en cours de dev est coûteux.

Ordre d'implémentation recommandé :
1. Développer les nouvelles fonctionnalités (alertes, planning taille...)
2. Tester en conditions réelles sur le compte du père
3. Ajouter l'architecture multi-utilisateurs + écran login
4. Ajouter le système free/premium
5. Créer le compte démo (voir ci-dessous)
6. Ouvrir au public

#### Compte démo (superutilisateur)
Un compte démo pré-rempli avec des données fictives réalistes pour présenter l'app à des prospects sans exposer les données privées du père.
- Identifiants fixes : `demo@olive-app.tn` / mot de passe simple
- Données fictives : exploitation "Domaine El Baraka", 6 ha, 3 parcelles, 3 campagnes d'historique
- Mode lecture seule (ou reset automatique toutes les 24h pour éviter que les données démo soient modifiées)
- Badge visible "MODE DÉMO" affiché en permanence dans l'interface
- Accès premium complet pour montrer toutes les fonctionnalités

### Multi-utilisateurs — Architecture future (accord explicite requis)
Permettre à d'autres agriculteurs d'utiliser l'app avec leurs propres données isolées.
Ce chantier est le plus structurant de tous — il touche à toute l'architecture.
- [ ] **Authentification multi-utilisateurs** : Chaque utilisateur se connecte avec son propre compte (email/password). Supabase Auth est déjà là mais pas exploité pour l'isolation des données.
- [ ] **Isolation des données (RLS)** : Chaque utilisateur ne voit que ses propres campagnes, récoltes, ventes, charges. Nécessite d'ajouter une colonne `user_id` sur toutes les tables + activation des Row Level Security (RLS) dans Supabase. ⚠️ Modification majeure du schéma DB.
- [ ] **Profil utilisateur** : Nom, nom de l'exploitation, région, surface totale, photo.
- [ ] **Partage d'exploitation** : Permettre à un utilisateur d'inviter un autre (ex: associé, expert agricole) en lecture seule ou en édition.
- [ ] **Écran de connexion** : Page login/signup à créer. Actuellement l'app s'ouvre directement sans authentification.
⚠️ Ce chantier est un prérequis obligatoire avant tout déploiement public de l'app.

### Réservé pour une version "grands agriculteurs" (non prioritaire)
Ces fonctionnalités sont trop avancées pour l'exploitation familiale actuelle mais pertinentes pour une version commerciale destinée à de plus grandes exploitations :
- [ ] **Stock d'huile** : Suivi litres produits/vendus/restants.
- [ ] **Bons du moulin (maâsra)** : Enregistrement des bons de livraison au moulin.
- [ ] **Main d'œuvre nominative** : Ouvriers par nom, jours travaillés, montant payé.
- [ ] **Fiche par arbre** : Table `arbres` en base, visualisation Leaflet.

### Notes d'implémentation
- Priorité actuelle : fonctionnalités validées pour l'exploitation familiale (alertes calendrier, planning taille).
- Chaque nouvelle fonctionnalité = nouvel onglet ou sous-section dans ProfilExploitation selon la complexité.
- Réutiliser les patterns existants : FormulaireXxx.jsx pour les formulaires, DataProvider pour les données.
- Vision long terme : deux versions de l'app — "petite exploitation" (actuelle) et "pro" pour grands agriculteurs.