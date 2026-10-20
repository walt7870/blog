package example.orders;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CancelOrderTest {
    @Autowired MockMvc mvc;
    @Autowired InMemoryOrderRepository repository;

    private Order order(Order.Status status) {
        return new Order(UUID.randomUUID(), new BigDecimal("12.30"), status);
    }

    @Test void domainCreatesCancelledCopy() {
        Order original = order(Order.Status.CREATED);
        Order result = original.cancel();
        assertEquals(Order.Status.CANCELLED, result.status());
        assertEquals(original.id(), result.id());
        assertEquals(original.amount(), result.amount());
        assertEquals(Order.Status.CREATED, original.status());
    }
    @Test void domainRepeatReturnsSameObject() {
        Order cancelled = order(Order.Status.CANCELLED);
        assertSame(cancelled, cancelled.cancel());
    }
    @Test void domainPaidIsRejected() {
        assertThrows(OrderCannotBeCancelledException.class, () -> order(Order.Status.PAID).cancel());
    }
    @Test void serviceMissingIsRejected() {
        assertThrows(OrderNotFoundException.class,
            () -> new OrderService(new InMemoryOrderRepository()).cancel(UUID.randomUUID()));
    }
    @Test void serviceRepeatDoesNotSaveAgain() {
        CountingRepository repo = new CountingRepository();
        Order original = order(Order.Status.CREATED);
        repo.save(original);
        repo.saves = 0;
        OrderService service = new OrderService(repo);
        Order first = service.cancel(original.id());
        Order second = service.cancel(original.id());
        assertSame(first, second);
        assertEquals(Order.Status.CANCELLED, repo.findById(original.id()).orElseThrow().status());
        assertEquals(1, repo.saves);
    }
    @Test void servicePaidDoesNotSave() {
        CountingRepository repo = new CountingRepository();
        Order paid = order(Order.Status.PAID);
        repo.save(paid);
        repo.saves = 0;
        assertThrows(OrderCannotBeCancelledException.class, () -> new OrderService(repo).cancel(paid.id()));
        assertEquals(0, repo.saves);
        assertEquals(Order.Status.PAID, repo.findById(paid.id()).orElseThrow().status());
    }
    @Test void webCreateCancelRepeatAndMissing() throws Exception {
        String location = mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\":12.30}")).andExpect(status().isCreated())
            .andReturn().getResponse().getHeader("Location");
        for (int i = 0; i < 2; i++) {
            mvc.perform(post(location + "/cancel")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        }
        mvc.perform(post("/api/orders/" + UUID.randomUUID() + "/cancel"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }
    @Test void webPaidMapsToConflict() throws Exception {
        Order paid = order(Order.Status.PAID);
        repository.save(paid);
        mvc.perform(post("/api/orders/" + paid.id() + "/cancel"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ORDER_CANNOT_BE_CANCELLED"));
    }

    static class CountingRepository extends InMemoryOrderRepository {
        int saves;
        @Override public Order save(Order order) { saves++; return super.save(order); }
    }
}
