package example.orders;

public final class OrderTotal {
    private OrderTotal() {}

    public static long totalCents(long unitCents, int quantity) {
        if (unitCents < 0 || quantity <= 0) {
            throw new IllegalArgumentException("invalid order line");
        }
        return Math.multiplyExact(unitCents, quantity);
    }

    public static void main(String[] args) {
        System.out.println(totalCents(1990, 3));
    }
}
