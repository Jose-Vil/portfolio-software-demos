import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type LittleWorldQuality = "low" | "high";

export type LittleWorldSecret = {
  id: "desayuno" | "masajito";
  message: string;
  anchor: THREE.Object3D;
  sprite: THREE.Sprite;
  progress: number;
};

export type LittleWorldsRuntime = {
  group: THREE.Group;
  roseWorld: THREE.Group;
  lamplighterWorld: THREE.Group;
  secrets: LittleWorldSecret[];
  roseBloom: THREE.Group;
  roseDust: THREE.Points;
  domeMaterial: THREE.MeshPhysicalMaterial;
  lamplighterSurface: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  lampLight: THREE.PointLight;
  lampGlow: THREE.Sprite;
  lampCrystal: THREE.Mesh;
  celestialOrbit: THREE.Group;
  sunBody: THREE.Group;
  moonBody: THREE.Group;
  sunLight: THREE.PointLight;
  lampSwitch: THREE.Group;
  lightingArm: THREE.Group;
  wavingArm: THREE.Group;
  rodTipGlow: THREE.Sprite;
};

type LittleWorldUpdate = {
  elapsed: number;
  delta: number;
  motionScale: number;
  camera: THREE.Camera;
  heartPosition: THREE.Vector3;
  exploring: boolean;
};

const TAU = Math.PI * 2;
const anchorWorldPosition = new THREE.Vector3();
const directionToAnchor = new THREE.Vector3();
const directionToHeart = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
const projectedAnchor = new THREE.Vector3();
const projectedHeart = new THREE.Vector3();
const sunLocalDirection = new THREE.Vector3();

function createFresnelMaterial(color: number, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      opacity: { value: opacity },
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
      uniform float opacity;
      varying vec3 vNormal;
      varying vec3 vViewDirection;

      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 2.25);
        gl_FragColor = vec4(glowColor, rim * opacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

function createAsteroidGeometry(radius: number, quality: LittleWorldQuality) {
  const geometry = new THREE.IcosahedronGeometry(
    radius,
    quality === "low" ? 2 : 3,
  );
  const positions = geometry.getAttribute("position");
  const point = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    point.fromBufferAttribute(positions, index);
    const noise =
      Math.sin(point.x * 2.31 + point.z * 1.17) * 0.035 +
      Math.sin(point.y * 3.07 - point.x * 1.43) * 0.024 +
      Math.sin((point.x + point.y + point.z) * 4.1) * 0.013;
    point.normalize().multiplyScalar(radius * (1 + noise));
    positions.setXYZ(index, point.x, point.y, point.z);
  }

  positions.needsUpdate = true;
  const colors = new Float32Array(positions.count * 3);
  const lowColor = new THREE.Color(0x3a241a);
  const soilColor = new THREE.Color(0x8c6038);
  const sunColor = new THREE.Color(0xc89a5c);
  const vertexColor = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    point.fromBufferAttribute(positions, index).normalize();
    const height = THREE.MathUtils.clamp(point.y * 0.5 + 0.5, 0, 1);
    vertexColor
      .copy(lowColor)
      .lerp(soilColor, THREE.MathUtils.smoothstep(height, 0.18, 0.72))
      .lerp(sunColor, THREE.MathUtils.smoothstep(height, 0.7, 1));
    vertexColor.offsetHSL(
      Math.sin(index * 8.17) * 0.008,
      0,
      Math.sin(index * 4.73) * 0.035,
    );
    colors[index * 3] = vertexColor.r;
    colors[index * 3 + 1] = vertexColor.g;
    colors[index * 3 + 2] = vertexColor.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createPetalGeometry(
  width: number,
  height: number,
  curl: number,
  quality: LittleWorldQuality,
) {
  const horizontalSegments = quality === "low" ? 4 : 7;
  const verticalSegments = quality === "low" ? 6 : 10;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let vertical = 0; vertical <= verticalSegments; vertical += 1) {
    const v = vertical / verticalSegments;
    const silhouette = 0.18 + Math.pow(Math.sin(v * Math.PI), 0.62) * 0.82;
    for (
      let horizontal = 0;
      horizontal <= horizontalSegments;
      horizontal += 1
    ) {
      const u = horizontal / horizontalSegments;
      const side = u * 2 - 1;
      positions.push(
        side * width * 0.5 * silhouette,
        v * height,
        curl *
          (Math.sin(v * Math.PI) * 0.52 +
            Math.pow(Math.abs(side), 1.65) * 0.34 -
            v * v * 0.18),
      );
      uvs.push(u, v);
    }
  }

  for (let vertical = 0; vertical < verticalSegments; vertical += 1) {
    for (let horizontal = 0; horizontal < horizontalSegments; horizontal += 1) {
      const row = horizontalSegments + 1;
      const a = vertical * row + horizontal;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createLittlePrinceFigure(quality: LittleWorldQuality) {
  const figure = new THREE.Group();
  figure.name = "little-traveler";

  const skin = new THREE.MeshStandardMaterial({
    color: 0xf2ba91,
    roughness: 0.72,
  });
  const coat = new THREE.MeshPhysicalMaterial({
    color: 0x2476a8,
    emissive: 0x0a2438,
    emissiveIntensity: 0.16,
    roughness: 0.54,
    clearcoat: 0.22,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: 0xf3e3bb,
    roughness: 0.76,
  });
  const scarf = new THREE.MeshStandardMaterial({
    color: 0xc94b50,
    emissive: 0x4a1018,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: 0xe9ba57,
    emissive: 0x573810,
    emissiveIntensity: 0.16,
    roughness: 0.68,
  });

  const coatBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 0.55, 10),
    coat,
  );
  coatBody.position.y = 0.58;
  figure.add(coatBody);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.18,
      quality === "low" ? 10 : 16,
      quality === "low" ? 8 : 12,
    ),
    skin,
  );
  head.position.y = 1.02;
  figure.add(head);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.175,
      quality === "low" ? 10 : 18,
      quality === "low" ? 7 : 12,
    ),
    hair,
  );
  hairCap.scale.set(1.04, 0.62, 1.02);
  hairCap.position.y = 1.14;
  figure.add(hairCap);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x17233a });
  for (const direction of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 6),
      eyeMaterial,
    );
    eye.position.set(direction * 0.058, 1.045, 0.166);
    figure.add(eye);

    const eyeLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.0055, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    eyeLight.position.set(direction * 0.053, 1.052, 0.181);
    figure.add(eyeLight);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 5), skin);
    ear.scale.x = 0.55;
    ear.position.set(direction * 0.18, 1.02, 0);
    figure.add(ear);

    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.023, 7, 5),
      new THREE.MeshBasicMaterial({
        color: 0xf58c91,
        transparent: true,
        opacity: 0.42,
      }),
    );
    cheek.scale.z = 0.18;
    cheek.position.set(direction * 0.095, 0.995, 0.17);
    figure.add(cheek);
  }

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.007, 5, 14, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x8e3e3e }),
  );
  smile.position.set(0, 0.97, 0.172);
  smile.rotation.z = Math.PI;
  figure.add(smile);

  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.025), cream);
  shirt.position.set(0, 0.65, 0.18);
  figure.add(shirt);

  const lapelMaterial = new THREE.MeshStandardMaterial({
    color: 0x68b7da,
    roughness: 0.55,
  });
  for (const direction of [-1, 1]) {
    const lapel = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.31, 0.028),
      lapelMaterial,
    );
    lapel.position.set(direction * 0.07, 0.7, 0.205);
    lapel.rotation.z = direction * 0.27;
    figure.add(lapel);
  }

  const coatTailGeometry = new THREE.PlaneGeometry(0.18, 0.38, 2, 3);
  for (const direction of [-1, 1]) {
    const coatTail = new THREE.Mesh(coatTailGeometry, coat);
    coatTail.position.set(direction * 0.1, 0.33, -0.09);
    coatTail.rotation.y = direction * 0.16;
    coatTail.rotation.z = direction * 0.08;
    figure.add(coatTail);
  }

  for (const buttonY of [0.56, 0.68, 0.8]) {
    const button = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 7, 5),
      new THREE.MeshStandardMaterial({
        color: 0xffd170,
        metalness: 0.55,
        roughness: 0.3,
      }),
    );
    button.position.set(0, buttonY, 0.215);
    figure.add(button);
  }

  for (const direction of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.42, 7),
      cream,
    );
    leg.position.set(direction * 0.085, 0.16, 0);
    figure.add(leg);

    const boot = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x35231d,
        roughness: 0.9,
      }),
    );
    boot.scale.set(1, 0.55, 1.35);
    boot.position.set(direction * 0.085, -0.04, 0.035);
    figure.add(boot);

    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.047, 0.43, 7),
      coat,
    );
    arm.position.set(direction * 0.23, 0.61, 0);
    arm.rotation.z = direction * 0.43;
    figure.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), skin);
    hand.position.set(direction * 0.33, 0.42, 0);
    figure.add(hand);
  }

  const scarfRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.035, 7, 20),
    scarf,
  );
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.position.y = 0.86;
  figure.add(scarfRing);

  const scarfTail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.13, 3, 1),
    scarf,
  );
  scarfTail.position.set(-0.26, 0.83, -0.02);
  scarfTail.rotation.z = 0.18;
  figure.add(scarfTail);

  const hairSpikeGeometry = new THREE.ConeGeometry(0.065, 0.25, 7);
  const hairSpikeCount = quality === "low" ? 10 : 15;
  for (let index = 0; index < hairSpikeCount; index += 1) {
    const angle = (index / hairSpikeCount) * TAU;
    const spike = new THREE.Mesh(hairSpikeGeometry, hair);
    spike.position.set(
      Math.cos(angle) * 0.125,
      1.19 + Math.sin(index * 2.1) * 0.032,
      Math.sin(angle) * 0.125,
    );
    spike.scale.y = 0.8 + (index % 4) * 0.13;
    spike.rotation.z = Math.cos(angle) * 0.56;
    spike.rotation.x = Math.sin(angle) * 0.56;
    figure.add(spike);
  }

  return figure;
}

function createCouponTexture(message: string, quality: LittleWorldQuality) {
  const width = quality === "low" ? 768 : 1024;
  const height = quality === "low" ? 224 : 280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#7eeeff");
  gradient.addColorStop(0.36, "#ff8bd1");
  gradient.addColorStop(0.68, "#fff2fb");
  gradient.addColorStop(1, "#a989ff");

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255, 225, 247, 0.82)";
  context.font = `700 ${quality === "low" ? 24 : 29}px Arial`;
  context.letterSpacing = `${quality === "low" ? 5 : 7}px`;
  context.shadowColor = "rgba(255, 57, 164, 0.95)";
  context.shadowBlur = quality === "low" ? 14 : 22;
  context.fillText("SECRETO ENCONTRADO", width / 2, height * 0.23);

  context.letterSpacing = "0px";
  context.font = `italic 700 ${quality === "low" ? 37 : 47}px Georgia`;
  context.fillStyle = gradient;
  context.shadowBlur = quality === "low" ? 18 : 30;

  const words = message.split(" ");
  const lines: string[] = [];
  let line = "";
  const maxWidth = width * 0.88;
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);

  const lineHeight = quality === "low" ? 48 : 60;
  const firstLineY = height * 0.58 - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 3).forEach((text, index) => {
    context.fillText(text, width / 2, firstLineY + index * lineHeight);
  });

  context.strokeStyle = "rgba(255, 119, 203, 0.58)";
  context.lineWidth = quality === "low" ? 2 : 3;
  context.shadowBlur = quality === "low" ? 10 : 18;
  context.beginPath();
  context.moveTo(width * 0.31, height * 0.88);
  context.lineTo(width * 0.69, height * 0.88);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createSecretSprite(
  id: LittleWorldSecret["id"],
  message: string,
  quality: LittleWorldQuality,
) {
  const material = new THREE.SpriteMaterial({
    map: createCouponTexture(message, quality),
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(
    quality === "low" ? 20 : 23,
    quality === "low" ? 5.8 : 6.3,
    1,
  );
  sprite.renderOrder = 40;
  sprite.visible = false;
  return { id, message, sprite };
}

function createRoseWorld(
  quality: LittleWorldQuality,
  glowTexture: THREE.Texture,
) {
  const world = new THREE.Group();
  world.position.set(-88, 22, -56);

  const asteroid = new THREE.Mesh(
    createAsteroidGeometry(3.55, quality),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x2d140d,
      emissiveIntensity: 0.18,
      roughness: 0.92,
      metalness: 0.04,
      clearcoat: 0.08,
      vertexColors: true,
    }),
  );
  asteroid.scale.y = 0.76;
  world.add(asteroid);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(
      3.78,
      quality === "low" ? 28 : 42,
      quality === "low" ? 18 : 28,
    ),
    createFresnelMaterial(0xffb05d, 0.62),
  );
  atmosphere.scale.y = 0.77;
  world.add(atmosphere);

  const topY = 2.66;
  const garden = new THREE.Group();
  garden.position.y = topY;
  world.add(garden);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 1.52, 0.18, 30),
    new THREE.MeshStandardMaterial({
      color: 0x49301f,
      roughness: 1,
      metalness: 0,
    }),
  );
  garden.add(soil);

  const glassBase = new THREE.Mesh(
    new THREE.TorusGeometry(1.48, 0.07, 8, 64),
    new THREE.MeshStandardMaterial({
      color: 0xffc977,
      emissive: 0x8a451f,
      emissiveIntensity: 0.4,
      metalness: 0.75,
      roughness: 0.25,
    }),
  );
  glassBase.rotation.x = Math.PI / 2;
  glassBase.position.y = 0.08;
  garden.add(glassBase);

  const domeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfff1dd,
    emissive: 0xff82b9,
    emissiveIntensity: 0.16,
    transparent: true,
    opacity: 0.19,
    roughness: 0.04,
    metalness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const domeWall = new THREE.Mesh(
    new THREE.CylinderGeometry(
      1.42,
      1.48,
      1.38,
      quality === "low" ? 24 : 42,
      1,
      true,
    ),
    domeMaterial,
  );
  domeWall.position.y = 0.78;
  garden.add(domeWall);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(
      1.42,
      quality === "low" ? 28 : 46,
      quality === "low" ? 12 : 22,
      0,
      TAU,
      0,
      Math.PI / 2,
    ),
    domeMaterial,
  );
  dome.position.y = 1.46;
  garden.add(dome);

  const domeNeck = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.035, 7, 28),
    new THREE.MeshStandardMaterial({
      color: 0xffcb77,
      emissive: 0x7f3f1e,
      emissiveIntensity: 0.46,
      metalness: 0.78,
      roughness: 0.24,
    }),
  );
  domeNeck.rotation.x = Math.PI / 2;
  domeNeck.position.y = 2.87;
  garden.add(domeNeck);

  const domeHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.035, 7, 30, Math.PI * 1.65),
    domeNeck.material,
  );
  domeHandle.position.y = 3.05;
  garden.add(domeHandle);

  const roseBloom = new THREE.Group();
  roseBloom.position.y = 0.14;
  roseBloom.scale.setScalar(1.1);
  garden.add(roseBloom);

  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(-0.035, 0.42, 0.018),
    new THREE.Vector3(0.045, 0.88, -0.025),
    new THREE.Vector3(0, 1.35, 0),
  ]);
  const stem = new THREE.Mesh(
    new THREE.TubeGeometry(
      stemCurve,
      quality === "low" ? 10 : 18,
      0.055,
      quality === "low" ? 7 : 10,
      false,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x1f733d,
      emissive: 0x0b2b18,
      emissiveIntensity: 0.2,
      roughness: 0.82,
    }),
  );
  roseBloom.add(stem);

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x3fa95c,
    emissive: 0x123d20,
    emissiveIntensity: 0.24,
    roughness: 0.72,
  });
  for (const [direction, height, twist] of [
    [-1, 0.54, -0.18],
    [1, 0.76, 0.2],
    [-1, 0.96, 0.28],
  ] as const) {
    const leafRoot = new THREE.Group();
    leafRoot.position.set(direction * 0.05, height, 0);
    leafRoot.rotation.y = twist;
    leafRoot.rotation.z = direction * 0.5;
    roseBloom.add(leafRoot);

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.29,
        quality === "low" ? 10 : 16,
        quality === "low" ? 7 : 10,
      ),
      leafMaterial,
    );
    leaf.position.x = direction * 0.2;
    leaf.scale.set(1, 0.18, 0.48);
    leafRoot.add(leaf);

    const vein = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.016, 0.48, 5),
      new THREE.MeshStandardMaterial({
        color: 0xa5d786,
        roughness: 0.76,
      }),
    );
    vein.position.x = direction * 0.2;
    vein.rotation.z = Math.PI / 2;
    leafRoot.add(vein);
  }

  const thornMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a743d,
    roughness: 0.86,
  });
  for (const [height, direction] of [
    [0.35, 1],
    [0.68, -1],
    [1.02, 1],
  ] as const) {
    const thorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.18, 6),
      thornMaterial,
    );
    thorn.position.set(direction * 0.075, height, 0);
    thorn.rotation.z = direction * -1.18;
    roseBloom.add(thorn);
  }

  const petalLayers = [
    {
      count: quality === "low" ? 8 : 11,
      radius: 0.24,
      width: 0.36,
      height: 0.5,
      curl: 0.12,
      y: 1.25,
      tilt: -0.46,
      color: 0xc70b3f,
      emissive: 0x590017,
    },
    {
      count: quality === "low" ? 7 : 10,
      radius: 0.15,
      width: 0.31,
      height: 0.44,
      curl: 0.1,
      y: 1.3,
      tilt: -0.22,
      color: 0xed174f,
      emissive: 0x76001f,
    },
    {
      count: quality === "low" ? 5 : 8,
      radius: 0.07,
      width: 0.23,
      height: 0.36,
      curl: 0.075,
      y: 1.36,
      tilt: 0.04,
      color: 0xff416f,
      emissive: 0xa30035,
    },
  ];

  petalLayers.forEach((layer, layerIndex) => {
    const petalGeometry = createPetalGeometry(
      layer.width,
      layer.height,
      layer.curl,
      quality,
    );
    const petalMaterial = new THREE.MeshPhysicalMaterial({
      color: layer.color,
      emissive: layer.emissive,
      emissiveIntensity: 0.58,
      roughness: 0.28,
      metalness: 0.03,
      clearcoat: 0.86,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    });
    for (let index = 0; index < layer.count; index += 1) {
      const angle = (index / layer.count) * TAU + layerIndex * 0.42;
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      petal.position.set(
        Math.cos(angle) * layer.radius,
        layer.y + Math.sin(index * 2.73) * 0.015,
        Math.sin(angle) * layer.radius,
      );
      petal.rotation.set(
        layer.tilt + Math.sin(angle * 2) * 0.08,
        Math.PI / 2 - angle,
        Math.cos(angle * 3) * 0.06,
      );
      roseBloom.add(petal);
    }
  });

  const sepalMaterial = new THREE.MeshStandardMaterial({
    color: 0x27733e,
    emissive: 0x0b2c19,
    emissiveIntensity: 0.2,
    roughness: 0.78,
  });
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TAU;
    const sepal = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.32, 5),
      sepalMaterial,
    );
    sepal.position.set(Math.cos(angle) * 0.18, 1.27, Math.sin(angle) * 0.18);
    sepal.rotation.z = Math.cos(angle) * 0.64;
    sepal.rotation.x = Math.sin(angle) * 0.64;
    roseBloom.add(sepal);
  }

  const roseHeart = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffc06f }),
  );
  roseHeart.position.y = 1.56;
  roseBloom.add(roseHeart);

  const dewMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8f7ff,
    emissive: 0x89cfff,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.76,
    roughness: 0.03,
    metalness: 0,
    clearcoat: 1,
    transmission: 0.42,
  });
  for (const [x, y, z, scale] of [
    [-0.22, 1.58, 0.2, 1],
    [0.18, 1.66, 0.12, 0.72],
    [0.26, 1.48, -0.08, 0.62],
    [-0.11, 1.72, -0.16, 0.54],
  ] as const) {
    const dew = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 * scale, 9, 7),
      dewMaterial,
    );
    dew.scale.y = 1.28;
    dew.position.set(x, y, z);
    roseBloom.add(dew);
  }

  const roseGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xff4f9e,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  roseGlow.position.y = 1.45;
  roseGlow.scale.set(2.3, 2.3, 1);
  roseBloom.add(roseGlow);

  const dustCount = quality === "low" ? 22 : 42;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    const angle = (index / dustCount) * TAU * 3.7;
    const radius = 0.25 + ((index * 17) % 29) / 29;
    dustPositions[index * 3] = Math.cos(angle) * radius;
    dustPositions[index * 3 + 1] = 0.28 + (((index * 11) % 31) / 31) * 1.05;
    dustPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(dustPositions, 3),
  );
  const roseDust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xffd6ec,
      size: quality === "low" ? 0.055 : 0.07,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  garden.add(roseDust);

  const surfaceHeightAt = (x: number, z: number) =>
    Math.sqrt(Math.max(0, 3.55 * 3.55 - x * x - z * z)) * 0.76;

  const rockGeometry = new THREE.DodecahedronGeometry(0.18, 0);
  const rocks = new THREE.InstancedMesh(
    rockGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x6d4b32,
      roughness: 1,
      metalness: 0,
    }),
    quality === "low" ? 10 : 18,
  );
  const rockMatrix = new THREE.Matrix4();
  const rockQuaternion = new THREE.Quaternion();
  const rockScale = new THREE.Vector3();
  const rockPosition = new THREE.Vector3();
  for (let index = 0; index < rocks.count; index += 1) {
    const angle = index * 2.39996 + 0.4;
    const radius = 1.55 + (((index * 7) % 13) / 13) * 1.35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    rockPosition.set(x, surfaceHeightAt(x, z) + 0.06, z);
    rockQuaternion.setFromEuler(
      new THREE.Euler(index * 0.47, angle, index * 0.29),
    );
    const scale = 0.55 + ((index * 11) % 17) / 17;
    rockScale.set(scale, scale * (0.55 + (index % 3) * 0.12), scale);
    rockMatrix.compose(rockPosition, rockQuaternion, rockScale);
    rocks.setMatrixAt(index, rockMatrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  world.add(rocks);

  const craterMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b251c,
    emissive: 0x170b08,
    emissiveIntensity: 0.16,
    roughness: 1,
  });
  for (const [x, z, radius] of [
    [-2.05, 0.72, 0.29],
    [2.24, -0.58, 0.22],
    [-0.9, 2.2, 0.18],
  ] as const) {
    const crater = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius * 0.13, 6, 22),
      craterMaterial,
    );
    crater.rotation.x = Math.PI / 2;
    crater.position.set(x, surfaceHeightAt(x, z) + 0.04, z);
    world.add(crater);
  }

  const grass = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.035, 0.31, 4),
    new THREE.MeshStandardMaterial({
      color: 0x6e9d4c,
      emissive: 0x1b3515,
      emissiveIntensity: 0.16,
      roughness: 0.9,
    }),
    quality === "low" ? 12 : 24,
  );
  for (let index = 0; index < grass.count; index += 1) {
    const angle = index * 1.83;
    const radius = 1.55 + (((index * 5) % 17) / 17) * 1.15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    rockPosition.set(x, surfaceHeightAt(x, z) + 0.15, z);
    rockQuaternion.setFromEuler(
      new THREE.Euler(Math.sin(angle) * 0.16, angle, Math.cos(angle) * 0.16),
    );
    const scale = 0.7 + (index % 4) * 0.1;
    rockScale.set(scale, scale, scale);
    rockMatrix.compose(rockPosition, rockQuaternion, rockScale);
    grass.setMatrixAt(index, rockMatrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  world.add(grass);

  const volcanoMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f4328,
    emissive: 0x35170d,
    emissiveIntensity: 0.22,
    roughness: 0.95,
  });
  for (const [x, z, scale] of [
    [-1.9, -0.72, 1],
    [1.86, 0.88, 0.82],
    [0.82, -2.18, 0.66],
  ] as const) {
    const volcanoRoot = new THREE.Group();
    volcanoRoot.position.set(x, surfaceHeightAt(x, z) - 0.12, z);
    world.add(volcanoRoot);

    const volcano = new THREE.Mesh(
      new THREE.ConeGeometry(
        0.44 * scale,
        0.76 * scale,
        quality === "low" ? 9 : 14,
        2,
        true,
      ),
      volcanoMaterial,
    );
    volcano.position.y = 0.3 * scale;
    volcanoRoot.add(volcano);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.16 * scale, 0.045 * scale, 6, 18),
      craterMaterial,
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.68 * scale;
    volcanoRoot.add(rim);

    const ember = new THREE.Mesh(
      new THREE.CircleGeometry(0.12 * scale, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff7b39,
        transparent: true,
        opacity: 0.68,
      }),
    );
    ember.rotation.x = -Math.PI / 2;
    ember.position.y = 0.675 * scale;
    volcanoRoot.add(ember);
  }

  const littlePrince = createLittlePrinceFigure(quality);
  littlePrince.position.set(1.72, surfaceHeightAt(1.72, 0.42) + 0.05, 0.42);
  littlePrince.rotation.y = -0.58;
  littlePrince.scale.setScalar(1.12);
  world.add(littlePrince);

  const wateringCan = new THREE.Group();
  wateringCan.position.set(1.2, surfaceHeightAt(1.2, 1.25) + 0.08, 1.25);
  wateringCan.rotation.z = -0.16;
  world.add(wateringCan);
  const canMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7c8ce,
    metalness: 0.72,
    roughness: 0.34,
  });
  wateringCan.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.25, 10),
      canMaterial,
    ),
  );
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.07, 0.42, 8),
    canMaterial,
  );
  spout.position.set(-0.2, 0.1, 0);
  spout.rotation.z = Math.PI / 2.8;
  wateringCan.add(spout);

  const secretData = createSecretSprite(
    "desayuno",
    "Si ves esto, te ganaste un cupón para un desayunito en la cama.",
    quality,
  );
  const secretAnchor = new THREE.Object3D();
  secretAnchor.position.set(0, 1.35, 0);
  garden.add(secretAnchor);
  secretData.sprite.position.copy(secretAnchor.position);
  garden.add(secretData.sprite);

  return {
    world,
    roseBloom,
    roseDust,
    domeMaterial,
    secret: {
      ...secretData,
      anchor: secretAnchor,
      progress: 0,
    } satisfies LittleWorldSecret,
  };
}

function createDayNightMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.82, 0.24, 0.52).normalize() },
      uDayColor: { value: new THREE.Color(0xf5a34f) },
      uSunsetColor: { value: new THREE.Color(0xe85b7d) },
      uNightColor: { value: new THREE.Color(0x11163f) },
      uDeepNightColor: { value: new THREE.Color(0x030719) },
    },
    vertexShader: `
      varying vec3 vLocalNormal;
      varying vec3 vLocalPosition;

      void main() {
        vLocalNormal = normalize(normal);
        vLocalPosition = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDirection;
      uniform vec3 uDayColor;
      uniform vec3 uSunsetColor;
      uniform vec3 uNightColor;
      uniform vec3 uDeepNightColor;
      varying vec3 vLocalNormal;
      varying vec3 vLocalPosition;

      float hash(vec3 point) {
        return fract(sin(dot(point, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      }

      void main() {
        float lightAmount = dot(normalize(vLocalNormal), normalize(uSunDirection));
        float daylight = smoothstep(-0.12, 0.2, lightAmount);
        float sunset = 1.0 - smoothstep(0.02, 0.36, abs(lightAmount));
        float latitudeGlow = 0.5 + vLocalPosition.y * 0.25;
        vec3 day = mix(uSunsetColor, uDayColor, latitudeGlow);
        vec3 night = mix(uDeepNightColor, uNightColor, 0.54 + vLocalPosition.y * 0.22);
        float starNoise = hash(floor(vLocalPosition * 92.0));
        float stars = step(0.986, starNoise) * (1.0 - daylight);
        vec3 color = mix(night, day, daylight);
        color += uSunsetColor * sunset * 0.24;
        color += vec3(0.72, 0.84, 1.0) * stars * (0.55 + sin(uTime * 1.7 + starNoise * 20.0) * 0.22);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function createLamplighterWorld(
  quality: LittleWorldQuality,
  glowTexture: THREE.Texture,
) {
  const world = new THREE.Group();
  world.position.set(86, 17, -58);

  const lamplighterSurface = new THREE.Mesh(
    new THREE.SphereGeometry(
      3.6,
      quality === "low" ? 32 : 52,
      quality === "low" ? 20 : 34,
    ),
    createDayNightMaterial(),
  );
  lamplighterSurface.scale.y = 0.86;
  world.add(lamplighterSurface);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(
      3.86,
      quality === "low" ? 28 : 42,
      quality === "low" ? 18 : 28,
    ),
    createFresnelMaterial(0x9aa8ff, 0.7),
  );
  atmosphere.scale.y = 0.87;
  world.add(atmosphere);

  const celestialOrbit = new THREE.Group();
  celestialOrbit.name = "sun-and-moon-orbit";
  celestialOrbit.rotation.x = 0.28;
  celestialOrbit.rotation.y = -0.18;
  world.add(celestialOrbit);

  const orbitGuide = new THREE.Mesh(
    new THREE.TorusGeometry(7.25, 0.018, 5, 96),
    new THREE.MeshBasicMaterial({
      color: 0x9cc9ff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  celestialOrbit.add(orbitGuide);

  const sunBody = new THREE.Group();
  sunBody.position.x = 7.25;
  celestialOrbit.add(sunBody);
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.58,
      quality === "low" ? 16 : 28,
      quality === "low" ? 10 : 18,
    ),
    new THREE.MeshBasicMaterial({ color: 0xffd36e }),
  );
  sunBody.add(sunCore);
  const sunCorona = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffad3f,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sunCorona.scale.set(3.3, 3.3, 1);
  sunBody.add(sunCorona);
  const sunLight = new THREE.PointLight(0xffb866, 18, 30, 1.6);
  sunBody.add(sunLight);

  const moonBody = new THREE.Group();
  moonBody.position.x = -7.25;
  celestialOrbit.add(moonBody);
  const moonCore = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.5,
      quality === "low" ? 14 : 24,
      quality === "low" ? 9 : 16,
    ),
    new THREE.MeshStandardMaterial({
      color: 0xb9c9e3,
      emissive: 0x33436a,
      emissiveIntensity: 0.62,
      roughness: 0.92,
    }),
  );
  moonBody.add(moonCore);
  const moonCraterMaterial = new THREE.MeshStandardMaterial({
    color: 0x667593,
    roughness: 1,
  });
  for (const [x, y, scale] of [
    [-0.17, 0.17, 1],
    [0.19, 0.08, 0.72],
    [-0.08, -0.2, 0.58],
  ] as const) {
    const crater = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 * scale, 8, 5),
      moonCraterMaterial,
    );
    crater.position.set(x, y, 0.46);
    crater.scale.z = 0.18;
    moonBody.add(crater);
  }
  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xaecbff,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  moonHalo.scale.set(2.35, 2.35, 1);
  moonBody.add(moonHalo);

  const topY = 3.08;
  const brass = new THREE.MeshStandardMaterial({
    color: 0x8c5c2f,
    emissive: 0x3d210c,
    emissiveIntensity: 0.34,
    metalness: 0.72,
    roughness: 0.34,
  });
  const silhouette = new THREE.MeshStandardMaterial({
    color: 0x171326,
    emissive: 0x090712,
    emissiveIntensity: 0.12,
    roughness: 0.86,
  });

  const lampRoot = new THREE.Group();
  lampRoot.position.set(0.68, topY, 0);
  world.add(lampRoot);

  const lampParts = [
    new THREE.CylinderGeometry(0.055, 0.075, 1.62, 9),
    new THREE.BoxGeometry(0.72, 0.06, 0.07),
    new THREE.CylinderGeometry(0.1, 0.16, 0.12, 10),
  ];
  lampParts[0].translate(0, 0.81, 0);
  lampParts[1].translate(-0.28, 1.55, 0);
  lampParts[2].translate(0, 0.06, 0);
  const mergedLamp = mergeGeometries(lampParts, false);
  lampParts.forEach((geometry) => geometry.dispose());
  if (mergedLamp) lampRoot.add(new THREE.Mesh(mergedLamp, brass));

  const lanternFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.52, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0x5f3b22,
      emissive: 0x2f1b0c,
      emissiveIntensity: 0.28,
      metalness: 0.78,
      roughness: 0.3,
      wireframe: true,
    }),
  );
  lanternFrame.position.set(-0.62, 1.3, 0);
  lampRoot.add(lanternFrame);

  const lampCrystal = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.39, 0.28),
    new THREE.MeshStandardMaterial({
      color: 0xfff1bd,
      emissive: 0xffaa3f,
      emissiveIntensity: 2.25,
      transparent: true,
      opacity: 0.92,
      roughness: 0.1,
    }),
  );
  lampCrystal.position.copy(lanternFrame.position);
  lampRoot.add(lampCrystal);

  const lampGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffc15c,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  lampGlow.position.copy(lanternFrame.position);
  lampGlow.scale.set(3.6, 3.6, 1);
  lampRoot.add(lampGlow);

  const lampLight = new THREE.PointLight(0xffb049, 27, 20, 1.8);
  lampLight.position.copy(lanternFrame.position);
  lampRoot.add(lampLight);

  const lampSwitch = new THREE.Group();
  lampSwitch.position.set(-0.1, 0.92, 0.12);
  lampRoot.add(lampSwitch);
  const switchBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.08, 10),
    brass,
  );
  switchBase.rotation.x = Math.PI / 2;
  lampSwitch.add(switchBase);
  const switchLever = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.026, 0.3, 6),
    new THREE.MeshStandardMaterial({
      color: 0xd9a74d,
      metalness: 0.7,
      roughness: 0.28,
    }),
  );
  switchLever.position.y = 0.13;
  lampSwitch.add(switchLever);

  const person = new THREE.Group();
  person.position.set(-0.72, topY, 0.14);
  world.add(person);

  const coatMaterial = new THREE.MeshStandardMaterial({
    color: 0x44345f,
    emissive: 0x130c20,
    emissiveIntensity: 0.18,
    roughness: 0.76,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.23, 0.74, 8),
    coatMaterial,
  );
  body.position.y = 0.48;
  person.add(body);

  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.025, 6, 18),
    brass,
  );
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.44;
  person.add(belt);

  for (const buttonY of [0.48, 0.64, 0.78]) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.022, 7, 5), brass);
    button.position.set(0, buttonY, 0.205);
    person.add(button);
  }

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xd9a27a,
      emissive: 0x3a1d18,
      emissiveIntensity: 0.16,
      roughness: 0.84,
    }),
  );
  head.position.y = 1.01;
  person.add(head);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.11, 6),
    head.material,
  );
  nose.position.set(0, 1, 0.18);
  nose.rotation.x = Math.PI / 2;
  person.add(nose);

  const moustache = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.012, 5, 14, Math.PI),
    silhouette,
  );
  moustache.position.set(0, 0.96, 0.17);
  moustache.rotation.z = Math.PI;
  person.add(moustache);

  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.055, 12),
    silhouette,
  );
  hatBrim.position.y = 1.17;
  person.add(hatBrim);
  const hatTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.19, 0.3, 10),
    silhouette,
  );
  hatTop.position.y = 1.32;
  person.add(hatTop);

  for (const direction of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 0.46, 7),
      silhouette,
    );
    leg.position.set(direction * 0.1, 0.06, 0);
    leg.rotation.z = direction * 0.08;
    person.add(leg);
  }

  const lightingArm = new THREE.Group();
  lightingArm.position.set(0.2, 0.8, 0.04);
  lightingArm.rotation.z = 0.9;
  person.add(lightingArm);
  const lightingSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.057, 0.5, 8),
    coatMaterial,
  );
  lightingSleeve.position.y = -0.23;
  lightingArm.add(lightingSleeve);
  const lightingHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 9, 7),
    head.material,
  );
  lightingHand.position.y = -0.5;
  lightingArm.add(lightingHand);

  const rodMaterial = new THREE.MeshStandardMaterial({
    color: 0x84552d,
    emissive: 0x2c1608,
    emissiveIntensity: 0.18,
    roughness: 0.58,
    metalness: 0.24,
  });
  const lightingRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.028, 0.78, 7),
    rodMaterial,
  );
  lightingRod.position.y = -0.88;
  lightingArm.add(lightingRod);
  const rodHook = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.022, 6, 18, Math.PI * 1.15),
    rodMaterial,
  );
  rodHook.position.set(0.07, -1.25, 0);
  rodHook.rotation.z = Math.PI * 0.1;
  lightingArm.add(rodHook);
  const rodTipGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffc86b,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  rodTipGlow.position.set(0, -1.27, 0);
  rodTipGlow.scale.set(0.56, 0.56, 1);
  lightingArm.add(rodTipGlow);

  const wavingArm = new THREE.Group();
  wavingArm.position.set(-0.2, 0.8, 0.02);
  wavingArm.rotation.z = -1.02;
  person.add(wavingArm);
  const wavingSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.057, 0.5, 8),
    coatMaterial,
  );
  wavingSleeve.position.y = -0.23;
  wavingArm.add(wavingSleeve);
  const wavingHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.066, 9, 7),
    head.material,
  );
  wavingHand.position.y = -0.5;
  wavingArm.add(wavingHand);

  const pavingMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f6681,
    emissive: 0x181426,
    emissiveIntensity: 0.12,
    roughness: 0.96,
  });
  const paving = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.16, 0),
    pavingMaterial,
    quality === "low" ? 12 : 22,
  );
  const pavingMatrix = new THREE.Matrix4();
  const pavingPosition = new THREE.Vector3();
  const pavingRotation = new THREE.Quaternion();
  const pavingScale = new THREE.Vector3();
  for (let index = 0; index < paving.count; index += 1) {
    const angle = index * 2.39996;
    const radius = 0.45 + (((index * 7) % 11) / 11) * 1.15;
    pavingPosition.set(
      Math.cos(angle) * radius,
      topY - 0.04 - radius * radius * 0.025,
      Math.sin(angle) * radius,
    );
    pavingRotation.setFromEuler(
      new THREE.Euler(index * 0.24, angle, index * 0.17),
    );
    const scale = 0.7 + (index % 4) * 0.11;
    pavingScale.set(scale, scale * 0.32, scale);
    pavingMatrix.compose(pavingPosition, pavingRotation, pavingScale);
    paving.setMatrixAt(index, pavingMatrix);
  }
  paving.instanceMatrix.needsUpdate = true;
  world.add(paving);

  const secretData = createSecretSprite(
    "masajito",
    "Si ves esto, te ganaste un cupón para un masajito antiestrés.",
    quality,
  );
  const secretAnchor = new THREE.Object3D();
  secretAnchor.position.copy(lampCrystal.position);
  lampRoot.add(secretAnchor);
  secretData.sprite.position.copy(lampCrystal.position);
  lampRoot.add(secretData.sprite);

  return {
    world,
    lamplighterSurface,
    lampLight,
    lampGlow,
    lampCrystal,
    celestialOrbit,
    sunBody,
    moonBody,
    sunLight,
    lampSwitch,
    lightingArm,
    wavingArm,
    rodTipGlow,
    secret: {
      ...secretData,
      anchor: secretAnchor,
      progress: 0,
    } satisfies LittleWorldSecret,
  };
}

export function createLittleWorlds({
  quality,
  glowTexture,
}: {
  quality: LittleWorldQuality;
  glowTexture: THREE.Texture;
}): LittleWorldsRuntime {
  const group = new THREE.Group();
  group.name = "little-prince-inspired-worlds";

  const rose = createRoseWorld(quality, glowTexture);
  const lamplighter = createLamplighterWorld(quality, glowTexture);
  group.add(rose.world, lamplighter.world);

  return {
    group,
    roseWorld: rose.world,
    lamplighterWorld: lamplighter.world,
    secrets: [rose.secret, lamplighter.secret],
    roseBloom: rose.roseBloom,
    roseDust: rose.roseDust,
    domeMaterial: rose.domeMaterial,
    lamplighterSurface: lamplighter.lamplighterSurface,
    lampLight: lamplighter.lampLight,
    lampGlow: lamplighter.lampGlow,
    lampCrystal: lamplighter.lampCrystal,
    celestialOrbit: lamplighter.celestialOrbit,
    sunBody: lamplighter.sunBody,
    moonBody: lamplighter.moonBody,
    sunLight: lamplighter.sunLight,
    lampSwitch: lamplighter.lampSwitch,
    lightingArm: lamplighter.lightingArm,
    wavingArm: lamplighter.wavingArm,
    rodTipGlow: lamplighter.rodTipGlow,
  };
}

export function updateLittleWorlds(
  runtime: LittleWorldsRuntime,
  {
    elapsed,
    delta,
    motionScale,
    camera,
    heartPosition,
    exploring,
  }: LittleWorldUpdate,
) {
  runtime.roseWorld.rotation.y = Math.sin(elapsed * 0.075) * 0.13 * motionScale;
  runtime.roseWorld.rotation.z =
    Math.sin(elapsed * 0.052) * 0.025 * motionScale;
  runtime.roseBloom.rotation.z = Math.sin(elapsed * 0.72) * 0.035 * motionScale;
  runtime.roseBloom.rotation.x = Math.cos(elapsed * 0.58) * 0.025 * motionScale;
  runtime.roseDust.rotation.y = elapsed * 0.18 * motionScale;
  runtime.domeMaterial.opacity =
    0.18 + Math.sin(elapsed * 0.9) * 0.025 * motionScale;

  runtime.lamplighterWorld.rotation.y =
    Math.sin(elapsed * 0.062 + 0.8) * 0.16 * motionScale;
  runtime.lamplighterWorld.rotation.z =
    Math.sin(elapsed * 0.043) * 0.018 * motionScale;
  runtime.lamplighterSurface.material.uniforms.uTime.value = elapsed;
  runtime.celestialOrbit.rotation.z = elapsed * 0.19 * motionScale + 0.35;
  runtime.sunBody.rotation.y = elapsed * 0.34 * motionScale;
  runtime.moonBody.rotation.y = -elapsed * 0.22 * motionScale;
  sunLocalDirection
    .copy(runtime.sunBody.position)
    .applyQuaternion(runtime.celestialOrbit.quaternion)
    .normalize();
  runtime.lamplighterSurface.material.uniforms.uSunDirection.value.copy(
    sunLocalDirection,
  );
  const daylightAtLamp = THREE.MathUtils.smoothstep(
    sunLocalDirection.y,
    -0.1,
    0.24,
  );
  const nightAtLamp = 1 - daylightAtLamp;
  const lampPulse = 0.82 + Math.sin(elapsed * 1.55) * 0.12 * motionScale;
  runtime.lampLight.intensity = 29 * lampPulse * nightAtLamp;
  runtime.lampGlow.material.opacity =
    0.025 + nightAtLamp * (0.66 + lampPulse * 0.12);
  runtime.lampGlow.scale.setScalar(
    2.25 + nightAtLamp * (1.1 + lampPulse * 0.34),
  );
  const lampMaterial = runtime.lampCrystal
    .material as THREE.MeshStandardMaterial;
  lampMaterial.emissiveIntensity =
    0.06 + nightAtLamp * (2.05 + lampPulse * 0.52);
  lampMaterial.opacity = 0.36 + nightAtLamp * 0.56;
  runtime.sunLight.intensity = 13 + daylightAtLamp * 8;
  runtime.lampSwitch.rotation.z = THREE.MathUtils.damp(
    runtime.lampSwitch.rotation.z,
    nightAtLamp > 0.54 ? -0.55 : 0.55,
    7,
    delta,
  );
  const twilightGesture = Math.exp(-Math.pow((daylightAtLamp - 0.5) * 5.4, 2));
  runtime.lightingArm.rotation.z = THREE.MathUtils.damp(
    runtime.lightingArm.rotation.z,
    0.78 + twilightGesture * 0.58,
    5.5,
    delta,
  );
  runtime.lightingArm.rotation.x =
    Math.sin(elapsed * 2.6) * 0.035 * twilightGesture;
  runtime.wavingArm.rotation.z =
    -1.02 + Math.sin(elapsed * 2.35) * 0.24 * motionScale;
  runtime.wavingArm.rotation.x = Math.cos(elapsed * 1.18) * 0.12 * motionScale;
  runtime.rodTipGlow.material.opacity =
    0.08 + twilightGesture * 0.74 + nightAtLamp * 0.12;
  runtime.rodTipGlow.scale.setScalar(0.42 + twilightGesture * 0.34);

  camera.getWorldDirection(cameraForward);
  runtime.secrets.forEach((secret) => {
    secret.anchor.getWorldPosition(anchorWorldPosition);
    directionToAnchor.copy(anchorWorldPosition).sub(camera.position);
    const anchorDistance = directionToAnchor.length();
    directionToAnchor.normalize();
    directionToHeart.copy(heartPosition).sub(camera.position);
    const heartDistance = directionToHeart.length();
    directionToHeart.normalize();

    const alignment = directionToAnchor.dot(directionToHeart);
    const inFrontOfCamera = directionToAnchor.dot(cameraForward) > 0.48;
    const heartIsBehind = heartDistance > anchorDistance + 24;
    const inDiscoveryRange = anchorDistance > 12 && anchorDistance < 118;
    projectedAnchor.copy(anchorWorldPosition).project(camera);
    projectedHeart.copy(heartPosition).project(camera);
    const compositionIsVisible =
      projectedAnchor.z > -1 &&
      projectedAnchor.z < 1 &&
      projectedHeart.z > -1 &&
      projectedHeart.z < 1 &&
      Math.abs(projectedAnchor.x) < 0.82 &&
      Math.abs(projectedAnchor.y) < 0.82 &&
      Math.abs(projectedHeart.x) < 0.86 &&
      Math.abs(projectedHeart.y) < 0.86;
    const aligned =
      exploring &&
      inFrontOfCamera &&
      heartIsBehind &&
      inDiscoveryRange &&
      compositionIsVisible &&
      alignment > Math.cos(THREE.MathUtils.degToRad(4.2));

    secret.progress = THREE.MathUtils.clamp(
      secret.progress + delta * (aligned ? 3.2 : -2.25),
      0,
      1,
    );
    const reveal = THREE.MathUtils.smoothstep(secret.progress, 0.12, 0.92);
    secret.sprite.visible = reveal > 0.01;
    secret.sprite.material.opacity = reveal * 0.96;
    const baseScale = secret.id === "desayuno" ? 1 : 0.96;
    secret.sprite.scale.set(
      23 * baseScale * (0.92 + reveal * 0.08),
      6.3 * baseScale * (0.92 + reveal * 0.08),
      1,
    );
  });
}
