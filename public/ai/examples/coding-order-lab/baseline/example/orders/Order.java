package example.orders;

import java.math.BigDecimal;
import java.util.UUID;

public record Order(UUID id, BigDecimal amount, Status status) {
    public enum Status { CREATED }
}
