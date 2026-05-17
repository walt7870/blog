# 所有权、借用与生命周期

所有权是 Rust 最核心的概念。它的目标不是让开发者记更多规则，而是让编译器在程序运行前确认：内存什么时候分配、谁负责释放、引用是否有效、可变访问是否安全。

## 为什么需要所有权

程序管理内存通常有三种方式：

| 方式 | 代表语言 | 特点 |
| --- | --- | --- |
| 手动管理 | C、C++ | 控制力强，但容易出现悬垂指针、重复释放、泄漏 |
| 垃圾回收 | Java、Go、C# | 开发体验好，但有运行时和停顿成本 |
| 所有权模型 | Rust | 编译期检查，大多数场景不需要 GC，也不需要手动释放 |

Rust 通过所有权规则让资源释放变得确定：当所有者离开作用域，值会被自动释放。

## 三条核心规则

1. Rust 中每个值都有一个所有者。
2. 任意时刻一个值只能有一个所有者。
3. 当所有者离开作用域，值会被丢弃。

```rust
fn main() {
    let value = String::from("hello");
    println!("{value}");
} // value 离开作用域，内存自动释放
```

## 移动

对堆上数据来说，赋值通常会移动所有权：

```rust
fn main() {
    let a = String::from("hello");
    let b = a;

    // println!("{a}"); // 编译错误：a 的所有权已移动到 b
    println!("{b}");
}
```

这不是浅拷贝后留下一个危险指针，而是明确告诉编译器：现在只有 `b` 拥有这段数据。这样可以避免两个变量在离开作用域时重复释放同一块内存。

## 拷贝

简单标量类型通常实现了 `Copy`，赋值会复制值：

```rust
let x = 10;
let y = x;

println!("{x}, {y}");
```

`i32` 这类固定大小数据在栈上复制成本低，不需要移动语义。常见 `Copy` 类型包括整数、浮点数、布尔、字符、只包含 `Copy` 字段的元组等。

## 克隆

如果确实需要复制堆上数据，可以显式调用 `clone`：

```rust
let a = String::from("hello");
let b = a.clone();

println!("{a}, {b}");
```

Rust 把可能昂贵的复制操作写得很明显，避免不经意产生隐藏成本。

## 借用

如果函数只需要读取一个值，不应该拿走所有权：

```rust
fn main() {
    let name = String::from("Rust");
    print_name(&name);
    println!("{name}");
}

fn print_name(value: &String) {
    println!("{value}");
}
```

`&name` 创建了不可变引用，也叫不可变借用。函数使用完引用后，原所有者仍然可以继续使用 `name`。

实际代码中更常写成 `&str`：

```rust
fn print_name(value: &str) {
    println!("{value}");
}
```

这样既能接收 `String` 的切片，也能接收字符串字面量。

## 可变借用

如果函数需要修改值，可以使用可变引用：

```rust
fn main() {
    let mut text = String::from("hello");
    append_world(&mut text);
    println!("{text}");
}

fn append_world(value: &mut String) {
    value.push_str(" world");
}
```

可变借用要求变量本身是 `mut`，并且同一时间只能有一个可变引用。

## 借用规则

Rust 借用检查器重点检查两条规则：

1. 可以同时有多个不可变引用。
2. 只能有一个可变引用，并且不能与不可变引用同时存在。

```rust
let mut value = String::from("hello");

let r1 = &value;
let r2 = &value;
println!("{r1}, {r2}");

let r3 = &mut value;
r3.push_str("!");
```

上面代码可以通过，因为 `r1`、`r2` 在最后一次使用后就不再活跃。Rust 的非词法生命周期会尽量根据真实使用范围判断借用是否结束。

## 引用不能悬垂

Rust 会阻止返回指向局部变量的引用：

```rust
// fn broken() -> &String {
//     let value = String::from("hello");
//     &value
// }
```

`value` 在函数结束时被释放，如果允许返回它的引用，调用方会拿到无效地址。Rust 在编译期拒绝这种代码。

## 生命周期

生命周期描述引用的有效范围。大多数时候编译器可以推断，只有在函数签名存在多个引用关系时才需要显式标注：

```rust
fn longest<'a>(left: &'a str, right: &'a str) -> &'a str {
    if left.len() >= right.len() {
        left
    } else {
        right
    }
}
```

`'a` 的含义不是让引用活得更久，而是告诉编译器：返回值的有效期不能超过 `left` 和 `right` 中较短的那个。

## 所有权和集合

集合会拥有其中的元素：

```rust
let mut names = Vec::new();
names.push(String::from("Alice"));
names.push(String::from("Bob"));

for name in &names {
    println!("{name}");
}

println!("count = {}", names.len());
```

`for name in &names` 是借用遍历；如果写成 `for name in names`，集合的所有权会被消费，后续不能再使用 `names`。

## 智能指针

所有权并不意味着只能有一个变量访问数据。Rust 提供了显式智能指针来表达不同共享模型：

| 类型 | 用途 |
| --- | --- |
| `Box<T>` | 把值放到堆上，单一所有者 |
| `Rc<T>` | 单线程引用计数共享所有权 |
| `Arc<T>` | 多线程原子引用计数共享所有权 |
| `RefCell<T>` | 单线程运行时借用检查 |
| `Mutex<T>` | 多线程互斥访问共享数据 |

这些类型把成本和约束显式暴露出来，不会让共享变成默认行为。

## 常见心智模型

可以把 Rust 的资源管理想成一份“资产登记表”：

- 谁拥有这个值，谁负责它最终释放。
- 借用像临时查看或临时修改，不改变归属。
- 可变借用像独占编辑权限，同一时间不能多人编辑。
- 生命周期保证临时权限不会超过资产本身的存在时间。

## 学习建议

- 先接受编译器报错，不要急着用 `clone` 消除错误。
- 优先让函数接收引用，除非它确实要拥有或消费参数。
- 字符串参数优先考虑 `&str`，集合参数优先考虑切片 `&[T]`。
- 多线程共享状态时先考虑消息传递，再考虑 `Arc<Mutex<T>>`。
- 生命周期不是内存管理语法糖，而是引用关系说明。

## 参考资料

- Ownership in The Rust Book：https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
- References and Borrowing：https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html
- Lifetime Syntax：https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html
