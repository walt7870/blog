# 备忘录模式

备忘录（Memento）让对象自己创建和恢复快照，外部管理者只保存一个句柄，不必知道内部字段。编辑通知草稿时，可以在修改收件人和标题前保存检查点，试改后恢复；快照应由草稿解释，历史列表无需接触草稿内部结构。

![草稿快照的创建、保存与受控恢复](/design-pattern/patterns/memento.svg)

## 保存哪些状态，恢复到什么范围

快照必须覆盖一起变化的必要字段。只恢复文本却不恢复光标，或只恢复标题却漏掉收件人，可能产生不一致对象。反过来，文件句柄、数据库连接、锁和线程不能像普通业务数据一样复制后恢复，应重新获取并遵守各自生命周期。

备忘录解决封装与状态恢复，不自动提供数据库事务、崩溃恢复或外部动作撤销。通知草稿可以恢复旧收件人；已经寄出的邮件却不会随本地字段回退而从对方邮箱消失。订单支付和库存也不能通过恢复一个 Java 对象撤销外部事实。

`final List` 只是不能替换列表引用，不阻止增删元素。快照需要复制可变容器，并判断元素是否仍可变；包含循环引用或共享实体时，应先定义快照边界，而不是盲目递归复制整个对象图。

## 草稿与不透明检查点

下面用空接口暴露检查点句柄，具体快照类型是草稿的私有实现。草稿数据由不可变记录组成；收件人列表复制且元素为不可变字符串。快照带对象归属标记，不能拿 A 草稿的快照覆盖 B 草稿。

恢复采用当前版本检查，主动恢复旧内容仍产生新版本，避免把版本号一起倒退。历史保存器只管理稳定编号与有界强引用；编号被淘汰后明确报错，不会因数组下标移动而加载另一份快照。

保存为 `MementoDemo.java`，使用 Java 17+ 编译运行。它是同步内存示例，不发送邮件、不保存磁盘存档：

```java
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;

public class MementoDemo {
    interface Checkpoint {}

    static final class Draft {
        private record State(String title, List<String> recipients) {
            State {
                if (title == null || title.isBlank()) {
                    throw new IllegalArgumentException("标题不能为空");
                }
                recipients = List.copyOf(recipients);
                if (recipients.isEmpty() || recipients.stream().anyMatch(String::isBlank)) {
                    throw new IllegalArgumentException("收件人标识不能为空");
                }
            }
        }

        private record Saved(Object owner, State state) implements Checkpoint {}
        record View(String title, List<String> recipients, long version) {}

        private final Object owner = new Object();
        private State state;
        private long version;

        Draft(String title, List<String> recipients) {
            state = new State(title, recipients);
        }

        synchronized View view() {
            return new View(state.title(), state.recipients(), version);
        }

        synchronized void edit(String title, List<String> recipients, long expectedVersion) {
            checkVersion(expectedVersion);
            State updated = new State(title, recipients);
            long nextVersion = Math.addExact(version, 1);
            state = updated;
            version = nextVersion;
        }

        synchronized Checkpoint save() {
            return new Saved(owner, state);
        }

        synchronized void restore(Checkpoint checkpoint, long expectedVersion) {
            checkVersion(expectedVersion);
            if (!(checkpoint instanceof Saved saved) || saved.owner() != owner) {
                throw new IllegalArgumentException("检查点不属于此草稿");
            }
            long nextVersion = Math.addExact(version, 1);
            state = saved.state();
            version = nextVersion;
        }

        private void checkVersion(long expectedVersion) {
            if (version != expectedVersion) throw new IllegalStateException("草稿版本已变化");
        }
    }

    static final class CheckpointStore {
        private final int limit;
        private final Map<Long, Checkpoint> saved = new LinkedHashMap<>();
        private long sequence;

        CheckpointStore(int limit) {
            if (limit < 1) throw new IllegalArgumentException("容量至少为1");
            this.limit = limit;
        }

        long add(Checkpoint checkpoint) {
            Objects.requireNonNull(checkpoint);
            long id = Math.addExact(sequence, 1);
            saved.put(id, checkpoint);
            sequence = id;
            if (saved.size() > limit) saved.remove(saved.keySet().iterator().next());
            return id;
        }

        Checkpoint get(long id) {
            Checkpoint checkpoint = saved.get(id);
            if (checkpoint == null) throw new NoSuchElementException("检查点不存在或已淘汰");
            return checkpoint;
        }
    }

    public static void main(String[] args) {
        List<String> source = new ArrayList<>(List.of("member-a"));
        Draft draft = new Draft("发布通知", source);
        source.add("member-b");
        if (draft.view().recipients().size() != 1) throw new AssertionError("共享了外部列表");
        CheckpointStore history = new CheckpointStore(2);
        long original = history.add(draft.save());
        draft.edit("测试标题", List.of("member-c"), 0);
        draft.restore(history.get(original), 1);
        if (!draft.view().title().equals("发布通知")
                || !draft.view().recipients().equals(List.of("member-a"))
                || draft.view().version() != 2) {
            throw new AssertionError("恢复不完整或版本倒退");
        }
        Draft other = new Draft("另一份草稿", List.of("member-z"));
        try {
            other.restore(history.get(original), 0);
            throw new AssertionError("不能跨草稿恢复");
        } catch (IllegalArgumentException expected) {
            if (other.view().version() != 0) throw new AssertionError("拒绝后修改了版本");
        }
        history.add(draft.save());
        history.add(draft.save());
        try {
            history.get(original);
            throw new AssertionError("旧编号应已淘汰");
        } catch (NoSuchElementException expected) {
            System.out.println(expected.getMessage());
        }
        System.out.println(draft.view());
    }
}
```

`CheckpointStore` 是单线程管理者；草稿的同步方法保护本机版本与状态一起更新，但不会自动让外部保存器线程安全。恢复前若有人已修改草稿，过期的 `expectedVersion` 会失败，调用方必须重新确认目标版本；不能为了“恢复成功”无条件覆盖他人的新内容。

当前 `owner` 是进程内对象标记，适合本地检查点，不适合直接序列化跨重启加载。公开 `View` 返回的是不可变视图，检查点本身不提供内部字段读取接口。语言反射等特权能力不属于这里的封装保证，敏感内容仍须按存储与访问权限保护。

## 快照、命令与历史如何配合

[命令](./command)记录做什么；备忘录记录恢复所需的状态。命令可以在执行前保存备忘录，执行成功后再把前后检查点加入历史。若在执行前先移动历史游标，操作失败后游标与实际对象就可能脱节。

完整撤销重做还需要当前游标、成功后入历史、新编辑清空旧重做分支和容量策略；只放一个 `save()` 方法并不具备这些能力。不同检查点之间若存在共享不可变结构，可以复用；不能简单断言“命令总比备忘录省内存”或“有引用类型就必须深拷贝一切”。

增量快照应明确新增、修改与删除的区别。“键不存在”与“键的值为 null”不是同一个状态；只遍历当前键会漏掉删除项。恢复一段增量还依赖正确的基线、顺序和版本，丢失中间片段可能使后续检查点都不可用。

## 持久化与异步保存

| 问题 | 必须明确的合同 | 常见误用 |
| --- | --- | --- |
| 历史容量 | 条数、字节预算与淘汰顺序 | 弱引用被回收后仍承诺可恢复 |
| 异步捕获 | 在一致性边界先冻结快照，再交给后台 | 后台读取的已是下一版对象 |
| 保存完成 | 入队、编码完成与持久化分别确认 | 入队 Future 成功就显示“已保存” |
| 版本兼容 | 文档标识、schema、校验和迁移规则 | 只写常量版本但从不检查 |
| 文件发布 | 临时文件、关闭与符合文件系统合同的发布 | 直接截断正式存档，崩溃后两版都损坏 |
| 多层快照 | 共同一致性时点与依赖范围 | UI和数据各取最新，实际来自不同时刻 |

不要让同一个单线程池中的常驻消费者阻塞等待，而把入队生产者也提交到这个线程池：消费者不结束，生产者就没有机会运行。即使使用不同线程，也要定义队列容量、停机时排空或拒绝、保存失败如何向调用方传播。

持久化时优先使用有明确字段的格式和受控解析，验证文档归属、版本、大小和字段不变量。不要直接反序列化不可信的 Java 对象。压缩减少的是编码体积，不代表真实堆占用按同一比例下降；解压还应设置输出容量限制。`System.gc()` 不是可靠的容量管理或保存保证。

## 失败与验收

检查保存后继续修改是否影响旧快照，外部列表变化能否污染状态，快照能否跨对象误用，恢复后版本是否单调递增，以及过期版本、非法字段和淘汰编号是否明确拒绝。完整恢复应验证所有关联字段，不能只对比标题。

对磁盘存档再验证中断写入、编码损坏、旧schema迁移、超大解压数据、重启后的编号冲突和真实加载结果。文件名的字典排序不等于数值或时间顺序，不能将编号 10 排在 2 前面后错误淘汰；保存和删除还要受固定目录与文档归属约束。
