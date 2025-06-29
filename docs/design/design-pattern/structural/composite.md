# 组合模式 (Composite Pattern)

## 概述

将对象组合成树形结构以表示"部分-整体"的层次结构，使得用户对单个对象和组合对象的使用具有一致性。

简单说，就是用树形结构来表示对象的组合关系，让客户端可以统一处理单个对象和对象组合，而无需关心处理的是单个对象还是组合对象。

组合模式通过将对象组织成树形结构，使得单个对象和组合对象的操作保持一致，适用于需要处理树形结构的场景，是面向对象设计中处理复杂层次结构的经典解决方案。

组合模式不仅适用于表示对象的层次结构，在实际工程中，它广泛应用于文件系统、GUI组件树、组织架构等场景，并可与迭代器等模式组合使用，构建灵活且易于扩展的系统。

## 使用场景

- 需要表示对象的部分-整体层次结构；

- 希望用户忽略组合对象与单个对象的不同，统一处理所有对象；

- 需要动态地添加、删除组合对象中的成员；

- 需要处理树形结构，如文件系统、菜单系统、组织架构等。

## 类图结构

```plaintext
       Component
      /    |    \
     /     |     \
    /      |      \
 Leaf   Composite  Leaf
           /\
          /  \
         /    \
      Leaf   Leaf
```

- Component：组件抽象类，定义组合中对象的通用接口

- Leaf：叶子节点，表示组合中的基本对象（没有子节点）

- Composite：组合节点，包含子组件，实现对子组件的相关操作

## 示例

**文件系统**
文件系统中有文件和目录，目录可以包含文件和其他目录，而文件是最基本的元素。我们希望能够统一处理文件和目录，例如计算大小、显示结构等。

### 1. 组件抽象类（Component）

```java
public abstract class FileSystemComponent {
    protected String name;
    
    public FileSystemComponent(String name) {
        this.name = name;
    }
    
    public abstract void display(String indent);
    public abstract long getSize();
    
    // 默认实现，叶子节点不需要这些方法
    public void add(FileSystemComponent component) {
        throw new UnsupportedOperationException();
    }
    
    public void remove(FileSystemComponent component) {
        throw new UnsupportedOperationException();
    }
    
    public FileSystemComponent getChild(int index) {
        throw new UnsupportedOperationException();
    }
}
```

### 2. 叶子节点（Leaf）

```java
public class File extends FileSystemComponent {
    private long size;
    
    public File(String name, long size) {
        super(name);
        this.size = size;
    }
    
    @Override
    public void display(String indent) {
        System.out.println(indent + "- File: " + name + " (" + size + " bytes)");
    }
    
    @Override
    public long getSize() {
        return size;
    }
}
```

### 3. 组合节点（Composite）

```java
public class Directory extends FileSystemComponent {
    private List<FileSystemComponent> children = new ArrayList<>();
    
    public Directory(String name) {
        super(name);
    }
    
    @Override
    public void add(FileSystemComponent component) {
        children.add(component);
    }
    
    @Override
    public void remove(FileSystemComponent component) {
        children.remove(component);
    }
    
    @Override
    public FileSystemComponent getChild(int index) {
        return children.get(index);
    }
    
    @Override
    public void display(String indent) {
        System.out.println(indent + "+ Directory: " + name + " (" + getSize() + " bytes)");
        for (FileSystemComponent component : children) {
            component.display(indent + "  ");
        }
    }
    
    @Override
    public long getSize() {
        long totalSize = 0;
        for (FileSystemComponent component : children) {
            totalSize += component.getSize();
        }
        return totalSize;
    }
}
```

### 客户端调用

```java
public class Client {
    public static void main(String[] args) {
        // 创建文件
        FileSystemComponent file1 = new File("document.txt", 100);
        FileSystemComponent file2 = new File("image.jpg", 2000);
        FileSystemComponent file3 = new File("movie.mp4", 5000);
        
        // 创建目录并添加文件
        FileSystemComponent docs = new Directory("Documents");
        docs.add(file1);
        
        FileSystemComponent media = new Directory("Media");
        media.add(file2);
        media.add(file3);
        
        // 创建根目录
        FileSystemComponent root = new Directory("Root");
        root.add(docs);
        root.add(media);
        
        // 显示整个文件系统结构
        root.display("");
        
        // 计算总大小
        System.out.println("\nTotal Size: " + root.getSize() + " bytes");
    }
}
```

## 优缺点分析

### ✅ 优点

| 优点                | 说明                                     |
| ------------------- | ---------------------------------------- |
| **1. 简化客户端代码** | 客户端可以一致地处理单个对象和组合对象     |
| **2. 易于添加新组件** | 新增组件类型不会影响现有代码结构           |
| **3. 更符合开闭原则** | 无需修改现有代码即可扩展系统功能           |
| **4. 表达层次结构**  | 自然地表达树形结构，使代码更直观           |

### ❌ 缺点

| 缺点                      | 说明                                     |
| ------------------------- | ---------------------------------------- |
| **1. 设计更加抽象复杂**    | 需要区分叶子和组合节点，增加了设计难度     |
| **2. 很难限制组件类型**    | 难以限制组合中的组件类型，可能导致类型安全问题 |
| **3. 可能导致系统设计过于一般化** | 为了一致性可能导致接口设计过于宽泛         |

## 和其他模式对比

| 模式       | 本质思想                   | 与组合模式的区别                       |
| ---------- | -------------------------- | -------------------------------------- |
| 装饰器模式 | 动态增强对象功能           | 关注对象功能扩展，不处理层次结构       |
| 桥接模式   | 抽象与实现分离，解耦结构   | 处理多维度变化，不关注部分-整体关系    |
| 组合模式   | 统一处理单个和组合对象     | 专注于表示部分-整体层次结构            |

## 在Spring中的应用

### 1. Spring Security中的过滤器链

Spring Security使用组合模式构建过滤器链，每个过滤器可以单独工作，也可以组合成链：

```java
// 抽象组件
public interface Filter {
    void doFilter(ServletRequest request, ServletResponse response, FilterChain chain);
}

// 具体过滤器（叶子节点）
public class AuthenticationFilter implements Filter { ... }
public class AuthorizationFilter implements Filter { ... }

// 组合节点
public class FilterChainProxy implements Filter {
    private List<Filter> filters;
    
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        // 依次调用所有过滤器
        for (Filter filter : filters) {
            filter.doFilter(request, response, chain);
        }
    }
}
```

这种设计允许灵活组合不同的安全过滤器，形成完整的安全链。

### 2. Spring的组合视图（CompositeView）

Spring MVC中的视图解析器使用组合模式来组合多个视图：

```java
// 视图接口（组件）
public interface View {
    void render(Map<String, ?> model, HttpServletRequest request, HttpServletResponse response);
}

// 具体视图（叶子）
public class JstlView implements View { ... }
public class ThymeleafView implements View { ... }

// 组合视图
public class CompositeView implements View {
    private List<View> views = new ArrayList<>();
    
    public void addView(View view) {
        views.add(view);
    }
    
    public void render(Map<String, ?> model, HttpServletRequest request, HttpServletResponse response) {
        for (View view : views) {
            view.render(model, request, response);
        }
    }
}
```

这允许将多个视图组合在一起，形成复杂的页面布局。

### 组合模式在UI框架中的应用

Swing、JavaFX等UI框架大量使用组合模式构建界面组件树：

```java
// 组件抽象（Component）
public abstract class Component {
    public void setVisible(boolean visible) { ... }
    public void repaint() { ... }
}

// 基本组件（Leaf）
public class Button extends Component { ... }
public class TextField extends Component { ... }

// 容器组件（Composite）
public class Panel extends Component {
    private List<Component> children = new ArrayList<>();
    
    public void add(Component component) {
        children.add(component);
    }
    
    @Override
    public void repaint() {
        // 先重绘自己
        super.repaint();
        // 再重绘所有子组件
        for (Component child : children) {
            child.repaint();
        }
    }
}
```

这种设计使得UI组件可以嵌套组合，形成复杂的界面结构，同时保持操作的一致性。

### 组合 + 访问者模式组合使用

组合模式经常与访问者模式结合使用，以便在不改变组件类的情况下，定义对组件结构的新操作。

#### 示例：报表生成系统

场景：需要对文件系统生成不同格式的报表（如HTML、JSON）

```java
// 访问者接口
public interface FileVisitor {
    void visit(File file);
    void visit(Directory directory);
}

// 具体访问者 - HTML报表生成器
public class HtmlReportVisitor implements FileVisitor {
    private StringBuilder report = new StringBuilder();
    
    public void visit(File file) {
        report.append("<li>File: ").append(file.getName())
              .append(" - ").append(file.getSize()).append(" bytes</li>\n");
    }
    
    public void visit(Directory directory) {
        report.append("<li>Directory: ").append(directory.getName()).append("<ul>\n");
        for (FileSystemComponent component : directory.getChildren()) {
            // 组件需要接受访问者
            component.accept(this);
        }
        report.append("</ul></li>\n");
    }
    
    public String getReport() {
        return "<html><body><ul>\n" + report.toString() + "</ul></body></html>";
    }
}

// 修改组件接口，添加accept方法
public abstract class FileSystemComponent {
    // ... 原有代码 ...
    public abstract void accept(FileVisitor visitor);
}

// 修改叶子节点
public class File extends FileSystemComponent {
    // ... 原有代码 ...
    
    @Override
    public void accept(FileVisitor visitor) {
        visitor.visit(this);
    }
}

// 修改组合节点
public class Directory extends FileSystemComponent {
    // ... 原有代码 ...
    
    @Override
    public void accept(FileVisitor visitor) {
        visitor.visit(this);
    }
    
    public List<FileSystemComponent> getChildren() {
        return children;
    }
}
```

客户端使用：

```java
public class Client {
    public static void main(String[] args) {
        // 构建文件系统 ...
        
        // 使用访问者生成HTML报表
        HtmlReportVisitor htmlVisitor = new HtmlReportVisitor();
        root.accept(htmlVisitor);
        System.out.println(htmlVisitor.getReport());
        
        // 可以轻松添加新的报表格式，如JSON报表
        JsonReportVisitor jsonVisitor = new JsonReportVisitor();
        root.accept(jsonVisitor);
        System.out.println(jsonVisitor.getReport());
    }
}
```

组合模式提供了树形结构，而访问者模式允许在不修改组件类的情况下添加新的操作，两者结合使系统既有良好的结构性又具备出色的扩展性。