import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type GiftDefinition = {
  id: string;
  kind: "gift" | "heart" | "final";
  title: string;
  eyebrow: string;
  message: string;
  detail: string;
  symbol: string;
  color: number;
  position: [number, number, number];
};

export type PhraseDefinition = {
  text: string;
  position: [number, number, number];
};

const ZODIAC_ANCHORS = {
  leo: [-25, 94, 60] as const,
  sagittarius: [31, 103, 66] as const,
};

type PlanetDefinition = {
  position: [number, number, number];
  radius: number;
  colors: [string, string, string, string];
  atmosphere: string;
  ring: boolean;
  moons: number;
  tilt: number;
};

export const PHRASES: PhraseDefinition[] = [
  { text: "Explora el campo de estrellas.", position: [-30, 3.4, 17] },
  { text: "Cada mundo comienza con una geometría.", position: [25, 4.6, 5] },
  { text: "Arrastra para mirar a tu alrededor.", position: [-39, 3.2, -15] },
  {
    text: "Descubre los objetos que orbitan la galaxia.",
    position: [41, 3.8, -18],
  },
  { text: "Texturas creadas por código.", position: [-9, 4.2, -43] },
  { text: "Un universo para recorrer a tu ritmo.", position: [12, 5, 39] },
  { text: "Luz, movimiento y profundidad.", position: [57, 5.5, 15] },
  { text: "Explora desde otra perspectiva.", position: [-58, 4.8, 8] },
  { text: "Navega hacia nuevos mundos.", position: [31, 3.8, -49] },
  { text: "La interacción cambia el recorrido.", position: [-28, 4.4, 51] },
  { text: "Un espacio que responde al tacto.", position: [68, 5.2, -31] },
  { text: "Descubre detalles entre los anillos.", position: [-67, 4.6, -36] },
  { text: "El centro siempre está a un toque.", position: [18, 7.2, -70] },
  { text: "Geometría procedural en tiempo real.", position: [-76, 7.6, 35] },
  { text: "Una escena, muchas perspectivas.", position: [74, 8.4, 53] },
  { text: "Encuentra los doce coleccionables.", position: [-5, 9.4, 73] },
  { text: "Partículas que dibujan el espacio.", position: [-31, 38, -58] },
  { text: "Capas de color y luz.", position: [28, 46, -68] },
  { text: "Mundos construidos con matemáticas.", position: [2, 58, -82] },
  {
    text: "LEO · Una constelación para descubrir.",
    position: [...ZODIAC_ANCHORS.leo],
  },
  {
    text: "SAGITARIO · Sigue el mapa de estrellas.",
    position: [...ZODIAC_ANCHORS.sagittarius],
  },
];

export const GIFTS: GiftDefinition[] = [
  {
    id: "chocolatito",
    kind: "gift",
    title: "Chocolate",
    eyebrow: "COLECCIONABLE 01",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🍫",
    color: 0xff4f9f,
    position: [-19, 4.2, 14],
  },
  {
    id: "pastel",
    kind: "gift",
    title: "Pastel",
    eyebrow: "COLECCIONABLE 02",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🎂",
    color: 0x8c7cff,
    position: [22, 5.4, -8],
  },
  {
    id: "cremita",
    kind: "gift",
    title: "Frasco",
    eyebrow: "COLECCIONABLE 03",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🧴",
    color: 0x3ed9ff,
    position: [32, 3.8, 23],
  },
  {
    id: "arenero-gato",
    kind: "gift",
    title: "Gato",
    eyebrow: "COLECCIONABLE 04",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🐈",
    color: 0xff7c6b,
    position: [-35, 4.6, -22],
  },
  {
    id: "bebida",
    kind: "gift",
    title: "Bebida",
    eyebrow: "COLECCIONABLE 05",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🥤",
    color: 0xf5c96a,
    position: [4, 5.7, -37],
  },
  {
    id: "velas",
    kind: "gift",
    title: "Velas",
    eyebrow: "COLECCIONABLE 06",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🕯️",
    color: 0xc754ff,
    position: [-10, 4.2, 41],
  },
  {
    id: "blusita",
    kind: "gift",
    title: "Prenda",
    eyebrow: "COLECCIONABLE 07",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "👚",
    color: 0x5ea6ff,
    position: [53, 6, -13],
  },
  {
    id: "calcetincitos",
    kind: "gift",
    title: "Calcetines",
    eyebrow: "COLECCIONABLE 08",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🧦",
    color: 0xff5ec7,
    position: [-54, 5.2, 18],
  },
  {
    id: "personaje-azul",
    kind: "gift",
    title: "Personaje azul",
    eyebrow: "COLECCIONABLE 09",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "💙",
    color: 0x74d7ff,
    position: [24, 5.3, 57],
  },
  {
    id: "lavadita",
    kind: "gift",
    title: "Vehículo",
    eyebrow: "COLECCIONABLE 10",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "🚙",
    color: 0xb97bff,
    position: [-61, 5.8, -43],
  },
  {
    id: "gasolinita",
    kind: "gift",
    title: "Combustible",
    eyebrow: "COLECCIONABLE 11",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "⛽",
    color: 0xffa65a,
    position: [65, 4.9, 34],
  },
  {
    id: "beso",
    kind: "gift",
    title: "Símbolo",
    eyebrow: "COLECCIONABLE 12",
    message:
      "Un objeto construido con geometría, materiales y animación procedural.",
    detail:
      "Explora la escena y marca cada hallazgo para completar los doce coleccionables.",
    symbol: "💋",
    color: 0xff4f86,
    position: [-31, 6.2, 68],
  },
];

export const FINAL_GIFT: GiftDefinition = {
  id: "regalo-final",
  kind: "final",
  title: "Colección completada",
  eyebrow: "12 DE 12 · EXPLORACIÓN COMPLETA",
  message: "Has descubierto todos los coleccionables del universo.",
  detail:
    "El progreso se guarda únicamente en este navegador. Puedes seguir recorriendo la escena.",
  symbol: "✨",
  color: 0xffc45f,
  position: [0, 28, 1.5],
};
export const HEART_MESSAGE: GiftDefinition = {
  id: "corazon",
  kind: "heart",
  title: "Núcleo galáctico",
  eyebrow: "CENTRO DE LA ESCENA",
  message:
    "Una galaxia de partículas y un corazón cristalino dan forma al centro del universo.",
  detail:
    "Explora planetas, constelaciones y mundos diminutos. Usa Centro para regresar a esta vista.",
  symbol: "💗",
  color: 0xff3f99,
  position: [0, 13, 0],
};

const PLANETS: PlanetDefinition[] = [
  {
    position: [-44, 21, -34],
    radius: 4.1,
    colors: ["#08133d", "#1a3d91", "#7659d7", "#f09acb"],
    atmosphere: "#6ba8ff",
    ring: true,
    moons: 1,
    tilt: 0.28,
  },
  {
    position: [52, 14, -45],
    radius: 5.4,
    colors: ["#2a071e", "#6d194a", "#b44e82", "#f3a5bc"],
    atmosphere: "#ff74bc",
    ring: true,
    moons: 2,
    tilt: -0.38,
  },
  {
    position: [25, 29, 42],
    radius: 3.2,
    colors: ["#041d34", "#075b7d", "#28a7ad", "#a6ecdb"],
    atmosphere: "#54e8ff",
    ring: false,
    moons: 1,
    tilt: 0.16,
  },
  {
    position: [-61, 11, 46],
    radius: 4.6,
    colors: ["#18072e", "#4e237d", "#9445a4", "#e98bca"],
    atmosphere: "#ca7cff",
    ring: false,
    moons: 2,
    tilt: 0.43,
  },
  {
    position: [77, 24, 19],
    radius: 3.8,
    colors: ["#241020", "#7d374f", "#c76f7c", "#ffd0a8"],
    atmosphere: "#ff987e",
    ring: true,
    moons: 0,
    tilt: -0.19,
  },
  {
    position: [-82, 28, -7],
    radius: 2.8,
    colors: ["#07122c", "#173e73", "#3d7eb4", "#a7d5e9"],
    atmosphere: "#80c8ff",
    ring: false,
    moons: 1,
    tilt: -0.27,
  },
];

export const TAU = Math.PI * 2;

export function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGlowTexture(
  color: string,
  size = 128,
  midpoint = 0.2,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(Math.min(midpoint, 0.14), "#ffffff");
  gradient.addColorStop(midpoint, color);
  gradient.addColorStop(0.6, `${color}6f`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

type ZodiacConstellationDefinition = {
  name: string;
  position: readonly [number, number, number];
  points: ReadonlyArray<readonly [number, number]>;
  edges: ReadonlyArray<readonly [number, number]>;
  scale: number;
  rotation: number;
  color: number;
  brightestStar?: number;
};

const ZODIAC_CONSTELLATIONS: ZodiacConstellationDefinition[] = [
  {
    name: "Leo",
    position: ZODIAC_ANCHORS.leo,
    points: [
      [-1.72, -0.42],
      [-0.82, -0.12],
      [-0.25, -0.5],
      [0.62, -0.52],
      [0.4, 0.08],
      [0.18, 0.58],
      [0.05, 1.02],
      [0.36, 1.42],
      [0.82, 1.12],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 5],
    ],
    scale: 6.2,
    rotation: -0.12,
    color: 0xcde8ff,
    brightestStar: 3,
  },
  {
    name: "Sagitario",
    position: ZODIAC_ANCHORS.sagittarius,
    points: [
      [-1.12, -0.25],
      [-0.62, -0.86],
      [0.08, -0.92],
      [0.54, -0.34],
      [0.36, 0.42],
      [-0.38, 0.58],
      [-0.92, 0.16],
      [1.12, -0.08],
      [1.38, 0.38],
      [-1.58, 0.12],
      [-1.42, 0.67],
      [0.02, 0.96],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
      [3, 7],
      [7, 8],
      [0, 9],
      [9, 10],
      [10, 6],
      [5, 11],
      [11, 4],
    ],
    scale: 5.8,
    rotation: 0.08,
    color: 0xffdfb3,
  },
];

export function createZodiacConstellations(glowTexture: THREE.Texture) {
  const group = new THREE.Group();
  group.name = "Constelaciones zodiacales fijas";

  ZODIAC_CONSTELLATIONS.forEach((definition) => {
    const constellation = new THREE.Group();
    constellation.name = `Constelación fija de ${definition.name}`;
    constellation.position.set(...definition.position);
    constellation.rotation.y = definition.rotation;

    const linePositions: number[] = [];
    definition.edges.forEach(([from, to]) => {
      const start = definition.points[from];
      const end = definition.points[to];
      linePositions.push(
        start[0] * definition.scale,
        0,
        start[1] * definition.scale,
        end[0] * definition.scale,
        0,
        end[1] * definition.scale,
      );
    });

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
    const lines = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: definition.color,
        transparent: true,
        opacity: 0.82,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    lines.name = `Trazos de ${definition.name}`;
    lines.frustumCulled = false;
    lines.renderOrder = 40;
    constellation.add(lines);

    const normalStarMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: definition.color,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const regulusMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffe6a1,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    definition.points.forEach(([x, z], index) => {
      const isBrightest = index === definition.brightestStar;
      const star = new THREE.Sprite(
        isBrightest ? regulusMaterial : normalStarMaterial,
      );
      star.name = isBrightest ? "Regulus" : `Estrella de ${definition.name}`;
      star.position.set(
        x * definition.scale,
        isBrightest ? 0.06 : 0.03,
        z * definition.scale,
      );
      const starSize = isBrightest ? 4.6 : 1.75 + (index % 3) * 0.22;
      star.scale.set(starSize, starSize, 1);
      star.frustumCulled = false;
      star.renderOrder = isBrightest ? 43 : 42;
      constellation.add(star);
    });

    if (definition.brightestStar !== undefined) {
      const [x, z] = definition.points[definition.brightestStar];
      const rayLength = 3.15;
      const rayPositions = [
        -rayLength,
        0.08,
        0,
        rayLength,
        0.08,
        0,
        0,
        0.08,
        -rayLength,
        0,
        0.08,
        rayLength,
        -rayLength * 0.62,
        0.08,
        -rayLength * 0.62,
        rayLength * 0.62,
        0.08,
        rayLength * 0.62,
        -rayLength * 0.62,
        0.08,
        rayLength * 0.62,
        rayLength * 0.62,
        0.08,
        -rayLength * 0.62,
      ];
      const rayGeometry = new THREE.BufferGeometry();
      rayGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(rayPositions, 3),
      );
      const rays = new THREE.LineSegments(
        rayGeometry,
        new THREE.LineBasicMaterial({
          color: 0xfff1be,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      rays.name = "Destellos de Regulus";
      rays.position.set(x * definition.scale, 0, z * definition.scale);
      rays.frustumCulled = false;
      rays.renderOrder = 41;
      constellation.add(rays);
    }

    group.add(constellation);
  });

  return group;
}

export function createDeepStars(
  count: number,
  texture: THREE.Texture,
  random: () => number,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color("#ffffff"),
    new THREE.Color("#82c8ff"),
    new THREE.Color("#ffb0dc"),
    new THREE.Color("#a99aff"),
  ];

  for (let index = 0; index < count; index += 1) {
    const radius = 150 + random() * 260;
    const theta = random() * TAU;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const color = palette[Math.floor(random() * palette.length)];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 1.25,
      sizeAttenuation: true,
      map: texture,
      transparent: true,
      opacity: 0.76,
      alphaTest: 0.025,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

export type GalaxySystem = {
  group: THREE.Group;
  particles: THREE.Points;
  dust: THREE.Points;
  vortex: THREE.Points;
  ringGuides: THREE.Group;
  coreGlow: THREE.Mesh;
};

export function createGalaxySystem(
  count: number,
  texture: THREE.Texture,
  random: () => number,
): GalaxySystem {
  const group = new THREE.Group();
  group.name = "Mapa galáctico de anillos";

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const nearColor = new THREE.Color("#ffd0e9");
  const middleColor = new THREE.Color("#c14fff");
  const outerColor = new THREE.Color("#357cff");
  const cyanColor = new THREE.Color("#58ddff");
  const color = new THREE.Color();
  const ringCount = 15;

  for (let index = 0; index < count; index += 1) {
    const isSpiral = index % 4 === 0;
    let radius: number;
    let angle: number;

    if (isSpiral) {
      radius = 6 + Math.pow(random(), 0.7) * 98;
      const arm = index % 5;
      angle =
        (arm / 5) * TAU +
        radius * 0.082 +
        (random() - 0.5) * (0.1 + radius * 0.006);
    } else {
      const ringIndex = index % ringCount;
      const baseRadius = 8 + ringIndex * 6.45;
      angle = random() * TAU + ringIndex * 0.13;
      const bandNoise =
        (random() + random() + random() - 1.5) * (0.42 + ringIndex * 0.055);
      const curvedBand = Math.sin(angle * 3 + ringIndex * 0.72) * 0.62;
      radius = baseRadius + bandNoise + curvedBand;
    }

    const wave =
      Math.sin(angle * 2.4 + radius * 0.075) * (0.1 + radius * 0.004);
    const height = (random() - 0.5) * (0.45 + radius * 0.023) + wave;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = height;
    positions[index * 3 + 2] = Math.sin(angle) * radius;

    const normalized = THREE.MathUtils.clamp(radius / 104, 0, 1);
    if (normalized < 0.42) {
      color.copy(nearColor).lerp(middleColor, normalized / 0.42);
    } else {
      color.copy(middleColor).lerp(outerColor, (normalized - 0.42) / 0.58);
    }
    if (index % 17 === 0) color.lerp(cyanColor, 0.6);
    color.offsetHSL((random() - 0.5) * 0.028, 0, (random() - 0.5) * 0.13);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      size: 0.56,
      sizeAttenuation: true,
      map: texture,
      alphaTest: 0.025,
      transparent: true,
      opacity: 0.92,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(particles);

  const dustCount = Math.floor(count * 0.38);
  const dustPositions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    const radius = 7 + Math.pow(random(), 0.72) * 101;
    const angle = random() * TAU + radius * 0.042;
    dustPositions[index * 3] =
      Math.cos(angle) * radius + (random() - 0.5) * 3.4;
    dustPositions[index * 3 + 1] = (random() - 0.5) * (1.2 + radius * 0.06);
    dustPositions[index * 3 + 2] =
      Math.sin(angle) * radius + (random() - 0.5) * 3.4;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(dustPositions, 3),
  );
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0x6a53cf,
      size: 0.34,
      map: texture,
      transparent: true,
      opacity: 0.23,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(dust);

  const ringGuides = new THREE.Group();
  for (let ringIndex = 0; ringIndex < 12; ringIndex += 1) {
    const segments = 220;
    const ringPositions = new Float32Array((segments + 1) * 3);
    const radius = 10 + ringIndex * 7.55;
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * TAU;
      ringPositions[index * 3] = Math.cos(angle) * radius;
      ringPositions[index * 3 + 1] =
        -0.18 + Math.sin(angle * 3 + ringIndex) * 0.16;
      ringPositions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(ringPositions, 3),
    );
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: ringIndex % 3 === 0 ? 0xff72c5 : 0x7187ff,
        transparent: true,
        opacity: ringIndex % 3 === 0 ? 0.12 : 0.055,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ringGuides.add(line);
  }
  group.add(ringGuides);

  const vortexCount = Math.max(520, Math.floor(count * 0.14));
  const vortexPositions = new Float32Array(vortexCount * 3);
  const vortexColors = new Float32Array(vortexCount * 3);
  for (let index = 0; index < vortexCount; index += 1) {
    const radius = 3.6 + Math.pow(random(), 1.42) * 16;
    const angle = random() * TAU + radius * 0.52;
    vortexPositions[index * 3] = Math.cos(angle) * radius;
    vortexPositions[index * 3 + 1] =
      0.48 + (random() - 0.5) * (0.28 + radius * 0.055);
    vortexPositions[index * 3 + 2] = Math.sin(angle) * radius;
    const vortexColor =
      index % 5 === 0
        ? new THREE.Color("#fff1fb")
        : index % 2 === 0
          ? new THREE.Color("#ff4ca8")
          : new THREE.Color("#7069ff");
    vortexColors[index * 3] = vortexColor.r;
    vortexColors[index * 3 + 1] = vortexColor.g;
    vortexColors[index * 3 + 2] = vortexColor.b;
  }
  const vortexGeometry = new THREE.BufferGeometry();
  vortexGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vortexPositions, 3),
  );
  vortexGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(vortexColors, 3),
  );
  const vortex = new THREE.Points(
    vortexGeometry,
    new THREE.PointsMaterial({
      size: 0.44,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(vortex);

  const blackCore = new THREE.Mesh(
    new THREE.SphereGeometry(3.25, 44, 28),
    new THREE.MeshPhysicalMaterial({
      color: 0x000005,
      emissive: 0x03000b,
      roughness: 0.18,
      metalness: 0.5,
      clearcoat: 1,
    }),
  );
  blackCore.position.y = 0.62;
  blackCore.scale.y = 0.33;
  group.add(blackCore);

  const coreGlow = new THREE.Mesh(
    new THREE.RingGeometry(3.3, 7.8, 160),
    new THREE.MeshBasicMaterial({
      color: 0xff4fa8,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  coreGlow.position.y = 0.55;
  coreGlow.rotation.x = -Math.PI / 2;
  group.add(coreGlow);

  const eventHorizon = new THREE.Mesh(
    new THREE.TorusGeometry(3.35, 0.08, 10, 180),
    new THREE.MeshBasicMaterial({
      color: 0xffcae7,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  eventHorizon.position.y = 0.58;
  eventHorizon.rotation.x = Math.PI / 2;
  group.add(eventHorizon);

  return { group, particles, dust, vortex, ringGuides, coreGlow };
}

const HEART_UPPER_PROFILE = new THREE.CubicBezierCurve(
  new THREE.Vector2(0, 4.9),
  new THREE.Vector2(1.35, 7.7),
  new THREE.Vector2(6.9, 7.7),
  new THREE.Vector2(7.2, 3.05),
);

const HEART_LOWER_PROFILE = new THREE.CubicBezierCurve(
  new THREE.Vector2(7.2, 3.05),
  new THREE.Vector2(7.1, -0.9),
  new THREE.Vector2(2.15, -4.95),
  new THREE.Vector2(0, -6.45),
);

function sampleHeartProfile(progress: number) {
  const upperShare = 0.46;
  if (progress <= upperShare) {
    return HEART_UPPER_PROFILE.getPoint(progress / upperShare);
  }
  return HEART_LOWER_PROFILE.getPoint(
    (progress - upperShare) / (1 - upperShare),
  );
}

function createHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 4.9);
  shape.bezierCurveTo(1.35, 7.7, 6.9, 7.7, 7.2, 3.05);
  shape.bezierCurveTo(7.1, -0.9, 2.15, -4.95, 0, -6.45);
  shape.bezierCurveTo(-2.15, -4.95, -7.1, -0.9, -7.2, 3.05);
  shape.bezierCurveTo(-6.9, 7.7, -1.35, 7.7, 0, 4.9);
  return shape;
}

function applyCrystalFacetColors(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const colors = new Float32Array(positions.count * 3);
  const facetColor = new THREE.Color();
  const diamondWhite = new THREE.Color("#f8fcff");
  const ice = new THREE.Color("#dff5ff");
  const rose = new THREE.Color("#ffe7f5");
  const violet = new THREE.Color("#e8e2ff");
  const cyan = new THREE.Color("#c5efff");
  const shadow = new THREE.Color("#b9bde8");

  for (let index = 0; index < positions.count; index += 3) {
    const facetIndex = index / 3;
    const normalZ = Math.abs(
      (normals.getZ(index) +
        normals.getZ(index + 1) +
        normals.getZ(index + 2)) /
        3,
    );
    const seed =
      Math.abs(Math.sin((facetIndex + 1) * 12.9898) * 43758.5453) % 1;

    if (normalZ > 0.965) {
      facetColor
        .copy(diamondWhite)
        .lerp(seed > 0.56 ? rose : ice, 0.08 + seed * 0.05);
    } else if (normalZ > 0.34) {
      facetColor.copy(diamondWhite);
      if (seed < 0.25) facetColor.lerp(cyan, 0.24);
      else if (seed < 0.5) facetColor.lerp(rose, 0.22);
      else if (seed < 0.75) facetColor.lerp(violet, 0.2);
      else facetColor.lerp(ice, 0.18);
      facetColor.multiplyScalar(0.86 + normalZ * 0.14);
    } else {
      facetColor
        .copy(shadow)
        .lerp(seed > 0.5 ? cyan : violet, 0.32)
        .multiplyScalar(0.82);
    }

    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = (index + vertex) * 3;
      colors[offset] = facetColor.r;
      colors[offset + 1] = facetColor.g;
      colors[offset + 2] = facetColor.b;
    }
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function createFacetedHeartCutGeometry(segments: number) {
  const contourResolution = segments >= 46 ? 72 : 54;
  const contour = createHeartShape().getSpacedPoints(contourResolution);
  if (
    contour.length > 1 &&
    contour[0].distanceTo(contour[contour.length - 1]) < 0.0001
  ) {
    contour.pop();
  }

  const contourBounds = new THREE.Box2().setFromPoints(contour);
  const contourCenter = contourBounds.getCenter(new THREE.Vector2());
  const contourClockwise = THREE.ShapeUtils.isClockWise(contour);
  const ringPoint = (
    pointIndex: number,
    scale: number,
    z: number,
    phase = 0,
  ) => {
    const wrapped = (pointIndex + phase + contour.length) % contour.length;
    const baseIndex = Math.floor(wrapped);
    const nextIndex = (baseIndex + 1) % contour.length;
    const blend = wrapped - baseIndex;
    const point = contour[baseIndex].clone().lerp(contour[nextIndex], blend);
    return new THREE.Vector3(
      contourCenter.x + (point.x - contourCenter.x) * scale,
      contourCenter.y + (point.y - contourCenter.y) * scale,
      z,
    );
  };
  const createRing = (scale: number, z: number, phase = 0) =>
    contour.map((_, index) => ringPoint(index, scale, z, phase));

  const tableRing = createRing(0.46, 2.72);
  const starRing = createRing(0.7, 2.12, 0.5);
  const girdleFront = createRing(1, 0.28);
  const girdleBack = createRing(1, -0.28);
  const pavilionRing = createRing(0.64, -1.68, 0.5);
  const lowerPavilionRing = createRing(0.32, -2.5);
  const culet = new THREE.Vector3(
    contourCenter.x,
    contourCenter.y - 0.22,
    -3.18,
  );

  const positionValues: number[] = [];
  const firstEdge = new THREE.Vector3();
  const secondEdge = new THREE.Vector3();
  const triangleNormal = new THREE.Vector3();
  const pushTriangle = (
    first: THREE.Vector3,
    second: THREE.Vector3,
    third: THREE.Vector3,
    expectedNormal: THREE.Vector3,
  ) => {
    firstEdge.subVectors(second, first);
    secondEdge.subVectors(third, first);
    triangleNormal.crossVectors(firstEdge, secondEdge);
    const reversed = triangleNormal.dot(expectedNormal) < 0;
    const middle = reversed ? third : second;
    const last = reversed ? second : third;
    positionValues.push(
      first.x,
      first.y,
      first.z,
      middle.x,
      middle.y,
      middle.z,
      last.x,
      last.y,
      last.z,
    );
  };

  const frontNormal = new THREE.Vector3(0, 0, 1);
  const backNormal = new THREE.Vector3(0, 0, -1);
  const connectRings = (
    inner: THREE.Vector3[],
    outer: THREE.Vector3[],
    expectedNormal: THREE.Vector3,
    diagonalPhase: number,
  ) => {
    for (let index = 0; index < inner.length; index += 1) {
      const next = (index + 1) % inner.length;
      if ((index + diagonalPhase) % 2 === 0) {
        pushTriangle(inner[index], outer[index], outer[next], expectedNormal);
        pushTriangle(inner[index], outer[next], inner[next], expectedNormal);
      } else {
        pushTriangle(inner[index], outer[index], inner[next], expectedNormal);
        pushTriangle(inner[next], outer[index], outer[next], expectedNormal);
      }
    }
  };

  const tableContour = tableRing.map(
    (point) => new THREE.Vector2(point.x, point.y),
  );
  THREE.ShapeUtils.triangulateShape(tableContour, []).forEach(
    ([first, second, third]) => {
      pushTriangle(
        tableRing[first],
        tableRing[second],
        tableRing[third],
        frontNormal,
      );
    },
  );
  connectRings(tableRing, starRing, frontNormal, 0);
  connectRings(starRing, girdleFront, frontNormal, 1);

  for (let index = 0; index < girdleFront.length; index += 1) {
    const previous = (index - 1 + girdleFront.length) % girdleFront.length;
    const next = (index + 1) % girdleFront.length;
    const tangentX = girdleFront[next].x - girdleFront[previous].x;
    const tangentY = girdleFront[next].y - girdleFront[previous].y;
    const expectedNormal = new THREE.Vector3(
      contourClockwise ? -tangentY : tangentY,
      contourClockwise ? tangentX : -tangentX,
      0,
    ).normalize();
    pushTriangle(
      girdleFront[index],
      girdleBack[index],
      girdleBack[next],
      expectedNormal,
    );
    pushTriangle(
      girdleFront[index],
      girdleBack[next],
      girdleFront[next],
      expectedNormal,
    );
  }

  connectRings(girdleBack, pavilionRing, backNormal, 0);
  connectRings(pavilionRing, lowerPavilionRing, backNormal, 1);
  for (let index = 0; index < lowerPavilionRing.length; index += 1) {
    const next = (index + 1) % lowerPavilionRing.length;
    pushTriangle(
      lowerPavilionRing[index],
      culet,
      lowerPavilionRing[next],
      backNormal,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positionValues, 3),
  );
  geometry.center();
  geometry.computeBoundingBox();
  const bounds = new THREE.Vector3();
  geometry.boundingBox?.getSize(bounds);
  geometry.scale(
    15 / Math.max(bounds.x, 0.001),
    15.8 / Math.max(bounds.y, 0.001),
    6.8 / Math.max(bounds.z, 0.001),
  );
  geometry.computeVertexNormals();
  applyCrystalFacetColors(geometry);
  geometry.computeBoundingSphere();
  return geometry;
}

function createVolumetricHeartGeometry(segments: number) {
  const fieldResolution = segments >= 46 ? 48 : 38;
  const maximumTriangles = segments >= 46 ? 90000 : 52000;
  const placeholderMaterial = new THREE.MeshBasicMaterial();
  const marchingHeart = new MarchingCubes(
    fieldResolution,
    placeholderMaterial,
    false,
    false,
    maximumTriangles,
  );
  marchingHeart.isolation = 0;

  const lastCell = fieldResolution - 1;
  for (let zIndex = 0; zIndex < fieldResolution; zIndex += 1) {
    const z = (zIndex / lastCell) * 2.8 - 1.4;
    for (let yIndex = 0; yIndex < fieldResolution; yIndex += 1) {
      const y = (yIndex / lastCell) * 2.8 - 1.4;
      const yCubed = y * y * y;
      for (let xIndex = 0; xIndex < fieldResolution; xIndex += 1) {
        const x = (xIndex / lastCell) * 2.8 - 1.4;
        const roundedBody = x * x + y * y + z * z * 1.34 - 1;
        const implicitHeart =
          roundedBody * roundedBody * roundedBody -
          x * x * yCubed -
          z * z * yCubed * 0.082;
        marchingHeart.setCell(xIndex, yIndex, zIndex, -implicitHeart);
      }
    }
  }
  marchingHeart.update();

  const generatedGeometry = marchingHeart.geometry;
  const generatedPositions = generatedGeometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  const generatedNormals = generatedGeometry.getAttribute(
    "normal",
  ) as THREE.BufferAttribute;
  const drawCount = Math.max(0, generatedGeometry.drawRange.count);
  const positionValues = (generatedPositions.array as Float32Array).slice(
    0,
    drawCount * 3,
  );
  const normalValues = (generatedNormals.array as Float32Array).slice(
    0,
    drawCount * 3,
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positionValues, 3),
  );
  geometry.setAttribute("normal", new THREE.BufferAttribute(normalValues, 3));
  geometry.center();
  geometry.computeBoundingBox();
  const bounds = new THREE.Vector3();
  geometry.boundingBox?.getSize(bounds);
  geometry.scale(
    15.4 / Math.max(bounds.x, 0.001),
    16.2 / Math.max(bounds.y, 0.001),
    14.6 / Math.max(bounds.z, 0.001),
  );
  geometry.computeBoundingSphere();

  generatedGeometry.dispose();
  placeholderMaterial.dispose();
  return geometry;
}

function createDiamondGlintTexture(size = 192) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const center = size / 2;
  context.clearRect(0, 0, size, size);
  context.globalCompositeOperation = "lighter";

  const halo = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center * 0.48,
  );
  halo.addColorStop(0, "rgba(255,255,255,1)");
  halo.addColorStop(0.08, "rgba(224,248,255,0.96)");
  halo.addColorStop(0.24, "rgba(255,180,232,0.5)");
  halo.addColorStop(1, "rgba(110,205,255,0)");
  context.fillStyle = halo;
  context.fillRect(0, 0, size, size);

  const drawRay = (
    angle: number,
    length: number,
    width: number,
    color: string,
  ) => {
    context.save();
    context.translate(center, center);
    context.rotate(angle);
    const ray = context.createLinearGradient(-length, 0, length, 0);
    ray.addColorStop(0, "rgba(255,255,255,0)");
    ray.addColorStop(0.42, color);
    ray.addColorStop(0.5, "rgba(255,255,255,1)");
    ray.addColorStop(0.58, color);
    ray.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = ray;
    context.fillRect(-length, -width / 2, length * 2, width);
    context.restore();
  };
  drawRay(0, center * 0.9, 2.2, "rgba(180,232,255,0.32)");
  drawRay(Math.PI / 2, center * 0.9, 2.2, "rgba(255,190,232,0.34)");
  drawRay(Math.PI / 4, center * 0.52, 1.2, "rgba(255,232,190,0.25)");
  drawRay(-Math.PI / 4, center * 0.52, 1.2, "rgba(192,220,255,0.25)");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export type HeartSystem = {
  group: THREE.Group;
  crystalCloud?: THREE.InstancedMesh;
  faceCrystals?: THREE.InstancedMesh;
  orbitals: THREE.Group;
  clickable: THREE.Object3D[];
  aura: THREE.Sprite;
  facingParticles?: THREE.Group;
  innerGalaxyMaterial?: THREE.ShaderMaterial;
  glints?: THREE.Sprite[];
  particleMaterials?: THREE.ShaderMaterial[];
};

function createFirstGalaxyHeartGeometry(segments: number) {
  const slices = segments >= 46 ? 72 : 56;
  const stacks = segments >= 46 ? 22 : 18;
  const anchorY = -1;
  const geometry = new ParametricGeometry(
    (u, v, target) => {
      const angle = (1 - u) * TAU;
      const latitude = (v - 0.5) * Math.PI;
      const sin = Math.sin(angle);
      const outlineX = 16 * sin * sin * sin;
      const outlineY =
        13 * Math.cos(angle) -
        5 * Math.cos(2 * angle) -
        2 * Math.cos(3 * angle) -
        Math.cos(4 * angle);
      const inflation = Math.cos(latitude);
      target.set(
        outlineX * inflation,
        anchorY + (outlineY - anchorY) * inflation,
        11 * Math.sin(latitude),
      );
    },
    slices,
    stacks,
  );
  geometry.center();
  geometry.computeBoundingBox();
  const bounds = new THREE.Vector3();
  geometry.boundingBox?.getSize(bounds);
  geometry.scale(
    14.5 / Math.max(bounds.x, 0.001),
    14.8 / Math.max(bounds.y, 0.001),
    11.2 / Math.max(bounds.z, 0.001),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createHeart(
  crystalCount: number,
  resolution: number,
  glowTexture: THREE.Texture,
  random: () => number,
  environmentMap?: THREE.Texture,
): HeartSystem {
  {
    const group = new THREE.Group();
    group.name = "Corazón volumétrico de cristal";
    group.position.set(0, 13.2, 0);

    const heartGeometry = createFirstGalaxyHeartGeometry(resolution);
    const solidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff2e8f,
      emissive: 0x8e073f,
      emissiveIntensity: 2.15,
      roughness: 0.14,
      metalness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.42,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    solidMaterial.forceSinglePass = true;
    const solidHeart = new THREE.Mesh(heartGeometry, solidMaterial);
    solidHeart.userData.interaction = { kind: "heart" };
    group.add(solidHeart);

    const innerHeart = new THREE.Mesh(
      heartGeometry.clone(),
      new THREE.MeshPhysicalMaterial({
        color: 0x3a052d,
        emissive: 0xff147d,
        emissiveIntensity: 1.5,
        roughness: 0.35,
        metalness: 0.12,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    innerHeart.scale.setScalar(0.87);
    group.add(innerHeart);

    const wireHeart = new THREE.Mesh(
      heartGeometry.clone(),
      new THREE.MeshBasicMaterial({
        color: 0xffd9f0,
        transparent: true,
        opacity: 0.11,
        wireframe: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    wireHeart.scale.setScalar(1.018);
    group.add(wireHeart);

    const crystalGeometry = new THREE.OctahedronGeometry(0.21, 0);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff3d9c,
      emissiveIntensity: 1.6,
      roughness: 0.05,
      metalness: 0.32,
      vertexColors: true,
    });
    const crystalCloud = new THREE.InstancedMesh(
      crystalGeometry,
      crystalMaterial,
      crystalCount,
    );
    crystalCloud.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    crystalCloud.userData.interaction = { kind: "heart" };

    const sampler = new MeshSurfaceSampler(
      new THREE.Mesh(heartGeometry),
    ).build();
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const twist = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const position = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const color = new THREE.Color();

    for (let index = 0; index < crystalCount; index += 1) {
      sampler.sample(position, normal);
      normal.normalize();
      position.addScaledVector(normal, 0.08 + random() * 0.12);
      quaternion.setFromUnitVectors(up, normal);
      twist.setFromAxisAngle(normal, random() * TAU);
      quaternion.premultiply(twist);
      const particleScale = 0.58 + random() * 1.45;
      scale.set(
        particleScale * (0.76 + random() * 0.5),
        particleScale,
        particleScale * (0.76 + random() * 0.5),
      );
      matrix.compose(position, quaternion, scale);
      crystalCloud.setMatrixAt(index, matrix);
      color
        .set(
          index % 7 === 0 ? "#ffffff" : index % 3 === 0 ? "#ff72bf" : "#a678ff",
        )
        .offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.11);
      crystalCloud.setColorAt(index, color);
    }
    crystalCloud.instanceMatrix.needsUpdate = true;
    if (crystalCloud.instanceColor) {
      crystalCloud.instanceColor.needsUpdate = true;
    }
    crystalCloud.computeBoundingSphere();
    group.add(crystalCloud);

    const silhouetteCount = Math.max(430, Math.floor(crystalCount * 0.95));
    const silhouettePositions = new Float32Array(silhouetteCount * 3);
    const silhouetteColors = new Float32Array(silhouetteCount * 3);
    const silhouetteColor = new THREE.Color();
    for (let index = 0; index < silhouetteCount; index += 1) {
      const half = silhouetteCount / 2;
      const onRightSide = index < half;
      const sideProgress = onRightSide
        ? index / Math.max(1, half - 1)
        : 1 - (index - half) / Math.max(1, half - 1);
      const profilePoint = sampleHeartProfile(
        THREE.MathUtils.clamp(sideProgress, 0, 1),
      );
      const scatter = index % 5 === 0 ? 0.19 : 0.08;
      silhouettePositions[index * 3] =
        profilePoint.x * (onRightSide ? 1 : -1) + (random() - 0.5) * scatter;
      silhouettePositions[index * 3 + 1] =
        profilePoint.y + (random() - 0.5) * scatter;
      silhouettePositions[index * 3 + 2] = (random() - 0.5) * 0.34;
      silhouetteColor
        .set(
          index % 7 === 0 ? "#ffffff" : index % 2 === 0 ? "#ff7ac4" : "#d79bff",
        )
        .offsetHSL(0, 0, (random() - 0.5) * 0.08);
      silhouetteColors[index * 3] = silhouetteColor.r;
      silhouetteColors[index * 3 + 1] = silhouetteColor.g;
      silhouetteColors[index * 3 + 2] = silhouetteColor.b;
    }
    const silhouetteGeometry = new THREE.BufferGeometry();
    silhouetteGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(silhouettePositions, 3),
    );
    silhouetteGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(silhouetteColors, 3),
    );
    const outlineParticles = new THREE.Points(
      silhouetteGeometry,
      new THREE.PointsMaterial({
        size: 0.3,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.96,
        alphaTest: 0.02,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    outlineParticles.renderOrder = 8;

    const faceShape = new THREE.Shape();
    faceShape.moveTo(0, 4.05);
    faceShape.bezierCurveTo(1.7, 7.95, 6.65, 7.45, 7.05, 3.15);
    faceShape.bezierCurveTo(7, -0.9, 1.35, -4.55, 0, -6.05);
    faceShape.bezierCurveTo(-1.35, -4.55, -7, -0.9, -7.05, 3.15);
    faceShape.bezierCurveTo(-6.65, 7.45, -1.7, 7.95, 0, 4.05);
    const faceGeometry = new THREE.ShapeGeometry(faceShape, 32);
    const faceSampler = new MeshSurfaceSampler(
      new THREE.Mesh(faceGeometry),
    ).build();

    const faceCrystalCount = Math.max(260, Math.floor(crystalCount * 0.72));
    const faceCrystalGeometry = new THREE.OctahedronGeometry(0.24, 0);
    const faceCrystalMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const faceCrystals = new THREE.InstancedMesh(
      faceCrystalGeometry,
      faceCrystalMaterial,
      faceCrystalCount,
    );
    faceCrystals.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    faceCrystals.userData.interaction = { kind: "heart" };
    const faceEuler = new THREE.Euler();
    for (let index = 0; index < faceCrystalCount; index += 1) {
      faceSampler.sample(position);
      position.z = (random() - 0.5) * 2.7;
      faceEuler.set(random() * TAU, random() * TAU, random() * TAU);
      quaternion.setFromEuler(faceEuler);
      const crystalScale = 0.52 + random() * 1.5;
      scale.set(
        crystalScale * (0.65 + random() * 0.55),
        crystalScale,
        crystalScale * (0.65 + random() * 0.55),
      );
      matrix.compose(position, quaternion, scale);
      faceCrystals.setMatrixAt(index, matrix);
      color
        .set(
          index % 9 === 0 ? "#ffffff" : index % 3 === 0 ? "#ff5eae" : "#cf8cff",
        )
        .offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.1);
      faceCrystals.setColorAt(index, color);
    }
    faceCrystals.instanceMatrix.needsUpdate = true;
    if (faceCrystals.instanceColor) {
      faceCrystals.instanceColor.needsUpdate = true;
    }
    faceCrystals.computeBoundingSphere();
    faceCrystals.renderOrder = 9;

    const faceShell = new THREE.Mesh(
      faceGeometry.clone(),
      new THREE.MeshBasicMaterial({
        color: 0xff3c9a,
        transparent: true,
        opacity: 0.08,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    faceShell.renderOrder = 6;

    const fillCount = Math.max(250, Math.floor(crystalCount * 0.58));
    const fillPositions = new Float32Array(fillCount * 3);
    const fillPosition = new THREE.Vector3();
    for (let index = 0; index < fillCount; index += 1) {
      faceSampler.sample(fillPosition);
      fillPositions[index * 3] = fillPosition.x + (random() - 0.5) * 0.08;
      fillPositions[index * 3 + 1] = fillPosition.y + (random() - 0.5) * 0.08;
      fillPositions[index * 3 + 2] = (random() - 0.5) * 0.22;
    }
    faceGeometry.dispose();
    const fillGeometry = new THREE.BufferGeometry();
    fillGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(fillPositions, 3),
    );
    const fillParticles = new THREE.Points(
      fillGeometry,
      new THREE.PointsMaterial({
        color: 0xff8bcc,
        size: 0.16,
        map: glowTexture,
        transparent: true,
        opacity: 0.3,
        alphaTest: 0.02,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    fillParticles.renderOrder = 7;

    const facingParticles = new THREE.Group();
    facingParticles.name = "Silueta cristalina omnidireccional";
    facingParticles.add(
      faceShell,
      fillParticles,
      outlineParticles,
      faceCrystals,
    );
    facingParticles.scale.setScalar(1.06);
    group.add(facingParticles);

    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff268e,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    aura.scale.set(31, 31, 1);
    group.add(aura);

    const orbitals = new THREE.Group();
    const orbitalPalette = ["#ff7ac6", "#a875ff", "#63d5ff", "#ffd8ed"];
    for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
      const ringCount = 190;
      const positions = new Float32Array(ringCount * 3);
      for (let index = 0; index < ringCount; index += 1) {
        const angle = (index / ringCount) * TAU;
        const radius =
          9.3 + ringIndex * 1.65 + Math.sin(index * 2.7 + ringIndex) * 0.16;
        positions[index * 3] = Math.cos(angle) * radius;
        positions[index * 3 + 1] = Math.sin(angle) * radius * 0.33;
        positions[index * 3 + 2] = Math.sin(angle * 2 + ringIndex) * 0.5;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const points = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: orbitalPalette[ringIndex],
          size: 0.24,
          map: glowTexture,
          transparent: true,
          opacity: 0.74 - ringIndex * 0.1,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      points.rotation.x = 0.2 + ringIndex * 0.62;
      points.rotation.y = 0.18 + ringIndex * 0.51;
      orbitals.add(points);
    }
    group.add(orbitals);

    const crownLight = new THREE.PointLight(0xff3d9c, 88, 48, 1.8);
    crownLight.position.set(0, 1, 4);
    group.add(crownLight);

    return {
      group,
      crystalCloud,
      faceCrystals,
      orbitals,
      clickable: [solidHeart, crystalCloud, faceCrystals],
      aura,
      facingParticles,
    };
  }

  {
    const group = new THREE.Group();
    group.name = "Corazón holográfico de partículas";
    group.position.set(0, 13.2, 0);

    const heartGeometry = createVolumetricHeartGeometry(resolution);
    const interactionProxy = new THREE.Mesh(
      heartGeometry,
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        colorWrite: false,
        depthWrite: false,
      }),
    );
    interactionProxy.name = "Volumen interactivo invisible";
    interactionProxy.userData.interaction = { kind: "heart" };
    group.add(interactionProxy);

    const surfaceSampler = new MeshSurfaceSampler(interactionProxy).build();
    const samplePosition = new THREE.Vector3();
    const sampleNormal = new THREE.Vector3();
    const particleColor = new THREE.Color();
    const particleMaterials: THREE.ShaderMaterial[] = [];

    const createParticleMaterial = (opacity: number, maximumSize: number) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uMaximumSize: { value: maximumSize },
        },
        vertexShader: `
          attribute float aSize;
          attribute float aPhase;
          attribute vec3 color;
          uniform float uTime;
          uniform float uMaximumSize;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vDepthLight;

          void main() {
            vColor = color;
            float twinkle = 0.76 + 0.24 * sin(
              uTime * 2.15 + aPhase
            );
            float rareFlash = pow(
              max(0.0, sin(uTime * 0.72 + aPhase * 2.7)),
              12.0
            );
            float breathing = 1.0 + sin(
              uTime * 0.58 + aPhase + position.y * 0.11
            ) * 0.0075;
            vec3 animatedPosition = position * breathing;
            float localDepth = smoothstep(-7.4, 7.4, animatedPosition.z);
            vDepthLight = mix(0.54, 1.0, localDepth);
            vAlpha =
              (0.68 + twinkle * 0.24 + rareFlash * 0.42) *
              mix(0.58, 1.08, localDepth);
            vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
            float depth = max(1.0, -viewPosition.z);
            gl_PointSize = clamp(
              aSize *
                (twinkle + rareFlash * 0.72) *
                mix(0.78, 1.12, localDepth) *
                (270.0 / depth),
              1.0,
              uMaximumSize
            );
            gl_Position = projectionMatrix * viewPosition;
          }
        `,
        fragmentShader: `
          uniform float uOpacity;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vDepthLight;

          void main() {
            vec2 centered = gl_PointCoord - vec2(0.5);
            float radius = length(centered) * 2.0;
            if (radius > 1.0) discard;
            float halo = pow(max(0.0, 1.0 - radius), 2.25);
            float core = 1.0 - smoothstep(0.0, 0.22, radius);
            vec3 luminousColor =
              vColor * (0.72 + vDepthLight * 0.34 + core * 2.25);
            gl_FragColor = vec4(
              luminousColor,
              halo * vAlpha * uOpacity
            );
            #include <colorspace_fragment>
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      particleMaterials.push(material);
      return material;
    };

    const createParticleObject = (
      name: string,
      positions: Float32Array,
      colors: Float32Array,
      sizes: Float32Array,
      phases: Float32Array,
      material: THREE.ShaderMaterial,
      renderOrder: number,
    ) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      geometry.computeBoundingSphere();
      const points = new THREE.Points(geometry, material);
      points.name = name;
      points.frustumCulled = false;
      points.renderOrder = renderOrder;
      group.add(points);
      return points;
    };

    const surfaceParticleCount =
      crystalCount >= 500 ? 4400 : crystalCount >= 300 ? 2700 : 1700;
    const surfacePositions = new Float32Array(surfaceParticleCount * 3);
    const surfaceColors = new Float32Array(surfaceParticleCount * 3);
    const surfaceSizes = new Float32Array(surfaceParticleCount);
    const surfacePhases = new Float32Array(surfaceParticleCount);
    for (let index = 0; index < surfaceParticleCount; index += 1) {
      surfaceSampler.sample(samplePosition, sampleNormal);
      sampleNormal.normalize();
      samplePosition.addScaledVector(sampleNormal, 0.035 + random() * 0.2);
      surfacePositions[index * 3] = samplePosition.x;
      surfacePositions[index * 3 + 1] = samplePosition.y;
      surfacePositions[index * 3 + 2] = samplePosition.z;
      particleColor.set(
        index % 17 === 0
          ? "#ffffff"
          : index % 5 === 0
            ? "#ffd3e9"
            : index % 3 === 0
              ? "#ff83c2"
              : "#ff4fa8",
      );
      surfaceColors[index * 3] = particleColor.r;
      surfaceColors[index * 3 + 1] = particleColor.g;
      surfaceColors[index * 3 + 2] = particleColor.b;
      surfaceSizes[index] =
        index % 29 === 0 ? 2.45 + random() : 0.48 + random() * 1.08;
      surfacePhases[index] = random() * TAU;
    }
    createParticleObject(
      "Piel tridimensional de estrellas",
      surfacePositions,
      surfaceColors,
      surfaceSizes,
      surfacePhases,
      createParticleMaterial(0.64, 10),
      5,
    );

    const heartShape = createHeartShape();
    const heartContourBounds = new THREE.Box2().setFromPoints(
      heartShape.getSpacedPoints(80),
    );
    const heartContourCenter = heartContourBounds.getCenter(
      new THREE.Vector2(),
    );
    const contourScaleX =
      15.2 / Math.max(heartContourBounds.max.x - heartContourBounds.min.x, 1);
    const contourScaleY =
      16 / Math.max(heartContourBounds.max.y - heartContourBounds.min.y, 1);
    const filamentTrackCount = 3;
    const pointsPerTrack = crystalCount >= 500 ? 380 : 300;
    const filamentCount = filamentTrackCount * pointsPerTrack;
    const filamentPositions = new Float32Array(filamentCount * 3);
    const filamentColors = new Float32Array(filamentCount * 3);
    const filamentSizes = new Float32Array(filamentCount);
    const filamentPhases = new Float32Array(filamentCount);
    const contourPoints = heartShape.getSpacedPoints(pointsPerTrack - 1);
    let filamentIndex = 0;
    for (let trackIndex = 0; trackIndex < filamentTrackCount; trackIndex += 1) {
      const depthProgress = (trackIndex / (filamentTrackCount - 1)) * 2 - 1;
      const depth = depthProgress * 7.05;
      const roundedScale =
        0.98 + Math.sqrt(Math.max(0, 1 - depthProgress * depthProgress)) * 0.02;
      contourPoints.forEach((point, pointIndex) => {
        const progress = pointIndex / Math.max(1, contourPoints.length - 1);
        const shimmerOffset =
          Math.sin(progress * TAU * 5 + trackIndex * 1.7) * 0.035;
        filamentPositions[filamentIndex * 3] =
          (point.x - heartContourCenter.x) * contourScaleX * roundedScale +
          shimmerOffset;
        filamentPositions[filamentIndex * 3 + 1] =
          (point.y - heartContourCenter.y) * contourScaleY * roundedScale;
        filamentPositions[filamentIndex * 3 + 2] = depth;
        particleColor.set(
          trackIndex % 4 === 0
            ? "#ffffff"
            : trackIndex % 2 === 0
              ? "#ffc6e2"
              : "#ff62b2",
        );
        filamentColors[filamentIndex * 3] = particleColor.r;
        filamentColors[filamentIndex * 3 + 1] = particleColor.g;
        filamentColors[filamentIndex * 3 + 2] = particleColor.b;
        filamentSizes[filamentIndex] =
          trackIndex % 4 === 0 ? 1.55 + random() * 1.25 : 0.9 + random() * 1.05;
        filamentPhases[filamentIndex] = progress * TAU * 3 + trackIndex * 0.72;
        filamentIndex += 1;
      });
    }
    createParticleObject(
      "Contornos de luz a distintas profundidades",
      filamentPositions,
      filamentColors,
      filamentSizes,
      filamentPhases,
      createParticleMaterial(0.9, 12),
      7,
    );

    const subsurfaceParticleCount =
      crystalCount >= 500 ? 1800 : crystalCount >= 300 ? 1250 : 820;
    const subsurfacePositions = new Float32Array(subsurfaceParticleCount * 3);
    const subsurfaceColors = new Float32Array(subsurfaceParticleCount * 3);
    const subsurfaceSizes = new Float32Array(subsurfaceParticleCount);
    const subsurfacePhases = new Float32Array(subsurfaceParticleCount);
    for (let index = 0; index < subsurfaceParticleCount; index += 1) {
      surfaceSampler.sample(samplePosition);
      samplePosition.multiplyScalar(0.72 + random() * 0.23);
      subsurfacePositions[index * 3] = samplePosition.x;
      subsurfacePositions[index * 3 + 1] = samplePosition.y;
      subsurfacePositions[index * 3 + 2] = samplePosition.z;
      particleColor.set(
        index % 23 === 0
          ? "#ffffff"
          : index % 5 === 0
            ? "#ffc9e4"
            : index % 2 === 0
              ? "#ff63b2"
              : "#d92e89",
      );
      subsurfaceColors[index * 3] = particleColor.r;
      subsurfaceColors[index * 3 + 1] = particleColor.g;
      subsurfaceColors[index * 3 + 2] = particleColor.b;
      subsurfaceSizes[index] =
        index % 37 === 0 ? 1.75 + random() : 0.42 + random() * 0.92;
      subsurfacePhases[index] = random() * TAU;
    }
    createParticleObject(
      "Materia estelar bajo la superficie",
      subsurfacePositions,
      subsurfaceColors,
      subsurfaceSizes,
      subsurfacePhases,
      createParticleMaterial(0.44, 8),
      3,
    );

    const innerParticleCount =
      crystalCount >= 500 ? 1200 : crystalCount >= 300 ? 760 : 500;
    const innerPositions = new Float32Array(innerParticleCount * 3);
    const innerColors = new Float32Array(innerParticleCount * 3);
    const innerSizes = new Float32Array(innerParticleCount);
    const innerPhases = new Float32Array(innerParticleCount);
    for (let index = 0; index < innerParticleCount; index += 1) {
      surfaceSampler.sample(samplePosition);
      const inwardScale = 0.08 + Math.pow(random(), 0.62) * 0.8;
      samplePosition.multiplyScalar(inwardScale);
      innerPositions[index * 3] = samplePosition.x;
      innerPositions[index * 3 + 1] = samplePosition.y;
      innerPositions[index * 3 + 2] = samplePosition.z;
      particleColor.set(
        index % 14 === 0 ? "#ffffff" : index % 4 === 0 ? "#ffc5e3" : "#ff5baa",
      );
      innerColors[index * 3] = particleColor.r;
      innerColors[index * 3 + 1] = particleColor.g;
      innerColors[index * 3 + 2] = particleColor.b;
      innerSizes[index] =
        index % 31 === 0 ? 2.7 + random() : 0.65 + random() * 1.35;
      innerPhases[index] = random() * TAU;
    }
    createParticleObject(
      "Polvo de estrellas dentro del corazón",
      innerPositions,
      innerColors,
      innerSizes,
      innerPhases,
      createParticleMaterial(0.58, 10),
      4,
    );

    const streamParticleCount = crystalCount >= 500 ? 560 : 360;
    const streamPositions = new Float32Array(streamParticleCount * 3);
    const streamColors = new Float32Array(streamParticleCount * 3);
    const streamSizes = new Float32Array(streamParticleCount);
    const streamPhases = new Float32Array(streamParticleCount);
    for (let index = 0; index < streamParticleCount; index += 1) {
      const progress = index / Math.max(1, streamParticleCount - 1);
      const angle = progress * TAU * 5.5 + random() * 0.72;
      const radius =
        Math.sin(progress * Math.PI) * (0.42 + random() * 0.42) +
        random() * 0.08;
      streamPositions[index * 3] = Math.cos(angle) * radius;
      streamPositions[index * 3 + 1] =
        -7.85 - progress * 5.05 + (random() - 0.5) * 0.13;
      streamPositions[index * 3 + 2] = Math.sin(angle) * radius;
      particleColor.set(index % 7 === 0 ? "#ffffff" : "#ff63b2");
      streamColors[index * 3] = particleColor.r;
      streamColors[index * 3 + 1] = particleColor.g;
      streamColors[index * 3 + 2] = particleColor.b;
      streamSizes[index] = 0.72 + random() * 1.55;
      streamPhases[index] = progress * TAU * 4;
    }
    createParticleObject(
      "Flujo de partículas hacia el centro galáctico",
      streamPositions,
      streamColors,
      streamSizes,
      streamPhases,
      createParticleMaterial(0.72, 10),
      6,
    );

    const glintTexture = createDiamondGlintTexture();
    const glintDefinitions = [
      [-4.75, 4.4, 6.95, 1.7, 0xffffff, 0.1],
      [4.7, 4.25, 6.95, 1.55, 0xffd0e8, 1.8],
      [0, -7.0, 4.35, 1.25, 0xffffff, 3.2],
      [-6.1, 0.8, 5.3, 0.95, 0xffb9dc, 4.1],
      [6.05, 0.45, 5.3, 1.0, 0xffc8e4, 5.25],
    ] as const;
    const glints = glintDefinitions.map(
      ([x, y, z, glintScale, color, phase]) => {
        const glint = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glintTexture,
            color,
            transparent: true,
            opacity: 0.42,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        glint.position.set(x, y, z);
        glint.scale.setScalar(glintScale);
        glint.userData.baseScale = glintScale;
        glint.userData.phase = phase;
        glint.renderOrder = 9;
        group.add(glint);
        return glint;
      },
    );

    const orbitals = new THREE.Group();
    orbitals.name = "Órbitas de partículas";
    const orbitalPalette = [0xff57aa, 0xffffff, 0xffb7da, 0xeedcff];
    for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
      const ringCount = 150;
      const positions = new Float32Array(ringCount * 3);
      for (let index = 0; index < ringCount; index += 1) {
        const angle = (index / ringCount) * TAU;
        const radius = 11.1 + ringIndex * 1.45;
        positions[index * 3] =
          Math.cos(angle) * radius * (1 + (random() - 0.5) * 0.018);
        positions[index * 3 + 1] =
          Math.sin(angle) *
          (6.3 + ringIndex * 0.8) *
          (1 + (random() - 0.5) * 0.018);
        positions[index * 3 + 2] =
          Math.sin(angle * 2 + ringIndex) * (0.8 + ringIndex * 0.32);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const ring = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: orbitalPalette[ringIndex],
          size: 0.15,
          map: glowTexture,
          transparent: true,
          opacity: 0.34 - ringIndex * 0.045,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      ring.rotation.x = 0.2 + ringIndex * 0.56;
      ring.rotation.y = 0.14 + ringIndex * 0.44;
      orbitals.add(ring);
    }
    group.add(orbitals);

    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff4da8,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    aura.scale.set(29, 29, 1);
    aura.renderOrder = -1;
    group.add(aura);

    return {
      group,
      orbitals,
      clickable: [interactionProxy],
      aura,
      glints,
      particleMaterials,
    };
  }

  {
    const group = new THREE.Group();
    group.name = "Corazón cristalino volumétrico";
    group.position.set(0, 13.2, 0);

    const heartGeometry = createVolumetricHeartGeometry(resolution);
    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff68b5,
      emissive: 0x510631,
      emissiveIntensity: 0.52,
      roughness: 0.065,
      metalness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.035,
      transmission: 0.3,
      thickness: 7.2,
      ior: 1.74,
      dispersion: 0.14,
      attenuationColor: 0xff55aa,
      attenuationDistance: 8.5,
      specularIntensity: 1,
      specularColor: 0xffffff,
      iridescence: 0.055,
      iridescenceIOR: 1.28,
      iridescenceThicknessRange: [90, 240],
      envMap: environmentMap ?? null,
      envMapIntensity: 1.65,
      vertexColors: false,
      flatShading: false,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    const solidHeart = new THREE.Mesh(heartGeometry, diamondMaterial);
    solidHeart.name = "Cuerpo redondo de cristal rosa";
    solidHeart.userData.interaction = { kind: "heart" };
    solidHeart.renderOrder = 2;
    group.add(solidHeart);

    const innerGlow = new THREE.Mesh(
      heartGeometry.clone(),
      new THREE.MeshBasicMaterial({
        color: 0xff2f98,
        transparent: true,
        opacity: 0.13,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    innerGlow.name = "Luz interior del cristal";
    innerGlow.scale.setScalar(0.87);
    group.add(innerGlow);

    const surfaceSampler = new MeshSurfaceSampler(
      new THREE.Mesh(heartGeometry),
    ).build();
    const samplePosition = new THREE.Vector3();
    const sampleNormal = new THREE.Vector3();
    const instanceMatrix = new THREE.Matrix4();
    const instanceQuaternion = new THREE.Quaternion();
    const instanceTwist = new THREE.Quaternion();
    const instanceScale = new THREE.Vector3();
    const instanceColor = new THREE.Color();
    const crystalUp = new THREE.Vector3(0, 1, 0);

    const shellCrystalCount = Math.max(170, Math.floor(crystalCount * 0.72));
    const crystalCloud = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0xff3b9f,
        emissiveIntensity: 0.9,
        roughness: 0.035,
        metalness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        transmission: 0.16,
        ior: 1.68,
        vertexColors: true,
        transparent: true,
        opacity: 0.84,
        depthWrite: false,
      }),
      shellCrystalCount,
    );
    crystalCloud.name = "Microcristales de la superficie";
    crystalCloud.userData.interaction = { kind: "heart" };
    for (let index = 0; index < shellCrystalCount; index += 1) {
      surfaceSampler.sample(samplePosition, sampleNormal);
      sampleNormal.normalize();
      samplePosition.addScaledVector(sampleNormal, 0.055 + random() * 0.11);
      instanceQuaternion.setFromUnitVectors(crystalUp, sampleNormal);
      instanceTwist.setFromAxisAngle(sampleNormal, random() * TAU);
      instanceQuaternion.multiply(instanceTwist);
      const crystalScale = 0.52 + random() * 1.18;
      instanceScale.set(
        crystalScale * (0.62 + random() * 0.36),
        crystalScale,
        crystalScale * (0.62 + random() * 0.36),
      );
      instanceMatrix.compose(samplePosition, instanceQuaternion, instanceScale);
      crystalCloud.setMatrixAt(index, instanceMatrix);
      instanceColor.set(
        index % 8 === 0 ? "#ffffff" : index % 3 === 0 ? "#ffc7e5" : "#ff69b4",
      );
      crystalCloud.setColorAt(index, instanceColor);
    }
    crystalCloud.instanceMatrix.needsUpdate = true;
    crystalCloud.instanceColor!.needsUpdate = true;
    crystalCloud.computeBoundingSphere();
    group.add(crystalCloud);

    const surfaceParticleCount = Math.max(680, Math.floor(crystalCount * 1.65));
    const surfaceParticlePositions = new Float32Array(surfaceParticleCount * 3);
    const surfaceParticleColors = new Float32Array(surfaceParticleCount * 3);
    for (let index = 0; index < surfaceParticleCount; index += 1) {
      surfaceSampler.sample(samplePosition, sampleNormal);
      sampleNormal.normalize();
      samplePosition.addScaledVector(sampleNormal, 0.11 + random() * 0.24);
      surfaceParticlePositions[index * 3] = samplePosition.x;
      surfaceParticlePositions[index * 3 + 1] = samplePosition.y;
      surfaceParticlePositions[index * 3 + 2] = samplePosition.z;
      instanceColor.set(
        index % 11 === 0 ? "#ffffff" : index % 4 === 0 ? "#ffd0e8" : "#ff4fa8",
      );
      surfaceParticleColors[index * 3] = instanceColor.r;
      surfaceParticleColors[index * 3 + 1] = instanceColor.g;
      surfaceParticleColors[index * 3 + 2] = instanceColor.b;
    }
    const surfaceParticleGeometry = new THREE.BufferGeometry();
    surfaceParticleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(surfaceParticlePositions, 3),
    );
    surfaceParticleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(surfaceParticleColors, 3),
    );
    const surfaceParticles = new THREE.Points(
      surfaceParticleGeometry,
      new THREE.PointsMaterial({
        size: 0.17,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.74,
        alphaTest: 0.018,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    surfaceParticles.name = "Partículas luminosas exteriores";
    group.add(surfaceParticles);

    const innerParticleCount = Math.max(480, Math.floor(crystalCount * 1.12));
    const innerParticlePositions = new Float32Array(innerParticleCount * 3);
    const innerParticleColors = new Float32Array(innerParticleCount * 3);
    for (let index = 0; index < innerParticleCount; index += 1) {
      surfaceSampler.sample(samplePosition);
      const inwardScale = 0.12 + Math.pow(random(), 0.55) * 0.78;
      samplePosition.multiplyScalar(inwardScale);
      innerParticlePositions[index * 3] = samplePosition.x;
      innerParticlePositions[index * 3 + 1] = samplePosition.y;
      innerParticlePositions[index * 3 + 2] = samplePosition.z;
      instanceColor.set(
        index % 13 === 0 ? "#ffffff" : index % 3 === 0 ? "#ffb8dc" : "#ff3f9f",
      );
      innerParticleColors[index * 3] = instanceColor.r;
      innerParticleColors[index * 3 + 1] = instanceColor.g;
      innerParticleColors[index * 3 + 2] = instanceColor.b;
    }
    const innerParticleGeometry = new THREE.BufferGeometry();
    innerParticleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(innerParticlePositions, 3),
    );
    innerParticleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(innerParticleColors, 3),
    );
    const innerParticles = new THREE.Points(
      innerParticleGeometry,
      new THREE.PointsMaterial({
        size: 0.135,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.52,
        alphaTest: 0.015,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    innerParticles.name = "Universo de partículas dentro del corazón";
    innerParticles.renderOrder = 4;
    group.add(innerParticles);

    const glintTexture = createDiamondGlintTexture();
    const glintDefinitions = [
      {
        position: [-4.85, 4.45, 6.52] as const,
        scale: 2.25,
        color: 0xffffff,
        phase: 0.1,
      },
      {
        position: [4.75, 4.25, 6.52] as const,
        scale: 2.1,
        color: 0xffd1e9,
        phase: 1.8,
      },
      {
        position: [0, -6.65, 6.48] as const,
        scale: 1.55,
        color: 0xffe3f2,
        phase: 3.2,
      },
      {
        position: [-6.25, 0.7, 6.42] as const,
        scale: 1.2,
        color: 0xffc4e2,
        phase: 4.1,
      },
      {
        position: [6.18, 0.35, 6.42] as const,
        scale: 1.25,
        color: 0xffc8e4,
        phase: 5.25,
      },
      {
        position: [0, 5.05, 6.56] as const,
        scale: 1.05,
        color: 0xffffff,
        phase: 2.45,
      },
    ];
    const glints = glintDefinitions.map((definition) => {
      const glint = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glintTexture,
          color: definition.color,
          transparent: true,
          opacity: 0.5,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      glint.position.set(
        definition.position[0],
        definition.position[1],
        definition.position[2],
      );
      glint.scale.setScalar(definition.scale);
      glint.userData.baseScale = definition.scale;
      glint.userData.phase = definition.phase;
      glint.renderOrder = 8;
      group.add(glint);
      return glint;
    });

    const orbitals = new THREE.Group();
    orbitals.name = "Órbitas del diamante";
    const orbitalPalette = [0xff59ad, 0xffffff, 0xffb9dc, 0xf0dfff];
    for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
      const ringCount = 164;
      const positions = new Float32Array(ringCount * 3);
      const radiusX = 10.8 + ringIndex * 1.45;
      const radiusY = 6.5 + ringIndex * 0.82;
      for (let index = 0; index < ringCount; index += 1) {
        const angle = (index / ringCount) * TAU;
        const shimmer = 1 + (random() - 0.5) * 0.018;
        positions[index * 3] = Math.cos(angle) * radiusX * shimmer;
        positions[index * 3 + 1] = Math.sin(angle) * radiusY * shimmer;
        positions[index * 3 + 2] =
          Math.sin(angle * 2 + ringIndex * 0.7) * (0.8 + ringIndex * 0.35);
      }
      const ringGeometry = new THREE.BufferGeometry();
      ringGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const ring = new THREE.Points(
        ringGeometry,
        new THREE.PointsMaterial({
          color: orbitalPalette[ringIndex],
          size: 0.14 + ringIndex * 0.018,
          map: glowTexture,
          transparent: true,
          opacity: 0.42 - ringIndex * 0.055,
          alphaTest: 0.015,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      ring.rotation.x = 0.22 + ringIndex * 0.54;
      ring.rotation.y = 0.14 + ringIndex * 0.43;
      orbitals.add(ring);
    }
    group.add(orbitals);

    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff5cac,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    aura.scale.set(27, 27, 1);
    aura.renderOrder = -1;
    group.add(aura);

    const whiteFire = new THREE.PointLight(0xf4fbff, 82, 52, 1.65);
    whiteFire.position.set(-4.5, 5.8, 11);
    group.add(whiteFire);
    const pearlFire = new THREE.PointLight(0xffd9ee, 38, 38, 1.8);
    pearlFire.position.set(-7, -2.5, 8);
    group.add(pearlFire);
    const roseFire = new THREE.PointLight(0xff70ba, 34, 36, 1.8);
    roseFire.position.set(7, -1, 7);
    group.add(roseFire);

    return {
      group,
      crystalCloud,
      orbitals,
      clickable: [solidHeart, crystalCloud],
      aura,
      glints,
    };
  }

  const group = new THREE.Group();
  group.name = "Corazón volumétrico de cristal";
  group.position.set(0, 13.2, 0);

  const heartGeometry = createVolumetricHeartGeometry(resolution);
  const solidMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0x681044,
    emissiveIntensity: 1.08,
    roughness: 0.055,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transmission: 0.08,
    thickness: 1.35,
    ior: 1.58,
    vertexColors: true,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  solidMaterial.forceSinglePass = true;
  const solidHeart = new THREE.Mesh(heartGeometry, solidMaterial);
  solidHeart.userData.interaction = { kind: "heart" };
  group.add(solidHeart);

  const innerHeart = new THREE.Mesh(
    heartGeometry.clone(),
    new THREE.MeshPhysicalMaterial({
      color: 0x32126e,
      emissive: 0x5e42d9,
      emissiveIntensity: 0.9,
      roughness: 0.22,
      metalness: 0.18,
      flatShading: true,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    }),
  );
  innerHeart.scale.setScalar(0.87);
  group.add(innerHeart);

  const surfaceCrystalCount = Math.max(72, Math.floor(crystalCount * 0.28));
  const crystalGeometry = new THREE.OctahedronGeometry(0.16, 0);
  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xff3d9c,
    emissiveIntensity: 1.6,
    roughness: 0.05,
    metalness: 0.32,
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
  });
  const crystalCloud = new THREE.InstancedMesh(
    crystalGeometry,
    crystalMaterial,
    surfaceCrystalCount,
  );
  crystalCloud.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  crystalCloud.userData.interaction = { kind: "heart" };

  const sampler = new MeshSurfaceSampler(new THREE.Mesh(heartGeometry)).build();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();

  for (let index = 0; index < surfaceCrystalCount; index += 1) {
    sampler.sample(position, normal);
    normal.normalize();
    position.addScaledVector(normal, 0.08 + random() * 0.12);
    quaternion.setFromUnitVectors(up, normal);
    twist.setFromAxisAngle(normal, random() * TAU);
    quaternion.premultiply(twist);
    const particleScale = 0.24 + random() * 0.52;
    scale.set(
      particleScale * (0.76 + random() * 0.5),
      particleScale,
      particleScale * (0.76 + random() * 0.5),
    );
    matrix.compose(position, quaternion, scale);
    crystalCloud.setMatrixAt(index, matrix);
    color
      .set(
        index % 7 === 0 ? "#ffffff" : index % 3 === 0 ? "#ff72bf" : "#a678ff",
      )
      .offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.11);
    crystalCloud.setColorAt(index, color);
  }
  crystalCloud.instanceMatrix.needsUpdate = true;
  crystalCloud.instanceColor!.needsUpdate = true;
  crystalCloud.computeBoundingSphere();
  group.add(crystalCloud);

  const silhouetteCount = Math.max(220, Math.floor(crystalCount * 0.4));
  const silhouettePositions = new Float32Array(silhouetteCount * 3);
  const silhouetteColors = new Float32Array(silhouetteCount * 3);
  const silhouetteColor = new THREE.Color();
  for (let index = 0; index < silhouetteCount; index += 1) {
    const half = silhouetteCount / 2;
    const onRightSide = index < half;
    const sideProgress = onRightSide
      ? index / Math.max(1, half - 1)
      : 1 - (index - half) / Math.max(1, half - 1);
    const profilePoint = sampleHeartProfile(
      THREE.MathUtils.clamp(sideProgress, 0, 1),
    );
    const scatter = index % 5 === 0 ? 0.11 : 0.045;
    silhouettePositions[index * 3] =
      profilePoint.x * (onRightSide ? 1 : -1) + (random() - 0.5) * scatter;
    silhouettePositions[index * 3 + 1] =
      profilePoint.y + (random() - 0.5) * scatter;
    silhouettePositions[index * 3 + 2] = (random() - 0.5) * 0.14;
    silhouetteColor
      .set(
        index % 7 === 0 ? "#ffffff" : index % 2 === 0 ? "#ff7ac4" : "#d79bff",
      )
      .offsetHSL(0, 0, (random() - 0.5) * 0.08);
    silhouetteColors[index * 3] = silhouetteColor.r;
    silhouetteColors[index * 3 + 1] = silhouetteColor.g;
    silhouetteColors[index * 3 + 2] = silhouetteColor.b;
  }
  const silhouetteGeometry = new THREE.BufferGeometry();
  silhouetteGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(silhouettePositions, 3),
  );
  silhouetteGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(silhouetteColors, 3),
  );
  const outlineParticles = new THREE.Points(
    silhouetteGeometry,
    new THREE.PointsMaterial({
      size: 0.24,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      alphaTest: 0.02,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  outlineParticles.renderOrder = 8;

  const faceShape = createHeartShape();
  const rimCurve = new THREE.CatmullRomCurve3(
    faceShape
      .getSpacedPoints(resolution >= 46 ? 150 : 110)
      .map((point) => new THREE.Vector3(point.x, point.y, 2.72)),
    true,
    "centripetal",
    0.45,
  );
  const crystalRim = new THREE.Mesh(
    new THREE.TubeGeometry(
      rimCurve,
      resolution >= 46 ? 150 : 110,
      0.055,
      5,
      true,
    ),
    new THREE.MeshBasicMaterial({
      color: 0xffe3f4,
      transparent: true,
      opacity: 0.78,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  crystalRim.name = "Borde luminoso del corazón";
  crystalRim.renderOrder = 10;

  const sourceFaceGeometry = new THREE.ShapeGeometry(faceShape, 24);
  const faceGeometry = sourceFaceGeometry.index
    ? sourceFaceGeometry.toNonIndexed()
    : sourceFaceGeometry;
  if (faceGeometry !== sourceFaceGeometry) sourceFaceGeometry.dispose();
  faceGeometry.computeVertexNormals();
  applyCrystalFacetColors(faceGeometry);

  const innerGalaxyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      float hash21(vec2 point) {
        point = fract(point * vec2(123.34, 456.21));
        point += dot(point, point + 45.32);
        return fract(point.x * point.y);
      }

      void main() {
        vec2 point = vUv - 0.5;
        point.x *= 1.03;
        point.y *= 1.12;

        float radius = length(point);
        float angle = atan(point.y, point.x);
        float motion = uTime * 0.2;
        float disk = 1.0 - smoothstep(0.08, 0.69, radius);
        float core = exp(-radius * 8.4);

        float armA = 0.5 + 0.5 * cos(
          angle * 3.0 - radius * 31.0 + motion
        );
        armA = pow(armA, 5.0) * disk;
        float armB = 0.5 + 0.5 * cos(
          angle * 4.0 - radius * 25.0 - motion * 0.82 + 1.8
        );
        armB = pow(armB, 7.0) * disk;
        float aurora = 0.5 + 0.5 * sin(
          angle * 7.0 + radius * 37.0 - motion * 1.4
        );
        aurora = pow(aurora, 3.0) *
          (1.0 - smoothstep(0.12, 0.64, radius));

        vec3 midnight = vec3(0.018, 0.025, 0.12);
        vec3 magenta = vec3(1.0, 0.12, 0.56);
        vec3 violet = vec3(0.5, 0.2, 1.0);
        vec3 cyan = vec3(0.1, 0.82, 1.0);
        vec3 pearl = vec3(1.0, 0.78, 0.52);
        vec3 color = midnight * (0.82 + disk * 0.55);
        color += magenta * armA * (0.6 + core * 1.4);
        color += cyan * armB * 0.72;
        color += violet * aurora * 0.58;
        color += pearl * core * 1.75;

        float prism = 0.5 + 0.5 * sin(
          point.x * 39.0 + point.y * 27.0 + sin(angle * 5.0) * 2.2
        );
        color += mix(violet, cyan, prism) * prism * disk * 0.08;

        vec2 starGrid = vUv * 44.0;
        vec2 starCell = floor(starGrid);
        vec2 starPoint = fract(starGrid) - 0.5;
        float starSeed = hash21(starCell);
        float star = step(0.965, starSeed) *
          (1.0 - smoothstep(0.015, 0.13, length(starPoint)));
        color += vec3(1.0, 0.9, 1.0) * star * 2.2;

        float vignette = 1.0 - smoothstep(0.24, 0.74, radius);
        gl_FragColor = vec4(color, vignette * 0.9);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const innerGalaxy = new THREE.Mesh(faceGeometry.clone(), innerGalaxyMaterial);
  innerGalaxy.name = "Galaxia viva dentro del corazón";
  innerGalaxy.position.set(0, -0.18, 2.76);
  innerGalaxy.scale.set(0.63, 0.63, 1);
  innerGalaxy.renderOrder = 8;

  const faceSampler = new MeshSurfaceSampler(
    new THREE.Mesh(faceGeometry),
  ).build();

  const ornamentGroup = new THREE.Group();
  ornamentGroup.name = "Filigrana celeste del corazón";

  const addOrnamentCurve = (
    points: Array<[number, number]>,
    ornamentColor: number,
    opacity = 0.72,
  ) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y]) => new THREE.Vector3(x, y, 2.84)),
      false,
      "centripetal",
      0.42,
    );
    const ornament = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 42, 0.038, 4, false),
      new THREE.MeshBasicMaterial({
        color: ornamentColor,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    ornament.renderOrder = 10;
    ornamentGroup.add(ornament);
  };

  for (const side of [-1, 1]) {
    addOrnamentCurve(
      [
        [side * 0.65, 5.32],
        [side * 1.8, 6.1],
        [side * 3.55, 6.35],
        [side * 5.02, 5.18],
        [side * 5.65, 3.72],
      ],
      0xffd7a3,
      0.78,
    );
    addOrnamentCurve(
      [
        [side * 5.58, 3.42],
        [side * 6.22, 2.05],
        [side * 6.12, 0.4],
        [side * 5.55, -1.35],
        [side * 4.65, -3.02],
      ],
      side < 0 ? 0x9be8ff : 0xffa8dc,
      0.68,
    );
    addOrnamentCurve(
      [
        [side * 4.48, -3.2],
        [side * 3.82, -4.35],
        [side * 2.65, -5.25],
        [side * 1.12, -5.88],
      ],
      0xffd8aa,
      0.72,
    );
    addOrnamentCurve(
      [
        [side * 5.18, 2.3],
        [side * 4.55, 1.82],
        [side * 4.66, 1.02],
        [side * 5.28, 1.28],
      ],
      side < 0 ? 0xff8bd2 : 0x86ddff,
      0.62,
    );
  }

  const innerRimCurve = new THREE.CatmullRomCurve3(
    faceShape
      .getSpacedPoints(resolution >= 46 ? 120 : 92)
      .map(
        (point) =>
          new THREE.Vector3(point.x * 0.655, point.y * 0.655 - 0.18, 2.85),
      ),
    true,
    "centripetal",
    0.45,
  );
  const innerRim = new THREE.Mesh(
    new THREE.TubeGeometry(
      innerRimCurve,
      resolution >= 46 ? 120 : 92,
      0.075,
      5,
      true,
    ),
    new THREE.MeshPhysicalMaterial({
      color: 0xdffaff,
      emissive: 0xff3f9d,
      emissiveIntensity: 2.1,
      roughness: 0.06,
      metalness: 0.24,
      clearcoat: 1,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
    }),
  );
  innerRim.name = "Marco iridiscente de la galaxia";
  innerRim.renderOrder = 11;
  ornamentGroup.add(innerRim);

  const innerFacetPoints = faceShape
    .getSpacedPoints(resolution >= 46 ? 46 : 34)
    .map(
      (point) =>
        new THREE.Vector3(point.x * 0.655, point.y * 0.655 - 0.18, 2.91),
    );
  const innerFacetGeometry = new THREE.OctahedronGeometry(0.14, 0);
  const innerFacetMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x7a2f8f,
    emissiveIntensity: 1.7,
    roughness: 0.08,
    metalness: 0.38,
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
    depthTest: false,
    depthWrite: false,
  });
  const innerFacets = new THREE.InstancedMesh(
    innerFacetGeometry,
    innerFacetMaterial,
    innerFacetPoints.length,
  );
  const ornamentMatrix = new THREE.Matrix4();
  const ornamentQuaternion = new THREE.Quaternion();
  const ornamentEuler = new THREE.Euler();
  const ornamentScale = new THREE.Vector3();
  const ornamentColor = new THREE.Color();
  const innerFacetPalette = [
    "#ff68b9",
    "#8de8ff",
    "#c294ff",
    "#ffe2a8",
    "#f7f5ff",
  ];
  innerFacetPoints.forEach((facetPosition, index) => {
    ornamentEuler.set(index * 0.19, index * 0.27, index * 0.41);
    ornamentQuaternion.setFromEuler(ornamentEuler);
    const facetScale = 0.72 + (index % 4) * 0.12;
    ornamentScale.set(facetScale, facetScale * 1.15, facetScale * 0.72);
    ornamentMatrix.compose(facetPosition, ornamentQuaternion, ornamentScale);
    innerFacets.setMatrixAt(index, ornamentMatrix);
    ornamentColor.set(innerFacetPalette[index % innerFacetPalette.length]);
    innerFacets.setColorAt(index, ornamentColor);
  });
  innerFacets.instanceMatrix.needsUpdate = true;
  innerFacets.instanceColor!.needsUpdate = true;
  innerFacets.computeBoundingSphere();
  innerFacets.frustumCulled = false;
  innerFacets.renderOrder = 12;
  ornamentGroup.add(innerFacets);

  const gemPositions: Array<[number, number]> = [
    [0, 5.55],
    [0, -5.92],
    [-5.35, 3.1],
    [5.35, 3.1],
    [-5.85, 0.1],
    [5.85, 0.1],
    [-4.55, -3.15],
    [4.55, -3.15],
    [-2.85, 5.72],
    [2.85, 5.72],
  ];
  const gemGeometry = new THREE.OctahedronGeometry(0.25, 0);
  const gemMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x5e1a62,
    emissiveIntensity: 2.25,
    roughness: 0.05,
    metalness: 0.42,
    vertexColors: true,
    transparent: true,
    opacity: 0.94,
    depthTest: false,
    depthWrite: false,
  });
  const gems = new THREE.InstancedMesh(
    gemGeometry,
    gemMaterial,
    gemPositions.length,
  );
  const gemPalette = ["#dffaff", "#ff9dd8", "#91e9ff", "#ffd59a", "#bd92ff"];
  gemPositions.forEach(([x, y], index) => {
    ornamentEuler.set(
      index * 0.17,
      index * 0.11,
      Math.PI * 0.25 + index * 0.09,
    );
    ornamentQuaternion.setFromEuler(ornamentEuler);
    const gemScale = index < 2 ? 1.28 : 0.88 + (index % 3) * 0.1;
    ornamentScale.set(gemScale * 0.74, gemScale * 1.35, gemScale * 0.48);
    ornamentMatrix.compose(
      new THREE.Vector3(x, y, 2.94),
      ornamentQuaternion,
      ornamentScale,
    );
    gems.setMatrixAt(index, ornamentMatrix);
    ornamentColor.set(gemPalette[index % gemPalette.length]);
    gems.setColorAt(index, ornamentColor);
  });
  gems.instanceMatrix.needsUpdate = true;
  gems.instanceColor!.needsUpdate = true;
  gems.computeBoundingSphere();
  gems.frustumCulled = false;
  gems.renderOrder = 13;
  ornamentGroup.add(gems);

  const gemGlowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffd9f0,
    transparent: true,
    opacity: 0.36,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  gemPositions.forEach(([x, y], index) => {
    const gemGlow = new THREE.Sprite(gemGlowMaterial);
    const glowScale = index < 2 ? 1.35 : 0.72;
    gemGlow.position.set(x, y, 2.86);
    gemGlow.scale.set(glowScale, glowScale, 1);
    gemGlow.renderOrder = 9;
    ornamentGroup.add(gemGlow);
  });

  const faceCrystalCount = Math.max(82, Math.floor(crystalCount * 0.17));
  const faceCrystalGeometry = new THREE.OctahedronGeometry(0.17, 0);
  const faceCrystalMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0.54,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const faceCrystals = new THREE.InstancedMesh(
    faceCrystalGeometry,
    faceCrystalMaterial,
    faceCrystalCount,
  );
  faceCrystals.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  faceCrystals.userData.interaction = { kind: "heart" };
  const faceEuler = new THREE.Euler();
  for (let index = 0; index < faceCrystalCount; index += 1) {
    faceSampler.sample(position);
    position.z = (random() - 0.5) * 0.34 + 2.7;
    faceEuler.set(random() * TAU, random() * TAU, random() * TAU);
    quaternion.setFromEuler(faceEuler);
    const crystalScale = 0.22 + random() * 0.5;
    scale.set(
      crystalScale * (0.65 + random() * 0.55),
      crystalScale,
      crystalScale * (0.65 + random() * 0.55),
    );
    matrix.compose(position, quaternion, scale);
    faceCrystals.setMatrixAt(index, matrix);
    color
      .set(
        index % 9 === 0 ? "#ffffff" : index % 3 === 0 ? "#ff5eae" : "#cf8cff",
      )
      .offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.1);
    faceCrystals.setColorAt(index, color);
  }
  faceCrystals.instanceMatrix.needsUpdate = true;
  faceCrystals.instanceColor!.needsUpdate = true;
  faceCrystals.computeBoundingSphere();
  faceCrystals.renderOrder = 9;

  const faceShell = new THREE.Mesh(
    faceGeometry.clone(),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.075,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  faceShell.renderOrder = 6;

  const fillCount = Math.max(86, Math.floor(crystalCount * 0.14));
  const fillPositions = new Float32Array(fillCount * 3);
  const fillPosition = new THREE.Vector3();
  for (let index = 0; index < fillCount; index += 1) {
    faceSampler.sample(fillPosition);
    fillPositions[index * 3] = fillPosition.x + (random() - 0.5) * 0.08;
    fillPositions[index * 3 + 1] = fillPosition.y + (random() - 0.5) * 0.08;
    fillPositions[index * 3 + 2] = (random() - 0.5) * 0.22;
  }
  faceGeometry.dispose();
  const fillGeometry = new THREE.BufferGeometry();
  fillGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(fillPositions, 3),
  );
  const fillParticles = new THREE.Points(
    fillGeometry,
    new THREE.PointsMaterial({
      color: 0xff8bcc,
      size: 0.11,
      map: glowTexture,
      transparent: true,
      opacity: 0.13,
      alphaTest: 0.02,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  fillParticles.renderOrder = 7;

  const facingParticles = new THREE.Group();
  facingParticles.name = "Silueta cristalina omnidireccional";
  facingParticles.add(
    innerGalaxy,
    ornamentGroup,
    crystalRim,
    faceShell,
    fillParticles,
    outlineParticles,
    faceCrystals,
  );
  facingParticles.scale.setScalar(1.015);
  group.add(facingParticles);

  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff268e,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  aura.scale.set(31, 31, 1);
  group.add(aura);

  const orbitals = new THREE.Group();
  const orbitalPalette = ["#ff7ac6", "#a875ff", "#63d5ff", "#ffd8ed"];
  for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
    const ringCount = 190;
    const positions = new Float32Array(ringCount * 3);
    for (let index = 0; index < ringCount; index += 1) {
      const angle = (index / ringCount) * TAU;
      const radius =
        9.3 + ringIndex * 1.65 + Math.sin(index * 2.7 + ringIndex) * 0.16;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle) * radius * 0.33;
      positions[index * 3 + 2] = Math.sin(angle * 2 + ringIndex) * 0.5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: orbitalPalette[ringIndex],
        size: 0.24,
        map: glowTexture,
        transparent: true,
        opacity: 0.74 - ringIndex * 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    points.rotation.x = 0.2 + ringIndex * 0.62;
    points.rotation.y = 0.18 + ringIndex * 0.51;
    orbitals.add(points);
  }
  group.add(orbitals);

  const crownLight = new THREE.PointLight(0xff3d9c, 88, 48, 1.8);
  crownLight.position.set(0, 1, 4);
  group.add(crownLight);

  return {
    group,
    crystalCloud,
    faceCrystals,
    orbitals,
    clickable: [solidHeart, crystalCloud, faceCrystals],
    aura,
    facingParticles,
    innerGalaxyMaterial,
  };
}

export function createGiftObject(definition: GiftDefinition): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...definition.position);
  group.userData.interaction = { kind: "gift", id: definition.id };
  group.userData.giftId = definition.id;
  group.userData.basePosition = new THREE.Vector3(...definition.position);
  group.userData.floatOffset = definition.position[0] * 0.17;
  group.userData.openProgress = 0;
  group.userData.openTarget = 0;

  const boxMaterial = new THREE.MeshPhysicalMaterial({
    color: definition.color,
    emissive: definition.color,
    emissiveIntensity: 0.48,
    roughness: 0.18,
    metalness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const ribbonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffe8c8,
    emissive: 0x8a5124,
    emissiveIntensity: 0.3,
    roughness: 0.14,
    metalness: 0.75,
  });

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.5, 1.6, 2, 2, 2),
    boxMaterial,
  );
  base.position.y = -0.08;
  group.add(base);

  const baseRibbonParts = [
    new THREE.BoxGeometry(0.28, 1.52, 1.64),
    new THREE.BoxGeometry(1.84, 0.24, 1.64),
  ];
  baseRibbonParts[0].translate(0, -0.08, 0);
  baseRibbonParts[1].translate(0, 0.16, 0);
  const mergedBaseRibbon = mergeGeometries(baseRibbonParts, false);
  baseRibbonParts.forEach((geometry) => geometry.dispose());
  if (mergedBaseRibbon) {
    group.add(new THREE.Mesh(mergedBaseRibbon, ribbonMaterial));
  }

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.78, -0.92);
  group.add(lidPivot);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(2.04, 0.32, 1.84),
    boxMaterial,
  );
  lid.position.z = 0.92;
  lidPivot.add(lid);

  const lidRibbonParts: THREE.BufferGeometry[] = [
    new THREE.BoxGeometry(0.29, 0.35, 1.88),
    new THREE.BoxGeometry(2.08, 0.35, 0.28),
  ];
  lidRibbonParts[0].translate(0, 0.02, 0.92);
  lidRibbonParts[1].translate(0, 0.02, 0.92);
  const mergedLidRibbon = mergeGeometries(lidRibbonParts, false);
  lidRibbonParts.forEach((geometry) => geometry.dispose());
  if (mergedLidRibbon) {
    lidPivot.add(new THREE.Mesh(mergedLidRibbon, ribbonMaterial));
  }

  const bowParts: THREE.BufferGeometry[] = [];
  for (const direction of [-1, 1]) {
    const loop = new THREE.TorusGeometry(0.36, 0.09, 9, 32, Math.PI * 1.68);
    loop.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(direction * 0.3, 0.34, 0.92),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.PI / 2, direction * 0.45, direction * 0.35),
        ),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    bowParts.push(loop);
  }
  const knot = new THREE.SphereGeometry(0.2, 16, 12);
  knot.translate(0, 0.33, 0.92);
  bowParts.push(knot);
  const mergedBowGeometry = mergeGeometries(bowParts, false);
  bowParts.forEach((geometry) => geometry.dispose());
  if (mergedBowGeometry) {
    lidPivot.add(new THREE.Mesh(mergedBowGeometry, ribbonMaterial));
  }

  const contentRoot = new THREE.Group();
  contentRoot.position.y = 0.3;
  contentRoot.scale.setScalar(0.001);
  contentRoot.visible = false;
  group.add(contentRoot);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.36, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0xffeff9,
      emissive: definition.color,
      emissiveIntensity: 1.75,
      roughness: 0.08,
      metalness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    }),
  );
  crystal.position.y = 0.4;
  contentRoot.add(crystal);

  const stemGeometries: THREE.BufferGeometry[] = [];
  for (const x of [-0.43, 0, 0.43]) {
    const stem = new THREE.CylinderGeometry(0.025, 0.035, 0.62, 6);
    stem.translate(x, 0.04, 0);
    stem.rotateZ(x * -0.45);
    stemGeometries.push(stem);
  }
  const mergedStems = mergeGeometries(stemGeometries, false);
  stemGeometries.forEach((geometry) => geometry.dispose());
  if (mergedStems) {
    contentRoot.add(
      new THREE.Mesh(
        mergedStems,
        new THREE.MeshStandardMaterial({
          color: 0x58a76e,
          emissive: 0x173b24,
          emissiveIntensity: 0.24,
          roughness: 0.8,
        }),
      ),
    );
  }

  const petalCount = 15;
  const petals = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.11, 8, 6),
    new THREE.MeshPhysicalMaterial({
      color: 0xffb7dc,
      emissive: definition.color,
      emissiveIntensity: 0.62,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.7,
    }),
    petalCount,
  );
  const petalMatrix = new THREE.Matrix4();
  const petalPosition = new THREE.Vector3();
  const petalQuaternion = new THREE.Quaternion();
  const petalScale = new THREE.Vector3();
  let petalIndex = 0;
  for (const flowerX of [-0.43, 0, 0.43]) {
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * TAU;
      petalPosition.set(
        flowerX + Math.cos(angle) * 0.13,
        0.36 + Math.sin(angle) * 0.13,
        Math.sin(angle) * 0.06,
      );
      petalQuaternion.setFromEuler(new THREE.Euler(0, 0, angle));
      petalScale.set(1.1, 0.56, 0.72);
      petalMatrix.compose(petalPosition, petalQuaternion, petalScale);
      petals.setMatrixAt(petalIndex, petalMatrix);
      petalIndex += 1;
    }
  }
  petals.instanceMatrix.needsUpdate = true;
  contentRoot.add(petals);

  const contentAura = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 18, 12),
    new THREE.MeshBasicMaterial({
      color: definition.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    }),
  );
  contentAura.position.y = 0.3;
  contentRoot.add(contentAura);

  const beacon = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.025, 6, 72),
    new THREE.MeshBasicMaterial({
      color: definition.color,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  beacon.rotation.x = Math.PI / 2;
  beacon.position.y = -1.05;
  group.add(beacon);
  group.userData.beacon = beacon;
  group.userData.lidPivot = lidPivot;
  group.userData.contentRoot = contentRoot;
  group.userData.contentCrystal = crystal;
  group.userData.contentAura = contentAura;

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(2.05, 14, 10),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  hitArea.userData.interaction = { kind: "gift", id: definition.id };
  hitArea.visible = false;
  group.add(hitArea);
  return group;
}

function applyGiftOpenPose(gift: THREE.Group, progress: number) {
  const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
  const lidPivot = gift.userData.lidPivot as THREE.Group;
  const contentRoot = gift.userData.contentRoot as THREE.Group;
  const contentAura = gift.userData.contentAura as THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshBasicMaterial
  >;

  lidPivot.rotation.x = -1.34 * eased;
  lidPivot.rotation.z = 0.14 * eased;
  lidPivot.position.y = 0.78 + eased * 0.16;
  contentRoot.visible = progress > 0.01;
  contentRoot.position.y = 0.3 + eased * 0.76;
  contentRoot.scale.setScalar(Math.max(0.001, eased));
  contentAura.material.opacity = eased * 0.32;
}

export function setGiftObjectOpened(
  gift: THREE.Group,
  opened: boolean,
  immediate = false,
) {
  gift.userData.openTarget = opened ? 1 : 0;
  if (!immediate) return;
  gift.userData.openProgress = gift.userData.openTarget;
  applyGiftOpenPose(gift, gift.userData.openProgress as number);
}

export function updateGiftObject(
  gift: THREE.Group,
  elapsed: number,
  delta: number,
) {
  const current = gift.userData.openProgress as number;
  const target = gift.userData.openTarget as number;
  const next = THREE.MathUtils.damp(current, target, 5.5, delta);
  gift.userData.openProgress = next;
  applyGiftOpenPose(gift, next);

  const contentRoot = gift.userData.contentRoot as THREE.Group;
  const crystal = gift.userData.contentCrystal as THREE.Mesh;
  contentRoot.rotation.y = elapsed * 0.34;
  crystal.rotation.y = elapsed * 0.9;
  crystal.rotation.x = Math.sin(elapsed * 0.7) * 0.2;
}

function createPlanetTexture(
  definition: PlanetDefinition,
  random: () => number,
  size: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createLinearGradient(0, 0, 0, size);
  definition.colors.forEach((color, index) => {
    gradient.addColorStop(index / (definition.colors.length - 1), color);
  });
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  context.globalCompositeOperation = "screen";
  for (let band = 0; band < 55; band += 1) {
    const y = random() * size;
    const height = 1 + random() * size * 0.035;
    const amplitude = 2 + random() * 13;
    context.beginPath();
    context.moveTo(-20, y);
    for (let x = -20; x <= size + 20; x += 20) {
      context.lineTo(x, y + Math.sin(x * 0.025 + band * 1.7) * amplitude);
    }
    context.lineTo(size + 20, y + height + amplitude);
    context.lineTo(-20, y + height);
    context.closePath();
    context.fillStyle =
      band % 3 === 0
        ? `rgba(255,255,255,${0.018 + random() * 0.055})`
        : `rgba(118,130,255,${0.018 + random() * 0.045})`;
    context.fill();
  }

  context.globalCompositeOperation = "multiply";
  for (let storm = 0; storm < 18; storm += 1) {
    const x = random() * size;
    const y = random() * size;
    const width = size * (0.018 + random() * 0.07);
    const height = width * (0.22 + random() * 0.35);
    context.beginPath();
    context.ellipse(x, y, width, height, random() * 0.25, 0, TAU);
    context.fillStyle = `rgba(7,5,30,${0.05 + random() * 0.15})`;
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createCloudTexture(random: () => number, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  context.clearRect(0, 0, size, size);
  context.filter = `blur(${Math.max(1, size / 180)}px)`;

  for (let cloud = 0; cloud < 85; cloud += 1) {
    const x = random() * size;
    const y = random() * size;
    const width = size * (0.025 + random() * 0.11);
    const height = width * (0.12 + random() * 0.28);
    context.beginPath();
    context.ellipse(x, y, width, height, random() * 0.25, 0, TAU);
    context.fillStyle = `rgba(255,235,250,${0.025 + random() * 0.12})`;
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createAtmosphereMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: 0.8 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 2.5);
        gl_FragColor = vec4(glowColor, rim * intensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

export function createPlanetObjects(
  random: () => number,
  textureSize: number,
): THREE.Group[] {
  return PLANETS.map((definition, planetIndex) => {
    const group = new THREE.Group();
    group.position.set(...definition.position);
    group.rotation.z = definition.tilt;
    group.userData.spin = 0.07 + random() * 0.1;

    const planetTexture = createPlanetTexture(definition, random, textureSize);
    const cloudTexture = createCloudTexture(random, textureSize);
    const geometry = new THREE.SphereGeometry(definition.radius, 64, 40);
    const surface = new THREE.Mesh(
      geometry,
      new THREE.MeshPhysicalMaterial({
        map: planetTexture,
        bumpMap: planetTexture,
        bumpScale: definition.radius * 0.035,
        roughness: 0.68,
        metalness: 0.08,
        clearcoat: 0.18,
      }),
    );
    surface.rotation.y = random() * TAU;
    group.add(surface);

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.018, 56, 34),
      new THREE.MeshStandardMaterial({
        map: cloudTexture,
        alphaMap: cloudTexture,
        color: 0xffeef8,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        roughness: 0.9,
      }),
    );
    clouds.rotation.y = random() * TAU;
    group.add(clouds);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius * 1.09, 48, 30),
      createAtmosphereMaterial(definition.atmosphere),
    );
    group.add(atmosphere);

    const moonPivots: THREE.Group[] = [];
    for (let moonIndex = 0; moonIndex < definition.moons; moonIndex += 1) {
      const pivot = new THREE.Group();
      pivot.rotation.x = 0.18 + moonIndex * 0.25;
      pivot.userData.speed =
        (0.12 + moonIndex * 0.055 + random() * 0.05) *
        (moonIndex % 2 === 0 ? 1 : -1);
      const distance =
        definition.radius * (1.85 + moonIndex * 0.55 + random() * 0.25);
      const moonRadius = definition.radius * (0.13 + random() * 0.07);
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(moonRadius, 24, 16),
        new THREE.MeshStandardMaterial({
          color: planetIndex % 2 === 0 ? 0xb9c6df : 0xd5b9ca,
          roughness: 0.92,
          metalness: 0.02,
          bumpMap: planetTexture,
          bumpScale: moonRadius * 0.08,
        }),
      );
      moon.position.x = distance;
      pivot.add(moon);

      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(distance, 0.012, 4, 100),
        new THREE.MeshBasicMaterial({
          color: definition.atmosphere,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      );
      orbit.rotation.x = Math.PI / 2;
      pivot.add(orbit);
      group.add(pivot);
      moonPivots.push(pivot);
    }

    if (definition.ring) {
      const ringGroup = new THREE.Group();
      const bands = [
        { inner: 1.34, outer: 1.48, opacity: 0.2 },
        { inner: 1.52, outer: 1.72, opacity: 0.34 },
        { inner: 1.78, outer: 1.94, opacity: 0.16 },
        { inner: 1.99, outer: 2.15, opacity: 0.26 },
      ];
      bands.forEach((band, bandIndex) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(
            definition.radius * band.inner,
            definition.radius * band.outer,
            160,
          ),
          new THREE.MeshBasicMaterial({
            color: bandIndex % 2 === 0 ? definition.atmosphere : 0xffcce7,
            transparent: true,
            opacity: band.opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        ringGroup.add(ring);
      });
      ringGroup.rotation.set(Math.PI / 2 + 0.18, 0.2, 0.08);
      group.add(ringGroup);
      group.userData.ringGroup = ringGroup;
    }

    group.userData.surface = surface;
    group.userData.clouds = clouds;
    group.userData.moonPivots = moonPivots;
    return group;
  });
}

export function createNebulae(
  blueTexture: THREE.Texture,
  pinkTexture: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  const definitions = [
    {
      texture: blueTexture,
      position: [-42, 12, -34],
      scale: [86, 48],
      opacity: 0.15,
    },
    {
      texture: pinkTexture,
      position: [38, 9, -43],
      scale: [80, 46],
      opacity: 0.17,
    },
    {
      texture: blueTexture,
      position: [12, 32, 28],
      scale: [68, 42],
      opacity: 0.12,
    },
    {
      texture: pinkTexture,
      position: [-46, 24, 39],
      scale: [64, 39],
      opacity: 0.1,
    },
  ];
  definitions.forEach((definition) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: definition.texture,
        color: 0xffffff,
        transparent: true,
        opacity: definition.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sprite.position.set(...(definition.position as [number, number, number]));
    sprite.scale.set(definition.scale[0], definition.scale[1], 1);
    group.add(sprite);
  });
  return group;
}

export function findInteraction(object: THREE.Object3D | null) {
  let current = object;
  while (current) {
    if (current.userData.interaction) return current.userData.interaction;
    current = current.parent;
  }
  return null;
}

export function disposeObject(
  root: THREE.Object3D,
  protectedTextures: Set<THREE.Texture>,
) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];

    materials.forEach((material) => {
      const materialWithMaps = material as THREE.Material & {
        map?: THREE.Texture;
        alphaMap?: THREE.Texture;
        bumpMap?: THREE.Texture;
        emissiveMap?: THREE.Texture;
      };
      [
        materialWithMaps.map,
        materialWithMaps.alphaMap,
        materialWithMaps.bumpMap,
        materialWithMaps.emissiveMap,
      ]
        .filter((texture): texture is THREE.Texture => Boolean(texture))
        .forEach((texture) => {
          if (!protectedTextures.has(texture)) texture.dispose();
        });
      material.dispose();
    });
  });
}
