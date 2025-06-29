# 策略模式 (Strategy Pattern)

## 概述

策略模式是一种行为型设计模式，它定义了一系列算法，把它们一个个封装起来，并且使它们可相互替换。策略模式让算法的变化独立于使用算法的客户端。

### 核心思想

- **算法封装**：将不同的算法封装在独立的策略类中
- **动态切换**：在运行时可以动态地改变对象的行为
- **开闭原则**：对扩展开放，对修改关闭

## 使用场景

策略模式适用于以下情况：

1. **多种算法实现**：一个类定义了多种行为，并且这些行为在这个类的操作中以多个条件语句的形式出现
2. **算法动态切换**：需要在运行时动态地在几种算法中选择一种
3. **避免条件语句**：有许多相关的类仅仅是行为有异，需要动态地在几种行为中切换
4. **算法独立变化**：算法使用的数据不应该被客户端知道

## UML 类图

```
┌─────────────────┐
│    Context      │
├─────────────────┤
│ - strategy      │
├─────────────────┤
│ + setStrategy() │
│ + execute()     │
└─────────┬───────┘
          │
          │ uses
          ▼
┌─────────────────┐
│   <<interface>> │
│    Strategy     │
├─────────────────┤
│ + execute()     │
└─────────┬───────┘
          │
          │ implements
          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ConcreteStrategyA│    │ ConcreteStrategyB│    │ ConcreteStrategyC│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ + execute()     │    │ + execute()     │    │ + execute()     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心组件

### 1. Strategy（策略接口）
定义所有具体策略的通用接口。

### 2. ConcreteStrategy（具体策略）
实现了策略接口的具体算法。

### 3. Context（上下文）
维护一个对策略对象的引用，定义了让策略对象访问它的数据的接口。

## 实现示例

### 示例1：支付系统

```java
// 策略接口
public interface PaymentStrategy {
    void pay(double amount);
    boolean validate();
}

// 具体策略：信用卡支付
public class CreditCardPayment implements PaymentStrategy {
    private String cardNumber;
    private String cvv;
    private String expiryDate;
    
    public CreditCardPayment(String cardNumber, String cvv, String expiryDate) {
        this.cardNumber = cardNumber;
        this.cvv = cvv;
        this.expiryDate = expiryDate;
    }
    
    @Override
    public boolean validate() {
        // 验证信用卡信息
        return cardNumber != null && cardNumber.length() == 16 
            && cvv != null && cvv.length() == 3;
    }
    
    @Override
    public void pay(double amount) {
        if (validate()) {
            System.out.println("使用信用卡支付: $" + amount);
            System.out.println("卡号: ****-****-****-" + cardNumber.substring(12));
        } else {
            throw new IllegalStateException("信用卡信息无效");
        }
    }
}

// 具体策略：PayPal支付
public class PayPalPayment implements PaymentStrategy {
    private String email;
    private String password;
    
    public PayPalPayment(String email, String password) {
        this.email = email;
        this.password = password;
    }
    
    @Override
    public boolean validate() {
        // 验证PayPal账户
        return email != null && email.contains("@") 
            && password != null && password.length() >= 6;
    }
    
    @Override
    public void pay(double amount) {
        if (validate()) {
            System.out.println("使用PayPal支付: $" + amount);
            System.out.println("账户: " + email);
        } else {
            throw new IllegalStateException("PayPal账户信息无效");
        }
    }
}

// 具体策略：银行转账
public class BankTransferPayment implements PaymentStrategy {
    private String accountNumber;
    private String routingNumber;
    
    public BankTransferPayment(String accountNumber, String routingNumber) {
        this.accountNumber = accountNumber;
        this.routingNumber = routingNumber;
    }
    
    @Override
    public boolean validate() {
        return accountNumber != null && accountNumber.length() >= 10
            && routingNumber != null && routingNumber.length() == 9;
    }
    
    @Override
    public void pay(double amount) {
        if (validate()) {
            System.out.println("使用银行转账支付: $" + amount);
            System.out.println("账户: ****" + accountNumber.substring(accountNumber.length() - 4));
        } else {
            throw new IllegalStateException("银行账户信息无效");
        }
    }
}

// 上下文类：购物车
public class ShoppingCart {
    private List<Item> items;
    private PaymentStrategy paymentStrategy;
    
    public ShoppingCart() {
        this.items = new ArrayList<>();
    }
    
    public void addItem(Item item) {
        items.add(item);
    }
    
    public void removeItem(Item item) {
        items.remove(item);
    }
    
    public double calculateTotal() {
        return items.stream()
                   .mapToDouble(Item::getPrice)
                   .sum();
    }
    
    public void setPaymentStrategy(PaymentStrategy paymentStrategy) {
        this.paymentStrategy = paymentStrategy;
    }
    
    public void checkout() {
        if (paymentStrategy == null) {
            throw new IllegalStateException("请选择支付方式");
        }
        
        double total = calculateTotal();
        paymentStrategy.pay(total);
        
        // 清空购物车
        items.clear();
        System.out.println("支付完成，订单已处理");
    }
}

// 商品类
public class Item {
    private String name;
    private double price;
    
    public Item(String name, double price) {
        this.name = name;
        this.price = price;
    }
    
    public String getName() { return name; }
    public double getPrice() { return price; }
}

// 使用示例
public class PaymentExample {
    public static void main(String[] args) {
        ShoppingCart cart = new ShoppingCart();
        
        // 添加商品
        cart.addItem(new Item("笔记本电脑", 999.99));
        cart.addItem(new Item("鼠标", 29.99));
        
        // 使用信用卡支付
        cart.setPaymentStrategy(new CreditCardPayment(
            "1234567890123456", "123", "12/25"));
        cart.checkout();
        
        // 重新添加商品
        cart.addItem(new Item("键盘", 79.99));
        
        // 切换到PayPal支付
        cart.setPaymentStrategy(new PayPalPayment(
            "user@example.com", "password123"));
        cart.checkout();
    }
}
```

### 示例2：排序算法策略

```java
// 排序策略接口
public interface SortStrategy {
    void sort(int[] array);
    String getAlgorithmName();
}

// 具体策略：冒泡排序
public class BubbleSortStrategy implements SortStrategy {
    @Override
    public void sort(int[] array) {
        int n = array.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (array[j] > array[j + 1]) {
                    // 交换元素
                    int temp = array[j];
                    array[j] = array[j + 1];
                    array[j + 1] = temp;
                }
            }
        }
    }
    
    @Override
    public String getAlgorithmName() {
        return "冒泡排序";
    }
}

// 具体策略：快速排序
public class QuickSortStrategy implements SortStrategy {
    @Override
    public void sort(int[] array) {
        quickSort(array, 0, array.length - 1);
    }
    
    private void quickSort(int[] array, int low, int high) {
        if (low < high) {
            int pi = partition(array, low, high);
            quickSort(array, low, pi - 1);
            quickSort(array, pi + 1, high);
        }
    }
    
    private int partition(int[] array, int low, int high) {
        int pivot = array[high];
        int i = (low - 1);
        
        for (int j = low; j < high; j++) {
            if (array[j] <= pivot) {
                i++;
                int temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
        
        int temp = array[i + 1];
        array[i + 1] = array[high];
        array[high] = temp;
        
        return i + 1;
    }
    
    @Override
    public String getAlgorithmName() {
        return "快速排序";
    }
}

// 具体策略：归并排序
public class MergeSortStrategy implements SortStrategy {
    @Override
    public void sort(int[] array) {
        mergeSort(array, 0, array.length - 1);
    }
    
    private void mergeSort(int[] array, int left, int right) {
        if (left < right) {
            int mid = (left + right) / 2;
            mergeSort(array, left, mid);
            mergeSort(array, mid + 1, right);
            merge(array, left, mid, right);
        }
    }
    
    private void merge(int[] array, int left, int mid, int right) {
        int n1 = mid - left + 1;
        int n2 = right - mid;
        
        int[] leftArray = new int[n1];
        int[] rightArray = new int[n2];
        
        System.arraycopy(array, left, leftArray, 0, n1);
        System.arraycopy(array, mid + 1, rightArray, 0, n2);
        
        int i = 0, j = 0, k = left;
        
        while (i < n1 && j < n2) {
            if (leftArray[i] <= rightArray[j]) {
                array[k] = leftArray[i];
                i++;
            } else {
                array[k] = rightArray[j];
                j++;
            }
            k++;
        }
        
        while (i < n1) {
            array[k] = leftArray[i];
            i++;
            k++;
        }
        
        while (j < n2) {
            array[k] = rightArray[j];
            j++;
            k++;
        }
    }
    
    @Override
    public String getAlgorithmName() {
        return "归并排序";
    }
}

// 排序上下文
public class SortContext {
    private SortStrategy strategy;
    
    public void setStrategy(SortStrategy strategy) {
        this.strategy = strategy;
    }
    
    public void executeSort(int[] array) {
        if (strategy == null) {
            throw new IllegalStateException("请设置排序策略");
        }
        
        long startTime = System.nanoTime();
        strategy.sort(array);
        long endTime = System.nanoTime();
        
        System.out.println("使用 " + strategy.getAlgorithmName() + 
                          " 排序完成，耗时: " + (endTime - startTime) / 1000000.0 + " ms");
    }
    
    // 智能选择排序策略
    public void smartSort(int[] array) {
        if (array.length < 10) {
            setStrategy(new BubbleSortStrategy());
        } else if (array.length < 1000) {
            setStrategy(new QuickSortStrategy());
        } else {
            setStrategy(new MergeSortStrategy());
        }
        
        executeSort(array);
    }
}

// 使用示例
public class SortExample {
    public static void main(String[] args) {
        SortContext context = new SortContext();
        
        // 测试数据
        int[] smallArray = {64, 34, 25, 12, 22, 11, 90};
        int[] mediumArray = generateRandomArray(100);
        int[] largeArray = generateRandomArray(10000);
        
        // 小数组使用冒泡排序
        System.out.println("排序前: " + Arrays.toString(smallArray));
        context.setStrategy(new BubbleSortStrategy());
        context.executeSort(smallArray.clone());
        
        // 中等数组使用快速排序
        context.setStrategy(new QuickSortStrategy());
        context.executeSort(mediumArray.clone());
        
        // 大数组使用归并排序
        context.setStrategy(new MergeSortStrategy());
        context.executeSort(largeArray.clone());
        
        // 智能选择策略
        context.smartSort(generateRandomArray(50));
    }
    
    private static int[] generateRandomArray(int size) {
        Random random = new Random();
        return random.ints(size, 1, 1000).toArray();
    }
}
```

## 优缺点分析

### 优点

1. **算法可以自由切换**
   - 策略模式提供了管理相关算法族的办法
   - 可以在运行时动态地改变对象的行为

2. **避免使用多重条件判断**
   - 消除了大量的if-else或switch-case语句
   - 代码更加清晰和易于维护

3. **扩展性良好**
   - 增加新的策略非常容易，符合开闭原则
   - 不需要修改现有代码

4. **算法独立**
   - 每个策略都是独立的，便于单元测试
   - 算法的实现细节对客户端透明

### 缺点

1. **客户端必须知道所有的策略类**
   - 客户端需要了解各种策略的区别
   - 增加了客户端的复杂性

2. **策略类数量增多**
   - 每个策略都是一个类，会增加系统中类的数量
   - 可能导致系统更加复杂

3. **运行时开销**
   - 策略的切换可能带来一定的性能开销
   - 特别是在频繁切换策略的场景下

## 与其他模式的对比

### 策略模式 vs 状态模式

| 特性 | 策略模式 | 状态模式 |
|------|----------|----------|
| **目的** | 封装算法，使算法可以互换 | 封装状态，使状态转换更清晰 |
| **关注点** | 算法的选择和执行 | 状态的转换和行为 |
| **切换方式** | 客户端主动切换 | 状态自动转换 |
| **依赖关系** | 策略之间相互独立 | 状态之间可能有依赖 |

### 策略模式 vs 命令模式

| 特性 | 策略模式 | 命令模式 |
|------|----------|----------|
| **目的** | 封装算法 | 封装请求 |
| **关注点** | 如何执行 | 何时执行 |
| **撤销操作** | 不支持 | 支持撤销和重做 |
| **参数化** | 算法参数化 | 对象参数化 |

## 实际应用场景

### 1. Web框架中的路由策略

```java
// 路由策略接口
public interface RoutingStrategy {
    String route(HttpRequest request);
}

// 基于路径的路由
public class PathBasedRouting implements RoutingStrategy {
    private Map<String, String> routes = new HashMap<>();
    
    public PathBasedRouting() {
        routes.put("/api/users", "UserController");
        routes.put("/api/orders", "OrderController");
    }
    
    @Override
    public String route(HttpRequest request) {
        return routes.get(request.getPath());
    }
}

// 基于注解的路由
public class AnnotationBasedRouting implements RoutingStrategy {
    @Override
    public String route(HttpRequest request) {
        // 通过注解扫描找到对应的控制器
        return findControllerByAnnotation(request);
    }
    
    private String findControllerByAnnotation(HttpRequest request) {
        // 实现注解扫描逻辑
        return "AnnotatedController";
    }
}

// Web框架
public class WebFramework {
    private RoutingStrategy routingStrategy;
    
    public void setRoutingStrategy(RoutingStrategy strategy) {
        this.routingStrategy = strategy;
    }
    
    public void handleRequest(HttpRequest request) {
        String controller = routingStrategy.route(request);
        // 执行控制器逻辑
        System.out.println("路由到控制器: " + controller);
    }
}
```

### 2. 数据压缩策略

```java
// 压缩策略接口
public interface CompressionStrategy {
    byte[] compress(byte[] data);
    byte[] decompress(byte[] compressedData);
    String getCompressionType();
}

// ZIP压缩策略
public class ZipCompressionStrategy implements CompressionStrategy {
    @Override
    public byte[] compress(byte[] data) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {
            
            ZipEntry entry = new ZipEntry("data");
            zos.putNextEntry(entry);
            zos.write(data);
            zos.closeEntry();
            
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("ZIP压缩失败", e);
        }
    }
    
    @Override
    public byte[] decompress(byte[] compressedData) {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(compressedData);
             ZipInputStream zis = new ZipInputStream(bais);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            
            zis.getNextEntry();
            byte[] buffer = new byte[1024];
            int len;
            while ((len = zis.read(buffer)) > 0) {
                baos.write(buffer, 0, len);
            }
            
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("ZIP解压失败", e);
        }
    }
    
    @Override
    public String getCompressionType() {
        return "ZIP";
    }
}

// GZIP压缩策略
public class GzipCompressionStrategy implements CompressionStrategy {
    @Override
    public byte[] compress(byte[] data) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             GZIPOutputStream gzos = new GZIPOutputStream(baos)) {
            
            gzos.write(data);
            gzos.finish();
            
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("GZIP压缩失败", e);
        }
    }
    
    @Override
    public byte[] decompress(byte[] compressedData) {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(compressedData);
             GZIPInputStream gzis = new GZIPInputStream(bais);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            
            byte[] buffer = new byte[1024];
            int len;
            while ((len = gzis.read(buffer)) > 0) {
                baos.write(buffer, 0, len);
            }
            
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("GZIP解压失败", e);
        }
    }
    
    @Override
    public String getCompressionType() {
        return "GZIP";
    }
}

// 数据处理器
public class DataProcessor {
    private CompressionStrategy compressionStrategy;
    
    public void setCompressionStrategy(CompressionStrategy strategy) {
        this.compressionStrategy = strategy;
    }
    
    public byte[] processData(byte[] data) {
        if (compressionStrategy == null) {
            return data;
        }
        
        System.out.println("使用 " + compressionStrategy.getCompressionType() + " 压缩数据");
        byte[] compressed = compressionStrategy.compress(data);
        
        System.out.println("原始大小: " + data.length + " bytes");
        System.out.println("压缩后大小: " + compressed.length + " bytes");
        System.out.println("压缩率: " + String.format("%.2f%%", 
            (1.0 - (double)compressed.length / data.length) * 100));
        
        return compressed;
    }
    
    public byte[] restoreData(byte[] compressedData) {
        if (compressionStrategy == null) {
            return compressedData;
        }
        
        return compressionStrategy.decompress(compressedData);
    }
}
```

### 3. 缓存策略

```java
// 缓存策略接口
public interface CacheStrategy<K, V> {
    void put(K key, V value);
    V get(K key);
    void remove(K key);
    void clear();
    int size();
}

// LRU缓存策略
public class LRUCacheStrategy<K, V> implements CacheStrategy<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> cache;
    
    public LRUCacheStrategy(int capacity) {
        this.capacity = capacity;
        this.cache = new LinkedHashMap<K, V>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > capacity;
            }
        };
    }
    
    @Override
    public synchronized void put(K key, V value) {
        cache.put(key, value);
    }
    
    @Override
    public synchronized V get(K key) {
        return cache.get(key);
    }
    
    @Override
    public synchronized void remove(K key) {
        cache.remove(key);
    }
    
    @Override
    public synchronized void clear() {
        cache.clear();
    }
    
    @Override
    public synchronized int size() {
        return cache.size();
    }
}

// FIFO缓存策略
public class FIFOCacheStrategy<K, V> implements CacheStrategy<K, V> {
    private final int capacity;
    private final Map<K, V> cache;
    private final Queue<K> queue;
    
    public FIFOCacheStrategy(int capacity) {
        this.capacity = capacity;
        this.cache = new HashMap<>();
        this.queue = new LinkedList<>();
    }
    
    @Override
    public synchronized void put(K key, V value) {
        if (cache.containsKey(key)) {
            cache.put(key, value);
            return;
        }
        
        if (cache.size() >= capacity) {
            K oldestKey = queue.poll();
            cache.remove(oldestKey);
        }
        
        cache.put(key, value);
        queue.offer(key);
    }
    
    @Override
    public synchronized V get(K key) {
        return cache.get(key);
    }
    
    @Override
    public synchronized void remove(K key) {
        cache.remove(key);
        queue.remove(key);
    }
    
    @Override
    public synchronized void clear() {
        cache.clear();
        queue.clear();
    }
    
    @Override
    public synchronized int size() {
        return cache.size();
    }
}

// 缓存管理器
public class CacheManager<K, V> {
    private CacheStrategy<K, V> strategy;
    
    public CacheManager(CacheStrategy<K, V> strategy) {
        this.strategy = strategy;
    }
    
    public void setStrategy(CacheStrategy<K, V> strategy) {
        // 迁移现有数据到新策略
        if (this.strategy != null && this.strategy.size() > 0) {
            // 这里可以实现数据迁移逻辑
            System.out.println("切换缓存策略，当前缓存大小: " + this.strategy.size());
        }
        this.strategy = strategy;
    }
    
    public void put(K key, V value) {
        strategy.put(key, value);
    }
    
    public V get(K key) {
        return strategy.get(key);
    }
    
    public void remove(K key) {
        strategy.remove(key);
    }
    
    public void clear() {
        strategy.clear();
    }
    
    public int size() {
        return strategy.size();
    }
}
```

## 模式变种和扩展

### 1. 策略工厂模式

```java
// 策略工厂
public class PaymentStrategyFactory {
    private static final Map<String, Supplier<PaymentStrategy>> strategies = new HashMap<>();
    
    static {
        strategies.put("CREDIT_CARD", () -> new CreditCardPayment("", "", ""));
        strategies.put("PAYPAL", () -> new PayPalPayment("", ""));
        strategies.put("BANK_TRANSFER", () -> new BankTransferPayment("", ""));
    }
    
    public static PaymentStrategy createStrategy(String type) {
        Supplier<PaymentStrategy> supplier = strategies.get(type.toUpperCase());
        if (supplier == null) {
            throw new IllegalArgumentException("不支持的支付方式: " + type);
        }
        return supplier.get();
    }
    
    public static void registerStrategy(String type, Supplier<PaymentStrategy> supplier) {
        strategies.put(type.toUpperCase(), supplier);
    }
    
    public static Set<String> getSupportedTypes() {
        return strategies.keySet();
    }
}

// 增强的购物车
public class EnhancedShoppingCart {
    private List<Item> items = new ArrayList<>();
    private PaymentStrategy paymentStrategy;
    
    public void setPaymentMethod(String paymentType) {
        this.paymentStrategy = PaymentStrategyFactory.createStrategy(paymentType);
    }
    
    public void checkout() {
        if (paymentStrategy == null) {
            throw new IllegalStateException("请选择支付方式");
        }
        
        double total = calculateTotal();
        paymentStrategy.pay(total);
        items.clear();
    }
    
    private double calculateTotal() {
        return items.stream().mapToDouble(Item::getPrice).sum();
    }
}
```

### 2. 组合策略模式

```java
// 组合策略接口
public interface CompositeStrategy {
    void execute();
    void addStrategy(Strategy strategy);
    void removeStrategy(Strategy strategy);
}

// 组合策略实现
public class CompositeStrategyImpl implements CompositeStrategy {
    private List<Strategy> strategies = new ArrayList<>();
    
    @Override
    public void execute() {
        for (Strategy strategy : strategies) {
            strategy.execute();
        }
    }
    
    @Override
    public void addStrategy(Strategy strategy) {
        strategies.add(strategy);
    }
    
    @Override
    public void removeStrategy(Strategy strategy) {
        strategies.remove(strategy);
    }
}

// 数据验证组合策略
public class ValidationCompositeStrategy {
    private List<ValidationStrategy> validators = new ArrayList<>();
    
    public void addValidator(ValidationStrategy validator) {
        validators.add(validator);
    }
    
    public ValidationResult validate(Object data) {
        ValidationResult result = new ValidationResult();
        
        for (ValidationStrategy validator : validators) {
            ValidationResult singleResult = validator.validate(data);
            result.merge(singleResult);
            
            // 如果有严重错误，立即停止验证
            if (singleResult.hasCriticalErrors()) {
                break;
            }
        }
        
        return result;
    }
}

// 验证策略接口
public interface ValidationStrategy {
    ValidationResult validate(Object data);
}

// 具体验证策略
public class EmailValidationStrategy implements ValidationStrategy {
    @Override
    public ValidationResult validate(Object data) {
        ValidationResult result = new ValidationResult();
        if (data instanceof String) {
            String email = (String) data;
            if (!email.contains("@")) {
                result.addError("邮箱格式不正确");
            }
        }
        return result;
    }
}

public class LengthValidationStrategy implements ValidationStrategy {
    private int minLength;
    private int maxLength;
    
    public LengthValidationStrategy(int minLength, int maxLength) {
        this.minLength = minLength;
        this.maxLength = maxLength;
    }
    
    @Override
    public ValidationResult validate(Object data) {
        ValidationResult result = new ValidationResult();
        if (data instanceof String) {
            String str = (String) data;
            if (str.length() < minLength) {
                result.addError("长度不能少于 " + minLength + " 个字符");
            }
            if (str.length() > maxLength) {
                result.addError("长度不能超过 " + maxLength + " 个字符");
            }
        }
        return result;
    }
}
```

### 3. 异步策略模式

```java
// 异步策略接口
public interface AsyncStrategy<T, R> {
    CompletableFuture<R> executeAsync(T input);
    String getStrategyName();
}

// 异步数据处理策略
public class AsyncDataProcessingStrategy implements AsyncStrategy<String, String> {
    private ExecutorService executor = Executors.newFixedThreadPool(4);
    
    @Override
    public CompletableFuture<String> executeAsync(String input) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // 模拟耗时处理
                Thread.sleep(1000);
                return "处理结果: " + input.toUpperCase();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        }, executor);
    }
    
    @Override
    public String getStrategyName() {
        return "异步数据处理";
    }
}

// 异步上下文
public class AsyncContext<T, R> {
    private AsyncStrategy<T, R> strategy;
    
    public void setStrategy(AsyncStrategy<T, R> strategy) {
        this.strategy = strategy;
    }
    
    public CompletableFuture<R> executeAsync(T input) {
        if (strategy == null) {
            return CompletableFuture.failedFuture(
                new IllegalStateException("策略未设置"));
        }
        
        System.out.println("开始执行策略: " + strategy.getStrategyName());
        
        return strategy.executeAsync(input)
                      .whenComplete((result, throwable) -> {
                          if (throwable == null) {
                              System.out.println("策略执行完成: " + result);
                          } else {
                              System.err.println("策略执行失败: " + throwable.getMessage());
                          }
                      });
    }
}
```

## 最佳实践

### 1. 策略接口设计原则

```java
// 良好的策略接口设计
public interface ProcessingStrategy<T, R> {
    // 主要处理方法
    R process(T input);
    
    // 策略验证
    boolean canHandle(T input);
    
    // 策略描述
    String getDescription();
    
    // 性能指标
    default ProcessingMetrics getMetrics() {
        return ProcessingMetrics.empty();
    }
    
    // 资源清理
    default void cleanup() {
        // 默认实现为空
    }
}

// 处理指标类
public class ProcessingMetrics {
    private long executionTime;
    private long memoryUsage;
    private int complexity;
    
    public static ProcessingMetrics empty() {
        return new ProcessingMetrics(0, 0, 0);
    }
    
    public ProcessingMetrics(long executionTime, long memoryUsage, int complexity) {
        this.executionTime = executionTime;
        this.memoryUsage = memoryUsage;
        this.complexity = complexity;
    }
    
    // getters...
}
```

### 2. 策略选择器

```java
// 智能策略选择器
public class StrategySelector<T, R> {
    private List<ProcessingStrategy<T, R>> strategies = new ArrayList<>();
    private ProcessingStrategy<T, R> defaultStrategy;
    
    public void addStrategy(ProcessingStrategy<T, R> strategy) {
        strategies.add(strategy);
    }
    
    public void setDefaultStrategy(ProcessingStrategy<T, R> defaultStrategy) {
        this.defaultStrategy = defaultStrategy;
    }
    
    public ProcessingStrategy<T, R> selectStrategy(T input) {
        // 按优先级选择策略
        return strategies.stream()
                        .filter(strategy -> strategy.canHandle(input))
                        .min(Comparator.comparing(strategy -> 
                            strategy.getMetrics().getComplexity()))
                        .orElse(defaultStrategy);
    }
    
    public R processWithBestStrategy(T input) {
        ProcessingStrategy<T, R> strategy = selectStrategy(input);
        if (strategy == null) {
            throw new IllegalStateException("没有可用的处理策略");
        }
        
        try {
            return strategy.process(input);
        } finally {
            strategy.cleanup();
        }
    }
}
```

### 3. 策略缓存和性能优化

```java
// 策略缓存管理器
public class StrategyCache<K, V> {
    private final Map<String, Strategy> strategyCache = new ConcurrentHashMap<>();
    private final Map<K, V> resultCache = new ConcurrentHashMap<>();
    private final long cacheTimeout;
    private final Map<K, Long> cacheTimestamps = new ConcurrentHashMap<>();
    
    public StrategyCache(long cacheTimeoutMs) {
        this.cacheTimeout = cacheTimeoutMs;
        
        // 定期清理过期缓存
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(this::cleanupExpiredCache, 
                                    cacheTimeout, cacheTimeout, TimeUnit.MILLISECONDS);
    }
    
    public Strategy getStrategy(String strategyType) {
        return strategyCache.computeIfAbsent(strategyType, this::createStrategy);
    }
    
    public V getCachedResult(K key) {
        Long timestamp = cacheTimestamps.get(key);
        if (timestamp != null && 
            System.currentTimeMillis() - timestamp < cacheTimeout) {
            return resultCache.get(key);
        }
        return null;
    }
    
    public void cacheResult(K key, V result) {
        resultCache.put(key, result);
        cacheTimestamps.put(key, System.currentTimeMillis());
    }
    
    private Strategy createStrategy(String strategyType) {
        // 策略创建逻辑
        return StrategyFactory.create(strategyType);
    }
    
    private void cleanupExpiredCache() {
        long currentTime = System.currentTimeMillis();
        cacheTimestamps.entrySet().removeIf(entry -> {
            if (currentTime - entry.getValue() > cacheTimeout) {
                resultCache.remove(entry.getKey());
                return true;
            }
            return false;
        });
    }
}
```

### 4. 策略监控和调试

```java
// 策略执行监控器
public class StrategyMonitor {
    private final Map<String, StrategyStats> statistics = new ConcurrentHashMap<>();
    private final List<StrategyExecutionListener> listeners = new ArrayList<>();
    
    public void addListener(StrategyExecutionListener listener) {
        listeners.add(listener);
    }
    
    public <T, R> R executeWithMonitoring(Strategy<T, R> strategy, T input) {
        String strategyName = strategy.getClass().getSimpleName();
        long startTime = System.nanoTime();
        
        // 通知监听器开始执行
        listeners.forEach(listener -> listener.onExecutionStart(strategyName, input));
        
        try {
            R result = strategy.execute(input);
            
            // 记录成功执行
            long executionTime = System.nanoTime() - startTime;
            recordExecution(strategyName, executionTime, true);
            
            // 通知监听器执行成功
            listeners.forEach(listener -> listener.onExecutionSuccess(strategyName, result, executionTime));
            
            return result;
        } catch (Exception e) {
            // 记录执行失败
            long executionTime = System.nanoTime() - startTime;
            recordExecution(strategyName, executionTime, false);
            
            // 通知监听器执行失败
            listeners.forEach(listener -> listener.onExecutionFailure(strategyName, e, executionTime));
            
            throw e;
        }
    }
    
    private void recordExecution(String strategyName, long executionTime, boolean success) {
        statistics.computeIfAbsent(strategyName, k -> new StrategyStats())
                 .recordExecution(executionTime, success);
    }
    
    public StrategyStats getStatistics(String strategyName) {
        return statistics.get(strategyName);
    }
    
    public Map<String, StrategyStats> getAllStatistics() {
        return new HashMap<>(statistics);
    }
}

// 策略统计信息
public class StrategyStats {
    private long totalExecutions;
    private long successfulExecutions;
    private long totalExecutionTime;
    private long minExecutionTime = Long.MAX_VALUE;
    private long maxExecutionTime = Long.MIN_VALUE;
    
    public synchronized void recordExecution(long executionTime, boolean success) {
        totalExecutions++;
        if (success) {
            successfulExecutions++;
        }
        
        totalExecutionTime += executionTime;
        minExecutionTime = Math.min(minExecutionTime, executionTime);
        maxExecutionTime = Math.max(maxExecutionTime, executionTime);
    }
    
    public double getSuccessRate() {
        return totalExecutions == 0 ? 0.0 : (double) successfulExecutions / totalExecutions;
    }
    
    public double getAverageExecutionTime() {
        return totalExecutions == 0 ? 0.0 : (double) totalExecutionTime / totalExecutions;
    }
    
    // 其他getter方法...
}

// 策略执行监听器
public interface StrategyExecutionListener {
    void onExecutionStart(String strategyName, Object input);
    void onExecutionSuccess(String strategyName, Object result, long executionTime);
    void onExecutionFailure(String strategyName, Exception error, long executionTime);
}
```

## 总结

策略模式是一种非常实用的设计模式，它通过封装算法族，使得算法可以相互替换，从而让算法的变化独立于使用算法的客户端。

### 核心价值

1. **提高代码的可维护性**：通过消除大量的条件语句，使代码更加清晰
2. **增强系统的可扩展性**：新增策略不需要修改现有代码
3. **促进代码复用**：每个策略都是独立的，可以在不同的上下文中复用
4. **支持运行时切换**：可以根据不同的条件动态选择合适的策略

### 使用建议

1. **合理设计策略接口**：接口应该简洁明了，避免过于复杂
2. **考虑性能影响**：频繁的策略切换可能带来性能开销
3. **提供默认策略**：为系统提供一个合理的默认行为
4. **结合工厂模式**：使用工厂模式来创建和管理策略实例
5. **添加监控机制**：在生产环境中监控策略的执行情况

策略模式在现代软件开发中有着广泛的应用，从简单的算法选择到复杂的业务规则处理，都能看到它的身影。掌握策略模式不仅能提高代码质量，还能让系统更加灵活和可维护。