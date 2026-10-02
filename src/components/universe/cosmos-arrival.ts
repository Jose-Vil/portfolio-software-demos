import * as THREE from "three";

export type CosmosArrivalQuality = "low" | "high";

export type CosmosArrivalPhase =
  | "idle"
  | "launch"
  | "cruise"
  | "arrival"
  | "landing"
  | "complete";

export type CosmosArrivalFrame = {
  phase: CosmosArrivalPhase;
  progress: number;
  elapsed: number;
  duration: number;
  speed: number;
  destinationReveal: number;
  finished: boolean;
};

export type CosmosArrivalOptions = {
  quality?: CosmosArrivalQuality;
  lowPower?: boolean;
  reducedMotion?: boolean;
  duration?: number;
  seed?: number;
  onProgress?: (frame: CosmosArrivalFrame) => void;
  onComplete?: () => void;
};

export type CosmosArrivalSystem = {
  group: THREE.Group;
  readonly active: boolean;
  readonly finished: boolean;
  readonly progress: number;
  readonly duration: number;
  readonly phase: CosmosArrivalPhase;
  start: () => CosmosArrivalFrame;
  update: (deltaSeconds: number, camera: THREE.Camera) => CosmosArrivalFrame;
  dispose: () => void;
};

type ArrivalProfile = {
  streakCount: number;
  dustCount: number;
  galaxyCount: number;
  starsPerGalaxy: number;
  travelDistance: number;
  tunnelDepth: number;
  defaultDuration: number;
};

const PROFILES: Record<CosmosArrivalQuality | "reduced", ArrivalProfile> = {
  reduced: {
    streakCount: 84,
    dustCount: 110,
    galaxyCount: 4,
    starsPerGalaxy: 64,
    travelDistance: 330,
    tunnelDepth: 370,
    defaultDuration: 2.2,
  },
  low: {
    streakCount: 220,
    dustCount: 270,
    galaxyCount: 7,
    starsPerGalaxy: 104,
    travelDistance: 540,
    tunnelDepth: 520,
    defaultDuration: 7.6,
  },
  high: {
    streakCount: 420,
    dustCount: 520,
    galaxyCount: 10,
    starsPerGalaxy: 168,
    travelDistance: 620,
    tunnelDepth: 600,
    defaultDuration: 8.4,
  },
};

const TAU = Math.PI * 2;
const WHITE = new THREE.Color(0xffffff);
const TUNNEL_COLORS = [
  new THREE.Color(0xc8edff),
  new THREE.Color(0x86bfff),
  new THREE.Color(0xd8b4ff),
  new THREE.Color(0xffa5dc),
  new THREE.Color(0x8ff7ff),
  new THREE.Color(0xffe6b0),
];
const GALAXY_PALETTES = [
  [new THREE.Color(0x6acbff), new THREE.Color(0xff8fdd)],
  [new THREE.Color(0x9e82ff), new THREE.Color(0xffd4f0)],
  [new THREE.Color(0x79f2ff), new THREE.Color(0x8985ff)],
  [new THREE.Color(0xff87bc), new THREE.Color(0xffdf9c)],
  [new THREE.Color(0xc68cff), new THREE.Color(0x7adfff)],
  [new THREE.Color(0xffb9e8), new THREE.Color(0xf2f4ff)],
];

const fullScreenVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const deepSpaceFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uProgress;
  uniform float uAspect;
  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), local.x),
      mix(
        hash21(cell + vec2(0.0, 1.0)),
        hash21(cell + vec2(1.0, 1.0)),
        local.x
      ),
      local.y
    );
  }

  void main() {
    vec2 centered = (vUv - 0.5) * vec2(uAspect, 1.0);
    float radius = length(centered);
    float angle = atan(centered.y, centered.x);
    float drift = uTime * 0.035;
    float cloud =
      valueNoise(centered * 2.2 + vec2(drift, -drift * 0.7)) * 0.58 +
      valueNoise(centered * 5.1 - vec2(drift * 0.6, drift)) * 0.28 +
      valueNoise(centered * 11.0 + vec2(drift)) * 0.14;
    float spiral = 0.5 + 0.5 * sin(
      angle * 3.0 - radius * 14.0 - uTime * 0.42
    );
    float tunnel = exp(-radius * 1.65) * (0.42 + spiral * 0.34);

    vec2 starGrid = vUv * vec2(210.0 * uAspect, 126.0);
    vec2 starCell = floor(starGrid);
    vec2 starLocal = fract(starGrid) - 0.5;
    float starSeed = hash21(starCell);
    float star =
      step(0.986, starSeed) *
      exp(-dot(starLocal, starLocal) * 130.0) *
      (0.45 + 0.55 * sin(uTime * 2.0 + starSeed * 31.0));

    vec3 color = mix(
      vec3(0.002, 0.004, 0.025),
      vec3(0.012, 0.035, 0.11),
      cloud
    );
    color += vec3(0.04, 0.018, 0.09) * cloud * cloud;
    color += vec3(0.025, 0.08, 0.17) * tunnel;
    color += vec3(0.13, 0.045, 0.16) * tunnel * spiral;
    color += vec3(0.5, 0.72, 1.0) * star;
    color *= 0.82 + smoothstep(0.0, 0.18, uProgress) * 0.18;

    gl_FragColor = vec4(color, uOpacity);
    #include <colorspace_fragment>
  }
`;

const flashFragmentShader = /* glsl */ `
  uniform float uFlash;
  uniform float uAspect;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 point = (vUv - 0.5) * vec2(uAspect, 1.0);
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float core = exp(-radius * radius * 8.5);
    float halo = exp(-radius * radius * 1.8);
    float rays =
      pow(abs(cos(angle * 2.0 + uTime * 0.18)), 20.0) *
      exp(-radius * 2.3);
    float ring = exp(-pow((radius - 0.22) * 12.0, 2.0));
    float alpha = uFlash * clamp(
      core * 1.25 + halo * 0.5 + rays * 0.32 + ring * 0.2,
      0.0,
      1.0
    );
    vec3 color = mix(
      vec3(0.48, 0.7, 1.0),
      vec3(1.0, 0.86, 0.97),
      core + rays * 0.35
    );

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const tunnelVertexShader = /* glsl */ `
  attribute float aAngle;
  attribute float aRadius;
  attribute float aDepth;
  attribute float aWidth;
  attribute float aLength;
  attribute float aSpeed;
  attribute float aSeed;
  attribute vec3 aColor;

  uniform float uTravel;
  uniform float uSpan;
  uniform float uStretch;
  uniform float uOpacity;
  uniform float uTime;

  varying vec2 vRibbonUv;
  varying vec3 vColor;
  varying float vFade;
  varying float vSeed;

  void main() {
    float depth = 7.0 + mod(aDepth - uTravel * aSpeed, uSpan);
    float nearness = 1.0 - clamp(depth / uSpan, 0.0, 1.0);
    vec2 direction = vec2(cos(aAngle), sin(aAngle));
    vec2 tangent = vec2(-direction.y, direction.x);
    float width = aWidth * mix(0.82, 2.4, nearness);
    float length = aLength * uStretch * mix(0.72, 1.85, nearness);
    float headPulse =
      0.92 + 0.08 * sin(uTime * 8.0 + aSeed * 37.0);
    vec3 localPosition = vec3(
      direction * aRadius + tangent * position.x * width,
      -depth - (1.0 - uv.y) * length
    );

    float nearFade = smoothstep(7.0, 18.0, depth);
    float farFade = 1.0 - smoothstep(uSpan - 72.0, uSpan, depth);
    vFade = nearFade * farFade * uOpacity * headPulse;
    vRibbonUv = uv;
    vColor = aColor;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix *
      vec4(localPosition, 1.0);
  }
`;

const tunnelFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vRibbonUv;
  varying vec3 vColor;
  varying float vFade;
  varying float vSeed;

  void main() {
    float along = clamp(vRibbonUv.y, 0.0, 1.0);
    float lateral = abs(vRibbonUv.x - 0.5) * 2.0;
    float taper = mix(0.045, 1.0, pow(along, 0.62));
    float filament = exp(
      -(lateral * lateral) / max(0.003, taper * 0.082)
    );
    float aura = exp(
      -(lateral * lateral) / max(0.02, taper * 0.34)
    );
    float braid =
      0.86 +
      0.14 * sin(
        along * (38.0 + vSeed * 29.0) +
        uTime * 4.5 +
        vSeed * 41.0
      );
    float tail = smoothstep(0.0, 0.13, along) * pow(along, 0.72);
    float head = pow(along, 12.0);
    float alpha =
      (filament * braid + aura * (0.15 + head * 0.38)) *
      tail *
      vFade;
    vec3 color = vColor * (0.82 + head * 1.6);

    if (alpha < 0.008) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const dustVertexShader = /* glsl */ `
  attribute float aAngle;
  attribute float aRadius;
  attribute float aDepth;
  attribute float aSize;
  attribute float aSpeed;
  attribute float aSeed;
  attribute vec3 aColor;

  uniform float uTravel;
  uniform float uSpan;
  uniform float uOpacity;
  uniform float uTime;

  varying vec3 vColor;
  varying float vFade;

  void main() {
    float depth = 6.0 + mod(aDepth - uTravel * aSpeed, uSpan);
    vec2 direction = vec2(cos(aAngle), sin(aAngle));
    vec3 localPosition = vec3(direction * aRadius, -depth);
    vec4 viewPosition = modelViewMatrix * vec4(localPosition, 1.0);
    float nearFade = smoothstep(6.0, 14.0, depth);
    float farFade = 1.0 - smoothstep(uSpan - 56.0, uSpan, depth);
    float shimmer =
      0.76 + 0.24 * sin(uTime * 3.0 + aSeed * 43.0);
    vFade = nearFade * farFade * uOpacity * shimmer;
    vColor = aColor;
    gl_PointSize = clamp(
      aSize * (300.0 / max(1.0, -viewPosition.z)),
      0.7,
      8.0
    );
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const dustFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float radius = length(point);
    float glow = 1.0 - smoothstep(0.08, 0.5, radius);
    float core = 1.0 - smoothstep(0.0, 0.12, radius);
    float alpha = (glow * 0.62 + core) * vFade;

    if (alpha < 0.008) discard;
    gl_FragColor = vec4(vColor * (0.72 + core), alpha);
    #include <colorspace_fragment>
  }
`;

const galaxyVertexShader = /* glsl */ `
  attribute vec3 aAnchor;
  attribute vec3 aLocal;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSpeed;
  attribute float aSpin;
  attribute float aSeed;

  uniform float uTravel;
  uniform float uOpacity;
  uniform float uTime;

  varying vec3 vColor;
  varying float vFade;

  void main() {
    float rotation = uTime * aSpin;
    float cosine = cos(rotation);
    float sine = sin(rotation);
    vec3 localPoint = aLocal;
    localPoint.xy = mat2(cosine, -sine, sine, cosine) * localPoint.xy;
    vec3 localPosition = aAnchor + localPoint;
    localPosition.z += uTravel * aSpeed;
    vec4 viewPosition = modelViewMatrix * vec4(localPosition, 1.0);
    float depth = -viewPosition.z;
    float approachFade = smoothstep(5.0, 26.0, depth);
    float distanceFade = 1.0 - smoothstep(590.0, 700.0, depth);
    float shimmer =
      0.84 + 0.16 * sin(uTime * 2.4 + aSeed * 51.0);
    vFade = approachFade * distanceFade * uOpacity * shimmer;
    vColor = aColor;
    gl_PointSize = clamp(
      aSize * (285.0 / max(1.0, depth)),
      0.65,
      30.0
    ) * step(0.1, depth);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const galaxyFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float radius = length(point);
    float glow = exp(-radius * radius * 11.0);
    float core = 1.0 - smoothstep(0.0, 0.13, radius);
    float alpha = (glow * 0.72 + core) * vFade;

    if (alpha < 0.008 || radius > 0.5) discard;
    gl_FragColor = vec4(vColor * (0.74 + core * 1.35), alpha);
    #include <colorspace_fragment>
  }
`;

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random: () => number, minimum: number, maximum: number) {
  return minimum + (maximum - minimum) * random();
}

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function smoothstep(minimum: number, maximum: number, value: number) {
  const amount = clamp01((value - minimum) / (maximum - minimum));
  return amount * amount * (3 - 2 * amount);
}

function phaseAt(progress: number, active: boolean): CosmosArrivalPhase {
  if (!active && progress <= 0) return "idle";
  if (progress >= 1) return "complete";
  if (progress < 0.14) return "launch";
  if (progress < 0.72) return "cruise";
  if (progress < 0.91) return "arrival";
  return "landing";
}

function createQuadGeometry() {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
      ]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

function createTunnel(profile: ArrivalProfile, random: () => number) {
  const geometry = createQuadGeometry();
  const count = profile.streakCount;
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const depths = new Float32Array(count);
  const widths = new Float32Array(count);
  const lengths = new Float32Array(count);
  const speeds = new Float32Array(count);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const color =
      TUNNEL_COLORS[Math.floor(random() * TUNNEL_COLORS.length)].clone();
    color.lerp(WHITE, randomBetween(random, 0.02, 0.36));
    angles[index] = random() * TAU;
    radii[index] = randomBetween(random, 2.5, 88) * Math.sqrt(random());
    depths[index] = randomBetween(random, 0, profile.tunnelDepth);
    widths[index] = randomBetween(random, 0.035, 0.18);
    lengths[index] = randomBetween(random, 9, 42) * (0.72 + random());
    speeds[index] = randomBetween(random, 0.82, 1.2);
    seeds[index] = random();
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  geometry.setAttribute(
    "aAngle",
    new THREE.InstancedBufferAttribute(angles, 1),
  );
  geometry.setAttribute(
    "aRadius",
    new THREE.InstancedBufferAttribute(radii, 1),
  );
  geometry.setAttribute(
    "aDepth",
    new THREE.InstancedBufferAttribute(depths, 1),
  );
  geometry.setAttribute(
    "aWidth",
    new THREE.InstancedBufferAttribute(widths, 1),
  );
  geometry.setAttribute(
    "aLength",
    new THREE.InstancedBufferAttribute(lengths, 1),
  );
  geometry.setAttribute(
    "aSpeed",
    new THREE.InstancedBufferAttribute(speeds, 1),
  );
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute(
    "aColor",
    new THREE.InstancedBufferAttribute(colors, 3),
  );
  geometry.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    name: "cosmos-arrival-light-filaments",
    vertexShader: tunnelVertexShader,
    fragmentShader: tunnelFragmentShader,
    uniforms: {
      uTravel: { value: 0 },
      uSpan: { value: profile.tunnelDepth },
      uStretch: { value: 0.18 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "arrival-light-tunnel";
  mesh.frustumCulled = false;
  mesh.renderOrder = 915;
  return { mesh, geometry, material };
}

function createDust(profile: ArrivalProfile, random: () => number) {
  const count = profile.dustCount;
  const positions = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const radii = new Float32Array(count);
  const depths = new Float32Array(count);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const color =
      TUNNEL_COLORS[Math.floor(random() * TUNNEL_COLORS.length)].clone();
    color.lerp(WHITE, randomBetween(random, 0.16, 0.58));
    angles[index] = random() * TAU;
    radii[index] = randomBetween(random, 1.5, 104) * Math.sqrt(random());
    depths[index] = randomBetween(random, 0, profile.tunnelDepth);
    sizes[index] = randomBetween(random, 0.34, 1.42);
    speeds[index] = randomBetween(random, 0.72, 1.3);
    seeds[index] = random();
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAngle", new THREE.BufferAttribute(angles, 1));
  geometry.setAttribute("aRadius", new THREE.BufferAttribute(radii, 1));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    name: "cosmos-arrival-star-dust",
    vertexShader: dustVertexShader,
    fragmentShader: dustFragmentShader,
    uniforms: {
      uTravel: { value: 0 },
      uSpan: { value: profile.tunnelDepth },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "arrival-star-dust";
  points.frustumCulled = false;
  points.renderOrder = 910;
  return { points, geometry, material };
}

type GalaxyKind = "spiral" | "ring" | "heart" | "rose";

function makeGalaxyPoint(
  kind: GalaxyKind,
  radius: number,
  random: () => number,
) {
  const point = new THREE.Vector3();
  const fill = Math.sqrt(random());

  if (kind === "heart") {
    const angle = random() * TAU;
    const sine = Math.sin(angle);
    point.set(
      16 * sine * sine * sine,
      13 * Math.cos(angle) -
        5 * Math.cos(angle * 2) -
        2 * Math.cos(angle * 3) -
        Math.cos(angle * 4),
      randomBetween(random, -1.2, 1.2),
    );
    point.multiplyScalar((radius / 18) * fill);
    point.y -= radius * 0.08;
  } else if (kind === "ring") {
    const angle = random() * TAU;
    const ringRadius = radius * randomBetween(random, 0.58, 1);
    point.set(
      Math.cos(angle) * ringRadius,
      Math.sin(angle) * ringRadius * 0.42,
      randomBetween(random, -radius * 0.12, radius * 0.12),
    );
  } else if (kind === "rose") {
    const angle = random() * TAU;
    const petal = Math.abs(Math.cos(angle * 3));
    const roseRadius = radius * (0.22 + petal * 0.78) * fill;
    point.set(
      Math.cos(angle) * roseRadius,
      Math.sin(angle) * roseRadius * 0.62,
      randomBetween(random, -radius * 0.1, radius * 0.1),
    );
  } else {
    const arms = random() < 0.52 ? 2 : 3;
    const arm = Math.floor(random() * arms);
    const armRadius = radius * Math.pow(random(), 0.62);
    const angle =
      (arm / arms) * TAU +
      armRadius * randomBetween(random, 0.42, 0.66) +
      randomBetween(random, -0.24, 0.24);
    point.set(
      Math.cos(angle) * armRadius,
      Math.sin(angle) * armRadius * 0.42,
      randomBetween(random, -radius * 0.12, radius * 0.12),
    );
  }

  return point;
}

function createPassingGalaxies(profile: ArrivalProfile, random: () => number) {
  const count = profile.galaxyCount * profile.starsPerGalaxy;
  const positions = new Float32Array(count * 3);
  const anchors = new Float32Array(count * 3);
  const locals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  const spins = new Float32Array(count);
  const seeds = new Float32Array(count);
  const kinds: GalaxyKind[] = ["spiral", "ring", "heart", "rose"];
  const localPoint = new THREE.Vector3();
  const tilt = new THREE.Quaternion();
  let cursor = 0;

  for (
    let galaxyIndex = 0;
    galaxyIndex < profile.galaxyCount;
    galaxyIndex += 1
  ) {
    const isDestination = galaxyIndex === profile.galaxyCount - 1;
    const fraction =
      profile.galaxyCount <= 1 ? 1 : galaxyIndex / (profile.galaxyCount - 1);
    const targetTravel = profile.travelDistance * (0.14 + fraction * 0.76);
    const speed = randomBetween(random, 0.82, 1.14);
    const side = random() < 0.5 ? -1 : 1;
    const anchorX = isDestination ? 0 : side * randomBetween(random, 20, 72);
    const anchorY = isDestination
      ? randomBetween(random, -2, 6)
      : randomBetween(random, -42, 45);
    const anchorZ = -targetTravel * speed;
    const galaxyRadius = isDestination ? 22 : randomBetween(random, 8, 18);
    const kind = isDestination ? "heart" : kinds[galaxyIndex % kinds.length];
    const palette = isDestination
      ? [new THREE.Color(0x73dfff), new THREE.Color(0xff8edc)]
      : GALAXY_PALETTES[Math.floor(random() * GALAXY_PALETTES.length)];
    const spin = randomBetween(random, -0.17, 0.17);
    tilt.setFromEuler(
      new THREE.Euler(
        randomBetween(random, -0.7, 0.7),
        randomBetween(random, -0.45, 0.45),
        randomBetween(random, -0.35, 0.35),
      ),
    );

    for (
      let pointIndex = 0;
      pointIndex < profile.starsPerGalaxy;
      pointIndex += 1
    ) {
      const offset = cursor * 3;
      if (pointIndex === 0) {
        localPoint.set(0, 0, 0);
      } else {
        localPoint
          .copy(makeGalaxyPoint(kind, galaxyRadius, random))
          .applyQuaternion(tilt);
      }
      const radialAmount = clamp01(
        localPoint.length() / Math.max(1, galaxyRadius),
      );
      const color = palette[0]
        .clone()
        .lerp(palette[1], radialAmount * 0.72 + random() * 0.28)
        .lerp(WHITE, pointIndex === 0 ? 0.72 : random() * 0.16);

      anchors[offset] = anchorX;
      anchors[offset + 1] = anchorY;
      anchors[offset + 2] = anchorZ;
      locals[offset] = localPoint.x;
      locals[offset + 1] = localPoint.y;
      locals[offset + 2] = localPoint.z;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
      sizes[cursor] =
        pointIndex === 0
          ? randomBetween(random, 4.2, 6.8)
          : randomBetween(random, 0.48, 1.65) * (1.12 - radialAmount * 0.34);
      speeds[cursor] = speed;
      spins[cursor] = spin;
      seeds[cursor] = random();
      cursor += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAnchor", new THREE.BufferAttribute(anchors, 3));
  geometry.setAttribute("aLocal", new THREE.BufferAttribute(locals, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aSpin", new THREE.BufferAttribute(spins, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    name: "cosmos-arrival-passing-galaxies",
    vertexShader: galaxyVertexShader,
    fragmentShader: galaxyFragmentShader,
    uniforms: {
      uTravel: { value: 0 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "arrival-passing-galaxies";
  points.frustumCulled = false;
  points.renderOrder = 912;
  return { points, geometry, material };
}

function alignGroupToCamera(
  group: THREE.Group,
  camera: THREE.Camera,
  worldPosition: THREE.Vector3,
  worldQuaternion: THREE.Quaternion,
  parentQuaternion: THREE.Quaternion,
) {
  camera.updateWorldMatrix(true, false);
  camera.getWorldPosition(worldPosition);
  camera.getWorldQuaternion(worldQuaternion);

  if (group.parent) {
    group.parent.updateWorldMatrix(true, false);
    group.parent.worldToLocal(worldPosition);
    group.parent.getWorldQuaternion(parentQuaternion);
    group.position.copy(worldPosition);
    group.quaternion.copy(parentQuaternion).invert().multiply(worldQuaternion);
  } else {
    group.position.copy(worldPosition);
    group.quaternion.copy(worldQuaternion);
  }
}

/**
 * Creates a camera-local, procedural arrival journey. The returned group should
 * be added directly to the scene. It remains hidden until `start()` is called.
 */
export function createCosmosArrival(
  options: CosmosArrivalOptions = {},
): CosmosArrivalSystem {
  const quality = options.quality ?? (options.lowPower ? "low" : "high");
  const reducedMotion = options.reducedMotion ?? false;
  const profile = PROFILES[reducedMotion ? "reduced" : quality];
  const duration = THREE.MathUtils.clamp(
    options.duration ?? profile.defaultDuration,
    reducedMotion ? 1.8 : 5,
    16,
  );
  const random = createSeededRandom(options.seed ?? 0xa771a1);
  const group = new THREE.Group();
  group.name = "cosmos-arrival-journey";
  group.visible = false;

  const overlayGeometry = new THREE.PlaneGeometry(10, 10);
  const deepSpaceMaterial = new THREE.ShaderMaterial({
    name: "cosmos-arrival-deep-space",
    vertexShader: fullScreenVertexShader,
    fragmentShader: deepSpaceFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.985 },
      uProgress: { value: 0 },
      uAspect: { value: 16 / 9 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const deepSpace = new THREE.Mesh(overlayGeometry, deepSpaceMaterial);
  deepSpace.name = "arrival-deep-space-veil";
  deepSpace.position.z = -1.2;
  deepSpace.frustumCulled = false;
  deepSpace.renderOrder = 900;

  const flashMaterial = new THREE.ShaderMaterial({
    name: "cosmos-arrival-final-flash",
    vertexShader: fullScreenVertexShader,
    fragmentShader: flashFragmentShader,
    uniforms: {
      uFlash: { value: 0 },
      uAspect: { value: 16 / 9 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const flash = new THREE.Mesh(overlayGeometry, flashMaterial);
  flash.name = "arrival-final-flash";
  flash.position.z = -1.05;
  flash.frustumCulled = false;
  flash.renderOrder = 930;

  const tunnel = createTunnel(profile, random);
  const dust = createDust(profile, random);
  const galaxies = createPassingGalaxies(profile, random);
  group.add(deepSpace, dust.points, galaxies.points, tunnel.mesh, flash);

  const worldPosition = new THREE.Vector3();
  const worldQuaternion = new THREE.Quaternion();
  const parentQuaternion = new THREE.Quaternion();
  let elapsed = 0;
  let active = false;
  let finished = false;
  let disposed = false;
  let completionNotified = false;
  let currentProgress = 0;

  const makeFrame = (): CosmosArrivalFrame => {
    const launch = smoothstep(0.01, 0.14, currentProgress);
    const braking = 1 - smoothstep(0.7, 0.94, currentProgress);
    return {
      phase: phaseAt(currentProgress, active),
      progress: currentProgress,
      elapsed,
      duration,
      speed: launch * (0.22 + braking * 0.78),
      destinationReveal: smoothstep(0.78, 1, currentProgress),
      finished,
    };
  };

  const start = () => {
    if (disposed) return makeFrame();
    elapsed = 0;
    currentProgress = 0;
    active = true;
    finished = false;
    completionNotified = false;
    group.visible = true;
    const frame = makeFrame();
    options.onProgress?.(frame);
    return frame;
  };

  const update = (deltaSeconds: number, camera: THREE.Camera) => {
    if (disposed || !active) return makeFrame();

    alignGroupToCamera(
      group,
      camera,
      worldPosition,
      worldQuaternion,
      parentQuaternion,
    );
    const delta = THREE.MathUtils.clamp(deltaSeconds, 0, 0.12);
    elapsed = Math.min(duration, elapsed + delta);
    currentProgress = clamp01(elapsed / duration);

    const progress = currentProgress;
    const travelCurve = clamp01(progress + Math.sin(progress * Math.PI) * 0.09);
    const travel = travelCurve * profile.travelDistance;
    const launch = smoothstep(0.015, 0.14, progress);
    const braking = 1 - smoothstep(0.69, 0.93, progress);
    const flightFade = launch * (1 - smoothstep(0.84, 0.975, progress));
    const galaxyFade =
      smoothstep(0.025, 0.12, progress) *
      (1 - smoothstep(0.82, 0.955, progress));
    const stretch = reducedMotion
      ? 0.14 + launch * braking * 0.28
      : 0.18 + launch * (0.38 + braking * 0.9);
    const veilOpacity = 0.985 * (1 - smoothstep(0.81, 1, progress));
    const preFlash =
      smoothstep(0.68, 0.82, progress) *
      (1 - smoothstep(0.82, 0.86, progress)) *
      0.2;
    const burstDistance = (progress - 0.875) / 0.057;
    const flashAmount = Math.min(
      1.18,
      preFlash + Math.exp(-burstDistance * burstDistance) * 1.16,
    );
    const aspect = (camera as THREE.PerspectiveCamera).isPerspectiveCamera
      ? Math.max(0.55, (camera as THREE.PerspectiveCamera).aspect)
      : 16 / 9;

    deepSpaceMaterial.uniforms.uTime.value = elapsed;
    deepSpaceMaterial.uniforms.uOpacity.value = veilOpacity;
    deepSpaceMaterial.uniforms.uProgress.value = progress;
    deepSpaceMaterial.uniforms.uAspect.value = aspect;
    flashMaterial.uniforms.uFlash.value = flashAmount;
    flashMaterial.uniforms.uAspect.value = aspect;
    flashMaterial.uniforms.uTime.value = elapsed;

    tunnel.material.uniforms.uTravel.value = travel;
    tunnel.material.uniforms.uStretch.value = stretch;
    tunnel.material.uniforms.uOpacity.value = flightFade;
    tunnel.material.uniforms.uTime.value = elapsed;
    dust.material.uniforms.uTravel.value = travel;
    dust.material.uniforms.uOpacity.value = flightFade * 0.82;
    dust.material.uniforms.uTime.value = elapsed;
    galaxies.material.uniforms.uTravel.value = travel;
    galaxies.material.uniforms.uOpacity.value = galaxyFade;
    galaxies.material.uniforms.uTime.value = elapsed;

    if (currentProgress >= 1) {
      active = false;
      finished = true;
      group.visible = false;
    }

    const frame = makeFrame();
    options.onProgress?.(frame);
    if (finished && !completionNotified) {
      completionNotified = true;
      options.onComplete?.();
    }
    return frame;
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    active = false;
    group.visible = false;
    group.removeFromParent();
    group.clear();
    overlayGeometry.dispose();
    deepSpaceMaterial.dispose();
    flashMaterial.dispose();
    tunnel.geometry.dispose();
    tunnel.material.dispose();
    dust.geometry.dispose();
    dust.material.dispose();
    galaxies.geometry.dispose();
    galaxies.material.dispose();
  };

  const system: CosmosArrivalSystem = {
    group,
    get active() {
      return active;
    },
    get finished() {
      return finished;
    },
    get progress() {
      return currentProgress;
    },
    get duration() {
      return duration;
    },
    get phase() {
      return phaseAt(currentProgress, active);
    },
    start,
    update,
    dispose,
  };

  return system;
}

export function startCosmosArrival(system: CosmosArrivalSystem) {
  return system.start();
}

export function updateCosmosArrival(
  system: CosmosArrivalSystem,
  deltaSeconds: number,
  camera: THREE.Camera,
) {
  return system.update(deltaSeconds, camera);
}

export function disposeCosmosArrival(system: CosmosArrivalSystem) {
  system.dispose();
}
