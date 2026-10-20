package lab;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.functions.OpenContext;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.CloseableIterator;
import org.apache.flink.util.Collector;

public class PaymentWindowLab {
    public static class Payment {
        public String tenantId;
        public String paymentId;
        public long amountCents;
        public long paidAtMillis;
        public Payment() {}
        public Payment(String tenant, String id, long cents, String time) {
            tenantId = tenant;
            paymentId = id;
            amountCents = cents;
            paidAtMillis = Instant.parse(time).toEpochMilli();
        }
    }

    public static class Deduplicate extends KeyedProcessFunction<String, Payment, Payment> {
        private transient ValueState<Payment> seen;
        @Override
        public void open(OpenContext context) throws Exception {
            seen = getRuntimeContext().getState(new ValueStateDescriptor<>("seen-payment", Payment.class));
        }
        @Override
        public void processElement(Payment value, Context context, Collector<Payment> out) throws Exception {
            if (value.tenantId == null || value.tenantId.isBlank()
                    || value.paymentId == null || value.paymentId.isBlank()
                    || value.amountCents <= 0 || value.paidAtMillis < 0) {
                throw new IllegalArgumentException("支付字段不满足合同");
            }
            Payment previous = seen.value();
            if (previous == null) {
                seen.update(value);
                out.collect(value);
            } else if (!previous.tenantId.equals(value.tenantId)
                    || previous.amountCents != value.amountCents
                    || previous.paidAtMillis != value.paidAtMillis) {
                throw new IllegalArgumentException("相同支付号内容冲突");
            }
        }
    }

    public static class Totals implements AggregateFunction<Payment, Tuple2<Long, Long>, Tuple2<Long, Long>> {
        public Tuple2<Long, Long> createAccumulator() { return Tuple2.of(0L, 0L); }
        public Tuple2<Long, Long> add(Payment value, Tuple2<Long, Long> acc) {
            return Tuple2.of(Math.addExact(acc.f0, 1L), Math.addExact(acc.f1, value.amountCents));
        }
        public Tuple2<Long, Long> getResult(Tuple2<Long, Long> acc) { return acc; }
        public Tuple2<Long, Long> merge(Tuple2<Long, Long> a, Tuple2<Long, Long> b) {
            return Tuple2.of(Math.addExact(a.f0, b.f0), Math.addExact(a.f1, b.f1));
        }
    }

    public static class DescribeWindow extends ProcessWindowFunction<Tuple2<Long, Long>, String, String, TimeWindow> {
        @Override
        public void process(String tenant, Context context, Iterable<Tuple2<Long, Long>> values, Collector<String> out) {
            Tuple2<Long, Long> total = values.iterator().next();
            out.collect(tenant + "|" + Instant.ofEpochMilli(context.window().getStart())
                    + "|" + total.f0 + "|" + total.f1);
        }
    }

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(1);
        var source = env.fromData(
                new Payment("t1", "p101", 5000, "2026-10-19T01:01:00Z"),
                new Payment("t1", "p102", 3000, "2026-10-19T01:02:00Z"),
                new Payment("t1", "p102", 3000, "2026-10-19T01:02:00Z"),
                new Payment("t1", "p103", 3990, "2026-10-19T01:06:00Z"));
        SingleOutputStreamOperator<Payment> unique = source
                .assignTimestampsAndWatermarks(
                        WatermarkStrategy.<Payment>forBoundedOutOfOrderness(Duration.ofSeconds(20))
                                .withTimestampAssigner((payment, previous) -> payment.paidAtMillis))
                .keyBy(payment -> payment.paymentId)
                .process(new Deduplicate())
                .uid("payment-deduplicate-v1");
        SingleOutputStreamOperator<String> result = unique
                .keyBy(payment -> payment.tenantId)
                .window(TumblingEventTimeWindows.of(Duration.ofMinutes(5)))
                .aggregate(new Totals(), new DescribeWindow())
                .uid("payment-window-v1");
        Set<String> actual = new HashSet<>();
        int rows = 0;
        try (CloseableIterator<String> iterator = result.executeAndCollect()) {
            while (iterator.hasNext()) {
                actual.add(iterator.next());
                rows++;
            }
        }
        Set<String> expected = Set.of("t1|2026-10-19T01:00:00Z|2|8000", "t1|2026-10-19T01:05:00Z|1|3990");
        if (rows != 2 || !actual.equals(expected)) {
            throw new AssertionError("窗口结果错误：" + actual + ", rows=" + rows);
        }
        System.out.println("支付窗口校验通过：" + actual);
    }
}
