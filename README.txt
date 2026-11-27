SkillUp - Application web React d'apprentissage
Projet React.js - IIT, 3ème Licence GLSI - Module Frameworks Web
Année universitaire 2026-2027

Binôme
------
- Fatma Kallel
- Lina Masmoudi


1. Prérequis
------------
- Node.js 20.19 ou plus récent (22 recommandé), avec npm.
  Vérifier la version : node -v
- Une connexion internet (API Open Library et assistant IA).


2. Installer les dépendances
----------------------------
Ouvrir un terminal dans le dossier du projet (celui qui contient package.json), puis :

    npm install


3. Configurer le fichier .env.local (clé de l'assistant IA)
-----------------------------------------------------------
La clé de l'API n'est jamais écrite dans le code : elle est lue depuis le fichier
.env.local via import.meta.env.VITE_AI_API_KEY (voir src/services/aiService.js).

a) Copier le fichier modèle .env.example en .env.local :
     - Windows (PowerShell) : Copy-Item .env.example .env.local
     - macOS / Linux        : cp .env.example .env.local

b) Ouvrir .env.local et remplacer "votre_cle_ici" par votre clé :

     VITE_AI_API_KEY=votre_cle_ici

   - Gemini (par défaut) : créer une clé gratuite sur https://aistudio.google.com
   - Groq (facultatif)   : créer une clé sur https://console.groq.com
                           puis ajouter la ligne VITE_AI_PROVIDER=groq
   - Si le modèle par défaut n'est plus disponible : VITE_AI_MODEL=nom-du-modele

c) Si le serveur était déjà lancé, l'arrêter (Ctrl+C) puis le relancer
   pour que la nouvelle clé soit prise en compte.

Remarque : .env.local n'est pas inclus dans l'archive (il contient une clé secrète).
Sans clé, la page Assistant IA affiche un message d'erreur explicite ; un bouton
"Répondre en mode hors ligne" permet alors d'obtenir une réponse d'un petit moteur
local (règles + base de connaissances), clairement signalé comme tel.


4. Lancer le projet
-------------------

    npm run dev

Puis ouvrir dans le navigateur l'adresse affichée dans le terminal
(par défaut http://localhost:5173).

Autres commandes : npm run build (version de production), npm run lint (oxlint).


5. Pages de l'application (React Router)
----------------------------------------
- /                  Accueil : salutation, statistiques, progression, minuteur focus,
                     recommandations Open Library, prochaines tâches, activité récente
- /ressources        Catalogue Open Library : recherche par mot-clé (formulaire contrôlé),
                     filtre par catégorie, tri, statut de lecture, favoris
- /ressources/:id    Détails d'une ressource : description, sujets, auteurs,
                     ajout aux favoris, progression de lecture
- /favoris           Ressources favorites : collections, notes, réorganisation, retrait
- /revisions         Tâches de révision : ajout / modification / suppression,
                     statut En cours / Terminée, filtres, calendrier, progression
- /assistant         Assistant IA en Questions / Réponses (Gemini ou Groq)
- toute autre URL    Page introuvable (404)

Raccourci : Ctrl + K ouvre une recherche rapide (pages, actions, favoris).


6. Données enregistrées (localStorage)
--------------------------------------
Il n'y a pas de serveur : toutes les données sont sauvegardées dans le localStorage
du navigateur, sous la clé "skillup:v2", et sont conservées après un rafraîchissement
ou la fermeture de l'onglet : thème, profil, favoris, copie locale des livres utilisés
(library), progression de lecture, tâches, sessions focus, activité, conversation.
Au premier lancement, des données de démonstration sont chargées ; le menu profil
(bouton rond en haut à droite) permet de les réinitialiser.


7. Organisation du code
-----------------------
src/pages        une page par route (Home, Resources, ResourceDetails, Favorites,
                 Revisions, Assistant, NotFound)
src/components   composants réutilisables (ResourceCard, Tasks, Feedback, Sidebar, ...)
src/services     openLibraryApi.js (fetch Open Library), aiService.js (appel IA),
                 offlineAssistant.js (mode hors ligne de l'assistant)
src/hooks        useFavorites (ajout / retrait des favoris avec « Annuler »)
src/context      StoreContext (état global + localStorage), ToastContext (notifications)
src/utils        fonctions de dates
src/styles       fichiers CSS (tokens, base, components, layout, pages)


8. Contenu de l'archive à rendre
--------------------------------
Exclure du .zip : node_modules, dist, .env.local et le dossier _ancienne-version.
