import express from 'express';
const router = express.Router();
import fs from 'fs';
import path from 'path';

router.get('/', (req, res) => {
    try {
        const versionJSON = fs.readFileSync(path.join('version.json'), 'utf-8');
        const version = JSON.parse(versionJSON).version || "v0.0.0";
        res.json({ version });
    } catch (error) {
        console.error('Error reading version file:', error);
        res.status(500).json({ error: 'Failed to retrieve version information' });
    }
});
export default router;