import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

const python = process.env.AUDIT_PYTHON || '/tmp/blog-ai-app-env/bin/python';
const markdown = new MarkdownIt();
const base = 'docs/ai/applications/';
const code = file => markdown.parse(fs.readFileSync(base + file, 'utf8'), {})
  .filter(token => token.type === 'fence');
const run = (label, source) => {
  const result = spawnSync(python, ['-c', source], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${label}\n${result.stderr}`);
  console.log(JSON.stringify({ label, output: result.stdout.trim() }));
};

const files = ['model-api.md', ...fs.readdirSync(base + 'langchain').filter(file => file.endsWith('.md')).map(file => 'langchain/' + file)];
for (const file of files) {
  for (const [index, fence] of code(file).entries()) {
    if (fence.info.trim() === 'python') {
      run(`${file} Python片段${index + 1}语法`, `import ast\nast.parse(${JSON.stringify(fence.content)})`);
    }
  }
}
run('模型输出本地校验', code('model-api.md').find(fence => fence.info === 'python').content);
const graph = code('langchain/02-langgraph-workflow.md').find(fence => fence.info === 'bash').content;
run('正文最小LangGraph', graph.slice(graph.indexOf('\n') + 1, graph.lastIndexOf('\nPY')));
run('正文Tool注册与调用', code('langchain/04-tools-workflows-agents.md').find(fence => fence.info === 'python').content);
const rag = code('langchain/03-rag-from-zero.md').filter(fence => fence.info === 'python');
run('正文切分与Chroma集成（固定向量替身）', rag[0].content + `
from langchain_core.embeddings import Embeddings
class TeachingEmbedding(Embeddings):
    def embed_documents(self, texts):
        return [self.embed_query(text) for text in texts]
    def embed_query(self, text):
        return [1.0, 0.0] if '退款' in text else [0.0, 1.0]
embeddings = TeachingEmbedding()
` + rag[1].content + `
assert candidates[0].metadata['chunk_id'] == 'refund-v1-1'
assert not vector_store.similarity_search('退款', k=4, filter={'tenant': 'other'})
print('索引、来源和过滤断言通过；不衡量真实向量语义能力')
`);
run('完整离线示例15组断言', fs.readFileSync('public/ai/examples/workflow_demo.py', 'utf8').split('if __name__ == "__main__":')[0] + '\nprint(check())');
