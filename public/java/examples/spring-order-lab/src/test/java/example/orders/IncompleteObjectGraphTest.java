package example.orders;

import java.math.BigDecimal;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.*;

class IncompleteObjectGraphTest {
    @Test void refusesContextWithMissingRepository() {
        new ApplicationContextRunner()
                .withBean(OrderProperties.class, () ->
                        new OrderProperties("CNY", new BigDecimal("10000.00")))
                .withBean(Clock.class, Clock::systemUTC)
                .withBean(OrderService.class)
                .run(context -> assertThat(context).hasFailed());
    }
}
