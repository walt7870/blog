import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;

public class AuditApp {
    public static void main(String[] args) throws Exception {
        var server = HttpServer.create(new InetSocketAddress("0.0.0.0", 8080), 0);
        server.createContext("/health", exchange -> {
            byte[] body = ("audit-ok;user=" + System.getProperty("user.name")
                + ";heap=" + Runtime.getRuntime().maxMemory()).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            server.stop(0);
            System.out.println("audit-shutdown-hook");
        }));
        server.start();
        System.out.println("audit-listening");
        new CountDownLatch(1).await();
    }
}
