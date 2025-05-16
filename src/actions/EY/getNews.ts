import fetchRssFeed from '../FetchRssFeed';
import config from '../../../config';
import EYnewsModel, { EYnews } from '../../database/schemas/EYnews';
interface NewsItem {
  title: string;
  date: Date;
  description: string;
  link: string;
}

function convertROCDateToADDate(rocDate: string): Date {
  const [rocYear, month, day] = rocDate.split('-').map(Number);
  const adYear = rocYear + 1911;
  return new Date(adYear, month - 1, day);
}

async function checkAndInsertEYNews(news: NewsItem[]) {
  const _News = [];
  for (const New of news) {
    const exist = await EYnewsModel.findOne({ link: New.link });
    if (!exist) {

      const saved = new EYnewsModel({
        title: New.title,
        link: New.link,
        date: new Date(New.date),
        description: New.description,
      });
      _News.push(saved);
      await saved.save();
    }
  }
  return _News;
}


async function fetchEYNews() {
  const url = config.RSS.executive;
  return fetchRssFeed(url, '2day').then(async (news: NewsItem[]) => {
    console.log(news)
    const _news = await checkAndInsertEYNews(news);
    return _news;
  });
}
export default fetchEYNews;
