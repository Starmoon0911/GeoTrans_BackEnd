import config from './config';

const runCheck = () => {
    const MainModel = config.agent.useModel;
    const supportModel = config.models;
    if (!supportModel.includes(MainModel)) {
        throw '"useModel" must be one of: grok, gemini, openai, ollama';
    }

    const modelConfig = config.agent[MainModel as keyof typeof config.agent];

    if (!modelConfig || typeof modelConfig !== 'object') {
        throw `Configuration for "${MainModel}" is missing or incorrect.`;
    }

    // 提取 apiKey, base_url 和 textModel
    const { apikey, base_url, textModel } = config.modelConfig as {
        apikey: string,
        base_url: string,
        textModel: string
    }

    // 處理 API key，顯示前兩位字母，其他部分顯示 "..."
    const maskedApikey = apikey.substring(0, 2) + '...';

    console.log(`Model: ${MainModel}:${textModel}, API Key: ${maskedApikey}, Base URL: ${base_url}`);
    console.log('all check pass!');
};

export default runCheck;
