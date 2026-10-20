package example.orders;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class OrderExceptionHandler {
    @ExceptionHandler(OrderNotFoundException.class)
    ResponseEntity<Map<String, String>> missing() {
        return ResponseEntity.status(404).body(Map.of("code", "ORDER_NOT_FOUND"));
    }

    @ExceptionHandler(OrderCannotBeCancelledException.class)
    ResponseEntity<Map<String, String>> conflict() {
        return ResponseEntity.status(409).body(Map.of("code", "ORDER_CANNOT_BE_CANCELLED"));
    }
}
