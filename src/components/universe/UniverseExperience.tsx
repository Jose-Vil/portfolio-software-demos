"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Focus,
  Heart,
  Move,
  Sparkles,
  X,
} from "lucide-react";
import * as THREE from "three";
import {
  FINAL_GIFT,
  GIFTS,
  HEART_MESSAGE,
  PHRASES,
  createDeepStars,
  createGalaxySystem,
  createGiftObject,
  createGlowTexture,
  createHeart,
  createPlanetObjects,
  createSeededRandom,
  createZodiacConstellations,
  disposeObject,
  findInteraction,
  setGiftObjectOpened,
  updateGiftObject,
  type GiftDefinition,
} from "./cosmos-scene";
import {
  COSMOS_GIFT_DELIVERY_KEY,
  areAllCosmosGiftsDelivered,
  isCosmosFinalGiftUnlocked,
  persistCosmosFinalGiftUnlock,
  type CosmosGiftDeliveryState,
} from "./cosmos-gift-progress";
import { createLittleWorlds, updateLittleWorlds } from "./cosmos-little-worlds";
import {
  createCosmosBackground,
  updateCosmosBackground,
} from "./cosmos-background";
import {
  createCosmosArrival,
  startCosmosArrival,
  updateCosmosArrival,
} from "./cosmos-arrival";
import { createMeteorSystem, updateMeteorSystem } from "./cosmos-meteors";
import styles from "./Universe.module.css";

type ExperiencePhase = "entry" | "journey" | "exploring";

type SceneRuntime = {
  resetView: () => void;
  setEnabled: (enabled: boolean) => void;
  setGiftOpened: (id: string, opened: boolean, immediate?: boolean) => void;
  setFinalGiftUnlocked: (unlocked: boolean, immediate?: boolean) => void;
  startJourney: () => void;
};

type NavigationInput = {
  strafe: number;
  forward: number;
  vertical: number;
};

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 20, 66);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 11.5, 0);
const JOURNEY_LINES = [
  "Preparando el salto…",
  "Atravesando el campo estelar…",
  "Acercándonos al núcleo galáctico…",
  "Llegando al universo…",
];
const GIFT_IDS = GIFTS.map((gift) => gift.id);

type GiftDeliveryState = CosmosGiftDeliveryState;

function createDefaultGiftDeliveryState(): GiftDeliveryState {
  return Object.fromEntries(
    GIFTS.map((gift) => [gift.id, false]),
  ) as GiftDeliveryState;
}

function readGiftDeliveryState() {
  const defaults = createDefaultGiftDeliveryState();
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(COSMOS_GIFT_DELIVERY_KEY) ?? "{}",
    ) as unknown;
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      return defaults;
    }
    GIFTS.forEach((gift) => {
      defaults[gift.id] = (stored as Record<string, unknown>)[gift.id] === true;
    });
    return defaults;
  } catch {
    return defaults;
  }
}

type UniverseExperienceProps = {
  onExit?: () => void;
};

export default function UniverseExperience({
  onExit,
}: UniverseExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const phaseRef = useRef<ExperiencePhase>("entry");
  const phraseRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const phraseRevealUntilRef = useRef<number[]>([]);
  const entryDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const guideTimeoutRef = useRef<number | null>(null);
  const navigationInputRef = useRef<NavigationInput>({
    strafe: 0,
    forward: 0,
    vertical: 0,
  });
  const movementPadRef = useRef<HTMLDivElement>(null);
  const movementKnobRef = useRef<HTMLSpanElement>(null);
  const movementPointerRef = useRef<number | null>(null);
  const finalGiftPresentationTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<ExperiencePhase>("entry");
  const [ready, setReady] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftDefinition | null>(null);
  const [giftDeliveryState, setGiftDeliveryState] = useState<GiftDeliveryState>(
    readGiftDeliveryState,
  );
  const giftDeliveryStateRef = useRef(giftDeliveryState);
  const [finalGiftUnlocked, setFinalGiftUnlocked] = useState(
    isCosmosFinalGiftUnlocked,
  );
  const finalGiftUnlockedRef = useRef(finalGiftUnlocked);
  const pendingFinalGiftRevealRef = useRef(
    !finalGiftUnlocked &&
      areAllCosmosGiftsDelivered(giftDeliveryState, GIFT_IDS),
  );
  const [showFinalGiftAnnouncement, setShowFinalGiftAnnouncement] =
    useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [journeyLine, setJourneyLine] = useState(0);

  const revealPhrase = useCallback((index: number) => {
    phraseRevealUntilRef.current[index] = performance.now() + 10000;
  }, []);

  useEffect(() => {
    if (!finalGiftUnlockedRef.current) return;
    persistCosmosFinalGiftUnlock();
  }, []);

  useEffect(
    () => () => {
      if (finalGiftPresentationTimerRef.current !== null) {
        window.clearTimeout(finalGiftPresentationTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const exploring = phase === "exploring";
    phaseRef.current = phase;
    runtimeRef.current?.setEnabled(exploring && !selectedGift);
    if (!exploring || selectedGift) {
      navigationInputRef.current.strafe = 0;
      navigationInputRef.current.forward = 0;
      navigationInputRef.current.vertical = 0;
      if (movementKnobRef.current) {
        movementKnobRef.current.style.transform = "translate3d(0, 0, 0)";
      }
    }
  }, [phase, selectedGift]);

  const presentFinalGift = useCallback(() => {
    if (finalGiftUnlockedRef.current) return;
    pendingFinalGiftRevealRef.current = false;
    finalGiftUnlockedRef.current = true;
    setFinalGiftUnlocked(true);
    persistCosmosFinalGiftUnlock();
    runtimeRef.current?.resetView();
    runtimeRef.current?.setFinalGiftUnlocked(true, false);
    setSelectedGift(null);
    setShowFinalGiftAnnouncement(true);

    if (finalGiftPresentationTimerRef.current !== null) {
      window.clearTimeout(finalGiftPresentationTimerRef.current);
    }
    finalGiftPresentationTimerRef.current = window.setTimeout(() => {
      setShowFinalGiftAnnouncement(false);
      setSelectedGift(FINAL_GIFT);
      finalGiftPresentationTimerRef.current = null;
    }, 3200);
  }, []);

  useEffect(() => {
    if (phase !== "exploring" || !ready || !pendingFinalGiftRevealRef.current) {
      return;
    }
    presentFinalGift();
  }, [phase, presentFinalGift, ready]);

  const toggleSelectedGiftRedeemed = useCallback(() => {
    if (!selectedGift || selectedGift.kind !== "gift") return;

    const willBeRedeemed = !giftDeliveryStateRef.current[selectedGift.id];
    const next = {
      ...giftDeliveryStateRef.current,
      [selectedGift.id]: willBeRedeemed,
    };
    giftDeliveryStateRef.current = next;
    setGiftDeliveryState(next);
    try {
      window.localStorage.setItem(
        COSMOS_GIFT_DELIVERY_KEY,
        JSON.stringify(next),
      );
    } catch {
      // La animación conserva el estado de esta sesión aunque se bloquee storage.
    }
    runtimeRef.current?.setGiftOpened(selectedGift.id, willBeRedeemed);

    const completedTheCollection =
      !finalGiftUnlockedRef.current &&
      areAllCosmosGiftsDelivered(next, GIFT_IDS);
    if (completedTheCollection) presentFinalGift();
  }, [presentFinalGift, selectedGift]);

  const enterUniverse = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!ready || !runtime || phaseRef.current !== "entry") return;
    phaseRef.current = "journey";
    setPhase("journey");
    setJourneyLine(0);
    setSelectedGift(null);
    setShowGuide(false);
    if (guideTimeoutRef.current) {
      window.clearTimeout(guideTimeoutRef.current);
      guideTimeoutRef.current = null;
    }
    runtime.startJourney();
  }, [ready]);

  const exitUniverse = useCallback(() => {
    runtimeRef.current?.setEnabled(false);
    setShowFinalGiftAnnouncement(false);
    if (finalGiftPresentationTimerRef.current !== null) {
      window.clearTimeout(finalGiftPresentationTimerRef.current);
      finalGiftPresentationTimerRef.current = null;
    }

    if (onExit) {
      onExit();
      return;
    }

    phaseRef.current = "entry";
    setPhase("entry");
    setSelectedGift(null);
    setShowGuide(false);
    runtimeRef.current?.resetView();
  }, [onExit]);

  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    const exit =
      containerRef.current?.querySelector<HTMLButtonElement>("button");
    exit?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exitUniverse();
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          containerRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [tabindex="0"]',
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      origin?.focus();
    };
  }, [exitUniverse]);

  const handleEntryPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      entryDragStartRef.current = null;
      return;
    }
    entryDragStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleEntryPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = entryDragStartRef.current;
    entryDragStartRef.current = null;
    if (!start) return;

    const deltaY = event.clientY - start.y;
    const deltaX = event.clientX - start.x;
    if (deltaY < -42 && Math.abs(deltaY) > Math.abs(deltaX) * 0.8) {
      enterUniverse();
    }
  };

  const updateMovementPad = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pad = movementPadRef.current;
      if (!pad || movementPointerRef.current !== event.pointerId) return;
      const bounds = pad.getBoundingClientRect();
      const radius = Math.min(bounds.width, bounds.height) * 0.31;
      const rawX = event.clientX - (bounds.left + bounds.width / 2);
      const rawY = event.clientY - (bounds.top + bounds.height / 2);
      const distance = Math.hypot(rawX, rawY);
      const scale = distance > radius ? radius / distance : 1;
      const x = rawX * scale;
      const y = rawY * scale;
      navigationInputRef.current.strafe = x / radius;
      navigationInputRef.current.forward = -y / radius;
      if (movementKnobRef.current) {
        movementKnobRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    },
    [],
  );

  const stopMovementPad = useCallback((pointerId?: number) => {
    if (
      typeof pointerId === "number" &&
      movementPointerRef.current !== pointerId
    ) {
      return;
    }
    movementPointerRef.current = null;
    navigationInputRef.current.strafe = 0;
    navigationInputRef.current.forward = 0;
    if (movementKnobRef.current) {
      movementKnobRef.current.style.transform = "translate3d(0, 0, 0)";
    }
  }, []);

  const handleMovementPadDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "exploring") return;
    movementPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateMovementPad(event);
  };

  const startVerticalMovement = (
    direction: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    navigationInputRef.current.vertical = direction;
  };

  const stopVerticalMovement = () => {
    navigationInputRef.current.vertical = 0;
  };

  useEffect(() => {
    const container = containerRef.current;
    const host = canvasHostRef.current;
    if (!container || !host) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const lowPower = isMobile || hardwareConcurrency <= 4 || deviceMemory <= 4;
    const galaxyCount = prefersReducedMotion ? 2600 : lowPower ? 4400 : 7600;
    const deepStarCount = prefersReducedMotion ? 650 : lowPower ? 1050 : 1750;
    const crystalCount = prefersReducedMotion ? 190 : lowPower ? 320 : 560;
    const heartResolution = lowPower ? 40 : 48;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x01020a);
    scene.fog = new THREE.FogExp2(0x01020a, 0.00225);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 720);
    camera.position.copy(INITIAL_CAMERA_POSITION);
    camera.lookAt(INITIAL_CAMERA_TARGET);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !lowPower,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      const fallback = document.createElement("div");
      fallback.className = styles.webglFallback;
      fallback.innerHTML =
        "<strong>No pudimos encender esta galaxia 3D.</strong><span>Activa la aceleración gráfica del navegador o prueba en otro dispositivo.</span>";
      container.appendChild(fallback);
      return () => {
        fallback.remove();
        document.body.style.overflow = previousOverflow;
        document.body.style.overscrollBehavior = previousOverscroll;
      };
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.setClearColor(0x01020a, 1);
    renderer.domElement.className = styles.webglCanvas;
    renderer.domElement.setAttribute(
      "aria-label",
      "Galaxia tridimensional que puedes recorrer libremente",
    );
    renderer.domElement.setAttribute("tabindex", "0");
    host.appendChild(renderer.domElement);

    const random = createSeededRandom(23072026);
    const ownedTextures = new Set<THREE.Texture>();
    const starTexture = createGlowTexture("#8cb9ff", 96, 0.18);
    const heartGlowTexture = createGlowTexture("#ff2e91", 192, 0.22);
    [starTexture, heartGlowTexture].forEach((texture) =>
      ownedTextures.add(texture),
    );

    const universe = new THREE.Group();
    scene.add(universe);

    const deepStars = createDeepStars(deepStarCount, starTexture, random);
    scene.add(deepStars);

    const cosmicBackground = createCosmosBackground({
      quality: lowPower ? "low" : "high",
      reducedMotion: prefersReducedMotion,
      seed: 23072027,
    });
    scene.add(cosmicBackground.group);

    const meteorSystem = createMeteorSystem({
      quality: lowPower ? "mobile" : "desktop",
      seed: 23072028,
      center: [0, 24, 0],
      radius: 104,
      shootingStarsPerSecond: prefersReducedMotion
        ? 0.24
        : lowPower
          ? 0.72
          : 1.18,
      meteorsPerSecond: prefersReducedMotion ? 0.035 : lowPower ? 0.1 : 0.16,
    });
    scene.add(meteorSystem.group);

    const arrival = createCosmosArrival({
      quality: lowPower ? "low" : "high",
      reducedMotion: prefersReducedMotion,
      seed: 23072029,
    });
    scene.add(arrival.group);

    const galaxy = createGalaxySystem(galaxyCount, starTexture, random);
    universe.add(galaxy.group);

    const heart = createHeart(
      crystalCount,
      heartResolution,
      heartGlowTexture,
      random,
    );
    universe.add(heart.group);

    const zodiacConstellations = createZodiacConstellations(starTexture);
    universe.add(zodiacConstellations);

    const giftObjects = GIFTS.map((definition) => {
      const gift = createGiftObject(definition);
      universe.add(gift);
      return gift;
    });
    const finalGiftObject = createGiftObject(FINAL_GIFT);
    finalGiftObject.visible = finalGiftUnlockedRef.current;
    finalGiftObject.userData.unlockProgress = finalGiftUnlockedRef.current
      ? 1
      : 0;
    finalGiftObject.userData.unlockTarget = finalGiftUnlockedRef.current
      ? 1
      : 0;
    finalGiftObject.userData.displayScale = 1.72;
    universe.add(finalGiftObject);
    const giftObjectsById = new Map(
      giftObjects.map((gift, index) => [GIFTS[index].id, gift]),
    );
    const setGiftOpened = (id: string, opened: boolean, immediate = false) => {
      const gift = giftObjectsById.get(id);
      if (gift) setGiftObjectOpened(gift, opened, immediate);
    };
    GIFTS.forEach((gift) => {
      setGiftOpened(
        gift.id,
        giftDeliveryStateRef.current[gift.id] === true,
        true,
      );
    });
    const setFinalGiftUnlockedInScene = (
      unlocked: boolean,
      immediate = false,
    ) => {
      finalGiftObject.userData.unlockTarget = unlocked ? 1 : 0;
      finalGiftObject.visible = unlocked;
      if (!unlocked || !immediate) return;
      finalGiftObject.userData.unlockProgress = 1;
      const basePosition = finalGiftObject.userData
        .basePosition as THREE.Vector3;
      finalGiftObject.position.copy(basePosition);
      finalGiftObject.scale.setScalar(
        finalGiftObject.userData.displayScale as number,
      );
    };
    setFinalGiftUnlockedInScene(finalGiftUnlockedRef.current, true);

    const planets = createPlanetObjects(random, lowPower ? 256 : 384);
    planets.forEach((planet) => universe.add(planet));

    const littleWorlds = createLittleWorlds({
      quality: lowPower ? "low" : "high",
      glowTexture: heartGlowTexture,
    });
    universe.add(littleWorlds.group);

    const ambientLight = new THREE.AmbientLight(0x6174bd, 0.78);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xbfd6ff, 2.5);
    keyLight.position.set(28, 46, 34);
    scene.add(keyLight);

    const pinkLight = new THREE.PointLight(0xff3d9c, 78, 82, 1.65);
    pinkLight.position.set(0, 13, 4);
    scene.add(pinkLight);

    const blueLight = new THREE.PointLight(0x347cff, 62, 120, 1.8);
    blueLight.position.set(-32, 24, 24);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x9b4dff, 55, 112, 1.85);
    purpleLight.position.set(38, 18, -28);
    scene.add(purpleLight);

    const phraseAnchors = PHRASES.map((definition) => {
      const anchor = new THREE.Object3D();
      anchor.position.set(...definition.position);
      universe.add(anchor);
      return anchor;
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const activePointers = new Map<
      number,
      { x: number; y: number; pointerType: string }
    >();
    const keys = new Set<string>();
    let controllerEnabled = false;
    let journeyCompletionHandled = true;
    let activeJourneyLine = 0;
    let yaw = 0;
    let pitch = 0;
    let pinchDistance = 0;
    let wheelVelocity = 0;
    let clickCandidate: {
      id: number;
      x: number;
      y: number;
      time: number;
      travel: number;
    } | null = null;

    const cameraEuler = new THREE.Euler(0, 0, 0, "YXZ");
    const syncAnglesFromCamera = () => {
      cameraEuler.setFromQuaternion(camera.quaternion, "YXZ");
      pitch = cameraEuler.x;
      yaw = cameraEuler.y;
    };
    syncAnglesFromCamera();

    const resetView = () => {
      camera.position.copy(INITIAL_CAMERA_POSITION);
      camera.lookAt(INITIAL_CAMERA_TARGET);
      syncAnglesFromCamera();
      wheelVelocity = 0;
      navigationInputRef.current.strafe = 0;
      navigationInputRef.current.forward = 0;
      navigationInputRef.current.vertical = 0;
    };

    const setEnabled = (enabled: boolean) => {
      controllerEnabled = enabled;
      if (!enabled) {
        keys.clear();
        activePointers.clear();
        pinchDistance = 0;
        wheelVelocity = 0;
      }
    };

    const startJourney = () => {
      resetView();
      setEnabled(false);
      journeyCompletionHandled = false;
      activeJourneyLine = 0;
      startCosmosArrival(arrival);
    };

    const selectObjectAt = (clientX: number, clientY: number) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(
        [...heart.clickable, ...giftObjects, finalGiftObject],
        true,
      );
      const interaction = findInteraction(intersections[0]?.object ?? null);
      if (!interaction) return;

      if (interaction.kind === "heart") {
        setSelectedGift(HEART_MESSAGE);
        return;
      }
      if (interaction.kind === "gift") {
        const definition =
          interaction.id === FINAL_GIFT.id
            ? FINAL_GIFT
            : GIFTS.find((gift) => gift.id === interaction.id);
        if (definition) setSelectedGift(definition);
      }
    };

    const handleCanvasPointerDown = (event: PointerEvent) => {
      if (phaseRef.current !== "exploring") return;
      renderer.domElement.focus({ preventScroll: true });
      renderer.domElement.setPointerCapture?.(event.pointerId);
      activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      });

      if (activePointers.size === 1) {
        clickCandidate = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
          travel: 0,
        };
      } else {
        clickCandidate = null;
      }

      if (activePointers.size === 2) {
        const points = [...activePointers.values()];
        pinchDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
      }
    };

    const handleCanvasPointerMove = (event: PointerEvent) => {
      const previous = activePointers.get(event.pointerId);
      if (!previous) return;
      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;
      previous.x = event.clientX;
      previous.y = event.clientY;

      if (clickCandidate?.id === event.pointerId) {
        clickCandidate.travel = Math.max(
          clickCandidate.travel,
          Math.hypot(
            event.clientX - clickCandidate.x,
            event.clientY - clickCandidate.y,
          ),
        );
      }
      if (!controllerEnabled) return;

      if (activePointers.size >= 2) {
        const points = [...activePointers.values()];
        const nextDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        );
        if (pinchDistance > 0) {
          wheelVelocity += THREE.MathUtils.clamp(
            (nextDistance - pinchDistance) * 0.035,
            -1.8,
            1.8,
          );
        }
        pinchDistance = nextDistance;
        return;
      }

      const sensitivity = event.pointerType === "touch" ? 0.0032 : 0.0025;
      yaw -= deltaX * sensitivity;
      pitch -= deltaY * sensitivity;
      pitch = THREE.MathUtils.clamp(pitch, -1.42, 1.42);
    };

    const handleCanvasPointerUp = (event: PointerEvent) => {
      const candidate = clickCandidate;
      activePointers.delete(event.pointerId);
      pinchDistance = 0;
      if (
        candidate?.id === event.pointerId &&
        candidate.travel < 8 &&
        performance.now() - candidate.time < 520 &&
        phaseRef.current === "exploring"
      ) {
        selectObjectAt(event.clientX, event.clientY);
      }
      if (candidate?.id === event.pointerId) clickCandidate = null;
    };

    const handleCanvasPointerCancel = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
      pinchDistance = 0;
      if (clickCandidate?.id === event.pointerId) clickCandidate = null;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!controllerEnabled) return;
      event.preventDefault();
      wheelVelocity += THREE.MathUtils.clamp(-event.deltaY * 0.008, -4.5, 4.5);
    };

    const navigationKeys = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyQ",
      "KeyE",
      "KeyC",
      "Space",
      "ShiftLeft",
      "ShiftRight",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!controllerEnabled || !navigationKeys.has(event.code)) return;
      keys.add(event.code);
      event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };
    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    renderer.domElement.addEventListener(
      "pointerdown",
      handleCanvasPointerDown,
    );
    renderer.domElement.addEventListener(
      "pointermove",
      handleCanvasPointerMove,
    );
    renderer.domElement.addEventListener("pointerup", handleCanvasPointerUp);
    renderer.domElement.addEventListener(
      "pointercancel",
      handleCanvasPointerCancel,
    );
    renderer.domElement.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const pixelRatioCap = lowPower ? 1.2 : 1.62;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, pixelRatioCap),
      );
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    runtimeRef.current = {
      resetView,
      setEnabled,
      setGiftOpened,
      setFinalGiftUnlocked: setFinalGiftUnlockedInScene,
      startJourney,
    };
    runtimeRef.current.setEnabled(phaseRef.current === "exploring");
    const readyFrame = window.requestAnimationFrame(() => setReady(true));

    const timer = new THREE.Timer();
    timer.connect(document);
    const projected = new THREE.Vector3();
    const worldPosition = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const flatForward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const desiredVelocity = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const heartWorldPosition = new THREE.Vector3();
    const heartFacingHelper = new THREE.Object3D();
    let animationFrame = 0;
    let paused = document.visibilityState === "hidden";

    const handleVisibility = () => {
      paused = document.visibilityState === "hidden";
      if (!paused) timer.reset();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const updateCamera = (delta: number) => {
      cameraEuler.set(pitch, yaw, 0, "YXZ");
      camera.quaternion.setFromEuler(cameraEuler);
      if (!controllerEnabled) {
        velocity.multiplyScalar(Math.exp(-8 * delta));
        return;
      }

      const lookSpeed = 1.22 * delta;
      if (keys.has("ArrowLeft")) yaw += lookSpeed;
      if (keys.has("ArrowRight")) yaw -= lookSpeed;
      if (keys.has("ArrowUp")) pitch += lookSpeed;
      if (keys.has("ArrowDown")) pitch -= lookSpeed;
      pitch = THREE.MathUtils.clamp(pitch, -1.42, 1.42);

      camera.getWorldDirection(forward);
      flatForward.set(forward.x, 0, forward.z);
      if (flatForward.lengthSq() < 0.0001) {
        flatForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
        flatForward.y = 0;
      }
      flatForward.normalize();
      right.crossVectors(flatForward, up).normalize();

      const navigation = navigationInputRef.current;
      const strafe =
        navigation.strafe +
        (keys.has("KeyD") ? 1 : 0) -
        (keys.has("KeyA") ? 1 : 0);
      const forwardInput =
        navigation.forward +
        (keys.has("KeyW") ? 1 : 0) -
        (keys.has("KeyS") ? 1 : 0);
      const verticalInput =
        navigation.vertical +
        (keys.has("KeyE") || keys.has("Space") ? 1 : 0) -
        (keys.has("KeyQ") || keys.has("KeyC") ? 1 : 0);

      desiredVelocity
        .set(0, 0, 0)
        .addScaledVector(right, strafe)
        .addScaledVector(flatForward, forwardInput)
        .addScaledVector(up, verticalInput);
      if (desiredVelocity.lengthSq() > 1) desiredVelocity.normalize();

      const boosting = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const movementSpeed = boosting ? 28 : 13.5;
      desiredVelocity.multiplyScalar(movementSpeed);
      const smoothing = 1 - Math.exp(-7.5 * delta);
      velocity.lerp(desiredVelocity, smoothing);
      camera.position.addScaledVector(velocity, delta);

      if (Math.abs(wheelVelocity) > 0.005) {
        camera.position.addScaledVector(forward, wheelVelocity);
        wheelVelocity *= Math.exp(-7 * delta);
      } else {
        wheelVelocity = 0;
      }

      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.3, 76);
      const radialDistance = Math.hypot(camera.position.x, camera.position.z);
      if (radialDistance > 138) {
        const clampScale = 138 / radialDistance;
        camera.position.x *= clampScale;
        camera.position.z *= clampScale;
        velocity.x *= 0.3;
        velocity.z *= 0.3;
      }
    };

    const render = (timestamp?: number) => {
      animationFrame = window.requestAnimationFrame(render);
      if (paused) return;

      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      const frameDelta = Math.min(timer.getDelta(), 0.25);
      const delta = Math.min(frameDelta, 0.05);
      const motionScale = prefersReducedMotion ? 0.2 : 1;
      updateCamera(delta);
      cosmicBackground.group.position.set(
        camera.position.x,
        camera.position.y - 42,
        camera.position.z,
      );
      updateCosmosBackground(cosmicBackground, elapsed, motionScale);
      updateMeteorSystem(meteorSystem, delta * motionScale, camera);
      const arrivalFrame = updateCosmosArrival(arrival, frameDelta, camera);

      if (arrival.active) {
        const nextJourneyLine =
          arrivalFrame.progress < 0.26
            ? 0
            : arrivalFrame.progress < 0.55
              ? 1
              : arrivalFrame.progress < 0.82
                ? 2
                : 3;
        if (nextJourneyLine !== activeJourneyLine) {
          activeJourneyLine = nextJourneyLine;
          setJourneyLine(nextJourneyLine);
        }
      }

      if (arrivalFrame.finished && !journeyCompletionHandled) {
        journeyCompletionHandled = true;
        phaseRef.current = "exploring";
        setPhase("exploring");
        setEnabled(true);
        setShowGuide(true);
        if (guideTimeoutRef.current) {
          window.clearTimeout(guideTimeoutRef.current);
        }
        guideTimeoutRef.current = window.setTimeout(
          () => setShowGuide(false),
          5000,
        );
      }

      galaxy.vortex.rotation.y = -elapsed * 0.16 * motionScale;
      deepStars.rotation.y = elapsed * 0.002 * motionScale;
      deepStars.rotation.x = Math.sin(elapsed * 0.025) * 0.012;

      const pulse = 1 + Math.sin(elapsed * 1.62) * 0.024 * motionScale;
      heart.group.scale.setScalar(pulse);
      heart.group.getWorldPosition(heartWorldPosition);
      heartFacingHelper.position.copy(heartWorldPosition);
      heartFacingHelper.lookAt(camera.position);
      heartFacingHelper.rotateY(Math.sin(elapsed * 0.34) * 0.18 * motionScale);
      heartFacingHelper.rotateX(Math.sin(elapsed * 0.27) * 0.06 * motionScale);
      heartFacingHelper.rotateZ(Math.sin(elapsed * 0.22) * 0.026 * motionScale);
      heart.group.quaternion.slerp(
        heartFacingHelper.quaternion,
        1 - Math.exp(-9 * delta),
      );
      heart.orbitals.rotation.y = elapsed * 0.11 * motionScale;
      heart.orbitals.rotation.z = elapsed * 0.14 * motionScale;
      heart.facingParticles?.quaternion.identity();
      heart.glints?.forEach((glint, index) => {
        const phase = glint.userData.phase as number;
        const baseScale = glint.userData.baseScale as number;
        const fire = Math.pow(
          Math.max(0, Math.sin(elapsed * 1.7 + phase + index * 0.31)),
          6,
        );
        (glint.material as THREE.SpriteMaterial).opacity = 0.16 + fire * 0.82;
        glint.scale.setScalar(baseScale * (0.82 + fire * 0.42));
      });
      heart.particleMaterials?.forEach((material) => {
        material.uniforms.uTime.value = elapsed * motionScale;
      });
      heart.aura.material.opacity =
        0.36 + Math.sin(elapsed * 1.62) * 0.075 * motionScale;
      pinkLight.intensity = 72 + Math.sin(elapsed * 1.62) * 13;
      (galaxy.coreGlow.material as THREE.MeshBasicMaterial).opacity =
        0.25 + Math.sin(elapsed * 1.4) * 0.07;

      giftObjects.forEach((gift, index) => {
        const basePosition = gift.userData.basePosition as THREE.Vector3;
        gift.position.x = basePosition.x;
        gift.position.y =
          basePosition.y +
          Math.sin(elapsed * 0.7 + gift.userData.floatOffset) *
            0.72 *
            motionScale;
        gift.position.z = basePosition.z;
        gift.rotation.y = elapsed * (0.2 + index * 0.006) * motionScale;
        gift.rotation.z = Math.sin(elapsed * 0.48 + index) * 0.07 * motionScale;
        const beacon = gift.userData.beacon as THREE.Object3D | undefined;
        if (beacon) {
          beacon.scale.setScalar(
            1 + Math.sin(elapsed * 1.4 + index) * 0.08 * motionScale,
          );
        }
        updateGiftObject(gift, elapsed, delta);
      });

      if (finalGiftObject.visible) {
        const current =
          (finalGiftObject.userData.unlockProgress as number) ?? 0;
        const target = (finalGiftObject.userData.unlockTarget as number) ?? 1;
        const progress = THREE.MathUtils.damp(current, target, 1.65, delta);
        const landingProgress = 1 - Math.pow(1 - progress, 3);
        const landingBounce =
          Math.sin(progress * Math.PI * 5) *
          Math.pow(1 - progress, 2) *
          1.8 *
          motionScale;
        const basePosition = finalGiftObject.userData
          .basePosition as THREE.Vector3;
        const displayScale = finalGiftObject.userData.displayScale as number;
        const revealScale =
          0.32 + THREE.MathUtils.smoothstep(progress, 0, 0.72) * 0.68;

        finalGiftObject.userData.unlockProgress = progress;
        finalGiftObject.position.set(
          basePosition.x,
          basePosition.y +
            (1 - landingProgress) * 38 +
            landingBounce +
            Math.sin(elapsed * 0.82) * 0.34 * motionScale,
          basePosition.z,
        );
        finalGiftObject.scale.setScalar(displayScale * revealScale);
        finalGiftObject.rotation.y =
          elapsed * 0.24 * motionScale + (1 - progress) * Math.PI * 2.4;
        finalGiftObject.rotation.z =
          Math.sin(elapsed * 0.56) * 0.035 * motionScale;
        const finalBeacon = finalGiftObject.userData.beacon as
          | THREE.Object3D
          | undefined;
        if (finalBeacon) {
          finalBeacon.scale.setScalar(
            1.18 + Math.sin(elapsed * 1.7) * 0.12 * motionScale,
          );
        }
        updateGiftObject(finalGiftObject, elapsed, delta);
      }

      planets.forEach((planet, index) => {
        const surface = planet.userData.surface as THREE.Mesh;
        const clouds = planet.userData.clouds as THREE.Mesh;
        const moonPivots = planet.userData.moonPivots as THREE.Group[];
        const spin = planet.userData.spin as number;
        surface.rotation.y += spin * delta * motionScale;
        clouds.rotation.y -= spin * 0.36 * delta * motionScale;
        moonPivots.forEach((pivot) => {
          pivot.rotation.y +=
            (pivot.userData.speed as number) * delta * motionScale;
        });
        const ringGroup = planet.userData.ringGroup as THREE.Group | undefined;
        if (ringGroup) {
          ringGroup.rotation.z =
            0.08 + Math.sin(elapsed * 0.08 + index) * 0.012;
        }
      });

      updateLittleWorlds(littleWorlds, {
        elapsed,
        delta,
        motionScale,
        camera,
        heartPosition: heartWorldPosition,
        exploring: phaseRef.current === "exploring",
      });

      phraseAnchors.forEach((anchor, index) => {
        const element = phraseRefs.current[index];
        if (!element) return;
        const revealed =
          (phraseRevealUntilRef.current[index] ?? 0) > performance.now();
        element.dataset.revealed = revealed ? "true" : "false";
        anchor.getWorldPosition(worldPosition);
        const distance = worldPosition.distanceTo(camera.position);
        projected.copy(worldPosition).project(camera);
        const visible =
          projected.z > -1 &&
          projected.z < 1 &&
          Math.abs(projected.x) < 1.08 &&
          Math.abs(projected.y) < 1.08 &&
          distance < 128;

        if (!visible) {
          element.style.opacity = "0";
          element.style.pointerEvents = "none";
          return;
        }

        const x = (projected.x * 0.5 + 0.5) * host.clientWidth;
        const y = (-projected.y * 0.5 + 0.5) * host.clientHeight;
        const nearFade = THREE.MathUtils.smoothstep(distance, 7, 16);
        const farFade = 1 - THREE.MathUtils.smoothstep(distance, 74, 128);
        const distanceOpacity = Math.max(
          0.1,
          Math.min(0.86, nearFade * farFade),
        );
        element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        element.style.pointerEvents =
          phaseRef.current === "exploring" ? "auto" : "none";
        element.style.opacity =
          phaseRef.current === "exploring"
            ? String(distanceOpacity * (revealed ? 0.98 : 0.62))
            : phaseRef.current === "entry"
              ? String(distanceOpacity * 0.035)
              : "0";
      });

      renderer.render(scene, camera);
    };
    render();

    return () => {
      setReady(false);
      runtimeRef.current = null;
      window.cancelAnimationFrame(readyFrame);
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      renderer.domElement.removeEventListener(
        "pointerdown",
        handleCanvasPointerDown,
      );
      renderer.domElement.removeEventListener(
        "pointermove",
        handleCanvasPointerMove,
      );
      renderer.domElement.removeEventListener(
        "pointerup",
        handleCanvasPointerUp,
      );
      renderer.domElement.removeEventListener(
        "pointercancel",
        handleCanvasPointerCancel,
      );
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      timer.dispose();
      arrival.dispose();
      meteorSystem.dispose();
      cosmicBackground.dispose();
      disposeObject(scene, ownedTextures);
      ownedTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      if (guideTimeoutRef.current) {
        window.clearTimeout(guideTimeoutRef.current);
      }
    };
  }, []);

  const selectedGiftRedeemed =
    selectedGift?.kind === "gift" &&
    giftDeliveryState[selectedGift.id] === true;
  const deliveredGiftCount =
    Object.values(giftDeliveryState).filter(Boolean).length;
  const selectedGiftStyle = selectedGift
    ? ({
        "--gift-accent": `#${selectedGift.color.toString(16).padStart(6, "0")}`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Universo interactivo"
      className={`${styles.experience} ${
        phase === "journey" ? styles.journeying : ""
      }`}
    >
      <div ref={canvasHostRef} className={styles.canvasHost} />
      <div className={styles.colorGrade} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.phraseLayer} aria-hidden={phase !== "exploring"}>
        {PHRASES.map((phrase, index) => (
          <span
            key={phrase.text}
            ref={(element) => {
              phraseRefs.current[index] = element;
            }}
            className={styles.phrase}
            data-revealed="false"
            role="button"
            tabIndex={phase === "exploring" ? 0 : -1}
            aria-label="Descubrir mensaje"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              revealPhrase(index);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                revealPhrase(index);
              }
            }}
          >
            <span className={styles.phraseStar} aria-hidden="true">
              ✦
            </span>
            <span className={styles.phraseText}>{phrase.text}</span>
          </span>
        ))}
      </div>

      {(onExit || phase === "exploring") && (
        <button
          type="button"
          className={styles.exitButton}
          onClick={exitUniverse}
          aria-label={
            onExit ? "Volver a experiencias móviles" : "Salir del universo"
          }
        >
          <ArrowLeft size={21} strokeWidth={1.7} />
          <span>{onExit ? "Volver" : "Salir"}</span>
        </button>
      )}

      {phase === "entry" && (
        <div
          className={styles.entry}
          onPointerDown={handleEntryPointerDown}
          onPointerUp={handleEntryPointerUp}
          onPointerCancel={() => {
            entryDragStartRef.current = null;
          }}
        >
          <div className={styles.entryHalo} aria-hidden="true" />
          <div className={styles.entryContent}>
            <span className={styles.kicker}>COSMIC LAB · 3D</span>
            <h1>Un universo para explorar.</h1>
            <p>
              Recorre galaxias, descubre mundos y explora una escena construida
              por código.
            </p>

            <button
              type="button"
              className={styles.enterButton}
              onClick={enterUniverse}
              disabled={!ready}
            >
              <span className={styles.swipeConstellation} aria-hidden="true">
                <Sparkles size={19} />
                <span />
              </span>
              <span>
                {ready ? "Entrar al universo" : "Moldeando el universo…"}
              </span>
            </button>
            <span className={styles.entryNote}>
              Podrás volar por cada anillo y tocar todos sus secretos.
            </span>
          </div>
        </div>
      )}

      {phase === "journey" && (
        <div
          className={styles.journeyOverlay}
          role="status"
          aria-live="polite"
          aria-label="Viajando hacia el universo"
        >
          <div className={styles.journeyShade} aria-hidden="true" />
          <div className={styles.journeyCopy}>
            <span className={styles.journeyKicker}>
              EXPLORACIÓN · UNIVERSO 3D
            </span>
            <span key={journeyLine} className={styles.journeyPhrase}>
              {JOURNEY_LINES[journeyLine]}
            </span>
            <span className={styles.journeySignal} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}

      {phase === "exploring" && (
        <>
          <div
            className={`${styles.guide} ${showGuide ? styles.guideVisible : ""}`}
            role="status"
          >
            <Sparkles size={16} />
            <span>Arrastra: mira · Pad: viaja · Pellizca: avanza</span>
          </div>

          <div className={styles.flightControls}>
            <div
              ref={movementPadRef}
              className={styles.movementPad}
              role="application"
              aria-label="Control libre para viajar por la galaxia"
              onPointerDown={handleMovementPadDown}
              onPointerMove={updateMovementPad}
              onPointerUp={(event) => stopMovementPad(event.pointerId)}
              onPointerCancel={(event) => stopMovementPad(event.pointerId)}
              onLostPointerCapture={(event) => stopMovementPad(event.pointerId)}
            >
              <span className={styles.movementCompass} aria-hidden="true" />
              <span
                ref={movementKnobRef}
                className={styles.movementKnob}
                aria-hidden="true"
              >
                <Move size={20} />
              </span>
              <small>VIAJAR</small>
            </div>

            <div className={styles.altitudeControl} aria-label="Cambiar altura">
              <button
                type="button"
                aria-label="Subir"
                onPointerDown={(event) => startVerticalMovement(1, event)}
                onPointerUp={stopVerticalMovement}
                onPointerCancel={stopVerticalMovement}
                onLostPointerCapture={stopVerticalMovement}
              >
                <ArrowUp size={17} />
              </button>
              <span>ALTURA</span>
              <button
                type="button"
                aria-label="Bajar"
                onPointerDown={(event) => startVerticalMovement(-1, event)}
                onPointerUp={stopVerticalMovement}
                onPointerCancel={stopVerticalMovement}
                onLostPointerCapture={stopVerticalMovement}
              >
                <ArrowDown size={17} />
              </button>
            </div>
          </div>

          <div className={styles.controlDock}>
            <button
              type="button"
              onClick={() => runtimeRef.current?.resetView()}
              aria-label="Volver al corazón de la galaxia"
            >
              <Focus size={18} />
              <span>Centro</span>
            </button>
          </div>
        </>
      )}

      {showFinalGiftAnnouncement && finalGiftUnlocked && (
        <div
          className={styles.finalGiftAnnouncement}
          role="status"
          aria-live="assertive"
        >
          <span
            className={styles.finalGiftAnnouncementSparkles}
            aria-hidden="true"
          >
            <Sparkles size={18} />
            <i />
            <Sparkles size={14} />
          </span>
          <small>12 DE 12 · COLECCIÓN COMPLETA</small>
          <strong>¡La colección está completa!</strong>
          <span>Doce descubrimientos en un universo procedural</span>
        </div>
      )}

      {selectedGift && (
        <div className={styles.modalLayer} role="presentation">
          <button
            type="button"
            className={styles.modalBackdrop}
            onClick={() => setSelectedGift(null)}
            aria-label="Cerrar regalo"
          />
          <section
            className={`${styles.giftCard} ${
              selectedGiftRedeemed ? styles.giftCardRedeemed : ""
            }`}
            style={selectedGiftStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-title"
          >
            <div className={styles.giftGlow} aria-hidden="true" />
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setSelectedGift(null)}
              aria-label="Cerrar"
            >
              <X size={19} />
            </button>
            <div
              className={`${styles.giftArtwork} ${
                selectedGift.kind === "heart"
                  ? styles.heartArtwork
                  : selectedGift.kind === "final"
                    ? styles.finalGiftArtwork
                    : ""
              }`}
              aria-label={
                selectedGift.kind === "heart"
                  ? "Corazón cristalino"
                  : `Ilustración de ${selectedGift.title.toLowerCase()}`
              }
              role="img"
            >
              <span className={styles.artOrbit} aria-hidden="true" />
              <span className={styles.artOrbitSecondary} aria-hidden="true" />
              <span
                className={`${styles.artBouquet} ${styles.artBouquetLeft}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
              <span
                className={`${styles.artBouquet} ${styles.artBouquetRight}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
              <span className={styles.artSymbol} aria-hidden="true">
                {selectedGift.kind === "heart" ? (
                  <Heart size={52} fill="currentColor" strokeWidth={1.25} />
                ) : (
                  selectedGift.symbol
                )}
              </span>
              {selectedGiftRedeemed && (
                <span className={styles.openedBadge}>
                  <Check size={13} strokeWidth={2.5} />
                  ENTREGADO
                </span>
              )}
            </div>
            <span className={styles.giftEyebrow}>{selectedGift.eyebrow}</span>
            <h2 id="gift-title">{selectedGift.title}</h2>
            <p className={styles.giftMessage}>{selectedGift.message}</p>
            <p className={styles.giftDetail}>{selectedGift.detail}</p>

            {selectedGift.kind === "final" && (
              <div
                className={styles.finalRewardList}
                aria-label="Contenido del regalo final"
              >
                <span>
                  <i aria-hidden="true">✈</i>
                  <small>AVENTURA</small>
                  <strong>Exploración completa</strong>
                </span>
                <span>
                  <i aria-hidden="true">✦</i>
                  <small>COLECCIÓN</small>
                  <strong>Doce objetos descubiertos</strong>
                </span>
              </div>
            )}

            {selectedGift.kind === "gift" && (
              <button
                type="button"
                className={`${styles.redeemGift} ${
                  selectedGiftRedeemed ? styles.redeemGiftClaimed : ""
                }`}
                aria-pressed={selectedGiftRedeemed}
                onClick={toggleSelectedGiftRedeemed}
              >
                <span className={styles.redeemHeartShape} aria-hidden="true">
                  <Heart
                    size={62}
                    fill={selectedGiftRedeemed ? "currentColor" : "none"}
                    strokeWidth={1.35}
                  />
                  {selectedGiftRedeemed && (
                    <Check
                      className={styles.redeemCheck}
                      size={21}
                      strokeWidth={3}
                    />
                  )}
                </span>
                <span className={styles.redeemCopy}>
                  <strong>
                    {selectedGiftRedeemed
                      ? "Descubierto"
                      : "Marcar como explorado"}
                  </strong>
                  <small>
                    {selectedGiftRedeemed
                      ? "La caja ya está abierta · toca para corregir"
                      : "Marca este objeto al descubrirlo en la escena"}
                  </small>
                </span>
              </button>
            )}

            <button
              type="button"
              className={styles.keepExploring}
              onClick={() => setSelectedGift(null)}
            >
              Seguir explorando
              <Sparkles size={15} />
            </button>
            <small className={styles.giftCounter}>
              {selectedGift.kind === "gift" ? (
                <>
                  {deliveredGiftCount} de {GIFTS.length} objetos explorados
                </>
              ) : selectedGift.kind === "final" ? (
                "Colección completada · progreso guardado en este navegador."
              ) : (
                "Doce coleccionables orbitan alrededor del núcleo galáctico."
              )}
            </small>
          </section>
        </div>
      )}
    </div>
  );
}
