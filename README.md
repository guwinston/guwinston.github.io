# 个人手记

一个中文个人学习网站，使用 Hugo 构建，通过 GitHub Pages 发布。支持论文笔记、学习记录、标签、全文搜索、RSS 和 KaTeX 公式。

## 本地预览

安装 Hugo 0.145.0 或兼容版本，在此目录执行：

```sh
hugo server -D
```

浏览器打开终端打印的地址。生产构建执行 `hugo --minify`，输出在 `public/`。

## 发布到 GitHub

1. 建立仓库，个人主页建议命名为 `你的用户名.github.io`。
2. 将本目录提交并推送到仓库的 `main` 分支。
3. 在仓库 Settings → Pages → Source 选择 **GitHub Actions**。
4. 在 Actions 查看 `Publish learning journal` 的结果。后续推送到 main 会自动发布。

工作流根据 Pages 的实际地址构建，也兼容带仓库名的项目网站。独立部署时请修改 `hugo.toml` 的 `baseURL`。

## 用 AI 更新

把论文或阅读材料交给 AI，并说明：

> 请遵循 AGENTS.md，将这份材料整理为论文笔记。区分论文结论、我的观点和待确认内容。不要编造结果或引用。先保存为草稿并生成本地预览。

内容按「技术」与「随记」组织：技术内容在 `content/technology/`，3DGS 专题在 `content/technology/3dgs/`，日常与自由记录在 `content/jottings/`。原有两篇示例保留为草稿，不公开展示。新增技术方向可添加子文件夹与 `_index.md`，无需预先创建空分类。

文章元数据示例：

```yaml
---
title: '论文标题与阅读主题'
date: 2026-10-12
description: '用一两句话说明这篇笔记的重点'
content_type: '论文笔记'
tags: ['机器学习']
draft: true
math: true
paper_url: 'https://arxiv.org/abs/...'
---
```

确认后将 `draft` 改为 `false`。公式使用 `$...$` 或 `$$...$$`；KaTeX 从 jsDelivr 加载，需要联网。公开仓库及发布后的文章可被他人查看；私人材料请保存在仓库外。
