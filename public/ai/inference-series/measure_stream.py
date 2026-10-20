#!/usr/bin/env python3
"""兼容聊天接口的闭环诊断客户端。chunk 间隔不是逐 token ITL。"""
import argparse
import concurrent.futures
import http.client
import json
import os
import statistics
import time
import urllib.error
import urllib.request


def measure(args, index):
    body = {"model": args.model, "messages": [{"role": "user", "content": args.prompt}],
            "stream": True, "stream_options": {"include_usage": True},
            "temperature": 0, "max_tokens": args.max_tokens}
    headers = {"Content-Type": "application/json"}
    key = os.environ.get("INFERENCE_API_KEY")
    if key:
        headers["Authorization"] = "Bearer " + key
    request = urllib.request.Request(args.url, json.dumps(body).encode(), headers)
    start = time.perf_counter()
    first = last = None
    intervals, fragments = [], []
    usage, reason = None, None
    done = False
    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            for raw in response:
                line = raw.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    done = True
                    break
                event = json.loads(payload)
                if event.get("error"):
                    raise ValueError("服务返回流错误")
                if event.get("usage"):
                    usage = event["usage"]
                for choice in event.get("choices", []):
                    if choice.get("finish_reason"):
                        reason = choice["finish_reason"]
                    content = choice.get("delta", {}).get("content")
                    if content:
                        now = time.perf_counter()
                        if first is None:
                            first = now
                        if last is not None:
                            intervals.append((now - last) * 1000)
                        last = now
                        fragments.append(content)
        result = {"request": index, "status": "ok" if done and reason and fragments else "incomplete",
                  "first_content_ms": round((first - start) * 1000, 2) if first else None,
                  "e2e_ms": round((time.perf_counter() - start) * 1000, 2),
                  "content_chunk_intervals_ms": [round(x, 2) for x in intervals],
                  "finish_reason": reason, "usage": usage, "content": "".join(fragments)}
    except (urllib.error.URLError, http.client.HTTPException, TimeoutError, OSError, ValueError) as error:
        if isinstance(error, urllib.error.HTTPError):
            error.close()
        result = {"request": index, "status": "error", "error_type": type(error).__name__,
                  "e2e_ms": round((time.perf_counter() - start) * 1000, 2)}
    return result


def positive(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("必须大于零")
    return number


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000/v1/chat/completions")
    parser.add_argument("--model", required=True)
    parser.add_argument("--prompt", default="用三句话解释 KV cache。")
    parser.add_argument("--max-tokens", type=positive, default=256)
    parser.add_argument("--requests", type=positive, default=1)
    parser.add_argument("--concurrency", type=positive, default=1)
    parser.add_argument("--timeout", type=positive, default=120)
    args = parser.parse_args()
    start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [pool.submit(measure, args, i) for i in range(args.requests)]
        results = []
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            results.append(result)
            print(json.dumps(result, ensure_ascii=False), flush=True)
    elapsed = time.perf_counter() - start
    complete = [r for r in results if r["status"] == "ok"]
    first = [r["first_content_ms"] for r in complete]
    print(json.dumps({"summary": {"requests": len(results), "complete": len(complete),
          "length_limited": sum(r.get("finish_reason") == "length" for r in complete),
          "wall_seconds": round(elapsed, 3),
          "complete_requests_per_second": round(len(complete) / elapsed, 3),
          "median_first_content_ms": statistics.median(first) if first else None,
          "note": "不代表质量验收；usage含义、reasoning、截断与chunk间隔需分别检查"}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
