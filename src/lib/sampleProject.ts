import { createEmptyProject, emptyContent, type Group, type Hotspot, type Project } from "../types";

/**
 * The demo image is generated as an inline SVG (no binary asset needed), so
 * the whole tool is provable end-to-end without shipping anyone's private
 * diagram. Swap this for any PNG/JPEG/SVG in the editor — the data model
 * (percent-based shapes) does not care what the picture shows.
 */

const BLOCKS = [
  { key: "client", label: "Client", x: 6, y: 10, w: 22, h: 18, fill: "#f7d9d6" },
  { key: "gateway", label: "API Gateway", x: 39, y: 10, w: 22, h: 18, fill: "#d6e3f7" },
  { key: "auth", label: "Service Auth", x: 72, y: 10, w: 22, h: 18, fill: "#d7f0dd" },
  { key: "cache", label: "Cache", x: 6, y: 55, w: 22, h: 18, fill: "#eeddf2" },
  { key: "service", label: "Service métier", x: 39, y: 55, w: 22, h: 18, fill: "#f7e6cf" },
  { key: "db", label: "Base de données", x: 72, y: 55, w: 22, h: 18, fill: "#d2f2ef" },
] as const;

const ARROWS: Array<[string, string]> = [
  ["client", "gateway"],
  ["gateway", "auth"],
  ["gateway", "service"],
  ["service", "db"],
  ["service", "cache"],
];

const VB_W = 1200;
const VB_H = 760;

function center(key: string) {
  const b = BLOCKS.find((b) => b.key === key)!;
  return { x: (b.x + b.w / 2) * (VB_W / 100), y: (b.y + b.h / 2) * (VB_H / 100) };
}

function buildDemoSvg(): string {
  const boxes = BLOCKS.map((b) => {
    const x = (b.x / 100) * VB_W;
    const y = (b.y / 100) * VB_H;
    const w = (b.w / 100) * VB_W;
    const h = (b.h / 100) * VB_H;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${b.fill}"
        stroke="#2c2a27" stroke-width="3" stroke-dasharray="9 7" />
      <text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, serif" font-size="30" fill="#2c2a27">${b.label}</text>
    `;
  }).join("\n");

  const arrows = ARROWS.map(([from, to]) => {
    const a = center(from);
    const b = center(to);
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#8a867e"
      stroke-width="2.5" stroke-dasharray="4 6" marker-end="url(#arrow)" />`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6 Z" fill="#8a867e" />
      </marker>
    </defs>
    <rect width="${VB_W}" height="${VB_H}" fill="#faf6ef" />
    <text x="${VB_W / 2}" y="40" text-anchor="middle" font-family="Georgia, serif" font-size="26"
      fill="#8a867e">Exemple générique — remplace-moi par ta propre image</text>
    ${arrows}
    ${boxes}
  </svg>`;
}

export function buildDemoImageDataUrl(): string {
  const svg = buildDemoSvg();
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

function content(summary: string, steps: string[], example: string, whenToUse: string, caution: string, tools: string[]) {
  return {
    ...emptyContent(),
    summary,
    steps: steps.map((body, i) => ({ id: crypto.randomUUID(), title: `Étape ${i + 1}`, body })),
    example,
    whenToUse,
    caution,
    tools,
  };
}

export function buildSampleProject(): Project {
  const project = createEmptyProject("Exemple : architecture générique");
  project.image = {
    src: buildDemoImageDataUrl(),
    width: VB_W,
    height: VB_H,
    alt: "Schéma d'architecture générique",
  };

  const groups: Group[] = [
    { id: crypto.randomUUID(), label: "Entrée", color: project.theme.palette[0], connector: null },
    { id: crypto.randomUUID(), label: "Traitement", color: project.theme.palette[2], connector: null },
    { id: crypto.randomUUID(), label: "Persistance", color: project.theme.palette[4], connector: null },
  ];
  project.groups = groups;

  const defs: Array<{
    key: (typeof BLOCKS)[number]["key"];
    color: string;
    groupId: string;
    content: Hotspot["content"];
  }> = [
    {
      key: "client",
      color: project.theme.palette[0],
      groupId: groups[0].id,
      content: content(
        "Le point d'entrée : navigateur ou app mobile qui déclenche les requêtes.",
        [
          "L'utilisateur déclenche une action dans l'interface.",
          "La requête est sérialisée (JSON) avec les identifiants de session.",
          "Elle part en HTTPS vers l'API Gateway.",
        ],
        "fetch('/api/orders', { headers: { Authorization: token } })",
        "À chaque interaction utilisateur qui nécessite une donnée serveur.",
        "Ne jamais stocker de secret côté client : seul un token de courte durée.",
        ["React", "fetch/axios", "OAuth token"],
      ),
    },
    {
      key: "gateway",
      color: project.theme.palette[1],
      groupId: groups[0].id,
      content: content(
        "Point d'entrée unique qui route, limite et journalise le trafic.",
        [
          "Reçoit la requête HTTPS du client.",
          "Vérifie le rate limit et la forme de la requête.",
          "Route vers le service interne concerné (auth, métier...).",
          "Agrège la réponse et la renvoie au client.",
        ],
        "route /orders/* -> service-metier:8080",
        "Dès qu'il y a plus d'un service interne à exposer publiquement.",
        "Un gateway mal configuré devient un single point of failure.",
        ["Nginx", "Kong", "Envoy"],
      ),
    },
    {
      key: "auth",
      color: project.theme.palette[2],
      groupId: groups[1].id,
      content: content(
        "Vérifie l'identité et les droits avant d'autoriser l'accès.",
        [
          "Reçoit le token depuis le gateway.",
          "Valide la signature et l'expiration.",
          "Résout les rôles/permissions associés.",
          "Renvoie une décision allow/deny au gateway.",
        ],
        "verifyJWT(token) -> { userId, roles: ['admin'] }",
        "Sur chaque requête touchant une ressource protégée.",
        "Centraliser la logique : ne pas la dupliquer dans chaque service.",
        ["JWT", "OAuth2", "Redis (sessions)"],
      ),
    },
    {
      key: "service",
      color: project.theme.palette[3],
      groupId: groups[1].id,
      content: content(
        "Contient la logique métier propre au produit.",
        [
          "Reçoit la requête déjà authentifiée.",
          "Applique les règles métier (validation, calculs).",
          "Lit/écrit dans le cache puis la base si besoin.",
          "Retourne une réponse structurée au gateway.",
        ],
        "createOrder(payload) -> { id, status: 'pending' }",
        "Pour toute règle qui ne concerne ni le routage ni l'auth ni le stockage brut.",
        "Éviter d'y mettre des accès directs à d'autres services externes non contrôlés.",
        ["Node.js/Express", "NestJS", "Domain-Driven Design"],
      ),
    },
    {
      key: "cache",
      color: project.theme.palette[4],
      groupId: groups[2].id,
      content: content(
        "Mémoire rapide pour éviter de re-solliciter la base à chaque lecture.",
        [
          "Le service métier vérifie si la clé existe en cache.",
          "Si absente, il va lire la base puis remplit le cache.",
          "Si présente, la donnée est retournée directement.",
        ],
        "GET cache:order:123 -> miss -> lecture DB -> SET cache:order:123 ttl=60",
        "Pour des lectures fréquentes sur des données qui changent peu.",
        "Toujours définir un TTL pour éviter de servir une donnée périmée indéfiniment.",
        ["Redis", "Memcached"],
      ),
    },
    {
      key: "db",
      color: project.theme.palette[5],
      groupId: groups[2].id,
      content: content(
        "Stockage durable de la donnée métier.",
        [
          "Reçoit les requêtes de lecture/écriture du service métier.",
          "Applique les contraintes d'intégrité (clés, unicité).",
          "Persiste la donnée sur disque de façon durable.",
        ],
        "INSERT INTO orders (id, status) VALUES ('123', 'pending')",
        "Pour toute donnée qui doit survivre au redémarrage des services.",
        "Penser aux migrations et aux index avant la mise en prod.",
        ["PostgreSQL", "MySQL", "Prisma/TypeORM"],
      ),
    },
  ];

  project.hotspots = defs.map((d, i) => {
    const block = BLOCKS.find((b) => b.key === d.key)!;
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    return {
      id: crypto.randomUUID(),
      label: block.label,
      color: d.color,
      groupId: d.groupId,
      order: i,
      areas: [{ kind: "rect" as const, x: block.x, y: block.y, w: block.w, h: block.h }],
      spotlightShape: null,
      anchor: { x: cx, y: cy },
      seeAlso: [],
      style: {},
      content: d.content,
    };
  });

  return project;
}
