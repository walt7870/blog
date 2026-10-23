import { execFileSync } from 'node:child_process';
import { createContentLoader } from 'vitepress';
import { topicGroups } from '../../../topics.ts';

export type HomeTopic = { text: string; description: string; link: string; count: number };
export type HomeGroup = { id: string; title: string; count: number; topics: HomeTopic[] };
export type HomeUpdate = { title: string; url: string; topic: string; date: string };
export type HomeData = { total: number; topicCount: number; latest: string; groups: HomeGroup[]; updates: HomeUpdate[] };

declare const data: HomeData;
export { data };

const hidden = /^\/docs\/(superpowers|tmp)\//;

// One git call gives the last commit time of every tracked doc; uncommitted pages have no date and are skipped.
function commitTimes() {
  const times = new Map<string, number>();
  try {
    const log = execFileSync('git', ['log', '--format=%x00%ct', '--name-only', '--', 'docs'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    let time = 0;
    for (const line of log.split('\n')) {
      if (line.startsWith('\0')) time = Number(line.slice(1));
      else if (line.endsWith('.md') && !times.has(line)) times.set(line, time);
    }
  } catch {
    // Builds without git history still render the page; the update list is simply empty.
  }
  return times;
}

function day(seconds: number) {
  return new Date(seconds * 1000 + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export default createContentLoader('docs/**/*.md', {
  includeSrc: true,
  transform(raw): HomeData {
    const times = commitTimes();
    const pages = raw.filter(page => !hidden.test(page.url)).map(page => {
      const file = page.url.replace(/^\//, '').replace(/\/$/, '/index').replace(/\.html$/, '') + '.md';
      const heading = page.src?.match(/^#\s+(.+)$/m)?.[1];
      return { url: page.url, title: String(page.frontmatter.title || heading || file.split('/').at(-1)!.replace(/\.md$/, '')).trim(), time: times.get(file) || 0 };
    });
    const allTopics = topicGroups.flatMap(group => group.topics);
    const topicOf = (url: string) => allTopics.filter(topic => url.startsWith(topic.link)).sort((a, b) => b.link.length - a.link.length)[0];

    const groups = topicGroups.map(group => {
      const topics = group.topics.map(topic => ({ ...topic, count: pages.filter(page => topicOf(page.url) === topic).length }));
      return { id: group.id, title: group.title, count: topics.reduce((sum, topic) => sum + topic.count, 0), topics };
    });
    const dated = pages.filter(page => page.time).sort((a, b) => b.time - a.time || a.url.localeCompare(b.url));
    const updates = dated.slice(0, 6).map(page => ({ title: page.title, url: page.url, topic: topicOf(page.url)?.text || (page.url.startsWith('/docs/reading/') ? '阅读笔记' : '技术笔记'), date: day(page.time) }));

    return { total: pages.length, topicCount: allTopics.length, latest: dated[0] ? day(dated[0].time) : '', groups, updates };
  },
});
