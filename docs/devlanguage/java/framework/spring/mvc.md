# Spring MVC 详解

## 概述

Spring MVC 是 Spring Framework 的一个核心模块，它实现了 Model-View-Controller (MVC) 设计模式，为构建 Web 应用程序提供了一个灵活且功能强大的框架。Spring MVC 基于 Servlet API 构建，采用了前端控制器模式，通过 DispatcherServlet 作为中央调度器来处理所有的 HTTP 请求。

## 目录

1. [MVC 架构模式](#mvc-架构模式)
2. [核心组件](#核心组件)
3. [请求处理流程](#请求处理流程)
4. [控制器开发](#控制器开发)
5. [请求映射](#请求映射)
6. [参数绑定](#参数绑定)
7. [数据验证](#数据验证)
8. [视图解析](#视图解析)
9. [异常处理](#异常处理)
10. [拦截器](#拦截器)
11. [文件上传](#文件上传)
12. [RESTful API](#restful-api)
13. [配置方式](#配置方式)
14. [最佳实践](#最佳实践)

---

## MVC 架构模式

### 1. MVC 概念

```java
/**
 * MVC 架构模式的三个核心组件：
 * 
 * Model（模型）：
 * - 负责数据和业务逻辑
 * - 包括实体类、服务类、数据访问层
 * - 不依赖于视图和控制器
 * 
 * View（视图）：
 * - 负责数据的展示
 * - 包括 JSP、Thymeleaf、JSON、XML 等
 * - 从模型获取数据并渲染给用户
 * 
 * Controller（控制器）：
 * - 负责处理用户请求
 * - 协调模型和视图
 * - 处理用户输入并返回响应
 */

// Model - 数据模型
@Entity
public class User {
    private Long id;
    private String username;
    private String email;
    
    // getters and setters
}

// View - 视图（通常是模板文件）
// user-list.html (Thymeleaf)
/*
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body>
    <div th:each="user : ${users}">
        <span th:text="${user.username}"></span>
        <span th:text="${user.email}"></span>
    </div>
</body>
</html>
*/

// Controller - 控制器
@Controller
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @GetMapping("/users")
    public String listUsers(Model model) {
        List<User> users = userService.findAll();
        model.addAttribute("users", users);
        return "user-list"; // 返回视图名称
    }
}
```

### 2. Spring MVC 的优势

```java
/**
 * Spring MVC 的核心优势：
 * 
 * 1. 松耦合：通过依赖注入实现组件间的松耦合
 * 2. 灵活性：支持多种视图技术和配置方式
 * 3. 可测试性：控制器易于单元测试
 * 4. 可扩展性：提供丰富的扩展点
 * 5. 集成性：与 Spring 生态系统无缝集成
 */

@RestController
@RequestMapping("/api/users")
public class UserRestController {
    
    @Autowired
    private UserService userService;
    
    // 支持多种返回类型
    @GetMapping
    public ResponseEntity<List<User>> getUsers() {
        List<User> users = userService.findAll();
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return user != null ? ResponseEntity.ok(user) : ResponseEntity.notFound().build();
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        User savedUser = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }
}
```

---

## 核心组件

### 1. DispatcherServlet

```java
/**
 * DispatcherServlet 是 Spring MVC 的前端控制器
 * 负责接收所有请求并分发给相应的处理器
 */

// Web.xml 配置方式
/*
<servlet>
    <servlet-name>dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <init-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>/WEB-INF/spring-mvc.xml</param-value>
    </init-param>
    <load-on-startup>1</load-on-startup>
</servlet>

<servlet-mapping>
    <servlet-name>dispatcher</servlet-name>
    <url-pattern>/</url-pattern>
</servlet-mapping>
*/

// Java 配置方式
@Configuration
@EnableWebMvc
@ComponentScan(basePackages = "com.example.controller")
public class WebConfig implements WebMvcConfigurer {
    
    // 配置视图解析器
    @Bean
    public ThymeleafViewResolver thymeleafViewResolver() {
        ThymeleafViewResolver resolver = new ThymeleafViewResolver();
        resolver.setTemplateEngine(templateEngine());
        resolver.setOrder(1);
        resolver.setCharacterEncoding("UTF-8");
        return resolver;
    }
    
    // FreeMarker 视图解析器
    @Bean
    public FreeMarkerConfigurer freeMarkerConfigurer() {
        FreeMarkerConfigurer configurer = new FreeMarkerConfigurer();
        configurer.setTemplateLoaderPath("/WEB-INF/freemarker/");
        configurer.setDefaultEncoding("UTF-8");
        
        Properties settings = new Properties();
        settings.setProperty("template_update_delay", "0");
        settings.setProperty("default_encoding", "UTF-8");
        settings.setProperty("number_format", "0.##########");
        settings.setProperty("datetime_format", "yyyy-MM-dd HH:mm:ss");
        settings.setProperty("classic_compatible", "true");
        configurer.setFreemarkerSettings(settings);
        
        return configurer;
    }
    
    @Bean
    public FreeMarkerViewResolver freeMarkerViewResolver() {
        FreeMarkerViewResolver resolver = new FreeMarkerViewResolver();
        resolver.setPrefix("");
        resolver.setSuffix(".ftl");
        resolver.setContentType("text/html;charset=UTF-8");
        resolver.setOrder(2);
        return resolver;
    }
    
    // 内容协商视图解析器
    @Bean
    public ContentNegotiatingViewResolver contentNegotiatingViewResolver() {
        ContentNegotiatingViewResolver resolver = new ContentNegotiatingViewResolver();
        
        // 设置内容协商管理器
        ContentNegotiationManager manager = new ContentNegotiationManager(
            new HeaderContentNegotiationStrategy(),
            new ParameterContentNegotiationStrategy(),
            new PathExtensionContentNegotiationStrategy(),
            new FixedContentNegotiationStrategy(MediaType.TEXT_HTML)
        );
        resolver.setContentNegotiationManager(manager);
        
        // 设置视图解析器列表
        List<ViewResolver> viewResolvers = Arrays.asList(
            thymeleafViewResolver(),
            freeMarkerViewResolver(),
            jspViewResolver()
        );
        resolver.setViewResolvers(viewResolvers);
        
        // 设置默认视图
        List<View> defaultViews = Arrays.asList(
            new MappingJackson2JsonView(),
            new MappingJackson2XmlView()
        );
        resolver.setDefaultViews(defaultViews);
        
        return resolver;
    }
}
```

### 2. 视图控制器

```java
@Controller
public class ViewController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ProductService productService;
    
    // 返回视图名称
    @GetMapping("/users")
    public String listUsers(Model model) {
        List<User> users = userService.findAll();
        model.addAttribute("users", users);
        model.addAttribute("title", "用户列表");
        return "user/list"; // 对应 /WEB-INF/templates/user/list.html
    }
    
    // 返回 ModelAndView
    @GetMapping("/users/{id}")
    public ModelAndView showUser(@PathVariable Long id) {
        User user = userService.findById(id);
        
        ModelAndView mav = new ModelAndView("user/detail");
        mav.addObject("user", user);
        mav.addObject("title", "用户详情");
        
        return mav;
    }
    
    // 重定向
    @PostMapping("/users")
    public String createUser(@Valid @ModelAttribute User user, BindingResult result) {
        if (result.hasErrors()) {
            return "user/form";
        }
}
```

---

## 文件上传

### 1. 配置文件上传

```java
@Configuration
public class FileUploadConfig {
    
    @Bean
    public MultipartResolver multipartResolver() {
        CommonsMultipartResolver resolver = new CommonsMultipartResolver();
        resolver.setMaxUploadSize(10 * 1024 * 1024); // 10MB
        resolver.setMaxInMemorySize(1024 * 1024); // 1MB
        resolver.setDefaultEncoding("UTF-8");
        return resolver;
    }
    
    // 或者使用 StandardServletMultipartResolver
    @Bean
    public MultipartResolver standardMultipartResolver() {
        return new StandardServletMultipartResolver();
    }
}

// application.properties 配置
/*
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
spring.servlet.multipart.file-size-threshold=1MB
spring.servlet.multipart.location=/tmp
*/
```

### 2. 文件上传控制器

```java
@RestController
@RequestMapping("/api/files")
public class FileUploadController {
    
    @Value("${file.upload.path:/tmp/uploads}")
    private String uploadPath;
    
    // 单文件上传
    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        
        try {
            // 验证文件
            validateFile(file);
            
            // 生成文件名
            String fileName = generateFileName(file.getOriginalFilename());
            
            // 确保上传目录存在
            Path uploadDir = Paths.get(uploadPath);
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            
            // 保存文件
            Path filePath = uploadDir.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // 构建响应
            FileUploadResponse response = FileUploadResponse.builder()
                .fileName(fileName)
                .originalFileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .description(description)
                .uploadTime(LocalDateTime.now())
                .downloadUrl("/api/files/download/" + fileName)
                .build();
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            throw new FileUploadException("文件上传失败", e);
        }
    }
    
    // 多文件上传
    @PostMapping("/upload/multiple")
    public ResponseEntity<List<FileUploadResponse>> uploadMultipleFiles(
            @RequestParam("files") MultipartFile[] files) {
        
        List<FileUploadResponse> responses = new ArrayList<>();
        
        for (MultipartFile file : files) {
            try {
                validateFile(file);
                
                String fileName = generateFileName(file.getOriginalFilename());
                Path filePath = Paths.get(uploadPath).resolve(fileName);
                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                
                FileUploadResponse response = FileUploadResponse.builder()
                    .fileName(fileName)
                    .originalFileName(file.getOriginalFilename())
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .uploadTime(LocalDateTime.now())
                    .downloadUrl("/api/files/download/" + fileName)
                    .build();
                
                responses.add(response);
                
            } catch (IOException e) {
                // 记录错误但继续处理其他文件
                log.error("文件上传失败: {}", file.getOriginalFilename(), e);
            }
        }
        
        return ResponseEntity.ok(responses);
    }
    
    // 文件下载
    @GetMapping("/download/{fileName}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        
        try {
            Path filePath = Paths.get(uploadPath).resolve(fileName);
            Resource resource = new UrlResource(filePath.toUri());
            
            if (!resource.exists() || !resource.isReadable()) {
                throw new FileNotFoundException("文件不存在: " + fileName);
            }
            
            // 获取文件的 MIME 类型
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }
            
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                       "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
                
        } catch (IOException e) {
            throw new FileDownloadException("文件下载失败", e);
        }
    }
    
    // 图片预览
    @GetMapping("/preview/{fileName}")
    public ResponseEntity<Resource> previewImage(@PathVariable String fileName) {
        
        try {
            Path filePath = Paths.get(uploadPath).resolve(fileName);
            Resource resource = new UrlResource(filePath.toUri());
            
            if (!resource.exists() || !resource.isReadable()) {
                throw new FileNotFoundException("文件不存在: " + fileName);
            }
            
            String contentType = Files.probeContentType(filePath);
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("不是有效的图片文件");
            }
            
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
                
        } catch (IOException e) {
            throw new FileDownloadException("图片预览失败", e);
        }
    }
    
    // 文件删除
    @DeleteMapping("/delete/{fileName}")
    public ResponseEntity<Void> deleteFile(@PathVariable String fileName) {
        
        try {
            Path filePath = Paths.get(uploadPath).resolve(fileName);
            
            if (Files.exists(filePath)) {
                Files.delete(filePath);
            }
            
            return ResponseEntity.noContent().build();
            
        } catch (IOException e) {
            throw new FileDeleteException("文件删除失败", e);
        }
    }
    
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        
        // 检查文件大小
        if (file.getSize() > 10 * 1024 * 1024) { // 10MB
            throw new IllegalArgumentException("文件大小不能超过10MB");
        }
        
        // 检查文件类型
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("无法确定文件类型");
        }
        
        List<String> allowedTypes = Arrays.asList(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf", "text/plain", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        
        if (!allowedTypes.contains(contentType)) {
            throw new IllegalArgumentException("不支持的文件类型: " + contentType);
        }
        
        // 检查文件扩展名
        String fileName = file.getOriginalFilename();
        if (fileName != null) {
            String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
            List<String> allowedExtensions = Arrays.asList(
                "jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "doc", "docx"
            );
            
            if (!allowedExtensions.contains(extension)) {
                throw new IllegalArgumentException("不支持的文件扩展名: " + extension);
            }
        }
    }
    
    private String generateFileName(String originalFileName) {
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        
        return UUID.randomUUID().toString() + extension;
    }
}

// 文件上传响应类
@Data
@Builder
public class FileUploadResponse {
    private String fileName;
    private String originalFileName;
    private long fileSize;
    private String contentType;
    private String description;
    private LocalDateTime uploadTime;
    private String downloadUrl;
}

// 自定义异常
public class FileUploadException extends RuntimeException {
    public FileUploadException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class FileDownloadException extends RuntimeException {
    public FileDownloadException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class FileDeleteException extends RuntimeException {
    public FileDeleteException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### 3. 表单文件上传

```java
@Controller
@RequestMapping("/upload")
public class FileUploadFormController {
    
    @GetMapping
    public String uploadForm() {
        return "upload/form";
    }
    
    @PostMapping
    public String handleFileUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("description") String description,
            RedirectAttributes redirectAttributes) {
        
        try {
            if (file.isEmpty()) {
                redirectAttributes.addFlashAttribute("error", "请选择要上传的文件");
                return "redirect:/upload";
            }
            
            // 处理文件上传逻辑
            String fileName = saveFile(file);
            
            redirectAttributes.addFlashAttribute("success", 
                "文件上传成功: " + file.getOriginalFilename());
            redirectAttributes.addFlashAttribute("fileName", fileName);
            
            return "redirect:/upload/success";
            
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "文件上传失败: " + e.getMessage());
            return "redirect:/upload";
        }
    }
    
    @GetMapping("/success")
    public String uploadSuccess() {
        return "upload/success";
    }
    
    private String saveFile(MultipartFile file) throws IOException {
        // 实现文件保存逻辑
        return "saved-file-name";
    }
}
```

---

## 国际化

### 1. 国际化配置

```java
@Configuration
public class InternationalizationConfig implements WebMvcConfigurer {
    
    // 消息源配置
    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        messageSource.setBasenames("messages/messages", "messages/validation");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setCacheSeconds(3600);
        messageSource.setFallbackToSystemLocale(false);
        return messageSource;
    }
    
    // 区域解析器
    @Bean
    public LocaleResolver localeResolver() {
        SessionLocaleResolver resolver = new SessionLocaleResolver();
        resolver.setDefaultLocale(Locale.SIMPLIFIED_CHINESE);
        return resolver;
    }
    
    // 或者使用 Cookie 区域解析器
    @Bean
    public LocaleResolver cookieLocaleResolver() {
        CookieLocaleResolver resolver = new CookieLocaleResolver();
        resolver.setDefaultLocale(Locale.SIMPLIFIED_CHINESE);
        resolver.setCookieName("language");
        resolver.setCookieMaxAge(3600 * 24 * 30); // 30天
        return resolver;
    }
    
    // 或者使用 Accept-Language 头解析器
    @Bean
    public LocaleResolver acceptHeaderLocaleResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(Locale.SIMPLIFIED_CHINESE);
        resolver.setSupportedLocales(Arrays.asList(
            Locale.SIMPLIFIED_CHINESE,
            Locale.US,
            Locale.JAPAN
        ));
        return resolver;
    }
    
    // 区域变更拦截器
    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        return interceptor;
    }
    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor());
    }
}
```

### 2. 消息资源文件

```properties
# messages/messages_zh_CN.properties
welcome.message=欢迎使用我们的系统
user.name=用户名
user.email=邮箱
user.age=年龄
button.submit=提交
button.cancel=取消
button.save=保存
button.delete=删除
button.edit=编辑

error.required={0}不能为空
error.email.invalid=邮箱格式不正确
error.age.range=年龄必须在{0}到{1}之间

success.user.created=用户创建成功
success.user.updated=用户更新成功
success.user.deleted=用户删除成功

# messages/messages_en_US.properties
welcome.message=Welcome to our system
user.name=Username
user.email=Email
user.age=Age
button.submit=Submit
button.cancel=Cancel
button.save=Save
button.delete=Delete
button.edit=Edit

error.required={0} is required
error.email.invalid=Invalid email format
error.age.range=Age must be between {0} and {1}

success.user.created=User created successfully
success.user.updated=User updated successfully
success.user.deleted=User deleted successfully

# messages/messages_ja_JP.properties
welcome.message=私たちのシステムへようこそ
user.name=ユーザー名
user.email=メール
user.age=年齢
button.submit=送信
button.cancel=キャンセル
button.save=保存
button.delete=削除
button.edit=編集

error.required={0}は必須です
error.email.invalid=メール形式が正しくありません
error.age.range=年齢は{0}から{1}の間である必要があります

success.user.created=ユーザーが正常に作成されました
success.user.updated=ユーザーが正常に更新されました
success.user.deleted=ユーザーが正常に削除されました
```

### 3. 国际化控制器

```java
@Controller
public class InternationalizationController {
    
    @Autowired
    private MessageSource messageSource;
    
    @GetMapping("/")
    public String home(Model model, Locale locale) {
        String welcomeMessage = messageSource.getMessage("welcome.message", null, locale);
        model.addAttribute("welcomeMessage", welcomeMessage);
        return "home";
    }
    
    @GetMapping("/users/new")
    public String newUserForm(Model model, Locale locale) {
        model.addAttribute("user", new User());
        
        // 添加本地化标签
        model.addAttribute("userNameLabel", 
            messageSource.getMessage("user.name", null, locale));
        model.addAttribute("userEmailLabel", 
            messageSource.getMessage("user.email", null, locale));
        model.addAttribute("userAgeLabel", 
            messageSource.getMessage("user.age", null, locale));
        model.addAttribute("submitButton", 
            messageSource.getMessage("button.submit", null, locale));
        
        return "user/form";
    }
    
    @PostMapping("/users")
    public String createUser(@Valid @ModelAttribute User user, 
                           BindingResult result, 
                           RedirectAttributes redirectAttributes,
                           Locale locale) {
        
        if (result.hasErrors()) {
            return "user/form";
        }
        
        userService.save(user);
        
        String successMessage = messageSource.getMessage(
            "success.user.created", null, locale);
        redirectAttributes.addFlashAttribute("successMessage", successMessage);
        
        return "redirect:/users";
    }
    
    // 切换语言
    @GetMapping("/change-language")
    public String changeLanguage(@RequestParam("lang") String language,
                                HttpServletRequest request) {
        
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isEmpty()) {
            return "redirect:" + referer + "?lang=" + language;
        }
        
        return "redirect:/?lang=" + language;
    }
}

// 国际化工具类
@Component
public class MessageHelper {
    
    @Autowired
    private MessageSource messageSource;
    
    public String getMessage(String code, Locale locale) {
        return messageSource.getMessage(code, null, locale);
    }
    
    public String getMessage(String code, Object[] args, Locale locale) {
        return messageSource.getMessage(code, args, locale);
    }
    
    public String getMessage(String code, Object[] args, String defaultMessage, Locale locale) {
        return messageSource.getMessage(code, args, defaultMessage, locale);
    }
}

// REST API 国际化
@RestController
@RequestMapping("/api/messages")
public class MessageController {
    
    @Autowired
    private MessageHelper messageHelper;
    
    @GetMapping("/welcome")
    public ResponseEntity<Map<String, String>> getWelcomeMessage(Locale locale) {
        
        Map<String, String> response = new HashMap<>();
        response.put("message", messageHelper.getMessage("welcome.message", locale));
        response.put("locale", locale.toString());
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/validation-error")
    public ResponseEntity<Map<String, String>> getValidationError(
            @RequestParam String field,
            Locale locale) {
        
        String fieldName = messageHelper.getMessage("user." + field, locale);
        String errorMessage = messageHelper.getMessage(
            "error.required", new Object[]{fieldName}, locale);
        
        Map<String, String> response = new HashMap<>();
        response.put("field", field);
        response.put("message", errorMessage);
        
        return ResponseEntity.ok(response);
    }
}
```

### 4. 模板中的国际化

```html
<!-- Thymeleaf 模板 -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <title th:text="#{page.title}">Title</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1 th:text="#{welcome.message}">Welcome</h1>
    
    <!-- 语言切换 -->
    <div class="language-switcher">
        <a th:href="@{''(lang=zh_CN)}" th:text="#{language.chinese}">中文</a>
        <a th:href="@{''(lang=en_US)}" th:text="#{language.english}">English</a>
        <a th:href="@{''(lang=ja_JP)}" th:text="#{language.japanese}">日本語</a>
    </div>
    
    <!-- 表单 -->
    <form th:action="@{/users}" th:object="${user}" method="post">
        <div>
            <label th:text="#{user.name}">Name:</label>
            <input type="text" th:field="*{name}" th:placeholder="#{user.name.placeholder}">
            <span th:if="${#fields.hasErrors('name')}" 
                  th:errors="*{name}" 
                  class="error"></span>
        </div>
        
        <div>
            <label th:text="#{user.email}">Email:</label>
            <input type="email" th:field="*{email}" th:placeholder="#{user.email.placeholder}">
            <span th:if="${#fields.hasErrors('email')}" 
                  th:errors="*{email}" 
                  class="error"></span>
        </div>
        
        <div>
            <label th:text="#{user.age}">Age:</label>
            <input type="number" th:field="*{age}" th:placeholder="#{user.age.placeholder}">
            <span th:if="${#fields.hasErrors('age')}" 
                  th:errors="*{age}" 
                  class="error"></span>
        </div>
        
        <button type="submit" th:text="#{button.submit}">Submit</button>
        <a th:href="@{/users}" th:text="#{button.cancel}">Cancel</a>
    </form>
    
    <!-- 消息显示 -->
    <div th:if="${successMessage}" class="alert alert-success">
        <span th:text="${successMessage}"></span>
    </div>
    
    <!-- 使用参数的消息 -->
    <p th:text="#{user.info(${user.name}, ${user.age})}">User info</p>
    
    <!-- 条件消息 -->
    <p th:text="${user.age >= 18} ? #{user.adult} : #{user.minor}">Age status</p>
</body>
</html>
```

---

## 静态资源处理

### 1. 静态资源配置

```java
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        
        // 静态资源映射
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(30)));
        
        // 图片资源
        registry.addResourceHandler("/images/**")
                .addResourceLocations("classpath:/static/images/", "file:/opt/uploads/images/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)));
        
        // CSS 和 JS 资源
        registry.addResourceHandler("/css/**")
                .addResourceLocations("classpath:/static/css/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(30))
                    .cachePublic()
                    .mustRevalidate());
        
        registry.addResourceHandler("/js/**")
                .addResourceLocations("classpath:/static/js/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(30)));
        
        // 文件下载
        registry.addResourceHandler("/downloads/**")
                .addResourceLocations("file:/opt/downloads/")
                .setCacheControl(CacheControl.noCache());
        
        // WebJars 支持
        registry.addResourceHandler("/webjars/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)));
    }
    
    // 默认 Servlet 处理器
    @Override
    public void configureDefaultServletHandling(DefaultServletHandlerConfigurer configurer) {
        configurer.enable();
    }
    
    // 资源版本策略
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/resources/**")
                .addResourceLocations("/public/", "classpath:/static/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)))
                .resourceChain(true)
                .addResolver(new VersionResourceResolver()
                    .addContentVersionStrategy("/**"))
                .addTransformer(new CssLinkResourceTransformer());
    }
}
```

### 2. 资源控制器

```java
@Controller
public class ResourceController {
    
    @Value("${app.upload.path:/opt/uploads}")
    private String uploadPath;
    
    // 动态图片服务
    @GetMapping("/images/{category}/{filename:.+}")
    public ResponseEntity<Resource> getImage(
            @PathVariable String category,
            @PathVariable String filename,
            HttpServletRequest request) throws IOException {
        
        // 安全检查
        if (filename.contains("..") || category.contains("..")) {
            return ResponseEntity.badRequest().build();
        }
        
        Path imagePath = Paths.get(uploadPath, category, filename);
        Resource resource = new UrlResource(imagePath.toUri());
        
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }
        
        // 确定内容类型
        String contentType = Files.probeContentType(imagePath);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }
        
        // 设置缓存头
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)))
                .body(resource);
    }
    
    // 缩略图服务
    @GetMapping("/thumbnails/{filename:.+}")
    public ResponseEntity<Resource> getThumbnail(
            @PathVariable String filename,
            @RequestParam(defaultValue = "200") int width,
            @RequestParam(defaultValue = "200") int height) throws IOException {
        
        Path originalPath = Paths.get(uploadPath, "images", filename);
        if (!Files.exists(originalPath)) {
            return ResponseEntity.notFound().build();
        }
        
        // 生成缩略图缓存路径
        String thumbnailName = String.format("%s_%dx%d_%s", 
            FilenameUtils.getBaseName(filename), width, height, 
            FilenameUtils.getExtension(filename));
        Path thumbnailPath = Paths.get(uploadPath, "thumbnails", thumbnailName);
        
        // 如果缩略图不存在，生成它
        if (!Files.exists(thumbnailPath)) {
            generateThumbnail(originalPath, thumbnailPath, width, height);
        }
        
        Resource resource = new UrlResource(thumbnailPath.toUri());
        
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)))
                .body(resource);
    }
    
    private void generateThumbnail(Path originalPath, Path thumbnailPath, int width, int height) 
            throws IOException {
        
        // 确保缩略图目录存在
        Files.createDirectories(thumbnailPath.getParent());
        
        // 使用 Java 2D API 生成缩略图
        BufferedImage originalImage = ImageIO.read(originalPath.toFile());
        
        // 计算缩放比例
        double scaleX = (double) width / originalImage.getWidth();
        double scaleY = (double) height / originalImage.getHeight();
        double scale = Math.min(scaleX, scaleY);
        
        int scaledWidth = (int) (originalImage.getWidth() * scale);
        int scaledHeight = (int) (originalImage.getHeight() * scale);
        
        // 创建缩略图
        BufferedImage thumbnailImage = new BufferedImage(scaledWidth, scaledHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = thumbnailImage.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.drawImage(originalImage, 0, 0, scaledWidth, scaledHeight, null);
        g2d.dispose();
        
        // 保存缩略图
        ImageIO.write(thumbnailImage, "jpg", thumbnailPath.toFile());
    }
}
```

### 3. 资源压缩和优化

```java
@Configuration
public class ResourceOptimizationConfig implements WebMvcConfigurer {
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        
        // 启用资源链和压缩
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)))
                .resourceChain(true)
                .addResolver(new GzipResourceResolver())
                .addResolver(new PathResourceResolver())
                .addTransformer(new CssLinkResourceTransformer())
                .addTransformer(new AppCacheManifestTransformer());
    }
    
    // 自定义 Gzip 资源解析器
    public static class GzipResourceResolver implements ResourceResolver {
        
        @Override
        public Resource resolveResource(HttpServletRequest request, String requestPath,
                                      List<? extends Resource> locations, ResourceResolverChain chain) {
            
            Resource resource = chain.resolveResource(request, requestPath, locations);
            if (resource == null) {
                return null;
            }
            
            // 检查是否支持 Gzip
            String acceptEncoding = request.getHeader("Accept-Encoding");
            if (acceptEncoding != null && acceptEncoding.contains("gzip")) {
                
                // 查找 .gz 版本
                try {
                    Resource gzipResource = resource.createRelative(resource.getFilename() + ".gz");
                    if (gzipResource.exists()) {
                        return new GzipResource(gzipResource);
                    }
                } catch (IOException e) {
                    // 忽略错误，返回原始资源
                }
            }
            
            return resource;
        }
        
        @Override
        public String resolveUrlPath(String resourcePath, List<? extends Resource> locations,
                                   ResourceResolverChain chain) {
            return chain.resolveUrlPath(resourcePath, locations);
        }
    }
    
    // Gzip 资源包装器
    public static class GzipResource implements Resource {
        
        private final Resource resource;
        
        public GzipResource(Resource resource) {
            this.resource = resource;
        }
        
        @Override
        public InputStream getInputStream() throws IOException {
            return new GZIPInputStream(resource.getInputStream());
        }
        
        @Override
        public boolean exists() {
            return resource.exists();
        }
        
        @Override
        public URL getURL() throws IOException {
            return resource.getURL();
        }
        
        @Override
        public URI getURI() throws IOException {
            return resource.getURI();
        }
        
        @Override
        public File getFile() throws IOException {
            return resource.getFile();
        }
        
        @Override
        public long contentLength() throws IOException {
            return resource.contentLength();
        }
        
        @Override
        public long lastModified() throws IOException {
            return resource.lastModified();
        }
        
        @Override
        public Resource createRelative(String relativePath) throws IOException {
            return resource.createRelative(relativePath);
        }
        
        @Override
        public String getFilename() {
            String filename = resource.getFilename();
            return filename != null && filename.endsWith(".gz") 
                ? filename.substring(0, filename.length() - 3) 
                : filename;
        }
        
        @Override
        public String getDescription() {
            return resource.getDescription();
        }
    }
}
```

---

## 最佳实践与总结

### 1. 架构设计原则

```java
// 1. 分层架构
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserService userService; // 业务层
    
    @Autowired
    private UserMapper userMapper; // 数据转换
    
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<User> users = userService.findAll();
        List<UserDTO> userDTOs = users.stream()
            .map(userMapper::toDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(userDTOs);
    }
}

// 2. 统一响应格式
@Data
@Builder
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private String timestamp;
    private String path;
    
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .data(data)
            .timestamp(LocalDateTime.now().toString())
            .build();
    }
    
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
            .success(false)
            .message(message)
            .timestamp(LocalDateTime.now().toString())
            .build();
    }
}

// 3. 统一异常处理
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(ValidationException ex) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.error(ex.getMessage()));
    }
    
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.notFound()
            .build();
    }
}
```

### 2. 性能优化

```java
// 1. 缓存配置
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());
        return cacheManager;
    }
}

// 2. 异步处理
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

// 3. 数据库连接池
@Configuration
public class DataSourceConfig {
    
    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
        config.setUsername("user");
        config.setPassword("password");
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        return new HikariDataSource(config);
    }
}
```

### 3. 安全最佳实践

```java
// 1. 输入验证
@RestController
public class SecureController {
    
    @PostMapping("/users")
    public ResponseEntity<User> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        
        // 额外的业务验证
        if (userService.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("邮箱已存在");
        }
        
        User user = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
}

// 2. SQL 注入防护
@Repository
public class UserRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public List<User> findByName(String name) {
        // 使用参数化查询
        String sql = "SELECT * FROM users WHERE name = ?";
        return jdbcTemplate.query(sql, new Object[]{name}, new UserRowMapper());
    }
}

// 3. XSS 防护
@Component
public class XssFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        XssHttpServletRequestWrapper wrappedRequest = 
            new XssHttpServletRequestWrapper((HttpServletRequest) request);
        chain.doFilter(wrappedRequest, response);
    }
}
```

### 4. 测试策略

```java
// 1. 单元测试
@ExtendWith(MockitoExtension.class)
class UserControllerTest {
    
    @Mock
    private UserService userService;
    
    @InjectMocks
    private UserController userController;
    
    @Test
    void shouldReturnAllUsers() {
        // Given
        List<User> users = Arrays.asList(new User("John"), new User("Jane"));
        when(userService.findAll()).thenReturn(users);
        
        // When
        ResponseEntity<List<UserDTO>> response = userController.getAllUsers();
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
    }
}

// 2. 集成测试
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserControllerIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateUser() {
        // Given
        CreateUserRequest request = new CreateUserRequest("John", "john@example.com");
        
        // When
        ResponseEntity<User> response = restTemplate.postForEntity(
            "/api/users", request, User.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getName()).isEqualTo("John");
    }
}

// 3. Web 层测试
@WebMvcTest(UserController.class)
class UserControllerWebTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private UserService userService;
    
    @Test
    void shouldReturnUsers() throws Exception {
        // Given
        List<User> users = Arrays.asList(new User("John"));
        when(userService.findAll()).thenReturn(users);
        
        // When & Then
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].name", is("John")));
    }
}
```

### 5. 监控和日志

```java
// 1. 日志配置
@Slf4j
@RestController
public class MonitoredController {
    
    @GetMapping("/api/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        log.info("获取用户信息，ID: {}", id);
        
        try {
            User user = userService.findById(id);
            log.info("成功获取用户信息: {}", user.getName());
            return ResponseEntity.ok(user);
            
        } catch (EntityNotFoundException e) {
            log.warn("用户不存在，ID: {}", id);
            throw e;
            
        } catch (Exception e) {
            log.error("获取用户信息失败，ID: {}", id, e);
            throw new InternalServerException("系统错误");
        }
    }
}

// 2. 性能监控
@Component
@Aspect
public class PerformanceMonitoringAspect {
    
    @Around("@annotation(Monitored)")
    public Object monitor(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;
            
            log.info("方法 {} 执行耗时: {}ms", 
                joinPoint.getSignature().getName(), duration);
            
            return result;
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("方法 {} 执行失败，耗时: {}ms", 
                joinPoint.getSignature().getName(), duration, e);
            throw e;
        }
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Monitored {
}
```

## 总结

Spring MVC 是一个功能强大、灵活且易于使用的 Web 框架，它提供了：

1. **清晰的架构**：基于 MVC 模式的分层架构
2. **灵活的配置**：支持注解和 Java 配置
3. **强大的功能**：请求映射、数据绑定、验证、视图解析等
4. **良好的扩展性**：拦截器、异常处理、自定义组件
5. **完善的生态**：与 Spring 生态系统无缝集成

通过合理使用 Spring MVC 的各种特性，可以构建出高质量、可维护的 Web 应用程序。关键是要遵循最佳实践，注重代码质量和性能优化。
        
        userService.save(user);
        return "redirect:/users"; // 重定向到用户列表
    }
    
    // 转发
    @GetMapping("/admin/users")
    public String adminUsers() {
        return "forward:/users"; // 转发到 /users
    }
    
    // 条件视图
    @GetMapping("/dashboard")
    public String dashboard(HttpServletRequest request, Model model) {
        String userAgent = request.getHeader("User-Agent");
        
        if (userAgent != null && userAgent.toLowerCase().contains("mobile")) {
            model.addAttribute("layout", "mobile");
            return "dashboard/mobile";
        } else {
            model.addAttribute("layout", "desktop");
            return "dashboard/desktop";
        }
    }
}
```

### 3. 自定义视图

```java
// 自定义 JSON 视图
public class CustomJsonView extends AbstractView {
    
    public CustomJsonView() {
        setContentType(MediaType.APPLICATION_JSON_VALUE);
    }
    
    @Override
    protected void renderMergedOutputModel(Map<String, Object> model,
                                         HttpServletRequest request,
                                         HttpServletResponse response) throws Exception {
        
        response.setContentType(getContentType());
        response.setCharacterEncoding("UTF-8");
        
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(SerializationFeature.INDENT_OUTPUT, true);
        
        // 自定义 JSON 格式
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("timestamp", System.currentTimeMillis());
        result.put("data", model);
        
        String json = mapper.writeValueAsString(result);
        response.getWriter().write(json);
    }
}

// 自定义 Excel 视图
public class ExcelView extends AbstractView {
    
    public ExcelView() {
        setContentType("application/vnd.ms-excel");
    }
    
    @Override
    protected void renderMergedOutputModel(Map<String, Object> model,
                                         HttpServletRequest request,
                                         HttpServletResponse response) throws Exception {
        
        response.setContentType(getContentType());
        response.setHeader("Content-Disposition", "attachment; filename=export.xlsx");
        
        @SuppressWarnings("unchecked")
        List<User> users = (List<User>) model.get("users");
        
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("用户数据");
        
        // 创建标题行
        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("ID");
        headerRow.createCell(1).setCellValue("用户名");
        headerRow.createCell(2).setCellValue("邮箱");
        headerRow.createCell(3).setCellValue("年龄");
        
        // 填充数据
        for (int i = 0; i < users.size(); i++) {
            User user = users.get(i);
            Row row = sheet.createRow(i + 1);
            row.createCell(0).setCellValue(user.getId());
            row.createCell(1).setCellValue(user.getUsername());
            row.createCell(2).setCellValue(user.getEmail());
            row.createCell(3).setCellValue(user.getAge());
        }
        
        workbook.write(response.getOutputStream());
        workbook.close();
    }
}

// 注册自定义视图
@Configuration
public class CustomViewConfig {
    
    @Bean
    public BeanNameViewResolver beanNameViewResolver() {
        BeanNameViewResolver resolver = new BeanNameViewResolver();
        resolver.setOrder(0); // 最高优先级
        return resolver;
    }
    
    @Bean("customJson")
    public View customJsonView() {
        return new CustomJsonView();
    }
    
    @Bean("excel")
    public View excelView() {
        return new ExcelView();
    }
}

// 使用自定义视图
@Controller
public class ExportController {
    
    @GetMapping("/export/users.json")
    public String exportUsersJson(Model model) {
        List<User> users = userService.findAll();
        model.addAttribute("users", users);
        return "customJson"; // 使用自定义 JSON 视图
    }
    
    @GetMapping("/export/users.xlsx")
    public String exportUsersExcel(Model model) {
        List<User> users = userService.findAll();
        model.addAttribute("users", users);
        return "excel"; // 使用自定义 Excel 视图
    }
}
```

---

## 异常处理

### 1. 全局异常处理

```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    // 处理业务异常
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        log.warn("业务异常：{}", ex.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .code(ex.getCode())
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    // 处理资源未找到异常
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex) {
        log.warn("资源未找到：{}", ex.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .code("ENTITY_NOT_FOUND")
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    // 处理访问拒绝异常
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        log.warn("访问被拒绝：{}", ex.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
            .code("ACCESS_DENIED")
            .message("您没有权限访问此资源")
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }
    
    // 处理系统异常
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        log.error("系统异常，请求URL：{}", request.getRequestURL(), ex);
        
        ErrorResponse error = ErrorResponse.builder()
            .code("INTERNAL_ERROR")
            .message("系统内部错误，请稍后重试")
            .timestamp(LocalDateTime.now())
            .path(request.getRequestURI())
            .build();
            
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
    
    // 处理 HTTP 方法不支持异常
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.warn("不支持的HTTP方法：{}", ex.getMethod());
        
        ErrorResponse error = ErrorResponse.builder()
            .code("METHOD_NOT_SUPPORTED")
            .message(String.format("不支持的HTTP方法：%s", ex.getMethod()))
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }
    
    // 处理媒体类型不支持异常
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        log.warn("不支持的媒体类型：{}", ex.getContentType());
        
        ErrorResponse error = ErrorResponse.builder()
            .code("MEDIA_TYPE_NOT_SUPPORTED")
            .message(String.format("不支持的媒体类型：%s", ex.getContentType()))
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(error);
    }
}

// 错误响应类
@Data
@Builder
public class ErrorResponse {
    private String code;
    private String message;
    private LocalDateTime timestamp;
    private String path;
    private Map<String, Object> details;
    
    public static ErrorResponseBuilder builder() {
        return new ErrorResponseBuilder();
    }
}

// 自定义业务异常
public class BusinessException extends RuntimeException {
    private final String code;
    
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
    
    public BusinessException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
    
    public String getCode() {
        return code;
    }
}
```

### 2. 特定异常处理

```java
// 用户相关异常处理
@ControllerAdvice(assignableTypes = {UserController.class})
public class UserExceptionHandler {
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .code("USER_NOT_FOUND")
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(DuplicateUsernameException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateUsername(DuplicateUsernameException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .code("DUPLICATE_USERNAME")
            .message("用户名已存在")
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }
}

// 文件上传异常处理
@ControllerAdvice
public class FileUploadExceptionHandler {
    
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .code("FILE_SIZE_EXCEEDED")
            .message("上传文件大小超过限制")
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
    }
    
    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ErrorResponse> handleMultipartException(MultipartException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .code("MULTIPART_ERROR")
            .message("文件上传格式错误")
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
}
```

### 3. 异常处理配置

```java
@Configuration
public class ExceptionHandlingConfig {
    
    // 配置简单异常解析器
    @Bean
    public SimpleMappingExceptionResolver simpleMappingExceptionResolver() {
        SimpleMappingExceptionResolver resolver = new SimpleMappingExceptionResolver();
        
        Properties mappings = new Properties();
        mappings.setProperty("BusinessException", "error/business");
        mappings.setProperty("EntityNotFoundException", "error/not-found");
        mappings.setProperty("AccessDeniedException", "error/access-denied");
        mappings.setProperty("Exception", "error/general");
        
        resolver.setExceptionMappings(mappings);
        resolver.setDefaultErrorView("error/default");
        resolver.setExceptionAttribute("exception");
        
        return resolver;
    }
    
    // 配置默认异常属性
    @Bean
    public DefaultHandlerExceptionResolver defaultHandlerExceptionResolver() {
        return new DefaultHandlerExceptionResolver();
    }
}
```

---

## 拦截器

### 1. 自定义拦截器

```java
// 日志拦截器
@Slf4j
public class LoggingInterceptor implements HandlerInterceptor {
    
    private static final String START_TIME = "startTime";
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                           HttpServletResponse response, 
                           Object handler) throws Exception {
        
        long startTime = System.currentTimeMillis();
        request.setAttribute(START_TIME, startTime);
        
        String method = request.getMethod();
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();
        String userAgent = request.getHeader("User-Agent");
        String clientIp = getClientIpAddress(request);
        
        log.info("请求开始 - {} {} {} - IP: {} - User-Agent: {}", 
                method, uri, queryString != null ? "?" + queryString : "", 
                clientIp, userAgent);
        
        return true;
    }
    
    @Override
    public void postHandle(HttpServletRequest request, 
                          HttpServletResponse response, 
                          Object handler, 
                          ModelAndView modelAndView) throws Exception {
        
        if (modelAndView != null) {
            log.debug("视图名称：{}", modelAndView.getViewName());
            log.debug("模型数据：{}", modelAndView.getModel().keySet());
        }
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, 
                              HttpServletResponse response, 
                              Object handler, 
                              Exception ex) throws Exception {
        
        Long startTime = (Long) request.getAttribute(START_TIME);
        if (startTime != null) {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            String method = request.getMethod();
            String uri = request.getRequestURI();
            int status = response.getStatus();
            
            if (ex != null) {
                log.error("请求异常 - {} {} - 状态码: {} - 耗时: {}ms - 异常: {}", 
                         method, uri, status, duration, ex.getMessage());
            } else {
                log.info("请求完成 - {} {} - 状态码: {} - 耗时: {}ms", 
                        method, uri, status, duration);
            }
        }
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}

// 认证拦截器
@Component
public class AuthenticationInterceptor implements HandlerInterceptor {
    
    @Autowired
    private JwtTokenService jwtTokenService;
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                           HttpServletResponse response, 
                           Object handler) throws Exception {
        
        // 检查是否需要认证
        if (handler instanceof HandlerMethod) {
            HandlerMethod handlerMethod = (HandlerMethod) handler;
            
            // 检查方法或类上是否有 @PublicApi 注解
            if (handlerMethod.hasMethodAnnotation(PublicApi.class) ||
                handlerMethod.getBeanType().isAnnotationPresent(PublicApi.class)) {
                return true; // 公开API，无需认证
            }
        }
        
        // 获取 token
        String token = extractToken(request);
        if (token == null) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.getWriter().write("{\"error\":\"Missing authentication token\"}");
            return false;
        }
        
        // 验证 token
        try {
            User user = jwtTokenService.validateToken(token);
            request.setAttribute("currentUser", user);
            return true;
        } catch (Exception e) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.getWriter().write("{\"error\":\"Invalid authentication token\"}");
            return false;
        }
    }
    
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}

// 权限拦截器
@Component
public class AuthorizationInterceptor implements HandlerInterceptor {
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                           HttpServletResponse response, 
                           Object handler) throws Exception {
        
        if (handler instanceof HandlerMethod) {
            HandlerMethod handlerMethod = (HandlerMethod) handler;
            
            // 检查是否需要特定权限
            RequirePermission requirePermission = handlerMethod.getMethodAnnotation(RequirePermission.class);
            if (requirePermission == null) {
                requirePermission = handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
            }
            
            if (requirePermission != null) {
                User currentUser = (User) request.getAttribute("currentUser");
                if (currentUser == null) {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    return false;
                }
                
                String[] requiredPermissions = requirePermission.value();
                if (!hasPermissions(currentUser, requiredPermissions)) {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.getWriter().write("{\"error\":\"Insufficient permissions\"}");
                    return false;
                }
            }
        }
        
        return true;
    }
    
    private boolean hasPermissions(User user, String[] requiredPermissions) {
        Set<String> userPermissions = user.getPermissions();
        return Arrays.stream(requiredPermissions)
                    .allMatch(userPermissions::contains);
    }
}
```

### 2. 拦截器配置

```java
@Configuration
public class InterceptorConfig implements WebMvcConfigurer {
    
    @Autowired
    private AuthenticationInterceptor authenticationInterceptor;
    
    @Autowired
    private AuthorizationInterceptor authorizationInterceptor;
    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        
        // 日志拦截器 - 拦截所有请求
        registry.addInterceptor(new LoggingInterceptor())
                .addPathPatterns("/**")
                .excludePathPatterns("/static/**", "/css/**", "/js/**", "/images/**");
        
        // 认证拦截器 - 拦截 API 请求
        registry.addInterceptor(authenticationInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/public/**", "/api/auth/**");
        
        // 权限拦截器 - 在认证拦截器之后
        registry.addInterceptor(authorizationInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/public/**", "/api/auth/**");
        
        // 限流拦截器
        registry.addInterceptor(new RateLimitInterceptor())
                .addPathPatterns("/api/**");
        
        // 国际化拦截器
        registry.addInterceptor(new LocaleChangeInterceptor())
                .addPathPatterns("/**");
    }
}

// 限流拦截器
@Component
public class RateLimitInterceptor implements HandlerInterceptor {
    
    private final Map<String, RateLimiter> rateLimiters = new ConcurrentHashMap<>();
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                           HttpServletResponse response, 
                           Object handler) throws Exception {
        
        String clientIp = getClientIpAddress(request);
        RateLimiter rateLimiter = rateLimiters.computeIfAbsent(clientIp, 
            k -> RateLimiter.create(10.0)); // 每秒10个请求
        
        if (!rateLimiter.tryAcquire()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("{\"error\":\"Rate limit exceeded\"}");
            return false;
        }
        
        return true;
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        // 实现获取客户端IP的逻辑
        return request.getRemoteAddr();
    }
}
```

### 3. 拦截器注解

```java
// 公开API注解
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface PublicApi {
}

// 权限要求注解
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
    String[] value();
}

// 限流注解
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    double value() default 10.0; // 每秒请求数
    TimeUnit timeUnit() default TimeUnit.SECONDS;
}

// 使用示例
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @GetMapping
    @PublicApi
    public List<User> getAllUsers() {
        return userService.findAll();
    }
    
    @PostMapping
    @RequirePermission({"USER_CREATE"})
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        User savedUser = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }
    
    @DeleteMapping("/{id}")
    @RequirePermission({"USER_DELETE", "ADMIN"})
    @RateLimit(5.0)
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
``` ViewResolver viewResolver() {
        InternalResourceViewResolver resolver = new InternalResourceViewResolver();
        resolver.setPrefix("/WEB-INF/views/");
        resolver.setSuffix(".jsp");
        return resolver;
    }
    
    // 配置静态资源处理
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
                .addResourceLocations("/static/");
    }
}

// Spring Boot 自动配置
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### 2. HandlerMapping

```java
/**
 * HandlerMapping 负责将请求映射到处理器
 */

@Controller
public class ProductController {
    
    // 简单路径映射
    @RequestMapping("/products")
    public String listProducts() {
        return "product-list";
    }
    
    // 带参数的路径映射
    @RequestMapping("/products/{id}")
    public String showProduct(@PathVariable Long id, Model model) {
        // 处理逻辑
        return "product-detail";
    }
    
    // HTTP 方法映射
    @RequestMapping(value = "/products", method = RequestMethod.POST)
    public String createProduct(@ModelAttribute Product product) {
        // 创建产品
        return "redirect:/products";
    }
}

// 使用专门的注解
@RestController
@RequestMapping("/api/products")
public class ProductRestController {
    
    @GetMapping
    public List<Product> getAllProducts() {
        return productService.findAll();
    }
    
    @GetMapping("/{id}")
    public Product getProduct(@PathVariable Long id) {
        return productService.findById(id);
    }
    
    @PostMapping
    public Product createProduct(@RequestBody Product product) {
        return productService.save(product);
    }
    
    @PutMapping("/{id}")
    public Product updateProduct(@PathVariable Long id, @RequestBody Product product) {
        product.setId(id);
        return productService.update(product);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

### 3. HandlerAdapter

```java
/**
 * HandlerAdapter 负责调用处理器方法
 * Spring MVC 提供了多种 HandlerAdapter
 */

// 注解驱动的处理器适配器配置
@Configuration
@EnableWebMvc
public class WebMvcConfig implements WebMvcConfigurer {
    
    // 配置消息转换器
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // JSON 转换器
        MappingJackson2HttpMessageConverter jsonConverter = new MappingJackson2HttpMessageConverter();
        jsonConverter.setObjectMapper(new ObjectMapper());
        converters.add(jsonConverter);
        
        // XML 转换器
        MappingJackson2XmlHttpMessageConverter xmlConverter = new MappingJackson2XmlHttpMessageConverter();
        converters.add(xmlConverter);
    }
    
    // 配置参数解析器
    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CustomArgumentResolver());
    }
    
    // 配置返回值处理器
    @Override
    public void addReturnValueHandlers(List<HandlerMethodReturnValueHandler> handlers) {
        handlers.add(new CustomReturnValueHandler());
    }
}

// 自定义参数解析器
public class CustomArgumentResolver implements HandlerMethodArgumentResolver {
    
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class);
    }
    
    @Override
    public Object resolveArgument(MethodParameter parameter, 
                                ModelAndViewContainer mavContainer,
                                NativeWebRequest webRequest, 
                                WebDataBinderFactory binderFactory) throws Exception {
        // 从 session 或 security context 中获取当前用户
        return getCurrentUser(webRequest);
    }
    
    private User getCurrentUser(NativeWebRequest request) {
        // 实现获取当前用户的逻辑
        return new User();
    }
}
```

### 4. ViewResolver

```java
/**
 * ViewResolver 负责解析视图名称到具体的视图实现
 */

@Configuration
public class ViewConfig {
    
    // JSP 视图解析器
    @Bean
    public ViewResolver jspViewResolver() {
        InternalResourceViewResolver resolver = new InternalResourceViewResolver();
        resolver.setPrefix("/WEB-INF/views/");
        resolver.setSuffix(".jsp");
        resolver.setOrder(2);
        return resolver;
    }
    
    // Thymeleaf 视图解析器
    @Bean
    public SpringTemplateEngine templateEngine() {
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(templateResolver());
        return engine;
    }
    
    @Bean
    public ITemplateResolver templateResolver() {
        SpringResourceTemplateResolver resolver = new SpringResourceTemplateResolver();
        resolver.setPrefix("/WEB-INF/templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        return resolver;
    }
    
    @Bean
    public ThymeleafViewResolver thymeleafViewResolver() {
        ThymeleafViewResolver resolver = new ThymeleafViewResolver();
        resolver.setTemplateEngine(templateEngine());
        resolver.setOrder(1);
        return resolver;
    }
    
    // 内容协商视图解析器
    @Bean
    public ContentNegotiatingViewResolver contentNegotiatingViewResolver() {
        ContentNegotiatingViewResolver resolver = new ContentNegotiatingViewResolver();
        
        List<ViewResolver> viewResolvers = new ArrayList<>();
        viewResolvers.add(thymeleafViewResolver());
        viewResolvers.add(jspViewResolver());
        resolver.setViewResolvers(viewResolvers);
        
        List<View> defaultViews = new ArrayList<>();
        defaultViews.add(new MappingJackson2JsonView());
        resolver.setDefaultViews(defaultViews);
        
        return resolver;
    }
}
```

---

## 请求处理流程

### 1. 完整的请求处理流程

```java
/**
 * Spring MVC 请求处理流程：
 * 
 * 1. 客户端发送请求到 DispatcherServlet
 * 2. DispatcherServlet 查询 HandlerMapping 找到处理器
 * 3. DispatcherServlet 调用 HandlerAdapter 执行处理器
 * 4. 处理器执行业务逻辑并返回 ModelAndView
 * 5. DispatcherServlet 将 ModelAndView 传给 ViewResolver
 * 6. ViewResolver 解析视图名称并返回 View
 * 7. DispatcherServlet 渲染视图
 * 8. 返回响应给客户端
 */

@Controller
public class OrderController {
    
    @Autowired
    private OrderService orderService;
    
    // 1. 接收请求
    @GetMapping("/orders/{id}")
    public ModelAndView showOrder(@PathVariable Long id) {
        
        // 2. 执行业务逻辑
        Order order = orderService.findById(id);
        
        // 3. 准备模型数据
        ModelAndView mav = new ModelAndView();
        mav.addObject("order", order);
        mav.addObject("orderItems", order.getItems());
        
        // 4. 设置视图名称
        mav.setViewName("order-detail");
        
        return mav; // 5. 返回 ModelAndView
    }
    
    // 使用 Model 参数的简化方式
    @GetMapping("/orders")
    public String listOrders(Model model, 
                           @RequestParam(defaultValue = "0") int page,
                           @RequestParam(defaultValue = "10") int size) {
        
        Page<Order> orders = orderService.findAll(PageRequest.of(page, size));
        
        model.addAttribute("orders", orders.getContent());
        model.addAttribute("currentPage", page);
        model.addAttribute("totalPages", orders.getTotalPages());
        
        return "order-list";
    }
}
```

### 2. 异步请求处理

```java
@RestController
@RequestMapping("/api/async")
public class AsyncController {
    
    @Autowired
    private AsyncService asyncService;
    
    // 返回 Callable
    @GetMapping("/callable")
    public Callable<String> handleCallable() {
        return () -> {
            Thread.sleep(2000); // 模拟长时间处理
            return "Callable result";
        };
    }
    
    // 返回 DeferredResult
    @GetMapping("/deferred")
    public DeferredResult<String> handleDeferred() {
        DeferredResult<String> deferredResult = new DeferredResult<>(5000L);
        
        // 异步处理
        CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(2000);
                return "Deferred result";
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }).whenComplete((result, throwable) -> {
            if (throwable != null) {
                deferredResult.setErrorResult(throwable);
            } else {
                deferredResult.setResult(result);
            }
        });
        
        return deferredResult;
    }
    
    // 使用 @Async 注解
    @GetMapping("/future")
    public CompletableFuture<String> handleFuture() {
        return asyncService.processAsync();
    }
    
    // Server-Sent Events
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter handleSse() {
        SseEmitter emitter = new SseEmitter();
        
        // 异步发送事件
        CompletableFuture.runAsync(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    emitter.send("Event " + i);
                    Thread.sleep(1000);
                }
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        
        return emitter;
    }
}

@Service
public class AsyncService {
    
    @Async
    public CompletableFuture<String> processAsync() {
        try {
            Thread.sleep(2000);
            return CompletableFuture.completedFuture("Async processing completed");
        } catch (InterruptedException e) {
            return CompletableFuture.failedFuture(e);
        }
    }
}
```

---

## 控制器开发

### 1. 控制器基础

```java
// 传统控制器
@Controller
public class TraditionalController {
    
    @RequestMapping("/hello")
    public ModelAndView hello() {
        ModelAndView mav = new ModelAndView("hello");
        mav.addObject("message", "Hello World!");
        return mav;
    }
}

// RESTful 控制器
@RestController
@RequestMapping("/api/books")
public class BookController {
    
    @Autowired
    private BookService bookService;
    
    @GetMapping
    public List<Book> getAllBooks() {
        return bookService.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Book> getBook(@PathVariable Long id) {
        Book book = bookService.findById(id);
        return book != null ? ResponseEntity.ok(book) : ResponseEntity.notFound().build();
    }
    
    @PostMapping
    public ResponseEntity<Book> createBook(@Valid @RequestBody Book book) {
        Book savedBook = bookService.save(book);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(savedBook.getId())
                .toUri();
        return ResponseEntity.created(location).body(savedBook);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Book> updateBook(@PathVariable Long id, @Valid @RequestBody Book book) {
        if (!bookService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        book.setId(id);
        Book updatedBook = bookService.save(book);
        return ResponseEntity.ok(updatedBook);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        if (!bookService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        bookService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
```

### 2. 控制器继承和组合

```java
// 基础控制器
@RestController
public abstract class BaseController<T, ID> {
    
    protected abstract BaseService<T, ID> getService();
    
    @GetMapping
    public ResponseEntity<List<T>> findAll() {
        List<T> entities = getService().findAll();
        return ResponseEntity.ok(entities);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<T> findById(@PathVariable ID id) {
        Optional<T> entity = getService().findById(id);
        return entity.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<T> create(@Valid @RequestBody T entity) {
        T savedEntity = getService().save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedEntity);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<T> update(@PathVariable ID id, @Valid @RequestBody T entity) {
        if (!getService().existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        T updatedEntity = getService().save(entity);
        return ResponseEntity.ok(updatedEntity);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable ID id) {
        if (!getService().existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        getService().deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

// 具体控制器
@RestController
@RequestMapping("/api/users")
public class UserController extends BaseController<User, Long> {
    
    @Autowired
    private UserService userService;
    
    @Override
    protected BaseService<User, Long> getService() {
        return userService;
    }
    
    // 特定的业务方法
    @PostMapping("/{id}/activate")
    public ResponseEntity<Void> activateUser(@PathVariable Long id) {
        userService.activateUser(id);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<User>> searchUsers(@RequestParam String keyword) {
        List<User> users = userService.searchByKeyword(keyword);
        return ResponseEntity.ok(users);
    }
}
```

### 3. 控制器建议

```java
// 全局控制器建议
@ControllerAdvice
public class GlobalControllerAdvice {
    
    // 全局异常处理
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex) {
        ErrorResponse error = new ErrorResponse("ENTITY_NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        ErrorResponse error = new ErrorResponse("VALIDATION_ERROR", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    // 全局数据绑定
    @ModelAttribute("currentUser")
    public User getCurrentUser(HttpServletRequest request) {
        // 从 session 或 security context 获取当前用户
        return getCurrentUserFromSession(request);
    }
    
    // 全局数据绑定初始化
    @InitBinder
    public void initBinder(WebDataBinder binder) {
        // 自定义日期格式
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        binder.registerCustomEditor(Date.class, new CustomDateEditor(dateFormat, false));
        
        // 字符串去空格
        binder.registerCustomEditor(String.class, new StringTrimmerEditor(true));
    }
}

// 特定控制器建议
@ControllerAdvice(assignableTypes = {UserController.class, AdminController.class})
public class UserControllerAdvice {
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse error = new ErrorResponse("USER_NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ModelAttribute("userRoles")
    public List<Role> getUserRoles() {
        return roleService.findAll();
    }
}
```

---

## 请求映射

### 1. 基本映射

```java
@Controller
@RequestMapping("/products")
public class ProductController {
    
    // 简单路径映射
    @RequestMapping("/list")
    public String listProducts() {
        return "product-list";
    }
    
    // HTTP 方法限制
    @RequestMapping(value = "/create", method = RequestMethod.GET)
    public String showCreateForm() {
        return "product-form";
    }
    
    @RequestMapping(value = "/create", method = RequestMethod.POST)
    public String createProduct(@ModelAttribute Product product) {
        // 处理创建逻辑
        return "redirect:/products/list";
    }
    
    // 使用组合注解
    @GetMapping("/edit/{id}")
    public String showEditForm(@PathVariable Long id, Model model) {
        Product product = productService.findById(id);
        model.addAttribute("product", product);
        return "product-form";
    }
    
    @PostMapping("/edit/{id}")
    public String updateProduct(@PathVariable Long id, @ModelAttribute Product product) {
        product.setId(id);
        productService.update(product);
        return "redirect:/products/list";
    }
    
    @DeleteMapping("/delete/{id}")
    @ResponseBody
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.ok().build();
    }
}
```

### 2. 高级映射

```java
@RestController
@RequestMapping("/api/v1")
public class AdvancedMappingController {
    
    // 路径变量
    @GetMapping("/users/{userId}/orders/{orderId}")
    public Order getUserOrder(@PathVariable Long userId, @PathVariable Long orderId) {
        return orderService.findByUserIdAndOrderId(userId, orderId);
    }
    
    // 正则表达式路径变量
    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String filename) {
        Resource file = fileService.loadFile(filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(file);
    }
    
    // 矩阵变量
    @GetMapping("/cars/{brand};color={color};year={year}")
    public List<Car> findCars(@PathVariable String brand,
                             @MatrixVariable String color,
                             @MatrixVariable int year) {
        return carService.findByBrandAndColorAndYear(brand, color, year);
    }
    
    // 请求参数
    @GetMapping("/search")
    public List<Product> searchProducts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String category) {
        return productService.search(keyword, category, page, size);
    }
    
    // 请求头
    @GetMapping("/info")
    public ResponseEntity<String> getInfo(
            @RequestHeader("User-Agent") String userAgent,
            @RequestHeader(value = "Accept-Language", defaultValue = "en") String language) {
        return ResponseEntity.ok("User-Agent: " + userAgent + ", Language: " + language);
    }
    
    // Cookie
    @GetMapping("/preferences")
    public UserPreferences getPreferences(@CookieValue("theme") String theme) {
        return userPreferenceService.getByTheme(theme);
    }
    
    // 内容类型限制
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        // 处理文件上传
        return ResponseEntity.ok("File uploaded successfully");
    }
    
    // 响应类型限制
    @GetMapping(value = "/data", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
    public Data getData() {
        return dataService.getData();
    }
}
```

### 3. 条件映射

```java
@RestController
public class ConditionalMappingController {
    
    // 基于请求参数的条件映射
    @GetMapping(value = "/api/data", params = "version=1")
    public DataV1 getDataV1() {
        return new DataV1();
    }
    
    @GetMapping(value = "/api/data", params = "version=2")
    public DataV2 getDataV2() {
        return new DataV2();
    }
    
    // 基于请求头的条件映射
    @GetMapping(value = "/api/content", headers = "X-API-Version=1")
    public ContentV1 getContentV1() {
        return new ContentV1();
    }
    
    @GetMapping(value = "/api/content", headers = "X-API-Version=2")
    public ContentV2 getContentV2() {
        return new ContentV2();
    }
    
    // 基于媒体类型的条件映射
    @PostMapping(value = "/api/process", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> processJson(@RequestBody JsonData data) {
        return ResponseEntity.ok("Processed JSON data");
    }
    
    @PostMapping(value = "/api/process", consumes = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> processXml(@RequestBody XmlData data) {
        return ResponseEntity.ok("Processed XML data");
    }
    
    // 自定义条件
    @GetMapping("/api/mobile")
    @ConditionalOnMobile
    public MobileResponse getMobileData() {
        return new MobileResponse();
    }
    
    @GetMapping("/api/desktop")
    @ConditionalOnDesktop
    public DesktopResponse getDesktopData() {
        return new DesktopResponse();
    }
}

// 自定义条件注解
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@RequestMapping
public @interface ConditionalOnMobile {
}

// 自定义条件处理器
@Component
public class MobileCondition implements RequestCondition<MobileCondition> {
    
    @Override
    public MobileCondition combine(MobileCondition other) {
        return this;
    }
    
    @Override
    public MobileCondition getMatchingCondition(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null && userAgent.toLowerCase().contains("mobile")) {
            return this;
        }
        return null;
    }
    
    @Override
    public int compareTo(MobileCondition other, HttpServletRequest request) {
        return 0;
    }
}
```

---

## 参数绑定

### 1. 基本参数绑定

```java
@RestController
@RequestMapping("/api/binding")
public class ParameterBindingController {
    
    // 基本类型参数
    @GetMapping("/basic")
    public String basicTypes(
            @RequestParam String name,
            @RequestParam int age,
            @RequestParam boolean active,
            @RequestParam(required = false) Double salary) {
        return String.format("Name: %s, Age: %d, Active: %b, Salary: %s", 
                           name, age, active, salary);
    }
    
    // 数组和集合参数
    @GetMapping("/collections")
    public String collections(
            @RequestParam String[] tags,
            @RequestParam List<String> categories,
            @RequestParam Set<Integer> ids) {
        return String.format("Tags: %s, Categories: %s, IDs: %s", 
                           Arrays.toString(tags), categories, ids);
    }
    
    // 日期参数
    @GetMapping("/dates")
    public String dates(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDateTime) {
        return String.format("Start: %s, End: %s", startDate, endDateTime);
    }
    
    // 枚举参数
    @GetMapping("/enum")
    public String enumParam(@RequestParam Status status) {
        return "Status: " + status;
    }
    
    // 对象参数绑定
    @PostMapping("/object")
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        User savedUser = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }
    
    // 表单参数绑定
    @PostMapping("/form")
    public String handleForm(@ModelAttribute UserForm userForm, BindingResult result) {
        if (result.hasErrors()) {
            return "user-form";
        }
        userService.save(userForm.toUser());
        return "redirect:/users";
    }
}

// 用户表单类
public class UserForm {
    
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 20, message = "用户名长度必须在3-20之间")
    private String username;
    
    @Email(message = "邮箱格式不正确")
    private String email;
    
    @Min(value = 18, message = "年龄不能小于18")
    @Max(value = 100, message = "年龄不能大于100")
    private Integer age;
    
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private Date birthDate;
    
    private List<String> hobbies;
    
    // getters and setters
    
    public User toUser() {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setAge(age);
        user.setBirthDate(birthDate);
        user.setHobbies(hobbies);
        return user;
    }
}
```

### 2. 自定义参数绑定

```java
// 自定义参数解析器
public class CustomUserArgumentResolver implements HandlerMethodArgumentResolver {
    
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class) &&
               parameter.getParameterType().equals(User.class);
    }
    
    @Override
    public Object resolveArgument(MethodParameter parameter,
                                ModelAndViewContainer mavContainer,
                                NativeWebRequest webRequest,
                                WebDataBinderFactory binderFactory) throws Exception {
        
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        
        // 从 session 获取用户
        HttpSession session = request.getSession(false);
        if (session != null) {
            User user = (User) session.getAttribute("currentUser");
            if (user != null) {
                return user;
            }
        }
        
        // 从 JWT token 获取用户
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            return jwtService.getUserFromToken(jwt);
        }
        
        throw new IllegalArgumentException("无法获取当前用户");
    }
}

// 自定义注解
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {
}

// 注册自定义解析器
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    
    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CustomUserArgumentResolver());
    }
}

// 使用自定义参数解析器
@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    
    @GetMapping
    public ResponseEntity<User> getProfile(@CurrentUser User currentUser) {
        return ResponseEntity.ok(currentUser);
    }
    
    @PutMapping
    public ResponseEntity<User> updateProfile(@CurrentUser User currentUser,
                                            @Valid @RequestBody UserUpdateRequest request) {
        // 更新用户信息
        currentUser.setEmail(request.getEmail());
        currentUser.setPhone(request.getPhone());
        
        User updatedUser = userService.update(currentUser);
        return ResponseEntity.ok(updatedUser);
    }
}
```

### 3. 数据绑定配置

```java
@Configuration
public class DataBindingConfig {
    
    // 全局数据绑定配置
    @InitBinder
    public void initBinder(WebDataBinder binder) {
        
        // 日期格式化
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        dateFormat.setLenient(false);
        binder.registerCustomEditor(Date.class, new CustomDateEditor(dateFormat, true));
        
        // 字符串处理
        binder.registerCustomEditor(String.class, new StringTrimmerEditor(true));
        
        // 数字格式化
        NumberFormat numberFormat = NumberFormat.getInstance();
        binder.registerCustomEditor(Double.class, new CustomNumberEditor(Double.class, numberFormat, true));
        
        // 禁止绑定某些字段（安全考虑）
        binder.setDisallowedFields("id", "createdAt", "updatedAt");
        
        // 必需字段
        binder.setRequiredFields("username", "email");
    }
    
    // 自定义属性编辑器
    @Bean
    public PropertyEditorRegistrar customPropertyEditorRegistrar() {
        return registry -> {
            registry.registerCustomEditor(Status.class, new StatusPropertyEditor());
            registry.registerCustomEditor(Priority.class, new PriorityPropertyEditor());
        };
    }
}

// 自定义属性编辑器
public class StatusPropertyEditor extends PropertyEditorSupport {
    
    @Override
    public void setAsText(String text) throws IllegalArgumentException {
        if (StringUtils.hasText(text)) {
            setValue(Status.valueOf(text.toUpperCase()));
        } else {
            setValue(null);
        }
    }
    
    @Override
    public String getAsText() {
        Status status = (Status) getValue();
        return status != null ? status.name() : "";
    }
}

// 自定义转换器
@Component
public class StringToUserConverter implements Converter<String, User> {
    
    @Autowired
    private UserService userService;
    
    @Override
    public User convert(String source) {
        if (StringUtils.hasText(source)) {
            try {
                Long userId = Long.parseLong(source);
                return userService.findById(userId);
            } catch (NumberFormatException e) {
                // 可能是用户名
                return userService.findByUsername(source);
            }
        }
        return null;
    }
}

// 注册转换器
@Configuration
public class ConversionConfig implements WebMvcConfigurer {
    
    @Autowired
    private StringToUserConverter stringToUserConverter;
    
    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(stringToUserConverter);
        
        // 添加格式化器
        registry.addFormatter(new DateFormatter("yyyy-MM-dd"));
        registry.addFormatter(new NumberStyleFormatter("#,##0.00"));
    }
}
```

---

## 数据验证

### 1. Bean Validation

```java
// 实体类验证
public class User {
    
    @NotNull(message = "ID不能为空")
    private Long id;
    
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 20, message = "用户名长度必须在3-20之间")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "用户名只能包含字母、数字和下划线")
    private String username;
    
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;
    
    @NotNull(message = "年龄不能为空")
    @Min(value = 18, message = "年龄不能小于18")
    @Max(value = 100, message = "年龄不能大于100")
    private Integer age;
    
    @Past(message = "出生日期必须是过去的日期")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private Date birthDate;
    
    @DecimalMin(value = "0.0", message = "薪资不能为负数")
    @DecimalMax(value = "999999.99", message = "薪资不能超过999999.99")
    @Digits(integer = 6, fraction = 2, message = "薪资格式不正确")
    private BigDecimal salary;
    
    @Valid
    @NotNull(message = "地址信息不能为空")
    private Address address;
    
    @Size(min = 1, message = "至少需要一个角色")
    @Valid
    private List<Role> roles;
    
    // getters and setters
}

// 嵌套对象验证
public class Address {
    
    @NotBlank(message = "省份不能为空")
    private String province;
    
    @NotBlank(message = "城市不能为空")
    private String city;
    
    @NotBlank(message = "详细地址不能为空")
    @Size(max = 200, message = "详细地址不能超过200个字符")
    private String detail;
    
    @Pattern(regexp = "\\d{6}", message = "邮政编码必须是6位数字")
    private String zipCode;
    
    // getters and setters
}

// 控制器中使用验证
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody User user, BindingResult result) {
        
        // 检查验证结果
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error -> 
                errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.badRequest().body(errors);
        }
        
        User savedUser = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, 
                                      @Valid @RequestBody User user, 
                                      BindingResult result) {
        
        if (result.hasErrors()) {
            return ResponseEntity.badRequest().body(getValidationErrors(result));
        }
        
        user.setId(id);
        User updatedUser = userService.update(user);
        return ResponseEntity.ok(updatedUser);
    }
    
    private Map<String, Object> getValidationErrors(BindingResult result) {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> fieldErrors = new HashMap<>();
        
        result.getFieldErrors().forEach(error -> 
            fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        
        List<String> globalErrors = result.getGlobalErrors().stream()
            .map(ObjectError::getDefaultMessage)
            .collect(Collectors.toList());
        
        response.put("fieldErrors", fieldErrors);
        response.put("globalErrors", globalErrors);
        response.put("message", "验证失败");
        
        return response;
    }
}
```

### 2. 自定义验证

```java
// 自定义验证注解
@Target({ElementType.FIELD, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueUsernameValidator.class)
public @interface UniqueUsername {
    String message() default "用户名已存在";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// 自定义验证器
@Component
public class UniqueUsernameValidator implements ConstraintValidator<UniqueUsername, String> {
    
    @Autowired
    private UserService userService;
    
    @Override
    public void initialize(UniqueUsername constraintAnnotation) {
        // 初始化逻辑
    }
    
    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        if (username == null || username.trim().isEmpty()) {
            return true; // 空值由 @NotBlank 处理
        }
        
        return !userService.existsByUsername(username);
    }
}

// 复杂自定义验证
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordMatchValidator.class)
public @interface PasswordMatch {
    String message() default "密码和确认密码不匹配";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    
    String password();
    String confirmPassword();
}

@Component
public class PasswordMatchValidator implements ConstraintValidator<PasswordMatch, Object> {
    
    private String passwordField;
    private String confirmPasswordField;
    
    @Override
    public void initialize(PasswordMatch constraintAnnotation) {
        this.passwordField = constraintAnnotation.password();
        this.confirmPasswordField = constraintAnnotation.confirmPassword();
    }
    
    @Override
    public boolean isValid(Object obj, ConstraintValidatorContext context) {
        try {
            Object password = getFieldValue(obj, passwordField);
            Object confirmPassword = getFieldValue(obj, confirmPasswordField);
            
            return Objects.equals(password, confirmPassword);
        } catch (Exception e) {
            return false;
        }
    }
    
    private Object getFieldValue(Object obj, String fieldName) throws Exception {
        Field field = obj.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        return field.get(obj);
    }
}

// 使用自定义验证
@PasswordMatch(password = "password", confirmPassword = "confirmPassword")
public class UserRegistrationRequest {
    
    @UniqueUsername
    @NotBlank(message = "用户名不能为空")
    private String username;
    
    @NotBlank(message = "密码不能为空")
    @Size(min = 8, message = "密码长度不能少于8位")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$", 
             message = "密码必须包含大小写字母和数字")
    private String password;
    
    @NotBlank(message = "确认密码不能为空")
    private String confirmPassword;
    
    // getters and setters
}
```

### 3. 验证组

```java
// 验证组接口
public interface CreateGroup {}
public interface UpdateGroup {}
public interface DeleteGroup {}

// 使用验证组
public class User {
    
    @NotNull(groups = {UpdateGroup.class, DeleteGroup.class}, message = "更新和删除时ID不能为空")
    private Long id;
    
    @NotBlank(groups = {CreateGroup.class, UpdateGroup.class}, message = "用户名不能为空")
    @UniqueUsername(groups = CreateGroup.class)
    private String username;
    
    @NotBlank(groups = {CreateGroup.class}, message = "创建用户时密码不能为空")
    @Size(min = 8, groups = {CreateGroup.class, UpdateGroup.class})
    private String password;
    
    @Email(groups = {CreateGroup.class, UpdateGroup.class})
    private String email;
    
    // getters and setters
}

// 控制器中使用验证组
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @PostMapping
    public ResponseEntity<?> createUser(@Validated(CreateGroup.class) @RequestBody User user, 
                                      BindingResult result) {
        if (result.hasErrors()) {
            return ResponseEntity.badRequest().body(getValidationErrors(result));
        }
        
        User savedUser = userService.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                      @Validated(UpdateGroup.class) @RequestBody User user, 
                                      BindingResult result) {
        if (result.hasErrors()) {
            return ResponseEntity.badRequest().body(getValidationErrors(result));
        }
        
        user.setId(id);
        User updatedUser = userService.update(user);
        return ResponseEntity.ok(updatedUser);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@Validated(DeleteGroup.class) @RequestBody User user) {
        userService.delete(user.getId());
        return ResponseEntity.noContent().build();
    }
}
```

### 4. 全局验证异常处理

```java
@ControllerAdvice
public class ValidationExceptionHandler {
    
    // 处理 @Valid 验证失败
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex) {
        
        ValidationErrorResponse errorResponse = new ValidationErrorResponse();
        errorResponse.setMessage("验证失败");
        errorResponse.setTimestamp(LocalDateTime.now());
        
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        errorResponse.setFieldErrors(fieldErrors);
        
        List<String> globalErrors = ex.getBindingResult().getGlobalErrors().stream()
            .map(ObjectError::getDefaultMessage)
            .collect(Collectors.toList());
        errorResponse.setGlobalErrors(globalErrors);
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    // 处理 @Validated 验证失败
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ValidationErrorResponse> handleConstraintViolationException(
            ConstraintViolationException ex) {
        
        ValidationErrorResponse errorResponse = new ValidationErrorResponse();
        errorResponse.setMessage("参数验证失败");
        errorResponse.setTimestamp(LocalDateTime.now());
        
        Map<String, String> violations = new HashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String propertyPath = violation.getPropertyPath().toString();
            String message = violation.getMessage();
            violations.put(propertyPath, message);
        });
        errorResponse.setFieldErrors(violations);
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    // 处理参数类型转换异常
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ValidationErrorResponse> handleTypeMismatchException(
            MethodArgumentTypeMismatchException ex) {
        
        ValidationErrorResponse errorResponse = new ValidationErrorResponse();
        errorResponse.setMessage("参数类型错误");
        errorResponse.setTimestamp(LocalDateTime.now());
        
        Map<String, String> fieldErrors = new HashMap<>();
        fieldErrors.put(ex.getName(), 
            String.format("参数 '%s' 的值 '%s' 无法转换为 %s 类型", 
                         ex.getName(), ex.getValue(), ex.getRequiredType().getSimpleName()));
        errorResponse.setFieldErrors(fieldErrors);
        
        return ResponseEntity.badRequest().body(errorResponse);
    }
}

// 验证错误响应类
public class ValidationErrorResponse {
    private String message;
    private LocalDateTime timestamp;
    private Map<String, String> fieldErrors;
    private List<String> globalErrors;
    
    // getters and setters
}
```

---

## 视图解析

### 1. 视图解析器配置

```java
@Configuration
@EnableWebMvc
public class ViewResolverConfig implements WebMvcConfigurer {
    
    // JSP 视图解析器
    @Bean
    public ViewResolver jspViewResolver() {
        InternalResourceViewResolver resolver = new InternalResourceViewResolver();
        resolver.setPrefix("/WEB-INF/views/");
        resolver.setSuffix(".jsp");
        resolver.setViewClass(JstlView.class);
        resolver.setOrder(3);
        return resolver;
    }
    
    // Thymeleaf 视图解析器
    @Bean
    public SpringTemplateEngine templateEngine() {
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(templateResolver());
        engine.setEnableSpringELCompiler(true);
        
        // 添加方言
        engine.addDialect(new SpringSecurityDialect());
        engine.addDialect(new Java8TimeDialect());
        
        return engine;
    }
    
    @Bean
    public ITemplateResolver templateResolver() {
        SpringResourceTemplateResolver resolver = new SpringResourceTemplateResolver();
        resolver.setApplicationContext(applicationContext);
        resolver.setPrefix("/WEB-INF/templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCacheable(false); // 开发环境设置为 false
        resolver.setCharacterEncoding("UTF-8");
        return resolver;
    }
    
    @Bean
    public