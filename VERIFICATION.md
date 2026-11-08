# 验证说明

这里记录已有证据及其范围。安装步骤见 [README](README.md)，接口格式见[接入文档](CONTRIBUTING.md)。

## 已完成的验证

| 验证方式 | 环境 | 已确认的内容 |
| --- | --- | --- |
| 仓库离线测试 | 18 项测试；Node 22 CI，另有 Node 26.13.0 和 Bun 1.4.4 本地记录 | 请求转换、响应校验、错误脱敏、超时和取消等 |
| 完整插件宿主，模拟上游 | Bun 1.4.4 | 初始化、API key 登录契约、模型注册、加载器和 RPC 响应 |
| 隔离的真实网关进程，模拟上游 | Magpie 0.1.2888 | 意图选模、自动强度转换、执行模型 503 后回退、分类器 401 后默认路由 |
| 有限在线集成记录 | Magpie v0.1.3302，合成候选选项 | 网关决策路径经 System One 转换后成功调用该供应商的 choice 判断 |

离线测试还覆盖多题和答案乱序、缺失或重复答案、拒答、非法分布、评分一致性、请求边界、账户并发隔离及 usage 转发。可在仓库运行 `npm test` 和 `npm run check`。

公开 CI 记录：

- [首次离线 CI](https://github.com/JHuiyuan/magpie-openai-decisions/actions/runs/41776178402)
- [v0.1.1 提交检查](https://github.com/JHuiyuan/magpie-openai-decisions/actions/runs/42471463179)
- [v0.1.1 标签检查](https://github.com/JHuiyuan/magpie-openai-decisions/actions/runs/42471509636)

宿主和网关测试使用虚构认证及模拟响应。测试错误中的虚构密钥未出现在客户端结果和捕获日志中，结束后已清理测试进程和端口。相关集成测试材料不随公开包分发。

## 接口核对记录

曾对照官方 Magpie 的 [2026-11-04 源码快照 e17b6cef](https://github.com/yetone/magpie/commit/e17b6cefc7b25c19d1e522f9e8a9626bf68912d9) 核对接口：

- [host.js](https://github.com/yetone/magpie/blob/e17b6cefc7b25c19d1e522f9e8a9626bf68912d9/internal/plugin/host.js)：插件发现、认证和模型注册。
- [plugins.go](https://github.com/yetone/magpie/blob/e17b6cefc7b25c19d1e522f9e8a9626bf68912d9/internal/provider/plugins.go#L341-L343)：供应商的 `decide` 与模型的 `decides` 共同声明决策能力，另有加载器路径转换。
- [decide.go](https://github.com/yetone/magpie/blob/e17b6cefc7b25c19d1e522f9e8a9626bf68912d9/internal/gateway/decide.go)：分类问题与四级评分标准。

这些标记由插件设置，用户不需要填写。该提交本身涉及 Qoder 迁移，只是核对时采用的快照，不是 Decisions 功能的引入点，也不是最低兼容版本或安全认证。

[Magpie v0.1.2888](https://github.com/yetone/magpie/tree/v0.1.2888) 指向 `2741b749f95c8548d1f9107c5cfe474ed1d05c8f`；上述快照比它晚四个提交，期间所引用的三个文件没有变化。最早兼容版本尚未确定。

上游协议参考：[OpenAI Decisions API](https://developers.openai.com/api/reference/resources/decisions/methods/create)。

## 仍未覆盖的范围

图形界面操作未做实测。有限的在线 choice 记录不能证明所有直接 API 模式、在线 predicate／score、选模质量、概率校准或实际账单均已验证。额度和账户权限需要由使用者在平台确认。

本次文档重写未增加真实 API 请求，也没有重复执行生产实验。

## 审查与隐私

此前审查修正了认证等待未受期限约束、超时参数校验和非法 JSON 错误可能带出输入内容的问题。

公开文件和示例使用虚构数据，保留必要版权署名。v0.1.1 收尾检查覆盖当前文件、既有提交补丁、提交邮箱、部分 CI 日志及附件清单；发现的密钥样式内容为上游测试示例。该检查不是逐个历史对象的完整审计，模式扫描也不能保证发现所有秘密。
