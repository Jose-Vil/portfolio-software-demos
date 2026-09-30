export const MAX_STRESS_CONTACTS = 5;
export const STRESS_BALL_RADIUS = 1.5;

export type StressDirection = readonly [x: number, y: number, z: number];

export type StressContactInfluence = Readonly<{
  direction: StressDirection;
  strength: number;
  radius?: number;
  active?: boolean;
}>;

export type DampedValue = Readonly<{
  value: number;
  velocity: number;
}>;

export type MutableStressCompression = {
  axisX: number;
  axisY: number;
  axisZ: number;
  amount: number;
  separation: number;
};

export type StressSurfaceSample = Readonly<{
  radiusScale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  indentation: number;
  volumeBulge: number;
  tensionRim: number;
}>;

export type MutableStressSurfaceSample = {
  radiusScale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  indentation: number;
  volumeBulge: number;
  tensionRim: number;
};

export function clampStressValue(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Stable critically damped integration. It remains well behaved after a long
 * browser pause, unlike a simple Euler spring.
 */
export function stepDampedValue(
  current: number,
  velocity: number,
  target: number,
  deltaSeconds: number,
  angularFrequency = 16,
): DampedValue {
  const delta = clampStressValue(deltaSeconds, 0, 0.05);
  const omega = Math.max(0.01, angularFrequency);
  const spring = omega * omega;
  const damping = 2 * omega;
  const denominator = 1 + damping * delta + spring * delta * delta;
  const nextVelocity =
    (velocity + spring * delta * (target - current)) / denominator;

  return {
    value: current + delta * nextVelocity,
    velocity: nextVelocity,
  };
}

/**
 * Closed-form underdamped spring used only for the whole-volume rebound after
 * release. Keeping this separate from contact pressure prevents gel lobes from
 * disappearing and reappearing while the toy settles.
 */
export function stepElasticValue(
  current: number,
  velocity: number,
  target: number,
  deltaSeconds: number,
  angularFrequency = 13.2,
  dampingRatio = 0.31,
): DampedValue {
  const delta = clampStressValue(deltaSeconds, 0, 0.05);
  const omega = Math.max(0.01, angularFrequency);
  const damping = clampStressValue(dampingRatio, 0.01, 0.98);
  const offset = current - target;
  const decayRate = damping * omega;
  const dampedFrequency = omega * Math.sqrt(1 - damping * damping);
  const decay = Math.exp(-decayRate * delta);
  const cosine = Math.cos(dampedFrequency * delta);
  const sine = Math.sin(dampedFrequency * delta);

  return {
    value:
      target +
      decay *
        (offset * cosine +
          ((velocity + decayRate * offset) / dampedFrequency) * sine),
    velocity:
      decay *
      (velocity * cosine -
        ((decayRate * velocity + omega * omega * offset) / dampedFrequency) *
          sine),
  };
}

export function getStressPressure(contacts: readonly StressContactInfluence[]) {
  if (contacts.length === 0) return 0;

  const accumulated = contacts.reduce(
    (sum, contact) => sum + clampStressValue(contact.strength),
    0,
  );
  const fingerBonus = 1 + Math.max(0, contacts.length - 1) * 0.105;

  // Exponential saturation gives one finger a satisfying response while five
  // fingers still feel noticeably stronger without collapsing the mesh.
  return clampStressValue(1 - Math.exp(-accumulated * 0.72 * fingerBonus));
}

/**
 * Resolves a real two-finger pinch without allocating per frame. One finger
 * keeps the original local deformation bit-for-bit; three or more contacts
 * also stay local so the global squeeze axis never jumps between pairs.
 *
 * `amount` is the fractional shortening along the axis joining both fingers.
 * The renderer combines it with a restrained perpendicular response and a
 * small uniform contraction. That makes a two-finger squeeze look physically
 * compact on a flat screen instead of inflating sideways like a balloon.
 */
export function getStressCompressionInto(
  contacts: readonly StressContactInfluence[],
  target: MutableStressCompression,
) {
  let firstIndex = -1;
  let secondIndex = -1;
  let meaningfulContacts = 0;

  for (let index = 0; index < contacts.length; index += 1) {
    if (contacts[index].active === false || contacts[index].strength <= 0.015) {
      continue;
    }
    if (meaningfulContacts === 0) firstIndex = index;
    else if (meaningfulContacts === 1) secondIndex = index;
    meaningfulContacts += 1;
  }

  if (meaningfulContacts !== 2 || firstIndex < 0 || secondIndex < 0) {
    target.axisX = 1;
    target.axisY = 0;
    target.axisZ = 0;
    target.amount = 0;
    target.separation = 0;
    return target;
  }

  const left = contacts[firstIndex];
  const right = contacts[secondIndex];
  const leftLength =
    Math.hypot(left.direction[0], left.direction[1], left.direction[2]) || 1;
  const rightLength =
    Math.hypot(right.direction[0], right.direction[1], right.direction[2]) || 1;
  const leftX = left.direction[0] / leftLength;
  const leftY = left.direction[1] / leftLength;
  const leftZ = left.direction[2] / leftLength;
  const rightX = right.direction[0] / rightLength;
  const rightY = right.direction[1] / rightLength;
  const rightZ = right.direction[2] / rightLength;
  const dot = clampStressValue(
    leftX * rightX + leftY * rightY + leftZ * rightZ,
    -1,
    1,
  );
  const halfChord = Math.sqrt(Math.max(0, (1 - dot) * 0.5));
  const normalizedSeparation = clampStressValue((halfChord - 0.14) / 0.38);
  const separationGate =
    normalizedSeparation *
    normalizedSeparation *
    (3 - 2 * normalizedSeparation);
  const leftStrength = clampStressValue(left.strength);
  const rightStrength = clampStressValue(right.strength);
  const harmonicStrength =
    (2 * leftStrength * rightStrength) /
    (leftStrength + rightStrength + 0.000001);
  const axisX = leftX - rightX;
  const axisY = leftY - rightY;
  const axisZ = leftZ - rightZ;
  const axisLength = Math.hypot(axisX, axisY, axisZ);

  if (axisLength < 0.0001) {
    target.axisX = 1;
    target.axisY = 0;
    target.axisZ = 0;
    target.amount = 0;
    target.separation = halfChord * 2;
    return target;
  }

  target.axisX = axisX / axisLength;
  target.axisY = axisY / axisLength;
  target.axisZ = axisZ / axisLength;
  target.amount = clampStressValue(
    0.23 * harmonicStrength * separationGate,
    0,
    0.19,
  );
  target.separation = halfChord * 2;
  return target;
}

function normalizedDot(
  x: number,
  y: number,
  z: number,
  direction: StressDirection,
) {
  const length = Math.hypot(x, y, z) || 1;
  return clampStressValue(
    (x * direction[0] + y * direction[1] + z * direction[2]) / length,
    -1,
    1,
  );
}

/**
 * Stable low-frequency spatial noise used to break the mathematically perfect
 * symmetry of a sphere. It is deterministic (so saved/replayed interactions
 * never jump) and is only applied while the ball is under pressure.
 */
export function getStressAsymmetry(x: number, y: number, z: number) {
  const length = Math.hypot(x, y, z) || 1;
  const nx = x / length;
  const ny = y / length;
  const nz = z / length;
  const broad =
    Math.sin(nx * 5.73 + ny * 2.31 - nz * 1.17) * 0.48 +
    Math.cos(nx * 1.91 - ny * 6.07 + nz * 3.29) * 0.31 +
    Math.sin((nx + nz) * 8.41 + ny * 1.63) * 0.21;
  return clampStressValue(broad, -1, 1);
}

function getContactSkew(
  x: number,
  y: number,
  z: number,
  direction: StressDirection,
  irregularity = getStressAsymmetry(x, y, z),
) {
  const tangentX = y * direction[2] - z * direction[1];
  const tangentY = z * direction[0] - x * direction[2];
  const tangentZ = x * direction[1] - y * direction[0];
  const phase = tangentX * 5.17 + tangentY * 3.43 + tangentZ * 7.11;
  return 1 + Math.sin(phase) * 0.115 + irregularity * 0.075;
}

export function getContactInfluence(
  x: number,
  y: number,
  z: number,
  contact: StressContactInfluence,
) {
  const dot = normalizedDot(x, y, z, contact.direction);
  const angle = Math.acos(dot);
  const radius = clampStressValue(contact.radius ?? 0.42, 0.22, 0.78);
  return (
    clampStressValue(contact.strength) *
    Math.exp(-(angle * angle) / (2 * radius * radius))
  );
}

export function sampleStressSurface(
  x: number,
  y: number,
  z: number,
  contacts: readonly StressContactInfluence[],
  pressure = getStressPressure(contacts),
): StressSurfaceSample {
  return sampleStressSurfaceInto(x, y, z, contacts, pressure, {
    radiusScale: 1,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    indentation: 0,
    volumeBulge: 0,
    tensionRim: 0,
  });
}

/** Allocation-free form used by the realtime renderer. */
export function sampleStressSurfaceInto(
  x: number,
  y: number,
  z: number,
  contacts: readonly StressContactInfluence[],
  pressure: number,
  target: MutableStressSurfaceSample,
): MutableStressSurfaceSample {
  let indentation = 0;
  let nearestInfluence = 0;
  let tensionRim = 0;
  let projectedOffsetX = 0;
  let projectedOffsetY = 0;
  let projectedOffsetZ = 0;
  const directionLength = Math.hypot(x, y, z) || 1;
  const nx = x / directionLength;
  const ny = y / directionLength;
  const nz = z / directionLength;
  const irregularity = getStressAsymmetry(nx, ny, nz);

  for (const contact of contacts) {
    const dot = clampStressValue(
      nx * contact.direction[0] +
        ny * contact.direction[1] +
        nz * contact.direction[2],
      -1,
      1,
    );
    const angle = Math.acos(dot);
    const contactRadius = clampStressValue(contact.radius ?? 0.42, 0.22, 0.78);
    const baseInfluence =
      clampStressValue(contact.strength) *
      Math.exp(-(angle * angle) / (2 * contactRadius * contactRadius));
    const skew = getContactSkew(nx, ny, nz, contact.direction, irregularity);
    const influence = baseInfluence * skew;
    indentation += influence;
    nearestInfluence = Math.max(nearestInfluence, influence);
    projectedOffsetX -= contact.direction[0] * influence * 0.19;
    projectedOffsetY -= contact.direction[1] * influence * 0.19;
    projectedOffsetZ -= contact.direction[2] * influence * 0.19;

    // A soft raised shoulder around each indentation is what makes the skin
    // read as elastic rather than as a sphere with a hole cut into it.
    const rimCenter = contactRadius * (1.45 + irregularity * 0.09);
    const rimWidth = Math.max(
      0.08,
      contactRadius * (0.28 + (irregularity + 1) * 0.025),
    );
    const rimDistance = angle - rimCenter;
    const rimInfluence =
      clampStressValue(contact.strength) *
      Math.exp(-(rimDistance * rimDistance) / (2 * rimWidth * rimWidth));
    tensionRim += rimInfluence;
    projectedOffsetX += contact.direction[0] * rimInfluence * 0.045;
    projectedOffsetY += contact.direction[1] * rimInfluence * 0.045;
    projectedOffsetZ += contact.direction[2] * rimInfluence * 0.045;
  }

  indentation = clampStressValue(indentation, 0, 1.34);
  nearestInfluence = clampStressValue(nearestInfluence);
  tensionRim = clampStressValue(tensionRim, 0, 1.25);

  // Volume pushed away from the fingertips appears around the unpressed area.
  // The equatorial term avoids a uniformly inflated, balloon-like result.
  const normalizedY = ny;
  const equator = 1 - Math.abs(normalizedY);
  const volumeBulge =
    pressure *
    (0.05 + equator * 0.025 + irregularity * 0.011) *
    (1 - nearestInfluence * 0.72);

  // Saturate only the displacement magnitude. Clamping a final vertex radius
  // makes a visible planar shelf once neighboring vertices reach the same
  // bound; tanh preserves a continuous falloff at every pressure level.
  const projectedMagnitude = Math.hypot(
    projectedOffsetX,
    projectedOffsetY,
    projectedOffsetZ,
  );
  const maximumProjectedOffset = 0.24;
  if (projectedMagnitude > 0.000001) {
    const smoothMagnitude =
      Math.tanh(projectedMagnitude / maximumProjectedOffset) *
      maximumProjectedOffset;
    const projectedScale = smoothMagnitude / projectedMagnitude;
    projectedOffsetX *= projectedScale;
    projectedOffsetY *= projectedScale;
    projectedOffsetZ *= projectedScale;
  }

  const offsetX = projectedOffsetX + nx * volumeBulge;
  const offsetY = projectedOffsetY + ny * volumeBulge;
  const offsetZ = projectedOffsetZ + nz * volumeBulge;
  const radialOffset = offsetX * nx + offsetY * ny + offsetZ * nz;
  const radiusScale = 1 + radialOffset;

  target.radiusScale = radiusScale;
  target.offsetX = offsetX;
  target.offsetY = offsetY;
  target.offsetZ = offsetZ;
  target.indentation = indentation;
  target.volumeBulge = volumeBulge;
  target.tensionRim = tensionRim;
  return target;
}

export function getGelProtrusion(
  direction: StressDirection,
  contacts: readonly StressContactInfluence[],
  pressure = getStressPressure(contacts),
) {
  let directInfluence = 0;
  let primaryRelease = 0;
  let secondaryRelease = 0;
  let meaningfulReleaseContacts = 0;
  const length = Math.hypot(direction[0], direction[1], direction[2]) || 1;
  const nx = direction[0] / length;
  const ny = direction[1] / length;
  const nz = direction[2] / length;
  const asymmetry = getStressAsymmetry(nx, ny, nz);
  for (const contact of contacts) {
    const dot = clampStressValue(
      nx * contact.direction[0] +
        ny * contact.direction[1] +
        nz * contact.direction[2],
      -1,
      1,
    );
    const angle = Math.acos(dot);
    const contactRadius = clampStressValue(contact.radius ?? 0.42, 0.22, 0.78);
    const baseInfluence =
      clampStressValue(contact.strength) *
      Math.exp(-(angle * angle) / (2 * contactRadius * contactRadius));
    directInfluence = Math.max(directInfluence, baseInfluence);
    if (contact.strength > 0.025) meaningfulReleaseContacts += 1;

    // Gel escapes through a handful of cells surrounding the pressed area,
    // not uniformly over the entire opposite hemisphere.
    const releaseCenter = contactRadius * (1.42 + asymmetry * 0.1);
    const releaseWidth = Math.max(
      0.09,
      contactRadius * (0.23 + (asymmetry + 1) * 0.015),
    );
    const releaseDistance = angle - releaseCenter;
    const candidateRelease =
      clampStressValue(contact.strength) *
      (0.94 + asymmetry * 0.18) *
      Math.exp(
        -(releaseDistance * releaseDistance) /
          (2 * releaseWidth * releaseWidth),
      );
    if (candidateRelease > primaryRelease) {
      secondaryRelease = primaryRelease;
      primaryRelease = candidateRelease;
    } else {
      secondaryRelease = Math.max(secondaryRelease, candidateRelease);
    }
  }

  // Beads directly below the fingertip retreat with the membrane. Only the
  // two strongest local release rings are blended, so several fingers can
  // reveal a richer cluster without inflating the far hemisphere.
  const localizedRelease = primaryRelease + secondaryRelease * 0.16;
  const multiFingerBoost =
    1 + Math.min(0.1, Math.max(0, meaningfulReleaseContacts - 1) * 0.08);
  return clampStressValue(
    localizedRelease * (0.94 + pressure * 0.18) * multiFingerBoost -
      directInfluence * 0.38,
  );
}

/** Deterministic, visually even directions for the instanced gel beads. */
export function createFibonacciDirections(count: number): StressDirection[] {
  const total = Math.max(1, Math.floor(count));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return Array.from({ length: total }, (_, index) => {
    const y = 1 - ((index + 0.5) / total) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * goldenAngle + 0.37;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as const;
  });
}

export function seededStressRandom(seed = 0x16a71e) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
