import * as THREE from 'three';
import type { PieceSymbol } from 'chess.js';
import type { PlayerColor } from '../../types/chess';

const LATHE_SEGMENTS = 32;

function latheFromProfile(points: [number, number][]): THREE.LatheGeometry {
  const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
  const geom = new THREE.LatheGeometry(vecs, LATHE_SEGMENTS);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Shared PBR materials for white and black Staunton pieces.
 */
export interface PieceMaterials {
  white: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  feltWhite: THREE.MeshStandardMaterial;
  feltBlack: THREE.MeshStandardMaterial;
}

export function createPieceMaterials(): PieceMaterials {
  return {
    white: new THREE.MeshStandardMaterial({
      color: 0xf4ede0,
      roughness: 0.26,
      metalness: 0.05,
    }),
    black: new THREE.MeshStandardMaterial({
      color: 0x2a2e38,
      roughness: 0.24,
      metalness: 0.12,
    }),
    feltWhite: new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.9,
      metalness: 0.0,
    }),
    feltBlack: new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.9,
      metalness: 0.0,
    }),
  };
}

export interface PieceGeometryCache {
  pawnBody: THREE.BufferGeometry;
  pawnHead: THREE.BufferGeometry;
  rookBody: THREE.BufferGeometry;
  rookBattlement: THREE.BufferGeometry;
  knightPedestal: THREE.BufferGeometry;
  knightHead: THREE.BufferGeometry;
  bishopBody: THREE.BufferGeometry;
  bishopFinial: THREE.BufferGeometry;
  queenBody: THREE.BufferGeometry;
  queenSpike: THREE.BufferGeometry;
  queenOrb: THREE.BufferGeometry;
  kingBody: THREE.BufferGeometry;
  kingCrossV: THREE.BufferGeometry;
  kingCrossH: THREE.BufferGeometry;
  feltBase: THREE.BufferGeometry;
}

export function createPieceGeometryCache(): PieceGeometryCache {
  const pawnBody = latheFromProfile([
    [0.0, 0.02],
    [0.33, 0.02],
    [0.34, 0.08],
    [0.29, 0.14],
    [0.22, 0.19],
    [0.15, 0.36],
    [0.11, 0.52],
    [0.18, 0.56],
    [0.11, 0.60],
    [0.0, 0.62],
  ]);
  const pawnHead = new THREE.SphereGeometry(0.17, 24, 18);

  const rookBody = latheFromProfile([
    [0.0, 0.02],
    [0.36, 0.02],
    [0.37, 0.09],
    [0.31, 0.15],
    [0.25, 0.20],
    [0.22, 0.48],
    [0.20, 0.68],
    [0.27, 0.74],
    [0.28, 0.88],
    [0.20, 0.88],
    [0.19, 0.80],
    [0.0, 0.80],
  ]);
  const rookBattlement = new THREE.BoxGeometry(0.11, 0.11, 0.09);

  const knightPedestal = latheFromProfile([
    [0.0, 0.02],
    [0.36, 0.02],
    [0.37, 0.09],
    [0.31, 0.15],
    [0.24, 0.21],
    [0.21, 0.28],
    [0.0, 0.28],
  ]);

  const knightShape = new THREE.Shape();
  knightShape.moveTo(-0.18, 0.0);
  knightShape.lineTo(0.20, 0.0);
  knightShape.quadraticCurveTo(0.24, 0.25, 0.14, 0.45);
  knightShape.lineTo(0.24, 0.52);
  knightShape.quadraticCurveTo(0.26, 0.60, 0.16, 0.66);
  knightShape.lineTo(0.06, 0.76);
  knightShape.lineTo(0.01, 0.70);
  knightShape.lineTo(-0.04, 0.77);
  knightShape.lineTo(-0.08, 0.67);
  knightShape.quadraticCurveTo(-0.22, 0.54, -0.22, 0.30);
  knightShape.quadraticCurveTo(-0.22, 0.12, -0.18, 0.0);

  const knightHead = new THREE.ExtrudeGeometry(knightShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 3,
  });
  knightHead.center();
  knightHead.computeVertexNormals();

  const bishopBody = latheFromProfile([
    [0.0, 0.02],
    [0.35, 0.02],
    [0.36, 0.09],
    [0.30, 0.15],
    [0.23, 0.20],
    [0.16, 0.46],
    [0.12, 0.64],
    [0.20, 0.69],
    [0.13, 0.73],
    [0.19, 0.86],
    [0.15, 0.99],
    [0.07, 1.08],
    [0.0, 1.10],
  ]);
  const bishopFinial = new THREE.SphereGeometry(0.055, 16, 12);

  const queenBody = latheFromProfile([
    [0.0, 0.02],
    [0.38, 0.02],
    [0.39, 0.09],
    [0.32, 0.16],
    [0.25, 0.22],
    [0.17, 0.52],
    [0.13, 0.76],
    [0.23, 0.82],
    [0.15, 0.87],
    [0.22, 1.02],
    [0.25, 1.12],
    [0.17, 1.12],
    [0.12, 1.06],
    [0.0, 1.06],
  ]);
  const queenSpike = new THREE.ConeGeometry(0.045, 0.14, 10);
  const queenOrb = new THREE.SphereGeometry(0.07, 18, 14);

  const kingBody = latheFromProfile([
    [0.0, 0.02],
    [0.39, 0.02],
    [0.40, 0.09],
    [0.33, 0.16],
    [0.26, 0.22],
    [0.18, 0.54],
    [0.14, 0.82],
    [0.24, 0.88],
    [0.16, 0.93],
    [0.22, 1.08],
    [0.25, 1.22],
    [0.15, 1.26],
    [0.0, 1.26],
  ]);
  const kingCrossV = new THREE.BoxGeometry(0.06, 0.22, 0.06);
  const kingCrossH = new THREE.BoxGeometry(0.16, 0.06, 0.06);

  const feltBase = new THREE.CylinderGeometry(0.34, 0.35, 0.025, 24);

  return {
    pawnBody,
    pawnHead,
    rookBody,
    rookBattlement,
    knightPedestal,
    knightHead,
    bishopBody,
    bishopFinial,
    queenBody,
    queenSpike,
    queenOrb,
    kingBody,
    kingCrossV,
    kingCrossH,
    feltBase,
  };
}

export function disposePieceGeometryCache(cache: PieceGeometryCache) {
  Object.values(cache).forEach((g) => g.dispose());
}

export function buildPieceMesh(
  type: PieceSymbol,
  color: PlayerColor,
  cache: PieceGeometryCache,
  materials: PieceMaterials
): THREE.Group {
  const group = new THREE.Group();
  const mat = color === 'w' ? materials.white : materials.black;
  const feltMat = color === 'w' ? materials.feltWhite : materials.feltBlack;

  const felt = new THREE.Mesh(cache.feltBase, feltMat);
  felt.position.y = 0.0125;
  felt.receiveShadow = true;
  group.add(felt);

  const addPart = (geom: THREE.BufferGeometry, x = 0, y = 0, z = 0, ry = 0) => {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  switch (type) {
    case 'p': {
      addPart(cache.pawnBody);
      addPart(cache.pawnHead, 0, 0.71, 0);
      break;
    }
    case 'r': {
      addPart(cache.rookBody);
      const count = 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = 0.235;
        addPart(cache.rookBattlement, Math.cos(angle) * r, 0.92, Math.sin(angle) * r, -angle);
      }
      break;
    }
    case 'n': {
      addPart(cache.knightPedestal);
      const head = addPart(cache.knightHead, 0, 0.62, 0.02);
      // Orient knight profile to face forward (-Z for White, +Z for Black)
      head.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
      break;
    }
    case 'b': {
      addPart(cache.bishopBody);
      addPart(cache.bishopFinial, 0, 1.13, 0);
      break;
    }
    case 'q': {
      addPart(cache.queenBody);
      const spikes = 8;
      for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const r = 0.21;
        addPart(cache.queenSpike, Math.cos(angle) * r, 1.16, Math.sin(angle) * r);
      }
      addPart(cache.queenOrb, 0, 1.15, 0);
      break;
    }
    case 'k': {
      addPart(cache.kingBody);
      addPart(cache.kingCrossV, 0, 1.36, 0);
      addPart(cache.kingCrossH, 0, 1.40, 0);
      break;
    }
  }

  return group;
}
