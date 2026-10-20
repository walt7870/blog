package example.orders;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@SpringBootApplication
@EnableConfigurationProperties(OrderProperties.class)
public class OrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }

    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean OrderRepository orderRepository() { return new InMemoryOrderRepository(); }
    @Bean OrderService orderService(OrderRepository repository,
                                   OrderProperties properties, Clock clock) {
        return new OrderService(repository, properties, clock);
    }
}

@Validated
@ConfigurationProperties("order")
record OrderProperties(@NotBlank String currency,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal maxAmount) {}

record CreateOrderCommand(String customerId, BigDecimal totalAmount) {}
record Order(UUID id, String customerId, String currency,
             BigDecimal totalAmount, Instant createdAt) {}

interface OrderRepository {
    Order save(Order order);
    Optional<Order> find(UUID id);
}

final class InMemoryOrderRepository implements OrderRepository {
    private final ConcurrentHashMap<UUID, Order> orders = new ConcurrentHashMap<>();
    public Order save(Order order) {
        if (orders.putIfAbsent(order.id(), order) != null) {
            throw new IllegalStateException("订单ID冲突");
        }
        return order;
    }
    public Optional<Order> find(UUID id) { return Optional.ofNullable(orders.get(id)); }
}

final class OrderService {
    private final OrderRepository repository;
    private final OrderProperties properties;
    private final Clock clock;

    OrderService(OrderRepository repository, OrderProperties properties, Clock clock) {
        this.repository = Objects.requireNonNull(repository);
        this.properties = Objects.requireNonNull(properties);
        this.clock = Objects.requireNonNull(clock);
        if (properties.currency() == null || properties.currency().isBlank()
                || properties.maxAmount() == null || properties.maxAmount().signum() <= 0) {
            throw new IllegalArgumentException("订单配置不合法");
        }
    }

    Order create(CreateOrderCommand command) {
        if (command == null || command.customerId() == null
                || command.customerId().isBlank() || command.totalAmount() == null
                || command.totalAmount().signum() <= 0
                || command.totalAmount().compareTo(properties.maxAmount()) > 0) {
            throw new IllegalArgumentException("客户编号或订单金额不合法");
        }
        return repository.save(new Order(UUID.randomUUID(), command.customerId().trim(),
                properties.currency(), command.totalAmount(), clock.instant()));
    }

    Optional<Order> find(UUID id) { return repository.find(id); }
}

record CreateOrderRequest(@NotBlank String customerId,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal totalAmount) {
    CreateOrderCommand toCommand() { return new CreateOrderCommand(customerId, totalAmount); }
}

@RestController
@RequestMapping("/api/orders")
class OrderController {
    private final OrderService service;
    OrderController(OrderService service) { this.service = service; }

    @PostMapping(consumes = "application/json", produces = "application/json")
    ResponseEntity<Order> create(@Valid @RequestBody CreateOrderRequest request) {
        Order order = service.create(request.toCommand());
        return ResponseEntity.created(URI.create("/api/orders/" + order.id())).body(order);
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    ResponseEntity<Order> find(@PathVariable UUID id) {
        return ResponseEntity.of(service.find(id));
    }
}

@RestControllerAdvice
class OrderErrors {
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ErrorBody> invalidOrder() {
        return ResponseEntity.badRequest().body(new ErrorBody("ORDER_INVALID", "订单参数不合法"));
    }
    record ErrorBody(String code, String message) {}
}
