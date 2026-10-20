"""用本地 SSE fixture 验证客户端口径，不运行模型。"""
import importlib.util
import json
import pathlib
import subprocess
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace

sys.dont_write_bytecode = True

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "public/ai/inference-series/measure_stream.py"
spec = importlib.util.spec_from_file_location("measure_stream", SCRIPT)
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", "0")))
        if self.path == "/http-error":
            self.send_error(503)
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()
        if self.path == "/malformed":
            self.wfile.write(b"data: {broken}\n\n")
            return
        events = [{"choices": [{"delta": {"reasoning_content": "hidden"}}]}]
        if self.path != "/reasoning-only":
            events += [{"choices": [{"delta": {"content": text}}]} for text in ["你好", "。"]]
        events += [{"choices": [{"delta": {}, "finish_reason": "length" if self.path == "/length" else "stop"}]}]
        events += [{"choices": [], "usage": {"prompt_tokens": 5, "completion_tokens": 3}}]
        for event in events:
            self.wfile.write(("data: " + json.dumps(event) + "\n\n").encode())
            self.wfile.flush()
        if self.path != "/truncated":
            self.wfile.write(b"data: [DONE]\n\n")


class StreamTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = "http://127.0.0.1:" + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def run_case(self, path):
        return client.measure(SimpleNamespace(url=self.base + path, model="fixture", prompt="fixture", max_tokens=32, timeout=5), 0)

    def test_content_usage_and_chunk_boundary(self):
        result = self.run_case("/ok")
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["content"], "你好。")
        self.assertEqual(result["usage"]["completion_tokens"], 3)
        self.assertEqual(len(result["content_chunk_intervals_ms"]), 1)
        self.assertGreaterEqual(result["e2e_ms"], result["first_content_ms"])

    def test_incomplete(self):
        for path in ["/reasoning-only", "/truncated"]:
            self.assertEqual(self.run_case(path)["status"], "incomplete")
        self.assertIsNone(self.run_case("/reasoning-only")["first_content_ms"])

    def test_errors(self):
        for path in ["/malformed", "/http-error"]:
            self.assertEqual(self.run_case(path)["status"], "error")

    def test_closed_loop_cli(self):
        output = subprocess.check_output([sys.executable, str(SCRIPT), "--url", self.base + "/length", "--model", "fixture", "--requests", "4", "--concurrency", "2"])
        records = [json.loads(line) for line in output.splitlines()]
        self.assertEqual(len(records), 5)
        self.assertEqual(records[-1]["summary"]["complete"], 4)
        self.assertEqual(records[-1]["summary"]["length_limited"], 4)


if __name__ == "__main__":
    unittest.main()
