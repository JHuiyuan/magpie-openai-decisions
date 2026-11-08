# Magpie OpenAI Decisions

让 Magpie 使用 OpenAI Decisions 判断任务类型、选择候选项或评估任务强度。插件提供的模型是 `openai-decisions/gpt-6-luna`，用于辅助路由，不用于生成聊天回答。

如果你希望先用 Decisions 判断，再由 Magpie 或自己的程序执行任务，可以使用这个插件。判断失败时，回退到哪个模型或哪套规则，需要由调用方配置。

## 安装并填写密钥

准备好 Magpie 和可访问 Decisions 的 OpenAI 项目 API key。在终端执行：

```sh
magpie plugin add github:JHuiyuan/magpie-openai-decisions
magpie plugin login openai-decisions
```

登录时选择 **OpenAI API key**，在 Magpie 中填写密钥。密钥由 Magpie 保存，无需写进插件文件或环境变量。

然后在 Magpie 路由组中，将分类器选为 `openai-decisions/gpt-6-luna`，并检查该路由组的默认模型和失败处理配置。插件会自动声明模型的决策能力，无需手工设置能力字段。

Magpie 的插件运行环境由宿主管理。仅在开发和运行仓库测试时需要 Node.js 22 或更高版本。

## 确认可用

```sh
magpie plugin --json
```

检查输出中是否有 `openai-decisions` 供应商和 `gpt-6-luna` 模型。出现模型表示插件已被识别，不代表账户已有 API 权限或可用额度。

如需验证实际调用，可在 Magpie 中用不含私人信息的小任务检查结果。账户验证或模型检测可能发送真实请求并计费；额度、模型权限和账单以 OpenAI 平台为准。

已验证的范围包括离线插件宿主、隔离网关，以及 Magpie v0.1.3302 的有限候选选择调用。尚未确定最早兼容版本，详细记录见 [验证说明](VERIFICATION.md)。

## 失败时怎么处理

插件不会自动重试，也不会替你选择备用模型。它会在超时、网络故障、拒答或响应不合法时报告失败。

- 使用 Magpie 路由组：确认当前版本和配置中的默认路由行为。
- 自己编写调用程序：设置超时，校验返回项属于允许的候选集合；失败时转到本地规则或默认模型。

插件默认超时为 30 秒。调用方可以设置更短的等待时间，并传递取消信号。超时不代表上游一定没有处理请求或产生费用。

## 常见问题

| 现象 | 先检查什么 |
| --- | --- |
| 找不到供应商或模型 | 查看上面的插件列表，确认安装成功且 Magpie 支持决策插件 |
| HTTP 401 / 403 | 密钥、项目和模型访问权限 |
| HTTP 429 | 限流或额度状态；不能只凭 429 判断额度耗尽 |
| 取消或超时 | 调用方的等待时间和网络连接 |
| 不支持的问题或无效响应 | 问题格式、评分标准，以及是否发生拒答；见[接口说明](CONTRIBUTING.md#接口说明) |

排查时不要提交真实密钥或私人任务内容。普通修复可提交 Pull Request；敏感问题按[安全说明](SECURITY.md)处理。

## 进一步阅读

- [接入接口与开发维护](CONTRIBUTING.md)：请求示例、支持范围、测试和版本流程。
- [验证说明](VERIFICATION.md)：哪些经过测试、哪些只是接口核对。
- [变更记录](CHANGELOG.md)：版本变化。
- [来源与署名](NOTICE.md)、[MIT 许可证](LICENSE)。

本项目从 GitHub 安装，不发布到 npm。它不提供额度查询、消费上限或全部 OpenAI Decisions 功能。
