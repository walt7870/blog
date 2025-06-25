# 工厂方法

## 概括

**建造者模式**将一个复杂对象的构建过程与其表示分离，使得同样的构建过程可以创建不同的表示。
简言之，就是用一个“建造者”一步步构造复杂对象，客户端只需指定建造步骤，不用关心内部细节。
建造者模式专注于分步构建复杂对象，通过封装建造细节实现产品的灵活多样化，是解决复杂对象创建的有效设计方案。

## 使用场景

建造者模式适用于以下场景：

* 对象构建过程复杂，包含多个部件或步骤；

* 需要灵活地创建不同配置或不同表现形式的对象；

* 希望构建过程和表示解耦，便于复用和扩展；

* 构造过程稳定，但产品变化较多。

## 类图说明

```plaintext
    ┌──────────────┐
    │   Director   │  ← 指挥者，控制构建过程
    └───────┬──────┘
            │
   ┌────────┴─────────┐
   │      Builder      │  ← 抽象建造者，定义构建步骤
   └────────┬─────────┘
            │
 ┌──────────┴──────────┐
 │                     │
ConcreteBuilderA   ConcreteBuilderB  ← 具体建造者，实现步骤
         │
         ▼
      Product          ← 最终复杂对象


```

## 使用示例

以组装汽车场景为例。



1. 产品类（复杂对象）

```java
public class Car {
    private String engine;
    private String wheels;
    private String color;

    public void setEngine(String engine) {
        this.engine = engine;
    }

    public void setWheels(String wheels) {
        this.wheels = wheels;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String toString() {
        return "Car [engine=" + engine + ", wheels=" + wheels + ", color=" + color + "]";
    }
}


```

2. 抽象建造者接口

```java
public interface CarBuilder {
    void buildEngine();
    void buildWheels();
    void paint();
    Car getCar();
}

```

3. 具体建造者实现

```java
public class SportsCarBuilder implements CarBuilder {
    private Car car = new Car();

    public void buildEngine() {
        car.setEngine("V8 引擎");
    }

    public void buildWheels() {
        car.setWheels("运动型轮胎");
    }

    public void paint() {
        car.setColor("红色");
    }

    public Car getCar() {
        return car;
    }
}

public class SUVCarBuilder implements CarBuilder {
    private Car car = new Car();

    public void buildEngine() {
        car.setEngine("V6 引擎");
    }

    public void buildWheels() {
        car.setWheels("越野轮胎");
    }

    public void paint() {
        car.setColor("黑色");
    }

    public Car getCar() {
        return car;
    }
}



```

4. 指挥者类

```java
public class Director {
    private CarBuilder builder;

    public Director(CarBuilder builder) {
        this.builder = builder;
    }

    public void construct() {
        builder.buildEngine();
        builder.buildWheels();
        builder.paint();
    }

    public Car getCar() {
        return builder.getCar();
    }
}



```

5. 客户端调用

```java
public class Client {
    public static void main(String[] args) {
        CarBuilder builder = new SportsCarBuilder();
        Director director = new Director(builder);

        director.construct();
        Car car = director.getCar();
        System.out.println(car);

        // 换成SUV
        builder = new SUVCarBuilder();
        director = new Director(builder);

        director.construct();
        car = director.getCar();
        System.out.println(car);
    }
}


```

## 优缺点分析

**✅ 优点**

| 优点              | 说明                             |
| --------------- | ------------------------------ |
| **1. 细节隔离**     | 将产品内部构建细节封装在具体建造者中，客户端不关心构建细节。 |
| **2. 复用性强**     | 通过不同具体建造者，复用相同构建过程，灵活创建不同产品。   |
| **3. 易于扩展**     | 新产品只需实现新的建造者即可，无需改动指挥者或客户端。    |
| **4. 控制复杂构建过程** | 将复杂对象构建步骤规范化，便于控制和管理。          |

**❌ 缺点**

| 缺点           | 说明                           |
| ------------ | ---------------------------- |
| **1. 类数量增加** | 每增加一个产品，就要增加相应的建造者类，系统类数量较多。 |
| **2. 复杂度较高** | 对于简单对象，使用建造者模式可能显得过于复杂和冗余。   |
