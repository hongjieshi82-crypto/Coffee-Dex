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
];

export function getCaffeine(coffeeType: string, volumeMl: number) {
  return Math.round(((caffeinePer100ml[coffeeType] ?? 30) * volumeMl) / 100);
}

export function getRandomToxicQuote(seed = Date.now()) {
  return toxicQuotes[Math.abs(seed) % toxicQuotes.length];
}
