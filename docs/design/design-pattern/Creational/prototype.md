# 原型模式

## 概括

原型模式是一种创建型设计模式，指通过复制（克隆）已有的实例来创建新对象，避免了重复复杂的初始化过程。

换句话说，就是用已有对象作为“原型”，通过拷贝生成新的对象。

原型模式通过复制已有对象来创建新实例，避免了复杂的初始化过程，适合对象创建成本高或动态对象需求的场景，但需注意拷贝的深浅问题。

## 使用场景

* 创建对象代价较大（如资源消耗大、初始化复杂），需要大量类似对象；

* 运行时动态指定对象类型，且对象结构相似；

* 需要动态加载或者动态创建对象时；

* 需要避免直接调用构造函数创建复杂对象。

## 类图说明

```plaintext
        ┌──────────────┐
        │    Prototype  │  ← 抽象原型，声明克隆接口
        └───────┬──────┘
                │
        ┌───────┴───────────┐
        │                   │
ConcretePrototypeA   ConcretePrototypeB   ← 具体原型，实现克隆方法

```

## 使用示例

1. 抽象原型接口（Java 通常使用 Cloneable）

```java
public abstract class Prototype implements Cloneable {
    public Prototype clone() {
        Prototype clone = null;
        try {
            clone = (Prototype) super.clone();  // 浅拷贝
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return clone;
    }
}


```

2. 具体原型类

```java
public class ConcretePrototype implements Prototype {
    private String field;

    public ConcretePrototype(String field) {
        this.field = field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public String getField() {
        return field;
    }

    @Override
    public Prototype clone() {
        return (Prototype) super.clone();  // 浅拷贝示例
    }

    public String toString() {
        return "ConcretePrototype{" + "field='" + field + '\'' + '}';
    }
}


```

3. 客户端调用示例

```java
public class Client {
    public static void main(String[] args) {
        ConcretePrototype original = new ConcretePrototype("原型对象");
        ConcretePrototype copy = (ConcretePrototype) original.clone();

        System.out.println(original);
        System.out.println(copy);

        copy.setField("克隆对象修改字段");
        System.out.println("修改克隆后：");
        System.out.println(original);
        System.out.println(copy);
    }
}
```

## 优缺点分析

**✅ 优点**

| 优点            | 说明                    |
| ------------- | --------------------- |
| **1. 性能提高**   | 通过克隆避免了重复创建和初始化，效率较高。 |
| **2. 动态获得对象** | 可以动态配置并创建产品对象，适应系统变化。 |
| **3. 简化对象创建** | 对象创建逻辑集中在原型对象中，易于维护。  |


**❌ 缺点**

| 缺点              | 说明                               |
| --------------- | -------------------------------- |
| **1. 克隆复杂**     | 深拷贝实现难度大，且浅拷贝可能导致共享引用。           |
| **2. 需要实现克隆接口** | Java 中需要实现 `Cloneable`，且克隆机制有局限。 |
| **3. 设计复杂度提升**  | 需要维护一个完整的原型类层次结构。                |

## 深浅拷贝区别



浅拷贝：拷贝对象本身，但内部引用对象地址不变，多个对象共享内部对象，可能引发问题。



深拷贝：同时拷贝对象及其所有引用的对象，完全独立，代价较大。

示例：
假设有一个Person类，包含一个引用类型字段Address，我们需要实现深拷贝，使得克隆对象与原对象的引用字段互不影响。
1. Address 类（被引用对象）
```java
import java.io.Serializable;

public class Address implements Serializable, Cloneable {
    private String city;

    public Address(String city) {
        this.city = city;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    @Override
    protected Address clone() throws CloneNotSupportedException {
        return (Address) super.clone();
    }

    @Override
    public String toString() {
        return "Address{" + "city='" + city + '\'' + '}';
    }
}

```

2. Person 类（实现深拷贝）

```java
public class Person implements Cloneable {
    private String name;
    private Address address;

    public Person(String name, Address address) {
        this.name = name;
        this.address = address;
    }

    public String getName() {
        return name;
    }

    public Address getAddress() {
        return address;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAddress(Address address) {
        this.address = address;
    }

    // 实现深拷贝
    @Override
    protected Person clone() throws CloneNotSupportedException {
        Person cloned = (Person) super.clone();
        cloned.address = address.clone();  // 递归克隆引用对象
        return cloned;
    }

    @Override
    public String toString() {
        return "Person{" +
                "name='" + name + '\'' +
                ", address=" + address +
                '}';
    }
}

```

3. 测试代码
```java
public class Client {
    public static void main(String[] args) throws CloneNotSupportedException {
        Address addr = new Address("北京");
        Person p1 = new Person("张三", addr);

        Person p2 = p1.clone();

        System.out.println("原始对象：" + p1);
        System.out.println("克隆对象：" + p2);

        // 修改克隆对象的地址
        p2.getAddress().setCity("上海");
        System.out.println("\n修改克隆对象地址后：");
        System.out.println("原始对象：" + p1);
        System.out.println("克隆对象：" + p2);
    }
}

```

4. 运行结果
```
原始对象：Person{name='张三', address=Address{city='北京'}}
克隆对象：Person{name='张三', address=Address{city='北京'}}

修改克隆对象地址后：
原始对象：Person{name='张三', address=Address{city='北京'}}
克隆对象：Person{name='张三', address=Address{city='上海'}}

```

可以看到，修改克隆对象的address不会影响原对象，说明实现了深拷贝。

**说明：**
浅拷贝：super.clone()只复制对象本身，引用字段复制引用地址，多个对象共享同一个引用对象。

深拷贝：不仅复制对象本身，还对引用对象递归调用clone()，确保每个引用对象都是新实例。

在代码中，Person.clone()里调用了address.clone()实现了深拷贝。

所有参与深拷贝的引用对象都需要实现Cloneable接口并重写clone()方法。

5. 其他深拷贝实现方式

* 序列化反序列化：将对象序列化后再反序列化生成新对象，实现深拷贝，代码更简洁，但性能稍差。
* 第三方库：如 Apache Commons Lang 的 SerializationUtils.clone()。