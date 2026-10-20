package example.orders;

import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }

    public Order create(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        return repository.save(new Order(UUID.randomUUID(), amount, Order.Status.CREATED));
    }

    public Order cancel(UUID id) {
        Order order = repository.findById(id).orElseThrow(OrderNotFoundException::new);
        Order cancelled = order.cancel();
        return cancelled == order ? order : repository.save(cancelled);
    }
}
