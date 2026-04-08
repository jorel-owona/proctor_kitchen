# CHANGELOG ET GUIDE D'UTILISATION (Proctor Kitchen)

Ce document récapitule toutes les corrections qui viennent d'être apportées à ton code source pour sécuriser le site, et explique la nouvelle marche à suivre pour utiliser ton panneau d'administration de façon propre et professionnelle.

---

## 🔧 Résumé des Modifications (Changelog)

### 1. Sécurité (Comblage des failles critiques)
- **`config.js`** : La variable secrète `SERVICE_ROLE_KEY` a été entièrement supprimée. Seule la clé publique (`ANON_KEY`) est désormais visible. Il est désormais impossible pour un visiteur de pirater ta base de données via ton frontend.
- **`SQL_FULL_SETUP.sql`** : Les règles RLS (_Row Level Security_) ont été durcies.
  - Le public n'a plus le droit de supprimer ou de modifier les images. Il peut seulement lire la galerie et poster des formulaires de contact.
  - Seul un compte connecté de manière officielle (`authenticated`) est autorisé à gérer le contenu (lire les messages non publics, supprimer des photos, etc).
- **`admin.js` & `admin.html`** :
  - Fin du système qui vérifiait juste `admin123` en texte brut en JavaScript.
  - La fenêtre `admin.html` possède maintenant un véritable formulaire d'authentification Supabase (Email et Mot de passe). L'état est conservé de façon sécurisée par le SDK Supabase.

### 2. Corrections HTML & Stabilité
- **`index.html`** : 
  - Nettoyage des doublons (balise FontAwesome chargée 2 fois, commentaires CSS).
  - Suppression des imports fantômes qui causaient des erreurs ("assets/js/script.js" ou l'import de "script.js" dans les styles).
  - Correction du bouton e-mail (Ajout du préfixe `mailto:` manquant).
- **`script.js`** :
  - Suppression du code JS copié en double tout en haut du fichier qui parasitait l'exécution.

---

## 🛠️ NOUVELLE PROCÉDURE : Comment utiliser l'Admin désormais ?

Puisque ton système est maintenant réellement sécurisé par Supabase, voici les **trois étapes** que tu dois faire avant de pouvoir retourner sur ton dashboard `admin.html` en paix.

### Étape 1 : Mettre à jour tes règles dans Supabase (IMPORTANT)
Puisque j'ai corrigé le fichier, tes règles sur les serveurs Supabase ne sont plus à jour.
1. Ouvre ton interface d'administration **Supabase**.
2. Va dans l'**Éditeur SQL** (SQL Editor).
3. Copie tout le contenu du fichier `SQL_FULL_SETUP.sql` de ton dossier, et copie-le dans l'éditeur.
4. Clique sur **Run** pour écraser les anciennes règles de sécurité par nos nouvelles règles strictes.

### Étape 2 : Créer ton vrai compte administrateur
C'est fini les mots de passe dans le code. Tu dois te créer un vrai compte :
1. Sur le panel **Supabase**, va dans le menu **Authentication**.
2. Va dans l'onglet **Users**.
3. Clique sur **Add User** (Ajouter un utilisateur) -> **Create new user**.
4. Définis l'adresse e-mail de ton choix (ex: `contact@proctor.com`) et un vrai mot de passe robuste. Change bien les options pour **auto-confirmer l'utilisateur** afin de pouvoir t'y connecter de suite.
5. Valide la création de l'utilisateur.

### Étape 3 : Se connecter sur le site
1. Ouvre ton fichier **`admin.html`** (en local ou sur la version en ligne de ton site).
2. La fenêtre "Connexion Admin" apparaît désormais avec **deux champs** (Email et Mot de passe).
3. Rentre l'e-mail et le mot de passe que tu viens juste de créer à l'Étape 2 sur Supabase.
4. Clique sur Se connecter. 
5. C'est bon, tu es connecté ! L'interface sait mémoriser ta session. Si tu vas dans les autres pages, personne ne pourra voir ces informations à part toi.
