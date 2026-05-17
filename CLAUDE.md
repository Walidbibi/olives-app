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
resume | campagnes | recolte | ventes | charges | traitements | carte

### Onglet Traitements — ajouté session 2026-05-17
`FormulaireTraitements.jsx` — journal des actions terrain par campagne (taille, labour, engrais, désherbage, autre).
- Même comportement que Récolte/Ventes : filtre par campagne, pagination, tri, cards mobile, filtres, validation temps réel
- Badges couleur par parcelle (index-based : bleu, amber, vert, violet, rose)
- Notes obligatoire si type = "autre"
- Table `traitements` en Supabase : `campagne_id`, `parcelle_id`, `date`, `type_action`, `notes`
- ⚠️ **Reste à faire** : ajouter le type de charge `traitement_oliviers` dans `FormulaireCharges.jsx` (décidé session 2026-05-16, non implémenté). Sous-types : engrais/fertilisation, labour, taille, salaire laboureurs, autre (préciser).

### Types de charges (clés en base Supabase)
- main_oeuvre → "Main d'oeuvre"
- repas → "Repas"
- essence → "Essence"
- don → "Dons"
- vehicule → "Autres charges véhicules"
- equipement → "Équipements"
- traitement_oliviers → "Traitement oliviers" — à implémenter (décidé session 2026-05-16)
  - Sous-types : engrais/fertilisation, labour, taille, salaire laboureurs, autre (préciser)

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
- [x] **Tables → cards sur mobile** : Les tableaux Récolte, Ventes, Charges nécessitent un scroll horizontal sur téléphone. Basculer vers une vue en cartes sur petit écran (<768px). ✅ Fait en session 2026-05-10 — tableau masqué sur mobile (hidden md:block), cartes affichées (md:hidden) avec layout date/infos/quantité/actions.
- [x] **Validation temps réel des formulaires** : Les erreurs n'apparaissent qu'au submit. Ajouter validation pendant la saisie. ✅ Fait en session 2026-05-17 — `errors` state object dans les 4 formulaires, `onBlur` sur chaque champ obligatoire, `onChange` efface l'erreur, message rouge inline sous le champ + bordure rouge.
- [x] **Messages de chargement spécifiques** : Remplacer "Chargement..." par des messages précis ("Chargement des récoltes..."). Afficher une erreur visible si la requête échoue (pas de spinner infini). ✅ Fait en session 2026-05-10 — messages précis dans tous les formulaires + DashboardTracteur, bouton Réessayer sur l'écran d'erreur global.
- [x] **Selects filtrables** : Les listes déroulantes (équipements, parcelles) ne sont pas recherchables. Ajouter un champ de recherche/autocomplete. ✅ Fait en session 2026-05-10 — composant SearchableSelect réutilisable, appliqué sur 5 selects (parcelles × 3, équipements × 2).
- [ ] **Fil d'Ariane dans la navigation imbriquée** : Quand l'utilisateur est dans Profil > Équipements > Dashboard Tracteur, aucun repère visuel. Ajouter un breadcrumb.

### MOYENNE priorité (qualité au quotidien)
- [x] **Tri des colonnes de tableau** : Permettre de cliquer sur les en-têtes pour trier (Récolte, Ventes, Charges). ✅ Fait en session 2026-05-10 — tri serveur (Supabase .order()) sur Récolte et Ventes, tri serveur sur Charges après migration pagination.
- [ ] **États vides unifiés** : Certaines sections affichent "Aucune donnée...", d'autres un tableau vide, d'autres rien. Créer un composant EmptyState réutilisable.
- [ ] **Tailles de boutons touch** : Les boutons de pagination sont en dessous du standard tactile 44×44px.
- [ ] **Accessibilité des modales** : Ajouter aria-modal, aria-labelledby, gestion du focus clavier sur le composant Modal.jsx.
- [x] **Composant Notification réutilisable** : Les messages de succès/erreur utilisent des styles inline différents partout. Créer un composant partagé. ✅ Fait en session 2026-05-10 — Notification.jsx créé, appliqué dans les 4 formulaires.

### BASSE priorité (confort et polish)
- [ ] **Graphiques dans le Résumé** : Recharts est installé mais pas utilisé dans Resume.jsx. Ajouter courbes d'évolution récolte/ventes.
- [x] **Durée des notifications** : Les messages de succès disparaissent en 3s — augmenter à 5s ou rendre dismissible manuellement. ✅ Fait en session 2026-05-10 — 6 fichiers passés à 5s.
- [ ] **Skeleton loaders** : Remplacer le spinner par des placeholders animés pendant le chargement des données.
- [x] **Précision décimale unifiée** : 2 décimales pour les quantités (kg), 3 pour les montants (DT). Appliquer partout. ✅ Fait en session 2026-05-10 — formatUtils.js créé, Resume.jsx/FormulaireRecolte/Charges/Profil corrigés.
- [ ] **Composant FilterModal partagé** : Récolte, Ventes et Charges réimplémentent chacun la même logique de filtre. Extraire en composant unique.

## Nouvelles fonctionnalités métier — Identifiées (session 2026-05-09)
Idées issues d'une réflexion terrain (point de vue agriculteur). À prioriser et implémenter progressivement.

### Faisable sans modification de la base de données
- [ ] **Stock d'huile** : Suivi des litres produits après pressage, vendus et restants. Nouveau module avec formulaire + tableau + KPIs.
- [ ] **Bons du moulin (maâsra)** : Enregistrer les bons de livraison au moulin — taux d'humidité, taux de matière grasse, rendement en huile, date. Lier à une campagne.
- [ ] **Main d'œuvre nominative** : Saisir les ouvriers par nom avec nombre de jours travaillés et montant payé, plutôt qu'un coût global. Permettre de retrouver les bons ouvriers d'une saison à l'autre.
- ~~**Carnet de traitements phytosanitaires**~~ : ❌ Abandonné — le père ne fait pas de traitement chimique (uniquement taille, labour, engrais). Pas de DAR ni de retreatment à suivre. Confirmé session 2026-05-16.
- [ ] **Timeline rétroactive par campagne** (session 2026-05-16) : Vue chronologique dans l'onglet Campagnes — tout ce qui s'est passé pendant une campagne affiché sur une ligne de temps : récoltes (kg, parcelle), ventes (montant, acheteur), charges (type, montant), traitements (labour, taille, engrais). Données existantes suffisent, aucune modification DB requise. Affichage possible en feed vertical trié par date ou en mini-calendrier mensuel. Utile pour comprendre d'un coup d'œil le déroulé d'une saison.
- [x] **Onglet Traitement** (session 2026-05-16, décisions finales 2026-05-17, implémenté 2026-05-17) : Journal d'actions terrain — enregistrer ce qui a été fait, quand, et sur quelle parcelle (taille, labour, engrais, autre). Entité distincte des charges : une entrée = date + parcelle + action + notes optionnelles. Les coûts associés restent dans Charges avec le type `traitement_oliviers`. Schéma table `traitements` : `id` (uuid PK), `campagne_id` (FK → campagne), `parcelle_id` (FK → parcelles), `date` (date), `type_action` (text : taille / labour / engrais / désherbage / autre), `notes` (text nullable), `created_at` (timestamptz).
  - Navigation : nouvel onglet "Traitements" au même niveau que Récolte/Ventes/Charges
  - Comportement identique à Récolte et Ventes : filtre par campagne en haut, pagination, tri, cards mobile
  - Champ `notes` devient obligatoire si `type_action === "autre"`
  - ⚠️ Table `traitements` à créer en Supabase avant l'implémentation
- [ ] **Tableau de rentabilité** : Vue synthétique — recettes vs charges par hectare, par arbre, par campagne. Basé sur les données existantes.
- [ ] **Alertes calendrier agricole** (détail session 2026-05-09) : Bannières dans le Résumé aux moments clés de la saison oléicole tunisienne. Calendrier pré-configuré : taille (jan-fév), débourrement (mars), floraison (avr-mai), surveillance mouche (juin-août), véraison (sept-oct), récolte (oct-nov), bilan (déc). Alertes déclenchées aussi par les données de l'app (DAR, retreatment, charges manquantes). Configurable : activer/désactiver, décaler les dates, ajouter alertes personnalisées. Pas de nouvelle table Supabase requise (calendrier en dur + localStorage). ✅ Validé par l'utilisateur.
- [ ] **Planning de taille** (détail session 2026-05-09) : Organiser le travail de taille hivernal. Vue calendrier par semaine (janvier-mars), assignation parcelle + équipe + type de taille (fructification, rajeunissement, sanitaire, formation). Suivi prévu vs réalisé avec coût estimé vs coût réel. Bilan de fin de saison. Nécessite une table `planning_taille` en base Supabase (accord requis). ✅ Validé par l'utilisateur.
- ~~**Irrigation parcelle par parcelle**~~ : ❌ Abandonné — données trop difficiles à mesurer sur le terrain sans capteurs IoT. Pas réaliste en saisie manuelle.

### Nécessite une clé API externe
- ~~**Météo intégrée**~~ : ❌ Abandonné — précision géographique insuffisante pour une parcelle rurale, pas d'historique gratuit, pas de données agronomiques utiles (sol, ET0). Décision prise en session 2026-05-09.

### Nécessite modification de la base de données (accord explicite requis)
- [ ] **Fiche par arbre** : Créer une table `arbres` en base. Chaque arbre lié à une parcelle, avec variété, âge, historique de rendement, état sanitaire. Visualisation sur carte Leaflet.
- ~~**Carnet de traitements phytosanitaires**~~ : ❌ Abandonné — pas de traitement chimique sur cette exploitation. Confirmé session 2026-05-16.

### Vision produit — Stratégie commerciale (session 2026-05-09)
Une seule app, un seul codebase. Deux niveaux d'accès :
- **Gratuit** : fonctionnalités de base (campagnes, récolte, ventes, charges)
- **Premium** : toutes les nouvelles fonctionnalités (alertes, planning taille, carnet traitements, etc.)
- Le père de Walid = premier utilisateur premium (compte gratuit à vie, sert de terrain de test)
- Pas de duplication de codebase — les fonctionnalités premium sont cachées derrière un feature flag (`plan: free | premium`) dans le profil utilisateur.

#### Cible commerciale immédiate
L'entourage de ton père (frères, sœurs, héritiers d'exploitations familiales) = premiers clients naturels. Acquisition par bouche-à-oreille terrain, sans marketing.

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
2. Tester en conditions réelles sur le compte de ton père
3. Ajouter l'architecture multi-utilisateurs + écran login
4. Ajouter le système free/premium
5. Créer le compte démo (voir ci-dessous)
6. Ouvrir au public

#### Compte démo (superutilisateur)
Un compte démo pré-rempli avec des données fictives réalistes pour présenter l'app à des prospects sans exposer les données privées de ton père.
- Identifiants fixes : `demo@olive-app.tn` / mot de passe simple
- Données fictives : exploitation "Domaine El Baraka", 6 ha, 3 parcelles, 3 campagnes d'historique
- Mode lecture seule (ou reset automatique toutes les 24h pour éviter que les données démo soient modifiées)
- Badge visible "MODE DÉMO" affiché en permanence dans l'interface
- Accès premium complet pour montrer toutes les fonctionnalités

### Multi-utilisateurs + Landing page — Chantier unifié (session 2026-05-15)
Brainstorm effectué. Ce chantier regroupe la landing page, l'auth et l'isolation des données — les trois sont liés et doivent partir ensemble.

#### Pourquoi tout en un seul chantier
Sans `user_id` sur les tables et filtrage dans les requêtes, tous les utilisateurs connectés verraient les mêmes données (celles de ton père). La landing mène au signup, le signup nécessite l'isolation. On ne peut pas faire l'un sans l'autre.

#### Landing page (nouvel écran d'accueil)
Affiché quand l'utilisateur n'est pas connecté. Style produit moderne (Linear, Notion) intégré dans l'app React.
- Hero + tagline
- Présentation de chaque feature (récolte, ventes, charges, carte)
- Témoignage
- CTA : "Essai gratuit" / "Se connecter"
- Basé sur le contenu du `onepager.html` déjà créé
- Route : `App.jsx` bascule entre `<LandingPage />` et l'app selon la session Supabase Auth

#### Auth (login / signup)
- Supabase Auth déjà configuré dans le projet, non exploité pour l'isolation
- Ajouter écoute `onAuthStateChange` dans App.jsx
- Créer `LoginPage.jsx` / `SignupPage.jsx`
- Email + password dans un premier temps

#### Isolation des données
- Ajouter colonne `user_id` sur toutes les tables (campagnes, recolte_journaliere, ventes, charges, parcelles)
- Mettre à jour toutes les requêtes dans DataProvider.jsx et les formulaires pour filtrer par `user_id`
- Migration des données de ton père : un `UPDATE` SQL dans Supabase dashboard pour assigner son `user_id` à toutes ses lignes existantes
- RLS (Row Level Security) Supabase en complément pour sécuriser côté serveur

#### Stratégie pour ne pas casser la prod de ton père
- Tout le chantier se développe sur une branche dédiée
- Le père continue sur `main` sans interruption
- Avant le merge : créer son compte Supabase Auth + migrer ses données + tester avec deux comptes distincts

#### Tâches
- [ ] Landing page (`LandingPage.jsx`)
- [ ] Login / Signup (`LoginPage.jsx`, `SignupPage.jsx`)
- [ ] Auth state dans `App.jsx` (bascule landing ↔ app)
- [ ] Colonne `user_id` sur toutes les tables (migration SQL)
- [ ] Filtrage par `user_id` dans toutes les requêtes
- [ ] Migration des données de ton père
- [ ] RLS Supabase
- [ ] Tests avec deux comptes distincts avant merge

⚠️ Ce chantier est un prérequis obligatoire avant tout déploiement public de l'app.

### Réservé pour une version "grands agriculteurs" (non prioritaire)
Ces fonctionnalités sont trop avancées pour l'exploitation familiale actuelle mais pertinentes pour une version commerciale destinée à de plus grandes exploitations :
- [ ] **Stock d'huile** : Suivi litres produits/vendus/restants.
- [ ] **Bons du moulin (maâsra)** : Enregistrement des bons de livraison au moulin.
- [ ] **Main d'œuvre nominative** : Ouvriers par nom, jours travaillés, montant payé.
- [ ] **Fiche par arbre** : Table `arbres` en base, visualisation Leaflet.

### Pratiques terrain confirmées (session 2026-05-16)
Le père fait principalement : **taille** (hivernale), **labour** (inter-rangs), **engrais** (pas de produits chimiques). Pas de traitements phytosanitaires, pas de DAR à gérer. Cela oriente les priorités :
- Planning de taille ✅ très pertinent
- Suivi engrais (produit, date, parcelle, coût) → à considérer comme extension légère des charges
- Carnet phytosanitaire ❌ hors périmètre pour cette exploitation

### Notes d'implémentation
- Priorité actuelle : fonctionnalités validées pour l'exploitation familiale (alertes calendrier, planning taille).
- Chaque nouvelle fonctionnalité = nouvel onglet ou sous-section dans ProfilExploitation selon la complexité.
- Réutiliser les patterns existants : FormulaireXxx.jsx pour les formulaires, DataProvider pour les données.
- Vision long terme : deux versions de l'app — "petite exploitation" (actuelle) et "pro" pour grands agriculteurs.

## Carte d'exploitation — Fonctionnalités identifiées (session 2026-05-10)
Parcelle Sidi Amor délimitée avec 12 points GPS sur CarteExploitation.jsx (Leaflet + react-leaflet).
Données de récolte au survol déjà implémentées (tooltip live depuis Supabase).

### Faisable sans nouvelle API
- [x] **Données de récolte au survol** : kg récolté, nb journées, détail par campagne. ✅ Fait session 2026-05-10.
- [ ] **Code couleur performance** : Parcelle verte si rendement > moyenne campagne, orange si en dessous.
- [ ] **Clic → fiche parcelle** : Modal avec historique récoltes, charges associées, graphique d'évolution.
- [ ] **Surface calculée automatiquement** : Calculer l'hectarage réel depuis les coordonnées GPS (formule de Shoelace).

### Nécessite données supplémentaires
- [ ] **Récolte en cours en temps réel** : Afficher kg récoltés sur la parcelle pour la campagne active.
- [ ] **Planning de taille sur carte** : Voir quelles parcelles sont taillées / à tailler (lié au planning de taille).
- [ ] **Traitements sur carte** : Colorier les parcelles selon le dernier traitement effectué (taille, labour, engrais) — données disponibles dans la table `traitements` une fois l'onglet implémenté. Amélioration possible après l'onglet Traitements.

### Vision long terme
- [ ] **Multi-parcelles** : Ajouter les autres parcelles de l'exploitation avec leurs polygones GPS.
- [ ] **Partage de carte** : Montrer la carte à un acheteur ou un expert agricole.

## Bugs identifiés — Audit session 2026-05-12

### CRITIQUES
- [x] **`DataProvider.jsx` — Données Supabase non vérifiées** : Si Supabase retourne `null` (réseau coupé, table vide), le destructuring plante toute l'app silencieusement. Le `= []` dans le destructuring ne protège que contre `undefined`, pas contre `null` — Supabase retourne toujours `null` en erreur. Le `firstError` check rattrape les cas normaux, mais si Supabase renvoie `{ data: null, error: null }` (RLS silencieux, timeout mal propagé), `setData` stocke `null` et tout composant faisant `.map()` plante en écran blanc. **Fix : après le check `firstError`, ajouter `if (!ventes || !recoltes || !charges || !campagnes || !parcelles) throw new Error("Données reçues nulles depuis Supabase")`.**
- [x] **`ProfilExploitation.jsx` — Accès `campagnes[0]` sans vérification** : Si la liste des campagnes est vide, `campagnes[0].id` plante à l'ouverture d'une modale de suppression.

### MOYENS
- [x] **`FormulaireVente.jsx` — `recolte` peut être null** : Faux positif — déjà protégé (guard ligne 451 + fallback Supabase).
- [x] **`FormulaireRecolte.jsx` — `est_vendu` orphelin** : Faux positif — la suppression d'une vente remet `est_vendu = false` (ligne 595).
- [x] **`CarteExploitation.jsx` — `fitBounds()` sans vérification** : Faux positif — guard `length === 0` déjà en place (ligne 110).
- [x] **`DashboardTracteur.jsx` — `equipement` potentiellement null** : Corrigé — guard ajouté avant le return JSX.
- [x] **`FormulaireVente.jsx` — Incohérence décimales dans le même tableau** : Corrigé — `quantite_kg` uniformisé à 2 décimales partout.
- [ ] **`FormulaireRecolte.jsx` — Tri par `parcelle_id` (nombre) au lieu du nom** : Réel — à corriger (tri par ID numérique au lieu du nom de parcelle).
- [x] **`FormulaireCampagne.jsx` — Suppression en cascade silencieuse** : Faux positif — chaque étape a son message d'erreur explicite.
- [x] **`ProfilExploitation.jsx` — Parsing GPS fragile** : Faux positif — `parseGPS` normalise virgule/point décimal.
- [x] **`Resume.jsx` — Filtre tracteur incorrect** : Faux positif — label et filtre cohérents ("Tracteurs").
- [x] **`FormulaireRecolte.jsx` — Mutation d'état après unmount** : Faux positif — React 18/19 ignore silencieusement les updates sur composants démontés.
- [x] **`FormulaireVente.jsx` — Double round-trip Supabase inutile** : Corrigé — après une nouvelle vente, le SELECT de rafraîchissement remplacé par un filtre local `prev.filter(r => r.id !== recolteId)`.
- [x] **`SearchableSelect.jsx` — Prop `disabled` ignorée** : Faux positif — `disabled` bien câblé (ligne 49).

### MINEURS
- [ ] **`FormulaireCharges.jsx`** — `formatMontant()` sans guard sur `isNaN` : Réel mais très mineur — afficherait "NaN DT" si valeur non numérique (quasi impossible en pratique).
- [x] **`Modal.jsx`** — Prop `size` partiellement ignorée : Faux positif — default/large/xlarge tous gérés.
- [x] **`FormulaireRecolte.jsx`** — Pas de message "Aucun résultat" après changement de campagne : Faux positif — message existe ligne 890.
- [x] **`CarteExploitation.jsx`** — Aucun état de chargement visible : Faux positif — loading global DataProvider couvre ça.
- [x] **`Resume.jsx`** — Spinner non affiché : Faux positif — `if (loading) return <Spinner />` bien en place.

## Suivi GPS tracteur — Décisions prises (session 2026-05-12)

### Matériel retenu
- **Tracker : Trackerking J16 4G** (AliExpress, ~13€/pièce, lot de 3 à ~38€)
  - Protocole GT06 confirmé dans le titre produit
  - 4G+2G, batterie de secours 300mAh
  - Câblé sur 12V tracteur
- **SIM** : Ooredoo ou Orange Tunisie, forfait data basique (~5 DT/mois)

### Architecture technique retenue
```
Tracker GPS → (SIM 4G) → Traccar (serveur Oracle Cloud) → CarteExploitation.jsx (Leaflet)
```
- **Traccar** : logiciel open source gratuit, reçoit les positions via protocole GT06 TCP
- **Serveur** : Oracle Cloud Always Free (gratuit à vie, 4 vCPU / 24 Go RAM total, largement suffisant)
- **Intégration app** : fetch sur `GET /api/positions` Traccar toutes les 15s → marqueur 🚜 dans CarteExploitation.jsx
- Pas de modification Supabase requise (Traccar gère sa propre base)

### Étapes d'implémentation (à faire quand le tracker est reçu)
1. Créer un compte Oracle Cloud + déployer Traccar sur VM gratuite
2. Configurer le tracker par SMS pour pointer vers le serveur Traccar
3. Ajouter un marqueur tracteur dynamique dans `CarteExploitation.jsx`

### Budget
- Matériel : ~13€ (achat unique)
- Serveur : 0€ (Oracle Cloud free tier)
- SIM data : ~5 DT/mois