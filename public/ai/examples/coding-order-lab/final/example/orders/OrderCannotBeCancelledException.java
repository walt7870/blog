package example.orders;

public class OrderCannotBeCancelledException extends RuntimeException {
    public OrderCannotBeCancelledException() {
        super("Order cannot be cancelled from its current state");
    }
}
