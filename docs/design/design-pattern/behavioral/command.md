# 命令模式

命令（Command）把一次请求及其参数封装成对象，使调用入口与执行逻辑可以分别维护。编辑器按钮可以提交“在位置 2 插入逗号”，历史管理器负责何时执行、是否记录；文本对象负责内容本身。队列、重试、审计和撤销可以围绕这个对象实现，但都需要额外合同。

![编辑命令与逐次执行历史](/design-pattern/patterns/command.svg)

## 请求对象与执行记录不是同一个东西

同一条“插入逗号”可以执行多次，每次的旧内容都不同。如果把 `previousText` 只保存在可复用的命令实例中，第二次执行就会覆盖第一次的撤销依据。应当区分不可变请求参数与每次执行产生的记录。

开灯的撤销也不一定是关灯：如果执行前灯已经开启且亮度为 40%，恢复旧状态应回到这个值。编辑器插入位置 2 的字符，也不能通过删除文末一个字符来撤销。逆操作要精确描述原来改变了什么；状态快照则要覆盖足够的恢复范围。

## 一个完整的编辑历史

下面的 `Replace` 同时表达插入、删除和替换：`start == end` 是插入，替换文本为空是删除。命令不保存旧内容；`Entry` 为每次成功执行保存前后快照，历史管理器在成功后才移动栈。示例为单线程内存编辑器，初始文本采用 `ABCD` 方便观察位置，最多保留 100 次历史。

保存为 `CommandDemo.java`，使用 Java 17+ 编译运行：

```java
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Objects;

public class CommandDemo {
    interface Edit {
        String apply(String before);
    }

    record Replace(int start, int end, String replacement) implements Edit {
        Replace {
            Objects.requireNonNull(replacement);
        }

        @Override
        public String apply(String before) {
            if (start < 0 || end < start || end > before.length()) {
                throw new IllegalArgumentException("编辑范围越界");
            }
            checkBoundary(before, start);
            checkBoundary(before, end);
            return before.substring(0, start) + replacement + before.substring(end);
        }

        private static void checkBoundary(String text, int position) {
            if (position > 0 && position < text.length()
                    && Character.isHighSurrogate(text.charAt(position - 1))
                    && Character.isLowSurrogate(text.charAt(position))) {
                throw new IllegalArgumentException("不能拆开UTF-16代理对");
            }
        }
    }

    record Entry(Edit command, String before, String after) {}

    static final class Editor {
        private String content;
        private final int limit;
        private final Deque<Entry> undo = new ArrayDeque<>();
        private final Deque<Entry> redo = new ArrayDeque<>();

        Editor(String initial, int limit) {
            this.content = Objects.requireNonNull(initial);
            if (limit < 1) throw new IllegalArgumentException("历史容量至少为1");
            this.limit = limit;
        }

        void execute(Edit command) {
            Objects.requireNonNull(command);
            String after = Objects.requireNonNull(command.apply(content));
            undo.push(new Entry(command, content, after));
            content = after;
            while (undo.size() > limit) undo.removeLast();
            redo.clear();
        }

        boolean undo() {
            if (undo.isEmpty()) return false;
            Entry entry = undo.peek();
            if (!content.equals(entry.after())) {
                throw new IllegalStateException("当前内容已偏离历史");
            }
            content = entry.before();
            undo.pop();
            redo.push(entry);
            return true;
        }

        boolean redo() {
            if (redo.isEmpty()) return false;
            Entry entry = redo.peek();
            if (!content.equals(entry.before())) {
                throw new IllegalStateException("当前内容已偏离历史");
            }
            content = entry.after();
            redo.pop();
            undo.push(entry);
            return true;
        }

        String content() { return content; }
        int undoSize() { return undo.size(); }
    }

    public static void main(String[] args) {
        Editor editor = new Editor("ABCD", 100);
        Replace insert = new Replace(2, 2, ",");
        editor.execute(insert);
        editor.execute(insert);
        expect(editor.content(), "AB,,CD");
        editor.undo();
        expect(editor.content(), "AB,CD");
        editor.undo();
        expect(editor.content(), "ABCD");
        editor.redo();
        expect(editor.content(), "AB,CD");

        int history = editor.undoSize();
        try {
            editor.execute(new Replace(99, 99, "!"));
            throw new AssertionError("越界必须失败");
        } catch (IllegalArgumentException expected) {
            expect(editor.content(), "AB,CD");
            if (editor.undoSize() != history) throw new AssertionError("失败污染历史");
        }
        editor.execute(new Replace(0, 2, "Y"));
        expect(editor.content(), "Y,CD");
        if (editor.redo()) throw new AssertionError("新编辑后旧重做分支应清空");

        Editor bounded = new Editor("", 2);
        bounded.execute(new Replace(0, 0, "A"));
        bounded.execute(new Replace(1, 1, "B"));
        bounded.execute(new Replace(2, 2, "C"));
        bounded.undo();
        bounded.undo();
        if (bounded.undo()) throw new AssertionError("历史容量未限制");
        expect(bounded.content(), "A");
        System.out.println("插入、逐次撤销、重做、失败不入历史与容量限制通过");
    }

    static void expect(String actual, String expected) {
        if (!actual.equals(expected)) throw new AssertionError(actual);
    }
}
```

重做使用已保存的 `after` 快照，不重新触发网络请求或重新读取时间。完整快照容易理解，但内存成本与文本大小、历史容量有关，真实编辑器可改用差异记录或持久化数据结构；容量限制也不能只按条数估算字节占用。

索引采用 Java 的 UTF-16 单元，代码防止拆开代理对，但没有实现字素簇或光标布局规则。多人协作编辑还需要版本冲突处理、操作变换或 CRDT，不能靠比较字符串就替代并发合并。本例只接受受信任的本地 `Edit` 实现，其 `apply()` 应当是没有外部副作用的计算。

## 异步任务需要数据合同

编辑器可以直接持有对象引用；跨进程队列应保存可校验的数据，而不是序列化数据库连接、闭包或当前线程上下文。例如导出请求可包含：

```json
{
  "schemaVersion": 1,
  "commandId": "export-001",
  "type": "CreateOrderExport",
  "tenantId": "tenant-demo",
  "format": "CSV",
  "range": { "from": "2026-10-01", "to": "2026-10-02" }
}
```

处理器在受信任的身份上下文中校验租户范围、参数、命令类型与版本，再决定接受。JSON里的 `tenantId` 不是授权证据；排队期间权限和数据可能变化，执行时采用提交时授权还是重新授权，需要明确业务规则并防止跨租户读取。

可靠执行至少要区分“已受理、运行中、成功、失败、结果未知”，保存命令标识和结果。消息重复投递时，幂等键应在业务范围内唯一，并与副作用使用能满足一致性的存储合同；单独在内存 Set 里记一个 ID，既不能抗重启，也不能保证和外部操作同步提交。相同键携带不同参数时应当拒绝或报告冲突。

线程池只提供进程内调度，进程退出后内存命令可能丢失。优先级队列也不会自动改变已经提交到另一条执行队列里的任务次序，更不会抢占已经运行的操作；还需定义容量、拒绝、饥饿、取消和关闭时如何等待在途任务。

## 撤销、回滚与补偿的边界

| 操作 | 恢复机制 | 适用边界 |
| --- | --- | --- |
| 本地文本修改 | 保存的前态或精确逆操作 | 独占文档、历史仍有效 |
| 同一数据库事务中的修改 | 数据库事务回滚 | 使用同一事务与连接管理合同 |
| 已提交的错误业务记录 | 新的更正操作并保留审计 | 不能把补偿删除当作事务回滚 |
| 已发送通知或已扣款 | 撤回能力、退款或人工补偿 | 外部事实不能由恢复本地字段消除 |
| 一组宏命令部分失败 | 记录已成功项，按明确规则补偿 | 逆序调用也不保证原子性或补偿必定成功 |

一次扣款超时可能是对方已成功、响应丢失，此时结果未知。立即执行“撤销”或换渠道重试都可能造成重复扣款或错误退款，应先按幂等标识查询。命令日志也不等于事件日志：命令表达请求意图，事件表达已经发生的事实；重放旧命令可能受当前规则影响并重复副作用。

## 失败与验收

本地编辑要检查插入中间位置、删除、替换、连续执行同一命令、空历史、失败不入历史、新编辑清空重做，以及达到历史上限后的行为。撤销或重做失败时，不能先永久弹出记录再忽略异常，否则恢复线索会丢失。

异步任务要验证重复投递、进程重启、超时未知、执行中取消和宏命令部分完成。关闭执行器后需等待在途任务结束，再清理它们仍会使用的资源；对象池只能在命令已不被执行记录或异步任务引用后回收，否则历史可能指向已经被改写的对象。

当请求只是一条同步调用，且无需调度、历史、审计或多入口复用时，直接方法调用通常已经足够。算法切换参见[策略](./strategy)，恢复状态参见[备忘录](./memento)，可靠消息和事务边界参见[事件驱动架构](../../architecture/event-driven-architecture)。
