# 抽象工厂方法

## 概括

**抽象工厂模式**提供一个接口，用于创建一系列相关或相互依赖的对象，而无需指定它们的具体类。

它用于解决 **一组产品族如何统一创建** 的问题，并确保产品之间的一致性（比如：UI 组件中的按钮和文本框属于同一风格）。

## 使用场景

适合以下场景：

* 一个系统需要使用多个“产品族”，且希望保持产品族之间的风格一致性；

* 系统需要在运行时决定使用哪个产品族；

* 需要对“创建一整组对象”的过程进行封装。

## 类图说明

```plaintext
        ┌────────────────────────┐
        │   AbstractFactory      │  ← 抽象工厂：定义创建一组产品的接口
        └──────────▲─────────────┘
                   │
     ┌─────────────┴────────────┐
     │                          │
ConcreteFactoryA        ConcreteFactoryB
  （如：Mac 风格）         （如：Windows 风格）

        ┌──────────────┐          ┌──────────────┐
        │ AbstractButton│         │ AbstractTextBox│ ← 抽象产品
        └──────▲───────┘          └──────▲───────┘
               │                             │
   ┌───────────┴──────────┐     ┌────────────┴───────────┐
   │   MacButton          │     │    MacTextBox          │
   └──────────────────────┘     └────────────────────────┘
   │ WindowsButton        │     │  WindowsTextBox        │
   └──────────────────────┘     └────────────────────────┘

```

## 使用示例

我们要实现一个可以根据系统风格（Mac / Windows）生产统一风格的 UI 组件：按钮和文本框。

1. 抽象产品接口

```java
public interface Button {
    void paint();
}

public interface TextBox {
    void draw();
}


```

2. 具体产品类

```java
// Mac 风格
public class MacButton implements Button {
    public void paint() {
        System.out.println("绘制 Mac 风格的按钮");
    }
}

public class MacTextBox implements TextBox {
    public void draw() {
        System.out.println("绘制 Mac 风格的文本框");
    }
}

// Windows 风格
public class WindowsButton implements Button {
    public void paint() {
        System.out.println("绘制 Windows 风格的按钮");
    }
}

public class WindowsTextBox implements TextBox {
    public void draw() {
        System.out.println("绘制 Windows 风格的文本框");
    }
}


```

3. 抽象工厂接口

```java
public interface GUIFactory {
    Button createButton();
    TextBox createTextBox();
}


```

4. 具体工厂类

```java
public class MacFactory implements GUIFactory {
    public Button createButton() {
        return new MacButton();
    }

    public TextBox createTextBox() {
        return new MacTextBox();
    }
}

public class WindowsFactory implements GUIFactory {
    public Button createButton() {
        return new WindowsButton();
    }

    public TextBox createTextBox() {
        return new WindowsTextBox();
    }
}



```

5. 客户端调用

```java
public class Application {
    private Button button;
    private TextBox textBox;

    public Application(GUIFactory factory) {
        button = factory.createButton();
        textBox = factory.createTextBox();
    }

    public void render() {
        button.paint();
        textBox.draw();
    }

    public static void main(String[] args) {
        GUIFactory factory;

        String os = "Mac"; // 可改为 "Windows"
        if (os.equals("Mac")) {
            factory = new MacFactory();
        } else {
            factory = new WindowsFactory();
        }

        Application app = new Application(factory);
        app.render();
    }
}


```

## 优缺点分析

**✅  优点**

| 优点            | 说明                                      |
| ------------- | --------------------------------------- |
| **1. 产品族一致性** | 抽象工厂可以保证一组相关产品（如按钮和文本框）风格一致，不会混用不兼容的产品。 |
| **2. 解耦具体类**  | 客户端只依赖接口，不依赖具体实现类，符合**依赖倒置原则**，方便维护和扩展。 |
| **3. 符合开闭原则** | 添加新的产品族，只需增加一个新的具体工厂类，不影响已有代码结构。        |
| **4. 更高层的封装** | 将产品“组”的创建过程统一封装，有利于整体构建更一致、更模块化的系统结构。   |

**❌ 缺点**

| 缺点                | 说明                                                            |
| ----------------- | ------------------------------------------------------------- |
| **1. 扩展产品等级结构困难** | 如果要在所有产品族中添加一个新产品（比如增加 Slider），**必须修改所有工厂接口和所有具体工厂类**，违反开闭原则。 |
| **2. 系统复杂度提高**    | 为每一个产品族都需要定义多个类（接口 + 实现 + 工厂），结构较重，**不适合产品结构简单的系统**。          |
| **3. 灵活性差于组合**    | 抽象工厂天生强调“产品组的一致性”，但现实中有时需要不同厂商的组件混用，这种模式反而受限。                 |

## 与工厂模式的区别

| 对比点         | 工厂方法模式             | 抽象工厂模式                         |
| ----------- | ------------------ | ------------------------------ |
| **解决问题的粒度** | 创建一个“产品”的过程        | 创建“一组产品”的过程                    |
| **产品数量**    | 一个工厂对应一个产品         | 一个工厂创建多个相关产品                   |
| **扩展方式**    | 添加新产品：创建新工厂 + 新产品类 | 添加新产品族：创建一组新产品类 + 新工厂类         |
| **结构复杂度**   | 中等                 | 较高，结构更复杂                       |
| **例子**      | 日志系统只创建 Logger 实例  | UI 工厂创建 Button、TextBox 等多个组件实例 |

## 总结

抽象工厂是一种超级工厂，它不仅生产一个产品，而是生产多个相关产品对象，使得客户端能以统一的方式使用这些对象，而不需要关心其具体实现。它是实现产品“风格一致性”的利器。
