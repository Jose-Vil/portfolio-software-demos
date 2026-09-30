"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  MAX_STRESS_CONTACTS,
  STRESS_BALL_RADIUS,
  type StressContactInfluence,
  type StressDirection,
  clampStressValue,
  createFibonacciDirections,
  getGelProtrusion,
  getStressCompressionInto,
  getStressPressure,
  sampleStressSurfaceInto,
  seededStressRandom,
  stepDampedValue,
  stepElasticValue,
} from "./stress-physics";
import { createStressGelAssets, createStressGelColor } from "./gel-material";

export type StressBallInteractionState = Readonly<{
  contacts: number;
  pressure: number;
  hasInteracted: boolean;
}>;

export type StressBallTactileEvent = Readonly<{
  type: "press" | "move" | "release" | "rupture";
  intensity: number;
  contacts: number;
  cancelled?: boolean;
}>;

export type StressBall3DProps = Readonly<{
  className?: string;
  onInteractionChange?: (state: StressBallInteractionState) => void;
  onTactileEvent?: (event: StressBallTactileEvent) => void;
  ariaLabel?: string;
  disabled?: boolean;
}>;

type RuntimeContact = {
  pointerId: number;
  direction: StressDirection;
  strength: number;
  velocity: number;
  targetStrength: number;
  radius: number;
  active: boolean;
};

type InteractionPublisher = (state: StressBallInteractionState) => void;
type TactilePublisher = (event: StressBallTactileEvent) => void;

const GEL_BEAD_COUNT = 104;
const KEYBOARD_POINTER_ID = -17;
const CANVAS_BALL_RADIUS_RATIO = 0.355;
const CANVAS_POINTER_PADDING = 1.075;
const DEFAULT_ARIA_LABEL =
  "Pelota antiestrés de malla. Presiona con uno o varios dedos y suelta para sentir cómo recupera su forma.";

const GEL_COLORS = [
  0x65d9e6, 0x82dea8, 0xf798bf, 0xf9b66f, 0xeadf72, 0x78aef0, 0xb492e4,
  0xf27f92,
] as const;

const NET_STRAND_COUNT = 12;
const NET_SEGMENTS_PER_STRAND = 16;
const NET_ROPE_RADIUS = 0.0145;
const NET_REST_RADIUS = STRESS_BALL_RADIUS * 1.018;

type DiamondNetLattice = Readonly<{
  directions: Float32Array;
  segments: Uint16Array;
  restLengths: Float32Array;
  radiusVariance: Float32Array;
}>;

function recommendedPixelRatio(width: number) {
  const cap = width <= 370 ? 1.25 : width <= 430 ? 1.4 : 1.5;
  return Math.min(window.devicePixelRatio || 1, cap);
}

function createDiamondNetLattice(): DiamondNetLattice {
  const nodesPerStrand = NET_SEGMENTS_PER_STRAND + 1;
  const familyCount = 2;
  const totalNodes = familyCount * NET_STRAND_COUNT * nodesPerStrand;
  const strandSegments =
    familyCount * NET_STRAND_COUNT * NET_SEGMENTS_PER_STRAND;
  const collarSegments = NET_STRAND_COUNT * 2;
  const totalSegments = strandSegments + collarSegments;
  const directions = new Float32Array(totalNodes * 3);
  const segments = new Uint16Array(totalSegments * 2);
  const restLengths = new Float32Array(totalSegments);
  const radiusVariance = new Float32Array(totalSegments);
  const latitudeLimit = Math.PI * 0.445;
  const helixSlope = 1.42;
  const random = seededStressRandom(0x16e71a);

  const nodeIndex = (family: number, strand: number, sample: number) =>
    (family * NET_STRAND_COUNT + strand) * nodesPerStrand + sample;

  for (let family = 0; family < familyCount; family += 1) {
    const directionSign = family === 0 ? 1 : -1;
    for (let strand = 0; strand < NET_STRAND_COUNT; strand += 1) {
      const phase = (strand / NET_STRAND_COUNT) * Math.PI * 2;
      for (let sample = 0; sample < nodesPerStrand; sample += 1) {
        const progress = sample / NET_SEGMENTS_PER_STRAND;
        const latitude = -latitudeLimit + progress * latitudeLimit * 2;
        const azimuth =
          phase + directionSign * latitude * helixSlope + family * 0.018;
        const horizontalRadius = Math.cos(latitude);
        const index = nodeIndex(family, strand, sample) * 3;
        directions[index] = horizontalRadius * Math.cos(azimuth);
        directions[index + 1] = Math.sin(latitude);
        directions[index + 2] = horizontalRadius * Math.sin(azimuth);
      }
    }
  }

  let segmentIndex = 0;
  const addSegment = (startNode: number, endNode: number) => {
    const offset = segmentIndex * 2;
    segments[offset] = startNode;
    segments[offset + 1] = endNode;
    const startOffset = startNode * 3;
    const endOffset = endNode * 3;
    const deltaX =
      (directions[endOffset] - directions[startOffset]) * NET_REST_RADIUS;
    const deltaY =
      (directions[endOffset + 1] - directions[startOffset + 1]) *
      NET_REST_RADIUS;
    const deltaZ =
      (directions[endOffset + 2] - directions[startOffset + 2]) *
      NET_REST_RADIUS;
    restLengths[segmentIndex] = Math.hypot(deltaX, deltaY, deltaZ);
    radiusVariance[segmentIndex] = 0.92 + random() * 0.16;
    segmentIndex += 1;
  };

  for (let family = 0; family < familyCount; family += 1) {
    for (let strand = 0; strand < NET_STRAND_COUNT; strand += 1) {
      for (let sample = 0; sample < NET_SEGMENTS_PER_STRAND; sample += 1) {
        addSegment(
          nodeIndex(family, strand, sample),
          nodeIndex(family, strand, sample + 1),
        );
      }
    }
  }

  // Two discreet collars keep the net gathered at its poles. They are part of
  // the same InstancedMesh, so the complete net still costs one draw call.
  for (const sample of [0, NET_SEGMENTS_PER_STRAND]) {
    for (let strand = 0; strand < NET_STRAND_COUNT; strand += 1) {
      addSegment(
        nodeIndex(0, strand, sample),
        nodeIndex(0, (strand + 1) % NET_STRAND_COUNT, sample),
      );
    }
  }

  return { directions, segments, restLengths, radiusVariance };
}

function createPorousRopeTexture(renderer: THREE.WebGLRenderer) {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const random = seededStressRandom(0x16f1be);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const fiber = Math.sin(x * 0.72 + y * 0.17) * 8;
      const pore = random() < 0.035 ? -54 : 0;
      const grain = (random() - 0.5) * 30;
      const value = Math.round(
        clampStressValue(218 + fiber + pore + grain, 116, 248),
      );
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 5.2);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function createLatexNormalTexture(renderer: THREE.WebGLRenderer) {
  const size = 96;
  const heights = new Float32Array(size * size);
  const random = seededStressRandom(0x16a7e5);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pore = random() < 0.022 ? -0.9 : 0;
      heights[y * size + x] =
        Math.sin(x * 0.53 + y * 0.21) * 0.12 +
        Math.cos(y * 0.67 - x * 0.08) * 0.08 +
        (random() - 0.5) * 0.34 +
        pore;
    }
  }

  const data = new Uint8Array(size * size * 4);
  const readHeight = (x: number, y: number) =>
    heights[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const slopeX = (readHeight(x - 1, y) - readHeight(x + 1, y)) * 0.42;
      const slopeY = (readHeight(x, y - 1) - readHeight(x, y + 1)) * 0.42;
      const inverseLength = 1 / Math.hypot(slopeX, slopeY, 1);
      const index = (y * size + x) * 4;
      data[index] = Math.round((slopeX * inverseLength * 0.5 + 0.5) * 255);
      data[index + 1] = Math.round((slopeY * inverseLength * 0.5 + 0.5) * 255);
      data[index + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 5);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function createInternalBackdropTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 112, 8, 128, 128, 190);
    gradient.addColorStop(0, "#222946");
    gradient.addColorStop(0.5, "#11172c");
    gradient.addColorStop(1, "#080b18");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createStudioEnvironment(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const base = context.createLinearGradient(0, 0, 0, canvas.height);
    base.addColorStop(0, "#223052");
    base.addColorStop(0.46, "#17182d");
    base.addColorStop(1, "#070a16");
    context.fillStyle = base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const paintSoftbox = (
      x: number,
      y: number,
      radius: number,
      color: string,
      alpha: number,
      stretchX: number,
    ) => {
      context.save();
      context.translate(x, y);
      context.scale(stretchX, 1);
      const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      glow.addColorStop(0, color.replace("ALPHA", String(alpha)));
      glow.addColorStop(0.34, color.replace("ALPHA", String(alpha * 0.56)));
      glow.addColorStop(1, color.replace("ALPHA", "0"));
      context.fillStyle = glow;
      context.fillRect(-radius, -radius, radius * 2, radius * 2);
      context.restore();
    };

    paintSoftbox(51, 34, 40, "rgba(255,211,184,ALPHA)", 0.92, 0.48);
    paintSoftbox(205, 39, 34, "rgba(115,190,255,ALPHA)", 0.72, 0.55);
    paintSoftbox(134, 105, 28, "rgba(255,124,202,ALPHA)", 0.34, 1.25);
  }

  const source = new THREE.CanvasTexture(canvas);
  source.colorSpace = THREE.SRGBColorSpace;
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  generator.compileEquirectangularShader();
  const environment = generator.fromEquirectangular(source);
  source.dispose();
  generator.dispose();
  return environment;
}

function installLatexTensionShader(material: THREE.MeshPhysicalMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aLatexTension;\nvarying float vLatexTension;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvLatexTension = aLatexTension;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vLatexTension;",
      )
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>\nfloat latexTension = clamp(vLatexTension, 0.0, 1.0);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.91, 0.97), latexTension * 0.15);",
      )
      .replace(
        "#include <alphamap_fragment>",
        "#include <alphamap_fragment>\ndiffuseColor.a *= 1.0 - latexTension * 0.42;",
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, roughnessFactor * 0.58, latexTension);",
      );
  };
  material.customProgramCacheKey = () => "day-sixteen-latex-tension-v1";
}

function createContactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 126);
    gradient.addColorStop(0, "rgba(7,2,14,.9)");
    gradient.addColorStop(0.35, "rgba(11,4,20,.58)");
    gradient.addColorStop(0.72, "rgba(18,7,30,.18)");
    gradient.addColorStop(1, "rgba(18,7,30,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  scene.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh)
    ) {
      return;
    }
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    objectMaterials.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

function writeDeformedGeometry(
  geometry: THREE.BufferGeometry,
  directions: Float32Array,
  offsets: Float32Array,
  radiusMultiplier: number,
) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const positions = position.array as Float32Array;
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const offset = vertex * 3;
    positions[offset] =
      (directions[offset] * radiusMultiplier + offsets[offset]) *
      STRESS_BALL_RADIUS;
    positions[offset + 1] =
      (directions[offset + 1] * radiusMultiplier + offsets[offset + 1]) *
      STRESS_BALL_RADIUS;
    positions[offset + 2] =
      (directions[offset + 2] * radiusMultiplier + offsets[offset + 2]) *
      STRESS_BALL_RADIUS;
  }
  position.needsUpdate = true;
}

function getIndexedGeometryVolume(geometry: THREE.BufferGeometry) {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!index) return 0;
  let signedSixTimesVolume = 0;

  for (let triangle = 0; triangle < index.count; triangle += 3) {
    const a = index.getX(triangle);
    const b = index.getX(triangle + 1);
    const c = index.getX(triangle + 2);
    const ax = position.getX(a);
    const ay = position.getY(a);
    const az = position.getZ(a);
    const bx = position.getX(b);
    const by = position.getY(b);
    const bz = position.getZ(b);
    const cx = position.getX(c);
    const cy = position.getY(c);
    const cz = position.getZ(c);
    signedSixTimesVolume +=
      ax * (by * cz - bz * cy) +
      ay * (bz * cx - bx * cz) +
      az * (bx * cy - by * cx);
  }

  return Math.abs(signedSixTimesVolume / 6);
}

function createDirectionBuffer(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const directions = new Float32Array(position.count * 3);
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const offset = vertex * 3;
    const x = position.getX(vertex);
    const y = position.getY(vertex);
    const z = position.getZ(vertex);
    const inverseLength = 1 / (Math.hypot(x, y, z) || 1);
    directions[offset] = x * inverseLength;
    directions[offset + 1] = y * inverseLength;
    directions[offset + 2] = z * inverseLength;
  }
  return directions;
}

function StressBallCanvasFallback({
  className,
  ariaLabel,
  publishInteraction,
  publishTactile,
  disabledRef,
}: Readonly<{
  className?: string;
  ariaLabel: string;
  publishInteraction: InteractionPublisher;
  publishTactile: TactilePublisher;
  disabledRef: Readonly<{ current: boolean }>;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    type CanvasContact = {
      pointerId: number;
      x: number;
      y: number;
      strength: number;
      velocity: number;
      target: number;
      active: boolean;
    };

    const contacts = new Map<number, CanvasContact>();
    const random = seededStressRandom(0x16c0de);
    const beads: Array<{
      x: number;
      y: number;
      radius: number;
      colorIndex: number;
      depth: number;
      popBias: number;
    }> = [];
    for (let attempt = 0; beads.length < 92 && attempt < 5_000; attempt += 1) {
      const beadRadius = 0.038 + random() * 0.02;
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(random()) * (0.82 - beadRadius);
      const candidate = {
        x: Math.cos(angle) * radial,
        y: Math.sin(angle) * radial,
        radius: beadRadius,
        colorIndex: beads.length % GEL_COLORS.length,
        depth: random(),
        popBias: 0.12 + random() * 0.3,
      };
      const hasRoom = beads.every((bead) => {
        const separation = Math.hypot(
          bead.x - candidate.x,
          bead.y - candidate.y,
        );
        return separation > (bead.radius + candidate.radius) * 0.72;
      });
      if (hasRoom || attempt > 3_800) beads.push(candidate);
    }
    beads.sort((left, right) => left.depth - right.depth);

    const beadSprites = GEL_COLORS.map((color) => {
      const sprite = document.createElement("canvas");
      sprite.width = 64;
      sprite.height = 64;
      const spriteContext = sprite.getContext("2d");
      if (spriteContext) {
        const cssColor = `#${color.toString(16).padStart(6, "0")}`;
        const gradient = spriteContext.createRadialGradient(
          21,
          17,
          2,
          32,
          32,
          30,
        );
        gradient.addColorStop(0, "rgba(255,255,255,.98)");
        gradient.addColorStop(0.16, cssColor);
        gradient.addColorStop(0.7, cssColor);
        gradient.addColorStop(1, "rgba(32,10,45,.88)");
        spriteContext.fillStyle = gradient;
        spriteContext.beginPath();
        spriteContext.arc(32, 32, 30, 0, Math.PI * 2);
        spriteContext.fill();
      }
      return sprite;
    });

    let disposed = false;
    let frame = 0;
    let running = false;
    let previousTime = performance.now();
    let lastWidth = 0;
    let lastHeight = 0;
    let lastRatio = 0;
    let hasInteracted = false;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let releaseOffset = 0;
    let releaseVelocity = 0;
    let canvasSqueezeAmount = 0;
    let canvasVolumeScale = 1;
    let canvasSqueezeAxisX = 1;
    let canvasSqueezeAxisY = 0;
    const canvasCompressionTarget = {
      axisX: 1,
      axisY: 0,
      axisZ: 0,
      amount: 0,
      separation: 0,
    };
    let lastReport = { contacts: -1, pressure: -1, hasInteracted: false };
    let requestDraw: () => void = () => undefined;
    const canvasSurfaceSample = {
      offsetX: 0,
      offsetY: 0,
      volumeBulge: 0,
      indentation: 0,
      tensionRim: 0,
    };

    const sampleCanvasSurface = (
      x: number,
      y: number,
      pressure: number,
      target: typeof canvasSurfaceSample,
    ) => {
      let offsetX = 0;
      let offsetY = 0;
      let indentation = 0;
      let nearestInfluence = 0;
      let tensionRim = 0;
      contacts.forEach((contact) => {
        const distance = Math.hypot(x - contact.x, y - contact.y);
        const directInfluence =
          contact.strength *
          Math.exp(-(distance * distance) / (2 * 0.25 * 0.25));
        const rimDistance = distance - 0.43;
        const rimInfluence =
          contact.strength *
          Math.exp(-(rimDistance * rimDistance) / (2 * 0.1 * 0.1));
        indentation += directInfluence;
        nearestInfluence = Math.max(nearestInfluence, directInfluence);
        tensionRim = Math.max(tensionRim, rimInfluence);
        offsetX +=
          -contact.x * directInfluence * 0.15 + contact.x * rimInfluence * 0.04;
        offsetY +=
          -contact.y * directInfluence * 0.15 + contact.y * rimInfluence * 0.04;
      });

      const magnitude = Math.hypot(offsetX, offsetY);
      const maximumOffset = 0.2;
      if (magnitude > 0.000001) {
        const smoothMagnitude =
          Math.tanh(magnitude / maximumOffset) * maximumOffset;
        const scale = smoothMagnitude / magnitude;
        offsetX *= scale;
        offsetY *= scale;
      }

      target.offsetX = offsetX;
      target.offsetY = offsetY;
      target.volumeBulge =
        pressure * 0.038 * (1 - clampStressValue(nearestInfluence) * 0.7);
      target.indentation = indentation;
      target.tensionRim = tensionRim;
      return target;
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (width === lastWidth && height === lastHeight && ratio === lastRatio) {
        return false;
      }
      lastWidth = width;
      lastHeight = height;
      lastRatio = ratio;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      return true;
    };

    const report = (pressure: number) => {
      const activeContacts = [...contacts.values()].filter(
        (contact) => contact.active && contact.target > 0,
      ).length;
      const roundedPressure = Math.round(pressure * 100) / 100;
      if (
        activeContacts === lastReport.contacts &&
        Math.abs(roundedPressure - lastReport.pressure) < 0.025 &&
        !(roundedPressure === 0 && lastReport.pressure !== 0) &&
        hasInteracted === lastReport.hasInteracted
      ) {
        return;
      }
      lastReport = {
        contacts: activeContacts,
        pressure: roundedPressure,
        hasInteracted,
      };
      publishInteraction(lastReport);
    };

    const activeCanvasContactCount = () =>
      [...contacts.values()].filter(
        (contact) => contact.active && contact.target > 0,
      ).length;

    const updatePointer = (event: PointerEvent, create: boolean) => {
      let existing = contacts.get(event.pointerId);
      if (create && existing) {
        if (existing.active) return;
        contacts.delete(event.pointerId);
        existing = undefined;
      }
      if (!existing && !create) return;
      if (!existing && contacts.size >= MAX_STRESS_CONTACTS) {
        let weakestInactiveId: number | null = null;
        let weakestStrength = Number.POSITIVE_INFINITY;
        contacts.forEach((contact, pointerId) => {
          if (!contact.active && contact.strength < weakestStrength) {
            weakestInactiveId = pointerId;
            weakestStrength = contact.strength;
          }
        });
        if (weakestInactiveId === null) return;
        contacts.delete(weakestInactiveId);
      }
      const bounds = canvas.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height * 0.51;
      const radius = Math.max(
        1,
        Math.min(bounds.width, bounds.height) * CANVAS_BALL_RADIUS_RATIO,
      );
      const rawX = (event.clientX - centerX) / radius;
      const rawY = (event.clientY - centerY) / radius;
      const rawLength = Math.hypot(rawX, rawY);
      if (rawLength > CANVAS_POINTER_PADDING) {
        if (existing) {
          existing.target = 0;
          requestDraw();
        }
        return;
      }
      // Map through a slightly larger proxy disc instead of collapsing the
      // padded ring onto one hard tangent. This keeps edge drags continuous.
      const radialScale = 1 / CANVAS_POINTER_PADDING;
      const x = rawX * radialScale;
      const y = rawY * radialScale;

      const contact = existing ?? {
        pointerId: event.pointerId,
        x,
        y,
        strength: 0,
        velocity: 0,
        target: 0,
        active: true,
      };
      contact.x = x;
      contact.y = y;
      contact.target = 0.82 + clampStressValue(event.pressure) * 0.18;
      contact.active = true;
      contacts.set(event.pointerId, contact);
      hasInteracted = true;
      requestDraw();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (disabledRef.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      updatePointer(event, true);
      const contact = contacts.get(event.pointerId);
      if (!contact) return;
      publishTactile({
        type: "press",
        intensity: clampStressValue(0.46 + contact.target * 0.42),
        contacts: activeCanvasContactCount(),
      });
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is an enhancement, not a requirement.
      }
      publishInteraction({
        contacts: activeCanvasContactCount(),
        pressure: 0,
        hasInteracted: true,
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (disabledRef.current) return;
      const before = contacts.get(event.pointerId);
      if (!before?.active) return;
      event.preventDefault();
      const previousX = before.x;
      const previousY = before.y;
      updatePointer(event, false);
      const after = contacts.get(event.pointerId);
      if (!after) return;
      const distance = Math.hypot(after.x - previousX, after.y - previousY);
      if (distance > 0.004) {
        publishTactile({
          type: "move",
          intensity: clampStressValue(distance * 5.5),
          contacts: activeCanvasContactCount(),
        });
      }
    };

    const releasePointer = (event: PointerEvent) => {
      const contact = contacts.get(event.pointerId);
      if (!contact) return;
      if (contact.active) {
        publishTactile({
          type: "release",
          intensity:
            contact.strength > 0.025
              ? clampStressValue(0.28 + contact.strength * 0.72)
              : 0,
          contacts: Math.max(
            0,
            activeCanvasContactCount() - (contact.target > 0 ? 1 : 0),
          ),
          cancelled: event.type !== "pointerup",
        });
        if (!reducedMotion) {
          const remainingContacts = Math.max(0, activeCanvasContactCount() - 1);
          releaseVelocity = Math.min(
            0.56,
            releaseVelocity +
              clampStressValue(contact.strength) *
                (remainingContacts > 0 ? 0.18 : 0.46),
          );
        }
      }
      if (contact.active && contact.strength < 0.13) {
        contact.strength = 0.13;
        contact.velocity = 0;
      }
      contact.active = false;
      contact.target = 0;
      contact.velocity = Math.min(0, contact.velocity);
      requestDraw();
      try {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Some Android WebViews release capture before pointercancel arrives.
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (disabledRef.current) return;
      if ((event.key !== " " && event.key !== "Enter") || event.repeat) return;
      event.preventDefault();
      contacts.set(KEYBOARD_POINTER_ID, {
        pointerId: KEYBOARD_POINTER_ID,
        x: 0.08,
        y: -0.06,
        strength: 0,
        velocity: 0,
        target: 0.94,
        active: true,
      });
      hasInteracted = true;
      publishTactile({
        type: "press",
        intensity: 0.84,
        contacts: activeCanvasContactCount(),
      });
      publishInteraction({ contacts: 1, pressure: 0, hasInteracted: true });
      requestDraw();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      const contact = contacts.get(KEYBOARD_POINTER_ID);
      if (contact) {
        if (contact.active) {
          publishTactile({
            type: "release",
            intensity:
              contact.strength > 0.025
                ? clampStressValue(0.28 + contact.strength * 0.72)
                : 0,
            contacts: Math.max(
              0,
              activeCanvasContactCount() - (contact.target > 0 ? 1 : 0),
            ),
          });
          if (!reducedMotion) {
            const remainingContacts = Math.max(
              0,
              activeCanvasContactCount() - 1,
            );
            releaseVelocity = Math.min(
              0.56,
              releaseVelocity +
                clampStressValue(contact.strength) *
                  (remainingContacts > 0 ? 0.18 : 0.46),
            );
          }
        }
        if (contact.strength < 0.13) {
          contact.strength = 0.13;
          contact.velocity = 0;
        }
        contact.active = false;
        contact.target = 0;
        contact.velocity = Math.min(0, contact.velocity);
        requestDraw();
      }
    };

    const draw = (time: number) => {
      if (disposed || !running) return;
      const delta = Math.min(
        0.04,
        Math.max(0.001, (time - previousTime) / 1000),
      );
      previousTime = time;
      resize();

      if (disabledRef.current && contacts.size > 0) {
        contacts.clear();
        publishInteraction({ contacts: 0, pressure: 0, hasInteracted });
      }

      for (const [pointerId, contact] of contacts) {
        const next = stepDampedValue(
          contact.strength,
          contact.velocity,
          contact.target,
          delta,
          contact.active ? 18 : 11,
        );
        contact.strength = next.value;
        contact.velocity = next.velocity;
        if (!contact.active && contact.strength < 0.002)
          contacts.delete(pointerId);
      }

      const activeInfluences: StressContactInfluence[] = [
        ...contacts.values(),
      ].map((contact) => ({
        direction: [
          contact.x,
          -contact.y,
          Math.sqrt(Math.max(0, 1 - contact.x ** 2 - contact.y ** 2)),
        ],
        strength: contact.strength,
        radius: 0.46,
        active: contact.active && contact.target > 0,
      }));
      const pressure = getStressPressure(activeInfluences);
      getStressCompressionInto(activeInfluences, canvasCompressionTarget);
      const projectedAxisX = canvasCompressionTarget.axisX;
      const projectedAxisY = -canvasCompressionTarget.axisY;
      const projectedAxisLength = Math.hypot(projectedAxisX, projectedAxisY);
      let visibleCompressionTarget = 0;
      if (
        canvasCompressionTarget.amount > 0.0001 &&
        projectedAxisLength > 0.0001
      ) {
        let targetAxisX = projectedAxisX / projectedAxisLength;
        let targetAxisY = projectedAxisY / projectedAxisLength;
        if (
          canvasSqueezeAxisX * targetAxisX + canvasSqueezeAxisY * targetAxisY <
          0
        ) {
          targetAxisX *= -1;
          targetAxisY *= -1;
        }
        const axisBlend = reducedMotion ? 1 : 1 - Math.exp(-delta * 18);
        canvasSqueezeAxisX += (targetAxisX - canvasSqueezeAxisX) * axisBlend;
        canvasSqueezeAxisY += (targetAxisY - canvasSqueezeAxisY) * axisBlend;
        const blendedLength =
          Math.hypot(canvasSqueezeAxisX, canvasSqueezeAxisY) || 1;
        canvasSqueezeAxisX /= blendedLength;
        canvasSqueezeAxisY /= blendedLength;
        visibleCompressionTarget =
          canvasCompressionTarget.amount *
          clampStressValue(projectedAxisLength / 0.45);
      }
      if (reducedMotion) {
        canvasSqueezeAmount = visibleCompressionTarget;
      } else {
        const squeezeResponse =
          visibleCompressionTarget > canvasSqueezeAmount ? 18 : 8.2;
        canvasSqueezeAmount +=
          (visibleCompressionTarget - canvasSqueezeAmount) *
          (1 - Math.exp(-delta * squeezeResponse));
        if (canvasSqueezeAmount < 0.00015 && visibleCompressionTarget === 0) {
          canvasSqueezeAmount = 0;
        }
      }
      report(pressure);
      if (reducedMotion) {
        releaseOffset = 0;
        releaseVelocity = 0;
      } else {
        const elastic = stepElasticValue(
          releaseOffset,
          releaseVelocity,
          0,
          delta,
        );
        releaseOffset = elastic.value;
        releaseVelocity = elastic.velocity;
        if (
          Math.abs(releaseOffset) < 0.00025 &&
          Math.abs(releaseVelocity) < 0.004
        ) {
          releaseOffset = 0;
          releaseVelocity = 0;
        }
      }

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height * 0.51;
      const radius = Math.min(width, height) * CANVAS_BALL_RADIUS_RATIO;
      context.clearRect(0, 0, width, height);

      const shadow = context.createRadialGradient(
        centerX,
        centerY + radius * 0.87,
        radius * 0.03,
        centerX,
        centerY + radius * 0.87,
        radius * 0.92,
      );
      shadow.addColorStop(0, "rgba(8,2,14,.62)");
      shadow.addColorStop(0.5, "rgba(12,4,21,.26)");
      shadow.addColorStop(1, "rgba(12,4,21,0)");
      context.fillStyle = shadow;
      context.beginPath();
      context.ellipse(
        centerX,
        centerY + radius * 0.88,
        radius * (0.9 + pressure * 0.06),
        radius * 0.18,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();

      // The rebound transforms the membrane, beads and net as one volume. It
      // must never drive contact strength, otherwise lobes would reappear.
      context.save();
      context.translate(centerX, centerY);
      context.scale(1 + releaseOffset, 1 + releaseOffset);
      const normalizedCanvasSqueeze = clampStressValue(
        canvasSqueezeAmount / 0.19,
      );
      const easedCanvasSqueeze =
        normalizedCanvasSqueeze *
        normalizedCanvasSqueeze *
        (3 - 2 * normalizedCanvasSqueeze);
      const canvasVisualShrink = 1 - easedCanvasSqueeze * 0.055;
      const squeezeAxisScale = clampStressValue(
        (1 - canvasSqueezeAmount) * canvasVisualShrink,
        0.72,
        1.02,
      );
      const squeezePerpendicularScale = clampStressValue(
        canvasVisualShrink *
          Math.pow(Math.max(0.81, 1 - canvasSqueezeAmount), -0.14),
        0.93,
        1.015,
      );
      const squeezeDifference = squeezeAxisScale - squeezePerpendicularScale;
      context.transform(
        squeezePerpendicularScale +
          squeezeDifference * canvasSqueezeAxisX * canvasSqueezeAxisX,
        squeezeDifference * canvasSqueezeAxisX * canvasSqueezeAxisY,
        squeezeDifference * canvasSqueezeAxisX * canvasSqueezeAxisY,
        squeezePerpendicularScale +
          squeezeDifference * canvasSqueezeAxisY * canvasSqueezeAxisY,
        0,
        0,
      );
      context.translate(-centerX, -centerY);

      const shape = new Path2D();
      let twiceContourArea = 0;
      let previousContourX = 0;
      let previousContourY = 0;
      for (let index = 0; index <= 84; index += 1) {
        const angle = (index / 84) * Math.PI * 2;
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const sample = sampleCanvasSurface(
          directionX,
          directionY,
          pressure,
          canvasSurfaceSample,
        );
        const x =
          centerX +
          (directionX * (1 + sample.volumeBulge) + sample.offsetX) * radius;
        const y =
          centerY +
          (directionY * (1 + sample.volumeBulge) + sample.offsetY) * radius;
        if (index === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
          twiceContourArea += previousContourX * y - x * previousContourY;
        }
        previousContourX = x;
        previousContourY = y;
      }
      shape.closePath();

      const contourArea = Math.abs(twiceContourArea) * 0.5;
      const restContourArea =
        0.5 * 84 * Math.sin((Math.PI * 2) / 84) * radius * radius;
      const canvasVolumeTarget =
        visibleCompressionTarget > 0
          ? clampStressValue(
              Math.sqrt(restContourArea / Math.max(1, contourArea)),
              0.94,
              1.04,
            )
          : 1;
      canvasVolumeScale +=
        (canvasVolumeTarget - canvasVolumeScale) * (1 - Math.exp(-delta * 15));
      if (
        canvasVolumeTarget === 1 &&
        Math.abs(canvasVolumeScale - 1) < 0.0001
      ) {
        canvasVolumeScale = 1;
      }
      context.translate(centerX, centerY);
      const canvasVolumeCorrection = 1 + (canvasVolumeScale - 1) * 0.35;
      context.scale(canvasVolumeCorrection, canvasVolumeCorrection);
      context.translate(-centerX, -centerY);

      const bodyGradient = context.createRadialGradient(
        centerX - radius * 0.34,
        centerY - radius * 0.4,
        radius * 0.05,
        centerX,
        centerY,
        radius * 1.12,
      );
      bodyGradient.addColorStop(0, "rgba(232,196,246,.66)");
      bodyGradient.addColorStop(0.34, "rgba(145,91,166,.46)");
      bodyGradient.addColorStop(0.76, "rgba(75,36,99,.48)");
      bodyGradient.addColorStop(1, "rgba(31,14,48,.78)");
      context.fillStyle = bodyGradient;
      context.fill(shape);

      const beadLayouts = beads.map((bead) => {
        let directCompression = 0;
        let localRelease = 0;
        contacts.forEach((contact) => {
          const distance = Math.hypot(bead.x - contact.x, bead.y - contact.y);
          directCompression = Math.max(
            directCompression,
            contact.strength *
              Math.exp(-(distance * distance) / (2 * 0.18 * 0.18)),
          );
          const releaseDistance = distance - 0.42;
          localRelease = Math.max(
            localRelease,
            contact.strength *
              Math.exp(
                -(releaseDistance * releaseDistance) / (2 * 0.105 * 0.105),
              ),
          );
        });
        const rawProtrusion = clampStressValue(
          (localRelease - bead.popBias) * 2.5,
        );
        const protrusion = rawProtrusion * (1.28 - rawProtrusion * 0.28);
        const surface = sampleCanvasSurface(
          bead.x,
          bead.y,
          pressure,
          canvasSurfaceSample,
        );
        const radialLength = Math.hypot(bead.x, bead.y) || 1;
        const outwardX = bead.x / radialLength;
        const outwardY = bead.y / radialLength;
        const deformationFollow = 0.48 + bead.depth * 0.26;
        const x =
          centerX +
          (bead.x * (1 + surface.volumeBulge) +
            surface.offsetX * deformationFollow +
            outwardX * protrusion * 0.17) *
            radius;
        const y =
          centerY +
          (bead.y * (1 + surface.volumeBulge) +
            surface.offsetY * deformationFollow +
            outwardY * protrusion * 0.17) *
            radius;
        const beadRadius =
          radius *
          bead.radius *
          (0.9 + bead.depth * 0.18) *
          (1 - directCompression * 0.08 + protrusion * 0.42);
        return { bead, x, y, beadRadius, protrusion };
      });

      beadLayouts.forEach(({ bead, x, y, beadRadius, protrusion }) => {
        context.globalAlpha = 0.68 + bead.depth * 0.3;
        context.drawImage(
          beadSprites[bead.colorIndex],
          x - beadRadius,
          y - beadRadius,
          beadRadius * 2,
          beadRadius * 2,
        );
        if (protrusion > 0.025) {
          context.globalAlpha =
            clampStressValue((protrusion - 0.025) / 0.2) * 0.72;
          context.strokeStyle = "rgba(239,220,248,.78)";
          context.lineWidth = Math.max(0.8, radius * 0.006);
          context.beginPath();
          context.arc(x, y, beadRadius * 1.06, 0, Math.PI * 2);
          context.stroke();
        }
      });
      context.globalAlpha = 1;

      // A translucent membrane pass unifies the beads into one gel volume.
      context.save();
      context.clip(shape);
      const membrane = context.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius,
      );
      membrane.addColorStop(0, "rgba(255,255,255,.25)");
      membrane.addColorStop(0.28, "rgba(222,188,239,.07)");
      membrane.addColorStop(0.62, "rgba(91,45,116,.04)");
      membrane.addColorStop(1, "rgba(23,10,37,.27)");
      context.fillStyle = membrane;
      context.fillRect(
        centerX - radius * 1.2,
        centerY - radius * 1.2,
        radius * 2.4,
        radius * 2.4,
      );

      const drawWovenGrid = (stroke: string, lineWidth: number) => {
        context.strokeStyle = stroke;
        context.lineWidth = lineWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        for (const slope of [-1, 1]) {
          for (let start = -1.9; start <= 1.9; start += 0.23) {
            context.beginPath();
            for (let step = 0; step <= 24; step += 1) {
              const normalizedY = -1.25 + (step / 24) * 2.5;
              let normalizedX =
                start +
                slope * normalizedY * 0.78 +
                Math.sin(normalizedY * 8 + start * 3) * 0.009;
              let warpedY = normalizedY;
              const surface = sampleCanvasSurface(
                normalizedX,
                warpedY,
                pressure,
                canvasSurfaceSample,
              );
              normalizedX =
                normalizedX * (1 + surface.volumeBulge) +
                surface.offsetX * 0.84;
              warpedY =
                warpedY * (1 + surface.volumeBulge) + surface.offsetY * 0.84;
              const netRelease = clampStressValue(
                surface.tensionRim * 0.9 - surface.indentation * 0.18,
              );
              const warpedLength = Math.hypot(normalizedX, warpedY) || 1;
              normalizedX += (normalizedX / warpedLength) * netRelease * 0.075;
              warpedY += (warpedY / warpedLength) * netRelease * 0.075;
              const x = centerX + normalizedX * radius;
              const y = centerY + warpedY * radius;
              if (step === 0) context.moveTo(x, y);
              else context.lineTo(x, y);
            }
            context.stroke();
          }
        }
      };
      drawWovenGrid("rgba(3,3,8,.96)", Math.max(1.25, radius * 0.012));
      drawWovenGrid("rgba(105,87,111,.55)", Math.max(0.48, radius * 0.0035));
      context.restore();

      context.strokeStyle = "rgba(205,176,216,.7)";
      context.lineWidth = Math.max(1, radius * 0.008);
      context.stroke(shape);
      context.restore();

      if (
        contacts.size > 0 ||
        canvasSqueezeAmount > 0.00015 ||
        Math.abs(canvasVolumeScale - 1) > 0.0001 ||
        Math.abs(releaseOffset) > 0.00025 ||
        Math.abs(releaseVelocity) > 0.004
      ) {
        frame = window.requestAnimationFrame(draw);
      } else {
        running = false;
      }
    };

    requestDraw = () => {
      if (disposed || running || document.hidden) return;
      running = true;
      previousTime = performance.now();
      frame = window.requestAnimationFrame(draw);
    };

    const stopDrawing = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const clearBackgroundPressure = () => {
      contacts.clear();
      releaseOffset = 0;
      releaseVelocity = 0;
      canvasSqueezeAmount = 0;
      canvasVolumeScale = 1;
      canvasSqueezeAxisX = 1;
      canvasSqueezeAxisY = 0;
      stopDrawing();
      publishInteraction({ contacts: 0, pressure: 0, hasInteracted });
    };

    const handleResize = () => {
      resize();
      requestDraw();
    };

    const handleVisibility = () => {
      if (document.hidden) clearBackgroundPressure();
      else requestDraw();
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);
    canvas.addEventListener("lostpointercapture", releasePointer);
    canvas.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", clearBackgroundPressure);
    window.addEventListener("pageshow", requestDraw);
    resize();
    requestDraw();

    return () => {
      disposed = true;
      stopDrawing();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", releasePointer);
      canvas.removeEventListener("pointercancel", releasePointer);
      canvas.removeEventListener("lostpointercapture", releasePointer);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", clearBackgroundPressure);
      window.removeEventListener("pageshow", requestDraw);
      publishInteraction({ contacts: 0, pressure: 0, hasInteracted });
    };
  }, [disabledRef, publishInteraction, publishTactile]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="application"
      aria-label={ariaLabel}
      tabIndex={0}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        userSelect: "none",
      }}
    />
  );
}

export default function StressBall3D({
  className,
  onInteractionChange,
  onTactileEvent,
  ariaLabel = DEFAULT_ARIA_LABEL,
  disabled = false,
}: StressBall3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onInteractionChange);
  const tactileCallbackRef = useRef(onTactileEvent);
  const disabledRef = useRef(disabled);
  const hasInteractedRef = useRef(false);
  const lastReportedRef = useRef<StressBallInteractionState>({
    contacts: -1,
    pressure: -1,
    hasInteracted: false,
  });
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    callbackRef.current = onInteractionChange;
  }, [onInteractionChange]);

  useEffect(() => {
    tactileCallbackRef.current = onTactileEvent;
  }, [onTactileEvent]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const publishTactile = useCallback((event: StressBallTactileEvent) => {
    tactileCallbackRef.current?.(event);
  }, []);

  const publishInteraction = useCallback(
    (state: StressBallInteractionState) => {
      if (state.hasInteracted) hasInteractedRef.current = true;
      const normalized = {
        contacts: state.contacts,
        pressure: Math.round(clampStressValue(state.pressure) * 100) / 100,
        hasInteracted: hasInteractedRef.current,
      } satisfies StressBallInteractionState;
      const previous = lastReportedRef.current;
      if (
        previous.contacts === normalized.contacts &&
        Math.abs(previous.pressure - normalized.pressure) < 0.025 &&
        !(normalized.pressure === 0 && previous.pressure !== 0) &&
        previous.hasInteracted === normalized.hasInteracted
      ) {
        return;
      }
      lastReportedRef.current = normalized;
      callbackRef.current?.(normalized);
    },
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host || webglFailed) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
    camera.position.set(0, 0.34, 6.82);
    camera.lookAt(0, -0.04, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch {
      const fallbackTimer = window.setTimeout(() => setWebglFailed(true), 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.transmissionResolutionScale = 0.5;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "opacity 320ms ease";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    let studioEnvironment: THREE.WebGLRenderTarget | null = null;
    try {
      studioEnvironment = createStudioEnvironment(renderer);
      scene.environment = studioEnvironment.texture;
    } catch {
      // Reflection is a polish layer. Older WebViews still get the complete
      // stress-ball interaction and the explicit studio lights below.
      studioEnvironment = null;
    }

    // MeshPhysicalMaterial transmission only samples opaque WebGL content.
    // This soft internal backdrop keeps the latex translucent in front of the
    // CSS scene instead of sampling transparent black on Android WebViews.
    const backdropTexture = createInternalBackdropTexture();
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        map: backdropTexture,
        depthWrite: true,
        toneMapped: false,
      }),
    );
    backdrop.position.z = -3.2;
    backdrop.renderOrder = -10;
    scene.add(backdrop);

    const ballGroup = new THREE.Group();
    ballGroup.position.y = 0.03;
    scene.add(ballGroup);
    const squeezeGroup = new THREE.Group();
    squeezeGroup.matrixAutoUpdate = false;
    squeezeGroup.matrix.identity();
    ballGroup.add(squeezeGroup);

    scene.add(new THREE.HemisphereLight(0xd7c7ff, 0x180d2c, 1.05));
    const warmKey = new THREE.DirectionalLight(0xffcfb4, 1.72);
    warmKey.position.set(-3.8, 4.6, 5.2);
    scene.add(warmKey);
    const coolRim = new THREE.DirectionalLight(0x78b8ee, 0.92);
    coolRim.position.set(4.8, 2.4, -3.4);
    scene.add(coolRim);
    const frontGlow = new THREE.PointLight(0xffa1d7, 0.44, 11);
    frontGlow.position.set(0.8, -0.2, 4.1);
    scene.add(frontGlow);

    const sphereTemplate = new THREE.SphereGeometry(STRESS_BALL_RADIUS, 48, 34);
    const bodyGeometry = sphereTemplate.clone();
    sphereTemplate.dispose();
    const directions = createDirectionBuffer(bodyGeometry);
    const restBodyVolume = getIndexedGeometryVolume(bodyGeometry);
    let currentBodyVolume = restBodyVolume;
    const vertexCount = bodyGeometry.getAttribute("position").count;
    const deformationOffsets = new Float32Array(vertexCount * 3);
    const latexTensions = new Float32Array(vertexCount);
    const latexTensionAttribute = new THREE.BufferAttribute(latexTensions, 1);
    latexTensionAttribute.setUsage(THREE.DynamicDrawUsage);
    bodyGeometry.setAttribute("aLatexTension", latexTensionAttribute);
    const latexNormalTexture = createLatexNormalTexture(renderer);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf9eaf4,
      emissive: 0x170a20,
      emissiveIntensity: 0.045,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      roughness: 0.12,
      metalness: 0,
      transmission: 0.68,
      thickness: 0.18,
      ior: 1.36,
      attenuationColor: new THREE.Color(0xd9a0cc),
      attenuationDistance: 4.5,
      clearcoat: 0.88,
      clearcoatRoughness: 0.052,
      normalMap: latexNormalTexture,
      normalScale: new THREE.Vector2(0.075, 0.075),
      envMapIntensity: 0.62,
      side: THREE.FrontSide,
    });
    installLatexTensionShader(bodyMaterial);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.renderOrder = 1;
    bodyGeometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(),
      STRESS_BALL_RADIUS * 1.35,
    );
    squeezeGroup.add(body);

    const beadRandom = seededStressRandom(0xbead1601);
    const beadDirections = createFibonacciDirections(GEL_BEAD_COUNT).map(
      (direction) => {
        const x = direction[0] + (beadRandom() - 0.5) * 0.11;
        const y = direction[1] + (beadRandom() - 0.5) * 0.11;
        const z = direction[2] + (beadRandom() - 0.5) * 0.11;
        const inverseLength = 1 / (Math.hypot(x, y, z) || 1);
        return [
          x * inverseLength,
          y * inverseLength,
          z * inverseLength,
        ] as const;
      },
    );
    const gelAssets = createStressGelAssets(renderer);
    const beadGeometry = gelAssets.beadGeometry;
    const beadMaterial = gelAssets.beadMaterial;
    const beads = new THREE.InstancedMesh(
      beadGeometry,
      beadMaterial,
      GEL_BEAD_COUNT,
    );
    beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    beads.renderOrder = 2;
    beads.frustumCulled = false;
    const beadSizes = new Float32Array(GEL_BEAD_COUNT);
    const beadDepths = new Float32Array(GEL_BEAD_COUNT);
    const beadMobility = new Float32Array(GEL_BEAD_COUNT);
    const beadPopBias = new Float32Array(GEL_BEAD_COUNT);
    const beadAspect = new Float32Array(GEL_BEAD_COUNT);
    beadDirections.forEach((_, index) => {
      beadSizes[index] = 0.14 + beadRandom() * 0.05;
      beadDepths[index] =
        index % 11 === 0
          ? 0.67 + beadRandom() * 0.06
          : 0.775 + beadRandom() * 0.065;
      beadMobility[index] = clampStressValue((beadDepths[index] - 0.72) / 0.12);
      beadPopBias[index] = 0.13 + beadRandom() * 0.31;
      beadAspect[index] = 0.9 + beadRandom() * 0.2;
      beads.setColorAt(
        index,
        createStressGelColor(index, beadRandom() * 2 - 1),
      );
    });
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    squeezeGroup.add(beads);

    const netLattice = createDiamondNetLattice();
    // The short rope pieces overlap at every junction, so end caps are never
    // visible. Keeping the cylinders open halves their triangle count on the
    // transmission prepass without changing the silhouette of the net.
    const ropeGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    const porousRopeTexture = createPorousRopeTexture(renderer);
    const netMaterial = new THREE.MeshStandardMaterial({
      color: 0x211a25,
      roughness: 0.82,
      roughnessMap: porousRopeTexture,
      bumpMap: porousRopeTexture,
      bumpScale: 0.035,
      metalness: 0,
      envMapIntensity: 0.18,
      depthWrite: true,
    });
    const netSegmentCount = netLattice.restLengths.length;
    const net = new THREE.InstancedMesh(
      ropeGeometry,
      netMaterial,
      netSegmentCount,
    );
    net.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    net.renderOrder = 4;
    net.frustumCulled = false;
    const netNodeCount = netLattice.directions.length / 3;
    const netNodePositions = new Float32Array(netNodeCount * 3);
    const netNodeTensions = new Float32Array(netNodeCount);
    const netNodeReleases = new Float32Array(netNodeCount);
    const netDummy = new THREE.Object3D();
    const netStart = new THREE.Vector3();
    const netEnd = new THREE.Vector3();
    const netDelta = new THREE.Vector3();
    const netMidpoint = new THREE.Vector3();
    const netUp = new THREE.Vector3(0, 1, 0);
    const netRestColor = new THREE.Color(0x211a25);
    const netTensionColor = new THREE.Color(0x67556c);
    const netWorkingColor = new THREE.Color();
    squeezeGroup.add(net);

    const contactShadowTexture = createContactShadowTexture();
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.42, 48),
      new THREE.MeshBasicMaterial({
        color: 0x1a0b24,
        map: contactShadowTexture,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    shadow.position.set(0, -1.54, 0.12);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1.18, 0.42, 1);
    shadow.renderOrder = 0;
    scene.add(shadow);

    const contacts = new Map<number, RuntimeContact>();
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const pointerProxySphere = new THREE.Sphere(
      new THREE.Vector3(),
      STRESS_BALL_RADIUS,
    );
    const inverseBallMatrix = new THREE.Matrix4();
    const localPointerRay = new THREE.Ray();
    const localHit = new THREE.Vector3();
    const dummy = new THREE.Object3D();
    const beadForward = new THREE.Vector3(0, 0, 1);
    const beadDirectionVector = new THREE.Vector3();
    const squeezeAxis = new THREE.Vector3(1, 0, 0);
    const targetSqueezeAxis = new THREE.Vector3(1, 0, 0);
    const squeezeMatrix = new THREE.Matrix4();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let hasInteracted = hasInteractedRef.current;
    let disposed = false;
    let contextLost = false;
    let running = false;
    let frame = 0;
    let firstFrame = true;
    let previousTime = performance.now();
    let normalFrame = 0;
    let lastRenderedTime = 0;
    let lastDeformationPressure = -1;
    let lastResizeWidth = 0;
    let lastResizeHeight = 0;
    let lastResizeRatio = 0;
    let lastReported = { contacts: -1, pressure: -1 };
    let releaseOffset = 0;
    let releaseVelocity = 0;
    let squeezeAmount = 0;
    let squeezeVolumeScale = 1;
    const compressionTarget = {
      axisX: 1,
      axisY: 0,
      axisZ: 0,
      amount: 0,
      separation: 0,
    };
    const vertexSample = {
      radiusScale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      indentation: 0,
      volumeBulge: 0,
      tensionRim: 0,
    };
    const beadSample = { ...vertexSample };
    const netSample = { ...vertexSample };

    const activeContactCount = () =>
      [...contacts.values()].filter(
        (contact) => contact.active && contact.targetStrength > 0,
      ).length;

    const releaseWeakestInactiveContact = () => {
      let weakestPointerId: number | null = null;
      let weakestStrength = Number.POSITIVE_INFINITY;
      for (const [pointerId, contact] of contacts) {
        if (!contact.active && contact.strength < weakestStrength) {
          weakestPointerId = pointerId;
          weakestStrength = contact.strength;
        }
      }
      if (weakestPointerId === null) return false;
      contacts.delete(weakestPointerId);
      return true;
    };

    const influences = () =>
      [...contacts.values()].map(
        (contact) =>
          ({
            direction: contact.direction,
            strength: contact.strength,
            radius: contact.radius,
            active: contact.active && contact.targetStrength > 0,
          }) satisfies StressContactInfluence,
      );

    const reportInteraction = (pressure: number) => {
      const active = activeContactCount();
      const roundedPressure = Math.round(pressure * 100) / 100;
      if (
        active === lastReported.contacts &&
        Math.abs(roundedPressure - lastReported.pressure) < 0.025 &&
        !(roundedPressure === 0 && lastReported.pressure !== 0)
      ) {
        return;
      }
      lastReported = { contacts: active, pressure: roundedPressure };
      publishInteraction({
        contacts: active,
        pressure: roundedPressure,
        hasInteracted,
      });
    };

    const resize = () => {
      if (disposed) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const pixelRatio = recommendedPixelRatio(width);
      if (
        width === lastResizeWidth &&
        height === lastResizeHeight &&
        pixelRatio === lastResizeRatio
      ) {
        return;
      }
      lastResizeWidth = width;
      lastResizeHeight = height;
      lastResizeRatio = pixelRatio;
      camera.aspect = width / height;
      const baselineHorizontalFov = THREE.MathUtils.degToRad(36);
      camera.fov =
        camera.aspect < 1
          ? THREE.MathUtils.radToDeg(
              2 *
                Math.atan(Math.tan(baselineHorizontalFov / 2) / camera.aspect),
            )
          : 31;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    };

    const getDirectionAtPointer = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return null;
      pointerNdc.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      camera.updateMatrixWorld();
      raycaster.setFromCamera(pointerNdc, camera);
      ballGroup.updateWorldMatrix(true, false);
      inverseBallMatrix.copy(ballGroup.matrixWorld).invert();
      localPointerRay.copy(raycaster.ray).applyMatrix4(inverseBallMatrix);

      const contactBreadth =
        Math.max(event.width || 0, event.height || 0) /
        Math.max(1, Math.min(bounds.width, bounds.height));
      const padding = clampStressValue(
        0.06 + contactBreadth * 0.18,
        0.06,
        0.095,
      );
      pointerProxySphere.radius = STRESS_BALL_RADIUS * (1 + padding);
      if (!localPointerRay.intersectSphere(pointerProxySphere, localHit)) {
        return null;
      }

      if (localHit.lengthSq() < 0.000001) return null;
      localHit.normalize();
      return [localHit.x, localHit.y, localHit.z] as const;
    };

    const upsertPointer = (event: PointerEvent, create: boolean) => {
      let existing = contacts.get(event.pointerId);
      if (create && existing) {
        if (existing.active) return false;
        contacts.delete(event.pointerId);
        existing = undefined;
      }
      if (!existing) {
        if (!create || activeContactCount() >= MAX_STRESS_CONTACTS)
          return false;
        if (
          contacts.size >= MAX_STRESS_CONTACTS &&
          !releaseWeakestInactiveContact()
        ) {
          return false;
        }
      }
      const direction = getDirectionAtPointer(event);
      if (!direction) {
        if (!existing) return false;
        // Pointer capture can keep delivering events well outside the toy.
        // Let pressure fade instead of freezing the last tangential hit.
        existing.targetStrength = 0;
        return true;
      }

      const contact = existing ?? {
        pointerId: event.pointerId,
        direction: direction ?? ([0, 0, 1] as const),
        strength: 0,
        velocity: 0,
        targetStrength: 0,
        radius: 0.42,
        active: true,
      };
      if (direction) contact.direction = direction;
      contact.active = true;
      contact.targetStrength = 0.78 + clampStressValue(event.pressure) * 0.22;
      const hostBounds = host.getBoundingClientRect();
      const contactDiameter = Math.max(event.width || 0, event.height || 0);
      const contactBreadth =
        contactDiameter /
        Math.max(1, Math.min(hostBounds.width, hostBounds.height));
      contact.radius = clampStressValue(0.4 + contactBreadth * 1.35, 0.4, 0.68);
      contacts.set(event.pointerId, contact);
      hasInteracted = true;
      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (disabledRef.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      if (!upsertPointer(event, true)) return;
      const contact = contacts.get(event.pointerId);
      publishTactile({
        type: "press",
        intensity: clampStressValue(
          0.48 + (contact?.targetStrength ?? 0.8) * 0.44,
        ),
        contacts: activeContactCount(),
      });
      publishInteraction({
        contacts: activeContactCount(),
        pressure: getStressPressure(influences()),
        hasInteracted: true,
      });
      try {
        host.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture can fail when Android cancels a system-edge gesture.
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (disabledRef.current) return;
      const before = contacts.get(event.pointerId);
      if (!before?.active) return;
      event.preventDefault();
      const previousDirection = before.direction;
      upsertPointer(event, false);
      const after = contacts.get(event.pointerId);
      if (!after) return;
      const dot = clampStressValue(
        previousDirection[0] * after.direction[0] +
          previousDirection[1] * after.direction[1] +
          previousDirection[2] * after.direction[2],
        -1,
        1,
      );
      const angularMotion = Math.acos(dot);
      if (angularMotion > 0.003) {
        publishTactile({
          type: "move",
          intensity: clampStressValue(angularMotion * 7.5),
          contacts: activeContactCount(),
        });
      }
    };

    const releasePointer = (event: PointerEvent) => {
      const contact = contacts.get(event.pointerId);
      if (!contact) return;
      if (contact.active) {
        publishTactile({
          type: "release",
          intensity:
            contact.strength > 0.025
              ? clampStressValue(0.28 + contact.strength * 0.72)
              : 0,
          contacts: Math.max(
            0,
            activeContactCount() - (contact.targetStrength > 0 ? 1 : 0),
          ),
          cancelled: event.type !== "pointerup",
        });
      }
      if (!reducedMotion && contact.active) {
        const remainingContacts = Math.max(0, activeContactCount() - 1);
        releaseVelocity = Math.min(
          0.56,
          releaseVelocity +
            clampStressValue(contact.strength) *
              (remainingContacts > 0 ? 0.18 : 0.46),
        );
      }
      if (contact.active && contact.strength < 0.13) {
        contact.strength = 0.13;
        contact.velocity = 0;
      }
      contact.active = false;
      contact.targetStrength = 0;
      contact.velocity = Math.min(0, contact.velocity);
      try {
        if (host.hasPointerCapture(event.pointerId)) {
          host.releasePointerCapture(event.pointerId);
        }
      } catch {
        // WebView may already have released the pointer on pointercancel.
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (disabledRef.current) return;
      if ((event.key !== " " && event.key !== "Enter") || event.repeat) return;
      event.preventDefault();
      if (
        !contacts.has(KEYBOARD_POINTER_ID) &&
        contacts.size >= MAX_STRESS_CONTACTS &&
        !releaseWeakestInactiveContact()
      ) {
        return;
      }
      contacts.set(KEYBOARD_POINTER_ID, {
        pointerId: KEYBOARD_POINTER_ID,
        direction: [0.08, 0.08, 0.99],
        strength: 0,
        velocity: 0,
        targetStrength: 0.92,
        radius: 0.48,
        active: true,
      });
      hasInteracted = true;
      publishTactile({
        type: "press",
        intensity: 0.86,
        contacts: activeContactCount(),
      });
      publishInteraction({ contacts: 1, pressure: 0, hasInteracted: true });
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      const contact = contacts.get(KEYBOARD_POINTER_ID);
      if (contact) {
        if (contact.active) {
          publishTactile({
            type: "release",
            intensity:
              contact.strength > 0.025
                ? clampStressValue(0.28 + contact.strength * 0.72)
                : 0,
            contacts: Math.max(
              0,
              activeContactCount() - (contact.targetStrength > 0 ? 1 : 0),
            ),
          });
        }
        if (!reducedMotion && contact.active) {
          const remainingContacts = Math.max(0, activeContactCount() - 1);
          releaseVelocity = Math.min(
            0.56,
            releaseVelocity +
              clampStressValue(contact.strength) *
                (remainingContacts > 0 ? 0.18 : 0.46),
          );
        }
        if (contact.strength < 0.13) {
          contact.strength = 0.13;
          contact.velocity = 0;
        }
        contact.active = false;
        contact.targetStrength = 0;
        contact.velocity = Math.min(0, contact.velocity);
      }
    };

    const render = (time: number) => {
      if (!running || disposed || contextLost) return;
      if (disabledRef.current && contacts.size > 0) {
        contacts.clear();
        lastReported = { contacts: 0, pressure: 0 };
        publishInteraction({ contacts: 0, pressure: 0, hasInteracted });
      }
      const contactAnimationActive =
        contacts.size > 0 ||
        lastDeformationPressure > 0.001 ||
        squeezeAmount > 0.0004 ||
        Math.abs(releaseOffset) > 0.00025 ||
        Math.abs(releaseVelocity) > 0.004;
      const activeFrameInterval =
        1000 / (lastResizeWidth > 0 && lastResizeWidth <= 370 ? 45 : 60);
      const frameInterval = contactAnimationActive
        ? activeFrameInterval
        : reducedMotion
          ? 250
          : 1000 / 30;
      if (!firstFrame && time - lastRenderedTime < frameInterval) {
        frame = window.requestAnimationFrame(render);
        return;
      }
      if (firstFrame || time - lastRenderedTime > frameInterval * 2.5) {
        lastRenderedTime = time;
      } else {
        // Advancing by the ideal interval (instead of assigning `time`) lets a
        // 60 Hz display alternate frames for a real ~45 fps compact-device cap.
        lastRenderedTime += frameInterval;
      }
      const delta = Math.min(
        0.04,
        Math.max(0.001, (time - previousTime) / 1000),
      );
      previousTime = time;

      for (const [pointerId, contact] of contacts) {
        const next = stepDampedValue(
          contact.strength,
          contact.velocity,
          contact.targetStrength,
          delta,
          contact.active ? 18 : reducedMotion ? 15 : 10.5,
        );
        contact.strength = next.value;
        contact.velocity = next.velocity;
        if (!contact.active && contact.strength < 0.0015) {
          contacts.delete(pointerId);
        }
      }

      const currentInfluences = influences();
      const pressure = getStressPressure(currentInfluences);
      getStressCompressionInto(currentInfluences, compressionTarget);
      if (compressionTarget.amount > 0.0001) {
        targetSqueezeAxis.set(
          compressionTarget.axisX,
          compressionTarget.axisY,
          compressionTarget.axisZ,
        );
        if (squeezeAxis.dot(targetSqueezeAxis) < 0) {
          targetSqueezeAxis.multiplyScalar(-1);
        }
        if (reducedMotion) {
          squeezeAxis.copy(targetSqueezeAxis);
        } else {
          squeezeAxis
            .lerp(targetSqueezeAxis, 1 - Math.exp(-delta * 18))
            .normalize();
        }
      }
      if (reducedMotion) {
        squeezeAmount = compressionTarget.amount;
      } else {
        const responseRate =
          compressionTarget.amount > squeezeAmount ? 18 : 8.2;
        squeezeAmount +=
          (compressionTarget.amount - squeezeAmount) *
          (1 - Math.exp(-delta * responseRate));
        if (squeezeAmount < 0.00015 && compressionTarget.amount === 0) {
          squeezeAmount = 0;
        }
      }
      reportInteraction(pressure);
      if (reducedMotion) {
        releaseOffset = 0;
        releaseVelocity = 0;
      } else {
        const elastic = stepElasticValue(
          releaseOffset,
          releaseVelocity,
          0,
          delta,
        );
        releaseOffset = elastic.value;
        releaseVelocity = elastic.velocity;
        if (
          Math.abs(releaseOffset) < 0.00025 &&
          Math.abs(releaseVelocity) < 0.004
        ) {
          releaseOffset = 0;
          releaseVelocity = 0;
        }
      }
      const deformationNeedsUpdate =
        firstFrame ||
        contacts.size > 0 ||
        pressure > 0.001 ||
        lastDeformationPressure > 0.001;

      if (deformationNeedsUpdate) {
        for (let vertex = 0; vertex < vertexCount; vertex += 1) {
          const offset = vertex * 3;
          const sample = sampleStressSurfaceInto(
            directions[offset],
            directions[offset + 1],
            directions[offset + 2],
            currentInfluences,
            pressure,
            vertexSample,
          );
          deformationOffsets[offset] = sample.offsetX;
          deformationOffsets[offset + 1] = sample.offsetY;
          deformationOffsets[offset + 2] = sample.offsetZ;
          latexTensions[vertex] = clampStressValue(
            sample.tensionRim * 0.72 +
              sample.volumeBulge * 3.2 +
              sample.indentation * 0.12,
          );
        }
        writeDeformedGeometry(bodyGeometry, directions, deformationOffsets, 1);
        if (compressionTarget.amount > 0 || squeezeAmount > 0.00015) {
          currentBodyVolume = getIndexedGeometryVolume(bodyGeometry);
        }
        latexTensionAttribute.needsUpdate = true;

        normalFrame += 1;
        if (activeContactCount() > 0 || normalFrame % 2 === 0 || firstFrame) {
          bodyGeometry.computeVertexNormals();
        }

        // Each rope endpoint samples the local latex deformation independently.
        // The resulting cylinders bend the net asymmetrically around each
        // fingertip and get thinner when the distance between nodes stretches.
        for (let node = 0; node < netNodeCount; node += 1) {
          const offset = node * 3;
          const directionX = netLattice.directions[offset];
          const directionY = netLattice.directions[offset + 1];
          const directionZ = netLattice.directions[offset + 2];
          const sample = sampleStressSurfaceInto(
            directionX,
            directionY,
            directionZ,
            currentInfluences,
            pressure,
            netSample,
          );
          const radialOffset =
            sample.offsetX * directionX +
            sample.offsetY * directionY +
            sample.offsetZ * directionZ;
          const deformationFollow = radialOffset < 0 ? 0.95 : 0.9;
          const netRelease = clampStressValue(
            sample.tensionRim * 0.9 - sample.indentation * 0.18,
          );
          const releaseLift =
            STRESS_BALL_RADIUS * 0.07 * Math.pow(netRelease, 0.85);
          netNodePositions[offset] =
            directionX * NET_REST_RADIUS +
            sample.offsetX * STRESS_BALL_RADIUS * deformationFollow +
            directionX * releaseLift;
          netNodePositions[offset + 1] =
            directionY * NET_REST_RADIUS +
            sample.offsetY * STRESS_BALL_RADIUS * deformationFollow +
            directionY * releaseLift;
          netNodePositions[offset + 2] =
            directionZ * NET_REST_RADIUS +
            sample.offsetZ * STRESS_BALL_RADIUS * deformationFollow +
            directionZ * releaseLift;
          netNodeReleases[node] = netRelease;
          netNodeTensions[node] = clampStressValue(
            sample.tensionRim * 0.74 +
              sample.volumeBulge * 2.8 +
              sample.indentation * 0.16 +
              netRelease * 0.35,
          );
        }

        for (let segment = 0; segment < netSegmentCount; segment += 1) {
          const segmentOffset = segment * 2;
          const startNode = netLattice.segments[segmentOffset];
          const endNode = netLattice.segments[segmentOffset + 1];
          const startOffset = startNode * 3;
          const endOffset = endNode * 3;
          netStart.fromArray(netNodePositions, startOffset);
          netEnd.fromArray(netNodePositions, endOffset);
          netDelta.subVectors(netEnd, netStart);
          const length = Math.max(0.001, netDelta.length());
          const stretchRatio = length / netLattice.restLengths[segment];
          const localTension = Math.max(
            netNodeTensions[startNode],
            netNodeTensions[endNode],
          );
          const localRelease = Math.max(
            netNodeReleases[startNode],
            netNodeReleases[endNode],
          );
          const visibleTension = clampStressValue(
            Math.max(0, stretchRatio - 1) * 5.2 + localTension * 0.7,
          );
          const thinning = clampStressValue(
            Math.pow(Math.max(0.68, stretchRatio), -0.5) *
              (1 - visibleTension * 0.2) *
              (1 - localRelease * 0.12),
            0.58,
            1.12,
          );
          const ropeRadius =
            NET_ROPE_RADIUS * netLattice.radiusVariance[segment] * thinning;

          netMidpoint.addVectors(netStart, netEnd).multiplyScalar(0.5);
          netDummy.position.copy(netMidpoint);
          netDelta.multiplyScalar(1 / length);
          netDummy.quaternion.setFromUnitVectors(netUp, netDelta);
          netDummy.scale.set(ropeRadius, length * 1.045, ropeRadius);
          netDummy.updateMatrix();
          net.setMatrixAt(segment, netDummy.matrix);
          netWorkingColor
            .copy(netRestColor)
            .lerp(netTensionColor, visibleTension * 0.72);
          net.setColorAt(segment, netWorkingColor);
        }
        net.instanceMatrix.needsUpdate = true;
        if (net.instanceColor) net.instanceColor.needsUpdate = true;

        beadDirections.forEach((direction, index) => {
          const sample = sampleStressSurfaceInto(
            direction[0],
            direction[1],
            direction[2],
            currentInfluences,
            pressure,
            beadSample,
          );
          const release = getGelProtrusion(
            direction,
            currentInfluences,
            pressure,
          );
          const rawProtrusion = clampStressValue(
            (release - beadPopBias[index]) * 2.55,
          );
          const protrusion =
            rawProtrusion * (1.28 - rawProtrusion * 0.28) * beadMobility[index];
          const deformationFollow = 0.48 + beadMobility[index] * 0.34;
          const size = beadSizes[index] * (1 + protrusion * 0.18);
          beadDirectionVector.set(direction[0], direction[1], direction[2]);
          dummy.position
            .copy(beadDirectionVector)
            .multiplyScalar(STRESS_BALL_RADIUS * beadDepths[index]);
          dummy.position.x +=
            sample.offsetX * STRESS_BALL_RADIUS * deformationFollow;
          dummy.position.y +=
            sample.offsetY * STRESS_BALL_RADIUS * deformationFollow;
          dummy.position.z +=
            sample.offsetZ * STRESS_BALL_RADIUS * deformationFollow;
          dummy.position.addScaledVector(
            beadDirectionVector,
            protrusion * 0.42,
          );
          dummy.quaternion.setFromUnitVectors(beadForward, beadDirectionVector);
          dummy.scale.set(
            size * beadAspect[index] * (1 + protrusion * 0.12),
            (size / beadAspect[index]) * (1 + protrusion * 0.12),
            size * (0.96 + protrusion * 0.5),
          );
          dummy.updateMatrix();
          beads.setMatrixAt(index, dummy.matrix);
        });
        beads.instanceMatrix.needsUpdate = true;

        lastDeformationPressure = pressure;
      }

      const idleTime = time / 1000;
      if (reducedMotion) {
        ballGroup.position.y = 0.03;
        ballGroup.rotation.y = -0.08;
      } else {
        ballGroup.position.y =
          0.03 + Math.sin(idleTime * 0.72) * 0.026 * (1 - pressure);
        ballGroup.rotation.y =
          -0.08 + Math.sin(idleTime * 0.22) * 0.045 * (1 - pressure);
      }
      // Local fingertip dents live in geometry. The nested group couples two
      // contacts and deliberately allows a small apparent volume loss: on a
      // flat screen that reads as a dense gel ball being compressed instead of
      // an incompressible balloon widening beyond the fingers.
      ballGroup.scale.setScalar(1 + releaseOffset);
      const volumeEngagementInput = clampStressValue(
        (squeezeAmount - 0.008) / 0.047,
      );
      const volumeEngagement =
        volumeEngagementInput *
        volumeEngagementInput *
        (3 - 2 * volumeEngagementInput);
      const rawVolumeScale =
        compressionTarget.amount > 0
          ? clampStressValue(
              Math.cbrt(restBodyVolume / Math.max(0.0001, currentBodyVolume)),
              0.94,
              1.04,
            )
          : 1;
      const targetVolumeScale = Math.exp(
        volumeEngagement * Math.log(rawVolumeScale),
      );
      squeezeVolumeScale +=
        (targetVolumeScale - squeezeVolumeScale) * (1 - Math.exp(-delta * 15));
      if (volumeEngagement === 0 && Math.abs(squeezeVolumeScale - 1) < 0.0001) {
        squeezeVolumeScale = 1;
      }
      const normalizedSqueeze = clampStressValue(squeezeAmount / 0.19);
      const easedSqueeze =
        normalizedSqueeze * normalizedSqueeze * (3 - 2 * normalizedSqueeze);
      const visualShrink = 1 - easedSqueeze * 0.055;
      const volumeCorrection = 1 + (squeezeVolumeScale - 1) * 0.35;
      const axisScale = clampStressValue(
        (1 - squeezeAmount) * visualShrink * volumeCorrection,
        0.72,
        1.02,
      );
      const perpendicularScale = clampStressValue(
        visualShrink *
          Math.pow(Math.max(0.81, 1 - squeezeAmount), -0.14) *
          volumeCorrection,
        0.93,
        1.015,
      );
      const axisDifference = axisScale - perpendicularScale;
      const axisX = squeezeAxis.x;
      const axisY = squeezeAxis.y;
      const axisZ = squeezeAxis.z;
      squeezeMatrix.set(
        perpendicularScale + axisDifference * axisX * axisX,
        axisDifference * axisX * axisY,
        axisDifference * axisX * axisZ,
        0,
        axisDifference * axisY * axisX,
        perpendicularScale + axisDifference * axisY * axisY,
        axisDifference * axisY * axisZ,
        0,
        axisDifference * axisZ * axisX,
        axisDifference * axisZ * axisY,
        perpendicularScale + axisDifference * axisZ * axisZ,
        0,
        0,
        0,
        0,
        1,
      );
      squeezeGroup.matrix.copy(squeezeMatrix);
      squeezeGroup.matrixWorldNeedsUpdate = true;
      shadow.material.opacity = 0.64 + pressure * 0.1;
      shadow.scale.x = 1.18 + pressure * 0.09;
      shadow.scale.y = 0.42 + pressure * 0.035;
      bodyMaterial.emissiveIntensity = 0.08 + pressure * 0.075;
      frontGlow.intensity = 0.44 + pressure * 0.2;

      try {
        renderer.render(scene, camera);
      } catch {
        // Some Android drivers accept WebGL creation but reject a physical
        // shader on its first real draw. Fail over instead of leaving an
        // invisible canvas that still captures touches.
        contextLost = true;
        running = false;
        renderer.domElement.style.opacity = "0";
        try {
          renderer.forceContextLoss();
        } catch {
          // The driver may already have invalidated the context that failed.
        }
        window.setTimeout(() => setWebglFailed(true), 0);
        return;
      }
      if (firstFrame) {
        firstFrame = false;
        renderer.domElement.style.opacity = "1";
        host.dataset.stressBallReady = "true";
      }
      frame = window.requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (running || disposed || contextLost || document.hidden) return;
      running = true;
      previousTime = performance.now();
      frame = window.requestAnimationFrame(render);
    };

    const stopLoop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const clearBackgroundContacts = () => {
      releaseOffset = 0;
      releaseVelocity = 0;
      squeezeAmount = 0;
      squeezeVolumeScale = 1;
      squeezeGroup.matrix.identity();
      squeezeGroup.matrixWorldNeedsUpdate = true;
      if (contacts.size === 0) return;
      contacts.clear();
      lastReported = { contacts: 0, pressure: 0 };
      publishInteraction({ contacts: 0, pressure: 0, hasInteracted });
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearBackgroundContacts();
        stopLoop();
      } else {
        startLoop();
      }
    };

    const onPageHide = () => {
      clearBackgroundContacts();
      stopLoop();
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stopLoop();
      setWebglFailed(true);
    };

    const onContextRestored = () => {
      // React remounts the complete renderer; partial restoration leaves stale
      // materials on several Android GPU drivers.
      setWebglFailed(true);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    }
    resize();

    host.addEventListener("pointerdown", onPointerDown, { passive: false });
    host.addEventListener("pointermove", onPointerMove, { passive: false });
    host.addEventListener("pointerup", releasePointer);
    host.addEventListener("pointercancel", releasePointer);
    host.addEventListener("lostpointercapture", releasePointer);
    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      onContextRestored,
    );
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", startLoop);
    startLoop();

    return () => {
      disposed = true;
      stopLoop();
      resizeObserver?.disconnect();
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", releasePointer);
      host.removeEventListener("pointercancel", releasePointer);
      host.removeEventListener("lostpointercapture", releasePointer);
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onContextRestored,
      );
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", startLoop);
      disposeScene(scene);
      scene.environment = null;
      studioEnvironment?.dispose();
      renderer.dispose();
      if (!contextLost) renderer.forceContextLoss();
      renderer.domElement.remove();
      delete host.dataset.stressBallReady;
      publishInteraction({
        contacts: 0,
        pressure: 0,
        hasInteracted,
      });
    };
  }, [publishInteraction, publishTactile, webglFailed]);

  const handleReactKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter") event.preventDefault();
  };

  if (webglFailed) {
    return (
      <StressBallCanvasFallback
        className={className}
        ariaLabel={ariaLabel}
        publishInteraction={publishInteraction}
        publishTactile={publishTactile}
        disabledRef={disabledRef}
      />
    );
  }

  return (
    <div
      ref={hostRef}
      className={className}
      role="application"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={0}
      onKeyDown={handleReactKeyDown}
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    />
  );
}
