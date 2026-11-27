# SkillUp — Fiche de préparation à la soutenance (partie de Fatma)

> Modules 3, 4 et 5 + design global.
> ⚠️ Ce fichier est pour réviser : ne pas le mettre dans le ZIP final.

---

## 1. Architecture du projet

```
src/
├── components/      → petits composants réutilisables (reçoivent des props)
│   ├── TaskForm.jsx       (formulaire d'ajout de tâche)
│   ├── TaskList.jsx       (liste des tâches)
│   ├── TaskItem.jsx       (une tâche)
│   ├── TaskFilters.jsx    (boutons Toutes / En cours / Terminées)
│   ├── ProgressBar.jsx    (barre de progression, utilisée 2 fois)
│   ├── QuestionForm.jsx   (formulaire de question IA)
│   ├── AnswerBox.jsx      (affichage de la réponse IA)
│   └── StatCard.jsx       (carte statistique de l'accueil)
├── pages/           → une page = une route
│   ├── Home.jsx           (/)
│   ├── Revisions.jsx      (/revisions)
│   └── Assistant.jsx      (/assistant)
├── services/        → logique hors affichage (localStorage, API)
│   ├── taskStorage.js
│   └── aiService.js
└── styles/          → CSS
    ├── global.css         (variables, boutons, cartes, navbar, responsive)
    ├── revisions.css
    ├── assistant.css
    └── home.css
```

**Pourquoi ce découpage ?**
- **pages** : les composants "intelligents" qui possèdent le state.
- **components** : les composants d'affichage, réutilisables, qui reçoivent les données et les callbacks par props.
- **services** : on sépare l'accès aux données (localStorage, fetch) de l'affichage. Si on change d'API IA, on ne modifie que `aiService.js`.

---

## 2. Module 3 — Révisions (`/revisions`)

### Structure d'une tâche
```js
{ id: "1732450000000", titre: "Réviser les Hooks", description: "...",
  dateLimite: "2026-12-05", statut: "en cours" | "terminée" }
```

### Le flux de données (parent → enfants)
`Revisions` possède le state `tasks` et les fonctions `addTask`, `deleteTask`, `toggleTask`.
Il les passe en props :
- `TaskForm onAdd={addTask}` → le formulaire appelle `onAdd(tache)` quand il est valide.
- `TaskList tasks={visibleTasks} onToggle={toggleTask} onDelete={deleteTask}` → la liste transmet à chaque `TaskItem`.

Les enfants ne modifient **jamais** les données directement : ils appellent le callback du parent. C'est le principe du **"lifting state up"** (remonter l'état au parent commun).

### Immutabilité (point très demandé !)
| Action | Code | Pourquoi pas autrement |
|---|---|---|
| Ajouter | `[...prev, task]` | `push` modifie le tableau existant → React ne voit pas de changement |
| Supprimer | `prev.filter(t => t.id !== id)` | `splice` modifie le tableau existant |
| Modifier statut | `prev.map(t => t.id === id ? { ...t, statut: ... } : t)` | on crée une copie de la tâche au lieu de faire `t.statut = ...` |

React compare les références : si on modifie le même tableau, la référence ne change pas et **le composant ne se re-rend pas**.

On utilise `setTasks(prev => ...)` (forme fonctionnelle) pour être sûr de partir de la valeur la plus récente du state.

### localStorage
```js
const [tasks, setTasks] = useState(() => loadTasks());   // lecture au 1er rendu
useEffect(() => { saveTasks(tasks); }, [tasks]);          // écriture à chaque changement
```
- `useState(() => ...)` = **initialisation paresseuse** : la fonction n'est exécutée qu'une seule fois, au premier rendu (pas à chaque rendu).
- `useEffect(..., [tasks])` : s'exécute après chaque rendu où `tasks` a changé → synchronisation automatique.
- localStorage ne stocke que du texte → `JSON.stringify` pour sauvegarder, `JSON.parse` pour relire.
- `try / catch` dans `loadTasks` : si le contenu est corrompu, on retourne `[]` au lieu de faire planter l'app.

### Formulaire contrôlé + validation
- Chaque champ a `value={form.xxx}` et `onChange={handleChange}` → c'est React qui contrôle la valeur.
- Un seul `handleChange` pour tous les champs grâce à `name` : `setForm({ ...form, [name]: value })`.
- `validate()` retourne un objet d'erreurs : titre obligatoire (≥ 3 caractères), date obligatoire et pas dans le passé.
- `e.preventDefault()` empêche le rechargement de la page à l'envoi.
- `noValidate` désactive la validation du navigateur pour afficher **nos** messages.

### Filtres et progression = valeurs dérivées
```js
const doneCount = tasks.filter(t => t.statut === "terminée").length;
const percent = tasks.length === 0 ? 0 : Math.round(doneCount / tasks.length * 100);
const visibleTasks = filter === "toutes" ? tasks : tasks.filter(t => t.statut === filter);
```
On ne les met **pas** dans un state : ils se calculent à partir de `tasks`. Les stocker créerait un risque de désynchronisation.
Seul le filtre choisi (`filter`) est un state.

### key dans map()
`<TaskItem key={task.id} />` : l'id est unique et stable. On n'utilise **pas l'index** car après une suppression les index changent et React peut mélanger les éléments.

---

## 3. Module 4 — Assistant IA (`/assistant`)

### Les 5 states
| State | Rôle |
|---|---|
| `question` | texte tapé (formulaire contrôlé) |
| `askedQuestion` | la question de la dernière réponse (affichée au-dessus) |
| `answer` | texte renvoyé par l'IA |
| `loading` | `true` pendant l'appel → spinner + bouton désactivé |
| `error` | message d'erreur à afficher |

### Bouton désactivé
```js
const isDisabled = question.trim() === "" || loading;
```
`trim()` empêche d'envoyer une question composée uniquement d'espaces.

### L'appel asynchrone
```js
async function handleAsk() {
  setLoading(true); setError(""); setAnswer("");
  try {
    const text = await askAI(q);
    setAnswer(text);
  } catch (err) {
    setError(...);
  } finally {
    setLoading(false);   // exécuté dans TOUS les cas
  }
}
```
- `await` attend la réponse sans bloquer l'interface.
- `finally` garantit que le chargement s'arrête, succès ou erreur.
- `TypeError` = `fetch` n'a pas pu joindre le serveur (pas d'internet) → message "vérifie ta connexion".
- `response.ok` est faux pour les codes 4xx/5xx → `fetch` ne lève pas d'erreur tout seul, donc on la lance nous-mêmes avec un message convivial (clé invalide, trop de requêtes, service indisponible…).

**Pourquoi pas de useEffect ici ?** L'appel est déclenché par une **action de l'utilisateur** (clic), pas par l'affichage de la page. On l'appelle donc directement dans le handler.

### La clé API
- Stockée dans `.env.local` : `VITE_AI_API_KEY=...`
- Lue avec `import.meta.env.VITE_AI_API_KEY`.
- Vite n'expose au navigateur que les variables qui commencent par `VITE_`.
- `.env.local` est ignoré par Git (`*.local` dans `.gitignore`) → la clé n'est jamais publiée.
- Il faut **relancer `npm run dev`** après modification du fichier `.env`.
- Limite honnête à connaître : dans une app 100 % front-end, la clé finit quand même dans le code envoyé au navigateur. En production, on passerait par un petit serveur (backend) qui garde la clé.

### Choix du fournisseur
Gemini par défaut (`VITE_AI_PROVIDER=gemini`) ou Groq (`VITE_AI_PROVIDER=groq`). La page ne sait pas quel fournisseur est utilisé : elle appelle seulement `askAI(question)`.

---

## 4. Module 5 — Accueil (`/`) et design

### Statistiques
```jsx
// App.jsx (Lina) : <Route path="/" element={<Home nbFavoris={favoris.length} />} />
export default function Home({ nbFavoris }) {
  const [tasks] = useState(loadTasks);          // lecture au montage
  const done = tasks.filter(t => t.statut === "terminée").length;
  const percent = tasks.length === 0 ? 0 : Math.round(done / tasks.length * 100);
```
- **Favoris** : reçus par **props** depuis `App`. C'est `App` qui possède l'état des favoris (hook `useFavoris` de Lina) et le partage avec la Navbar, le catalogue, la page Favoris et l'accueil → un seul état, toujours synchronisé.
- **Tâches** : lues dans le localStorage avec `useState(loadTasks)` (initialisation paresseuse). Chaque fois qu'on revient sur `/`, React Router remonte le composant → les stats sont relues et à jour.
- En cours / terminées / % sont des **valeurs dérivées** (calculées, pas stockées dans un state).
- **Pourquoi pas useEffect + setState ici ?** Lire une donnée au premier rendu se fait directement dans l'initialisation du state. Faire `setState` dans un `useEffect` provoquerait un rendu inutile (et la règle ESLint `react-hooks` le signale).

### Réutilisation
`ProgressBar` est utilisée dans `Revisions` **et** dans `Home` → c'est l'intérêt des composants réutilisables.
`StatCard` est utilisée 4 fois avec des props différentes.

### Design responsive
- Variables CSS dans `:root` (`--primary`, `--danger`…) → couleurs cohérentes partout, modifiables en un seul endroit.
- **CSS Grid** pour les mises en page (`grid-template-columns`).
- **Media queries** : 4 colonnes → 2 colonnes (< 900px) → 1 colonne (< 500px). Formulaire et liste côte à côte sur PC, l'un sous l'autre sur mobile.
- Navbar : `NavLink` ajoute automatiquement la classe `active` au lien de la page courante → stylée dans `global.css`.

---

## 5. Questions probables du professeur (et réponses courtes)

**Q : Différence entre props et state ?**
Le state appartient au composant et peut changer (avec son setter) → re-rendu. Les props sont reçues du parent, en lecture seule.

**Q : Pourquoi useEffect pour le localStorage ?**
Écrire dans le localStorage est un *effet de bord* (en dehors du rendu). useEffect s'exécute après le rendu, et avec `[tasks]` uniquement quand les tâches changent.

**Q : Que se passe-t-il si on oublie le tableau de dépendances ?**
L'effet s'exécute après **chaque** rendu. S'il fait un `setState`, on peut créer une boucle infinie.

**Q : Que se passe-t-il avec `[]` ?**
Une seule exécution, au montage du composant.

**Q : Pourquoi `setTasks(prev => ...)` et pas `setTasks([...tasks, task])` ?**
Les deux fonctionnent ici, mais la forme fonctionnelle garantit d'utiliser la dernière valeur du state, même si plusieurs mises à jour arrivent rapidement.

**Q : Pourquoi `Date.now()` comme id ?**
Unique (millisecondes) et stable dans le temps, contrairement à l'index du tableau.

**Q : Pourquoi `e.preventDefault()` ?**
Par défaut, l'envoi d'un formulaire recharge la page → on perdrait le state.

**Q : Pourquoi le bouton est désactivé pendant le chargement ?**
Pour éviter d'envoyer plusieurs requêtes identiques (et de consommer le quota de l'API).

**Q : Comment la page d'accueil connaît le nombre de favoris ?**
Elle lit le localStorage avec la même clé que la page Favoris (`skillup_favoris`).

**Q : Que fait `JSON.stringify` / `JSON.parse` ?**
localStorage ne stocke que des chaînes : stringify transforme le tableau en texte, parse le retransforme en tableau.

**Q : Qu'est-ce qu'un composant fonctionnel ?**
Une fonction JavaScript qui reçoit des props et retourne du JSX. Les hooks (`useState`, `useEffect`) ne fonctionnent que dans ces composants (et au premier niveau, jamais dans un `if` ou une boucle).

---

## 6. À comprendre aussi dans la partie de Lina (questions individuelles !)

Fichiers de Lina : `main.jsx`, `App.jsx`, `components/Navbar.jsx`, `ResourceCard.jsx`, `SearchBar.jsx`, `CategoryFilter.jsx`, `pages/Ressources.jsx`, `ResourceDetails.jsx`, `Favoris.jsx`, `hooks/useFavoris.js`, `services/openLibraryApi.js`.

- **Bootstrap** : importé dans `main.jsx` (CSS + JS pour le menu burger sur mobile). Nos styles utilisent des noms différents (`.panel`, `.su-progress`) pour ne pas entrer en conflit avec `.card`, `.btn`, `.progress` de Bootstrap.
- **React Router** : `BrowserRouter` est dans `main.jsx` et englobe toute l'app ; dans `App.jsx`, `Routes` / `Route path="..." element={...}` associe une URL à une page → navigation **sans rechargement**. La route `*` affiche la page 404.
- **NavLink vs Link** (`Navbar.jsx`) : NavLink sait si son lien est actif (classe `active`) ; `end` sur `/` évite que « Accueil » soit actif sur toutes les pages. La Navbar affiche aussi un badge avec le nombre de favoris.
- **Route dynamique** `/ressources/:id` (`ResourceDetails.jsx`) : on récupère l'id avec `const { id } = useParams();`.
- **Open Library** (`openLibraryApi.js`) : `fetch` vers `/search.json` (catalogue) et `/works/{id}.json` (détails). Dans `Ressources.jsx`, le `useEffect` dépend de `[motCle, categorie, essai]` → nouvelle recherche quand le mot-clé ou la catégorie change (`essai` sert au bouton « Réessayer »). Dans `ResourceDetails.jsx`, il dépend de `[id]`. États chargement / erreur / aucun résultat.
- **Hook personnalisé `useFavoris`** : regroupe le state des favoris + les actions. Même principe que nos tâches : `useState(lireFavoris)` (initialisation paresseuse), `useEffect(..., [favoris])` pour sauvegarder, dédoublonnage avec `some()`, retrait avec `filter()`.
- **Pourquoi les favoris sont dans `App` ?** Plusieurs composants en ont besoin (Navbar, Ressources, Détails, Favoris, Accueil) → on remonte l'état au parent commun et on le passe par props (*lifting state up*).
- **`ResourceCard`** ne gère aucun état : tout arrive par props → composant réutilisable (catalogue + page Favoris).

---

## 7. Démo (ordre conseillé, ~5 min)

1. **Accueil** : présentation + statistiques (à 0 au début).
2. **Ressources** : recherche + filtre + détail (Lina).
3. **Favoris** : ajouter 2 favoris, rafraîchir la page → toujours là (Lina).
4. **Révisions** : envoyer le formulaire vide (erreurs), ajouter 3 tâches, en terminer 1 → barre à 33 %, filtres, suppression, rafraîchir.
5. **Assistant** : bouton désactivé quand vide, cliquer une suggestion, montrer « L'assistant réfléchit... » puis la réponse.
6. **Retour à l'accueil** : les statistiques ont changé (favoris + tâches + %).
7. Montrer `.env.local` / `.env.example` et expliquer pourquoi la clé n'est pas dans le code.
