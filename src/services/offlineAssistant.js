// Moteur de l'assistant SkillUp — 100 % local, basé sur des règles.
// Ce n'est PAS une vraie IA : il reconnaît des intentions par mots-clés,
// lit vos données (tâches, progression) et puise dans une base de connaissances.
// Syntaxe des réponses : **gras**, `code`, listes "- ", liens [texte](/route).

import { CATEGORIES, getCategory } from './openLibraryApi.js'
import { addDays, relativeDue, toKey, todayKey } from '../utils/date.js'

export const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')

const has = (text, words) => words.some((w) => text.includes(w))

export const SUGGESTIONS = [
  'Quelle est la différence entre props et state en React ?',
  'Quel est le rôle des dépendances dans useEffect ?',
  'Explique-moi la technique Pomodoro',
  "Qu'est-ce que je dois faire aujourd'hui ?",
  'Recommande-moi une ressource en SQL',
  'Ajoute une tâche : réviser les graphes pour demain',
  'Où en est ma progression ?',
  'Comment mémoriser plus efficacement ?',
  "C'est quoi la complexité O(n log n) ?",
]

// ---------- Base de connaissances ----------
const KNOWLEDGE = [
  {
    keys: ['props', 'difference entre props et state', 'props et state'],
    answer: `**Props** et **state** sont deux sources de données d'un composant React :

- Les **props** viennent du composant **parent**. Elles sont en **lecture seule** : le composant enfant ne les modifie jamais.
- Le **state** est la **mémoire interne** du composant, créé avec \`useState\`. Le composant le modifie lui-même avec son setter, ce qui déclenche un nouveau rendu.

Règle simple : si une donnée est **reçue**, c'est une prop ; si elle **change dans le temps** à cause d'une action de l'utilisateur, c'est du state.

Exemple dans SkillUp : la page Ressources garde la liste des livres dans son state, puis passe chaque livre à \`<ResourceCard resource={r} onToggleFavorite={…} />\` sous forme de props.`,
    follow: ['Quel est le rôle des dépendances dans useEffect ?', 'Et useState ?'],
  },
  {
    keys: ['dependance', 'tableau de dependance'],
    answer: `Le **tableau de dépendances** de \`useEffect\` indique **quand** l'effet doit se relancer :

- \`useEffect(fn)\` → après **chaque** rendu
- \`useEffect(fn, [])\` → **une seule fois**, au montage du composant
- \`useEffect(fn, [a, b])\` → au montage, puis **chaque fois que \`a\` ou \`b\` change**

Il faut y mettre **toutes** les valeurs du composant utilisées dans l'effet, sinon l'effet travaille avec des valeurs périmées.

Exemple dans SkillUp : \`useEffect(() => { … searchBooks(searchTerm, category) … }, [searchTerm, category])\` relance la recherche Open Library dès que le mot-clé ou la catégorie change.`,
    follow: ['Quelle est la différence entre props et state en React ?', 'Comment fonctionne useEffect en React ?'],
  },
  {
    keys: ['pomodoro'],
    answer: `La **technique Pomodoro** découpe le travail en sprints courts et intenses :

- **25 min** de concentration totale, une seule tâche, téléphone hors de portée
- **5 min** de vraie pause (marcher, boire de l'eau — pas d'écran)
- Après **4 cycles**, une pause longue de 15 à 30 min

Pourquoi ça marche : la limite de temps réduit la procrastination (« seulement 25 minutes ») et les pauses protègent l'attention.

Astuce : lancez le **minuteur Focus** de l'[accueil](/?focus=1) — chaque session terminée compte dans vos statistiques.`,
    follow: ['Comment éviter la procrastination ?', 'Comment mémoriser plus efficacement ?'],
  },
  {
    keys: ['memoris', 'retenir', 'rappel actif', 'active recall', 'oublie'],
    answer: `Pour **mémoriser durablement**, deux techniques ont le plus de preuves scientifiques :

- **Le rappel actif** : fermez le cours et essayez de restituer de mémoire (feuille blanche, flashcards, auto-quiz). Relire donne une illusion de maîtrise ; se tester crée la mémoire.
- **La répétition espacée** : revoyez une notion à J+1, J+3, J+7 puis J+21. Chaque révision juste avant l'oubli renforce le souvenir.

Combinez-les : créez des tâches de révision espacées dans la page [Révisions](/revisions).`,
    follow: ['Explique la répétition espacée', 'Comment prendre de bonnes notes ?'],
  },
  {
    keys: ['repetition espacee', 'spaced'],
    answer: `La **répétition espacée** consiste à revoir une notion à des intervalles de plus en plus longs :

- **J+1** → première révision (rapide, 5–10 min)
- **J+3** → deuxième passage, en vous testant
- **J+7** puis **J+21** → consolidation

Si vous échouez à un rappel, raccourcissez l'intervalle suivant. Planifiez ces révisions comme des tâches à priorité basse dans la page [Révisions](/revisions) : elles prennent peu de temps mais rapportent énormément.`,
    follow: ['Ajoute une tâche : révision espacée pour demain', 'Explique-moi la technique Pomodoro'],
  },
  {
    keys: ['procrastin', 'motivation', 'motive', 'flemme'],
    answer: `La procrastination est surtout une **fuite d'émotion désagréable**, pas de la paresse. Quelques leviers concrets :

- **Rendez la première étape ridicule** : « ouvrir le PDF et lire un paragraphe ».
- **Règle des 2 minutes** : si ça prend moins de 2 minutes, faites-le tout de suite.
- **Timeboxing** : 25 minutes avec le minuteur Focus, puis vous avez le droit d'arrêter.
- **Environnement** : téléphone dans une autre pièce, un seul onglet ouvert.

La motivation vient souvent **après** avoir commencé, pas avant.`,
    follow: ['Explique-moi la technique Pomodoro', "Qu'est-ce que je dois faire aujourd'hui ?"],
  },
  {
    keys: ['stress', 'examen', 'angoisse', 'partiel'],
    answer: `Pour aborder un **examen** plus sereinement :

- **J-7** : listez les chapitres, faites un examen blanc pour repérer vos points faibles.
- **J-3** : rappel actif ciblé sur ces points faibles, pas de nouvelles notions.
- **La veille** : révision légère, sommeil complet (le sommeil consolide la mémoire).
- **Pendant** : lisez tout le sujet, commencez par ce que vous maîtrisez.

Une respiration lente (4 s inspiration, 6 s expiration) pendant une minute calme réellement le système nerveux.`,
    follow: ['Comment mémoriser plus efficacement ?', 'Ajoute une tâche : examen blanc pour samedi'],
  },
  {
    keys: ['note', 'cornell', 'prise de note'],
    answer: `La **méthode Cornell** est simple et efficace :

- Divisez la page : une grande colonne **notes** à droite, une étroite **mots-clés / questions** à gauche, une bande **résumé** en bas.
- Pendant le cours : notez dans la colonne de droite, en abrégé.
- Juste après : écrivez des **questions** à gauche.
- Pour réviser : cachez la droite et répondez aux questions de gauche → rappel actif automatique.`,
    follow: ['Comment mémoriser plus efficacement ?', 'Explique la répétition espacée'],
  },
  {
    keys: ['useeffect', 'use effect'],
    answer: `\`useEffect\` synchronise un composant React avec quelque chose d'**extérieur** (API, timer, LocalStorage, DOM…).

- \`useEffect(fn)\` → s'exécute après **chaque** rendu
- \`useEffect(fn, [])\` → une seule fois, au montage
- \`useEffect(fn, [a, b])\` → quand \`a\` ou \`b\` change

La fonction retournée sert au **nettoyage** (arrêter un timer, retirer un écouteur).

Exemple utilisé dans SkillUp : \`useEffect(() => localStorage.setItem(key, JSON.stringify(state)), [state])\` sauvegarde les données à chaque modification.

À éviter : utiliser un effet pour calculer une valeur dérivée — calculez-la directement pendant le rendu.`,
    follow: ['Et useState ?', 'Recommande-moi une ressource en React'],
  },
  {
    keys: ['usestate', 'use state', 'etat react', 'state'],
    answer: `\`useState\` donne une **mémoire** à un composant :

\`const [count, setCount] = useState(0)\`

- \`count\` est la valeur actuelle, \`setCount\` déclenche un nouveau rendu.
- Pour une mise à jour basée sur la valeur précédente : \`setCount(c => c + 1)\`.
- Ne modifiez jamais un objet/tableau d'état directement : créez-en une copie (\`[...list, item]\`).

Quand l'état devient complexe (comme le store de SkillUp), \`useReducer\` centralise la logique.`,
    follow: ['Comment fonctionne useEffect en React ?', 'Recommande-moi une ressource en React'],
  },
  {
    keys: ['closure', 'fermeture'],
    answer: `Une **closure** est une fonction qui se souvient des variables de l'endroit où elle a été créée, même après la fin de cette portée.

\`function compteur() { let n = 0; return () => ++n }\`
\`const next = compteur(); next(); next() // 2\`

\`n\` n'est accessible que par \`next\` : c'est une variable **privée**. Les closures sont partout en React (gestionnaires d'événements, hooks).`,
    follow: ['Comment fonctionne useEffect en React ?', 'Recommande-moi une ressource en JavaScript'],
  },
  {
    keys: ['jointure', 'join'],
    answer: `Les **jointures SQL** combinent des lignes de plusieurs tables :

- \`INNER JOIN\` → seulement les lignes qui ont une correspondance des deux côtés
- \`LEFT JOIN\` → toutes les lignes de gauche, avec \`NULL\` si pas de correspondance à droite
- \`RIGHT JOIN\` → l'inverse
- \`FULL OUTER JOIN\` → tout, des deux côtés

Exemple : \`SELECT e.nom, c.titre FROM etudiants e LEFT JOIN cours c ON c.id = e.cours_id\` liste aussi les étudiants sans cours.

Pour pratiquer : [les livres sur SQL](/ressources?q=sql).`,
    follow: ['Recommande-moi une ressource en SQL', 'Ajoute une tâche : exercices SQL pour demain'],
  },
  {
    keys: ['complexite', 'big o', 'o(n', 'log n'],
    answer: `La **complexité** mesure comment le temps d'un algorithme grandit avec la taille \`n\` des données :

- \`O(1)\` → constant (accès à un tableau par indice)
- \`O(log n)\` → divise le problème à chaque étape (recherche dichotomique)
- \`O(n)\` → un parcours (chercher le maximum)
- \`O(n log n)\` → tris efficaces (tri fusion, tri rapide en moyenne)
- \`O(n²)\` → deux boucles imbriquées (tri à bulles)

Pour \`n = 1 000 000\` : \`n log n\` ≈ 20 millions d'opérations, \`n²\` = 1 000 milliards. Visualisez-les sur [les livres d'algorithmique](/ressources?q=algorithms).`,
    follow: ['Explique la récursivité', 'Recommande-moi une ressource en algorithmique'],
  },
  {
    keys: ['recursi'],
    answer: `Une fonction **récursive** s'appelle elle-même sur un problème plus petit. Il faut toujours :

- un **cas de base** qui arrête la récursion
- un **appel récursif** qui se rapproche de ce cas de base

\`function fact(n) { return n <= 1 ? 1 : n * fact(n - 1) }\`

Sans cas de base → dépassement de pile (*stack overflow*). La récursivité est naturelle pour les arbres, les graphes et « diviser pour régner ».`,
    follow: ["C'est quoi la complexité O(n log n) ?", 'Recommande-moi une ressource en algorithmique'],
  },
  {
    keys: ['git', 'commit', 'branche', 'merge', 'rebase'],
    answer: `Les bases de **Git** au quotidien :

- \`git add .\` puis \`git commit -m "message"\` → enregistrer un instantané
- \`git switch -c ma-branche\` → créer une branche pour une fonctionnalité
- \`git merge ma-branche\` → intégrer la branche dans la branche courante
- \`git pull\` / \`git push\` → synchroniser avec le dépôt distant

Un bon commit = **une** modification logique + un message à l'impératif (« Ajoute le filtre par catégorie »). Pour s'entraîner visuellement : [les livres sur Git](/ressources?q=git).`,
    follow: ['Recommande-moi une ressource en Git', 'Comment fonctionne useEffect en React ?'],
  },
  {
    keys: ['flexbox', 'grid', 'css'],
    answer: `**Flexbox ou Grid ?**

- **Flexbox** → une dimension (une ligne *ou* une colonne) : barres de navigation, alignement d'éléments, boutons.
- **Grid** → deux dimensions (lignes *et* colonnes) : mises en page complètes, galeries de cartes.

Astuce responsive sans media query : \`grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))\` — c'est ce qu'utilise la page Ressources de SkillUp.`,
    follow: ['Recommande-moi une ressource en CSS', 'Comment fonctionne useEffect en React ?'],
  },
  {
    keys: ['machine learning', 'apprentissage automatique', 'reseau de neurone', 'deep learning', ' ml '],
    answer: `Le **machine learning** consiste à apprendre une fonction à partir d'exemples au lieu de la programmer à la main.

- **Supervisé** : exemples étiquetés (prédire un prix, classer un e-mail)
- **Non supervisé** : trouver des structures (regrouper des clients)
- **Par renforcement** : apprendre par essais/récompenses

Le piège classique : le **sur-apprentissage** — le modèle mémorise l'entraînement mais généralise mal. On le détecte avec un jeu de **validation**.

Pour commencer : [les livres de machine learning](/ressources?q=machine%20learning).`,
    follow: ['Recommande-moi une ressource en IA', 'Explique les valeurs propres'],
  },
  {
    keys: ['valeur propre', 'valeurs propres', 'vecteur propre', 'vecteurs propres', 'eigen', 'matrice'],
    answer: `Un **vecteur propre** d'une matrice \`A\` est un vecteur dont la **direction ne change pas** quand on applique \`A\` : il est seulement étiré ou rétréci.

\`A·v = λ·v\` → \`λ\` est la **valeur propre** (le facteur d'étirement).

Pour les trouver : résoudre \`det(A − λI) = 0\`, puis pour chaque \`λ\`, résoudre \`(A − λI)v = 0\`.

L'intuition visuelle est magnifique chez [les livres d'algèbre linéaire](/ressources?q=linear%20algebra).`,
    follow: ['Recommande-moi une ressource en mathématiques', 'Comment mémoriser plus efficacement ?'],
  },
  {
    keys: ['plan de revision', 'organiser', 'planning', 'emploi du temps', 'planifier'],
    answer: `Une méthode simple pour **organiser vos révisions** :

- **Listez** tout ce qui doit être su, chapitre par chapitre.
- **Estimez** chaque chapitre (petit / moyen / gros) et placez-les à rebours depuis la date d'examen.
- **Priorité haute** pour ce qui est difficile *et* important.
- Gardez **20 % de marge** pour l'imprévu.
- Terminez chaque journée en cochant vos tâches : voir la progression motive.

Tout cela se fait dans la page [Révisions](/revisions) — ou demandez-moi : « ajoute une tâche : … pour vendredi ».`,
    follow: ["Qu'est-ce que je dois faire aujourd'hui ?", 'Ajoute une tâche : réviser les graphes pour demain'],
  },
]

// ---------- Recommandations par sujet ----------
// Mot-clé reconnu → recherche à lancer dans le catalogue Open Library
const TOPICS = [
  { words: ['react', 'hook'], query: 'react', label: 'React' },
  { words: ['javascript', ' js'], query: 'javascript', label: 'JavaScript' },
  { words: ['css', 'responsive', 'flexbox'], query: 'css', label: 'CSS' },
  { words: ['html', 'web'], query: 'web development', label: 'le développement web' },
  { words: ['sql', 'base de donnee', 'bdd'], query: 'sql', label: 'SQL' },
  { words: ['python'], query: 'python', label: 'Python' },
  { words: [' ia ', 'intelligence artificielle', 'machine learning', 'deep', 'data'], query: 'machine learning', label: "l'IA et la data" },
  { words: ['algo', 'structure de donnee', 'tri', 'graphe'], query: 'algorithms', label: "l'algorithmique" },
  { words: ['math', 'algebre', 'stat', 'proba'], query: 'mathematics', label: 'les mathématiques' },
  { words: ['design', 'ux', 'ui', 'typo'], query: 'user interface design', label: 'le design UI/UX' },
  { words: ['git'], query: 'git', label: 'Git' },
]

const linkTo = (r) => `[${r.title}](/ressources/${r.id})`

// ---------- Analyse des dates en français ----------
const WEEKDAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function parseDue(text) {
  if (has(text, ['apres-demain', 'apres demain'])) return toKey(addDays(new Date(), 2))
  if (text.includes('demain')) return toKey(addDays(new Date(), 1))
  if (has(text, ['aujourd hui', 'ce soir', 'aujourdhui'])) return todayKey()
  if (text.includes('semaine prochaine')) return toKey(addDays(new Date(), 7))
  const wd = WEEKDAY_NAMES.findIndex((d) => text.includes(d))
  if (wd >= 0) {
    const diff = (wd - new Date().getDay() + 7) % 7 || 7
    return toKey(addDays(new Date(), diff))
  }
  const m = text.match(/dans (\d{1,2}) jours?/)
  if (m) return toKey(addDays(new Date(), Number(m[1])))
  return null
}

function extractTaskTitle(raw) {
  let t = raw.replace(/^.*?(ajoute[rz]?|cree[rz]?|crée[rz]?|planifie[rz]?|nouvelle)\s*(moi\s*)?(une\s*)?(tache|tâche)?\s*[:\-–]?\s*/i, '')
  t = t.replace(/\s+(pour\s+)?(aujourd['’]?hui|demain|apr[eè]s[- ]demain|ce soir|la semaine prochaine|dans \d+ jours?|(ce\s+)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)( prochain)?)\s*[.!?]*$/i, '')
  t = t.replace(/\s+(priorit[eé]\s+)?(haute|urgente?|basse|moyenne)\s*$/i, '')
  t = t.replace(/^(de|d['’])\s*/i, '').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Produit une réponse à partir du message et du contexte de l'utilisateur.
 * @returns {{ text: string, follow?: string[], action?: object }}
 */
export function respond(message, ctx) {
  const text = ` ${normalize(message)} `
  const { state, stats } = ctx
  const name = state.user.name

  // 1. Créer une tâche
  if (has(text, ['ajoute', 'cree', 'planifie', 'nouvelle tache']) && has(text, ['tache', 'reviser', 'revision', 'pour ', 'demain', 'faire'])) {
    const title = extractTaskTitle(message)
    if (title.length < 3) {
      return { text: 'Bien sûr ! Quel est l’intitulé de la tâche ? Par exemple : « Ajoute une tâche : réviser les arbres binaires pour jeudi ».' }
    }
    const due = parseDue(text) ?? todayKey()
    const priority = has(text, ['urgent', 'haute', 'important']) ? 'high' : has(text, ['basse', 'facile']) ? 'low' : 'medium'
    const label = { high: 'haute', medium: 'moyenne', low: 'basse' }[priority]
    return {
      text: `C'est fait ✓ J'ai ajouté **« ${title} »** à la page [Révisions](/revisions) — échéance **${relativeDue(due).toLowerCase()}**, priorité **${label}**.`,
      action: { type: 'addTask', task: { title, due, priority, subject: 'Assistant' } },
      follow: ["Qu'est-ce que je dois faire aujourd'hui ?", 'Comment organiser mes révisions ?'],
    }
  }

  // 2. Salutations
  if (/^\s*(bonjour|salut|hello|hey|coucou|bonsoir|ahla|aslema|salam)\b/.test(text)) {
    return {
      text: `Bonjour ${name} 👋 Je suis l'assistant de SkillUp. Je peux lire votre planning, ajouter des tâches, recommander des ressources et expliquer des notions de cours. Par quoi on commence ?`,
      follow: SUGGESTIONS.slice(0, 3),
    }
  }

  // 3. Que sais-tu faire ?
  if (has(text, ['aide', 'que sais-tu', 'que peux-tu', 'tu sais faire', 'qui es-tu', 'qui es tu', 'help'])) {
    return {
      text: `Voici ce que je sais faire, entièrement **hors ligne** :

- **Votre planning** : « qu'est-ce que je dois faire aujourd'hui ? »
- **Ajouter une tâche** : « ajoute une tâche : réviser SQL pour vendredi »
- **Votre progression** : « où en est ma progression ? »
- **Recommandations** : « recommande-moi une ressource en Python »
- **Expliquer** : Pomodoro, rappel actif, useEffect, closures, jointures SQL, complexité, Git, valeurs propres…

Je suis un assistant à règles, pas une vraie IA générative : je reconnais des mots-clés.`,
      follow: SUGGESTIONS.slice(0, 4),
    }
  }

  // 4. Tâches du jour / à faire
  if (has(text, ['aujourd hui', 'a faire', 'dois faire', 'mes taches', 'en retard', 'programme', 'agenda'])) {
    const today = todayKey()
    const open = state.tasks.filter((t) => !t.done)
    const overdue = open.filter((t) => t.due < today)
    const todayTasks = open.filter((t) => t.due === today)
    const upcoming = open.filter((t) => t.due > today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3)
    if (!open.length) {
      return { text: `Tout est terminé, ${name} ! 🎉 Aucune tâche ouverte. Profitez-en pour avancer une ressource ou planifier la suite dans la page [Révisions](/revisions).` }
    }
    // Tableau construit sans push : chaque bloc n'apparaît que s'il a du contenu
    const lines = [
      overdue.length > 0 && `**En retard (${overdue.length})**\n${overdue.map((t) => `- ${t.title} — ${relativeDue(t.due).toLowerCase()}`).join('\n')}`,
      todayTasks.length > 0 && `**Aujourd'hui (${todayTasks.length})**\n${todayTasks.map((t) => `- ${t.title}`).join('\n')}`,
      upcoming.length > 0 && `**Ensuite**\n${upcoming.map((t) => `- ${t.title} — ${relativeDue(t.due).toLowerCase()}`).join('\n')}`,
    ].filter(Boolean)
    const tip = overdue.length
      ? 'Conseil : commencez par la tâche en retard la plus courte pour relancer la dynamique.'
      : 'Conseil : attaquez la tâche la plus difficile pendant votre premier Pomodoro.'
    return { text: `${lines.join('\n\n')}\n\n${tip} → [Ouvrir mes révisions](/revisions)`, follow: ['Explique-moi la technique Pomodoro', 'Où en est ma progression ?'] }
  }

  // 5. Progression / statistiques
  if (has(text, ['progression', 'statistique', 'stats', 'avancement', 'mon niveau', 'serie', 'bilan'])) {
    const inProgress = Object.entries(state.progress)
      .filter(([, v]) => v > 0 && v < 100)
      .map(([id, v]) => ({ r: ctx.getResource(id), v }))
      .filter((x) => x.r)
    return {
      text: `Votre bilan, ${name} :

- **${stats.tasksDone}/${stats.tasksTotal}** tâches terminées (${stats.taskRate} %)
- **${stats.weekMinutes} min** de focus cette semaine — ${stats.goalRate} % de l'objectif
- **${stats.completed}** ressource(s) terminée(s), **${stats.started}** en cours
- Série active : **${stats.streak} jour(s)** 🔥
${inProgress.length ? `\nÀ reprendre : ${inProgress.map(({ r, v }) => `${linkTo(r)} (${v} %)`).join(', ')}.` : ''}`,
      follow: ["Qu'est-ce que je dois faire aujourd'hui ?", 'Recommande-moi une ressource'],
    }
  }

  // 6. Recommandations
  if (has(text, ['recommand', 'ressource', 'conseille', 'cours sur', 'apprendre', 'tuto', 'livre'])) {
    const topic = TOPICS.find((t) => has(text, t.words))
    // Favoris pas encore terminés (dans la catégorie du sujet si possible)
    const saved = state.favorites
      .map((f) => ctx.getResource(f.id))
      .filter((r) => r && (state.progress[r.id] ?? 0) < 100)
      .slice(0, 3)
    const search = topic
      ? `- [Voir les livres sur ${topic.label}](/ressources?q=${encodeURIComponent(topic.query)}) dans le catalogue Open Library`
      : '- [Parcourir tout le catalogue](/ressources)'
    return {
      text: `${topic ? `Pour ${topic.label}, je vous propose :` : 'Voici où commencer :'}

${search}
${saved.length ? `\nDans vos favoris, à continuer :\n${saved.map((r) => `- ${linkTo(r)} — ${r.author}`).join('\n')}` : ''}

Ouvrez un livre et ajoutez-le à vos favoris pour le retrouver facilement.`,
      follow: ['Recommande-moi une ressource en IA', 'Comment mémoriser plus efficacement ?'],
    }
  }

  // 7. Base de connaissances
  const hit = KNOWLEDGE.find((k) => has(text, k.keys))
  if (hit) return { text: hit.answer, follow: hit.follow }

  // 8. Remerciements
  if (has(text, ['merci', 'super', 'genial', 'parfait', 'top'])) {
    return { text: `Avec plaisir, ${name} ! Bon courage pour la suite ✨`, follow: SUGGESTIONS.slice(4, 7) }
  }

  // 9. Repli
  const cats = CATEGORIES.map((c) => getCategory(c.id).label.toLowerCase()).join(', ')
  return {
    text: `Je n'ai pas de réponse précise à cela — je suis un assistant local à règles, pas une IA générative. Essayez de reformuler avec un mot-clé, ou demandez-moi :

- votre **planning** ou votre **progression**
- d'**ajouter une tâche**
- une **ressource** en ${cats}
- une explication : Pomodoro, rappel actif, useEffect, jointures SQL, complexité, Git…`,
    follow: SUGGESTIONS.slice(0, 4),
  }
}
