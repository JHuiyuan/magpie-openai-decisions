# 接入与开发

普通安装请先看 [README](README.md)。本文面向编写调用程序、排查接口或修改插件的开发者。

## 接口说明

插件把 Magpie 的 System One 请求转换为 OpenAI Decisions 请求，再将结果转换回 Magpie 格式。

三处路径不要混用：

| 位置 | 路径和作用 |
| --- | --- |
| Magpie 网关 | 部分版本提供 `/v1/decisions`，对外格式由该版本的网关定义 |
| 插件内部 | 接收宿主发来的 `POST https://api.openai.com/v1/systemone` |
| OpenAI 上游 | 插件实际请求 `https://api.openai.com/v1/decisions` |

下面是**插件内部接受的请求**，不是通用的网关调用示例：

```json
{
  "model": "gpt-6-luna",
  "state": {"task": "Summarize a short article"},
  "questions": {
    "route": {
      "type": "choice",
      "instructions": "Select the best candidate.",
      "criteria": {
        "brief": "Short summary",
        "detailed": "Extended analysis"
      }
    }
  }
}
```

有效响应中的 `answers.route` 包含 `choice`、`confidence` 和按候选名称索引的 `probabilities`。概率和置信度来自上游，插件不生成或校准这些值。

### 支持范围

每次请求接受 1–400 个命名问题。`state` 可以是文本或 JSON 对象；每个问题必须有非空的文本 `instructions`。

| 问题类型 | criteria 要求 | 返回内容 |
| --- | --- | --- |
| `noul` 或 `predicate` | 不提供 | `noul` 概率 |
| `choice` | 2–255 项对象；值为说明文本或 null | 选中项、置信度、概率表 |
| `score` | 2–10 项非空文本数组，按分数从低到高排列 | 从 0 起算、可带小数的分数，置信度和概率表 |

评分必须有明确标准，不支持没有 `criteria` 的自由评分。图片、对话数组、未知请求字段和其他模型均不支持。上游返回缺失或重复答案、拒答、非法概率或不一致的分数时，整次结果失败，不返回部分判断。

插件只转发允许的 usage 字段，包括 token 和缓存计数；缺失值不会补造，缓存计数不会再次加到总量中。

### 超时与回退

插件没有重试和备用模型逻辑。调用方应先确定候选集合及默认规则，再发起一次有时限的判断；收到有效结果后检查候选名称，失败则使用默认规则。

默认 `timeoutMs` 为 30000，覆盖请求解析、读取认证、网络传输和响应解析。调用方传入的取消信号也会中止等待。更短的调用方期限与插件期限是两项独立限制，应同时传递取消信号。

`timeoutMs` 是工厂函数的编程选项，接受 1–2147483647 的整数；这不表示 Magpie 界面提供同名设置。`fetchImpl` 用于注入测试传输。

上游地址固定，禁止重定向，不接受自定义 origin 或额外组织／项目请求头。HTTP 错误保留状态码并隐藏上游正文；其他响应异常以通用错误报告。密钥由 Magpie 的认证回调提供。

## 本地开发

使用 Node.js 22 或更高版本。项目没有依赖和安装脚本，在仓库根目录运行：

```sh
npm test
npm run check
npm pack --dry-run --ignore-scripts
```

前两项运行离线测试和语法检查；最后一项只预览打包内容，不发布 npm 包。测试使用模拟传输和虚构密钥，无需真实 API key。

主要文件：

| 文件 | 用途 |
| --- | --- |
| `index.mjs` | 仅导出插件工厂；宿主会把导出的函数当作插件入口 |
| `adapter.mjs` | 请求转换、响应校验、认证及取消处理 |
| `test.mjs` | 离线回归测试 |
| `.github/workflows/check.yml` | Node 22 检查，支持 push、Pull Request 和手动运行 |

## 提交修改

Issues 当前关闭。请向 main 提交范围清楚的 Pull Request，说明问题、改动行为和验证结果。协议行为有变化时补充回归测试；只改文档时核对命令、链接和相互引用即可，现有 CI 仍会运行。

示例使用虚构数据，提交前移除密钥、私人提示词、本机路径和账户信息。敏感问题不要放进公开 PR，见[安全说明](SECURITY.md)。

## 维护版本

当前使用 0.x 版本。发布新版本时同步更新 package.json 和[变更记录](CHANGELOG.md)，待检查通过后创建 `vX.Y.Z` 标签。纯文档修改可以先记入 Unreleased，不必立即升级版本。

已发布标签不移动。标签和 Release 标记一份源码，不代表所有未来宿主版本均兼容。包保持 `private: true`，不发布到 npm。保留 [LICENSE](LICENSE) 和 [NOTICE](NOTICE.md)，并在验证记录中区分模拟测试与真实服务调用。
