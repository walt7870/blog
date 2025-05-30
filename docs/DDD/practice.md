---
title: DDD设计落地
author: Walt
date: 2022-08-07 11:13:44
---
## 统一业务语言

* 统一领域术语
* 统一领域行为

## 落地过程

* 业务分析
  在这个阶段需要集齐项目团队的成员主要包括领域专家、设计人员、开发人员等一起对业务问题域以及业务期望进行全面的梳理，梳理清楚业务中的统一语言，在业务领域中发现领域事件、领域对象及其对应的领域行为，搞清楚他们各自的关联关系。
* 战略设计
  通过DDD的理论，对业务进行领域划分构建领域模型，梳理出相应的限界上下文，通过统一的领域语言从战略层面进行领域划分以及构建领域模型。在构建领域模型的过程中需要梳理出对应的聚合、实体、以及值对象。
* 战术设计
  以领域模型为战术设计的输入，以限界上下文作为微服务划分的边界进行微服务拆分，在每个微服务中进行领域分层，实现领域模型对于代码的映射，从而实现DDD的真正落地实施
