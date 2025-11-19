import fetchRssFeed from "../../src/actions/FetchRss";
(async () => {
    return fetchRssFeed('https://www.nantou.gov.tw/big5/newsrss.php', '2day').then(async (news: NewsItem[]) => {
        console.log(news)
    });
})();
