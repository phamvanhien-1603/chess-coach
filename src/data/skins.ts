export type PieceSkinKey =
  | 'classic'
  | 'gold_obsidian'
  | 'jade_crystal'
  | 'crimson_steel'
  | 'neon_cyber';

export type BoardSkinKey =
  | 'default'
  | 'royal_marble'
  | 'midnight_gold'
  | 'sakura_wood';

export type EffectSkinKey =
  | 'none'
  | 'shockwave'
  | 'fireburst'
  | 'lightning'
  | 'void_vortex';

export interface EffectSkinDef {
  id: string;
  key: EffectSkinKey;
  name: string;
  description: string;
  price: number;
  primaryHex: string;
  secondaryHex: string;
}

export interface PieceSkinDef {
  id: string;
  key: PieceSkinKey;
  name: string;
  description: string;
  price: number;
  whiteColor: number;
  blackColor: number;
  roughness: number;
  metalness: number;
  whiteEmissive?: number;
  blackEmissive?: number;
  emissiveIntensity?: number;
  previewWhite: string;
  previewBlack: string;
}

export interface BoardSkinDef {
  id: string;
  key: BoardSkinKey;
  name: string;
  description: string;
  price: number;
  lightHex: string;
  darkHex: string;
  frameHex: string;
  lightNum: number;
  darkNum: number;
  frameNum: number;
}

export const PIECE_SKINS: PieceSkinDef[] = [
  {
    id: 'piece:classic',
    key: 'classic',
    name: 'Ngà & Gỗ Mun',
    description: 'Bộ quân Staunton cổ điển thanh lịch.',
    price: 0,
    whiteColor: 0xf4ede0,
    blackColor: 0x2a2e38,
    roughness: 0.26,
    metalness: 0.08,
    previewWhite: '#f4ede0',
    previewBlack: '#2a2e38',
  },
  {
    id: 'piece:gold_obsidian',
    key: 'gold_obsidian',
    name: 'Hoàng Kim & Hắc Diện',
    description: 'Quân Trắng mạ vàng bóng, quân Đen đá obsidian sang trọng.',
    price: 150,
    whiteColor: 0xfbbf24,
    blackColor: 0x1e1b2e,
    roughness: 0.18,
    metalness: 0.55,
    previewWhite: '#fbbf24',
    previewBlack: '#1e1b2e',
  },
  {
    id: 'piece:jade_crystal',
    key: 'jade_crystal',
    name: 'Ngọc Bích & Lam Ngọc',
    description: 'Quân Trắng ngọc bích sáng, quân Đen lam ngọc sapphire.',
    price: 250,
    whiteColor: 0x6ee7b7,
    blackColor: 0x1e3a8a,
    roughness: 0.15,
    metalness: 0.25,
    previewWhite: '#6ee7b7',
    previewBlack: '#1e3a8a',
  },
  {
    id: 'piece:crimson_steel',
    key: 'crimson_steel',
    name: 'Thép Bạc & Hồng Ngọc',
    description: 'Quân Trắng thép crôm sáng bóng, quân Đen đỏ ruby quyền lực.',
    price: 400,
    whiteColor: 0xe2e8f0,
    blackColor: 0x9f1239,
    roughness: 0.16,
    metalness: 0.65,
    previewWhite: '#e2e8f0',
    previewBlack: '#9f1239',
  },
  {
    id: 'piece:neon_cyber',
    key: 'neon_cyber',
    name: 'Cyber Neon',
    description: 'Phát sáng rực rỡ với tông xanh Cyan và tím Neon.',
    price: 600,
    whiteColor: 0x38bdf8,
    blackColor: 0xa855f7,
    roughness: 0.2,
    metalness: 0.35,
    whiteEmissive: 0x0284c7,
    blackEmissive: 0x6b21a8,
    emissiveIntensity: 0.45,
    previewWhite: '#38bdf8',
    previewBlack: '#a855f7',
  },
];

export const BOARD_SKINS: BoardSkinDef[] = [
  {
    id: 'board:default',
    key: 'default',
    name: 'Mặc định theo Theme',
    description: 'Sử dụng màu bàn cờ đang chọn trong phần Cài đặt.',
    price: 0,
    lightHex: '#ebecd0',
    darkHex: '#739552',
    frameHex: '#243129',
    lightNum: 0xebecd0,
    darkNum: 0x628846,
    frameNum: 0x243129,
  },
  {
    id: 'board:royal_marble',
    key: 'royal_marble',
    name: 'Cẩm Thạch Hoàng Gia',
    description: 'Đá cẩm thạch trắng kem phối xanh ngọc lục bảo và viền đồng.',
    price: 200,
    lightHex: '#f8fafc',
    darkHex: '#0f766e',
    frameHex: '#451a03',
    lightNum: 0xf8fafc,
    darkNum: 0x0f766e,
    frameNum: 0x451a03,
  },
  {
    id: 'board:midnight_gold',
    key: 'midnight_gold',
    name: 'Đêm Huyền Bí',
    description: 'Bàn cờ xám bạc & đen tuyền kết hợp khung viền vàng đồng.',
    price: 350,
    lightHex: '#94a3b8',
    darkHex: '#0f172a',
    frameHex: '#78350f',
    lightNum: 0x94a3b8,
    darkNum: 0x0f172a,
    frameNum: 0x78350f,
  },
  {
    id: 'board:sakura_wood',
    key: 'sakura_wood',
    name: 'Gỗ Anh Đào',
    description: 'Tông hồng phấn nhẹ nhàng phối gỗ gụ ấm áp.',
    price: 500,
    lightHex: '#fce7f3',
    darkHex: '#9d174d',
    frameHex: '#4c0519',
    lightNum: 0xfce7f3,
    darkNum: 0x9d174d,
    frameNum: 0x4c0519,
  },
];

export function getPieceSkin(key?: string | null): PieceSkinDef {
  return PIECE_SKINS.find((s) => s.key === key) || PIECE_SKINS[0];
}

export function getBoardSkin(key?: string | null): BoardSkinDef | null {
  if (!key || key === 'default') return null;
  return BOARD_SKINS.find((s) => s.key === key) || null;
}

export const EFFECT_SKINS: EffectSkinDef[] = [
  {
    id: 'effect:none',
    key: 'none',
    name: 'Mặc định',
    description: 'Di chuyển và ăn quân nhẹ nhàng, không hiệu ứng thêm.',
    price: 0,
    primaryHex: '#64748b',
    secondaryHex: '#94a3b8',
  },
  {
    id: 'effect:shockwave',
    key: 'shockwave',
    name: 'Sóng Xung Kích',
    description: 'Tạo vòng sóng năng lượng xanh lam lan tỏa khi hạ quân đối thủ.',
    price: 120,
    primaryHex: '#06b6d4',
    secondaryHex: '#10b981',
  },
  {
    id: 'effect:fireburst',
    key: 'fireburst',
    name: 'Bùng Nổ Lửa',
    description: '24 tia lửa rực cháy bắn tung tóe kèm ánh chớp khi ăn quân.',
    price: 220,
    primaryHex: '#f97316',
    secondaryHex: '#ef4444',
  },
  {
    id: 'effect:lightning',
    key: 'lightning',
    name: 'Thiên Lôi Giáng Thế',
    description: 'Tia sét xanh trắng đánh thẳng từ trên xuống ô cờ vừa hạ quân.',
    price: 350,
    primaryHex: '#38bdf8',
    secondaryHex: '#e0f2fe',
  },
  {
    id: 'effect:void_vortex',
    key: 'void_vortex',
    name: 'Hố Đen Hư Không',
    description: 'Xoáy năng lượng tím huyền bí và mảnh vỡ không gian khi hạ cờ.',
    price: 500,
    primaryHex: '#a855f7',
    secondaryHex: '#ec4899',
  },
];

export function getEffectSkin(key?: string | null): EffectSkinDef {
  return EFFECT_SKINS.find((s) => s.key === key) || EFFECT_SKINS[0];
}
