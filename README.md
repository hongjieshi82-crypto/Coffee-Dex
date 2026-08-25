# Coffee-Dex

## 打工人咖啡因图鉴

> 每一杯咖啡，都是你向生活妥协的证据。

**在线体验：** [coffee-dex.vercel.app](https://coffee-dex.vercel.app)

---

## 关于

Coffee-Dex 是一个面向打工人的游戏化咖啡记录与图鉴产品。手机端负责拍照、AI 饮品识别和快速录入，PC 端负责浏览日历、复盘数据和回看咖啡图鉴。

每次完成记录后，系统会从 3,127 条静态职场冷幽默文案中选取一条作为即时反馈。运行时外部 AI 仅用于识别用户主动上传的饮品照片；毒鸡汤和“AI 风格评语”均来自本地静态内容库，不会实时调用模型生成。

## 功能

**图鉴系统**
- 8 大类、76 个饮品子类，覆盖咖啡、奶茶、果茶和非咖啡替代饮
- 覆盖意式经典、奶咖甜咖、手冲精品、冷萃冰咖、特调创意、奶茶鲜奶、果茶清爽、非咖啡替代饮
- 以抠图贴纸、日历和数量角标呈现收集进度

**AI 饮品识别**
- 用户拍照或选图后，由视觉模型判断图片中是否包含饮品，并尽量给出中文饮品名称
- 单次请求超时 12 秒，可恢复错误会自动重试 1 次
- 未配置模型、超时、限流或解析失败时均可切换为人工确认，AI 不会卡住录入流程

**毒鸡汤语录**
- 127 条人工整理文案 + 3,000 条按主题组合并通过数量、去重校验的文案，共 3,127 条
- 创建记录时按 seed 选取并保存到记录中，结果卡支持“换一句”
- 文案是静态内容库，不属于运行时生成式 AI 能力

**固定风格评语**
- 76 条与饮品子类对应的预设评语
- 用于记录卡、详情页和报告展示
- 同样为静态内容，不会调用外部模型

**双端适配**
- 手机端：拍照 / 相册上传、识别确认、标签填写、结果卡反馈和月历回看
- PC 端：咖啡因概览、月历图鉴、日期下钻、记录详情和扫码授权
- 手机访问根路径会自动进入 `/mobile`

**云端同步**
- Supabase 后端（PostgreSQL + Auth）
- 邮箱密码登录与邮箱验证码确认
- PC 端生成 3 分钟有效的扫码授权，手机可免重复登录接入同一账号
- 手机 / PC 数据互通；PC 端当前通过 1.5 秒轮询刷新记录
- 未配置 Supabase 时自动使用本地测试模式

## 快速开始

### 方式一：在线体验

直接访问 [https://coffee-dex.vercel.app](https://coffee-dex.vercel.app)。

### 方式二：运行 Next.js 版本（推荐）

需要 Node.js 22 或兼容版本：

```bash
git clone https://github.com/hongjieshi82-crypto/Coffee-Dex.git
cd Coffee-Dex
npm install
npm run dev
```

访问 `http://localhost:3000`。

### 方式三：打开旧版 HTML 预览

仓库仍保留早期独立 HTML 原型，仅用于查看历史版本，不代表当前线上功能：

1. 克隆仓库
   ```bash
   git clone https://github.com/hongjieshi82-crypto/Coffee-Dex.git
   cd Coffee-Dex
   ```

2. 用浏览器打开
   ```bash
   open coffee-dex.html
   ```

## 文件结构

```
Coffee-Dex/
├── app/
│   ├── page.tsx                     # PC 概览、日历与图鉴
│   ├── mobile/page.tsx              # 手机拍照与录入流程
│   ├── mobile/sticker-worker.ts     # 后台贴纸处理 Worker
│   ├── api/recognize/route.ts       # AI 饮品识别与降级
│   ├── api/records/route.ts         # 记录读取、创建与更新
│   └── api/auth/qr/route.ts         # 3 分钟扫码授权
├── coffee-data.ts                   # 饮品数据、76 条固定评语与人工文案
├── toxic-quote-pool.ts              # 3,000 条质量校验主题文案生成器
├── qr-auth.ts                       # 扫码票据签名与有效期校验
├── supabase-*.ts                    # Supabase 登录与数据访问
├── coffee-dex-supabase-schema.sql   # 数据库结构
├── docs/                            # PRD、AI Usage 与 Agent 交接文档
├── public/                          # PWA、品牌、模型和第三方许可资源
├── coffee-dex.html                  # 早期独立 HTML 原型
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

- **前端**：Next.js 16、React 19、TypeScript、Tailwind CSS、Framer Motion
- **AI 识别**：OpenAI-compatible Chat Completions，多模态 `image_url` 输入
- **后端**：Supabase（PostgreSQL、Auth、Storage、RLS）
- **贴纸处理**：`@imgly/background-removal` + Web Worker
- **PWA**：Web App Manifest + Service Worker

## 第三方许可

浏览器端贴纸抠图使用 `@imgly/background-removal@1.7.0`，该组件采用 GNU AGPL v3 许可。完整许可证、第三方依赖清单和上游源码地址随应用发布在 `public/legal/`，线上页脚也提供了访问入口。

## 数据库设置

如果需要云端同步功能，在 Supabase 中执行 `coffee-dex-supabase-schema.sql` 创建数据表。

## 多人上线部署

当前 Next.js 版本支持两种模式：

- 未配置 Supabase：使用本地 `data/coffee-records.json`，适合本机测试。
- 已配置 Supabase：启用邮箱密码登录，每个用户只看到自己的咖啡记录，照片上传到 Supabase Storage。

启用多人登录需要同时配置下面 3 个 Supabase 变量，少任何一个都会自动退回本地测试模式：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 1. 创建 Supabase 项目

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，执行 `coffee-dex-supabase-schema.sql`。
3. 在 Project Settings 中复制：
   - Project URL
   - anon public key
   - service_role key
4. 在 Authentication -> Providers -> Email 中确认 Email 登录已启用。
   - 如果想让用户注册后立刻登录，可以关闭 Confirm email。
   - 如果开启 Confirm email，注册后会进入邮箱验证码页面；验证成功后自动登录。
5. 如果开启邮箱确认，打开 Authentication -> Emails -> Confirm signup，把邮件正文里加上验证码变量 `{{ .Token }}`，例如：
   ```text
   你的 Coffee-Dex 验证码是：{{ .Token }}
   ```
   也可以保留默认确认链接，用户点链接同样会回到站点完成确认。

### 2. 配置环境变量

本地 `.env.local` 或 Vercel Environment Variables 中配置：

```bash
OPENAI_API_KEY=你的 AI Key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_RECOGNITION_TIMEOUT_MS=12000

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=coffee-photos
```

`SUPABASE_SERVICE_ROLE_KEY` 和 `OPENAI_API_KEY` 只能放在服务端环境变量里，不能写进前端代码。

多人登录开启后，用户登录状态由 Supabase Auth 管理；接口会根据当前登录用户的 token 读取和保存记录，不同账号之间的数据互相隔离。

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
