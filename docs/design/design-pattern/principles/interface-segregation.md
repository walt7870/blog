# 接口隔离原则

接口隔离原则强调：客户端不应该被迫依赖它不使用的方法。接口应该按角色和能力拆小，而不是把所有功能塞进一个大接口。

![接口隔离原则示意图](/design-pattern/principles/isp.svg)

## 历史脉络

接口隔离原则在 SOLID 原则体系中被广泛使用。它反映的是面向对象设计中的一个朴素经验：接口越大，调用方和实现方之间的无关依赖越多，变化影响面越大。

## 准确理解

接口隔离不是接口越小越好，而是接口应该围绕调用方角色组织。一个后台管理页面只需要查询能力，就不应该依赖包含创建、删除、导出、审批等所有方法的大接口。

## 代码坏味道

- 实现类里有很多空方法。
- 实现类里大量抛 `UnsupportedOperationException`。
- 调用方只用一个方法，却依赖一个几十个方法的大接口。
- 接口一改，很多无关实现类都被迫修改。
- 一个接口混合读、写、审批、导出、运维等不同角色能力。

## 重构示例

问题接口：

```java
public interface UserService {
    User get(Long id);
    void create(User user);
    void delete(Long id);
    void export();
    void approve(Long id);
}
```

按角色拆分：

```java
public interface UserQueryService {
    User get(Long id);
}

public interface UserCommandService {
    void create(User user);
    void delete(Long id);
}

public interface UserApprovalService {
    void approve(Long id);
}

public interface UserExportService {
    void export();
}
```

查询页面只依赖 `UserQueryService`，审批流程只依赖 `UserApprovalService`。

## 落地步骤

1. 统计接口方法的调用方，按调用方角色分组。
2. 找出实现类不支持或不需要的方法。
3. 把读写、管理、审批、导出等能力拆成小接口。
4. 让实现类按能力实现多个接口。
5. 调整调用方依赖最小接口。

## 常见误区

- 拆得过碎，导致每个方法一个接口。
- 只从实现类角度拆，不从调用方角色角度拆。
- 接口名仍然宽泛，例如 `CommonService`、`BaseApi`。
- 拆分接口后没有调整调用方依赖，仍然注入大实现类。

## 判断标准

一个接口变化时，受影响的调用方是否都是相关角色。如果修改审批方法导致查询页面重新编译或测试失败，接口边界就不够隔离。
