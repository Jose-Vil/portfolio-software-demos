import * as THREE from "three";

const TAU = Math.PI * 2;
const ORIGIN = new THREE.Vector3();

export type CosmosBackgroundQuality = "low" | "balanced" | "high";

export type DistantGalaxySymbol =
  | "cat"
  | "flower"
  | "star"
  | "heart"
  | "infinity"
  | "rings"
  | "rose"
  | "diamond"
  | "moon"
  | "none";

export interface CosmosBackgroundOptions {
  /**
   * `lowPower` is a convenient alias for mobile integrations. An explicit
   * `quality` value takes precedence.
   */
  lowPower?: boolean;
  quality?: CosmosBackgroundQuality;
  reducedMotion?: boolean;
  seed?: number;
}

export interface CosmosBackgroundRuntime {
  /** Add this group to the scene or to the universe root. */
  group: THREE.Group;
  /** Non-interactive distant galaxies, useful for toggling visibility. */
  distantGalaxies: THREE.Group;
  /** Procedural suns and luminous stellar landmarks. */
  stellarLandmarks: THREE.Group;
  /** Animated dual neutron-star system. */
  neutronBinary: THREE.Group;
  quality: CosmosBackgroundQuality;
  dispose: () => void;
}

type GalaxyAnimation = {
  disk: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  symbolLines: THREE.LineSegments;
  symbolStars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
};

type RomanticSkyAnimation = {
  nebulaMaterial: THREE.ShaderMaterial;
  constellationLines: THREE.LineSegments;
  constellationStars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
};

type NeutronBinaryAnimation = {
  starA: THREE.Group;
  starB: THREE.Group;
  magneticA: THREE.Group;
  magneticB: THREE.Group;
  coreA: THREE.Mesh;
  coreB: THREE.Mesh;
  orbitRadius: number;
  orbitHeight: number;
};

type InternalRuntime = {
  galaxyField: GalaxyAnimation;
  starMaterial: THREE.ShaderMaterial;
  starRays: THREE.LineSegments;
  romanticSky: RomanticSkyAnimation;
  binary: NeutronBinaryAnimation;
  reducedMotion: boolean;
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  disposed: boolean;
};

type QualityPreset = {
  galaxyCount: number;
  particlesPerGalaxy: number;
  sunCount: number;
  nebulaParticles: number;
  constellationCount: number;
};

type GalaxyMorphology =
  | "spiral"
  | "barred"
  | "ring"
  | "elliptical"
  | "heart"
  | "rose"
  | "dual";

type GalaxyDefinition = {
  position: [number, number, number];
  radius: number;
  symbol: DistantGalaxySymbol;
  morphology: GalaxyMorphology;
  colors: [number, number, number];
  tilt: number;
};

const QUALITY_PRESETS: Record<CosmosBackgroundQuality, QualityPreset> = {
  low: {
    galaxyCount: 40,
    particlesPerGalaxy: 28,
    sunCount: 6,
    nebulaParticles: 360,
    constellationCount: 3,
  },
  balanced: {
    galaxyCount: 40,
    particlesPerGalaxy: 64,
    sunCount: 9,
    nebulaParticles: 720,
    constellationCount: 6,
  },
  high: {
    galaxyCount: 40,
    particlesPerGalaxy: 104,
    sunCount: 12,
    nebulaParticles: 1180,
    constellationCount: 9,
  },
};

const GALAXY_DEFINITIONS: GalaxyDefinition[] = [
  {
    position: [-108, 92, -220],
    radius: 21,
    symbol: "cat",
    morphology: "spiral",
    colors: [0xff74c6, 0x9c71ff, 0x4da8ff],
    tilt: -0.38,
  },
  {
    position: [112, 86, -244],
    radius: 24,
    symbol: "flower",
    morphology: "rose",
    colors: [0xffa1d5, 0xb256ff, 0x596cff],
    tilt: 0.44,
  },
  {
    position: [-58, 142, -310],
    radius: 19,
    symbol: "heart",
    morphology: "heart",
    colors: [0xffb4db, 0xd85cff, 0x596dff],
    tilt: -0.18,
  },
  {
    position: [54, 154, -342],
    radius: 17,
    symbol: "infinity",
    morphology: "dual",
    colors: [0xc4f3ff, 0x8b7dff, 0xff6fca],
    tilt: 0.26,
  },
  {
    position: [-22, 94, -285],
    radius: 15,
    symbol: "rose",
    morphology: "rose",
    colors: [0xffabd3, 0xc95fff, 0x5f7cff],
    tilt: -0.24,
  },
  {
    position: [25, 112, -365],
    radius: 18,
    symbol: "rings",
    morphology: "ring",
    colors: [0xffe0b2, 0xff76bd, 0x7c6bff],
    tilt: 0.38,
  },
  {
    position: [-40, 124, -440],
    radius: 22,
    symbol: "flower",
    morphology: "spiral",
    colors: [0xb9efff, 0x6f95ff, 0xdb64ff],
    tilt: -0.42,
  },
  {
    position: [38, 88, -510],
    radius: 26,
    symbol: "star",
    morphology: "barred",
    colors: [0xffd9ed, 0xc55dff, 0x4f91ff],
    tilt: 0.16,
  },
  {
    position: [-174, 118, -330],
    radius: 18,
    symbol: "moon",
    morphology: "ring",
    colors: [0xe9f7ff, 0x7abfff, 0xc270ff],
    tilt: 0.52,
  },
  {
    position: [178, 126, -350],
    radius: 20,
    symbol: "diamond",
    morphology: "elliptical",
    colors: [0xfff0cf, 0xff80c7, 0x8668ff],
    tilt: -0.46,
  },
  {
    position: [-232, 136, -35],
    radius: 26,
    symbol: "heart",
    morphology: "heart",
    colors: [0xffd3a0, 0xff799f, 0x9a65ff],
    tilt: 0.18,
  },
  {
    position: [228, 178, 42],
    radius: 30,
    symbol: "rings",
    morphology: "ring",
    colors: [0x9ceeff, 0x6a8cff, 0xd36cff],
    tilt: -0.54,
  },
  {
    position: [-175, 88, 196],
    radius: 27,
    symbol: "star",
    morphology: "barred",
    colors: [0xf8b7ff, 0x826cff, 0x3c7cff],
    tilt: 0.72,
  },
  {
    position: [176, 96, 212],
    radius: 28,
    symbol: "infinity",
    morphology: "dual",
    colors: [0xffae79, 0xf25fb9, 0x764cff],
    tilt: -0.22,
  },
  {
    position: [-38, 166, 282],
    radius: 22,
    symbol: "flower",
    morphology: "elliptical",
    colors: [0xa2e2ff, 0x648dff, 0x935cff],
    tilt: 0.46,
  },
  {
    position: [260, 144, -118],
    radius: 20,
    symbol: "heart",
    morphology: "spiral",
    colors: [0xffe29b, 0xff82bd, 0x9b6cff],
    tilt: -0.64,
  },
  {
    position: [-258, 138, -112],
    radius: 28,
    symbol: "rose",
    morphology: "rose",
    colors: [0xff88c8, 0xee55a8, 0x784fff],
    tilt: 0.28,
  },
  {
    position: [286, 126, 94],
    radius: 25,
    symbol: "cat",
    morphology: "spiral",
    colors: [0xa8e9ff, 0x7c8cff, 0xe276ff],
    tilt: -0.36,
  },
  {
    position: [-294, 98, 96],
    radius: 31,
    symbol: "rings",
    morphology: "ring",
    colors: [0xffd2a5, 0xff7db6, 0x8a64ff],
    tilt: 0.58,
  },
  {
    position: [116, 160, 286],
    radius: 29,
    symbol: "star",
    morphology: "barred",
    colors: [0xc0f4ff, 0x6ca7ff, 0x9a5cff],
    tilt: -0.48,
  },
  {
    position: [-45, 105, -188],
    radius: 15,
    symbol: "diamond",
    morphology: "elliptical",
    colors: [0xffffff, 0xffa3dc, 0xaa78ff],
    tilt: 0.12,
  },
  {
    position: [210, 120, -48],
    radius: 16,
    symbol: "infinity",
    morphology: "dual",
    colors: [0xffcfec, 0xd180ff, 0x607cff],
    tilt: -0.18,
  },
  {
    position: [-216, 208, 246],
    radius: 34,
    symbol: "heart",
    morphology: "heart",
    colors: [0xff8cbf, 0xd94eff, 0x6652ff],
    tilt: 0.35,
  },
  {
    position: [224, 216, 242],
    radius: 33,
    symbol: "rose",
    morphology: "rose",
    colors: [0xffc0dd, 0xff5f98, 0x8c61ff],
    tilt: -0.32,
  },
  {
    position: [2, 250, 320],
    radius: 38,
    symbol: "moon",
    morphology: "ring",
    colors: [0xe3f5ff, 0x8abfff, 0xac79ff],
    tilt: 0.68,
  },
  {
    position: [-332, 165, 20],
    radius: 36,
    symbol: "none",
    morphology: "elliptical",
    colors: [0x8fe8ff, 0x687eff, 0xc85cff],
    tilt: -0.56,
  },
  {
    position: [334, 170, -24],
    radius: 35,
    symbol: "flower",
    morphology: "spiral",
    colors: [0xffe0b1, 0xff7fcf, 0x765eff],
    tilt: 0.42,
  },
  {
    position: [-198, 232, -320],
    radius: 39,
    symbol: "infinity",
    morphology: "dual",
    colors: [0xffa8d2, 0xb56bff, 0x579cff],
    tilt: -0.2,
  },
  {
    position: [205, 236, -328],
    radius: 40,
    symbol: "rings",
    morphology: "ring",
    colors: [0xb7f2ff, 0x7995ff, 0xe56dff],
    tilt: 0.24,
  },
  {
    position: [0, 244, -390],
    radius: 24,
    symbol: "diamond",
    morphology: "barred",
    colors: [0xfff0ce, 0xff91d2, 0x8568ff],
    tilt: -0.08,
  },
  {
    position: [-320, 128, -210],
    radius: 22,
    symbol: "rose",
    morphology: "rose",
    colors: [0xff9eca, 0xc65aff, 0x4f86ff],
    tilt: 0.31,
  },
  {
    position: [315, 136, -220],
    radius: 21,
    symbol: "rings",
    morphology: "ring",
    colors: [0xffd9aa, 0xff75bb, 0x7769ff],
    tilt: -0.38,
  },
  {
    position: [-360, 164, 180],
    radius: 29,
    symbol: "flower",
    morphology: "spiral",
    colors: [0xa4eaff, 0x706fff, 0xe25cff],
    tilt: 0.57,
  },
  {
    position: [350, 172, 190],
    radius: 27,
    symbol: "heart",
    morphology: "barred",
    colors: [0xffb8df, 0xff5fa8, 0x6c5cff],
    tilt: -0.6,
  },
  {
    position: [-160, 188, 350],
    radius: 31,
    symbol: "cat",
    morphology: "dual",
    colors: [0xc7eeff, 0x728fff, 0xcf62ff],
    tilt: 0.21,
  },
  {
    position: [155, 180, 360],
    radius: 33,
    symbol: "infinity",
    morphology: "heart",
    colors: [0xffcfdf, 0xd657ff, 0x4e8dff],
    tilt: -0.27,
  },
  {
    position: [20, 208, 410],
    radius: 37,
    symbol: "moon",
    morphology: "ring",
    colors: [0xe4f8ff, 0x68bcff, 0xb86cff],
    tilt: 0.49,
  },
  {
    position: [-395, 214, -20],
    radius: 35,
    symbol: "diamond",
    morphology: "elliptical",
    colors: [0xffedbf, 0xff7bc7, 0x6e76ff],
    tilt: -0.42,
  },
  {
    position: [398, 222, 20],
    radius: 34,
    symbol: "star",
    morphology: "spiral",
    colors: [0xbaf2ff, 0x668cff, 0xee68cf],
    tilt: 0.36,
  },
  {
    position: [0, 310, -460],
    radius: 43,
    symbol: "none",
    morphology: "rose",
    colors: [0xff9bcf, 0xa55cff, 0x4f79ff],
    tilt: -0.14,
  },
];

const SUN_POSITIONS: [number, number, number][] = [
  [-72, 118, -174],
  [74, 112, -204],
  [-210, 98, -40],
  [212, 110, 35],
  [-96, 188, 235],
  [105, 148, 242],
  [-268, 142, 118],
  [274, 154, 126],
  [154, 224, -302],
  [-162, 232, -314],
  [42, 236, 326],
  [-46, 264, 368],
];

const SUN_COLORS = [
  0xffd88a, 0x9cdbff, 0xff91bc, 0xa99cff, 0xffb06e, 0x72e8ff, 0xffd6ac,
  0xc58cff, 0xffffff, 0xff90d0, 0x8ee7ff, 0xffe5b7,
];

type NebulaKind =
  | "heart"
  | "infinity"
  | "rose"
  | "ribbon"
  | "embrace"
  | "nursery";

type NebulaDefinition = {
  position: [number, number, number];
  spread: [number, number, number];
  kind: NebulaKind;
  colors: [number, number];
};

const NEBULA_DEFINITIONS: NebulaDefinition[] = [
  {
    position: [-150, 178, -385],
    spread: [52, 42, 22],
    kind: "heart",
    colors: [0xff4fa9, 0x985aff],
  },
  {
    position: [154, 186, -410],
    spread: [58, 34, 24],
    kind: "infinity",
    colors: [0x7fdcff, 0xe55cff],
  },
  {
    position: [275, 252, 20],
    spread: [68, 50, 30],
    kind: "rose",
    colors: [0xff98cc, 0x7d62ff],
  },
  {
    position: [-282, 118, 40],
    spread: [72, 32, 26],
    kind: "ribbon",
    colors: [0x76cfff, 0xb95cff],
  },
  {
    position: [122, 126, 348],
    spread: [74, 38, 28],
    kind: "embrace",
    colors: [0xffd080, 0xff62be],
  },
  {
    position: [-132, 168, 360],
    spread: [102, 48, 38],
    kind: "ribbon",
    colors: [0x845cff, 0xff6db5],
  },
];

const COSMIC_NURSERY: NebulaDefinition = {
  position: [0, 72, -108],
  spread: [108, 48, 38],
  kind: "nursery",
  colors: [0xe28a52, 0x5baaff],
};

type ConstellationKind = Exclude<DistantGalaxySymbol, "none">;

type ConstellationDefinition = {
  position: [number, number, number];
  scale: number;
  kind: ConstellationKind;
  color: number;
  rotation: number;
};

const CONSTELLATION_DEFINITIONS: ConstellationDefinition[] = [
  {
    position: [-88, 198, -252],
    scale: 5.4,
    kind: "heart",
    color: 0xffb4de,
    rotation: -0.12,
  },
  {
    position: [270, 204, 18],
    scale: 5.8,
    kind: "infinity",
    color: 0xafe7ff,
    rotation: 0.2,
  },
  {
    position: [-62, 182, 292],
    scale: 6.4,
    kind: "rings",
    color: 0xffd4a8,
    rotation: 0.34,
  },
  {
    position: [-276, 188, 44],
    scale: 6.5,
    kind: "rose",
    color: 0xff9ad0,
    rotation: -0.28,
  },
  {
    position: [220, 262, 260],
    scale: 6.8,
    kind: "cat",
    color: 0xbcc8ff,
    rotation: -0.08,
  },
  {
    position: [-232, 272, 250],
    scale: 6.6,
    kind: "flower",
    color: 0xffc3e4,
    rotation: 0.18,
  },
  {
    position: [-318, 154, -120],
    scale: 7.6,
    kind: "moon",
    color: 0xd5f1ff,
    rotation: -0.22,
  },
  {
    position: [320, 164, -126],
    scale: 7.4,
    kind: "diamond",
    color: 0xffe9bf,
    rotation: 0.24,
  },
  {
    position: [0, 302, -520],
    scale: 8.2,
    kind: "star",
    color: 0xffffff,
    rotation: 0.08,
  },
];

const GALAXY_VERTEX_SHADER = `
  varying vec3 vColor;
  uniform float uPointSize;

  void main() {
    vColor = color;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = max(1.0, -viewPosition.z);
    gl_PointSize = clamp(uPointSize * (265.0 / depth), 1.0, 8.0);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const GALAXY_FIELD_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aPhase;
  varying vec3 vColor;
  uniform float uTime;
  uniform float uMotion;

  void main() {
    vColor = color;
    float shimmer = 1.0 + sin(uTime * 0.42 * uMotion + aPhase) * 0.12 * uMotion;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = max(1.0, -viewPosition.z);
    gl_PointSize = clamp(aSize * shimmer * (265.0 / depth), 1.0, 9.0);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const GALAXY_FRAGMENT_SHADER = `
  varying vec3 vColor;
  uniform float uOpacity;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered) * 2.0;
    if (radius > 1.0) discard;

    float softGlow = pow(max(0.0, 1.0 - radius), 1.35);
    float core = pow(max(0.0, 1.0 - radius), 4.0);
    vec3 luminousColor = vColor * (1.05 + core * 1.8);
    gl_FragColor = vec4(luminousColor, softGlow * uOpacity);
    #include <colorspace_fragment>
  }
`;

const SUN_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vPulse;
  uniform float uTime;
  uniform float uMotion;

  void main() {
    vColor = color;
    vPulse = 1.0 + sin(uTime * 1.7 * uMotion + aPhase) * 0.07 * uMotion;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = max(1.0, -viewPosition.z);
    gl_PointSize = clamp(aSize * vPulse * (330.0 / depth), 5.0, 72.0);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const SUN_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vPulse;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered) * 2.0;
    if (radius > 1.0) discard;

    float halo = pow(max(0.0, 1.0 - radius), 2.2);
    float core = smoothstep(0.32, 0.0, radius);
    float crown = smoothstep(0.76, 0.22, radius) * 0.34;
    vec3 color = vColor * (1.15 + core * 3.0 + crown * vPulse);
    gl_FragColor = vec4(color, halo * 0.86);
    #include <colorspace_fragment>
  }
`;

const NEBULA_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aCloud;
  varying vec3 vColor;
  varying float vIntensity;
  varying float vCloud;
  uniform float uTime;
  uniform float uMotion;

  void main() {
    vColor = color;
    vCloud = aCloud;
    float drift = sin(uTime * 0.045 * uMotion + aPhase);
    vec3 animatedPosition = position;
    animatedPosition.x += drift * 0.7 * uMotion;
    animatedPosition.y += cos(uTime * 0.036 * uMotion + aPhase * 1.7) * 0.5 * uMotion;
    animatedPosition.z += sin(uTime * 0.028 * uMotion + aPhase * 0.8) * 0.35 * uMotion;
    vIntensity = 0.82 + drift * 0.12 * uMotion;

    vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
    float depth = max(1.0, -viewPosition.z);
    float cloudyScale = mix(1.0, 2.35, aCloud);
    gl_PointSize = clamp(
      aSize * cloudyScale * (325.0 / depth),
      1.0,
      mix(18.0, 54.0, aCloud)
    );
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const NEBULA_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vIntensity;
  varying float vCloud;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered) * 2.0;
    if (radius > 1.0) discard;

    float mist = pow(max(0.0, 1.0 - radius), 2.4);
    float pearl = pow(max(0.0, 1.0 - radius), 7.0);
    float billow =
      0.62 +
      sin(centered.x * 18.0 + centered.y * 9.0) * 0.12 +
      sin(centered.y * 23.0 - centered.x * 7.0) * 0.1;
    float cloudMist =
      pow(max(0.0, 1.0 - radius), 1.22) *
      clamp(billow, 0.25, 0.92);
    vec3 color = vColor * mix(
      0.78 + pearl * 1.9,
      0.7 + pearl * 1.25 + cloudMist * 0.52,
      vCloud
    );
    float alpha = mix(
      mist * 0.3,
      cloudMist * 0.22 + pearl * 0.08,
      vCloud
    );
    gl_FragColor = vec4(color, alpha * vIntensity);
    #include <colorspace_fragment>
  }
`;

const runtimeState = new WeakMap<CosmosBackgroundRuntime, InternalRuntime>();

function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveQuality(
  options: CosmosBackgroundOptions,
): CosmosBackgroundQuality {
  if (options.quality) return options.quality;
  return options.lowPower ? "low" : "balanced";
}

function trackGeometry<T extends THREE.BufferGeometry>(
  geometry: T,
  owned: Set<THREE.BufferGeometry>,
) {
  owned.add(geometry);
  return geometry;
}

function trackMaterial<T extends THREE.Material>(
  material: T,
  owned: Set<THREE.Material>,
) {
  owned.add(material);
  return material;
}

function createGalaxyMaterial(
  radius: number,
  opacity: number,
  owned: Set<THREE.Material>,
) {
  return trackMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uPointSize: { value: radius * 0.14 },
        uOpacity: { value: opacity },
      },
      vertexShader: GALAXY_VERTEX_SHADER,
      fragmentShader: GALAXY_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      toneMapped: false,
    }),
    owned,
  );
}

function sampleGalaxyPoint(
  morphology: GalaxyMorphology,
  radius: number,
  index: number,
  arms: number,
  spinDirection: number,
  random: () => number,
) {
  let normalizedRadius = Math.pow(random(), 0.62);
  let x = 0;
  let y = 0;
  let z = 0;

  if (morphology === "spiral") {
    const pointRadius = 0.65 + normalizedRadius * radius;
    const armAngle = ((index % arms) / arms) * TAU;
    const spiral = spinDirection * normalizedRadius * (4.1 + random() * 0.85);
    const scatter =
      (random() - 0.5) * (0.15 + normalizedRadius * normalizedRadius * 0.72);
    const angle = armAngle + spiral + scatter;
    x =
      Math.cos(angle) * pointRadius + (random() - 0.5) * normalizedRadius * 1.2;
    y =
      Math.sin(angle) * pointRadius * (0.72 + random() * 0.11) +
      (random() - 0.5) * normalizedRadius;
    z = (random() - 0.5) * (0.18 + normalizedRadius * 1.6);
  } else if (morphology === "barred") {
    if (random() < 0.28) {
      const alongBar = (random() - 0.5) * 1.5;
      normalizedRadius = Math.abs(alongBar) / 0.75;
      x = alongBar * radius;
      y = (random() - 0.5) * radius * 0.105;
      z = (random() - 0.5) * radius * 0.035;
    } else {
      normalizedRadius = 0.18 + Math.pow(random(), 0.7) * 0.82;
      const side = index % 2 === 0 ? 0 : Math.PI;
      const angle =
        side +
        spinDirection * normalizedRadius * 3.65 +
        (random() - 0.5) * 0.28;
      const pointRadius = radius * normalizedRadius;
      x = Math.cos(angle) * pointRadius;
      y = Math.sin(angle) * pointRadius * 0.66;
      z = (random() - 0.5) * (0.3 + normalizedRadius * 1.35);
    }
  } else if (morphology === "ring") {
    const outerRing = random() > 0.24;
    normalizedRadius = outerRing
      ? 0.68 + (random() - 0.5) * 0.18
      : 0.3 + random() * 0.21;
    const angle =
      random() * TAU + Math.sin(index * 1.71) * (outerRing ? 0.06 : 0.16);
    const pointRadius = radius * normalizedRadius;
    x = Math.cos(angle) * pointRadius;
    y = Math.sin(angle) * pointRadius * (0.76 + random() * 0.08);
    z = (random() - 0.5) * radius * (outerRing ? 0.045 : 0.085);
  } else if (morphology === "elliptical") {
    const angle = random() * TAU;
    normalizedRadius = Math.pow(random(), 0.78);
    const pointRadius = normalizedRadius * radius;
    x = Math.cos(angle) * pointRadius + (random() - 0.5) * radius * 0.04;
    y = Math.sin(angle) * pointRadius * (0.42 + random() * 0.16);
    z = (random() - 0.5) * radius * (0.08 + normalizedRadius * 0.08);
  } else if (morphology === "heart") {
    const angle = random() * TAU;
    const sin = Math.sin(angle);
    const outlineX = 16 * sin * sin * sin;
    const outlineY =
      13 * Math.cos(angle) -
      5 * Math.cos(angle * 2) -
      2 * Math.cos(angle * 3) -
      Math.cos(angle * 4);
    normalizedRadius = 0.18 + Math.pow(random(), 0.46) * 0.82;
    x =
      (outlineX / 16.7) * radius * normalizedRadius +
      (random() - 0.5) * radius * 0.035;
    y =
      ((outlineY + 2.4) / 15.3) * radius * normalizedRadius +
      (random() - 0.5) * radius * 0.035;
    z = (random() - 0.5) * radius * (0.035 + (1 - normalizedRadius) * 0.09);
  } else if (morphology === "rose") {
    const angle = random() * TAU;
    const petals = Math.abs(Math.cos(angle * 2.5));
    normalizedRadius = 0.1 + Math.pow(random(), 0.56) * 0.9;
    const pointRadius = radius * normalizedRadius * (0.32 + petals * 0.68);
    x = Math.cos(angle) * pointRadius;
    y = Math.sin(angle) * pointRadius * 0.82;
    z = Math.sin(angle * 5) * radius * 0.035 + (random() - 0.5) * radius * 0.05;
  } else {
    const lobe = index % 2 === 0 ? -1 : 1;
    normalizedRadius = Math.pow(random(), 0.66);
    const angle =
      lobe * normalizedRadius * 4.2 +
      random() * 0.36 +
      (lobe < 0 ? Math.PI : 0);
    const lobeRadius = normalizedRadius * radius * 0.54;
    x = lobe * radius * 0.25 + Math.cos(angle) * lobeRadius;
    y = Math.sin(angle) * lobeRadius * 0.68;
    z = (random() - 0.5) * radius * (0.03 + normalizedRadius * 0.07);
  }

  return { x, y, z, normalizedRadius };
}

function createDistantGalaxyField(
  definitions: GalaxyDefinition[],
  countPerGalaxy: number,
  random: () => number,
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
): { group: THREE.Group; animation: GalaxyAnimation } {
  const group = new THREE.Group();
  group.name = "batched-distant-galaxies";

  const totalParticleCount = definitions.length * countPerGalaxy;
  const positions = new Float32Array(totalParticleCount * 3);
  const colors = new Float32Array(totalParticleCount * 3);
  const sizes = new Float32Array(totalParticleCount);
  const phases = new Float32Array(totalParticleCount);
  const symbolPositions: number[] = [];
  const symbolColors: number[] = [];
  const symbolStarPositions: number[] = [];
  const symbolStarColors: number[] = [];

  const coreColor = new THREE.Color();
  const armColor = new THREE.Color();
  const edgeColor = new THREE.Color();
  const color = new THREE.Color();
  const localPosition = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const orientation = new THREE.Object3D();

  definitions.forEach((definition, galaxyIndex) => {
    coreColor.setHex(definition.colors[0]);
    armColor.setHex(definition.colors[1]);
    edgeColor.setHex(definition.colors[2]);

    orientation.position.set(...definition.position);
    orientation.lookAt(ORIGIN);
    orientation.rotateZ(definition.tilt);
    orientation.updateMatrix();

    const arms =
      definition.morphology === "barred" ? 2 : 3 + Math.floor(random() * 3);
    const spinDirection = random() > 0.5 ? 1 : -1;
    const coreCount = Math.max(6, Math.floor(countPerGalaxy * 0.1));

    for (let index = 0; index < countPerGalaxy; index += 1) {
      const attributeIndex = galaxyIndex * countPerGalaxy + index;
      const sampled = sampleGalaxyPoint(
        definition.morphology,
        definition.radius,
        index,
        arms,
        spinDirection,
        random,
      );
      let normalizedRadius = sampled.normalizedRadius;

      if (index < coreCount) {
        const coreRadius = Math.pow(random(), 1.7) * definition.radius * 0.1;
        const coreAngle = random() * TAU;
        localPosition.set(
          Math.cos(coreAngle) * coreRadius,
          Math.sin(coreAngle) * coreRadius * 0.62,
          (random() - 0.5) * definition.radius * 0.035,
        );
        normalizedRadius = coreRadius / definition.radius;
      } else {
        localPosition.set(sampled.x, sampled.y, sampled.z);
      }

      worldPosition.copy(localPosition).applyMatrix4(orientation.matrix);
      positions[attributeIndex * 3] = worldPosition.x;
      positions[attributeIndex * 3 + 1] = worldPosition.y;
      positions[attributeIndex * 3 + 2] = worldPosition.z;

      if (normalizedRadius < 0.34) {
        color.copy(coreColor).lerp(armColor, normalizedRadius / 0.34);
      } else {
        color.copy(armColor).lerp(edgeColor, (normalizedRadius - 0.34) / 0.66);
      }
      color.offsetHSL((random() - 0.5) * 0.035, 0, (random() - 0.5) * 0.16);
      colors[attributeIndex * 3] = color.r;
      colors[attributeIndex * 3 + 1] = color.g;
      colors[attributeIndex * 3 + 2] = color.b;
      sizes[attributeIndex] =
        definition.radius *
        (index < coreCount ? 0.18 : 0.115) *
        (0.72 + random() * 0.5);
      phases[attributeIndex] = random() * TAU;
    }

    if (definition.symbol === "none") return;

    const localSegments: number[] = [];
    buildSymbol(definition.symbol, localSegments);
    const symbolScale =
      definition.radius *
      (definition.symbol === "flower" || definition.symbol === "rose"
        ? 0.105
        : 0.095);
    const symbolColor = new THREE.Color(definition.colors[0]);

    for (let index = 0; index < localSegments.length; index += 3) {
      localPosition.set(
        localSegments[index] * symbolScale,
        localSegments[index + 1] * symbolScale,
        1.2,
      );
      worldPosition.copy(localPosition).applyMatrix4(orientation.matrix);
      symbolPositions.push(worldPosition.x, worldPosition.y, worldPosition.z);
      symbolColors.push(symbolColor.r, symbolColor.g, symbolColor.b);
      symbolStarPositions.push(
        worldPosition.x,
        worldPosition.y,
        worldPosition.z,
      );
      symbolStarColors.push(symbolColor.r, symbolColor.g, symbolColor.b);
    }
  });

  const geometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.computeBoundingSphere();

  const material = trackMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uOpacity: { value: 0.98 },
      },
      vertexShader: GALAXY_FIELD_VERTEX_SHADER,
      fragmentShader: GALAXY_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      toneMapped: false,
    }),
    materials,
  );
  const disk = new THREE.Points(geometry, material);
  disk.name = "galaxy-field";
  disk.frustumCulled = false;
  group.add(disk);

  const symbolGeometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  symbolGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(symbolPositions, 3),
  );
  symbolGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(symbolColors, 3),
  );
  const symbolLines = new THREE.LineSegments(
    symbolGeometry,
    trackMaterial(
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      materials,
    ),
  );
  symbolLines.name = "batched-romantic-galaxy-symbols";
  symbolLines.frustumCulled = false;
  group.add(symbolLines);

  const symbolStarGeometry = trackGeometry(
    new THREE.BufferGeometry(),
    geometries,
  );
  symbolStarGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(symbolStarPositions, 3),
  );
  symbolStarGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(symbolStarColors, 3),
  );
  const symbolStars = new THREE.Points(
    symbolStarGeometry,
    createGalaxyMaterial(34, 0.68, materials),
  );
  symbolStars.name = "batched-romantic-galaxy-sparkles";
  symbolStars.frustumCulled = false;
  group.add(symbolStars);

  return {
    group,
    animation: {
      disk,
      symbolLines,
      symbolStars,
    },
  };
}

function addPolylineSegments(
  target: number[],
  points: Array<[number, number]>,
  close = false,
) {
  const segmentCount = close ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const from = points[index];
    const to = points[(index + 1) % points.length];
    target.push(from[0], from[1], 0, to[0], to[1], 0);
  }
}

function buildCatSymbol(target: number[]) {
  addPolylineSegments(
    target,
    [
      [-1.48, -0.72],
      [-1.58, 0.52],
      [-1.72, 1.52],
      [-0.7, 1.08],
      [0, 1.22],
      [0.7, 1.08],
      [1.72, 1.52],
      [1.58, 0.52],
      [1.48, -0.72],
      [0.78, -1.28],
      [0, -1.48],
      [-0.78, -1.28],
    ],
    true,
  );

  addPolylineSegments(target, [
    [-0.82, 0.22],
    [-0.55, 0.08],
    [-0.29, 0.22],
  ]);
  addPolylineSegments(target, [
    [0.29, 0.22],
    [0.55, 0.08],
    [0.82, 0.22],
  ]);
  addPolylineSegments(target, [
    [-0.2, -0.27],
    [0, -0.4],
    [0.2, -0.27],
  ]);
  addPolylineSegments(target, [
    [0, -0.4],
    [-0.24, -0.69],
  ]);
  addPolylineSegments(target, [
    [0, -0.4],
    [0.24, -0.69],
  ]);

  for (const side of [-1, 1]) {
    target.push(
      side * 0.42,
      -0.28,
      0,
      side * 1.34,
      -0.14,
      0,
      side * 0.42,
      -0.46,
      0,
      side * 1.39,
      -0.52,
      0,
    );
  }
}

function buildFlowerSymbol(target: number[]) {
  const petalCount = 6;
  for (let petal = 0; petal < petalCount; petal += 1) {
    const angle = (petal / petalCount) * TAU;
    const centerX = Math.cos(angle) * 0.92;
    const centerY = Math.sin(angle) * 0.92;
    const points: Array<[number, number]> = [];
    for (let index = 0; index < 10; index += 1) {
      const localAngle = (index / 10) * TAU;
      const radial = 0.72 + Math.cos(localAngle) * 0.16;
      points.push([
        centerX + Math.cos(localAngle + angle) * radial,
        centerY + Math.sin(localAngle + angle) * radial * 0.56,
      ]);
    }
    addPolylineSegments(target, points, true);
  }

  const center: Array<[number, number]> = [];
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * TAU;
    center.push([Math.cos(angle) * 0.58, Math.sin(angle) * 0.58]);
  }
  addPolylineSegments(target, center, true);
}

function buildStarSymbol(target: number[]) {
  const points: Array<[number, number]> = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * TAU - Math.PI / 2;
    const radius = index % 2 === 0 ? 1.65 : 0.66;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  addPolylineSegments(target, points, true);
}

function buildHeartSymbol(target: number[]) {
  const points: Array<[number, number]> = [];
  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * TAU;
    const sin = Math.sin(angle);
    points.push([
      (16 * sin * sin * sin) / 10.5,
      (13 * Math.cos(angle) -
        5 * Math.cos(angle * 2) -
        2 * Math.cos(angle * 3) -
        Math.cos(angle * 4) +
        2.2) /
        10.5,
    ]);
  }
  addPolylineSegments(target, points, true);
}

function buildInfinitySymbol(target: number[]) {
  const points: Array<[number, number]> = [];
  for (let index = 0; index < 42; index += 1) {
    const angle = (index / 42) * TAU;
    const denominator = 1 + Math.sin(angle) * Math.sin(angle);
    points.push([
      (1.9 * Math.cos(angle)) / denominator,
      (1.15 * Math.sin(angle) * Math.cos(angle)) / denominator,
    ]);
  }
  addPolylineSegments(target, points, true);
}

function buildRingsSymbol(target: number[]) {
  for (const ring of [-1, 1]) {
    const points: Array<[number, number]> = [];
    for (let index = 0; index < 30; index += 1) {
      const angle = (index / 30) * TAU;
      points.push([
        ring * 0.58 + Math.cos(angle) * 0.92,
        Math.sin(angle) * 1.16,
      ]);
    }
    addPolylineSegments(target, points, true);
  }

  target.push(-0.12, 1.22, 0, 0, 1.58, 0, 0, 1.58, 0, 0.12, 1.22, 0);
}

function buildRoseSymbol(target: number[]) {
  const outer: Array<[number, number]> = [];
  const inner: Array<[number, number]> = [];
  for (let index = 0; index < 54; index += 1) {
    const angle = (index / 54) * TAU;
    const petalRadius = 0.64 + 0.72 * Math.abs(Math.cos(angle * 2.5));
    outer.push([Math.cos(angle) * petalRadius, Math.sin(angle) * petalRadius]);

    const innerAngle = angle * 1.65;
    const innerRadius = 0.14 + index * 0.014;
    inner.push([
      Math.cos(innerAngle) * innerRadius,
      Math.sin(innerAngle) * innerRadius,
    ]);
  }
  addPolylineSegments(target, outer, true);
  addPolylineSegments(target, inner);
}

function buildDiamondSymbol(target: number[]) {
  addPolylineSegments(
    target,
    [
      [0, 1.7],
      [1.24, 0.46],
      [0, -1.62],
      [-1.24, 0.46],
    ],
    true,
  );
  target.push(
    -1.24,
    0.46,
    0,
    1.24,
    0.46,
    0,
    0,
    1.7,
    0,
    0,
    -1.62,
    0,
    -1.24,
    0.46,
    0,
    0,
    -1.62,
    0,
    1.24,
    0.46,
    0,
    0,
    -1.62,
    0,
  );
}

function buildMoonSymbol(target: number[]) {
  const outer: Array<[number, number]> = [];
  const inner: Array<[number, number]> = [];
  for (let index = 0; index < 30; index += 1) {
    const angle = Math.PI * 0.5 + (index / 29) * Math.PI;
    outer.push([Math.cos(angle) * 1.38, Math.sin(angle) * 1.38]);
    inner.push([
      0.48 + Math.cos(Math.PI * 1.5 - (index / 29) * Math.PI) * 1.02,
      Math.sin(Math.PI * 1.5 - (index / 29) * Math.PI) * 1.02,
    ]);
  }
  addPolylineSegments(target, outer);
  addPolylineSegments(target, inner);
  if (outer.length > 0 && inner.length > 0) {
    target.push(
      outer[0][0],
      outer[0][1],
      0,
      inner[inner.length - 1][0],
      inner[inner.length - 1][1],
      0,
      outer[outer.length - 1][0],
      outer[outer.length - 1][1],
      0,
      inner[0][0],
      inner[0][1],
      0,
    );
  }
}

function buildSymbol(kind: ConstellationKind, target: number[]) {
  if (kind === "cat") buildCatSymbol(target);
  if (kind === "flower") buildFlowerSymbol(target);
  if (kind === "star") buildStarSymbol(target);
  if (kind === "heart") buildHeartSymbol(target);
  if (kind === "infinity") buildInfinitySymbol(target);
  if (kind === "rings") buildRingsSymbol(target);
  if (kind === "rose") buildRoseSymbol(target);
  if (kind === "diamond") buildDiamondSymbol(target);
  if (kind === "moon") buildMoonSymbol(target);
}

function sampleNebulaPoint(
  kind: NebulaKind,
  random: () => number,
  target: THREE.Vector3,
) {
  const hazeX = random() + random() + random() - 1.5;
  const hazeY = random() + random() + random() - 1.5;
  const hazeZ = random() + random() - 1;

  if (kind === "heart") {
    const angle = random() * TAU;
    const sin = Math.sin(angle);
    const fill = 0.25 + Math.pow(random(), 0.52) * 0.75;
    const x = (16 * sin * sin * sin) / 17;
    const y =
      (13 * Math.cos(angle) -
        5 * Math.cos(angle * 2) -
        2 * Math.cos(angle * 3) -
        Math.cos(angle * 4) +
        2.4) /
      15.5;
    target.set(x * fill + hazeX * 0.14, y * fill + hazeY * 0.12, hazeZ * 0.5);
  } else if (kind === "infinity") {
    const angle = random() * TAU;
    const denominator = 1 + Math.sin(angle) * Math.sin(angle);
    target.set(
      (Math.cos(angle) / denominator) * 0.92 + hazeX * 0.16,
      ((Math.sin(angle) * Math.cos(angle)) / denominator) * 1.15 + hazeY * 0.18,
      hazeZ * 0.52,
    );
  } else if (kind === "rose") {
    const angle = random() * TAU;
    const fill = 0.18 + Math.pow(random(), 0.58) * 0.82;
    const petals = 0.34 + Math.abs(Math.cos(angle * 2.5)) * 0.66;
    target.set(
      Math.cos(angle) * petals * fill + hazeX * 0.12,
      Math.sin(angle) * petals * fill + hazeY * 0.12,
      Math.sin(angle * 5) * 0.12 + hazeZ * 0.42,
    );
  } else if (kind === "ribbon") {
    const along = random() * 2 - 1;
    target.set(
      along + hazeX * 0.12,
      Math.sin(along * Math.PI * 1.65) * 0.38 + hazeY * 0.28,
      Math.cos(along * Math.PI * 1.15) * 0.12 + hazeZ * 0.5,
    );
  } else if (kind === "nursery") {
    const along = random() * 2 - 1;
    const ridge =
      Math.sin(along * Math.PI * 1.55) * 0.16 +
      Math.sin(along * Math.PI * 4.2) * 0.08;
    target.set(
      along + hazeX * 0.24,
      -0.12 + ridge + hazeY * 0.48 + (1 - Math.abs(along)) * 0.12,
      Math.sin(along * Math.PI * 2.1) * 0.12 + hazeZ * 0.72,
    );
  } else {
    const side = random() > 0.5 ? 1 : -1;
    const angle = -1.15 + random() * 2.3;
    target.set(
      side * 0.34 + side * Math.cos(angle) * 0.55 + hazeX * 0.12,
      Math.sin(angle) * 0.74 + hazeY * 0.15,
      side * Math.sin(angle) * 0.16 + hazeZ * 0.46,
    );
  }

  return target;
}

function createRomanticSky(
  particleCount: number,
  constellationCount: number,
  random: () => number,
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
) {
  const group = new THREE.Group();
  group.name = "romantic-sky-tapestry";

  const nurseryParticleCount = Math.max(180, Math.floor(particleCount * 0.48));
  const totalParticleCount = particleCount + nurseryParticleCount;
  const nebulaPositions = new Float32Array(totalParticleCount * 3);
  const nebulaColors = new Float32Array(totalParticleCount * 3);
  const nebulaSizes = new Float32Array(totalParticleCount);
  const nebulaPhases = new Float32Array(totalParticleCount);
  const nebulaCloudFlags = new Float32Array(totalParticleCount);
  const localPosition = new THREE.Vector3();
  const color = new THREE.Color();
  const secondaryColor = new THREE.Color();

  for (let index = 0; index < totalParticleCount; index += 1) {
    const belongsToNursery = index < nurseryParticleCount;
    const definition = belongsToNursery
      ? COSMIC_NURSERY
      : NEBULA_DEFINITIONS[
          (index - nurseryParticleCount) % NEBULA_DEFINITIONS.length
        ];
    sampleNebulaPoint(definition.kind, random, localPosition);

    nebulaPositions[index * 3] =
      definition.position[0] + localPosition.x * definition.spread[0];
    nebulaPositions[index * 3 + 1] =
      definition.position[1] + localPosition.y * definition.spread[1];
    nebulaPositions[index * 3 + 2] =
      definition.position[2] + localPosition.z * definition.spread[2];

    color.setHex(definition.colors[0]);
    secondaryColor.setHex(definition.colors[1]);
    color.lerp(
      secondaryColor,
      belongsToNursery
        ? THREE.MathUtils.clamp(localPosition.y * 0.54 + 0.48, 0.08, 0.94)
        : random(),
    );
    color.offsetHSL((random() - 0.5) * 0.035, 0, (random() - 0.5) * 0.13);
    nebulaColors[index * 3] = color.r;
    nebulaColors[index * 3 + 1] = color.g;
    nebulaColors[index * 3 + 2] = color.b;
    nebulaSizes[index] = belongsToNursery
      ? 13 + random() * 25
      : 8 + random() * 14;
    nebulaPhases[index] = random() * TAU;
    nebulaCloudFlags[index] = belongsToNursery ? 1 : 0;
  }

  const nebulaGeometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  nebulaGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(nebulaPositions, 3),
  );
  nebulaGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(nebulaColors, 3),
  );
  nebulaGeometry.setAttribute(
    "aSize",
    new THREE.BufferAttribute(nebulaSizes, 1),
  );
  nebulaGeometry.setAttribute(
    "aPhase",
    new THREE.BufferAttribute(nebulaPhases, 1),
  );
  nebulaGeometry.setAttribute(
    "aCloud",
    new THREE.BufferAttribute(nebulaCloudFlags, 1),
  );
  nebulaGeometry.computeBoundingSphere();
  const nebulaMaterial = trackMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
      },
      vertexShader: NEBULA_VERTEX_SHADER,
      fragmentShader: NEBULA_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      toneMapped: false,
    }),
    materials,
  );
  const nebulae = new THREE.Points(nebulaGeometry, nebulaMaterial);
  nebulae.name = "batched-heart-rose-nebulae";
  nebulae.frustumCulled = false;
  group.add(nebulae);

  const linePositions: number[] = [];
  const lineColors: number[] = [];
  const starPositions: number[] = [];
  const starColors: number[] = [];
  const orientation = new THREE.Object3D();
  const worldPosition = new THREE.Vector3();

  const nurseryStarCount = Math.max(14, Math.floor(particleCount / 70));
  for (let index = 0; index < nurseryStarCount; index += 1) {
    const horizontal = random() * 2 - 1;
    starPositions.push(
      COSMIC_NURSERY.position[0] + horizontal * COSMIC_NURSERY.spread[0] * 0.78,
      COSMIC_NURSERY.position[1] +
        (random() - 0.42) * COSMIC_NURSERY.spread[1] * 0.86,
      COSMIC_NURSERY.position[2] + (random() - 0.5) * COSMIC_NURSERY.spread[2],
    );
    color.setHex(index % 3 === 0 ? 0xffd7a1 : 0xd9efff);
    starColors.push(color.r, color.g, color.b);
  }

  for (let index = 0; index < constellationCount; index += 1) {
    const definition = CONSTELLATION_DEFINITIONS[index];
    const localSegments: number[] = [];
    buildSymbol(definition.kind, localSegments);
    color.setHex(definition.color);

    orientation.position.set(...definition.position);
    orientation.lookAt(ORIGIN);
    orientation.rotateZ(definition.rotation);
    orientation.updateMatrix();

    for (
      let segmentIndex = 0;
      segmentIndex < localSegments.length;
      segmentIndex += 3
    ) {
      localPosition.set(
        localSegments[segmentIndex] * definition.scale,
        localSegments[segmentIndex + 1] * definition.scale,
        0,
      );
      worldPosition.copy(localPosition).applyMatrix4(orientation.matrix);
      linePositions.push(worldPosition.x, worldPosition.y, worldPosition.z);
      lineColors.push(color.r, color.g, color.b);
      starPositions.push(worldPosition.x, worldPosition.y, worldPosition.z);
      starColors.push(color.r, color.g, color.b);
    }
  }

  const lineGeometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  lineGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(linePositions, 3),
  );
  lineGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(lineColors, 3),
  );
  const constellationLines = new THREE.LineSegments(
    lineGeometry,
    trackMaterial(
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      materials,
    ),
  );
  constellationLines.name = "batched-romantic-constellations";
  constellationLines.frustumCulled = false;
  group.add(constellationLines);

  const starGeometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3),
  );
  starGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(starColors, 3),
  );
  const constellationStars = new THREE.Points(
    starGeometry,
    createGalaxyMaterial(38, 0.6, materials),
  );
  constellationStars.name = "batched-constellation-stars";
  constellationStars.frustumCulled = false;
  group.add(constellationStars);

  return {
    group,
    animation: {
      nebulaMaterial,
      constellationLines,
      constellationStars,
    },
  };
}

function createStellarLandmarks(
  count: number,
  random: () => number,
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
) {
  const group = new THREE.Group();
  group.name = "distant-suns";

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const rays: number[] = [];
  const rayColors: number[] = [];
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const position = SUN_POSITIONS[index];
    const size = 8 + random() * 7;
    color.setHex(SUN_COLORS[index]);

    positions[index * 3] = position[0];
    positions[index * 3 + 1] = position[1];
    positions[index * 3 + 2] = position[2];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    sizes[index] = size;
    phases[index] = random() * TAU;

    const rayLength = size * (0.7 + random() * 0.25);
    const diagonalLength = rayLength * 0.55;
    const rayDirections: [number, number, number][] = [
      [rayLength, 0, 0],
      [0, rayLength, 0],
      [diagonalLength, diagonalLength, 0],
      [diagonalLength, -diagonalLength, 0],
    ];
    for (const direction of rayDirections) {
      rays.push(
        position[0] - direction[0],
        position[1] - direction[1],
        position[2] - direction[2],
        position[0] + direction[0],
        position[1] + direction[1],
        position[2] + direction[2],
      );
      for (let vertex = 0; vertex < 2; vertex += 1) {
        rayColors.push(color.r, color.g, color.b);
      }
    }
  }

  const starGeometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  starGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const starMaterial = trackMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
      },
      vertexShader: SUN_VERTEX_SHADER,
      fragmentShader: SUN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      toneMapped: false,
    }),
    materials,
  );
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = "stellar-coronas";
  group.add(stars);

  const rayGeometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  rayGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(rays, 3),
  );
  rayGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(rayColors, 3),
  );
  const starRays = new THREE.LineSegments(
    rayGeometry,
    trackMaterial(
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      materials,
    ),
  );
  starRays.name = "stellar-diffraction-rays";
  group.add(starRays);

  return { group, starMaterial, starRays };
}

function createOrbitLine(
  radius: number,
  height: number,
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
) {
  const positions = new Float32Array(96 * 3);
  for (let index = 0; index < 96; index += 1) {
    const angle = (index / 96) * TAU;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = Math.sin(angle) * height;
    positions[index * 3 + 2] = Math.sin(angle) * radius * 0.18;
  }
  const geometry = trackGeometry(new THREE.BufferGeometry(), geometries);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.LineLoop(
    geometry,
    trackMaterial(
      new THREE.LineBasicMaterial({
        color: 0x8ecfff,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      materials,
    ),
  );
}

function createCompactStar(
  color: number,
  secondaryColor: number,
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    trackGeometry(new THREE.IcosahedronGeometry(1.05, 2), geometries),
    trackMaterial(
      new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
      }),
      materials,
    ),
  );
  group.add(core);

  const halo = new THREE.Mesh(
    trackGeometry(new THREE.SphereGeometry(1.55, 14, 10), geometries),
    trackMaterial(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
        toneMapped: false,
      }),
      materials,
    ),
  );
  group.add(halo);

  const magnetic = new THREE.Group();
  const torusGeometry = trackGeometry(
    new THREE.TorusGeometry(1.72, 0.035, 5, 44),
    geometries,
  );
  const magneticMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: secondaryColor,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    materials,
  );

  for (let index = 0; index < 3; index += 1) {
    const ring = new THREE.Mesh(torusGeometry, magneticMaterial);
    ring.rotation.x = (index / 3) * Math.PI;
    ring.rotation.y = Math.PI * (0.15 + index * 0.31);
    magnetic.add(ring);
  }
  group.add(magnetic);

  const jetMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: secondaryColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    materials,
  );
  const jetGeometry = trackGeometry(
    new THREE.ConeGeometry(0.42, 6.5, 7, 1, true),
    geometries,
  );
  const northJet = new THREE.Mesh(jetGeometry, jetMaterial);
  northJet.position.y = 3.7;
  const southJet = new THREE.Mesh(jetGeometry, jetMaterial);
  southJet.position.y = -3.7;
  southJet.rotation.z = Math.PI;
  group.add(northJet, southJet);

  return { group, core, magnetic };
}

function createNeutronBinary(
  geometries: Set<THREE.BufferGeometry>,
  materials: Set<THREE.Material>,
) {
  const group = new THREE.Group();
  group.name = "dual-neutron-stars";
  group.position.set(132, 94, -228);
  group.rotation.set(-0.14, -0.34, 0.22);

  const orbitRadius = 5.4;
  const orbitHeight = 2.4;
  const orbit = createOrbitLine(
    orbitRadius,
    orbitHeight,
    geometries,
    materials,
  );
  group.add(orbit);

  const compactA = createCompactStar(0xb9efff, 0x59cfff, geometries, materials);
  const compactB = createCompactStar(0xffb7ef, 0xc35bff, geometries, materials);
  group.add(compactA.group, compactB.group);

  const barycenter = new THREE.Mesh(
    trackGeometry(new THREE.SphereGeometry(0.32, 8, 6), geometries),
    trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      materials,
    ),
  );
  group.add(barycenter);

  return {
    group,
    animation: {
      starA: compactA.group,
      starB: compactB.group,
      magneticA: compactA.magnetic,
      magneticB: compactB.magnetic,
      coreA: compactA.core,
      coreB: compactB.core,
      orbitRadius,
      orbitHeight,
    },
  };
}

/**
 * Creates a purely decorative, non-interactive deep-space layer.
 *
 * All visuals are generated with buffer geometry and shaders; no image or
 * network assets are required. Add `runtime.group` to a Three.js scene and
 * call `updateCosmosBackground` from the scene's animation loop.
 */
export function createCosmosBackground(
  options: CosmosBackgroundOptions = {},
): CosmosBackgroundRuntime {
  const quality = resolveQuality(options);
  const preset = QUALITY_PRESETS[quality];
  const random = createSeededRandom(options.seed ?? 0xa7f6c19);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  const group = new THREE.Group();
  group.name = "cosmos-background";
  group.userData.decorative = true;

  const distantGalaxies = new THREE.Group();
  distantGalaxies.name = "distant-galaxies";
  group.add(distantGalaxies);

  const galaxyField = createDistantGalaxyField(
    GALAXY_DEFINITIONS.slice(0, preset.galaxyCount),
    preset.particlesPerGalaxy,
    random,
    geometries,
    materials,
  );
  distantGalaxies.add(galaxyField.group);

  const romanticSky = createRomanticSky(
    preset.nebulaParticles,
    preset.constellationCount,
    random,
    geometries,
    materials,
  );
  group.add(romanticSky.group);

  const stellar = createStellarLandmarks(
    preset.sunCount,
    random,
    geometries,
    materials,
  );
  group.add(stellar.group);

  const binary = createNeutronBinary(geometries, materials);
  group.add(binary.group);

  const runtime: CosmosBackgroundRuntime = {
    group,
    distantGalaxies,
    stellarLandmarks: stellar.group,
    neutronBinary: binary.group,
    quality,
    dispose: () => disposeCosmosBackground(runtime),
  };

  runtimeState.set(runtime, {
    galaxyField: galaxyField.animation,
    starMaterial: stellar.starMaterial,
    starRays: stellar.starRays,
    romanticSky: romanticSky.animation,
    binary: binary.animation,
    reducedMotion: options.reducedMotion ?? false,
    geometries,
    materials,
    disposed: false,
  });

  updateCosmosBackground(runtime, 0);
  return runtime;
}

/**
 * Animates the distant scenery. `elapsedSeconds` should be absolute animation
 * time; `motionScale` may be set to zero while paused.
 */
export function updateCosmosBackground(
  runtime: CosmosBackgroundRuntime,
  elapsedSeconds: number,
  motionScale = 1,
) {
  const state = runtimeState.get(runtime);
  if (!state || state.disposed) return;

  const safeMotionScale = THREE.MathUtils.clamp(motionScale, 0, 2);
  const motion = state.reducedMotion ? safeMotionScale * 0.16 : safeMotionScale;
  const time = elapsedSeconds * motion;

  const galaxyField = state.galaxyField;
  galaxyField.disk.material.uniforms.uTime.value = elapsedSeconds;
  galaxyField.disk.material.uniforms.uMotion.value = motion;
  runtime.distantGalaxies.rotation.y = Math.sin(time * 0.018) * 0.004 * motion;
  const galaxySymbolMaterial = galaxyField.symbolLines
    .material as THREE.LineBasicMaterial;
  galaxySymbolMaterial.opacity =
    0.66 + Math.sin(time * 0.38) * 0.06 * Math.min(1, motion);
  galaxyField.symbolStars.material.uniforms.uOpacity.value =
    0.62 + Math.sin(time * 0.51) * 0.055 * Math.min(1, motion);

  const romanticSky = state.romanticSky;
  romanticSky.nebulaMaterial.uniforms.uTime.value = elapsedSeconds;
  romanticSky.nebulaMaterial.uniforms.uMotion.value = motion;
  const constellationLineMaterial = romanticSky.constellationLines
    .material as THREE.LineBasicMaterial;
  constellationLineMaterial.opacity = 0.52;
  romanticSky.constellationStars.material.uniforms.uOpacity.value = 0.76;

  state.starMaterial.uniforms.uTime.value = elapsedSeconds;
  state.starMaterial.uniforms.uMotion.value = motion;
  const rayMaterial = state.starRays.material as THREE.LineBasicMaterial;
  rayMaterial.opacity =
    0.16 + Math.sin(time * 0.74) * 0.035 * Math.min(1, motion);

  const binary = state.binary;
  const orbitAngle = time * 0.48;
  const cosine = Math.cos(orbitAngle);
  const sine = Math.sin(orbitAngle);
  binary.starA.position.set(
    cosine * binary.orbitRadius,
    sine * binary.orbitHeight,
    sine * binary.orbitRadius * 0.18,
  );
  binary.starB.position.set(
    -cosine * binary.orbitRadius,
    -sine * binary.orbitHeight,
    -sine * binary.orbitRadius * 0.18,
  );

  binary.magneticA.rotation.set(time * 0.37, time * 0.61, time * 0.23);
  binary.magneticB.rotation.set(-time * 0.42, time * 0.55, -time * 0.28);
  binary.coreA.rotation.y = time * 1.7;
  binary.coreB.rotation.y = -time * 1.9;

  const binaryPulse = 1 + Math.sin(time * 2.15) * 0.08 * motion;
  binary.coreA.scale.setScalar(binaryPulse);
  binary.coreB.scale.setScalar(2 - binaryPulse);
  runtime.neutronBinary.rotation.z =
    0.22 + Math.sin(time * 0.08) * 0.035 * motion;
}

export function disposeCosmosBackground(runtime: CosmosBackgroundRuntime) {
  const state = runtimeState.get(runtime);
  if (!state || state.disposed) return;

  state.disposed = true;
  runtime.group.removeFromParent();
  state.geometries.forEach((geometry) => geometry.dispose());
  state.materials.forEach((material) => material.dispose());
  state.geometries.clear();
  state.materials.clear();
  runtimeState.delete(runtime);
}
