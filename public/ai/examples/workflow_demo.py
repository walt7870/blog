"""离线教学：状态路由、检索拒答和受限 SQL，不调用远程模型。"""

import argparse
import json
import re
import sqlite3
from typing import TypedDict

import sqlglot
from langchain_core.documents import Document
from langchain_core.tools import StructuredTool
from langgraph.graph import END, START, StateGraph
from sqlglot import exp


class SupportState(TypedDict, total=False):
    message: str
    intent: str
    order_no: str
    status: str
    answer: str


def lookup_order(order_no: str) -> dict:
    """查询教学订单；生产实现必须使用服务端身份检查订单归属。"""
    if not re.fullmatch(r"DEMO\d{3}", order_no):
        raise ValueError("订单号格式错误")
    return {"order_no": order_no, "status": "paid"}


order_tool = StructuredTool.from_function(lookup_order)


def classify(state: SupportState) -> dict:
    message = state["message"]
    order = re.search(r"DEMO\d{3}", message)
    intent = "escalation" if any(word in message for word in ("赔偿", "破损", "隐私")) else "order_status" if "订单" in message else "policy"
    return {"intent": intent, "order_no": order.group() if order else ""}


def guardrail(state: SupportState) -> dict:
    if state["intent"] == "escalation":
        return {"status": "escalated", "answer": "需要人工处理，尚未创建工单。"}
    if state["intent"] == "order_status" and not state["order_no"]:
        return {"status": "needs_input", "answer": "请提供订单号。"}
    return {"status": "ready"}


def respond(state: SupportState) -> dict:
    if state["intent"] == "order_status":
        result = order_tool.invoke({"order_no": state["order_no"]})
        return {"status": "completed", "answer": result["status"]}
    return {"status": "completed", "answer": "教学政策：退款审核通过后3–5个工作日到账。"}


def support_graph():
    builder = StateGraph(SupportState)
    builder.add_node("classify", classify)
    builder.add_node("guardrail", guardrail)
    builder.add_node("respond", respond)
    builder.add_edge(START, "classify")
    builder.add_edge("classify", "guardrail")
    builder.add_conditional_edges("guardrail", lambda s: "respond" if s["status"] == "ready" else END)
    builder.add_edge("respond", END)
    return builder.compile()


DOCUMENTS = [
    Document(page_content="退款审核通过后3–5个工作日原路到账。", metadata={"document": "refund.md", "chunk_id": "refund-v1-1", "version": 1}),
    Document(page_content="配送发货后可凭快递单号查询物流。", metadata={"document": "shipping.md", "chunk_id": "shipping-v1-1", "version": 1}),
]


def terms(text: str) -> set[str]:
    return {word for word in ("退款", "配送", "发货", "快递", "物流") if word in text}


def rag(question: str) -> dict:
    # 有意使用小词表检索替身，只验证证据门控与引用，不测语义召回能力。
    query = terms(question)
    candidates = sorted(
        [(doc, len(query & terms(doc.page_content)) / max(len(query), 1)) for doc in DOCUMENTS],
        key=lambda item: item[1], reverse=True,
    )
    relevant = [(doc, score) for doc, score in candidates if score >= 0.5]
    if not relevant:
        return {"status": "insufficient_context", "answer": "资料不足。", "citations": []}
    return {
        "status": "answered",
        "answer": relevant[0][0].page_content,
        "citations": [{**doc.metadata, "excerpt": doc.page_content, "score": score} for doc, score in relevant],
    }


def validate_read_only_sql(sql: str) -> str:
    statements = sqlglot.parse(sql, read="sqlite")
    if len(statements) != 1 or not isinstance(statements[0], exp.Select):
        raise ValueError("仅支持单条SELECT")
    statement = statements[0]
    if statement.find(exp.With) is not None:
        raise ValueError("教学子集不支持CTE")
    tables = list(statement.find_all(exp.Table))
    if not tables or any(table.name != "sales" or table.db or table.catalog for table in tables):
        raise ValueError("只允许sales表")
    limit = statement.args.get("limit")
    count = 200
    if limit is not None:
        value = limit.expression
        if not isinstance(value, exp.Literal) or value.is_string or not value.this.isascii() or not value.this.isdigit():
            raise ValueError("LIMIT必须为非负整数字面量")
        count = min(int(value.this), count)
    return statement.limit(count).sql(dialect="sqlite")


def execute_demo_sql(sql: str) -> dict:
    validated = validate_read_only_sql(sql)
    with sqlite3.connect(":memory:") as connection:
        connection.executescript("CREATE TABLE sales(day TEXT, amount INTEGER); INSERT INTO sales VALUES ('2026-01-01',100),('2026-01-02',200);")
        connection.execute("PRAGMA query_only=ON")

        def authorize(action, arg1, arg2, database, source):
            if action == sqlite3.SQLITE_SELECT:
                return sqlite3.SQLITE_OK
            if action == sqlite3.SQLITE_READ and arg1 == "sales" and arg2 in {"day", "amount", ""}:
                return sqlite3.SQLITE_OK
            if action == sqlite3.SQLITE_FUNCTION and (arg2 or "").lower() in {"count", "sum", "avg", "min", "max"}:
                return sqlite3.SQLITE_OK
            return sqlite3.SQLITE_DENY

        connection.set_authorizer(authorize)
        ticks = 0

        def budget():
            nonlocal ticks
            ticks += 1
            return int(ticks > 1000)

        connection.set_progress_handler(budget, 100)
        rows = connection.execute(validated).fetchmany(200)
    return {"sql": validated, "rows": rows}


def check():
    graph = support_graph()
    assert graph.invoke({"message": "查询订单"})["status"] == "needs_input"
    assert graph.invoke({"message": "订单DEMO001申请赔偿"})["status"] == "escalated"
    assert graph.invoke({"message": "查询订单DEMO001"})["answer"] == "paid"
    assert rag("退款多久到账？")["citations"][0]["chunk_id"] == "refund-v1-1"
    assert rag("火星天气怎么样？")["status"] == "insufficient_context"
    assert rag("何时原路返还款项？")["status"] == "insufficient_context"
    assert execute_demo_sql("SELECT SUM(amount) FROM sales")["rows"] == [(300,)]
    assert validate_read_only_sql("SELECT * FROM sales LIMIT 500").endswith("LIMIT 200")
    for sql in ["DELETE FROM sales", "SELECT * FROM sales; SELECT 1", "SELECT * FROM sqlite_master", "SELECT * FROM sales LIMIT -1", "SELECT * FROM sales LIMIT '3'", "WITH sales AS (SELECT * FROM sqlite_master) SELECT * FROM sales"]:
        try:
            execute_demo_sql(sql)
        except (ValueError, sqlite3.DatabaseError, sqlglot.errors.ParseError):
            continue
        raise AssertionError(sql)
    try:
        execute_demo_sql("SELECT load_extension('anything') FROM sales")
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("函数白名单未生效")
    return {"checks": 15, "status": "passed", "scope": "离线流程与SQLite教学数据，不代表模型质量或生产安全认证"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["support", "rag", "sql", "check"])
    parser.add_argument("input", nargs="?", default="")
    args = parser.parse_args()
    result = check() if args.mode == "check" else support_graph().invoke({"message": args.input}) if args.mode == "support" else rag(args.input) if args.mode == "rag" else execute_demo_sql(args.input)
    print(json.dumps(result, ensure_ascii=False, indent=2))
