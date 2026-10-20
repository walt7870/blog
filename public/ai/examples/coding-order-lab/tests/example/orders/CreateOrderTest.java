package example.orders;

import java.math.BigDecimal;
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
class CreateOrderTest {
    @Autowired MockMvc mvc;

    @Test void serviceSavesCreatedOrder() {
        Order[] saved = new Order[1];
        OrderRepository repository = new InMemoryOrderRepository() {
            @Override public Order save(Order order) { saved[0] = order; return order; }
        };
        Order order = new OrderService(repository).create(new BigDecimal("12.30"));
        assertSame(order, saved[0]);
        assertNotNull(order.id());
        assertEquals(Order.Status.CREATED, order.status());
        assertEquals(new BigDecimal("12.30"), order.amount());
    }

    @Test void serviceRejectsInvalidAmount() {
        OrderService service = new OrderService(new InMemoryOrderRepository());
        assertThrows(IllegalArgumentException.class, () -> service.create(BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> service.create(null));
    }

    @Test void createReturnsLocation() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("{\"amount\":12.30}"))
            .andExpect(status().isCreated()).andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.status").value("CREATED"));
    }
    @Test void zeroIsRejected() throws Exception { rejected("{\"amount\":0}"); }
    @Test void negativeIsRejected() throws Exception { rejected("{\"amount\":-1}"); }
    @Test void missingIsRejected() throws Exception { rejected("{}"); }
    @Test void malformedIsRejected() throws Exception { rejected("{"); }
    @Test void smallestAcceptedAmountWorks() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("{\"amount\":0.01}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.amount").value(0.01));
    }

    private void rejected(String body) throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
    }
}
