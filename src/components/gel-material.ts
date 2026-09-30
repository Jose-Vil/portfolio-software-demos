import * as THREE from "three";
import { seededStressRandom } from "./stress-physics";

export const STRESS_GEL_PALETTE = [
  0x35b8ca, // agua verdosa
  0x58c48c, // menta
  0xeb6799, // rosa frambuesa
  0xee955c, // durazno miel
  0xe1c44b, // amarillo gel
  0x5796d7, // azul cielo
  0x956cc5, // lavanda
  0xda5679, // cereza
  0x42aa8d, // jade
  0xcc7556, // ámbar rosado
  0x6f7cc8, // azul violeta
  0xbd629c, // pétalo malva
] as const;

export type StressGelAssetBundle = Readonly<{
  beadGeometry: THREE.BufferGeometry;
  beadMaterial: THREE.MeshPhysicalMaterial;
}>;

type GelMicroTextures = Readonly<{
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
}>;

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function createGelHeightField(size: number) {
  const values = new Float32Array(size * size);
  const random = seededStressRandom(0x6e16cafe);
  const seeds = Array.from({ length: 18 }, () => ({
    x: random() * size,
    y: random() * size,
    radius: size * (0.035 + random() * 0.085),
    height: 0.18 + random() * 0.34,
  }));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let height =
        Math.sin(x * 0.21 + Math.sin(y * 0.08) * 1.7) * 0.055 +
        Math.sin(y * 0.17 - x * 0.052) * 0.04 +
        Math.sin((x + y) * 0.43) * 0.018;

      for (const seed of seeds) {
        const wrappedX = Math.min(
          Math.abs(x - seed.x),
          size - Math.abs(x - seed.x),
        );
        const wrappedY = Math.min(
          Math.abs(y - seed.y),
          size - Math.abs(y - seed.y),
        );
        const distanceSquared = wrappedX * wrappedX + wrappedY * wrappedY;
        height +=
          Math.exp(-distanceSquared / (2 * seed.radius * seed.radius)) *
          seed.height;
      }
      values[y * size + x] = height;
    }
  }
  return values;
}

function createGelMicroTextures(
  renderer: THREE.WebGLRenderer,
): GelMicroTextures {
  const size = 96;
  const heights = createGelHeightField(size);
  const normalPixels = new Uint8Array(size * size * 4);
  const roughnessPixels = new Uint8Array(size * size * 4);

  const sample = (x: number, y: number) =>
    heights[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = (y * size + x) * 4;
      const slopeX = (sample(x - 1, y) - sample(x + 1, y)) * 1.8;
      const slopeY = (sample(x, y - 1) - sample(x, y + 1)) * 1.8;
      const inverseLength = 1 / Math.hypot(slopeX, slopeY, 1);
      const height = sample(x, y);

      normalPixels[pixel] = clampByte(
        (slopeX * inverseLength * 0.5 + 0.5) * 255,
      );
      normalPixels[pixel + 1] = clampByte(
        (slopeY * inverseLength * 0.5 + 0.5) * 255,
      );
      normalPixels[pixel + 2] = clampByte((inverseLength * 0.5 + 0.5) * 255);
      normalPixels[pixel + 3] = 255;

      // A moderately rough gel body under a very smooth clearcoat produces a
      // wet highlight without turning every bead into a chrome marble.
      const roughness = 0.72 + Math.sin(height * 7.3) * 0.12;
      const roughnessByte = clampByte(roughness * 255);
      roughnessPixels[pixel] = roughnessByte;
      roughnessPixels[pixel + 1] = roughnessByte;
      roughnessPixels[pixel + 2] = roughnessByte;
      roughnessPixels[pixel + 3] = 255;
    }
  }

  const makeTexture = (pixels: Uint8Array) => {
    const texture = new THREE.DataTexture(
      pixels,
      size,
      size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.4, 1.9);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  return {
    normalMap: makeTexture(normalPixels),
    roughnessMap: makeTexture(roughnessPixels),
  };
}

/**
 * One shared organic bead mesh. Every visible bead is an instance of this
 * asset, with small per-instance aspect variation applied by the renderer.
 */
export function createOrganicGelBeadGeometry() {
  const geometry = new THREE.SphereGeometry(1, 14, 10);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const inverseLength = 1 / (Math.hypot(x, y, z) || 1);
    const nx = x * inverseLength;
    const ny = y * inverseLength;
    const nz = z * inverseLength;
    const organicRadius =
      1 +
      Math.sin(nx * 4.8 + ny * 2.7) * 0.025 +
      Math.sin(ny * 5.6 - nz * 3.4) * 0.02 +
      Math.sin((nx + nz) * 6.2) * 0.012;

    position.setXYZ(
      index,
      nx * organicRadius * 1.025,
      ny * organicRadius * 0.985,
      nz * organicRadius,
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function configureStressGelRenderer(renderer: THREE.WebGLRenderer) {
  // The latex shell is the only transmissive object. Half-resolution keeps
  // its mobile refraction inexpensive while the beads remain depth-writing.
  renderer.transmissionResolutionScale = Math.min(
    renderer.transmissionResolutionScale,
    0.5,
  );
}

export function createStressGelAssets(
  renderer: THREE.WebGLRenderer,
): StressGelAssetBundle {
  const micro = createGelMicroTextures(renderer);
  configureStressGelRenderer(renderer);

  // Opaque/depth-writing instances avoid sorting artifacts. Translucency is
  // suggested with saturated edges, micro-normal, clearcoat and a faint inner
  // emissive fill; the surrounding latex supplies the true transmission.
  const beadMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf4edf7,
    roughness: 0.24,
    roughnessMap: micro.roughnessMap,
    metalness: 0,
    normalMap: micro.normalMap,
    normalScale: new THREE.Vector2(0.022, 0.022),
    emissive: 0x111522,
    emissiveIntensity: 0.012,
    depthWrite: true,
    transparent: false,
    clearcoat: 1,
    clearcoatRoughness: 0.032,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xfff7ff),
    ior: 1.38,
    envMapIntensity: 0.95,
  });

  return {
    beadGeometry: createOrganicGelBeadGeometry(),
    beadMaterial,
  };
}

export function createStressGelColor(index: number, variation = 0) {
  const color = new THREE.Color(
    STRESS_GEL_PALETTE[Math.abs(Math.floor(index)) % STRESS_GEL_PALETTE.length],
  );
  color.offsetHSL(
    Math.max(-0.025, Math.min(0.025, variation * 0.018)),
    -0.08 + Math.max(-0.025, Math.min(0.025, variation * 0.02)),
    Math.max(-0.06, Math.min(0.065, variation * 0.045)),
  );
  return color;
}
