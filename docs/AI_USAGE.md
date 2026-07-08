# Coffee-Dex AI Usage Document

## 1. 文档目的

这份文档说明 Coffee-Dex 当前实际使用了哪些 AI 能力、AI 在产品中的边界、调用路径、降级策略和后续可扩展方向。

## 2. 当前运行时 AI 能力

Coffee-Dex 当前运行时真正调用外部 AI 的地方只有一个：

- 手机端上传图片后，调用视觉模型判断图片是否包含饮品。

相关文件：

- `app/mobile/page.tsx`
- `app/api/recognize/route.ts`

## 3. AI 饮品识别

### 3.1 触发时机

用户在手机端上传或拍摄咖啡照片后触发：

```text
/mobile -> handlePhoto -> compressImage -> recognizeImage -> /api/recognize
```

### 3.2 输入

前端将图片压缩为 JPEG data URL。

压缩策略：

- 最大宽度：720px。
- 输出格式：JPEG。
- 质量：0.62。

输入到 API：

```json
{
  "imageData": "data:image/jpeg;base64,..."
}
```

### 3.3 模型调用

服务端 API：

```text
POST /api/recognize
```

模型接口：

```text
OpenAI-compatible chat/completions
```

默认配置：

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_VISION_MODEL=gpt-4o-mini
```

README 示例中过：

```bash
OPENAI_VISION_MODEL=Qwen/Qwen3-VL-8B-Instruct
```

说明：

- 只要服务提供 OpenAI-compatible Chat Completions，并支持 image_url 输入，就可以替换模型。
- 模型名由环境变量控制。
- API key 只在服务端使用。

### 3.4 Prompt

当前 prompt 角色：

```text
Coffee-Dex 的饮品照片审核器
```

目标：

- 判断图片里是否有真实可饮用饮品或杯具。
- 允许咖啡杯、纸杯、马克杯、玻璃杯、瓶装饮料、奶茶杯、茶杯。
- 排除菜单、截图、桌面、键盘、人物、空杯包装或没有饮品。
- 不识别人脸、身份、地点等隐私信息。
- 只返回 JSON。
- 输出字段必须使用简体中文。

### 3.5 输出结构

```ts
interface RecognitionResult {
  isDrink: boolean;
  confidence: number;
  vessel: string | null;
  drinkType: string | null;
  reason: string;
  provider: "openai" | "manual";
  allowManualConfirm: boolean;
}
```

示例：

```json
{
  "isDrink": true,
  "confidence": 0.86,
  "vessel": "纸杯",
  "drinkType": "咖啡",
  "reason": "照片中有一杯咖啡饮品。",
  "provider": "openai",
  "allowManualConfirm": true
}
```

## 4. AI 降级策略

AI 识别不能成为录入流程的单点失败。

以下情况都会降级到人工确认：

- 未配置 `OPENAI_API_KEY`。
- 模型接口超时。
- 模型接口返回非 2xx。
- JSON 解析失败或异常。
- 网络错误。

降级返回：

```json
{
  "isDrink": true,
  "confidence": 0,
  "vessel": null,
  "drinkType": null,
  "reason": "AI 识别暂时不可用，已切换为人工确认。",
  "provider": "manual",
  "allowManualConfirm": true
}
```

产品原则：

- AI 是辅助审核，不是准入门槛。
- AI 不可用时，用户仍然可以手动确认并继续录入。

## 5. 当前非外部 AI 文案

Coffee-Dex 中还有一些“AI 风格”内容，但不是运行时调用模型生成。

### 5.1 固定 AI 评语

文件：

```text
coffee-data.ts
```

字段：

```ts
aiComments: Record<string, string>
```

用途：

- 每种咖啡类型对应一句预设评语。
- 创建记录时写入 `aiComment`。
- 展示在记录卡、详情页和报告弹层。

说明：

- 这些文案是静态数据，不会调用外部模型。
- 适合保持风格一致、成本可控、响应稳定。

### 5.2 毒鸡汤文案

文件：

```text
coffee-data.ts
```

字段：

```ts
toxicQuotes: string[]
```

用途：

- 创建记录时按时间戳 seed 选取。
- 每条记录保存一条 `toxicQuote`。

说明：

- 当前 README 描述为 859 条职场毒鸡汤。
- 也是静态文案库，不会运行时调用 AI。

## 6. 开发过程中的 AI

本项目开发过程中使用过 Codex 作为代码协作 Agent，协助完成：

- 代码阅读与改造。
- Supabase 多用户登录接入。
- Vercel 环境变量排错。
- 注册体验优化。
- 文档反推。

这属于开发过程工具，不属于 Coffee-Dex 产品运行时能力。

产品上线后，用户实际接触到的 AI 只有：

- 图片饮品识别。
- 静态“AI 评语”风格文案。

## 7. 隐私与安全

### 7.1 图片处理

- 图片由用户主动上传。
- 前端先压缩。
- AI 识别只判断是否饮品。
- Prompt 明确要求不识别人脸、身份、地点等隐私信息。

### 7.2 API Key

禁止前端暴露：

- `OPENAI_API_KEY`

服务端调用位置：

```text
app/api/recognize/route.ts
```

### 7.3 数据保存

上传图片最终可能保存到：

```text
Supabase Storage / coffee-photos
```

记录数据保存到：

```text
public.coffee_records
```

每条记录按 Supabase Auth 用户隔离。

## 8. 成本控制

当前成本控制方式：

- 图片压缩后再传给模型。
- `detail: "low"`。
- 服务端 6 秒超时。
- `max_completion_tokens: 220`。
- AI 失败直接降级，不重复重试。

## 9. 质量控制

服务端对模型输出做处理：

- 尝试 JSON parse。
- 如果响应中混入文本，截取 `{}` 范围再 parse。
- confidence 限制到 0-1。
- 英文短语映射为中文。
- 无法识别时使用中文 fallback。

相关函数：

- `parseRecognitionJson`
- `clampConfidence`
- `toChineseRecognitionText`

## 10. 后续 AI 扩展方向

### 10.1 自动推荐咖啡类型

当前 AI 只判断是否饮品。后续可以让 AI 返回：

```json
{
  "suggestedCoffeeTypes": ["latte", "americano"],
  "reason": "看起来像一杯奶咖"
}
```

前端原则：

- 只做建议，不强制。
- 用户仍可手动选择。

### 10.2 个性化咖啡报告

可按用户月度记录生成：

- 本月最常喝类型。
- 咖啡因总量。
- 打工人风格总结。
- 下月建议。

注意：

- 这会涉及更多个人数据进入模型，需要明确告知用户。

### 10.3 OCR 小票/菜单识别

可识别杯身标签、小票或订单截图中的咖啡名。

注意：

- 需要避免读取隐私信息。
- 应在 prompt 中只提取饮品名称和容量。

### 10.4 文案动态生成

可以把静态毒鸡汤升级为模型生成。

建议限制：

- 输出长度。
- 风格边界。
- 不攻击真实个人或群体。
- 缓存生成结果，避免成本过高。

## 11. 当前建议

短期不要扩大 AI 范围，先保证：

- 注册登录流程顺滑。
- 手机录入稳定。
- Supabase 数据同步可靠。
- AI 失败时人工确认路径好用。

当基础链路稳定后，再推进“AI 自动推荐咖啡类型”。
