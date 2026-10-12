# 网站维护约定

- 本站采用 Hugo，自有模板，无主题子模块。保持中文。仅保留微暖白底、炭灰文字与低饱和岩青色强调的固定配色，不提供主题切换。
- 顶层分类仅保留 content/technology（技术）与 content/jottings（随记）。3DGS 内容放在 content/technology/3dgs。未经用户要求，不预先增加分类。
- 新文章默认 draft: true；只有用户确认发布或明确要求发布时设为 false。
- title、date、description、tags、content_type 应完整（content_type 为论文笔记、项目、随笔等内容形式）；需要公式时设置 math: true。
- 依据用户提供的论文与笔记写作；区分论文观点、用户观点与待验证推测。不可编造实验、引用、作者经历或联系方式。
- 示例文章必须设置 demo: true。真实文章不应继承该标记。
- 优先修改内容文件；新增内容应自动进入列表、搜索和 RSS。
- 修改后运行 hugo --minify，检查链接、首页列表和文章显示。不要提交 public、.tools 或凭据。
- GitHub Pages 通过 .github/workflows/pages.yml 发布。不要擅自修改远程仓库、访问权限或域名。

- 新增领域时添加 content/<slug>/_index.md，设置 domain: true、weight、number、english 和 description；首页与领域入口自动生成。每篇内容须设置 content_type，才能进入最近记录、归档和搜索。

- 原有演示文章已保存为 draft: true，保留文件但不公开。技术下的新方向使用子文件夹与 _index.md；domain: true 仅用于顶层分类。
