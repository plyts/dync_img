# dync_img

Transforme n'importe quelle image (PNG, JPEG, SVG, WebP) en schéma interactif :
clique sur une zone, le reste s'assombrit, une ligne animée relie la zone à un
panneau qui glisse depuis la gauche ou la droite et détaille le bloc "de A à
Z" — étape par étape, avec un exemple qui s'écrit en direct.

L'image et son contenu sont des **données** (un projet JSON), pas du code : le
même moteur sert n'importe quel schéma, diagramme ou capture d'écran.

👉 Le guide complet (architecture, comment chaque effet est obtenu, tous les
prompts utilisés pour construire l'outil) est dans **[docs/GUIDE.md](docs/GUIDE.md)**.

## Démarrer

```bash
npm install
npm run dev
```

L'app démarre en mode **Éditeur** avec un projet de démonstration (schéma
d'architecture générique généré en SVG, aucune image externe nécessaire).

## Utilisation rapide

1. **🖼 Image** — charge ta propre image.
2. **▭ Rectangle** / **⬡ Polygone** — dessine tes zones cliquables sur l'image.
3. Sélectionne une zone dans la liste pour remplir sa fiche (résumé, étapes,
   exemple, quand l'utiliser, point d'attention, outils).
4. **✨ Assistant IA** (optionnel, nécessite ta clé API Anthropic) — détection
   automatique des zones et rédaction assistée du contenu.
5. **Aperçu** — teste le rendu final (survol, clic, panneau, navigation).
6. **⭳ Export HTML autonome** — un seul fichier `.html`, sans dépendance, qui
   reproduit exactement le mode Aperçu, partageable tel quel.
7. **⭳ Exporter JSON** / **⭱ Importer JSON** — pour sauvegarder et rééditer
   un projet plus tard.

## Scripts

```bash
npm run dev       # serveur de développement
npm run build     # build de production (tsc + vite build)
npm run lint      # oxlint
npm run preview   # sert le build de production
```

## Stack

Vite + React + TypeScript, sans state-manager externe (Context +
`useReducer` avec undo/redo) ni framework CSS — voir
[docs/GUIDE.md](docs/GUIDE.md) pour le détail de chaque choix.
