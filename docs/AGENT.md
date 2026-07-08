# Coffee-Dex Agent Handoff Document

## 1. 文档目的

这份文档给后续接手 Coffee-Dex 的开发 Agent、协作 Agent 或人类开发者使用。它描述当前项目状态、关键文件、运行方式、部署方式、容易踩坑的位置，以及后续任务执行准则。

## 2. 项目当前状态

当前 Coffee-Dex 是一个 Next.js + Supabase 的云端多人 Web 应用。

最近完成的关键节点：

- `2237946 Wire Supabase multi-user auth`
  - 接入 Supabase 多用户登录。
  - API 根据 bearer token 隔离用户记录。
  - Vercel 环境变量接通后线上 `authEnabled=true`。
- `084c6d6 Improve Supabase signup verification flow`
  - 注册流程支持验证码输入态。
  - 支持注册成功直接登录。
  - 支持验证码重发和换邮箱。
  - 登录/注册异常兜底更稳。

当前工作区应保持干净；如有改动，先运行：

```bash
git status --short
```

## 3. 本地运行

安装依赖：

```bash
npm install
```

开发模式：

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

检查：

```bash
npm run lint
npm run build
```

## 4. 环境变量

### 4.1 必需变量

Supabase 多用户模式需要：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=coffee-photos
```

AI 识别需要：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_VISION_MODEL=gpt-4o-mini
```

当前 README 示例里使用过：

```bash
OPENAI_VISION_MODEL=Qwen/Qwen3-VL-8B-Instruct
```

这是 OpenAI-compatible provider 下可配置的视觉模型名，不要求固定。

### 4.2 安全要求

绝不能提交：

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- 真实 `.env.local`

可以公开：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 或新版 `Publishable key`

## 5. 架构概览

### 5.1 前端

- 框架：Next.js App Router。
- UI：React + Tailwind CSS + 自定义 CSS。
- 图标：lucide-react。
- 动画：局部使用 CSS animation 和 framer-motion 组件。

关键页面：

- `app/page.tsx`
  - PC 端首页。
  - 图鉴、统计、日志、二维码。
- `app/mobile/page.tsx`
  - 手机端录入。
  - 图片上传、AI 识别、提交记录。
- `app/AuthGate.tsx`
  - 登录/注册/验证码输入。

### 5.2 后端 API

- `app/api/auth/config/route.ts`
  - 返回 Supabase 是否配置完整。
- `app/api/records/route.ts`
  - `GET`: 获取当前用户记录。
  - `POST`: 创建记录。
  - `DELETE`: 删除某条或清空记录。
- `app/api/recognize/route.ts`
  - 调用 OpenAI-compatible Vision API 判断图片是否为饮品。
- `app/api/network/route.ts`
  - 生成手机端入口 URL。

### 5.3 数据层

- `record-store.ts`
  - 本地 JSON fallback。
- `supabase-record-store.ts`
  - Supabase 读写、图片上传、删除 storage 对象。
- `supabase-server.ts`
  - 服务端 admin client。
  - bearer token 校验。
- `supabase-browser.ts`
  - 浏览器 Supabase client。

### 5.4 产品数据

- `coffee-data.ts`
  - 咖啡分类。
  - 搜索别名。
  - 咖啡因估算。
  - 固定 AI 评语。
  - 毒鸡汤文案库。

## 6. Supabase 设置

### 6.1 SQL

在 Supabase SQL Editor 执行：

```text
coffee-dex-supabase-schema.sql
```

会创建：

- `public.coffee_records`
- 索引
- RLS policies
- `coffee-photos` storage bucket
- storage object policies

### 6.2 Auth

Email provider 必须启用。

注册体验有两种路径：

1. 关闭邮箱确认：
   - 注册后直接登录。
   - 最简单，适合早期测试。
2. 开启邮箱确认：
   - 用户注册后进入验证码输入态。
   - 如果 Supabase 邮件模板可编辑，需要邮件正文包含 `{{ .Token }}`。
   - 如果不能编辑模板，用户可点击默认确认链接。

当前 Supabase 新界面提示默认模板编辑需要 custom SMTP，若没有配置 SMTP，建议早期先关闭邮箱确认。

## 7. Vercel 部署

### 7.1 环境变量

Vercel Project -> Environment Variables 添加：

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_VISION_MODEL
```

修改环境变量后必须重新部署。

### 7.2 部署验证

公开配置接口：

```bash
curl https://coffee-dex.vercel.app/api/auth/config
```

期望：

```json
{"authEnabled":true,"clientConfigured":true,"serverConfigured":true}
```

未登录记录接口：

```bash
curl -i https://coffee-dex.vercel.app/api/records
```

期望：

```text
401
```

这说明鉴权已经启用。

## 8. 已知坑

### 8.1 Supabase URL 不能带路径

错误示例：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co/rest/v1/
```

正确示例：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

如果填错，前端注册会报：

```text
Invalid path specified in request URL
```

### 8.2 Service role 只能服务端用

不要在浏览器 bundle 中引用：

```bash
SUPABASE_SERVICE_ROLE_KEY
```

只能在 API route 或 server helper 中使用。

### 8.3 Next dev 会改变 `next-env.d.ts`

Next.js dev/build 可能切换类型路径。最终提交前运行：

```bash
npm run build
git diff -- next-env.d.ts
```

确保没有无意义 diff。

### 8.4 AI 识别失败不能阻塞录入

`app/api/recognize/route.ts` 设计为：

- AI 可用：返回识别结果。
- AI 不可用、超时、报错：返回 `provider: "manual"`。
- 前端允许用户人工确认后继续。

不要把 AI 失败改成硬失败。

## 9. Agent 工作准则

### 9.1 修改前

先查看：

```bash
git status --short
rg -n "相关关键词"
```

不要覆盖用户未提交改动。

### 9.2 修改中

优先保持现有模式：

- API route 用 `NextResponse`。
- 记录类型用 `CoffeeRecord`。
- Supabase 逻辑保持在 `supabase-*` 文件。
- 前端 auth 逻辑集中在 `use-coffee-auth.ts` 和 `AuthGate.tsx`。
- 手机端录入逻辑集中在 `app/mobile/page.tsx`。

### 9.3 修改后

至少运行：

```bash
npm run lint
npm run build
```

涉及线上配置时，再测：

```bash
curl https://coffee-dex.vercel.app/api/auth/config
```

### 9.4 提交规范

提交信息使用英文祈使句或简洁描述：

```text
Improve Supabase signup verification flow
Wire Supabase multi-user auth
```

推送后等待 Vercel 自动部署，并确认线上行为。

## 10. 推荐后续 Agent 任务

### 任务 1：注册体验最终定稿

目标：

- 确认到底采用“注册直接登录”还是“邮箱验证码确认”。

验收：

- 新邮箱注册流程不需要用户重复输入账号密码。
- 页面提示与 Supabase 实际邮件内容一致。

### 任务 2：完整线上 E2E 冒烟

目标：

- 用新账号完成注册、手机录入、PC 查看、删除。

验收：

- Supabase `coffee_records` 出现当前用户记录。
- Storage 有图片对象。
- PC 和手机数据一致。

### 任务 3：Realtime 同步

目标：

- 用 Supabase Realtime 替换或补强 PC 轮询刷新。

验收：

- 手机提交后 PC 无需等待轮询即可出现新记录。

### 任务 4：AI 识别升级

目标：

- 从“是否饮品”扩展到“建议咖啡类型”。

验收：

- AI 返回候选类别。
- 前端只做建议，不强制选择。
- 失败时仍可手动录入。
