---
title: '3DGS-MCMC：论文精读笔记'
date: 2026-10-13
description: '从 MCMC 视角理解 3DGS 的位置探索、近似守恒克隆与高斯资源重分配，梳理论文公式、代码差异及实验。'
tags: ['3DGS', 'MCMC', '论文精读']
content_type: '论文笔记'
draft: false
math: true
paper_url: 'https://arxiv.org/abs/2404.09591'
---

> **论文**：*3D Gaussian Splatting as Markov Chain Monte Carlo*（NeurIPS 2024）  
> **资料**：[论文全文](https://arxiv.org/html/2404.09591) · [官方代码](https://github.com/ubc-vision/3dgs-mcmc) · [项目主页](https://ubc-vision.github.io/3dgs-mcmc/)  
> **定位**：按论文 3.1–3.6、实验和附录 A 展开，侧重设计动机、公式来源、实现细节及独立思考。代码核对时间：2026-10-13。

## 一、研究动机：原始 3DGS 的问题在哪里？

原始 3DGS 通过图像重建损失优化高斯参数，使用梯度阈值驱动的 Clone / Split 和透明度驱动的 Prune 管理高斯。其局限有二：一是增密依赖已有高斯，SfM 初始化缺失的区域不容易探索；二是直接 Clone 会改变 Alpha Blending，造成渲染突变。

论文把高斯集合看作一个状态，试图用概率采样视角统一连续优化与离散的增密/回收操作。方法由三部分组成：**SGLD 风格的位置噪声、近似守恒的 Clone/Relocation、Opacity/Scale 正则化**。

> **核心理解**：它不仅在优化器中加噪声，更重要的是把“提升拟合质量”和“重新分配高斯表示能力”尽量分开。

## 二、3.1 原始 3DGS：为什么直接 Clone 会改变渲染？

单个高斯由位置 $\mu$、旋转 $R$、主轴尺度 $s$、透明度 $o$ 和 SH 颜色 $c$ 表示：

$$\Sigma=R\operatorname{diag}(s_x^2,s_y^2,s_z^2)R^T.$$

像素颜色由 Alpha Blending 合成：

$$C(x)=\sum_i c_i\alpha_i(x)\prod_{j<i}(1-\alpha_j(x)).$$

若原高斯某像素有效不透明度为 $0.8$，直接复制一个相同高斯后，合成不透明度变为 $1-(1-0.8)^2=0.96$。因此原始 Clone 虽增加了表示自由度，却不保持已有的渲染结果。这就是后面推导新 Clone 公式的原因。

## 三、3.2 MCMC 重新解释：从优化到采样
**MCMC 是什么？** 马尔可夫链蒙特卡洛采样（MCMC）通过一步步随机更新，间接从目标概率分布中抽取样本。“马尔可夫链”指下一步只依赖当前状态；“蒙特卡洛”指利用随机样本进行计算。移动规则需要经过设计，使长期访问各个区域的频率符合目标分布，并不是随便加噪声就可以。

**为什么要用？** 当参数很多、无法直接抽样时，MCMC 可以利用相对概率或对数概率的梯度逐步探索。优化主要寻找一个好答案；采样则让不同答案按各自的概率出现，高概率答案出现得更多。

**与 3DGS 有什么关系？** 将所有高斯参数看作当前状态，把重建得更好的参数赋予更高概率，就能借助这一思路设计更新：梯度改善重建，随机扰动帮助探索其他位置。本文主要利用它缓解对初始化的依赖，下面解释这一联系如何建立。

**关键是：把“损失越低越好”改写成“损失越低，出现的概率越高”，再让高斯沿梯度移动的同时进行随机探索。原来的优化并不自动等于 MCMC。**

### ① 用损失定义概率

令 $G$ 表示所有高斯的位置、形状、透明度和颜色等参数，$L(G)$ 是渲染图像与训练图像之间的损失。作者定义

$$P(G)=Z^{-1}\exp[-L(G)].$$

它的意思很直接：**这批高斯渲染得越准确，损失越低，整批参数对应的概率就越高。** 因而，寻找最低损失的参数，也就是寻找概率最高的参数。$Z$ 只负责让概率密度的积分等于 1，后面求梯度时不需要计算它。

这里采样的对象是整批高斯参数，不是从单个高斯内部抽取空间点；各个高斯共同影响渲染结果，不能当成相互独立的样本。

### ② 原来的梯度方向可以直接利用

对上式取对数、求梯度：

$$\nabla_G\log P(G)=-\nabla_G L(G).$$

因此，普通梯度下降

$$G_{t+1}=G_t-\eta\nabla_G L(G_t)$$

等价于沿着 $\log P$ 增大的方向移动。**降低损失和提高概率，指向同一个方向。** 这就是优化与采样之间的数学联系，也不要求场景必须由高斯表示。

### ③ 加入适当的噪声，才从“找最低点”走向“按概率探索”

只沿梯度走，通常会停在某个局部最低点。Langevin 方法在梯度更新中加入随机噪声；用随机训练视角估计梯度，就得到 SGLD：

$$\boxed{G_{t+1}=G_t-\eta_t\widehat{\nabla_G L}(G_t)+\sqrt{2\eta_t}\,\xi_t,\qquad\xi_t\sim\mathcal N(0,I).}$$

梯度把高斯拉向重建较好的位置，噪声让它们有机会离开当前区域、尝试其他位置。**在满足相应条件时，两者的平衡使长期采样偏向低损失区域，并对应前面定义的 $P(G)$。** 噪声不能随意添加；随机选训练图像带来的梯度波动，也不自动满足采样要求。

每一步由当前参数和新的随机量产生下一步，形成马尔可夫链；但仅有这一点，还不能保证它正确采样目标分布。

### ④ 对本文应该怎样理解？

论文沿用这一思路，实际使用 **Adam 加位置噪声**，噪声还受高斯形状和透明度控制，具体见下一节。因此它提供的是受 MCMC 启发的探索方法，不能直接认定实际算法严格采样 $P(G)$。

另一个阅读细节：论文式 (4)–(6) 代入后应为 $a=\lambda_{lr}$，正文写成 $\lambda_{lr}=-a$，存在符号不一致。

## 四、3.3 SGLD：噪声为什么需要精心设计？

作者只对**高斯中心位置**加噪声，不对 Scale、Rotation、Opacity、SH 加同类噪声。理由是：空间探索不足会造成缺失区域，而无约束的随机扰动可能把薄高斯移出有效梯度支持区域。

论文式 (8)：

$$\epsilon_\mu=\lambda_{lr}\sigma[-k(t-o)]\Sigma\xi,\qquad \xi\sim\mathcal N(0,I),\ k=100,\ t=0.005.$$

- $\Sigma\xi$ 使扰动沿高斯主轴呈各向异性，窄轴较弱、宽轴较强；其噪声协方差为 $\Sigma^2$，不是 $\Sigma$。
- 透明度权重意在使低 Opacity 高斯更易探索、高 Opacity 高斯更稳定。
- 噪声随位置学习率衰减，减少训练后期扰动。

### 论文公式与代码的重要差异

论文 arXiv HTML v3 的 $\sigma[-k(t-o)]=\sigma[k(o-t)]$ **随 Opacity 增大而增大**，与文字描述相反。官方 `train.py` 使用 `op_sigmoid(1 - opacity)`、中心参数 `0.995`，实际等价于

$$\boxed{w(o)=\sigma[100(0.005-o)]}.$$

**代码权重随 Opacity 增大而减小**，符合设计意图。训练中先执行 Adam step，再生成噪声、乘 `args.noise_lr * xyz_lr`、透明度权重和协方差，最后加到位置。[代码位置](https://github.com/ubc-vision/3dgs-mcmc/blob/main/train.py#L118-L129)。

**思考**：噪声是局部探索，不保证高斯跨越很大空白区域；应通过消融单独衡量其作用，而非把所有收益归因于 MCMC。

## 五、3.4：状态转移、Clone 与 Relocation

MCMC 的状态可以是整个集合 $G$。即使高斯数变化，也可把少量高斯的场景等价表示为更多高斯但部分 Opacity 为零（Dead Gaussian）的场景。这里是**渲染表示层面的等价**，不意味着严格的 MCMC 转移已经得到证明。

作者希望增密前后

$$P(G^{new})\approx P(G^{old}),$$

因为 $P\propto e^{-L}$，若渲染结果近似不变，损失及目标密度也通常接近。其动机是让增密成为近似无损的表示重参数化，而不是一次突然改变渲染结果的操作。

必须区分：**概率密度相同不等于转移核满足详细平衡**。严格的 MCMC 还涉及正反向转移概率，论文没有证明 Relocation 严格保持平稳分布。

| 名称 | 含义 | 是否增加高斯总数 |
|---|---|---|
| Target / Live | 被选中的有效高斯、复制模板 | 否 |
| Source / Dead | 低透明度高斯、可回收槽位 | 否 |
| Relocation | Source 移到 Target 并复制部分参数，双方重算 Opacity/Scale | 否 |
| Add New Gaussians | 真正追加高斯参数行 | 是 |
| Cloning Strategy | Relocation 与 Add New 共用的参数重算规则 | 不是独立训练阶段 |

**Relocation 从资源角度是回收 Dead Gaussian，从表示角度是克隆 Live Gaussian。** 这解释了论文为何交替使用 Clone、Source、Target 等词。

## 六、附录 A：守恒式 Clone 的 Opacity、Scale 如何推导？

假设原高斯 Opacity 为 $o$、尺度为 $s$，将其替换为 $N$ 个同中心、同 SH、同旋转的高斯。

**第一步：保持中心不透明度相同。**

$$1-(1-o')^N=o\quad\Rightarrow\quad\boxed{o'=1-(1-o)^{1/N}}.$$

但中心一致并不代表外围一致。直接求逐点渲染差的最小二乘解析解困难，作者改为要求**任意经过中心的一维切片积分相等**。

原剖面：

$$A_{old}(x)=o\exp\left(-\frac{x^2}{2s^2}\right).$$

新剖面：

$$A_{new}(x)=1-\left(1-o'\exp\left(-\frac{x^2}{2{s'}^2}\right)\right)^N.$$

令 $\int A_{new}(x)dx=\int A_{old}(x)dx$，用二项式展开和高斯积分，得到

$$B_N(o')=\sum_{k=1}^N(-1)^{k+1}\binom Nk\frac{(o')^k}{\sqrt{k}},$$

$$\boxed{s'=\gamma s,\quad \gamma=\frac{o}{B_N(o')}}.$$

这与正文式 (9) 的双重求和等价。由于每个主轴尺度统一乘 $\gamma$，

$$\boxed{\Sigma'=\gamma^2\Sigma,\qquad R'=R}.$$

因此**论文写协方差矩阵，代码只改 Scale**；Rotation 与 SH 直接继承。SH 不变是因为相同颜色在 Alpha 合成中可作为公共因子提出，而改变颜色无法同时保持后方透射率。

例：$o=0.8,N=2$，$o'\approx0.5528$、$\gamma\approx0.899$。中心 Alpha 和切片积分相同，但逐点 Alpha 曲线不完全相同，故渲染与目标概率只能**近似守恒**。

**思考**：这套解析式是可独立移植到普通 3DGS 的重要工程贡献，不依赖 SGLD。

## 七、3.4 实现：为什么先采样所有 Target，再统一更新？

每轮回收先找到 $o\le0.005$ 的 Dead Source，然后从 Live 高斯中按透明度比例**有放回采样** Target：

$$p_i=\frac{o_i}{\sum_{j\in live}o_j}.$$

同一个 Target 可能被多个 Source 选中。若被选中 $m$ 次，应一次性按 $N=m+1$ 应用守恒式 Clone 公式，而不能只按单次复制的 $N=2$ 计算。因此先完成全部 Source→Target 映射，再统计重数，最后更新参数。

随后 Source 继承 Target 的位置、SH、Rotation 和重算后的 Opacity/Scale；Target 自身也更新 Opacity/Scale。优化器状态的处理则**不对称**：Target 的 Adam 一、二阶动量归零，Source 的旧动量保留。论文希望前者更稳定，后者更有探索倾向；但额外注入的位置噪声不是 Adam 动量，保留动量的收益属于经验设计，不是严格推论。

官方实现：[`_sample_alives`、`_update_params`、`relocate_gs`](https://github.com/ubc-vision/3dgs-mcmc/blob/main/scene/gaussian_model.py#L399-L445)。

## 八、3.5 为什么还需要 Opacity 与 Scale 正则？

如果只有 Clone / Relocation，高斯资源未必会主动从无效区域释放。论文因此增加

$$L_{total}=L_{render}+\lambda_o\sum_i|o_i|+\lambda_\Sigma\sum_{i,j}\sqrt{\operatorname{eig}_j(\Sigma_i)}.$$

因为 $\Sigma_i=R_i\operatorname{diag}(s_i^2)R_i^T$，所以

$$\sqrt{\operatorname{eig}_j(\Sigma_i)}=s_{ij}.$$

因此第二项本质是对主轴 Scale 做 L1 正则。

- **Opacity 正则**推动弱贡献高斯变透明；低于阈值即可作为 Dead 被回收。
- **Scale 正则**抑制过大覆盖范围，可能降低重叠和光栅化工作量，但本身不会直接减少高斯数量。
- **整体闭环**：正则化释放低效资源 → Relocation 把资源转给有效高斯 → 后续优化学习更多细节。

**实现注意**：论文式 (10) 写求和，官方 `train.py` 实际用 `torch.abs(...).mean()`；移植超参数时要考虑归一化差异。[代码](https://github.com/ubc-vision/3dgs-mcmc/blob/main/train.py#L89-L96)。

**思考**：Opacity 并不等同于可见性或真实贡献度。高透明度但长期不可见的高斯仍可能获得较高 Target 采样概率；可以探索累计像素贡献、可见性、重建误差等更直接的资源分配指标。

## 九、3.6：高斯总数如何增长？

**不是一开始就分配 `cap_max` 个高斯。** 官方 `create_from_pcd()` 根据 SfM 或随机点云数量初始化参数。增密事件中先 `relocate_gs()` 回收死亡高斯，再 `add_new_gs()` 真正追加新高斯：

$$\boxed{N_{next}=\min(N_{max},\lfloor1.05N_{current}\rfloor)}.$$

也就是每次增密事件总高斯数最多增长约 5%，直到预算上限。Relocation 不增加参数行数，Add New 才扩展张量和 Adam 状态。论文“dead become alive”说的是有效高斯数量，不是预分配了一个固定容量的死亡高斯池。

源码：[初始化](https://github.com/ubc-vision/3dgs-mcmc/blob/main/scene/gaussian_model.py#L116-L136) · [训练调用](https://github.com/ubc-vision/3dgs-mcmc/blob/main/train.py#L113-L116) · [5% 增长](https://github.com/ubc-vision/3dgs-mcmc/blob/main/scene/gaussian_model.py#L447-L470)。

## 十、实验结果应该如何解读？

**初始化鲁棒性（Table 2）**：在 MipNeRF 360 随机初始化实验中，随机点范围从相机范围的 $3\times$ 缩小为 $1\times$ 时，原始 3DGS 的 PSNR 从 27.89 降到 22.72；本文方法从 29.72 到 29.64。说明方法对初始化覆盖范围不那么敏感。

**消融（Table 3）**：随机初始化条件下，完整方法 PSNR 29.72，去掉噪声为 27.41；对所有参数加噪则为 29.11。说明位置噪声本身有贡献，并非所有收益都来自 Relocation。论文还指出直接把两项正则化加入原始 3DGS 反而可能损害结果，说明它们依赖相匹配的资源管理策略。

**时间开销（§4.2）**：约 1M 高斯的特定对比中，原始 3DGS 单次优化约 76 ms，本文约 80 ms，额外约 5.3%。但整体训练耗时还取决于高斯位置、Scale、Opacity 如何影响 Rasterizer。论文 Table 4 的 Room 场景显示不同正则化和预算下训练时间、PSNR 存在权衡，**不能简单断言本文在任何配置下训练都更快**。

**关于 Opacity 与渲染性能**：在原始 Tile-based Rasterizer 中，透明度影响透射率累积和 Early Stop；降低单个高斯的 Opacity 并不必然降低 Overdraw，可能反而使 Early Stop 更晚。性能收益还依赖低透明度跳过、空间覆盖和高斯分布变化。移动端硬件光栅化若缺少相同的 Early Stop，效果可能不同。

## 十一、综合评价与后续研究思考

### 论文真正的贡献

1. **建模视角**：用采样状态重新解释高斯优化与增密，使探索与资源管理可以在同一框架下讨论。
2. **位置探索**：协方差与透明度约束的噪声有助于缓解初始化缺失。
3. **守恒式 Clone / Relocation**：通过中心 Alpha 和一维切片积分守恒，显著减轻增密导致的渲染突变。
4. **预算化资源循环**：正则化产生可回收高斯，Opacity 加权重分配，高斯总数可受 `cap_max` 控制。

### 不应过度解读的部分

- **并非严格 MCMC 正确性证明**：近似 $P(G')=P(G)$ 不是详细平衡或平稳分布证明。
- **并非完全解决空白区域探索**：噪声局部、Relocation 依赖已有 Live Target；缺失几何仍可能难以恢复。
- **并非真正固定容量的 GPU 内存池**：代码仍会动态追加参数张量。
- **并非只靠减少高斯数就能加速**：实际光栅化成本还取决于投影面积、重叠、透明度和剔除机制。

### 面向大场景与移动端的可验证方向

| 问题 | 可做的对比实验 | 建议观测指标 |
|---|---|---|
| 噪声是否值得保留？ | Baseline / +Noise / +Relocation / Full | PSNR、LPIPS、空洞区域质量 |
| Opacity 采样是否合理？ | Opacity / 可见性 / 累计贡献 / 残差加权 | 单位高斯贡献、重建质量 |
| 守恒 Clone 是否稳定？ | 直接 Clone / 仅调 Opacity / Opacity+Scale | 增密瞬间 Loss 跳变、恢复迭代数 |
| Adam 动量如何处理？ | 双方重置 / Target 重置 / 双方保留 | Loss 波动、收敛速度 |
| 是否真正降低移动端开销？ | 相同高斯数与相同质量两组对照 | 投影面积、Tile 覆盖、每像素 Blend 次数、GPU 时间 |

**最终判断**：从纯优化器角度，3DGS-MCMC 是 Adam 加受约束的位置噪声；从训练系统角度，它最有价值的是**近似保持渲染的高斯复制与资源重分配机制**。即使不接受其严格 MCMC 解释，附录 A 的参数更新和 3.4–3.5 的资源循环仍值得独立复现。

---

## 参考与核对索引

- [论文：3D Gaussian Splatting as Markov Chain Monte Carlo](https://arxiv.org/html/2404.09591)：3.2–3.6、4.1–4.2、Appendix A。
- [官方代码：train.py](https://github.com/ubc-vision/3dgs-mcmc/blob/main/train.py)：Loss、Relocation 调度、Add New、Adam 与位置噪声。
- [官方代码：gaussian_model.py](https://github.com/ubc-vision/3dgs-mcmc/blob/main/scene/gaussian_model.py)：初始化、Opacity/Scale 重算、Source/Target 采样、优化器状态。
- [项目主页](https://ubc-vision.github.io/3dgs-mcmc/)：论文、结果及可视化。
