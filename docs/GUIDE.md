# Guide complet — dync_img

Cet outil transforme **n'importe quelle image** (PNG, JPEG, SVG, WebP) en schéma
interactif : on clique sur une zone, le reste s'assombrit, une ligne animée
part vers un panneau qui glisse depuis le bord de l'écran (gauche ou droite,
au choix) et déroule le contenu du bloc "de A à Z" — étape par étape, avec un
exemple qui s'écrit en direct.

Ce document explique, dans l'ordre où le projet a été construit :
1. l'architecture technique et *pourquoi* chaque choix a été fait ;
2. comment chaque effet visuel (fidélité à l'image, survol/sélection, panneau,
   style) est obtenu, avec les fichiers exacts ;
3. **tous les prompts** utilisés, étape par étape, pour reconstruire cet outil
   avec un agent de codage (Claude Code) à partir de zéro — ou pour l'adapter
   à un autre besoin ;
4. comment l'utiliser au quotidien (éditeur, assistant IA, exports).

---

## 1. Vue d'ensemble

```
Image (n'importe laquelle)  +  fichier projet JSON (zones, textes, couleurs)
                    │
                    ▼
         ┌─────────────────────┐
         │   dync_img (React)  │  ← app locale : édite le projet
         └─────────────────────┘
                    │
       ┌────────────┼─────────────┐
       ▼            ▼             ▼
  Mode Aperçu   Export JSON   Export HTML autonome
  (dans l'app)  (réédition)   (page unique, sans build,
                               partageable telle quelle)
```

Le point clé : **l'image et son contenu sont des données**, pas du code câblé
en dur. Tout le reste (survol, sélection, panneau, style) est un moteur
générique qui lit ces données. C'est ce qui permet de réutiliser l'outil pour
n'importe quel schéma, diagramme ou capture d'écran.

## 2. Stack et arborescence

- **Vite + React + TypeScript**, sans framework CSS ni state-manager externe
  (juste `useReducer` + Context) : le projet reste lisible et sans dépendance
  qui casse dans deux ans.
- Aucune image binaire n'est versionnée : la démo intégrée est un SVG généré
  en JS (`src/lib/sampleProject.ts`), pour que le dépôt fonctionne pour
  n'importe qui sans image propriétaire.

```
src/
  types.ts                 → modèle de données (Project, Hotspot, Group…)
  lib/
    geometry.ts             → maths en pourcentage (0-100) : hit-test, resize…
    sampleProject.ts         → projet de démo généré (image SVG + 6 blocs)
    projectIO.ts              → upload image, import/export JSON
    ai.ts                      → appels à l'API Anthropic + PROMPTS exacts
    exportBundle.ts             → génère un .html autonome (vanilla JS)
    useGoogleFonts.ts             → charge les polices du thème du projet
    useTypewriter.ts                → effet "texte qui s'écrit"
  state/
    store.tsx                → Provider + hook useProject() (undo/redo)
  components/
    Stage.tsx                → boîte image, ratio garanti = ratio réel
    viewer/                   → mode "Aperçu" (lecture seule, animations)
    editor/                    → mode "Éditeur" (dessin, formulaire, IA)
  styles/
    theme.css                → variables de thème (couleurs, polices, radius)
    app.css                   → tout le layout + les animations
docs/GUIDE.md                → ce document
```

## 3. Le modèle de données (`src/types.ts`)

```ts
type HotspotShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "polygon"; points: { x: number; y: number }[] };

interface Connector {
  to: { x: number; y: number };          // point d'arrivée dans l'image
  toShape: HotspotShape | null;          // zone qui s'éclaire à l'arrivée (optionnel)
}

interface Hotspot {
  id: string; label: string; color: string; groupId: string | null;
  order: number;                 // position dans la navigation Précédent/Suivant
  areas: HotspotShape[];         // zones cliquables (souvent une seule) — toujours en %
  spotlightShape: HotspotShape | null; // ce qui s'éclaire ; null = union des `areas`
  anchor: { x: number; y: number };     // point de départ de la ligne connectrice
  connector?: Connector | null;  // undefined = hérite du groupe, null = aucun, objet = override
  seeAlso: string[];             // ids d'autres blocs proposés en "Explorer aussi"
  content: {
    summary: string;
    steps: { id: string; title: string; body: string }[]; // le "A à Z"
    example: string; whenToUse: string; caution: string; tools: string[];
  };
}

interface Group {
  id: string; label: string; color: string;
  connector: Connector | null;   // hérité par tous les blocs du groupe sauf override
}

interface Project {
  schemaVersion: 2;
  image: { src: string; width: number; height: number; alt: string };
  groups: Group[];               // familles/catégories, utilisées comme légende
  hotspots: Hotspot[];
  theme: {
    palette: string[]; fontDisplay: string; fontMono: string; panelSide: "left" | "right";
    interaction: { /* tout ce que règle le panneau Style — voir §13 */ };
  };
}
```

**Pourquoi des pourcentages et pas des pixels ?** Parce que l'image peut être
affichée à n'importe quelle taille (mobile, grand écran, export HTML). Une
zone à `x: 20, y: 10, w: 15, h: 12` reste au bon endroit quelle que soit la
résolution — pas besoin de recalculer quoi que ce soit au redimensionnement.

**`areas` vs `spotlightShape`, et pourquoi c'est séparé du contenu.** Un
bloc "vue d'ensemble" (ex. une famille de techniques) peut n'avoir qu'un
petit titre cliquable (`areas`) tout en éclairant tout son cadre au clic
(`spotlightShape`) — c'est la technique pour construire des **blocs
imbriqués** sans avoir besoin d'un champ parent/enfant explicite : l'imbrication
est géométrique (voir §13). Les anciens projets (`schemaVersion: 1`, avec un
seul champ `shape`) sont migrés automatiquement à l'import
(`lib/projectIO.ts`, fonction `migrateV1ToV2`).

## 4. Fidélité à l'image source

C'est le point qui posait problème dans la toute première version ("moche").
La technique retenue (`src/components/Stage.tsx`) :

```tsx
<div style={{ aspectRatio: `${image.width} / ${image.height}` }}>
  <img style={{ width: "100%", height: "100%" }} src={image.src} />
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0" />
</div>
```

La boîte englobante a **toujours** le ratio exact de l'image (via
`aspect-ratio` CSS). Le SVG par-dessus utilise un `viewBox="0 0 100 100"` avec
`preserveAspectRatio="none"` : il est donc étiré exactement comme la boîte,
et une coordonnée `(x=20, y=10)` dans les données tombe pixel pour pixel sur
le même point de l'image, à toute taille d'écran. Aucun `ResizeObserver`, aucun
recalcul JS au resize — c'est le CSS qui fait tout le travail. Cette astuce
est réutilisée telle quelle par le mode Éditeur (`DrawLayer.tsx`) pour que
dessiner une zone donne exactement les mêmes coordonnées que celles affichées
en lecture.

## 5. Survol et sélection (`components/viewer/HotspotsLayer.tsx`)

- Chaque zone est un `<polygon>` (un rectangle est converti en polygone à 4
  points pour un traitement uniforme).
- La couleur du bloc est passée en variable CSS (`--hs-color`) plutôt qu'en
  style inline direct, pour que les états `.hovered` / `.selected` /
  `.dimmed` définis dans `app.css` puissent la *surcharger proprement* (les
  classes CSS ont plus de poids qu'une variable custom property).
- **Survol** : le contour du bloc passe en pointillés animés
  (`stroke-dasharray` + `@keyframes dy-marching`) et une bulle style post-it
  apparaît avec le nom du bloc, positionnée sur son point d'ancrage.
- **Sélection** : tous les autres blocs reçoivent la classe `.dimmed`
  (remplissage sombre semi-transparent) pendant que le bloc choisi reste
  éclairé. Une ligne connectrice (`<path>`) part du point d'ancrage vers le
  bord du panneau ; elle utilise l'attribut SVG `pathLength="1"` combiné à
  `stroke-dasharray: 1` / `stroke-dashoffset` animé en CSS — un tour de main
  qui rend l'effet "la ligne se dessine" indépendant de la longueur réelle du
  tracé.

## 6. Le panneau latéral (`components/viewer/DetailPanel.tsx`)

Le sens du panneau (gauche ou droite) est un simple champ du thème
(`theme.panelSide`), lu par la ligne connectrice ET par le CSS. Techniquement,
le panneau est un conteneur qui anime **sa largeur** (`0 → 440px`, poussant le
schéma plutôt que de le recouvrir) pendant qu'un enfant interne anime **sa
position** (`translateX`) pour l'effet de glissement — les deux transitions
tournent en parallèle avec un `cubic-bezier` "élastique" doux.

Le contenu se révèle étape par étape : chaque `<li class="dy-step">` reçoit un
`animation-delay` proportionnel à son index, ce qui crée l'effet de lecture
progressive "de A à Z". L'exemple de code qui suit se tape en direct via un
petit hook (`useTypewriter`) déclenché après le temps qu'ont pris les étapes à
apparaître. Le bouton **Rejouer** force un remount du panneau (changement de
`key` React) : les animations CSS redémarrent naturellement puisque les
éléments sont recréés.

## 7. Style et thème (`styles/theme.css`, `useGoogleFonts.ts`)

Toutes les couleurs/polices/rayons sont des variables CSS (`--dy-*`), avec un
jeu de valeurs alternatif sous `@media (prefers-color-scheme: dark)`. Les deux
polices (une "manuscrite" pour les titres, une mono pour le code) ne sont pas
codées en dur : elles viennent de `project.theme.fontDisplay` /
`fontMono`, et `useGoogleFonts()` construit l'URL Google Fonts correspondante
à la volée. Changer de thème = changer deux chaînes de caractères dans le
JSON du projet, aucune modification de code.

## 8. L'éditeur (`components/editor/`)

- **`DrawLayer.tsx`** gère le dessin (rectangle par glisser-déposer, polygone
  par clics successifs + double-clic pour fermer), le déplacement, le
  redimensionnement (8 poignées pour un rectangle) et le déplacement individuel
  des sommets d'un polygone — le tout en coordonnées `%`, réutilisant les
  mêmes fonctions que `geometry.ts` (`pointInShape`, `resizeRect`…).
- **Undo/redo** (`state/store.tsx`) : un historique `{past, present, future}`
  géré par `useReducer`. Règle importante suivie dans tout le store : une
  action ne doit **jamais** dériver une valeur à l'intérieur du callback passé
  à `update()` puis la relire juste après — ce callback peut s'exécuter plus
  tard, dans un contexte différent (on l'a appris à la dure : la première
  version de `addHotspot` renvoyait `undefined` pour cette raison exacte).
  La bonne pratique retenue : construire l'objet complet *avant* d'appeler
  `update()`, qui ne fait alors que l'ajouter.
- **`Inspector.tsx`** édite tous les champs de contenu (résumé, étapes,
  exemple, quand l'utiliser, points d'attention, outils) avec ajout/suppression/
  réordonnancement des étapes.
- **Import/Export JSON** (`projectIO.ts`) avec un champ `schemaVersion` pour
  pouvoir faire évoluer le format sans casser les anciens fichiers.
- **Export HTML autonome** (`exportBundle.ts`) : génère un fichier `.html`
  unique (CSS + JS + image en data-URI + JSON du projet, tout inline) qui
  reproduit exactement le mode Aperçu, sans dépendre de ce projet React. C'est
  le livrable "je veux pouvoir partager le résultat final" — testé et validé
  (voir §11).

## 9. Assistant IA (optionnel) — `lib/ai.ts`

Fonctionnalité facultative : avec ta propre clé API Anthropic, l'outil peut
(a) repérer automatiquement les blocs d'une image — avec zones multiples et
spotlight quand pertinent — (b) rédiger la fiche "de A à Z" d'un bloc, et
(c) réanalyser une seule région recadrée avec des instructions libres (bouton
**🔍 Affiner une zone**). La clé n'est envoyée qu'à `api.anthropic.com`,
jamais stockée ailleurs qu'en mémoire du navigateur (avec option explicite de
sauvegarde en `localStorage`). Tous les prompts système sont exportés en
constantes dans le code (donc visibles, éditables, et affichés dans la modale
via "Voir le prompt envoyé à l'IA") :

**Détection des blocs — prompt système :**
```
Tu es un assistant qui prépare des schémas interactifs.
On te donne l'image d'une architecture, d'un diagramme ou d'un schéma technique
(éventuellement recadrée sur une seule région si l'utilisateur veut l'affiner).
Ta tâche : repérer les blocs/composants visuellement distincts et proposer,
pour chacun, une ou plusieurs zones cliquables rectangulaires.

Règles :
- Coordonnées en pourcentage de l'image fournie (0 à 100), x/y = coin haut-gauche, w/h = largeur/hauteur.
- La plupart des blocs n'ont besoin que d'une seule zone dans "areas".
- Utilise plusieurs zones dans "areas" UNIQUEMENT quand un même bloc logique doit être
  cliquable à plusieurs endroits distincts de l'image (ex. un titre de famille + les
  nœuds du pipeline qu'elle alimente).
- Si le bloc a plusieurs zones ET qu'un cadre visuel plus large doit s'éclairer
  quand on clique sur n'importe laquelle d'entre elles, fournis "spotlight"
  (un rectangle qui englobe visuellement le bloc). Sinon omets "spotlight"
  (l'union des "areas" sera utilisée automatiquement).
- "label" = le texte visible sur le bloc, ou un nom court si aucun texte n'est visible.
- "groupLabel" = le nom de la famille/catégorie visuelle à laquelle le bloc appartient, si le
  schéma a des regroupements colorés/encadrés ; sinon omets ce champ.
- "order" = un entier reflétant l'ordre logique de lecture ou de pipeline (gauche->droite, haut->bas).
- Ne fais JAMAIS chevaucher les zones cliquables de deux blocs différents.
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour, au format :
{"hotspots": [{
  "label": string,
  "order": number,
  "groupLabel"?: string,
  "areas": [{"x": number, "y": number, "w": number, "h": number}],
  "spotlight"?: {"x": number, "y": number, "w": number, "h": number}
}]}
```
Prompt utilisateur (généré par `buildHotspotDetectionUserPrompt`), pour l'image entière :
```
Analyse cette image et détecte tous les blocs/composants qu'elle contient.
[+ instruction de l'utilisateur]
Réponds uniquement avec le JSON demandé.
```
Ou, quand une région a été recadrée via **🔍 Affiner une zone** :
```
Cette image est un recadrage d'une zone précise du schéma original. Redécoupe UNIQUEMENT cette zone selon l'instruction ci-dessous.
[+ instruction de l'utilisateur]
Réponds uniquement avec le JSON demandé.
```
Le recadrage se fait côté client (`cropImageDataUrl`, via `<canvas>`) avant
l'envoi, et les coordonnées renvoyées par l'IA sont remappées automatiquement
vers l'image complète au retour (`detectHotspotsFromImage`).

**Rédaction du contenu d'un bloc — prompt système :**
```
Tu es un rédacteur technique qui explique un composant d'architecture "de A à Z".
On te donne le nom d'un bloc et le contexte du schéma auquel il appartient.
Rédige une fiche pédagogique concise, dans un style clair, sans jargon inutile.

Réponds UNIQUEMENT avec un JSON valide au format :
{
  "summary": string (1-2 phrases),
  "steps": [{"title": string, "body": string}] (3 à 5 étapes qui détaillent le fonctionnement de A à Z),
  "example": string (un exemple concret court, type appel de code ou requête),
  "whenToUse": string (1-2 phrases),
  "caution": string (1-2 phrases sur un piège ou une limite),
  "tools": string[] (2 à 4 outils/technos typiques)
}
```
Prompt utilisateur (généré par `buildContentDraftUserPrompt`) :
```
Bloc à documenter : "<label du bloc>".
Contexte du schéma (autres blocs, domaine, pipeline) : <noms des autres blocs du projet>.
Réponds uniquement avec le JSON demandé.
```

Ces fonctions parsent la réponse JSON de l'API et l'appliquent directement au
projet (création en lot via `store.addHotspots()` pour la détection, mise à
jour d'un seul bloc via `store.updateHotspot()` pour la rédaction).

## 10. Reproduire ce projet avec un agent de codage — les prompts, dans l'ordre

Voici, dans l'ordre exact où ce dépôt a été construit, les instructions
données à l'agent (Claude Code) pour arriver à ce résultat. Elles sont
réutilisables telles quelles pour reconstruire l'outil ailleurs, ou pour
l'étendre.

1. **Scaffold** — *"Initialise un projet Vite + React + TypeScript minimal,
   sans dépendance superflue (pas de state-manager externe, pas de framework
   CSS). Nettoie les fichiers de démo du template."*

2. **Modèle de données** — *"Définis dans `types.ts` un modèle générique pour
   un schéma interactif : une image (src/width/height), une liste de zones
   cliquables (`Hotspot`) avec une forme en pourcentage (rectangle OU
   polygone, jamais en pixels), un contenu structuré par zone (résumé, étapes
   ordonnées 'de A à Z', exemple, quand l'utiliser, point d'attention,
   outils), des groupes/catégories, et un thème (palette de couleurs, deux
   polices, sens du panneau). Ajoute un `schemaVersion` pour l'évolutivité."*

3. **Géométrie** — *"Écris les fonctions de calcul en pourcentage (0-100) :
   conversion coordonnées écran → pourcentage relatif à un élément, test
   point-dans-polygone (ray casting), construction d'un rectangle à partir de
   deux points de glisser-déposer, déplacement et redimensionnement d'une
   forme (8 poignées pour un rectangle), centroïde. Tout doit être pur (pas
   d'effet de bord) pour rester testable."*

4. **État + undo/redo** — *"Implémente un store React (Context +
   `useReducer`) avec historique `{past, present, future}` pour le projet.
   Expose des actions ergonomiques (addHotspot, updateHotspot, removeHotspot,
   reorderHotspot, addGroup...). Attention : ne fais jamais dépendre une
   valeur de retour d'un effet de bord à l'intérieur du reducer — construis
   les objets AVANT de dispatcher."*

5. **Image de démonstration générique** — *"Génère un projet d'exemple qui
   n'utilise AUCUNE image binaire versionnée : crée un petit schéma
   d'architecture logicielle générique (Client → API Gateway → Service →
   Base de données, avec Auth et Cache) sous forme de SVG inline encodé en
   data-URI, avec son contenu JSON complet, pour prouver que l'outil marche
   avec n'importe quel sujet."*

6. **Fidélité de l'affichage** — *"Crée un composant `Stage` qui affiche une
   image dans une boîte dont le ratio CSS (`aspect-ratio`) correspond
   exactement aux dimensions réelles de l'image, avec une superposition SVG en
   `viewBox='0 0 100 100' preserveAspectRatio='none'` par-dessus, pour que les
   coordonnées en pourcentage tombent pixel pour pixel sur l'image, à toute
   taille d'écran, sans JS de recalcul."*

7. **Mode Aperçu (viewer)** — *"Sur la base du composant Stage, ajoute le
   survol (contour pointillé animé + bulle avec le nom), la sélection (clic →
   assombrissement des autres zones + ligne connectrice animée vers le bord du
   panneau), un panneau qui pousse le contenu depuis la droite OU la gauche
   selon le thème, avec révélation progressive des étapes (délai
   proportionnel à l'index) puis un exemple qui s'écrit en direct. Ajoute
   Précédent/Suivant/Rejouer, la navigation clavier et une légende cliquable
   par groupe."*

8. **Mode Éditeur** — *"Ajoute un mode édition sur la même image : outils
   Sélection/Rectangle/Polygone, dessin par glisser-déposer ou clics
   successifs, poignées de redimensionnement et déplacement des sommets,
   déplacement du point d'ancrage de la ligne connectrice, formulaire complet
   pour éditer le contenu d'une zone (avec ajout/suppression/réordonnancement
   des étapes), gestion des groupes, import/export du projet en JSON avec
   validation de version, et un bouton d'annulation/rétablissement relié au
   store."*

9. **Assistant IA optionnel** — *"Ajoute un module qui appelle l'API Messages
   d'Anthropic directement depuis le navigateur (clé fournie par
   l'utilisateur, jamais transmise ailleurs) pour (a) détecter automatiquement
   les zones d'une image quelconque et (b) rédiger le contenu 'de A à Z' d'une
   zone donnée. Écris les prompts système comme des constantes exportées et
   affiche-les dans l'interface pour que l'utilisateur voie exactement ce qui
   est envoyé. La réponse doit être forcée en JSON strict pour un parsing
   fiable."*

10. **Export autonome** — *"Ajoute un export qui génère un unique fichier
    `.html` sans dépendance (CSS + comportement en JS vanilla + image en
    data-URI + JSON du projet inline) reproduisant fidèlement le mode Aperçu,
    pour que le résultat final soit partageable sans build ni serveur."*

11. **Style** — *"Définis un thème en variables CSS (couleurs, rayons,
    ombres) avec une variante sombre automatique via
    `prefers-color-scheme`, deux polices Google Fonts chargées dynamiquement
    depuis les champs du thème du projet (pas de police codée en dur), et des
    bordures en pointillés 'faites main' cohérentes entre le schéma, les
    bulles et le panneau."*

12. **Vérification** — *"Compile en TypeScript, lance le linter, puis fais un
    test de bout en bout avec un navigateur headless : survol, clic, panneau,
    navigation, dessin d'une zone, annulation/rétablissement, export HTML
    autonome — et rejoue ce même export dans un navigateur pour vérifier
    qu'il fonctionne seul, sans erreur console."*

13. **Documentation** — *"Rédige un guide qui explique l'architecture, le
    modèle de données, chaque effet visuel avec le fichier responsable, les
    prompts IA utilisés verbatim, et la recette de prompts ci-dessus pour
    reproduire l'ensemble avec un autre agent."*

## 11. Vérifications effectuées

- `npm run build` (TypeScript strict + Vite) : ✅ sans erreur.
- `npm run lint` (oxlint) : ✅ (seulement des avertissements non bloquants sur
  deux `useEffect` volontaires qui redémarrent une animation CSS).
- Test de bout en bout en navigateur headless (Playwright) sur l'app : survol,
  sélection, panneau, Suivant/Précédent/Rejouer, fermeture, dessin d'un
  rectangle, renommage, dessin d'un polygone, undo/redo — aucune erreur
  console/page.
- Le fichier exporté par "Export HTML autonome" a été rouvert dans un
  navigateur headless et testé de la même façon : survol, clic, panneau,
  navigation, fermeture — aucune erreur.
- Re-testé sur le vrai schéma RAG de l'utilisateur (13 zones, dont des blocs
  imbriqués zone/spotlight et des connecteurs de groupe) : import JSON,
  survol, sélection d'une zone-titre qui allume tout le cadre, connecteur de
  groupe (ligne + point animé + halo d'arrivée), liens "Explorer aussi",
  export HTML autonome re-testé indépendamment.
- Un bug réel a été trouvé et corrigé pendant ce test : dans l'export HTML
  autonome (pas dans l'app React), le panneau se reconstruisait entièrement à
  chaque survol au lieu de seulement au changement de sélection — ça cassait
  les animations et pouvait faire "disparaître" un bouton "Explorer aussi"
  sous la souris avant le clic. Corrigé en ne reconstruisant le panneau (et en
  ne relançant la ligne connectrice / le connecteur de groupe) que lorsque
  l'identifiant du bloc sélectionné change réellement (`lib/exportBundle.ts`).

## 12. Utiliser l'outil avec ta propre image

1. `npm install && npm run dev`, ouvrir l'app (elle démarre en mode Éditeur
   avec le projet de démonstration).
2. Bouton **🖼 Image** : charge ton PNG/JPEG/SVG. L'image de démo est
   remplacée, tes zones précédentes restent en pourcentage donc elles se
   replacent automatiquement si tu gardes un cadrage proche — sinon,
   supprime-les et redessine.
3. Outils **▭ Rectangle** / **⬡ Polygone** pour dessiner tes zones
   directement sur l'image.
4. Sélectionne une zone dans la liste à droite pour remplir sa fiche
   (résumé, étapes, exemple, quand l'utiliser, point d'attention, outils),
   ou clique **✨ Assistant IA** pour laisser Claude proposer les zones et/ou
   rédiger le contenu (nécessite ta clé API Anthropic).
5. **⭳ Exporter JSON** pour sauvegarder/rééditer plus tard, **⭳ Export HTML
   autonome** pour obtenir la page finale partageable.
6. **🎨 Style** pour peaufiner le survol, la sélection, les animations ; voir
   §13 pour tout ce qui est réglable après le chargement de l'image, avant
   l'export.

## 13. Aller plus loin : zones multiples, spotlight, connecteurs, style réglable

Tout ce qui suit reste modifiable à n'importe quel moment — avant ou après
avoir chargé ton image, avant ou après avoir généré du contenu, avant
l'export final. Rien n'est figé une fois une zone dessinée.

**Zones cliquables (`areas`) vs. ce qui s'éclaire (`spotlightShape`).** Un
bloc peut avoir plusieurs zones cliquables (utile pour un titre de famille +
plusieurs points qu'il ouvre) mais une seule "surbrillance" — par défaut
l'union de ses zones, ou une forme personnalisée plus grande. C'est ce qui
permet des **blocs imbriqués** : dans l'Inspecteur, dessine une petite zone
cliquable (ex. juste le titre d'un cadre), puis **"Dessiner un spotlight
personnalisé"** pour que tout le cadre s'allume au clic — sans que le cadre
lui-même ne soit cliquable. **↥ Devant / ↧ Derrière** contrôlent l'ordre
d'empilement quand deux zones se chevauchent (la dernière dessinée reçoit le
clic ; utile si un bloc englobe visuellement des sous-blocs).

**Connecteurs.** Un groupe peut avoir une ligne + point animé + onde
d'arrivée vers un point du schéma (ex. une famille de techniques qui relie
vers le nœud du pipeline qu'elle alimente), avec en option une seconde zone
qui s'éclaire à l'arrivée. Chaque bloc peut **hériter** ce connecteur de son
groupe, le **désactiver**, ou le **remplacer** par le sien (Inspecteur →
"Connecteur").

**Explorer aussi.** Dans l'Inspecteur, coche les blocs à proposer comme liens
de navigation croisée en bas de la fiche (ex. relier une famille de
techniques aux nœuds du pipeline qu'elle utilise).

**Panneau Style (🎨).** Expose tout ce qui pilotait auparavant le survol et
la sélection en dur dans le CSS : opacité de la teinte au survol/sélection,
motif des pointillés, épaisseur du contour, opacité du voile, pastilles
pulsantes (on/off, taille, vitesse), vitesse et arrondi du "trou de lumière",
ligne vers le panneau (afficher/masquer, courbe/droite), vitesse du
point/des ondes sur les connecteurs, rythme des étapes "de A à Z", vitesse de
frappe de l'exemple, largeur et sens (gauche/droite) du panneau, et si le
focus clavier (Tab) déclenche les mêmes effets que le survol. Tout est
stocké dans `project.theme.interaction` (voir `types.ts`) et appliqué en
variables CSS (`lib/interactionVars.ts`) — aussi bien dans l'app que dans le
fichier HTML exporté, qui reste donc fidèle à tes réglages. Ce panneau règle
le **projet entier**.

**Style par bloc (dans l'Inspecteur).** Chaque bloc — famille, sous-bloc,
élément du pipeline — peut **surcharger individuellement** n'importe lequel
de ces réglages visuels : motif des pointillés, épaisseur du contour au
survol/sélection, teinte de survol, arrondi du spotlight, pastille pulsante
(on/off + taille + vitesse), ou carrément **désactiver le contour** sur ce
bloc précis ("Afficher le contour" décoché = aucune bordure en pointillés,
dans aucun état). Chaque champ non touché continue d'hériter du panneau
Style global ; un bouton **↺** apparaît à côté de chaque champ modifié pour
revenir à la valeur globale en un clic. C'est `Hotspot.style` dans le
modèle de données (`HotspotStyleOverride`, tous les champs optionnels) —
résolu via `effectiveHotspotStyle()` dans `lib/geometry.ts`, appliqué comme
variables CSS *sur l'élément lui-même* (donc prioritaire sur les variables
globales), avec le même mécanisme reproduit dans l'export HTML autonome.
Les connecteurs (par bloc ou par groupe) ont eux aussi leur propre style
(courbe/droite) réglable indépendamment — voir plus haut.

**Affiner le découpage par IA.** Le bouton **🔍 Affiner une zone (IA)** de la
barre d'outils laisse dessiner un rectangle autour d'une seule zone du
schéma ; l'assistant IA analyse alors uniquement ce recadrage (image
rognée côté client avant l'envoi, coordonnées remappées automatiquement vers
l'image complète au retour) avec tes instructions libres, par exemple
*"découpe cette zone en 4 sous-blocs, un par technique listée"*. Utile pour
redécouper un bloc que la détection automatique globale a fusionné à tort,
sans repartir de zéro.

## 14. Limites connues et pistes

- Les polygones n'ont pas d'ajout/suppression de sommet après création
  (il faut redessiner) — simple à ajouter si besoin (double-clic sur un bord).
- L'assistant IA nécessite que la politique CORS du compte Anthropic autorise
  les appels navigateur directs (`anthropic-dangerous-direct-browser-access`).
  Si bloqué, il suffit de proxifier `lib/ai.ts` derrière une fonction
  serverless d'une ligne — le prompt et le payload restent identiques.
- Pas de collaboration multi-utilisateur ni de sauvegarde serveur : le projet
  vit en mémoire + export/import JSON manuel. Une synchronisation (ex. un
  backend léger) serait une extension naturelle si plusieurs personnes
  doivent éditer le même schéma.
