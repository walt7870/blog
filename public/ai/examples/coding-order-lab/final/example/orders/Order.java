package example.orders;

import java.math.BigDecimal;
import java.util.UUID;

public record Order(UUID id, BigDecimal amount, Status status) {
    public enum Status { CREATED, PAID, CANCELLED }

    public Order cancel() {
        if (status == Status.CANCELLED) return this;
        if (status != Status.CREATED) throw new OrderCannotBeCancelledException();
        return new Order(id, amount, Status.CANCELLED);
    }
}
