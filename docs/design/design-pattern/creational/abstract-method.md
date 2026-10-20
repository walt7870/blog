# 抽象工厂

抽象工厂提供一组相关产品的创建接口，让调用方整体切换产品族。它适合“这些对象要配套工作”的边界，例如同一套界面主题的按钮与输入框；只有一种产品时，通常无需产品族结构。

![抽象工厂按主题成套创建按钮与文本框](/design-pattern/patterns/abstract-factory.svg)

## 产品种类与产品族

按钮、文本框是不同产品种类，浅色、深色是不同产品族。新增一个主题，可以增加具体工厂与产品实现；新增一种控件，则需要调整工厂接口和所有相应实现。这是两个扩展方向，不能笼统说“新增需求都不用改旧代码”。

抽象工厂能把配套创建集中在同一处，但接口不会自动禁止混装。调用方若分别从两个工厂取得对象，仍可能破坏一致性；类型设计、装配约束与运行时校验要共同承担这项合同。

## 可运行示例

以下 Java 17+ 示例用主题名称验证产品搭配，不创建真实桌面控件。客户端只接收一个工厂，并从中取得两类产品。

```java
import java.util.List;

public final class AbstractFactoryDemo {
    enum Theme { LIGHT, DARK }

    interface Button {
        Theme theme();
    }

    interface TextBox {
        Theme theme();
    }

    interface WidgetFactory {
        Button createButton();
        TextBox createTextBox();
    }

    record ThemedButton(Theme theme) implements Button {}
    record ThemedTextBox(Theme theme) implements TextBox {}

    static final class LightFactory implements WidgetFactory {
        public Button createButton() {
            return new ThemedButton(Theme.LIGHT);
        }
        public TextBox createTextBox() {
            return new ThemedTextBox(Theme.LIGHT);
        }
    }

    static final class DarkFactory implements WidgetFactory {
        public Button createButton() {
            return new ThemedButton(Theme.DARK);
        }
        public TextBox createTextBox() {
            return new ThemedTextBox(Theme.DARK);
        }
    }

    static final class Application {
        private final Button button;
        private final TextBox textBox;

        Application(WidgetFactory factory) {
            button = factory.createButton();
            textBox = factory.createTextBox();
            if (button.theme() != textBox.theme()) {
                throw new IllegalArgumentException("产品族不一致");
            }
        }

        String describe() {
            return button.theme() + ": 按钮与文本框配套";
        }
    }

    public static void main(String[] args) {
        for (WidgetFactory factory :
                List.of(new LightFactory(), new DarkFactory())) {
            System.out.println(new Application(factory).describe());
        }
    }
}
```

使用 `javac AbstractFactoryDemo.java && java AbstractFactoryDemo` 运行，分别输出 LIGHT 与 DARK 的配套结果。示例用带主题字段的产品实现压缩重复代码；实际组件可以有不同绘制与交互实现，抽象工厂不要求所有产品必须共用一个具体类。

## 跨厂商组件不是天然产品族

对象存储、消息队列和数据库即使来自同一云厂商，也不意味着必须一起切换。只有它们之间确有兼容合同、租户上下文或事务要求，并且需要整套选择时，产品族才有意义。若需要自由混搭，独立端口与适配器通常更灵活。

反过来，工厂同名也不能保证兼容。网络客户端还可能依赖区域、凭据、协议版本和资源所有权。创建整套对象的中途失败时，应清理已经创建且由该工厂拥有的资源，不能留下半套可用状态。

## 验收与取舍

对每个具体工厂检查全部产品种类，验证主题或协议兼容、必需配置、创建失败及关闭责任。再故意混装不兼容产品，确认系统在明确的边界拒绝它，而不是运行到深处才失败。

当产品种类稳定、产品族会增加时，抽象工厂收益较明显；当产品种类本身频繁增删或无需配套时，额外接口与实现会放大维护成本。与[工厂方法](./factory-method.md)相比，区别是产品之间的关系与扩展方向，不是工厂类名称长短。
