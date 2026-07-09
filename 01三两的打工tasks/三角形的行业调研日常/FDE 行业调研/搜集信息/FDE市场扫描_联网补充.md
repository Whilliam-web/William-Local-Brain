# FDE 市场扫描：当前市场上有什么东西

日期：2026-07-06  
用途：补充 [[FDE行业调研报告_FA内资版]] 的“玩家分析 / 行业生态 / 竞争格局”章节  
说明：本稿基于 2026-07-06 联网公开资料整理，FDE 市场变化很快，后续建议定期刷新。

---

## 1. 总体判断

目前市场上的 FDE 不是一个单一产品类别，而是围绕“企业 AI 落地”的一组组织形态、岗位形态和商业模式。大致可以分成六类：

1. **FDE 原型公司**：以 Palantir 为代表，长期用前置工程师嵌入客户复杂业务现场。
2. **模型厂商 FDE**：OpenAI、Anthropic、Cohere 等，为了让模型进入企业生产系统，开始招聘/组建 FDE 或类似团队。
3. **云厂商 / 大厂 AI 部署组织**：AWS、Microsoft、Google Cloud 等，把 FDE 做成企业 AI 部署的战略组织。
4. **垂直 AI 应用公司的前置交付团队**：Harvey、Sierra、Decagon、Hebbia、Norm AI 等，在法律、客服、金融分析等垂直场景用 FDE/AI Strategist/Agent Builder 帮客户落地。
5. **数据与 AI 基础设施公司的 FDE**：Scale AI、Databricks 等，围绕数据、评测、生产级 AI 系统部署客户方案。
6. **国内类似形态**：国内尚少直接叫 FDE 的公司，但大模型厂商、云厂商、Agent 平台、行业 AI 服务商、传统解决方案商都在做类似“前置工程 + 行业落地”的工作。

一句话：

> 市场已经从“卖模型 / 卖 Agent 平台”进入“模型 + 数据 + 工作流 + 现场交付”的阶段，FDE 是这套新交付模式的显性化。

---

## 2. 第一类：Palantir 原型模式

### 2.1 代表玩家

- Palantir

### 2.2 市场角色

Palantir 是 FDE / FDSE 模式的源头型玩家。其 FDSE 被定义为嵌入客户现场、用 Palantir 平台解决客户最难业务问题的工程角色。

Palantir 的模式本质是：

- 用平台承载通用能力；
- 用 FDSE 进入客户现场；
- 针对政府、国防、金融、能源、供应链等复杂场景做深度部署；
- 把现场需求反馈回平台。

### 2.3 对 FDE 市场的启示

Palantir 证明了：

- 复杂企业软件可以通过“平台 + 前置工程”卖出高客单；
- FDE 不是低端实施，而是客户问题发现、产品部署和业务结果交付的核心角色；
- 但这种模式对组织、人才密度、客户选择和平台能力要求极高。

对隐迹这类早期团队的启示：

> 不能只学 Palantir 的驻场形式，要学的是“现场交付如何反哺平台能力”。

---

## 3. 第二类：模型厂商 FDE

### 3.1 代表玩家

- OpenAI
- Anthropic
- Cohere
- Mistral 等模型公司也出现类似 enterprise deployment / solutions / FDE 职能

### 3.2 OpenAI

OpenAI 官网招聘页显示，截至本次检索，OpenAI 有多地 Forward Deployed Engineer、Manager of Forward Deployed Engineering、Platform Engineer FDE、Technical Deployment Lead FDE 等岗位，覆盖纽约、旧金山、西雅图、伦敦、都柏林、巴黎、东京、首尔、新加坡、阿布扎比等城市。

这说明 OpenAI 已经把 FDE 组织化，而不是零散招聘解决方案工程师。

OpenAI FDE 的市场含义：

- 模型公司不能只卖 API；
- 企业客户需要把模型变成生产系统；
- FDE 是模型公司争夺企业客户、扩展用量、提高客户粘性的关键组织。

### 3.3 Anthropic / Cohere

公开报道和招聘信息显示，Anthropic、Cohere 等也在招聘或组建类似 forward deployed / solutions / applied AI 职能，帮助企业客户将模型嵌入真实工作流。

对市场的含义是：

> 基础模型越来越像底层供给，模型公司必须向应用、部署和业务结果延伸，否则企业收入难以充分释放。

---

## 4. 第三类：云厂商 / 大厂 AI 部署组织

### 4.1 AWS Forward Deployed Engineering

AWS 在 2026-06-30 宣布投入 10 亿美元建立 AWS Forward Deployed Engineering 组织。官方口径强调：

- 嵌入客户团队；
- 与业务、工程、安全团队共同构建生产 AI 系统；
- 聚焦 agentic AI；
- 将部署周期从数月压缩到数天；
- 不按传统咨询的人天逻辑，而围绕业务结果；
- 项目结束后让客户保留 AI 能力、workflow、runbook、知识图谱和内部 champion。

AWS 还特别强调 semantic layer / governed knowledge graph：把企业数据源连接起来，让 Agent 在客户自己的 AWS 环境中基于受治理知识图谱推理。

这对市场非常关键，因为它说明大厂已经把 FDE 从“人力服务”升级为：

> 云基础设施 + Agentic AI + 语义层 + 前置工程 + 客户自持能力。

### 4.2 Microsoft Frontier Company

TechCrunch 报道，Microsoft 在 2026-07-02 宣布 Microsoft Frontier Company，投入 25 亿美元，组织 6000 名行业和工程专家，目标是用 Microsoft 现有 AI 工具帮助企业完成 AI 部署。微软高管虽然不愿只称其为 FDE，但其形态与 FDE 类似：嵌入客户、共创、部署、优化、关注结果。

这说明 FDE 正在从模型公司扩散到云和企业软件巨头。

### 4.3 Google Cloud GenAI FDE

Google Cloud 公开招聘 GenAI Forward Deployed Engineer。其岗位描述非常典型：

- FDE 是 embedded builder；
- 连接 frontier AI products 与客户生产现实；
- 不只是架构咨询，而是在客户环境内编码、debug、共同交付 bespoke agentic solutions；
- 解决 integration complexity、data readiness、state management 等企业 AI 生产障碍；
- 将现场洞察反馈给 Google Cloud 产品路线图。

岗位能力要求包括：

- 生产级 AI 方案从 conception 到 launch；
- RAG、向量数据库、结构化/非结构化数据管道；
- 多 Agent 系统，如 LangGraph、CrewAI、ADK；
- MCP server、评估和 observability。

Google 的岗位描述几乎把 FDE 的能力模型写得很完整。

### 4.4 这一类对创业公司的压力

大厂 FDE 的优势：

- 模型和云资源强；
- 企业客户基础强；
- 安全合规能力强；
- 能服务大客户和受监管行业。

创业公司的机会：

- 大厂 FDE 通常服务大客户；
- 对中小垂直行业的细碎场景，大厂不一定愿意深做；
- 创业公司可以更快、更便宜、更贴近行业流程；
- 可以在垂直行业中形成更深模板和产品化能力。

---

## 5. 第四类：垂直 AI 应用公司的前置交付团队

这一类最值得隐迹参考，因为它们不是单纯卖 FDE，而是用 FDE 帮垂直 AI 产品落地。

### 5.1 Harvey：法律 AI

Harvey 定位为法律和专业服务领域的 domain-specific AI，覆盖合同分析、尽调、合规、诉讼等工作流。其公开资料显示，Harvey 服务大量律所和企业客户。

Harvey 的启示：

- 专业服务行业需要高度定制和客户成功；
- 法律场景对准确性、审计、工作流嵌入要求高；
- FDE / customer success / legal engineer 这类角色对于推动真实使用非常重要。

### 5.2 Sierra：客户交互 AI Agent

Sierra 主要帮助企业构建面向客户的 AI Agent，用于客服、商业交互、客户体验等。其招聘和产品资料强调与客户一起构建 AI agents。

启示：

- 客服/客户交互场景适合 AI Agent，但需要深度集成业务系统、知识库、权限和渠道；
- “Agent 平台 + 客户交付”是常见路径。

### 5.3 Decagon：客服 AI Agent

Decagon 面向客户支持和客户体验场景，公开资料中提到 forward deployed teams 已经成为现代 AI 公司常见做法。其 Customer Engineer / Agent Builder 类岗位要求有 solutions engineering、forward-deployed engineering、technical consulting 等经验。

启示：

- 即使是产品化较强的 AI 客服公司，也需要强前置交付；
- AI Agent 的落地不是自助开箱即用，而是要调工作流、知识库、渠道和评估。

### 5.4 Hebbia：金融 / 专业分析 AI

Hebbia 的招聘页显示其有 Forward Deployed Engineer、Forward Deployed Banker、Forward Deployed Investor、AI Strategist 等岗位。它服务资产管理、投行、律所、财富 500 强等复杂分析场景。

启示：

- FDE 不一定都叫 engineer，也可能叫 AI Strategist、Forward Deployed Banker、Forward Deployed Investor；
- 当场景高度专业化时，行业专家 + AI 产品 + 工程交付会合并成新型前置角色。

### 5.5 Norm AI：法律 / 合规 Agent

Norm AI 的岗位描述强调 Legal Engineering，用律师监督和构建领域专用 AI agents。这类公司说明，在合规、法律等领域，FDE 可能体现为“行业专家 + AI builder”的复合角色。

---

## 6. 第五类：数据与 AI 基础设施公司的 FDE

### 6.1 Scale AI

Scale AI 公开招聘 Forward Deployed Engineer, GenAI。岗位描述强调：

- 为领先 AI 公司和政府机构交付关键数据解决方案；
- 与技术客户日常互动；
- 端到端设计、构建、部署；
- 快速实验；
- 影响产品路线图。

Scale AI 的 FDE 更偏“数据基础设施 + 客户复杂问题解决”。

### 6.2 Databricks / 数据平台类公司

数据平台公司也会有类似 FDE / solutions / field engineering 组织，帮助客户把 AI 应用生产化。它们的核心优势在于：

- 数据湖仓；
- 企业数据治理；
- MLOps / LLMOps；
- 企业级安全合规；
- 与客户 IT 架构深度绑定。

这类玩家会占据企业 AI 落地中的数据底座位置。

---

## 7. 第六类：国内 FDE 类似形态

国内目前直接使用 FDE 概念的公司还不多，但类似形态已经存在。

### 7.1 大模型 / 云厂商行业解决方案团队

包括阿里云、腾讯云、百度智能云、火山引擎、华为云、智谱等生态，都会通过行业解决方案、AI Agent 平台、客户工程师、解决方案架构师帮助企业落地 AI。

这些团队未必叫 FDE，但做的事情包括：

- 大模型私有化部署；
- 企业知识库 / RAG；
- 行业 Agent；
- 工作流编排；
- 数据接入；
- 客户现场 PoC 和交付。

### 7.2 企业协同生态中的 Agent 平台

围绕飞书、企微、钉钉、邮件、表格等工作入口，出现大量 AI Agent / AI 工作流 / AI 员工平台。它们做的事情与 FDE 关系很近：

- 连接企业日常工作入口；
- 把 AI 放进销售、客服、运营、财务、人事流程；
- 通过项目交付拿到客户场景；
- 逐步沉淀行业模板。

### 7.3 传统软件和解决方案商 AI 化

国内大量 ERP、CRM、OA、行业软件、系统集成商也会加入 AI Agent 能力。它们优势是客户关系和行业 know-how，劣势是产品和 AI 工程能力不一定强。

### 7.4 初创公司的机会

国内初创公司如果直接讲“FDE”，投资人可能会自然联想到咨询和外包。更好的方式是讲：

> 通过 FDE 式前置交付打磨垂直行业 AI 产品。

因此，隐迹这类团队应该把 FDE 作为方法，而不是作为主标签。

---

## 8. 市场上已经形成的几个趋势

### 8.1 FDE 从岗位变成组织

OpenAI、AWS、Google Cloud、Microsoft 的动作说明，FDE 不再只是一个岗位，而是企业 AI 落地组织。

### 8.2 FDE 从“咨询式实施”变成“Agentic AI 生产部署”

新的 FDE 不只是帮客户配置软件，而是要交付：

- Agentic workflow；
- RAG / 知识图谱 / 语义层；
- MCP server；
- 多 Agent 系统；
- 评估和观测；
- 权限、审计和安全；
- 人机协同闭环。

### 8.3 FDE 和产品路线高度绑定

优秀 FDE 不是孤立交付，而是把现场模式沉淀成：

- reusable module；
- product feature request；
- industry template；
- connector；
- evaluation benchmark；
- runbook。

### 8.4 市场对 FDE 也有明显质疑

反对观点主要是：

- 毛利低；
- 依赖人力；
- 容易产生技术债；
- 顶尖工程师不愿长期做客户定制；
- 如果产品本身不强，FDE 只是在掩盖 PMF 不足。

这也是 FA 需要警惕的地方。

---

## 9. 对隐迹的直接启示

基于市场扫描，隐迹不能把自己放在“通用 FDE 服务”里，也不能和 OpenAI、AWS、Google Cloud 这类大厂比企业 AI 部署能力。

更合理的位置是：

> 垂直 AI 应用公司的前置交付团队，用 FDE 方法打穿货代 / 跨境 B2B 销售工作流，再沉淀为行业 AI 员工平台。

市场对隐迹有三点启示：

1. **FDE 是被验证的组织方法**：大厂和头部 AI 应用公司都在采用，说明方向不是伪需求。
2. **但 FDE 本身不是壁垒**：真正壁垒是行业 workflow、客户数据、长期记忆、执行闭环和复用率。
3. **垂直化比泛化更适合早期团队**：隐迹应该先学 Harvey / Decagon / Hebbia 这类垂直应用公司的路径，而不是学 AWS / Microsoft 做大而全企业 AI 部署。

---

## 10. 可以放入主报告的结论

当前 FDE 市场已经出现三层玩家：

1. **大厂层**：OpenAI、AWS、Microsoft、Google Cloud 等，用 FDE 把模型和云能力部署到战略客户。
2. **垂直应用层**：Harvey、Sierra、Decagon、Hebbia、Norm AI 等，用 FDE 帮行业 AI 产品进入真实工作流。
3. **服务 / 交付层**：咨询公司、系统集成商、传统软件商、AI Agent 服务商，用 FDE 类方法承接企业 AI 项目。

对内资 FA 来说，最值得找的是第二类：

> 有明确行业切口、有真实付费客户、有可量化 ROI，并能把前置交付沉淀为标准行业 Agent 产品的团队。

隐迹如果继续推进，应该争取从“AI memory infra + FDE 交付”收敛为：

> 货代 / 跨境 B2B 销售 AI 员工平台，FDE 是获客和产品打磨方式，LATRACE Memory Infra 是长期状态和客户记忆壁垒。

---

## 11. 公开资料入口

- AWS FDE 官方公告：https://www.aboutamazon.com/news/aws/aws-1-billion-forward-deployed-ai-engineers
- OpenAI careers 搜索 FDE：https://openai.com/careers/search/?q=forward+deployed+engineer
- Google Cloud GenAI FDE 岗位：https://www.google.com/about/careers/applications/jobs/results/127965694384841414-forward-deployed-engineer-iii-generative-ai-google-cloud
- Palantir FDSE 岗位：https://jobs.lever.co/palantir/dab396d4-2f14-4796-aac0-0d82883dccf0
- Palantir FDSE 文章：https://blog.palantir.com/a-day-in-the-life-of-a-palantir-forward-deployed-software-engineer-45ef2de257b1
- TechCrunch：Amazon launches $1B FDE org：https://techcrunch.com/2026/06/30/amazon-launches-new-1-billion-fde-org-following-openai-and-anthropic/
- TechCrunch：Microsoft Frontier Company：https://techcrunch.com/2026/07/02/microsoft-launches-its-own-ai-deployment-company-with-2-5-billion-commitment/
- a16z：Services-led growth / FDE：https://a16z.com/services-led-growth/
- Scale AI FDE 岗位：https://scale.com/careers/4593571005
- Hebbia careers：https://www.hebbia.com/careers
- Decagon careers：https://decagon.ai/careers
- Sierra careers：https://sierra.ai/careers
- Harvey company：https://www.harvey.ai/company
