import app from './src/app';
import connectDatabase from './src/database/mongodb'
import cors from 'cors'
import runCheck from './check';
import express from 'express'
import helmet from 'helmet'
/*定時任務 */
import './src/cron/updateEYnews';
app.use(cors())
app.use(helmet());
app.use(express.json());
require('dotenv').config()
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`Server running at Port:${PORT}`);
    connectDatabase();
    runCheck()
});