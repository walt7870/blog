package example.orders;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class OrderServiceTest {
    @Test void createsOrderWithFixedClock() {
        Instant fixedInstant = Instant.parse("2026-10-19T00:00:00Z");
        OrderRepository repository = new InMemoryOrderRepository();
        Clock clock = Clock.fixed(fixedInstant, ZoneOffset.UTC);
        OrderProperties properties = new OrderProperties("CNY", new BigDecimal("10000.00"));
        Order result = new OrderService(repository, properties, clock)
                .create(new CreateOrderCommand("C-1001", new BigDecimal("199.00")));
        assertThat(result.currency()).isEqualTo("CNY");
        assertThat(result.totalAmount()).isEqualByComparingTo("199.00");
        assertThat(result.createdAt()).isEqualTo(fixedInstant);
        assertThat(result.id()).isNotNull();
    }

    @Test void rejectsInvalidOrdersBeforeSaving() {
        OrderRepository repository = new OrderRepository() {
            public Order save(Order order) { throw new AssertionError("非法输入不能保存"); }
            public java.util.Optional<Order> find(java.util.UUID id) {
                throw new AssertionError("创建订单不应查询");
            }
        };
        OrderService service = new OrderService(repository,
                new OrderProperties("CNY", new BigDecimal("10000.00")), Clock.systemUTC());
        for (BigDecimal amount : new BigDecimal[]{null, BigDecimal.ZERO,
                new BigDecimal("-1"), new BigDecimal("10000.01")}) {
            assertThatIllegalArgumentException().isThrownBy(() ->
                    service.create(new CreateOrderCommand("C-1001", amount)));
        }
        assertThatIllegalArgumentException().isThrownBy(() -> service.create(null));
        assertThatIllegalArgumentException().isThrownBy(() ->
                service.create(new CreateOrderCommand(" ", BigDecimal.ONE)));
    }
}
