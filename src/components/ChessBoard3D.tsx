import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Chess, type Square } from 'chess.js';
import { Compass, Eye } from 'lucide-react';
import type { ArrowOverlay, BoardTheme, PlayerColor } from '../types/chess';
import { getBoardSkin, getPieceSkin } from '../data/skins';
import { ChessPiece } from './ChessPieces';
import {
  buildPieceMesh,
  createPieceGeometryCache,
  createPieceMaterials,
  disposePieceGeometryCache,
} from './chess3d/pieceGeometry';

interface ChessBoard3DProps {
  fen: string;
  flipped: boolean;
  theme: BoardTheme;
  pieceSkin?: string;
  boardSkin?: string;
  effectSkin?: string;
  interactive: boolean;
  allowedColor?: PlayerColor | 'both';
  lastMove?: { from: string; to: string } | null;
  arrows?: ArrowOverlay[];
  onMove: (from: string, to: string, promotion?: string) => boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const THEME_3D: Record<BoardTheme, { light: number; dark: number; frame: number; accent: number }> = {
  emerald: { light: 0xebecd0, dark: 0x628846, frame: 0x243129, accent: 0x10b981 },
  wood: { light: 0xf0d9b5, dark: 0xa06d44, frame: 0x3e2414, accent: 0xf59e0b },
  slate: { light: 0xcbd5e1, dark: 0x475569, frame: 0x1e293b, accent: 0x38bdf8 },
};

const ARROW_HEX: Record<ArrowOverlay['color'], number> = {
  emerald: 0x10b981,
  sky: 0x38bdf8,
  amber: 0xf59e0b,
  rose: 0xf43f5e,
};

function squareToCoords(sq: string): { x: number; z: number } {
  const fileIdx = FILES.indexOf(sq[0]);
  const rankIdx = RANKS.indexOf(sq[1]);
  return {
    x: fileIdx - 3.5,
    z: rankIdx - 3.5,
  };
}

function createLabelTexture(text: string, bgColor: string, textColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = textColor;
  ctx.font = 'bold 34px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface EffectParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  gravity: number;
  spin?: THREE.Vector3;
  expandRate?: number;
}

interface ActiveCaptureEffect {
  group: THREE.Group;
  particles: EffectParticle[];
  startTime: number;
  duration: number;
}

function spawnCaptureEffect(
  effectsGroup: THREE.Group,
  activeEffects: ActiveCaptureEffect[],
  square: string,
  effectKey: string
) {
  if (!effectKey || effectKey === 'none') return;
  const { x, z } = squareToCoords(square);
  const group = new THREE.Group();
  group.position.set(x, 0.08, z);
  const particles: EffectParticle[] = [];

  if (effectKey === 'shockwave') {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.34, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
    particles.push({ mesh: ring, vel: new THREE.Vector3(0, 0.3, 0), gravity: 0, expandRate: 5.2 });

    const sparkGeom = new THREE.SphereGeometry(0.055, 8, 8);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x10b981 : 0x38bdf8,
        transparent: true,
        opacity: 1,
      });
      const m = new THREE.Mesh(sparkGeom, mat);
      group.add(m);
      particles.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(a) * 2.2, 2.4 + Math.random() * 1.4, Math.sin(a) * 2.2),
        gravity: 6.5,
      });
    }
  } else if (effectKey === 'fireburst') {
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), flashMat);
    flash.position.y = 0.25;
    group.add(flash);
    particles.push({ mesh: flash, vel: new THREE.Vector3(0, 0.4, 0), gravity: 0, expandRate: 3.4 });

    const emberGeom = new THREE.DodecahedronGeometry(0.065, 0);
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 2.5;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfbbf24 : i % 2 === 0 ? 0xf97316 : 0xef4444,
        transparent: true,
        opacity: 1,
      });
      const m = new THREE.Mesh(emberGeom, mat);
      m.position.y = 0.2;
      group.add(m);
      particles.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(a) * spd, 2.2 + Math.random() * 2.4, Math.sin(a) * spd),
        gravity: 7.5,
        spin: new THREE.Vector3(6, 8, 5),
      });
    }
  } else if (effectKey === 'lightning') {
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 1 });
    for (let seg = 0; seg < 4; seg++) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 8), boltMat.clone());
      cyl.position.set((Math.random() - 0.5) * 0.22, 0.45 + seg * 0.85, (Math.random() - 0.5) * 0.22);
      cyl.rotation.z = (Math.random() - 0.5) * 0.45;
      group.add(cyl);
      particles.push({ mesh: cyl, vel: new THREE.Vector3(0, 0, 0), gravity: 0 });
    }
    const sparkGeom = new THREE.BoxGeometry(0.06, 0.06, 0.18);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 1 });
      const m = new THREE.Mesh(sparkGeom, mat);
      m.rotation.y = -a;
      group.add(m);
      particles.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(a) * 3.0, 1.4 + Math.random() * 1.5, Math.sin(a) * 3.0),
        gravity: 5.5,
      });
    }
  } else if (effectKey === 'void_vortex') {
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.95 });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 12, 32), torusMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.2;
    group.add(torus);
    particles.push({
      mesh: torus,
      vel: new THREE.Vector3(0, 0.6, 0),
      gravity: 0,
      spin: new THREE.Vector3(0, 0, 10),
      expandRate: 2.8,
    });

    const shardGeom = new THREE.OctahedronGeometry(0.07, 0);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xc084fc : 0xec4899,
        transparent: true,
        opacity: 1,
      });
      const m = new THREE.Mesh(shardGeom, mat);
      m.position.y = 0.25;
      group.add(m);
      particles.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(a) * 2.1, 2.0 + Math.random() * 1.8, Math.sin(a) * 2.1),
        gravity: 4.5,
        spin: new THREE.Vector3(8, 10, 6),
      });
    }
  }

  effectsGroup.add(group);
  activeEffects.push({ group, particles, startTime: performance.now(), duration: 680 });
}

export const ChessBoard3D: React.FC<ChessBoard3DProps> = ({
  fen,
  flipped,
  theme,
  pieceSkin = 'classic',
  boardSkin = 'default',
  effectSkin = 'none',
  interactive,
  allowedColor = 'both',
  lastMove,
  arrows = [],
  onMove,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: PlayerColor;
  } | null>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn();
  const inCheck = chess.inCheck();

  const canControlTurn =
    interactive && !chess.isGameOver() && (allowedColor === 'both' || allowedColor === turn);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !canControlTurn) return new Map<string, boolean>();
    const moves = chess.moves({ square: selectedSquare, verbose: true });
    const map = new Map<string, boolean>();
    for (const m of moves) {
      map.set(m.to, Boolean(m.captured));
    }
    return map;
  }, [chess, selectedSquare, canControlTurn]);

  // Clear selection when FEN changes
  useEffect(() => {
    setSelectedSquare(null);
  }, [fen]);

  // Refs for latest state inside Three.js event handlers
  const stateRef = useRef({
    chess,
    canControlTurn,
    selectedSquare,
    legalTargets,
    turn,
    onMove,
  });
  stateRef.current = {
    chess,
    canControlTurn,
    selectedSquare,
    legalTargets,
    turn,
    onMove,
  };

  // Three.js scene object refs
  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    piecesGroup: THREE.Group;
    highlightsGroup: THREE.Group;
    arrowsGroup: THREE.Group;
    effectsGroup: THREE.Group;
    tilesGroup: THREE.Group;
    frameMesh: THREE.Mesh;
    lightTileMat: THREE.MeshStandardMaterial;
    darkTileMat: THREE.MeshStandardMaterial;
    frameMat: THREE.MeshStandardMaterial;
    geomCache: ReturnType<typeof createPieceGeometryCache>;
    materials: ReturnType<typeof createPieceMaterials>;
    squareMeshes: Map<Square, THREE.Mesh>;
    pieceMeshes: Map<Square, THREE.Group>;
    animatingPiece: {
      mesh: THREE.Group;
      fromPos: THREE.Vector3;
      toPos: THREE.Vector3;
      startTime: number;
      duration: number;
    } | null;
    activeEffects: ActiveCaptureEffect[];
    prevFen: string | null;
    prevLastMoveKey: string | null;
  } | null>(null);

  const setCameraPreset = (preset: 'default' | 'top') => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const sign = flipped ? -1 : 1;
    if (preset === 'top') {
      refs.camera.position.set(0, 10.5, 0.8 * sign);
    } else {
      refs.camera.position.set(0, 7.2, 6.8 * sign);
    }
    refs.controls.target.set(0, 0, 0);
    refs.controls.update();
  };

  // Initialize Three.js Scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.024);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 7.2, flipped ? -6.8 : 6.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.12;
    controls.minPolarAngle = 0.15;
    controls.minDistance = 5.5;
    controls.maxDistance = 15.5;
    controls.target.set(0, 0, 0);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    keyLight.position.set(6, 12, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 28;
    const d = 6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(-7, 6, -8);
    scene.add(rimLight);

    // Subtle tabletop plane
    const tableGeom = new THREE.PlaneGeometry(40, 40);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.9,
      metalness: 0.05,
    });
    const tableMesh = new THREE.Mesh(tableGeom, tableMat);
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.position.y = -0.35;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    const tColors = THEME_3D[theme];
    const frameMat = new THREE.MeshStandardMaterial({
      color: tColors.frame,
      roughness: 0.55,
      metalness: 0.08,
    });
    const lightTileMat = new THREE.MeshStandardMaterial({
      color: tColors.light,
      roughness: 0.48,
      metalness: 0.04,
    });
    const darkTileMat = new THREE.MeshStandardMaterial({
      color: tColors.dark,
      roughness: 0.52,
      metalness: 0.05,
    });

    // Outer board frame
    const frameGeom = new THREE.BoxGeometry(8.9, 0.34, 8.9);
    const frameMesh = new THREE.Mesh(frameGeom, frameMat);
    frameMesh.position.y = -0.18;
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    scene.add(frameMesh);

    // 64 Square tiles
    const tilesGroup = new THREE.Group();
    const tileGeom = new THREE.BoxGeometry(0.99, 0.08, 0.99);
    const squareMeshes = new Map<Square, THREE.Mesh>();

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = `${FILES[f]}${RANKS[r]}` as Square;
        const isLight = (r + f) % 2 === 0;
        const tile = new THREE.Mesh(tileGeom, isLight ? lightTileMat : darkTileMat);
        tile.position.set(f - 3.5, -0.04, r - 3.5);
        tile.receiveShadow = true;
        tile.userData.square = sq;
        tilesGroup.add(tile);
        squareMeshes.set(sq, tile);
      }
    }
    scene.add(tilesGroup);

    // Coordinate labels on frame rim
    const labelsGroup = new THREE.Group();
    const labelPlaneGeom = new THREE.PlaneGeometry(0.42, 0.42);
    const labelBg = '#0f172a';
    const labelFg = '#cbd5e1';
    for (let i = 0; i < 8; i++) {
      const fTex = createLabelTexture(FILES[i].toUpperCase(), labelBg, labelFg);
      const fMat = new THREE.MeshBasicMaterial({ map: fTex, transparent: true, opacity: 0.85 });
      const fBottom = new THREE.Mesh(labelPlaneGeom, fMat);
      fBottom.rotation.x = -Math.PI / 2;
      fBottom.position.set(i - 3.5, -0.005, 4.22);
      labelsGroup.add(fBottom);

      const fTop = new THREE.Mesh(labelPlaneGeom, fMat);
      fTop.rotation.x = -Math.PI / 2;
      fTop.rotation.z = Math.PI;
      fTop.position.set(i - 3.5, -0.005, -4.22);
      labelsGroup.add(fTop);

      const rTex = createLabelTexture(RANKS[i], labelBg, labelFg);
      const rMat = new THREE.MeshBasicMaterial({ map: rTex, transparent: true, opacity: 0.85 });
      const rLeft = new THREE.Mesh(labelPlaneGeom, rMat);
      rLeft.rotation.x = -Math.PI / 2;
      rLeft.position.set(-4.22, -0.005, i - 3.5);
      labelsGroup.add(rLeft);

      const rRight = new THREE.Mesh(labelPlaneGeom, rMat);
      rRight.rotation.x = -Math.PI / 2;
      rRight.rotation.z = Math.PI;
      rRight.position.set(4.22, -0.005, i - 3.5);
      labelsGroup.add(rRight);
    }
    scene.add(labelsGroup);

    const highlightsGroup = new THREE.Group();
    const piecesGroup = new THREE.Group();
    const arrowsGroup = new THREE.Group();
    const effectsGroup = new THREE.Group();
    scene.add(highlightsGroup, piecesGroup, arrowsGroup, effectsGroup);

    const geomCache = createPieceGeometryCache();
    const materials = createPieceMaterials();

    sceneRefs.current = {
      scene,
      camera,
      renderer,
      controls,
      piecesGroup,
      highlightsGroup,
      arrowsGroup,
      effectsGroup,
      tilesGroup,
      frameMesh,
      lightTileMat,
      darkTileMat,
      frameMat,
      geomCache,
      materials,
      squareMeshes,
      pieceMeshes: new Map(),
      animatingPiece: null,
      activeEffects: [],
      prevFen: null,
      prevLastMoveKey: null,
    };

    // Pointer click handling (distinguish click vs orbit drag)
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos.x = e.clientX;
      pointerDownPos.y = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return; // Was a camera drag

      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const interactables: THREE.Object3D[] = [
        ...Array.from(squareMeshes.values()),
        ...piecesGroup.children,
      ];
      const hits = raycaster.intersectObjects(interactables, true);
      if (hits.length === 0) {
        setSelectedSquare(null);
        return;
      }

      // Walk up parent chain to find userData.square
      let obj: THREE.Object3D | null = hits[0].object;
      let clickedSq: Square | undefined;
      while (obj) {
        if (obj.userData?.square) {
          clickedSq = obj.userData.square as Square;
          break;
        }
        obj = obj.parent;
      }
      if (!clickedSq) return;

      const st = stateRef.current;
      if (!st.canControlTurn) {
        setSelectedSquare(null);
        return;
      }

      if (st.selectedSquare === clickedSq) {
        setSelectedSquare(null);
        return;
      }

      if (st.selectedSquare && st.legalTargets.has(clickedSq)) {
        const moves = st.chess.moves({ square: st.selectedSquare, verbose: true });
        const matching = moves.filter((m) => m.to === clickedSq);
        if (matching.length > 0) {
          if (matching.some((m) => m.promotion)) {
            setPendingPromotion({ from: st.selectedSquare, to: clickedSq, color: st.turn });
            setSelectedSquare(null);
            return;
          }
          const ok = st.onMove(st.selectedSquare, clickedSq);
          if (ok) {
            setSelectedSquare(null);
          }
          return;
        }
      }

      const piece = st.chess.get(clickedSq);
      if (piece && piece.color === st.turn) {
        setSelectedSquare(clickedSq);
      } else {
        setSelectedSquare(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation loop
    let animId = 0;
    let lastFrameTime = performance.now();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const refs = sceneRefs.current;
      if (refs?.animatingPiece) {
        const anim = refs.animatingPiece;
        const elapsed = now - anim.startTime;
        const t = Math.min(1, elapsed / anim.duration);
        const eased = 1 - Math.pow(1 - t, 3);
        anim.mesh.position.lerpVectors(anim.fromPos, anim.toPos, eased);
        anim.mesh.position.y = Math.sin(t * Math.PI) * 0.45;
        if (t >= 1) {
          anim.mesh.position.copy(anim.toPos);
          refs.animatingPiece = null;
        }
      }

      if (refs && refs.activeEffects.length > 0) {
        for (let i = refs.activeEffects.length - 1; i >= 0; i--) {
          const eff = refs.activeEffects[i];
          const progress = Math.min(1, (now - eff.startTime) / eff.duration);
          for (const p of eff.particles) {
            p.vel.y -= p.gravity * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            if (p.spin) {
              p.mesh.rotation.x += p.spin.x * dt;
              p.mesh.rotation.y += p.spin.y * dt;
              p.mesh.rotation.z += p.spin.z * dt;
            }
            if (p.expandRate) {
              const s = 1 + progress * p.expandRate;
              p.mesh.scale.set(s, s, s);
            }
            const mat = p.mesh.material;
            if (mat instanceof THREE.MeshBasicMaterial) {
              mat.opacity = Math.max(0, 1 - progress);
            }
          }
          if (progress >= 1) {
            eff.group.traverse((obj) => {
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (obj.material instanceof THREE.Material) obj.material.dispose();
              }
            });
            refs.effectsGroup.remove(eff.group);
            refs.activeEffects.splice(i, 1);
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      disposePieceGeometryCache(geomCache);
      materials.white.dispose();
      materials.black.dispose();
      materials.feltWhite.dispose();
      materials.feltBlack.dispose();
      lightTileMat.dispose();
      darkTileMat.dispose();
      frameMat.dispose();
      tableMat.dispose();
      tableGeom.dispose();
      frameGeom.dispose();
      tileGeom.dispose();
      labelPlaneGeom.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRefs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme & board/piece skins dynamically
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const customBoard = getBoardSkin(boardSkin);
    if (customBoard) {
      refs.lightTileMat.color.setHex(customBoard.lightNum);
      refs.darkTileMat.color.setHex(customBoard.darkNum);
      refs.frameMat.color.setHex(customBoard.frameNum);
    } else {
      const tColors = THEME_3D[theme];
      refs.lightTileMat.color.setHex(tColors.light);
      refs.darkTileMat.color.setHex(tColors.dark);
      refs.frameMat.color.setHex(tColors.frame);
    }
  }, [theme, boardSkin]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const skin = getPieceSkin(pieceSkin);
    refs.materials.white.color.setHex(skin.whiteColor);
    refs.materials.white.roughness = skin.roughness;
    refs.materials.white.metalness = skin.metalness;
    refs.materials.white.emissive.setHex(skin.whiteEmissive ?? 0x000000);
    refs.materials.white.emissiveIntensity = skin.emissiveIntensity ?? 0;

    refs.materials.black.color.setHex(skin.blackColor);
    refs.materials.black.roughness = skin.roughness;
    refs.materials.black.metalness = skin.metalness;
    refs.materials.black.emissive.setHex(skin.blackEmissive ?? 0x000000);
    refs.materials.black.emissiveIntensity = skin.emissiveIntensity ?? 0;
  }, [pieceSkin]);

  // Orient camera when `flipped` changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const sign = flipped ? -1 : 1;
    refs.camera.position.set(0, 7.2, 6.8 * sign);
    refs.controls.target.set(0, 0, 0);
    refs.controls.update();
  }, [flipped]);

  // Sync pieces on board when FEN changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    while (refs.piecesGroup.children.length > 0) {
      refs.piecesGroup.remove(refs.piecesGroup.children[0]);
    }
    refs.pieceMeshes.clear();

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece) continue;
        const sq = `${FILES[f]}${RANKS[r]}` as Square;
        const mesh = buildPieceMesh(piece.type, piece.color, refs.geomCache, refs.materials);
        mesh.position.set(f - 3.5, 0, r - 3.5);
        mesh.userData.square = sq;
        refs.piecesGroup.add(mesh);
        refs.pieceMeshes.set(sq, mesh);
      }
    }

    // Trigger smooth arc animation + 3D capture effect for the most recent move
    const moveKey = lastMove ? `${lastMove.from}-${lastMove.to}-${fen}` : null;
    if (lastMove && moveKey !== refs.prevLastMoveKey) {
      let wasCapture = false;
      if (refs.prevFen) {
        try {
          const prevChess = new Chess(refs.prevFen);
          const targetPiece = prevChess.get(lastMove.to as Square);
          const movedPiece = prevChess.get(lastMove.from as Square);
          wasCapture =
            Boolean(targetPiece) ||
            Boolean(movedPiece?.type === 'p' && lastMove.from[0] !== lastMove.to[0]);
        } catch {
          wasCapture = false;
        }
      }

      refs.prevLastMoveKey = moveKey;
      const targetMesh = refs.pieceMeshes.get(lastMove.to as Square);
      if (targetMesh) {
        const fromCoords = squareToCoords(lastMove.from);
        const toCoords = squareToCoords(lastMove.to);
        targetMesh.position.set(fromCoords.x, 0, fromCoords.z);
        refs.animatingPiece = {
          mesh: targetMesh,
          fromPos: new THREE.Vector3(fromCoords.x, 0, fromCoords.z),
          toPos: new THREE.Vector3(toCoords.x, 0, toCoords.z),
          startTime: performance.now(),
          duration: 220,
        };
      }

      if (wasCapture && effectSkin && effectSkin !== 'none') {
        spawnCaptureEffect(refs.effectsGroup, refs.activeEffects, lastMove.to, effectSkin);
      }

      if (chess.isCheckmate()) {
        const boardArr = chess.board();
        const loserColor = chess.turn();
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const p = boardArr[r][f];
            if (p && p.type === 'k' && p.color === loserColor) {
              const kingSq = `${FILES[f]}${RANKS[r]}`;
              spawnCaptureEffect(refs.effectsGroup, refs.activeEffects, kingSq, 'fireburst');
              spawnCaptureEffect(refs.effectsGroup, refs.activeEffects, kingSq, 'shockwave');
            }
          }
        }
      }
    }
    refs.prevFen = fen;
  }, [chess, fen, lastMove, effectSkin]);

  // Sync highlights (selection, legal moves, lastMove, check) & lift selected piece
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    while (refs.highlightsGroup.children.length > 0) {
      const child = refs.highlightsGroup.children[0] as THREE.Mesh;
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
      refs.highlightsGroup.remove(child);
    }

    // Reset piece heights (unless animating)
    refs.pieceMeshes.forEach((mesh, sq) => {
      if (refs.animatingPiece?.mesh === mesh) return;
      mesh.position.y = sq === selectedSquare ? 0.14 : 0;
    });

    const addSquareOverlay = (sq: string, color: number, opacity: number, y = 0.005) => {
      const { x, z } = squareToCoords(sq);
      const geom = new THREE.PlaneGeometry(0.95, 0.95);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      refs.highlightsGroup.add(mesh);
    };

    if (lastMove) {
      addSquareOverlay(lastMove.from, 0xfacc15, 0.28, 0.004);
      addSquareOverlay(lastMove.to, 0xfacc15, 0.36, 0.004);
    }

    if (selectedSquare) {
      addSquareOverlay(selectedSquare, 0x38bdf8, 0.45, 0.006);
    }

    // Legal move markers
    legalTargets.forEach((isCapture, sq) => {
      const { x, z } = squareToCoords(sq);
      if (isCapture) {
        const geom = new THREE.RingGeometry(0.36, 0.46, 32);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(geom, mat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.012, z);
        refs.highlightsGroup.add(ring);
      } else {
        const geom = new THREE.CircleGeometry(0.16, 24);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        });
        const dot = new THREE.Mesh(geom, mat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(x, 0.012, z);
        refs.highlightsGroup.add(dot);
      }
    });

    // King in check ring
    if (inCheck) {
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const p = board[r][f];
          if (p && p.type === 'k' && p.color === turn) {
            const kingSq = `${FILES[f]}${RANKS[r]}`;
            addSquareOverlay(kingSq, 0xef4444, 0.65, 0.008);
          }
        }
      }
    }
  }, [chess, inCheck, lastMove, legalTargets, selectedSquare, turn]);

  // Sync 3D Arrows
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    while (refs.arrowsGroup.children.length > 0) {
      const child = refs.arrowsGroup.children[0];
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      refs.arrowsGroup.remove(child);
    }

    for (const arrow of arrows) {
      const from = squareToCoords(arrow.from);
      const to = squareToCoords(arrow.to);
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.1) continue;

      const color = ARROW_HEX[arrow.color];
      const opacity = arrow.opacity ?? 0.85;
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity,
        roughness: 0.3,
      });

      const group = new THREE.Group();
      const headLen = 0.34;
      const shaftLen = Math.max(0.1, len - headLen);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, shaftLen, 12), mat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = shaftLen / 2;

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, headLen, 16), mat);
      head.rotation.z = -Math.PI / 2;
      head.position.x = shaftLen + headLen / 2;

      group.add(shaft, head);
      group.position.set(from.x, 0.2, from.z);
      group.rotation.y = -Math.atan2(dz, dx);
      refs.arrowsGroup.add(group);
    }
  }, [arrows]);

  const handleChoosePromotion = (promo: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    onMove(pendingPromotion.from, pendingPromotion.to, promo);
    setPendingPromotion(null);
  };

  return (
    <div className="relative w-full h-full select-none rounded-xl overflow-hidden shadow-2xl border border-slate-700/70 bg-slate-950">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Camera controls overlay */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={() => setCameraPreset('default')}
          title="Góc nhìn 3D chuẩn"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-200 backdrop-blur-sm transition cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>3D Chuẩn</span>
        </button>
        <button
          type="button"
          onClick={() => setCameraPreset('top')}
          title="Nhìn từ trên xuống"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-200 backdrop-blur-sm transition cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <span>Từ trên</span>
        </button>
      </div>

      {/* Subtle hint */}
      <div className="pointer-events-none absolute bottom-2 left-2.5 px-2 py-0.5 rounded bg-slate-950/65 text-[10px] text-slate-400 backdrop-blur-sm">
        Kéo chuột để xoay · Cuộn để phóng to/thu nhỏ · Nhấn quân cờ để đi
      </div>

      {/* Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3">
            <span className="text-sm font-semibold text-slate-100">Chọn quân phong cấp</span>
            <div className="flex items-center gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handleChoosePromotion(p)}
                  className="w-14 h-14 rounded-xl bg-slate-800 hover:bg-emerald-600/30 hover:border-emerald-400 border border-slate-700 p-2 transition cursor-pointer"
                >
                  <ChessPiece type={p} color={pendingPromotion.color} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingPromotion(null)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
