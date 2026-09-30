# 全球宏观预测市场 · 静态快照

这个公开仓库仅用于 GitHub Pages 展示经过用户审核的 31 个 Polymarket 宏观事件、225 个选项和历史概率。数据截止时间见首页和 `data/v1/index.json`；本站不是实时行情。事件和选项使用与私有采集仓库分离的公开 UUID；原始快照、审核过程、令牌和内部 ID 映射不属于这个仓库。

本站为静态 HTML/CSS/JavaScript 和 JSON。主页读取 `data/v1/index.json`，再按需读取各事件及子市场 JSON。没有运行时 API 密钥或 GitHub Actions 自动刷新。以后发布新快照需要重新执行私有审核和公开产物校验。
