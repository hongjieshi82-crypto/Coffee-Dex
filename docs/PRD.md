# Coffee-Dex Product Requirements Document

## 1. 产品概述

Coffee-Dex 是一个面向打工人的游戏化咖啡记录与图鉴产品。用户通过手机上传咖啡照片、选择咖啡类型、填写容量和标签，系统生成咖啡因记录、毒鸡汤文案和图鉴进度；PC 端用于浏览、复盘和展示完整咖啡图鉴。

产品语气是“职场苦中作乐”：用咖啡因、打工人、毒鸡汤和收集图鉴形成轻量但有记忆点的使用体验。

## 2. 当前阶段

当前项目已经完成从单机版本到云端多人版本的关键升级：

- Next.js Web 应用已上线到 Vercel。
- Supabase Auth 已接入邮箱密码登录。
- Supabase PostgreSQL 已承载多用户记录。
- Supabase Storage 已用于咖啡照片存储。
- 手机端支持拍照/上传、AI 饮品识别、咖啡分类录入。
- PC 端支持图鉴浏览、统计、日志、详情、删除。
- 未配置 Supabase 时可自动降级为本地 JSON 测试模式。
- 注册流程已支持“注册后直接登录”或“邮箱验证码/确认链接验证后自动登录”的体验。

## 3. 目标用户

### 核心用户

- 每天喝咖啡、奶茶或替代饮的人。
- 喜欢收集、打卡、进度条和轻游戏化反馈的人。
- 对“职场自嘲”“毒鸡汤”“咖啡续命”风格有共鸣的年轻办公人群。

### 使用场景

- 买完咖啡后，用手机拍照录入。
- 下班或摸鱼时，在 PC 查看本周/本月喝了多少咖啡。
- 和朋友分享自己的咖啡因消耗和图鉴完成度。
- 跨设备同步自己的咖啡记录。

## 4. 产品定位

Coffee-Dex 不是严肃健康管理工具，而是一个带有轻娱乐属性的咖啡生活记录工具。

核心差异点：

- 用“图鉴收集”替代普通列表记账。
- 用“AI 饮品识别 + 手动确认”降低录入失败成本。
- 用“毒鸡汤 + AI 评语”形成情绪反馈。
- 手机端录入，PC 端展示和复盘。

## 5. 核心价值

- 降低记录咖啡的门槛。
- 给重复喝咖啡这件事增加收集感。
- 让用户看到自己的咖啡因摄入、频率和偏好。
- 用幽默文案增强每次录入后的即时反馈。
- 多端同步，避免本地数据丢失。

## 6. 功能范围

### 6.1 账号系统

当前状态：已实现。

能力：

- 邮箱 + 密码注册。
- 邮箱 + 密码登录。
- 登出。
- 登录状态持久化。
- 登录失效后清理旧数据并回到登录页。
- 支持 Supabase 邮箱确认：
  - 如果关闭 Confirm email，注册后直接登录。
  - 如果开启 Confirm email，注册后进入验证码状态。
  - 如果邮件模板无法显示验证码，用户仍可通过确认链接完成登录。

关键文件：

- `use-coffee-auth.ts`
- `app/AuthGate.tsx`
- `app/api/auth/config/route.ts`
- `supabase-browser.ts`
- `supabase-server.ts`

### 6.2 手机端录入

当前状态：已实现。

路径：

- `/mobile`

能力：

- 上传或拍摄咖啡照片。
- 压缩图片为 JPEG data URL。
- 调用 AI 判断图片是否像饮品。
- AI 失败时进入人工确认模式。
- 搜索咖啡名称。
- 选择咖啡大类和子类。
- 选择温度标签。
- 选择糖度标签。
- 输入或快捷选择容量。
- 提交后生成记录和毒鸡汤反馈卡。
- 手机端可查看图鉴首页和分类详情。

关键文件：

- `app/mobile/page.tsx`
- `app/api/recognize/route.ts`
- `app/api/records/route.ts`
- `coffee-data.ts`

### 6.3 PC 端图鉴

当前状态：已实现。

路径：

- `/`

能力：

- 大屏查看咖啡分类图鉴。
- 查看每个分类下的历史记录。
- 按子类筛选。
- 按全部/本周/本月/本年筛选。
- 查看总咖啡因、本周杯数、本月杯数。
- 查看咖啡日志时间线。
- 查看记录详情。
- 删除记录。
- 展示手机端入口二维码。
- 小屏自动跳转 `/mobile`。

关键文件：

- `app/page.tsx`
- `app/ConnectionPanel.tsx`
- `app/globals.css`

### 6.4 咖啡图鉴数据

当前状态：已实现。

分类规模：

- 6 大类。
- 38 个子类。

大类：

- 意式经典
- 奶咖甜咖
- 手冲精品
- 冷萃冰咖
- 特调创意
- 非咖啡替代饮

数据能力：

- 咖啡类型映射。
- 搜索别名。
- 咖啡因估算。
- 每类固定 AI 评语。
- 随机毒鸡汤文案。

关键文件：

- `coffee-data.ts`

### 6.5 云端同步

当前状态：已实现。

数据存储：

- Supabase PostgreSQL 表：`coffee_records`
- Supabase Storage bucket：`coffee-photos`

隔离方式：

- 每条记录绑定 `user_id`。
- API 服务端通过 bearer token 获取当前 Supabase 用户。
- 用户只能读取、创建、删除自己的记录。
- 数据库 RLS 策略已在 schema 中定义。

关键文件：

- `coffee-dex-supabase-schema.sql`
- `supabase-record-store.ts`
- `supabase-server.ts`
- `app/api/records/route.ts`

## 7. 用户流程

### 7.1 首次注册流程

1. 用户打开线上站点。
2. 系统检查 Supabase 配置。
3. 如果启用云端登录，展示登录/注册页。
4. 用户输入邮箱和密码。
5. 注册提交。
6. 如果 Supabase 返回 session，用户直接进入图鉴。
7. 如果需要邮箱确认，页面进入验证码输入态。
8. 用户输入验证码或点击邮件确认链接。
9. 验证成功后自动进入图鉴。

### 7.2 手机录入流程

1. 用户打开 `/mobile`。
2. 上传咖啡照片。
3. 系统压缩图片并调用 AI 识别。
4. AI 判断为饮品后继续录入。
5. 如果 AI 不确定，用户可人工确认。
6. 用户搜索或手动选择咖啡类型。
7. 用户选择温度、糖度、容量。
8. 用户提交记录。
9. 系统生成咖啡因数值、AI 评语和毒鸡汤。
10. 记录同步到 Supabase。

### 7.3 PC 查看流程

1. 用户打开 PC 首页。
2. 查看总咖啡因、本周杯数、本月杯数。
3. 点击某个分类。
4. 查看该分类下历史记录。
5. 可打开详情、删除记录或进入日志。

## 8. 当前数据模型

### CoffeeRecord

字段：

- `id`: 记录 ID。
- `coffeeType`: 咖啡子类 ID。
- `coffeeName`: 展示名称。
- `categoryId`: 大类 ID。
- `volumeMl`: 容量。
- `imageData`: 图片 data URL 或 Supabase public URL。
- `caffeine`: 咖啡因估算值。
- `temp`: 温度标签。
- `sugar`: 糖度标签。
- `aiComment`: 类型对应评语。
- `toxicQuote`: 随机毒鸡汤。
- `timestamp`: 记录时间。

### Supabase 表

表名：

- `public.coffee_records`

关键字段：

- `id`
- `user_id`
- `coffee_type`
- `coffee_name`
- `category_id`
- `volume_ml`
- `image_url`
- `image_path`
- `caffeine`
- `temp`
- `sugar`
- `ai_comment`
- `toxic_quote`
- `timestamp`

## 9. 非功能需求

### 9.1 兼容性

- PC 和移动端均可使用。
- 手机访问 `/` 自动进入 `/mobile`。
- 未配置 Supabase 时可本地运行。

### 9.2 性能

- 手机上传图片会压缩到最大宽度 720px。
- AI 识别请求前端设有超时。
- PC 端通过轮询刷新记录。

### 9.3 安全

- `SUPABASE_SERVICE_ROLE_KEY` 仅服务端使用。
- `OPENAI_API_KEY` 仅服务端使用。
- 用户记录通过 Supabase Auth token 区分。
- Storage 路径按用户 ID 分区。
- 不在前端暴露 service role 或 OpenAI key。

### 9.4 可用性

- AI 不可用时允许人工确认。
- Supabase 未配置时降级到本地 JSON。
- 登录失效时清空旧记录并回登录页。

## 10. 当前限制

- 邮箱验证码是否能出现在邮件里，取决于 Supabase 邮件模板能力；默认模板可能只有确认链接。
- PC 端实时同步目前依赖轮询，不是 Supabase Realtime。
- 咖啡因值是估算，不适合作为医疗健康建议。
- AI 只做饮品图片审核，不自动判定具体咖啡品类。
- 单独的 `coffee-dex.html` 版本仍存在，但云端多人主线在 Next.js 版本。

## 11. 后续优先级

### P0

- 确认 Supabase 注册体验最终策略：
  - 关闭邮箱确认，注册后直接登录。
  - 或配置自定义 SMTP，让验证码出现在邮件正文。
- 线上完整测试：
  - 新邮箱注册。
  - 登录。
  - 手机录入。
  - PC 查看同步。
  - 删除记录。

### P1

- 增加用户个人数据导出。
- 增加记录编辑能力。
- 增加更明确的空状态和错误提示。
- 将 PC 轮询替换或增强为 Supabase Realtime。

### P2

- 自动识别咖啡类型。
- 咖啡因趋势图。
- 月度报告。
- 分享卡片。
- 更多徽章和成就。
