import config from '../../../config';
import EducationNewsModel from '../../database/schemas/educationNews';
import fetchRssFeed from '../FetchRssFeed';
import type { NewsItem } from '../../types/NewsItem';
async function checkAndInsertEducationNews(news: NewsItem[]) {
  const _News = [];
  for (const New of news) {
    const exist = await EducationNewsModel.findOne({ link: New.link });
    if (!exist) {
      const saved = new EducationNewsModel(({
        title: New.title,
        link: New.link,
        date: new Date(New.date),
        description: New.description,
      }));
      _News.push(saved);
      saved.save();
      
    }
  }
  console.log(_News)
  return _News;
}

export default function fetchEductionNews() {
  const url = config.RSS.education;
  return fetchRssFeed(url, '2day').then(async (news: NewsItem[]) => {
    const _news = await checkAndInsertEducationNews(news);
    return _news;
  });
}

