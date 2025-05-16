import cron from 'node-cron';
import getEducation from '../../fetch/getEducation';
import getEYnews from '../../fetch/getEYnews';
cron.schedule('0 14 * * *', async () => {    
    await getEducation();
    await getEYnews();
}, {
    scheduled: true,
    timezone: "Asia/Taipei"  // 設定為台灣時區
});
