import axios from 'axios';
import { createParser } from 'eventsource-parser';

async function testNewsAIProcess() {
  const { data: stream } = await axios.post(
    'http://localhost:9000/api/v1/create',
    {
      title: '南投縣舉辦防災演習',
      content: '南投縣政府於本月舉辦大規模防災演習，邀請多個單位參與...',
      media: [
        { url: 'https://www.ncyes.ncyu.edu.tw/var/file/2/1002/pictures/522/m/mczh-tw700x700_large8433_427304331618.png' }
      ],
      files: []
    },
    {
      responseType: 'stream',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
    }
  );

   const parser = createParser({
    onEvent(event) {
      const name = event.event;
      const data = event.data;
      console.log(`[${name}] ${data}`);

      if (name === 'done' || name === 'error') {
        stream.destroy(); // 中止連線
      }
    }
  });

  stream.on('data', (chunk) => {
    const str = chunk.toString('utf8');
    parser.feed(str);
  });

  stream.on('end', () => {
    console.log('🟢 測試結束');
  });

  stream.on('error', (err) => {
    console.error('❌ 發生錯誤:', err);
  });
}

testNewsAIProcess();