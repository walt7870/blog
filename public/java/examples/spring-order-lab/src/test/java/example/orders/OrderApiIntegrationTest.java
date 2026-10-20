package example.orders;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class OrderApiIntegrationTest {
    @Autowired MockMvc mvc;

    @Test void createsAndSerializesOrder() throws Exception {
        var result = mvc.perform(post("/api/orders").contentType("application/json")
                .content("{\"customerId\":\"C-1001\",\"totalAmount\":199.00}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/orders/")))
                .andExpect(jsonPath("$.currency").value("CNY"))
                .andExpect(jsonPath("$.totalAmount").value(199.00)).andReturn();
        mvc.perform(get(result.getResponse().getHeader("Location")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerId").value("C-1001"));
        mvc.perform(get("/api/orders/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }

    @Test void separatesReadingValidationAndBusinessFailures() throws Exception {
        for (String body : new String[]{"{", "{\"customerId\":\"\",\"totalAmount\":1}",
                "{\"customerId\":\"C-1001\",\"totalAmount\":0}"}) {
            mvc.perform(post("/api/orders").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/orders").contentType("application/json")
                .content("{\"customerId\":\"C-1001\",\"totalAmount\":10000.01}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("ORDER_INVALID"));
    }

    @Test void separatesMappingAndMediaTypeFailures() throws Exception {
        mvc.perform(get("/missing")).andExpect(status().isNotFound());
        mvc.perform(get("/api/orders")).andExpect(status().isMethodNotAllowed());
        mvc.perform(post("/api/orders").contentType("text/plain").content("order"))
                .andExpect(status().isUnsupportedMediaType());
    }
}
