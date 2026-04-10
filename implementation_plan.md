# Système de Portfolio par Événements (Albums)

L'objectif est de permettre au Chef Proctor d'organiser ses photos par événements réels, chacun ayant sa propre description et date, pour une présentation structurée sur le site public.

## User Review Required

> [!IMPORTANT]
> - **Changement de Base de Données** : Je vais devoir ajouter une table `projects` dans Supabase pour stocker les descriptions et les noms de groupes.
> - **Interface d'Upload** : L'interface d'ajout de photos sera modifiée pour vous permettre de choisir un événement existant ou d'en créer un nouveau.

## Proposed Changes

### 1. Structure de Données (SQL)
- **[NEW]** Table `projects` : `id`, `created_at`, `event_date`, `name`, `description`, `category`.
- **[MODIFY]** Table `gallery` : Ajout d'une colonne `project_id` pour lier les photos aux projets.

### 2. Interface Administration (`admin.html` & `admin.js`)
- Ajout d'un formulaire pour créer un "Nouvel Événement" (Nom, Date, Description, Catégorie).
- Mise à jour du sélecteur d'upload pour trier par Album plutôt que par simple catégorie technique.

### 3. Affichage Public (`index.html` & `script.js`)
- Modification de la logique de chargement : on récupère les projets, puis les photos.
- **Groupement visuel** : Au lieu d'une grille continue, nous aurons des sections :
    - `[Titre du Projet] - [Date]`
    - `[Description du Projet]`
    - `[Grille de photos du projet]`
- **Tri automatique** : Les projets seront classés du plus récent au plus ancien.

### 4. Design & Esthétique
- Mise en page élégante des descriptions (typographie premium, espacements aérés).
- Animation de transition entre les groupes lors du filtrage.

## Open Questions
- Souhaitez-vous que la description soit visible directement sur la page ou seulement lorsqu'on clique sur une photo pour l'agrandir ?
- Préférez-vous le terme "Albums", "Projets" ou "Événements" pour l'interface admin ?

## Verification Plan
1. Création d'un projet test dans l'admin.
2. Ajout de photos dans ce projet.
3. Vérification de l'affichage groupé et chronologique sur `index.html`.
4. Test des filtres de catégorie.
