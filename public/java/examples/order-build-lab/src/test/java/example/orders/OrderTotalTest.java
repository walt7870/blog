package example.orders;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class OrderTotalTest {
    @Test
    void totalsInCents() {
        assertEquals(5970, OrderTotal.totalCents(1990, 3));
    }

    @Test
    void acceptsZeroPrice() {
        assertEquals(0, OrderTotal.totalCents(0, 2));
    }

    @Test
    void rejectsInvalidLine() {
        assertThrows(IllegalArgumentException.class, () -> OrderTotal.totalCents(-1, 2));
        assertThrows(IllegalArgumentException.class, () -> OrderTotal.totalCents(1990, 0));
    }

    @Test
    void rejectsOverflow() {
        assertThrows(ArithmeticException.class, () -> OrderTotal.totalCents(Long.MAX_VALUE, 2));
    }
}
