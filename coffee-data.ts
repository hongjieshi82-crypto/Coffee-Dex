export interface CoffeeType {
  id: string;
  categoryId: string;
  name: string;
  en: string;
  gradient: [string, string];
}

export interface CoffeeCategory {
  id: string;
  name: string;
  en: string;
  items: CoffeeType[];
}

export interface CoffeeRecord {
  id: string;
  coffeeType: string;
  coffeeName: string;
  categoryId: string;
  volumeMl: number;
  imageData?: string;
  caffeine: number;
  temp?: string | null;
  sugar?: string | null;
  aiComment: string;
  toxicQuote: string;
  timestamp: number;
}

const withCategory = (
  categoryId: string,
  items: Array<Omit<CoffeeType, "categoryId">>
): CoffeeType[] => items.map((item) => ({ ...item, categoryId }));

export const coffeeCategories: CoffeeCategory[] = [
  {
    id: "espresso-base",
    name: "意式经典",
    en: "Espresso Base",
    items: withCategory("espresso-base", [
      { id: "espresso", name: "Espresso", en: "Espresso", gradient: ["#292524", "#0a0a0a"] },
      { id: "americano", name: "美式", en: "Americano", gradient: ["#78350f", "#1c1917"] },
      { id: "latte", name: "拿铁", en: "Latte", gradient: ["#fbbf24", "#d97706"] },
      { id: "cappuccino", name: "卡布奇诺", en: "Cappuccino", gradient: ["#fdba74", "#92400e"] },
      { id: "flat-white", name: "澳白", en: "Flat White", gradient: ["#9a3412", "#451a03"] },
      { id: "cortado", name: "可塔朵", en: "Cortado", gradient: ["#a16207", "#78350f"] },
      { id: "macchiato", name: "玛奇朵", en: "Macchiato", gradient: ["#d4a373", "#6b4226"] },
      { id: "ristretto", name: "精萃", en: "Ristretto", gradient: ["#1c1917", "#0a0a0a"] },
    ]),
  },
  {
    id: "milk-sweet",
    name: "奶咖甜咖",
    en: "Milk & Sweet",
    items: withCategory("milk-sweet", [
      { id: "vanilla-latte", name: "香草拿铁", en: "Vanilla Latte", gradient: ["#fef3c7", "#d97706"] },
      { id: "caramel-macchiato", name: "焦糖玛奇朵", en: "Caramel Macchiato", gradient: ["#fbbf24", "#92400e"] },
      { id: "mocha", name: "摩卡", en: "Mocha", gradient: ["#881337", "#78350f"] },
      { id: "hazelnut-latte", name: "榛果拿铁", en: "Hazelnut Latte", gradient: ["#a16207", "#78350f"] },
      { id: "affogato", name: "阿芙佳朵", en: "Affogato", gradient: ["#fde68a", "#92400e"] },
      { id: "osmanthus-latte", name: "桂花拿铁", en: "Osmanthus Latte", gradient: ["#fbbf24", "#b45309"] },
      { id: "coconut-latte", name: "生椰拿铁", en: "Coconut Latte", gradient: ["#e2e8f0", "#94a3b8"] },
    ]),
  },
  {
    id: "filter",
    name: "手冲精品",
    en: "Filter Coffee",
    items: withCategory("filter", [
      { id: "yirgacheffe", name: "耶加雪菲", en: "Yirgacheffe", gradient: ["#581c87", "#312e81"] },
      { id: "colombia", name: "哥伦比亚", en: "Colombia", gradient: ["#78350f", "#451a03"] },
      { id: "kenya", name: "肯尼亚", en: "Kenya", gradient: ["#991b1b", "#450a0a"] },
      { id: "panama-geisha", name: "巴拿马瑰夏", en: "Panama Geisha", gradient: ["#b45309", "#78350f"] },
      { id: "mandheling", name: "曼特宁", en: "Mandheling", gradient: ["#365314", "#1a2e05"] },
      { id: "brazil", name: "巴西", en: "Brazil", gradient: ["#166534", "#052e16"] },
    ]),
  },
  {
    id: "cold",
    name: "冷萃冰咖",
    en: "Cold Coffee",
    items: withCategory("cold", [
      { id: "iced-americano", name: "冰美式", en: "Iced Americano", gradient: ["#1e3a5f", "#0c4a6e"] },
      { id: "cold-brew", name: "冷萃", en: "Cold Brew", gradient: ["#0c4a6e", "#451a03"] },
      { id: "nitro-coffee", name: "氮气咖啡", en: "Nitro Coffee", gradient: ["#374151", "#111827"] },
      { id: "iced-latte", name: "冰拿铁", en: "Iced Latte", gradient: ["#93c5fd", "#2563eb"] },
      { id: "frappuccino", name: "星冰乐", en: "Frappuccino", gradient: ["#c084fc", "#7c3aed"] },
      { id: "lemon-coffee", name: "冻柠咖啡", en: "Lemon Coffee", gradient: ["#fde047", "#ca8a04"] },
    ]),
  },
  {
    id: "signature",
    name: "特调创意",
    en: "Signature & Trend",
    items: withCategory("signature", [
      { id: "dirty", name: "Dirty", en: "Dirty", gradient: ["#44403c", "#171717"] },
      { id: "coconut-coffee", name: "椰子水咖啡", en: "Coconut Coffee", gradient: ["#a3e635", "#65a30d"] },
      { id: "orange-americano", name: "橙子美式", en: "Orange Americano", gradient: ["#f97316", "#c2410c"] },
      { id: "liquor-coffee", name: "酒香咖啡", en: "Liquor Coffee", gradient: ["#92400e", "#451a03"] },
      { id: "oat-latte", name: "燕麦拿铁", en: "Oat Latte", gradient: ["#d4a373", "#a16207"] },
      { id: "sparkling-americano", name: "气泡美式", en: "Sparkling Americano", gradient: ["#67e8f9", "#0891b2"] },
      { id: "plum-americano", name: "话梅美式", en: "Plum Americano", gradient: ["#c084fc", "#7c3aed"] },
    ]),
  },
  {
    id: "alt-drinks",
    name: "非咖啡替代饮",
    en: "Coffee Alternatives",
    items: withCategory("alt-drinks", [
      { id: "matcha-latte", name: "抹茶拿铁", en: "Matcha Latte", gradient: ["#22c55e", "#166534"] },
      { id: "cocoa", name: "可可", en: "Cocoa", gradient: ["#78350f", "#451a03"] },
      { id: "black-tea-latte", name: "红茶拿铁", en: "Black Tea Latte", gradient: ["#dc2626", "#7f1d1d"] },
      { id: "herbal", name: "草本饮品", en: "Herbal Drink", gradient: ["#4ade80", "#166534"] },
      { id: "chai-latte", name: "印度奶茶", en: "Chai Latte", gradient: ["#d97706", "#92400e"] },
      { id: "earl-grey", name: "伯爵茶", en: "Earl Grey", gradient: ["#6366f1", "#312e81"] },
    ]),
  },
];

export const coffeeTypes = coffeeCategories.flatMap((category) => category.items);
export const coffeeTypeMap = Object.fromEntries(coffeeTypes.map((coffee) => [coffee.id, coffee]));
export const coffeeCategoryMap = Object.fromEntries(coffeeCategories.map((category) => [category.id, category]));

export interface CoffeeSearchMatch {
  category: CoffeeCategory;
  coffee: CoffeeType;
}

const coffeeAliases: Record<string, string[]> = {
  americano: ["美式咖啡", "黑咖啡", "小黄油美式", "黄油美式", "奶油美式", "青提美式", "茉莉美式"],
  "iced-americano": ["冰美", "冰美式咖啡"],
  latte: ["拿铁咖啡", "latte"],
  "flat-white": ["澳瑞白", "馥芮白", "flatwhite"],
  cappuccino: ["卡布", "卡布基诺"],
  macchiato: ["玛琪朵", "玛奇雅朵"],
  "caramel-macchiato": ["焦玛", "焦糖玛琪朵"],
  "cold-brew": ["冷泡", "冷萃咖啡"],
  dirty: ["脏咖啡", "脏脏"],
  "coconut-latte": ["生椰", "生椰拿铁咖啡"],
  "orange-americano": ["橙美式", "橙c美式"],
  "oat-latte": ["燕麦奶拿铁"],
  "matcha-latte": ["抹茶", "抹茶拿铁咖啡"],
  cocoa: ["热可可", "巧克力"],
  "black-tea-latte": ["红茶拿铁", "鸳鸯"],
  "chai-latte": ["印度奶茶", "香料奶茶"],
  "earl-grey": ["伯爵", "伯爵红茶"],
};

const coffeeFamilies: Array<{ keywords: string[]; ids: string[] }> = [
  {
    keywords: ["美式", "americano", "黑咖啡"],
    ids: ["americano", "iced-americano", "orange-americano", "sparkling-americano", "plum-americano"],
  },
  {
    keywords: ["拿铁", "latte"],
    ids: [
      "latte",
      "vanilla-latte",
      "hazelnut-latte",
      "osmanthus-latte",
      "coconut-latte",
      "iced-latte",
      "oat-latte",
      "matcha-latte",
      "black-tea-latte",
      "chai-latte",
    ],
  },
  {
    keywords: ["玛奇朵", "玛琪朵", "macchiato"],
    ids: ["macchiato", "caramel-macchiato"],
  },
  {
    keywords: ["冷萃", "冷泡", "coldbrew"],
    ids: ["cold-brew", "nitro-coffee"],
  },
  {
    keywords: ["摩卡", "mocha", "巧克力"],
    ids: ["mocha", "cocoa"],
  },
  {
    keywords: ["椰", "coconut"],
    ids: ["coconut-latte", "coconut-coffee"],
  },
  {
    keywords: ["茶", "tea"],
    ids: ["matcha-latte", "black-tea-latte", "chai-latte", "earl-grey", "herbal"],
  },
];

export function searchCoffeeTypes(term: string, limit = 8): CoffeeSearchMatch[] {
  const query = normalizeCoffeeQuery(term);

  if (!query) return [];

  const matches = new Map<string, CoffeeSearchMatch & { score: number }>();
  const categoryByCoffeeId = new Map<string, CoffeeSearchMatch>();

  const addMatch = (category: CoffeeCategory, coffee: CoffeeType, score: number) => {
    const existing = matches.get(coffee.id);

    if (!existing || score < existing.score) {
      matches.set(coffee.id, { category, coffee, score });
    }
  };

  for (const category of coffeeCategories) {
    for (const coffee of category.items) {
      categoryByCoffeeId.set(coffee.id, { category, coffee });

      const fields = [coffee.name, coffee.en, coffee.id, ...(coffeeAliases[coffee.id] ?? [])].map(normalizeCoffeeQuery);
      const exact = fields.some((field) => field === query);
      const startsWith = fields.some((field) => field.startsWith(query));
      const includes = fields.some((field) => field.includes(query) || (field.length >= 2 && query.includes(field)));

      if (exact || startsWith || includes) {
        addMatch(category, coffee, exact ? 0 : startsWith ? 1 : 2);
      }
    }
  }

  for (const family of coffeeFamilies) {
    const familyHit = family.keywords.map(normalizeCoffeeQuery).some((keyword) => query.includes(keyword));

    if (!familyHit) continue;

    family.ids.forEach((id, index) => {
      const item = categoryByCoffeeId.get(id);

      if (item) {
        addMatch(item.category, item.coffee, 3 + index / 10);
      }
    });
  }

  return Array.from(matches.values())
    .sort((a, b) => a.score - b.score || a.coffee.name.length - b.coffee.name.length)
    .slice(0, limit)
    .map(({ category, coffee }) => ({ category, coffee }));
}

function normalizeCoffeeQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·・_\-—]/g, "")
    .replace(/拿铁咖啡|美式咖啡|咖啡|饮品|饮料/g, (match) => {
      if (match === "拿铁咖啡") return "拿铁";
      if (match === "美式咖啡") return "美式";
      return "";
    });
}

export const caffeinePer100ml: Record<string, number> = {
  espresso: 100,
  americano: 45,
  latte: 30,
  cappuccino: 30,
  "flat-white": 40,
  cortado: 50,
  macchiato: 55,
  ristretto: 110,
  "vanilla-latte": 28,
  "caramel-macchiato": 32,
  mocha: 25,
  "hazelnut-latte": 28,
  affogato: 20,
  "osmanthus-latte": 28,
  "coconut-latte": 25,
  yirgacheffe: 35,
  colombia: 38,
  kenya: 40,
  "panama-geisha": 30,
  mandheling: 42,
  brazil: 35,
  "iced-americano": 45,
  "cold-brew": 25,
  "nitro-coffee": 30,
  "iced-latte": 30,
  frappuccino: 15,
  "lemon-coffee": 35,
  dirty: 45,
  "coconut-coffee": 20,
  "orange-americano": 35,
  "liquor-coffee": 20,
  "oat-latte": 28,
  "sparkling-americano": 35,
  "plum-americano": 30,
  "matcha-latte": 15,
  cocoa: 10,
  "black-tea-latte": 12,
  herbal: 0,
  "chai-latte": 10,
  "earl-grey": 8,
};

export const aiComments: Record<string, string> = {
  espresso: "一杯浓缩，两口闷完。像你处理紧急 bug 的速度。",
  americano: "大杯美式，血液变黑水。今天也是帮老板换保时捷努力的一天。",
  latte: "奶多咖少，职场温柔刀。老板看了都说好，同事看了想跳槽。",
  cappuccino: "奶泡蓬松如你的发际线，浓郁似你的加班怨气。",
  "flat-white": "澳白在手，格调我有。假装在墨尔本办公的打工魂。",
  cortado: "可塔朵，浓缩配一小口奶。像你开工资后短暂的快乐。",
  macchiato: "玛奇朵，甜头只有一点点，苦才是主旋律。",
  ristretto: "精萃，比普通浓缩还浓。像你在 deadline 前浓缩的焦虑。",
  "vanilla-latte": "香草拿铁，甜蜜如画的饼。喝完继续搬砖。",
  "caramel-macchiato": "焦糖玛奇朵，甜到忘记 KPI。短暂快乐像周五四点半。",
  mocha: "巧克力加咖啡，甜苦交织。像极了你周一早晨的心情。",
  "hazelnut-latte": "榛果拿铁，闻起来比你的年终总结还有层次。",
  affogato: "阿芙佳朵，冰淇淋浇浓缩。像用年终奖还花呗，甜蜜又心酸。",
  "osmanthus-latte": "桂花拿铁，花香盖过咖味。像你在工位上喷香水假装不在加班。",
  "coconut-latte": "生椰拿铁，打工人唯一的东南亚度假平替。",
  yirgacheffe: "耶加雪菲，花果香里找 bug。喝这杯的人觉得自己比产品经理懂生活。",
  colombia: "哥伦比亚单品，比你的职业规划还醇苦。",
  kenya: "肯尼亚咖啡，酸度拉满。像你看到同事升职时的心情。",
  "panama-geisha": "瑰夏一杯，钱包瘦十斤。喝的不是咖啡，是身份焦虑。",
  mandheling: "曼特宁，草本药草味。像一杯能治周一综合症的苦口良药。",
  brazil: "巴西单品，打工人的日常口粮，踏实得像你的工位。",
  "iced-americano": "冰美式，打工人的续命冰水。越冰越清醒，越清醒越痛苦。",
  "cold-brew": "低温慢萃十二小时，就像你等年终奖的耐心。",
  "nitro-coffee": "氮气咖啡，绵密如你的画饼能力。看起来高级，喝起来上头。",
  "iced-latte": "冰拿铁，夏天的职场安慰剂。暂时忘记 deadline。",
  frappuccino: "星冰乐，冰沙里掺了点咖啡。像你在工作中掺了点摸鱼。",
  "lemon-coffee": "冻柠咖啡，酸甜苦的混合体。像你对公司的感情。",
  dirty: "脏脏咖啡，像你桌面上三个月没整理的文件。但味道确实上头。",
  "coconut-coffee": "椰子水咖啡，清爽得像离职申请通过的那一秒。",
  "orange-americano": "橙子美式，酸得很阳光。像你把崩溃包装成积极向上。",
  "liquor-coffee": "酒香咖啡，成年人的续命要加点料。",
  "oat-latte": "燕麦拿铁，健康人设立起来了，夜宵照吃不误。",
  "sparkling-americano": "气泡美式，连咖啡都开始内卷口感了。",
  "plum-americano": "话梅美式，酸甜咸苦都有，像你一天的工作情绪。",
  "matcha-latte": "抹茶拿铁，不是咖啡但很懂装忙。",
  cocoa: "可可，成年人偶尔也需要假装自己还有童年。",
  "black-tea-latte": "红茶拿铁，咖啡因换个马甲继续支配你。",
  herbal: "草本饮品，零咖啡因，但焦虑不减半。",
  "chai-latte": "印度奶茶，香料够多，足以盖住今天的委屈。",
  "earl-grey": "伯爵茶，优雅地清醒，体面地加班。",
};

export const toxicQuotes = [
  "这杯咖啡的苦涩，远不及你周一早会的表情。",
  "你以为喝的是咖啡？不，你喝的是加班的燃料。",
  "打工人的血液里，70% 是咖啡，30% 是委屈。",
  "咖啡续命，deadline 催魂，今天的你依然很会硬撑。",
  "别问为什么这么苦，看看你的工资条。",
  "今日咖啡已到账，精神状态依然待审批。",
  "你不是离不开咖啡，你是离不开假装还能干。",
  "这一口下去，KPI 没完成，但心率先完成了。",
  "你喝下去的是拿铁，咽下去的是需求变更。",
  "加班不会让你变富，但咖啡会让你误以为还能撑。",
  "今天的精神状态：杯子是满的，人是空的。",
  "咖啡因开始工作了，你的工资还在试用期。",
  "这杯下肚，灵魂上线，肉体继续归公司所有。",
  "老板画饼，你喝咖啡，碳水和咖啡因共同维持幻觉。",
  "如果努力有用，咖啡店早就上市感谢你了。",
  "你不是困，你只是短暂意识到人生没有进度条。",
  "这杯咖啡叫醒了你，也叫不醒装睡的预算。",
  "喝之前是社畜，喝之后是高清社畜。",
  "咖啡很苦，但比不上需求会后补充的那一句。",
  "今天也是靠咖啡把崩溃包装成专业的一天。",
  "你以为你在续命，其实你在延长在线时间。",
  "杯盖一合，情绪一收，继续做个成熟的打工人。",
  "咖啡香气四溢，离职念头也很清晰。",
  "这杯喝完，问题不会消失，只会变得更醒目。",
  "别人喝咖啡提神，你喝咖啡是为了继续忍。",
  "焦虑兑上冰块，就是今日特调。",
  "你和这杯咖啡的共同点：都被榨过。",
  "咖啡是苦的，绩效沟通是回甘都没有的。",
  "这一口叫醒大脑，下一秒继续被会议按回去。",
  "不要问咖啡多少钱，问就是比你的时薪有尊严。",
  "你今天喝的是美式，过的是没事硬撑式。",
  "杯子里的泡沫，比晋升承诺还真实一点。",
  "喝完这一杯，继续用积极语气表达绝望。",
  "咖啡救不了人生，但能救你过完下午三点。",
  "今日份续命完成，今日份意义仍在加载。",
  "一杯咖啡下去，心跳有了，灵魂还没批下来。",
  "别担心睡不着，反正明天醒来也要上班。",
  "咖啡越浓，越像你对甲方的怨气。",
  "你喝的是冷萃，心是热的，工资是凉的。",
  "这杯的酸度像团队协作，入口就让人皱眉。",
  "奶泡很厚，像你假装听懂战略会的表情。",
  "每一口都在提醒你：成年人的快乐按毫升计费。",
  "你不是没电了，你是长期欠费运行。",
  "这杯咖啡没有解决问题，但让你清醒地面对问题。",
  "早八的你和冰美式，都是被迫上岗。",
  "咖啡豆被研磨，你被周报研磨，大家都有光明未来。",
  "喝下它，继续成为组织架构里一颗安静的小齿轮。",
  "今日咖啡风味：前调疲惫，中调忍耐，尾调想辞职。",
  "咖啡因让你醒着，工资让你冷静。",
  "你不是需要休息，你只是需要一个不用解释的周末。",
  "这杯下去，脑子开机，心情蓝屏。",
  "苦味很高级，像你朋友圈里不方便明说的崩溃。",
  "咖啡杯见证了你比 OKR 更稳定的疲惫。",
  "今天的你被咖啡扶起来，又被需求按回工位。",
  "喝咖啡不是习惯，是求生本能穿了件体面的外套。",
  "你以为这是奖励自己，其实是给公司设备续航。",
  "这杯咖啡越喝越清醒，越清醒越想请假。",
  "香气扑鼻，余额冷静，人生平衡得很残酷。",
  "你和咖啡机都很忙，区别是它还有定期清洁。",
  "咖啡的回甘短暂，工作的回旋镖持久。",
  "这一杯敬明天，虽然明天也不一定放过你。",
  "你喝下的每一口，都在替理想主义续最后一点电。",
  "冰块融化了，KPI 没有。",
  "咖啡杯边的水珠，是打工人不被允许流下的泪。",
  "今天也是用咖啡因和礼貌撑起职场体面的一天。",
  "如果人生有撤回键，你可能会先撤回入职申请。",
  "杯底见了，需求还没见底。",
  "你不是热爱咖啡，你只是热爱还能保持清醒的自己。",
  "这杯咖啡很懂事，至少它真的有在发挥作用。",
  "喝完这杯，继续假装自己的职业规划不是随机游走。",
  "咖啡在胃里，委屈在心里，笑容在会议里。",
  "今天的生产力来自咖啡，归属感来自幻觉。",
  "你说它苦，它说你的人生更浓郁。",
  "这杯的层次很丰富：先提神，再心慌，最后继续干活。",
  "咖啡店的座位很软，现实的工位很硬。",
  "喝下去的是咖啡，吐出来的是收到收到。",
  "你以为你在品风味，其实你在评估还能撑几小时。",
  "咖啡杯很小，装不下你对工作的全部意见。",
  "今日续命口味：少糖，多忍。",
  "这杯咖啡至少诚实地苦，不像有些会议包装得很甜。",
  "喝完以后你会更清醒地知道：问题不是困。",
  "咖啡帮你熬过白天，手机帮你熬过夜晚。",
  "你把咖啡喝完了，咖啡也把你看透了。",
  "醒来、打卡、喝咖啡、假装一切都可控。",
  "这杯是你的临时补丁，人生系统仍有大量 warning。",
  "咖啡因在奔跑，工资条在原地踏步。",
  "杯里的拉花很漂亮，像你精心维护的职场人设。",
  "这一口下去，至少你的沉默更有力量了。",
  "喝咖啡前想辞职，喝咖啡后想有计划地辞职。",
  "你今天不是需要灵感，你只是需要别再开会。",
  "咖啡是打工人的回血包，只是副本难度没有下降。",
  "每次扫码录入，都是对今天还没倒下的纪念。",
  "这杯饮品认证成功：它能喝，你也还能忍。",
  "这杯咖啡像你的职业发展，闻起来有前景，喝下去全是现实。",
  "今天的咖啡因余额充足，人生余额依旧紧张。",
  "你以为你在摸鱼，其实你只是在给崩溃做热身。",
  "咖啡让你醒来，工作让你想重新睡回去。",
  "这一杯的苦味很稳，像公司永远不会消失的流程。",
  "喝完这杯，你会更清楚地知道自己为什么疲惫。",
  "成年人的早晨，靠咖啡开机，靠工资忍耐。",
  "这杯咖啡是热的，职场关系是冷的。",
  "你今天不是状态不好，你只是对现实过敏。",
  "咖啡杯很轻，装着的班味很重。",
  "今天的你没有迟到，只是灵魂还在路上。",
  "这杯下去，眼睛亮了，人生没亮。",
  "喝咖啡是为了清醒，清醒是为了继续被安排。",
  "你不是缺动力，你缺的是不用上班的理由。",
  "咖啡因让你暂时上线，绩效让你永久沉默。",
  "这杯咖啡的香气，比领导的承诺更接近真实。",
  "喝完以后请继续保持专业，哪怕内心已经退出会议。",
  "你的今日目标：活着下班，并显得很有执行力。",
  "这杯咖啡比你的工作群更懂得适可而止。",
  "越喝越清醒，越清醒越发现今天又是循环任务。",
  "咖啡没有骗你，它从一开始就承认自己很苦。",
  "你和这杯咖啡都在降温，只是它比你更快被喝完。",
  "今天的心情像无糖美式，入口就知道没有惊喜。",
  "这杯续的是命，耗的是对生活的想象力。",
  "咖啡可以加奶，工作不能加倍工资。",
  "你不是在奋斗，你是在用咖啡因抵押明天的精神状态。",
  "杯口的热气升起来了，你的晋升空间还在原地。",
  "这一口下去，脑子开机，工位锁屏解除。",
  "你以为咖啡救了你，其实只是让你更清醒地加班。",
  "这杯咖啡没有灵魂，但至少没有要求你写周报。",
  "早会前喝咖啡，是成年人对自我的最后一点保护。",
  "今天的你像冰美式，看起来冷静，实际很苦。",
  "咖啡机都知道定时休息，你还在假装自己是永动机。",
  "这杯咖啡提醒你，真正上头的不是咖啡因，是工作量。",
  "需求变更像咖啡渣，总会在最后一口出现。",
  "你不是想喝咖啡，你是想拥有三分钟不被打扰。",
  "喝下这杯，继续把离谱需求翻译成好的收到。",
  "咖啡越贵，越显得你对今天还有期待。",
  "这杯是职场防御药水，效果持续到下一个会议通知。",
  "你今天的精神状态像外卖咖啡，路上已经洒了一半。",
  "咖啡不是解药，是把问题调成高清模式。",
  "喝完以后你会发现，困只是问题里最温柔的那一个。",
  "这杯咖啡的后劲，比请假理由还难编。",
  "职场最稳定的三件事：会议、加班、你手里的咖啡。",
  "你把咖啡当救命绳，公司把你当待办项。",
  "这杯下去，打工人的操作系统完成热更新。",
  "今日风味：前调赶地铁，中调赶进度，尾调赶紧下班。",
  "咖啡很浓，像你不敢发出来的那段话。",
  "你不是效率低，你只是被太多无效沟通稀释了。",
  "喝咖啡前是低电量，喝咖啡后是高功耗。",
  "这杯咖啡能提神，但不能提高预算。",
  "今天的工位很安静，安静得像你的加薪通知。",
  "咖啡杯里的冰块在融化，你的耐心也是。",
  "喝完这杯，继续把人生过成项目排期。",
  "你不是没有梦想，只是梦想被会议纪要覆盖了。",
  "这杯咖啡的苦，像你打开工资单时的沉默。",
  "咖啡可以续杯，假期不能。",
  "你今天的笑容很职业，像自动回复一样稳定。",
  "这杯饮品没有给你答案，但给了你继续装懂的勇气。",
  "醒着不代表清醒，清醒不代表想上班。",
  "咖啡把你从床上捞起来，工作把你按回现实里。",
  "这一杯是给身体的，下一场会是给灵魂的考验。",
  "你的大脑已经启动，情绪仍在维护中。",
  "这杯咖啡的层次，比公司审批流程少一点。",
  "别嫌它苦，至少它没有要求你对齐一下。",
  "咖啡因负责提神，成年人负责假装没事。",
  "喝完这杯，你会拥有短暂的生产力和长久的心慌。",
  "今天的你很像咖啡杯，外表完整，内部空了又满。",
  "这杯咖啡没有绩效目标，所以它比你自由。",
  "如果努力能换钱，你的咖啡杯早该退休了。",
  "喝咖啡是为了面对工作，工作是为了买下一杯咖啡。",
  "这杯的香气像新项目启动会，听起来很美，后面很累。",
  "你不是在内耗，你是在做无薪的心理加班。",
  "咖啡救不了拖延，但能让你更精神地拖延。",
  "这杯咖啡提醒你，周一不是一天，是一种状态。",
  "你的灵感没有枯竭，它只是拒绝为这个需求服务。",
  "咖啡入口的一秒，是今天最像生活的时刻。",
  "这杯下去，继续把崩溃折叠进待办清单。",
  "你以为今天会不一样，咖啡杯笑而不语。",
  "咖啡很懂你，所以它选择沉默地苦。",
  "这杯饮品可以加糖，职场现实不提供这个选项。",
  "喝完以后你会更像一个成年人：清醒，克制，不快乐。",
  "你的工作状态像冷掉的拿铁，还能喝，但不太体面。",
  "咖啡续命成功，人生修复失败。",
  "今天的你离财富自由，只差财富和自由。",
  "这杯咖啡的价格，提醒你上班也是一种消费。",
  "喝下去的是咖啡因，冒出来的是强装镇定。",
  "你不是不想努力，你是不想再努力给别人看。",
  "咖啡的苦是风味，工作的苦是默认配置。",
  "这杯让你醒了，但没有让你想通。",
  "你的日程像浓缩咖啡，量不大，但压强很高。",
  "喝咖啡前想躺平，喝咖啡后想坐着躺平。",
  "这杯咖啡是今天的存档点，虽然没有读档功能。",
  "别问今天过得怎么样，问就是还能扫码录入。",
  "咖啡没有解决方案，但它至少没有提出新问题。",
  "你今天的积极，主要来自咖啡和职业素养。",
  "这杯咖啡叫做暂时不辞职。",
  "喝完它，继续在群里做情绪稳定的成年人。",
  "你的心情像打包咖啡，表面封得很好，里面晃得厉害。",
  "咖啡让你醒着，生活让你想静音。",
  "这杯下肚，继续把不合理解释成挑战。",
  "你不是需要鼓励，你需要一个没有消息提醒的下午。",
  "咖啡杯见底了，待办事项还在繁殖。",
  "这杯咖啡的有效期，比领导的耐心还短。",
  "你今天的努力很明显，回报假装没看见。",
  "喝咖啡像打补丁，系统能跑，但问题还在。",
  "这杯是你的临时士气，过期时间是下个会前。",
  "职场没有奇迹，只有咖啡因和截止日期。",
  "你不是困在工作里，你是被工资条温柔挽留。",
  "这杯咖啡比大多数需求更有边界感。",
  "喝完以后，继续用一脸平静处理人类迷惑行为。",
  "你今天的脑子不是慢，是被同步会议占用了带宽。",
  "咖啡很苦，但至少没有让你写复盘。",
  "这杯饮品让你醒来，也让你看清没睡醒的人有多幸福。",
  "你和咖啡的关系很纯粹：它给清醒，你给钱。",
  "今日份职场体面，由咖啡因赞助播出。",
  "这杯咖啡的余味，像未读消息一样挥之不去。",
  "喝完以后，继续做一个看似稳定的高压容器。",
  "你不是在等下班，你是在等今天停止消耗你。",
  "咖啡的拉花会散，职场的锅会传。",
  "这杯咖啡让你短暂相信，自己还能再抢救一下。",
  "你今天的元气是借来的，明天记得还。",
  "喝咖啡前人很困，喝咖啡后心很慌，工作很满意。",
  "这杯的酸味像反馈意见，越品越不舒服。",
  "咖啡香气很治愈，前提是不打开电脑。",
  "你不是不爱工作，你只是更爱不用工作的自己。",
  "这杯咖啡像周报，存在感很强，实际价值看心情。",
  "喝完这杯，继续把疲惫伪装成专注。",
  "你今天的自控力，主要体现在没有当场关机。",
  "咖啡没有请你振作，它只是默默增加了心跳。",
  "这杯饮品的甜度可选，人生的难度不可调。",
  "你不是脆弱，只是长期运行在省电模式。",
  "喝咖啡是短暂回血，上班是持续扣血。",
  "这杯咖啡至少陪你加班，不像有些承诺只陪你画饼。",
  "今天的你表面在工作，内心在刷新退出按钮。",
  "咖啡因给了你速度，现实给了你阻力。",
  "这杯下去，继续做组织里那个会自动回复的人。",
  "你不是没热情，你的热情被审批流程冷却了。",
  "咖啡杯很小，放不下你对这个项目的全部质疑。",
  "这杯咖啡像绩效面谈，入口紧张，回味复杂。",
  "喝完以后，你会拥有更清晰的痛苦和更快的打字速度。",
  "今天也是把疲惫说成充实的一天。",
  "咖啡让人清醒，但清醒的人通常更想请假。",
  "这杯的回甘很短，像周末。",
  "你的职业规划像杯底咖啡渍，看得出来曾经很浓。",
  "喝咖啡不是仪式感，是成年人给自己的续航通知。",
  "这杯咖啡证明：你还没有放弃，只是放低了期待。",
  "醒来以后最残酷的事，是发现工作也醒了。",
  "你今天的沉默不是认可，是咖啡还没生效。",
  "咖啡在杯里旋转，你在项目里打转。",
  "这杯饮品让你继续在线，至于人生是否在线另说。",
  "喝完这杯，继续把离谱听成机会。",
  "你不是没有情绪，你只是学会了把情绪静音。",
  "咖啡是苦的，没关系，反正你很熟。",
  "这杯咖啡像老板的消息，出现得及时，压力也及时。",
  "今天的你很努力，钱包表示没有收到通知。",
  "喝咖啡是为了续命，不是为了热爱工位。",
  "这杯下去，至少你能更有精神地等待下班。",
  "你的耐心像冰块，正在杯子里逐渐消失。",
  "咖啡不会背叛你，它只会让你晚上睡不着。",
  "这杯咖啡把你从梦里拉出来，交给现实继续处理。",
  "你不是需要正能量，你需要少一点工作量。",
  "喝下这杯，继续把荒谬包装成协作。",
  "今天的职场关键词：表面积极，内部告急。",
  "咖啡能醒脑，不能醒悟预算不够还要做完的事实。",
  "这杯饮品很职业，苦得很有分寸。",
  "你今天的灵魂状态：已读，不回。",
  "喝完以后，你会更像自己，也更像打工人。",
  "这杯咖啡告诉你，清醒本身就是一种代价。",
  "每一口都在提醒你：你不是缺咖啡，是缺假期。",
  "咖啡喝完了，成年人模式自动续订。",
  "今天的你没有崩，是因为咖啡杯还没空。",
  "这杯饮品没有 KPI，但完成度比你高。",
  "喝下去的是提神，留下来的是想静静。",
  "你不是在上班，你是在把人生切成一个个会议块。",
  "咖啡负责叫醒你，现实负责让你后悔醒来。",
  "这杯下肚，继续假装消息提示音不是命运敲门。",
  "你的职业素养，是把想下班说成我再看看。",
  "咖啡的香味很短暂，工作群的存在很漫长。",
  "这杯咖啡像你的人生建议：先苦着，回甘随缘。",
  "喝完以后，继续在忙碌里寻找一点自我安慰。",
  "你今天没有摆烂，只是执行力暂时离线。",
  "咖啡能让你快一点，但不能让世界讲道理。",
  "这杯是成年人的魔法药水，副作用是更清楚地知道自己累。",
  "你不是在收集咖啡，你是在收集还没倒下的证据。",
];

export function getCaffeine(coffeeType: string, volumeMl: number) {
  return Math.round(((caffeinePer100ml[coffeeType] ?? 30) * volumeMl) / 100);
}

export function getRandomToxicQuote(seed = Date.now()) {
  return toxicQuotes[Math.abs(seed) % toxicQuotes.length];
}
