---
draft: true
content_type: 论文笔记
aliases: ['/papers/attention/']
title: 'Attention Is All You Need：从注意力理解 Transformer'
date: 2026-10-12
description: '示例精读：梳理自注意力的核心计算，以及阅读 Transformer 时值得追问的问题。'
tags: ['Transformer', '深度学习']
math: true
demo: true
paper_url: 'https://arxiv.org/abs/1706.03762'
---
## 论文解决什么问题

《Attention Is All You Need》提出了以注意力机制为核心的 Transformer 架构。阅读时可以先抓住一个问题：不依赖循环结构，模型如何建立序列中不同位置之间的联系？

## 核心方法

缩放点积注意力通常写作：

$$
\operatorname{Attention}(Q,K,V)=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

可以把它拆成三个步骤：计算查询与键的匹配程度，对分数进行归一化，再用权重汇总值向量。这里的直觉是：每个位置根据当前信息，选择应当参考哪些位置。

## 阅读时值得追问

- 为什么要除以 $\sqrt{d_k}$？
- 多头注意力怎样在不同表示子空间中处理信息？
- 缺少循环结构后，位置信息通过什么方式进入模型？

## 下一步

用一个很小的序列手动检查注意力矩阵的维度，再结合代码确认 mask 和 softmax 的计算方向。

## 来源

Vaswani et al., *Attention Is All You Need*, 2017。具体实验设置和结论请以论文原文为准。
