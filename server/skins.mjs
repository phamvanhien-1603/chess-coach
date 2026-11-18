export const SKIN_CATALOG = [
  { id: 'piece:classic', category: 'piece', key: 'classic', name: 'Ngà & Gỗ Mun', price: 0 },
  { id: 'piece:gold_obsidian', category: 'piece', key: 'gold_obsidian', name: 'Hoàng Kim & Hắc Diện', price: 150 },
  { id: 'piece:jade_crystal', category: 'piece', key: 'jade_crystal', name: 'Ngọc Bích & Lam Ngọc', price: 250 },
  { id: 'piece:crimson_steel', category: 'piece', key: 'crimson_steel', name: 'Thép Bạc & Hồng Ngọc', price: 400 },
  { id: 'piece:neon_cyber', category: 'piece', key: 'neon_cyber', name: 'Cyber Neon', price: 600 },

  { id: 'board:default', category: 'board', key: 'default', name: 'Mặc định theo Theme', price: 0 },
  { id: 'board:royal_marble', category: 'board', key: 'royal_marble', name: 'Cẩm Thạch Hoàng Gia', price: 200 },
  { id: 'board:midnight_gold', category: 'board', key: 'midnight_gold', name: 'Đêm Huyền Bí', price: 350 },
  { id: 'board:sakura_wood', category: 'board', key: 'sakura_wood', name: 'Gỗ Anh Đào', price: 500 },

  { id: 'effect:none', category: 'effect', key: 'none', name: 'Mặc định (Không hiệu ứng)', price: 0 },
  { id: 'effect:shockwave', category: 'effect', key: 'shockwave', name: 'Sóng Xung Kích', price: 120 },
  { id: 'effect:fireburst', category: 'effect', key: 'fireburst', name: 'Bùng Nổ Lửa', price: 220 },
  { id: 'effect:lightning', category: 'effect', key: 'lightning', name: 'Thiên Lôi Giáng Thế', price: 350 },
  { id: 'effect:void_vortex', category: 'effect', key: 'void_vortex', name: 'Hố Đen Hư Không', price: 500 },
];

export const SKIN_MAP = new Map(SKIN_CATALOG.map((s) => [s.id, s]));
