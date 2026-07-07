export interface CoffeeItem {
  id: string;
  name: string;
  nameEn: string;
  unlocked: boolean;
  unlockDate?: string;
  unlockCount?: number;
  imageUrl?: string;
  aiComment?: string;
  caffeineMg: number;
  gradient: string;
}

export const initialCoffeeData: CoffeeItem[] = [
  {
    id: "americano",
    name: "美式",
    nameEn: "Americano",
    unlocked: false,
    caffeineMg: 150,
    gradient: "from-amber-900 to-stone-900",
  },
  {
    id: "latte",
    name: "拿铁",
    nameEn: "Latte",
    unlocked: true,
    unlockDate: "2026-07-04",
    unlockCount: 42,
    imageUrl: "https://images.unsplash.com/photo-1561879044-887b088d2747?w=400&h=300&fit=crop",
    aiComment: "奶多咖少，职场温柔刀。老板看了都说好，同事看了想跳槽。",
    caffeineMg: 75,
    gradient: "from-amber-200 to-amber-600",
  },
  {
    id: "flat-white",
    name: "澳白",
    nameEn: "Flat White",
    unlocked: false,
    caffeineMg: 130,
    gradient: "from-orange-800 to-amber-900",
  },
  {
    id: "pour-over",
    name: "手冲",
    nameEn: "Pour Over",
    unlocked: false,
    caffeineMg: 180,
    gradient: "from-yellow-900 to-orange-950",
  },
  {
    id: "cold-brew",
    name: "冷萃",
    nameEn: "Cold Brew",
    unlocked: true,
    unlockDate: "2026-07-03",
    unlockCount: 28,
    imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop",
    aiComment: "低温慢萃12小时，就像你等年终奖的耐心。苦，但还得喝。",
    caffeineMg: 200,
    gradient: "from-sky-900 to-amber-950",
  },
  {
    id: "cappuccino",
    name: "卡布奇诺",
    nameEn: "Cappuccino",
    unlocked: false,
    caffeineMg: 80,
    gradient: "from-orange-300 to-amber-800",
  },
  {
    id: "mocha",
    name: "摩卡",
    nameEn: "Mocha",
    unlocked: false,
    caffeineMg: 90,
    gradient: "from-rose-900 to-amber-900",
  },
  {
    id: "special-blend",
    name: "特调",
    nameEn: "Special Blend",
    unlocked: false,
    caffeineMg: 120,
    gradient: "from-purple-900 to-amber-800",
  },
  {
    id: "espresso",
    name: "浓缩",
    nameEn: "Espresso",
    unlocked: false,
    caffeineMg: 63,
    gradient: "from-stone-900 to-neutral-950",
  },
  {
    id: "macchiato",
    name: "玛奇朵",
    nameEn: "Macchiato",
    unlocked: true,
    unlockDate: "2026-07-05",
    unlockCount: 15,
    imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop",
    aiComment: "一层奶泡遮不住浓缩的野心，像你藏不住想辞职的心。",
    caffeineMg: 70,
    gradient: "from-amber-100 to-amber-700",
  },
  {
    id: "irish-coffee",
    name: "爱尔兰咖啡",
    nameEn: "Irish Coffee",
    unlocked: false,
    caffeineMg: 100,
    gradient: "from-emerald-900 to-amber-950",
  },
  {
    id: "dirty",
    name: "脏脏咖啡",
    nameEn: "Dirty",
    unlocked: false,
    caffeineMg: 140,
    gradient: "from-stone-700 to-neutral-900",
  },
];

export const loadingTexts = [
  "咖啡豆研磨中...",
  "正在萃取数据...",
  "AI 正在品尝你的拿铁...",
  "图鉴即将解锁!",
];

export const statusMessages = [
  "打工人血液浓度：50%咖啡",
  "今日续命进度：进行中...",
  "咖啡因燃料已装填",
  "摸鱼能量充能中...",
];
