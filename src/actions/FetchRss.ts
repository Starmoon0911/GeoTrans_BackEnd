import Parser from 'rss-parser';
import truncateText from '../lib/truncateText';
import parseTimeRange from '../lib/parseTimeRange';
const parser = new Parser();

export default async function fetchRssFeed(url: string, timeRange?: string) {
  const feed = await parser.parseURL(url);

  const now = Date.now();
  let timeRangeMs = 0;

  if (timeRange) {
    timeRangeMs = parseTimeRange(timeRange);
  }

  const articles = feed.items
    .map(item => ({
      title: item.title || '',
      link: item.link || '',
      date: new Date(item.pubDate || Date.now()),
      description: truncateText(item.contentSnippet || item.description || '', 30) || '',
    }))
    .filter(article => {
      if (!timeRange) return true;
      const articleTime = new Date(article.date).getTime();
      return now - articleTime <= timeRangeMs;
    });

  return articles;
}
