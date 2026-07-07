# Coffee-Dex

## 打工人咖啡因图鉴

> 每一杯咖啡，都是你向生活妥协的证据。

---

## 关于

Coffee-Dex 是一个游戏化的咖啡图鉴 Web 应用，专为打工人生存场景设计。

记录你喝过的每一杯咖啡，收集 859 条职场毒鸡汤语录，用毒舌 AI 评价你的咖啡选择。

## 功能

**图鉴系统**
- 6 大咖啡分类，38 个子分类
- 覆盖意式经典、奶咖甜咖、手冲精品、冷萃冰咖、特调创意、非咖啡替代饮
- 游戏化收集打卡，进度追踪

**毒鸡汤语录**
- 859 条原创职场毒鸡汤
- 每一条都是对打工生活的灵魂拷问
- 每次打开随机展示，绝不重复

**双端适配**
- 手机端：拿铁暖光风格，玻璃拟态设计
- PC 端：暗色霓虹风格，赛博朋克质感

**云端同步**
- Supabase 后端（PostgreSQL + Auth）
- 邮箱 + 密码登录
- 手机 / PC 数据互通

## 快速开始

### 方式一：直接打开 HTML（推荐）

最简单的方式，无需安装任何依赖：

1. 克隆仓库
   ```bash
   git clone https://github.com/hongjieshi82-crypto/Coffee-Dex.git
   cd Coffee-Dex
   ```

2. 用浏览器打开
   ```bash
   open coffee-dex.html
   ```

### 方式二：运行 Next.js 版本

需要 Node.js 环境：

```bash
git clone https://github.com/hongjieshi82-crypto/Coffee-Dex.git
cd Coffee-Dex
npm install
npm run dev
```

访问 `http://localhost:3000`

## 文件结构

```
Coffee-Dex/
├── coffee-dex.html              # 独立 HTML 版本（直接浏览器打开）
├── coffee-dex-supabase-schema.sql  # Supabase 数据库结构
├── app/                         # Next.js 组件
│   ├── page.tsx                 # 主页面
│   ├── layout.tsx               # 布局组件
│   ├── globals.css              # 全局样式
│   ├── CoffeeCard.tsx           # 咖啡卡片
│   ├── CoffeeGallery.tsx        # 图鉴画廊
│   ├── ConnectionPanel.tsx      # 连接面板
│   ├── LoadingOverlay.tsx       # 加载遮罩
│   └── StatusBar.tsx            # 状态栏
├── mock-data.ts                 # 模拟数据
├── utils.ts                     # 工具函数
├── package.json                 # Next.js 依赖
├── next.config.ts               # Next.js 配置
├── tsconfig.json                # TypeScript 配置
└── README.md
```

## 咖啡分类

**意式经典** Espresso Base
- Espresso、美式、拿铁、卡布奇诺、澳白、可塔朵、玛奇朵、精萃

**奶咖甜咖** Milk & Sweet
- 香草拿铁、焦糖玛奇朵、摩卡、榛果拿铁、阿芙佳朵、桂花拿铁、生椰拿铁

**手冲精品** Filter Coffee
- 耶加雪菲、哥伦比亚、肯尼亚、巴拿马瑰夏、曼特宁、巴西

**冷萃冰咖** Cold Coffee
- 冰美式、冷萃、氮气咖啡、冰拿铁、星冰乐、冻柠咖啡

**特调创意** Signature & Trend
- Dirty、椰子水咖啡、橙子美式、酒香咖啡、燕麦拿铁、气泡美式、话梅美式

**非咖啡替代饮** Coffee Alternatives
- 抹茶拿铁、可可、红茶拿铁、草本饮品、印度奶茶、伯爵茶

## 毒鸡汤语录示例

> 这杯咖啡的苦涩，远不及你周一早会的表情。

> 你以为喝的是美式？不，你喝的是加班的燃料。

> 打工人的血液里，70%是咖啡，30%是委屈。

> 咖啡续命，deadline催魂，今天的你依然是最强打工人。

> 别问为什么这么苦，看看你的工资条。

## 技术栈

- **前端**：HTML5 + CSS3 + Vanilla JavaScript / Next.js 15 + TypeScript
- **后端**：Supabase（PostgreSQL + Auth）
- **样式**：玻璃拟态 + 响应式设计

## 数据库设置

如果需要云端同步功能，在 Supabase 中执行 `coffee-dex-supabase-schema.sql` 创建数据表。

## 多人上线部署

当前 Next.js 版本支持两种模式：

- 未配置 Supabase：使用本地 `data/coffee-records.json`，适合本机测试。
- 已配置 Supabase：启用邮箱密码登录，每个用户只看到自己的咖啡记录，照片上传到 Supabase Storage。

### 1. 创建 Supabase 项目

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，执行 `coffee-dex-supabase-schema.sql`。
3. 在 Project Settings 中复制：
   - Project URL
   - anon public key
   - service_role key

### 2. 配置环境变量

本地 `.env.local` 或 Vercel Environment Variables 中配置：

```bash
OPENAI_API_KEY=你的 AI Key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_VISION_MODEL=Qwen/Qwen3-VL-8B-Instruct

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=coffee-photos
```

`SUPABASE_SERVICE_ROLE_KEY` 和 `OPENAI_API_KEY` 只能放在服务端环境变量里，不能写进前端代码。

### 3. 部署到 Vercel

1. 把代码推到 GitHub。
2. 在 Vercel 导入这个 GitHub 仓库。
3. 填入上面的环境变量。
4. 部署完成后，电脑和手机都打开同一个域名；手机访问 `/` 会自动进入 `/mobile`。

## 贡献

欢迎提交 Issue 和 Pull Request。

特别是：
- 更多毒鸡汤语录
- 新的咖啡分类
- UI/UX 改进建议
- Bug 修复

## License

MIT

---

**Made with coffee by a sleep-deprived developer**
