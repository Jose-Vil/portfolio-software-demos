import * as THREE from "three";

export type MeteorQuality = "mobile" | "desktop";

export type MeteorSystemOptions = {
  quality?: MeteorQuality;
  seed?: number;
  center?: THREE.Vector3 | [number, number, number];
  radius?: number;
  maxTrails?: number;
  maxSparks?: number;
  shootingStarsPerSecond?: number;
  meteorsPerSecond?: number;
};

export type MeteorSystem = {
  group: THREE.Group;
  quality: MeteorQuality;
  dispose: () => void;
};

type FlightKind = "shooting-star" | "meteor";
type FlightStyle = 0 | 1 | 2;
type FlightTheme = 0 | 1 | 2;

type Flight = {
  active: boolean;
  kind: FlightKind;
  style: FlightStyle;
  theme: FlightTheme;
  isNear: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radial: THREE.Vector3;
  orbitAxis: THREE.Vector3;
  color: THREE.Color;
  age: number;
  lifetime: number;
  baseDistance: number;
  radialPhase: number;
  radialRate: number;
  radialAmplitude: number;
  angularVelocity: number;
  trailLength: number;
  trailWidth: number;
  headSize: number;
  sparkAccumulator: number;
  flickerSeed: number;
  roll: number;
  shaderPhase: number;
};

type Spark = {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  age: number;
  lifetime: number;
  brightness: number;
  size: number;
};

type InternalSystem = {
  publicSystem: MeteorSystem;
  trails: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  trailHalos: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  heads: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  sparks: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  sparkPositions: Float32Array;
  sparkColors: Float32Array;
  sparkSizes: Float32Array;
  trailStyles: THREE.InstancedBufferAttribute;
  trailThemes: THREE.InstancedBufferAttribute;
  trailPhases: THREE.InstancedBufferAttribute;
  headStyles: THREE.InstancedBufferAttribute;
  headThemes: THREE.InstancedBufferAttribute;
  headPhases: THREE.InstancedBufferAttribute;
  flights: Flight[];
  sparkStates: Spark[];
  random: () => number;
  center: THREE.Vector3;
  radius: number;
  shootingStarsPerSecond: number;
  meteorsPerSecond: number;
  shootingAccumulator: number;
  meteorAccumulator: number;
  giantCooldown: number;
  elapsed: number;
  disposed: boolean;
  scratch: {
    matrix: THREE.Matrix4;
    quaternion: THREE.Quaternion;
    headQuaternion: THREE.Quaternion;
    headRollQuaternion: THREE.Quaternion;
    trailCenter: THREE.Vector3;
    direction: THREE.Vector3;
    side: THREE.Vector3;
    normal: THREE.Vector3;
    viewVector: THREE.Vector3;
    scale: THREE.Vector3;
    displayColor: THREE.Color;
    haloColor: THREE.Color;
    rotationMatrix: THREE.Matrix4;
    tangent: THREE.Vector3;
  };
  view: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    valid: boolean;
  };
};

const INTERNALS = new WeakMap<MeteorSystem, InternalSystem>();

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const BLACK = new THREE.Color(0x000000);
const WHITE = new THREE.Color(0xffffff);

const LIGHT_COLORS = [
  new THREE.Color(0xf9edff),
  new THREE.Color(0xffb9ec),
  new THREE.Color(0xcabfff),
  new THREE.Color(0xb9e8ff),
];
const ICE_COLORS = [
  new THREE.Color(0xdafcff),
  new THREE.Color(0x7edcff),
  new THREE.Color(0xa7bfff),
  new THREE.Color(0xc8f2ff),
];
const FIRE_COLORS = [
  new THREE.Color(0xffe2a3),
  new THREE.Color(0xffa24e),
  new THREE.Color(0xff5b62),
  new THREE.Color(0xff79b8),
];

const trailVertexShader = /* glsl */ `
  attribute float instanceStyle;
  attribute float instanceTheme;
  attribute float instancePhase;
  varying vec3 vInstanceColor;
  varying float vAlongTrail;
  varying float vAcrossTrail;
  varying float vStyle;
  varying float vTheme;
  varying float vPhase;

  void main() {
    vInstanceColor = instanceColor;
    vAlongTrail = uv.y;
    vAcrossTrail = uv.x;
    vStyle = instanceStyle;
    vTheme = instanceTheme;
    vPhase = instancePhase;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 ribbonSideVector =
      (modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
    vec3 ribbonSide =
      ribbonSideVector / max(length(ribbonSideVector), 0.0001);
    float ribbonLength = length(
      (modelMatrix * instanceMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz
    );
    float giantAmount = step(1.5, instanceStyle);
    float iceAmount =
      step(0.5, instanceTheme) * (1.0 - step(1.5, instanceTheme));
    float fireAmount = step(1.5, instanceTheme);
    float curveStrength =
      0.006 + giantAmount * 0.02 + iceAmount * 0.005 + fireAmount * 0.01;
    float broadCurve =
      sin(uv.y * 3.14159265) *
      sin(uv.y * (4.2 + instancePhase * 0.37) + instancePhase);
    float fineCurve =
      sin(uv.y * 19.0 + instancePhase * 2.3) *
      (1.0 - uv.y) * fireAmount;
    worldPosition.xyz += ribbonSide * ribbonLength * curveStrength *
      (broadCurve + fineCurve * 0.16);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const trailFragmentShader = /* glsl */ `
  uniform float uLayer;
  uniform float uTime;
  varying vec3 vInstanceColor;
  varying float vAlongTrail;
  varying float vAcrossTrail;
  varying float vStyle;
  varying float vTheme;
  varying float vPhase;

  void main() {
    float along = clamp(vAlongTrail, 0.0, 1.0);
    float signedLateral = vAcrossTrail - 0.5;
    float lateral = abs(signedLateral) * 2.0;
    float giantAmount = step(1.5, vStyle);
    float starAmount =
      step(0.5, vStyle) * (1.0 - step(1.5, vStyle));
    float lightAmount = 1.0 - step(0.5, vTheme);
    float iceAmount =
      step(0.5, vTheme) * (1.0 - step(1.5, vTheme));
    float fireAmount = step(1.5, vTheme);

    float taper = mix(0.035, 1.0, pow(along, 0.58));
    float coreWidth =
      0.008 + taper * mix(0.055, 0.095, fireAmount);
    float filament = exp(
      -(lateral * lateral) / max(0.0015, coreWidth)
    );
    float aura = exp(
      -(lateral * lateral) /
      max(0.012, 0.1 + taper * (0.3 + giantAmount * 0.25))
    );

    float twinOffset =
      0.1 +
      sin(along * 25.0 + uTime * 0.5 + vPhase) *
      0.026 * (1.0 - along);
    float twinFilaments = exp(
      -pow(abs(signedLateral) - twinOffset, 2.0) /
      max(0.0014, 0.004 + taper * 0.015)
    );
    float lightRibbon =
      filament * 0.76 +
      twinFilaments * (0.42 + starAmount * 0.3) +
      aura * 0.16;

    float iceNeedles =
      pow(
        max(
          0.0,
          sin(along * 92.0 + signedLateral * 26.0 + vPhase * 3.1)
        ),
        10.0
      ) *
      exp(-lateral * (2.2 + 2.0 * along));
    float iceSpine =
      filament * 0.64 +
      twinFilaments * 0.54 +
      iceNeedles * (0.38 + 0.34 * (1.0 - along)) +
      aura * 0.12;

    float flameNoise =
      0.62 +
      0.23 * sin(along * 43.0 + signedLateral * 17.0 + uTime * 1.7 + vPhase) +
      0.15 * sin(along * 81.0 - signedLateral * 29.0 - uTime * 0.8);
    float flamePlume =
      exp(
        -(lateral * lateral) /
        max(0.02, 0.18 + taper * 0.36)
      ) *
      max(0.0, flameNoise);
    float fireRibbon =
      filament * (0.54 + flameNoise * 0.36) +
      flamePlume * (0.5 + giantAmount * 0.24);

    float themedRibbon =
      lightRibbon * lightAmount +
      iceSpine * iceAmount +
      fireRibbon * fireAmount;
    float pulse =
      0.91 +
      0.06 * sin(along * 57.0 + uTime * 2.1 + vPhase) +
      0.03 * sin(along * 113.0 - uTime * 1.2);
    float tailFade = smoothstep(0.0, 0.09, along) * pow(along, 0.62);
    float headBloom = pow(along, 7.0);
    float haloAlpha =
      aura *
      (0.19 + headBloom * 0.34 + giantAmount * 0.14) +
      flamePlume * fireAmount * 0.13 +
      iceNeedles * iceAmount * 0.08;
    float headJoinFade =
      1.0 - smoothstep(mix(0.965, 0.91, uLayer), 1.0, along);
    float alpha =
      mix(themedRibbon, haloAlpha, uLayer) *
      tailFade * headJoinFade * pulse;
    vec3 color = vInstanceColor * mix(0.72, 1.82, headBloom);
    color += vec3(0.17, 0.3, 0.4) * iceAmount * iceNeedles * 0.25;
    color += vec3(0.44, 0.08, 0.015) * fireAmount * flamePlume * 0.18;

    if (alpha < 0.008) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const headVertexShader = /* glsl */ `
  attribute float instanceStyle;
  attribute float instanceTheme;
  attribute float instancePhase;
  varying vec2 vUv;
  varying vec3 vInstanceColor;
  varying float vStyle;
  varying float vTheme;
  varying float vPhase;

  void main() {
    vUv = uv;
    vInstanceColor = instanceColor;
    vStyle = instanceStyle;
    vTheme = instanceTheme;
    vPhase = instancePhase;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const headFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vInstanceColor;
  varying float vStyle;
  varying float vTheme;
  varying float vPhase;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float giantAmount = step(1.5, vStyle);
    float starAmount =
      step(0.5, vStyle) * (1.0 - step(1.5, vStyle));
    float iceAmount =
      step(0.5, vTheme) * (1.0 - step(1.5, vTheme));
    float fireAmount = step(1.5, vTheme);
    float pulse =
      0.96 + 0.04 * sin(uTime * 3.2 + vPhase * 2.7);

    float glow = exp(-4.2 * radius * radius);
    float pearl = 1.0 - smoothstep(0.07, 0.4, radius);
    float starRadius = 0.32 + 0.17 * cos(angle * 5.0);
    float starShape = 1.0 - smoothstep(
      starRadius - 0.032,
      starRadius + 0.052,
      radius
    );
    float iceRadius = 0.29 + 0.1 * cos(angle * 6.0);
    float iceCrystal = 1.0 - smoothstep(
      iceRadius - 0.025,
      iceRadius + 0.045,
      radius
    );
    float fireEdge =
      0.31 +
      0.055 * sin(angle * 9.0 + uTime * 1.6 + vPhase) +
      0.035 * sin(angle * 17.0 - uTime);
    float fireCore =
      1.0 - smoothstep(fireEdge - 0.06, fireEdge + 0.06, radius);

    float horizontalRay =
      exp(-abs(p.y) * 34.0) *
      (1.0 - smoothstep(0.07, 0.98, abs(p.x)));
    float verticalRay =
      exp(-abs(p.x) * 34.0) *
      (1.0 - smoothstep(0.07, 0.98, abs(p.y)));
    float diagonalRay =
      exp(-abs(abs(p.x) - abs(p.y)) * 25.0) *
      (1.0 - smoothstep(0.1, 0.93, radius));
    float rays =
      horizontalRay + verticalRay + diagonalRay * giantAmount * 0.42;

    float cometAlpha = glow * 0.72 + pearl;
    float starAlpha = glow * 0.56 + starShape * 0.96 + rays * 0.46;
    float giantAlpha =
      glow * 0.76 + pearl * 0.86 + rays * 0.66 + starShape * 0.18;
    float alpha = mix(cometAlpha, starAlpha, starAmount);
    alpha = mix(alpha, giantAlpha, giantAmount);
    alpha += iceCrystal * iceAmount * 0.24;
    alpha += fireCore * fireAmount * 0.22;
    alpha *= pulse;

    vec3 color = vInstanceColor *
      (0.76 + pearl * 1.28 + starShape * starAmount * 0.5);
    color += vec3(0.2, 0.46, 0.58) * iceCrystal * iceAmount * 0.34;
    color += vec3(0.55, 0.12, 0.02) * fireCore * fireAmount * 0.27;

    if (alpha < 0.012 || radius > 1.0) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const sparkVertexShader = /* glsl */ `
  attribute float sparkSize;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(
      sparkSize * (390.0 / max(1.0, -viewPosition.z)),
      1.0,
      11.0
    );
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const sparkFragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float radius = length(p);
    float glow = 1.0 - smoothstep(0.05, 0.5, radius);
    float core = 1.0 - smoothstep(0.0, 0.11, radius);
    float crossRay =
      exp(-abs(p.x) * 25.0) + exp(-abs(p.y) * 25.0);
    float alpha = glow * 0.7 + core + crossRay * 0.08;

    if (alpha < 0.015) discard;
    gl_FragColor = vec4(vColor * (0.72 + core), alpha);
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

function smoothFade(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function asVector3(
  value: THREE.Vector3 | [number, number, number] | undefined,
) {
  if (!value) return new THREE.Vector3();
  if (value instanceof THREE.Vector3) return value.clone();
  return new THREE.Vector3(value[0], value[1], value[2]);
}

function setRandomUnitVector(target: THREE.Vector3, random: () => number) {
  const y = randomBetween(random, -1, 1);
  const angle = randomBetween(random, 0, TAU);
  const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
  target.set(Math.cos(angle) * horizontal, y, Math.sin(angle) * horizontal);
  return target;
}

function makeFlight(): Flight {
  return {
    active: false,
    kind: "shooting-star",
    style: 0,
    theme: 0,
    isNear: false,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    radial: new THREE.Vector3(1, 0, 0),
    orbitAxis: new THREE.Vector3(0, 1, 0),
    color: new THREE.Color(),
    age: 0,
    lifetime: 1,
    baseDistance: 300,
    radialPhase: 0,
    radialRate: 0.1,
    radialAmplitude: 0,
    angularVelocity: 0.1,
    trailLength: 40,
    trailWidth: 1,
    headSize: 2,
    sparkAccumulator: 0,
    flickerSeed: 0,
    roll: 0,
    shaderPhase: 0,
  };
}

function makeSpark(): Spark {
  return {
    active: false,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    color: new THREE.Color(),
    age: 0,
    lifetime: 1,
    brightness: 1,
    size: 1,
  };
}

function clearInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  matrix: THREE.Matrix4,
) {
  matrix.makeScale(0, 0, 0);
  mesh.setMatrixAt(index, matrix);
  mesh.setColorAt(index, BLACK);
}

function addFlightAttributes(geometry: THREE.PlaneGeometry, count: number) {
  const styles = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const themes = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const phases = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  styles.setUsage(THREE.DynamicDrawUsage);
  themes.setUsage(THREE.DynamicDrawUsage);
  phases.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("instanceStyle", styles);
  geometry.setAttribute("instanceTheme", themes);
  geometry.setAttribute("instancePhase", phases);
  return { styles, themes, phases };
}

/**
 * Creates a fixed world-space population of romantic comets and shooting stars.
 * The four shared draw calls remain constant regardless of the population size.
 */
export function createMeteorSystem(
  options: MeteorSystemOptions = {},
): MeteorSystem {
  const quality = options.quality ?? "desktop";
  const isMobile = quality === "mobile";
  const maxTrails = Math.max(
    2,
    Math.floor(options.maxTrails ?? (isMobile ? 9 : 20)),
  );
  const maxSparks = Math.max(
    8,
    Math.floor(options.maxSparks ?? (isMobile ? 64 : 168)),
  );
  const random = createSeededRandom(options.seed ?? 0x7a17c0de);
  const group = new THREE.Group();
  group.name = "world-space-cosmic-meteor-system";

  const trailGeometry = new THREE.PlaneGeometry(1, 1, 1, isMobile ? 7 : 11);
  const trailAttributes = addFlightAttributes(trailGeometry, maxTrails);
  const trailMaterial = new THREE.ShaderMaterial({
    name: "world-cosmic-meteor-trails",
    vertexShader: trailVertexShader,
    fragmentShader: trailFragmentShader,
    uniforms: {
      uLayer: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const haloMaterial = trailMaterial.clone();
  haloMaterial.name = "world-cosmic-meteor-trail-halos";
  haloMaterial.uniforms = THREE.UniformsUtils.clone(trailMaterial.uniforms);
  haloMaterial.uniforms.uLayer.value = 1;

  const trails = new THREE.InstancedMesh(
    trailGeometry,
    trailMaterial,
    maxTrails,
  );
  trails.name = "world-meteor-trails";
  trails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trails.frustumCulled = false;
  trails.renderOrder = 8;

  const trailHalos = new THREE.InstancedMesh(
    trailGeometry,
    haloMaterial,
    maxTrails,
  );
  trailHalos.name = "world-meteor-trail-halos";
  trailHalos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trailHalos.frustumCulled = false;
  trailHalos.renderOrder = 7;

  const headGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
  const headAttributes = addFlightAttributes(headGeometry, maxTrails);
  const headMaterial = new THREE.ShaderMaterial({
    name: "world-cosmic-meteor-heads",
    vertexShader: headVertexShader,
    fragmentShader: headFragmentShader,
    uniforms: {
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const heads = new THREE.InstancedMesh(headGeometry, headMaterial, maxTrails);
  heads.name = "world-meteor-heads";
  heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  heads.frustumCulled = false;
  heads.renderOrder = 9;

  const initialMatrix = new THREE.Matrix4();
  for (let index = 0; index < maxTrails; index += 1) {
    clearInstance(trails, index, initialMatrix);
    clearInstance(trailHalos, index, initialMatrix);
    clearInstance(heads, index, initialMatrix);
  }
  trails.instanceColor?.setUsage(THREE.DynamicDrawUsage);
  trailHalos.instanceColor?.setUsage(THREE.DynamicDrawUsage);
  heads.instanceColor?.setUsage(THREE.DynamicDrawUsage);

  const sparkPositions = new Float32Array(maxSparks * 3);
  const sparkColors = new Float32Array(maxSparks * 3);
  const sparkSizes = new Float32Array(maxSparks);
  const sparkGeometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(sparkPositions, 3);
  const colorAttribute = new THREE.BufferAttribute(sparkColors, 3);
  const sizeAttribute = new THREE.BufferAttribute(sparkSizes, 1);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);
  sizeAttribute.setUsage(THREE.DynamicDrawUsage);
  sparkGeometry.setAttribute("position", positionAttribute);
  sparkGeometry.setAttribute("color", colorAttribute);
  sparkGeometry.setAttribute("sparkSize", sizeAttribute);

  const sparkMaterial = new THREE.ShaderMaterial({
    name: "world-cosmic-meteor-sparks",
    vertexShader: sparkVertexShader,
    fragmentShader: sparkFragmentShader,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  sparks.name = "world-meteor-sparks";
  sparks.frustumCulled = false;
  sparks.renderOrder = 9;

  group.add(trailHalos, trails, sparks, heads);

  const publicSystem: MeteorSystem = {
    group,
    quality,
    dispose: () => {
      const state = INTERNALS.get(publicSystem);
      if (!state || state.disposed) return;

      state.disposed = true;
      state.publicSystem.group.remove(
        state.trailHalos,
        state.trails,
        state.heads,
        state.sparks,
      );
      state.publicSystem.group.removeFromParent();
      state.trails.geometry.dispose();
      state.trails.material.dispose();
      state.trailHalos.material.dispose();
      state.heads.geometry.dispose();
      state.heads.material.dispose();
      state.sparks.geometry.dispose();
      state.sparks.material.dispose();
      INTERNALS.delete(publicSystem);
    },
  };

  const internal: InternalSystem = {
    publicSystem,
    trails,
    trailHalos,
    heads,
    sparks,
    sparkPositions,
    sparkColors,
    sparkSizes,
    trailStyles: trailAttributes.styles,
    trailThemes: trailAttributes.themes,
    trailPhases: trailAttributes.phases,
    headStyles: headAttributes.styles,
    headThemes: headAttributes.themes,
    headPhases: headAttributes.phases,
    flights: Array.from({ length: maxTrails }, makeFlight),
    sparkStates: Array.from({ length: maxSparks }, makeSpark),
    random,
    center: asVector3(options.center),
    radius: Math.max(20, options.radius ?? 104),
    shootingStarsPerSecond: Math.max(
      0,
      options.shootingStarsPerSecond ?? (isMobile ? 0.68 : 1.18),
    ),
    meteorsPerSecond: Math.max(
      0,
      options.meteorsPerSecond ?? (isMobile ? 0.09 : 0.16),
    ),
    shootingAccumulator: 0,
    meteorAccumulator: 0,
    giantCooldown: isMobile ? 19 : 14,
    elapsed: 0,
    disposed: false,
    scratch: {
      matrix: new THREE.Matrix4(),
      quaternion: new THREE.Quaternion(),
      headQuaternion: new THREE.Quaternion(),
      headRollQuaternion: new THREE.Quaternion(),
      trailCenter: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      side: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      viewVector: new THREE.Vector3(),
      scale: new THREE.Vector3(),
      displayColor: new THREE.Color(),
      haloColor: new THREE.Color(),
      rotationMatrix: new THREE.Matrix4(),
      tangent: new THREE.Vector3(),
    },
    view: {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      valid: false,
    },
  };
  INTERNALS.set(publicSystem, internal);

  const initialPopulation = Math.min(maxTrails, isMobile ? 4 : 9);
  const initialGiant = spawnFlight(internal, "meteor", 2);
  if (initialGiant) {
    initialGiant.age = randomBetween(random, 4, initialGiant.lifetime * 0.55);
  }
  for (let index = 1; index < initialPopulation; index += 1) {
    const flight = spawnFlight(
      internal,
      index % (isMobile ? 5 : 4) === 0 ? "meteor" : "shooting-star",
    );
    if (flight) {
      flight.age = randomBetween(
        random,
        1.2,
        Math.max(1.3, flight.lifetime * 0.72),
      );
    }
  }

  return publicSystem;
}

function chooseTheme(
  random: () => number,
  kind: FlightKind,
  style: FlightStyle,
): FlightTheme {
  const roll = random();
  if (style === 2) {
    return roll < 0.34 ? 0 : roll < 0.68 ? 1 : 2;
  }
  if (kind === "meteor") {
    return roll < 0.2 ? 0 : roll < 0.47 ? 1 : 2;
  }
  return roll < 0.55 ? 0 : roll < 0.86 ? 1 : 2;
}

function chooseColor(flight: Flight, random: () => number) {
  const palette =
    flight.theme === 1
      ? ICE_COLORS
      : flight.theme === 2
        ? FIRE_COLORS
        : LIGHT_COLORS;
  flight.color.copy(palette[Math.floor(random() * palette.length)]);
  flight.color.lerp(
    WHITE,
    flight.style === 1 ? 0.24 : flight.style === 2 ? 0.12 : 0.08,
  );
}

function setOrbitFrame(state: InternalSystem, flight: Flight) {
  const random = state.random;
  setRandomUnitVector(flight.radial, random);
  setRandomUnitVector(flight.orbitAxis, random);
  flight.orbitAxis.addScaledVector(
    flight.radial,
    -flight.orbitAxis.dot(flight.radial),
  );
  if (flight.orbitAxis.lengthSq() < 0.001) {
    flight.orbitAxis.crossVectors(flight.radial, UP);
    if (flight.orbitAxis.lengthSq() < 0.001) {
      flight.orbitAxis.crossVectors(flight.radial, RIGHT);
    }
  }
  flight.orbitAxis.normalize();
  if (random() < 0.5) flight.orbitAxis.multiplyScalar(-1);
}

function updateFlightPosition(state: InternalSystem, flight: Flight) {
  const distance =
    flight.baseDistance + Math.sin(flight.radialPhase) * flight.radialAmplitude;
  flight.position.copy(state.center).addScaledVector(flight.radial, distance);
  state.scratch.tangent
    .crossVectors(flight.orbitAxis, flight.radial)
    .normalize();
  flight.velocity
    .copy(state.scratch.tangent)
    .multiplyScalar(flight.angularVelocity * distance)
    .addScaledVector(
      flight.radial,
      Math.cos(flight.radialPhase) * flight.radialRate * flight.radialAmplitude,
    );
}

function spawnFlight(
  state: InternalSystem,
  kind: FlightKind,
  forcedStyle?: FlightStyle,
) {
  const flight = state.flights.find((candidate) => !candidate.active);
  if (!flight) return undefined;

  const random = state.random;
  const isMeteor = kind === "meteor";
  const giantReady = state.giantCooldown <= 0;
  const styleRoll = random();
  const style: FlightStyle =
    forcedStyle ??
    (giantReady && isMeteor && styleRoll < 0.2
      ? 2
      : styleRoll < (isMeteor ? 0.22 : 0.34)
        ? 1
        : 0);
  const isGiant = style === 2;
  const nearAlreadyActive = state.flights.some(
    (candidate) => candidate.active && candidate.isNear,
  );
  const isNear =
    !isGiant && !nearAlreadyActive && random() < (isMeteor ? 0.018 : 0.035);

  if (isGiant) {
    state.giantCooldown = randomBetween(
      random,
      state.publicSystem.quality === "mobile" ? 34 : 27,
      state.publicSystem.quality === "mobile" ? 54 : 46,
    );
  }

  flight.active = true;
  flight.kind = kind;
  flight.style = style;
  flight.theme = chooseTheme(random, kind, style);
  flight.isNear = isNear;
  flight.age = 0;
  flight.radialPhase = randomBetween(random, 0, TAU);
  flight.radialRate = randomBetween(
    random,
    isGiant ? 0.025 : 0.055,
    isGiant ? 0.065 : 0.14,
  );
  flight.sparkAccumulator = random();
  flight.flickerSeed = randomBetween(random, 0, TAU);
  flight.roll = randomBetween(random, 0, TAU);
  flight.shaderPhase = randomBetween(random, 0, TAU);
  setOrbitFrame(state, flight);

  const farMinimum = Math.max(220, state.radius * 2.1);
  const farMaximum = Math.max(520, state.radius * 5);
  const nearMinimum = Math.max(88, state.radius * 0.84);
  const nearMaximum = Math.max(
    nearMinimum + 22,
    Math.min(148, state.radius * 1.38),
  );
  const giantMinimum = Math.max(360, state.radius * 3.45);
  const giantMaximum = Math.max(560, state.radius * 5.4);

  flight.baseDistance = isGiant
    ? randomBetween(random, giantMinimum, giantMaximum)
    : isNear
      ? randomBetween(random, nearMinimum, nearMaximum)
      : randomBetween(random, farMinimum, farMaximum);
  flight.radialAmplitude = isGiant
    ? randomBetween(random, 5, 16)
    : isNear
      ? randomBetween(random, 1, 4)
      : randomBetween(random, 2, 10);

  const themeLengthScale =
    flight.theme === 1 ? 1.18 : flight.theme === 2 ? 0.9 : 1.08;
  const themeWidthScale =
    flight.theme === 2 ? 1.24 : flight.theme === 1 ? 0.82 : 1;

  if (isGiant) {
    flight.angularVelocity = randomBetween(random, 0.022, 0.047);
    flight.trailLength = randomBetween(random, 135, 245) * themeLengthScale;
    flight.trailWidth = randomBetween(random, 3.4, 6.4) * themeWidthScale;
    flight.headSize = randomBetween(random, 7.2, 12.5);
    flight.lifetime = randomBetween(random, 46, 78);
  } else if (isNear) {
    flight.angularVelocity = randomBetween(random, 0.28, 0.48);
    flight.trailLength =
      randomBetween(random, isMeteor ? 26 : 18, isMeteor ? 48 : 36) *
      themeLengthScale;
    flight.trailWidth =
      randomBetween(random, isMeteor ? 0.5 : 0.25, isMeteor ? 1 : 0.62) *
      themeWidthScale;
    flight.headSize = randomBetween(
      random,
      flight.style === 1 ? 1.2 : 0.7,
      flight.style === 1 ? 2.2 : 1.45,
    );
    flight.lifetime = randomBetween(random, 3.8, 7.2);
  } else if (isMeteor) {
    flight.angularVelocity = randomBetween(random, 0.065, 0.135);
    flight.trailLength = randomBetween(random, 62, 118) * themeLengthScale;
    flight.trailWidth = randomBetween(random, 1.25, 2.7) * themeWidthScale;
    flight.headSize = randomBetween(
      random,
      flight.style === 1 ? 3.1 : 2.1,
      flight.style === 1 ? 5.4 : 4.2,
    );
    flight.lifetime = randomBetween(random, 20, 38);
  } else {
    flight.angularVelocity = randomBetween(random, 0.075, 0.19);
    flight.trailLength = randomBetween(random, 34, 82) * themeLengthScale;
    flight.trailWidth = randomBetween(random, 0.48, 1.35) * themeWidthScale;
    flight.headSize = randomBetween(
      random,
      flight.style === 1 ? 2.1 : 1.2,
      flight.style === 1 ? 4 : 2.6,
    );
    flight.lifetime = randomBetween(random, 12, 25);
  }

  chooseColor(flight, random);
  updateFlightPosition(state, flight);
  return flight;
}

function updateViewFrame(
  state: InternalSystem,
  camera: THREE.Camera | undefined,
) {
  const view = state.view;
  if (!camera) {
    view.valid = false;
    return;
  }

  camera.updateMatrixWorld();
  camera.getWorldPosition(view.position);
  camera.getWorldQuaternion(view.quaternion);
  view.valid = true;
}

function spawnSpark(
  state: InternalSystem,
  flight: Flight,
  direction: THREE.Vector3,
) {
  const spark = state.sparkStates.find((candidate) => !candidate.active);
  if (!spark) return;

  const random = state.random;
  const scatter = setRandomUnitVector(new THREE.Vector3(), random);
  const isGiant = flight.style === 2;
  const isFire = flight.theme === 2;
  const isIce = flight.theme === 1;

  spark.active = true;
  spark.age = 0;
  spark.lifetime = randomBetween(
    random,
    isGiant ? 1.2 : isFire ? 0.65 : 0.45,
    isGiant ? 2.8 : isIce ? 1.7 : 1.35,
  );
  spark.brightness = randomBetween(random, 0.45, 1.18);
  spark.size =
    flight.trailWidth *
    randomBetween(random, isGiant ? 0.75 : 0.42, isGiant ? 2.4 : 1.75);
  spark.color.copy(flight.color).lerp(WHITE, random() * (isIce ? 0.32 : 0.16));
  spark.position
    .copy(flight.position)
    .addScaledVector(
      direction,
      -randomBetween(random, flight.headSize, flight.trailLength * 0.82),
    )
    .addScaledVector(
      scatter,
      randomBetween(random, flight.trailWidth * 0.2, flight.trailWidth * 2),
    );
  spark.velocity
    .copy(flight.velocity)
    .multiplyScalar(randomBetween(random, 0.08, 0.34))
    .addScaledVector(
      scatter,
      randomBetween(random, isGiant ? 0.8 : 0.35, isGiant ? 3.8 : 2.1),
    );
}

/**
 * Advances fixed world-space trajectories. The optional camera is used only to
 * billboard ribbons and heads; it never changes a body's position or orbit.
 */
export function updateMeteorSystem(
  system: MeteorSystem,
  deltaSeconds: number,
  camera?: THREE.Camera,
) {
  const state = INTERNALS.get(system);
  if (!state || state.disposed || !system.group.visible) return;

  const delta = THREE.MathUtils.clamp(deltaSeconds, 0, 0.1);
  if (delta <= 0) return;
  state.elapsed += delta;
  updateViewFrame(state, camera);
  state.giantCooldown = Math.max(0, state.giantCooldown - delta);
  state.shootingAccumulator += delta * state.shootingStarsPerSecond;
  state.meteorAccumulator += delta * state.meteorsPerSecond;

  while (state.shootingAccumulator >= 1) {
    state.shootingAccumulator -= randomBetween(state.random, 0.72, 1.45);
    spawnFlight(state, "shooting-star");
  }
  while (state.meteorAccumulator >= 1) {
    state.meteorAccumulator -= randomBetween(state.random, 0.82, 1.52);
    spawnFlight(state, "meteor");
  }

  const {
    matrix,
    quaternion,
    headQuaternion,
    headRollQuaternion,
    trailCenter,
    direction,
    side,
    normal,
    viewVector,
    scale,
    displayColor,
    haloColor,
    rotationMatrix,
  } = state.scratch;

  state.flights.forEach((flight, index) => {
    if (!flight.active) {
      clearInstance(state.trails, index, matrix);
      clearInstance(state.trailHalos, index, matrix);
      clearInstance(state.heads, index, matrix);
      return;
    }

    flight.age += delta;
    if (flight.age >= flight.lifetime) {
      flight.active = false;
      clearInstance(state.trails, index, matrix);
      clearInstance(state.trailHalos, index, matrix);
      clearInstance(state.heads, index, matrix);
      return;
    }

    flight.radial.applyAxisAngle(
      flight.orbitAxis,
      flight.angularVelocity * delta,
    );
    flight.radial.normalize();
    flight.radialPhase += flight.radialRate * delta;
    updateFlightPosition(state, flight);
    direction.copy(flight.velocity).normalize();

    const entranceDuration =
      flight.style === 2 ? 3.8 : flight.isNear ? 0.28 : 1.1;
    const exitDuration = flight.style === 2 ? 6.5 : flight.isNear ? 0.75 : 2.2;
    const entrance = smoothFade(flight.age / entranceDuration);
    const exit = smoothFade((flight.lifetime - flight.age) / exitDuration);
    const fade = Math.min(entrance, exit);
    const flicker =
      0.94 +
      Math.sin(state.elapsed * 3.7 + flight.flickerSeed) * 0.035 +
      Math.sin(state.elapsed * 11.3 + flight.flickerSeed * 1.7) * 0.025;
    const visibleLength = flight.trailLength * entrance;

    trailCenter
      .copy(flight.position)
      .addScaledVector(direction, -visibleLength * 0.5);
    if (state.view.valid) {
      viewVector.copy(state.view.position).sub(trailCenter).normalize();
    } else {
      viewVector.set(0, 0, 1);
    }
    side.crossVectors(direction, viewVector);
    if (side.lengthSq() < 0.0001) {
      side.crossVectors(direction, UP);
    }
    if (side.lengthSq() < 0.0001) {
      side.crossVectors(direction, RIGHT);
    }
    side.normalize();
    normal.crossVectors(side, direction).normalize();
    rotationMatrix.makeBasis(side, direction, normal);
    quaternion.setFromRotationMatrix(rotationMatrix);

    scale.set(flight.trailWidth, visibleLength, 1);
    matrix.compose(trailCenter, quaternion, scale);
    state.trails.setMatrixAt(index, matrix);
    displayColor.copy(flight.color).multiplyScalar(fade * flicker);
    state.trails.setColorAt(index, displayColor);

    const haloWidth =
      flight.trailWidth *
      (flight.style === 2 ? 5.6 : flight.theme === 2 ? 4.8 : 4.1);
    scale.set(haloWidth, visibleLength * 1.025, 1);
    matrix.compose(trailCenter, quaternion, scale);
    state.trailHalos.setMatrixAt(index, matrix);
    haloColor
      .copy(flight.color)
      .lerp(WHITE, flight.theme === 1 ? 0.2 : 0.06)
      .multiplyScalar(fade * flicker * (flight.style === 2 ? 0.38 : 0.3));
    state.trailHalos.setColorAt(index, haloColor);

    if (state.view.valid) {
      headQuaternion.copy(state.view.quaternion);
    } else {
      headQuaternion.identity();
    }
    headRollQuaternion.setFromAxisAngle(
      Z_AXIS,
      flight.roll + state.elapsed * (flight.style === 1 ? 0.22 : 0.045),
    );
    headQuaternion.multiply(headRollQuaternion);
    const headPulse =
      flight.headSize *
      fade *
      (0.97 + Math.sin(state.elapsed * 2.6 + flight.flickerSeed) * 0.03);
    scale.set(headPulse, headPulse, 1);
    matrix.compose(flight.position, headQuaternion, scale);
    state.heads.setMatrixAt(index, matrix);
    displayColor
      .copy(flight.color)
      .lerp(WHITE, flight.style === 1 ? 0.46 : flight.theme === 1 ? 0.34 : 0.2)
      .multiplyScalar(fade * flicker);
    state.heads.setColorAt(index, displayColor);

    state.trailStyles.setX(index, flight.style);
    state.trailThemes.setX(index, flight.theme);
    state.trailPhases.setX(index, flight.shaderPhase);
    state.headStyles.setX(index, flight.style);
    state.headThemes.setX(index, flight.theme);
    state.headPhases.setX(index, flight.shaderPhase);

    const sparkRate =
      flight.style === 2
        ? system.quality === "mobile"
          ? 2.4
          : 6
        : flight.kind === "meteor"
          ? system.quality === "mobile"
            ? 1.8
            : 4.5
          : system.quality === "mobile"
            ? 0.35
            : flight.theme === 1
              ? 1.45
              : 0.85;
    flight.sparkAccumulator += delta * sparkRate;
    while (flight.sparkAccumulator >= 1) {
      flight.sparkAccumulator -= 1;
      spawnSpark(state, flight, direction);
    }
  });

  state.trails.material.uniforms.uTime.value = state.elapsed;
  state.trailHalos.material.uniforms.uTime.value = state.elapsed;
  state.heads.material.uniforms.uTime.value = state.elapsed;
  state.trails.instanceMatrix.needsUpdate = true;
  state.trailHalos.instanceMatrix.needsUpdate = true;
  state.heads.instanceMatrix.needsUpdate = true;
  state.trailStyles.needsUpdate = true;
  state.trailThemes.needsUpdate = true;
  state.trailPhases.needsUpdate = true;
  state.headStyles.needsUpdate = true;
  state.headThemes.needsUpdate = true;
  state.headPhases.needsUpdate = true;
  if (state.trails.instanceColor) state.trails.instanceColor.needsUpdate = true;
  if (state.trailHalos.instanceColor) {
    state.trailHalos.instanceColor.needsUpdate = true;
  }
  if (state.heads.instanceColor) state.heads.instanceColor.needsUpdate = true;

  state.sparkStates.forEach((spark, index) => {
    const offset = index * 3;
    if (!spark.active) {
      state.sparkColors[offset] = 0;
      state.sparkColors[offset + 1] = 0;
      state.sparkColors[offset + 2] = 0;
      state.sparkSizes[index] = 0;
      return;
    }

    spark.age += delta;
    if (spark.age >= spark.lifetime) {
      spark.active = false;
      state.sparkColors[offset] = 0;
      state.sparkColors[offset + 1] = 0;
      state.sparkColors[offset + 2] = 0;
      state.sparkSizes[index] = 0;
      return;
    }

    spark.position.addScaledVector(spark.velocity, delta);
    const fade = smoothFade(1 - spark.age / spark.lifetime);
    const brightness = fade * spark.brightness;
    state.sparkPositions[offset] = spark.position.x;
    state.sparkPositions[offset + 1] = spark.position.y;
    state.sparkPositions[offset + 2] = spark.position.z;
    state.sparkColors[offset] = spark.color.r * brightness;
    state.sparkColors[offset + 1] = spark.color.g * brightness;
    state.sparkColors[offset + 2] = spark.color.b * brightness;
    state.sparkSizes[index] = spark.size * (0.5 + fade * 0.5);
  });

  const sparkPositionAttribute = state.sparks.geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  const sparkColorAttribute = state.sparks.geometry.getAttribute(
    "color",
  ) as THREE.BufferAttribute;
  const sparkSizeAttribute = state.sparks.geometry.getAttribute(
    "sparkSize",
  ) as THREE.BufferAttribute;
  sparkPositionAttribute.needsUpdate = true;
  sparkColorAttribute.needsUpdate = true;
  sparkSizeAttribute.needsUpdate = true;
}
