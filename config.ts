
  const RSS = {
    education: 'https://www.edu.tw/Rss_News.aspx?n=9E7AC85F1954DDA8',
    executive: "https://www.ey.gov.tw/RSS_Content.aspx?ModuleType=3"
  };
  
  const agent = {
    useModel: "gemini", 
    gemini: {
      textModel: "gemini-1.5-flash",
      visionModel: "gemini-1.5-flash",
      embeddingModel: "text-embedding-004",
      apikey: process.env.GEMINI_APIKEY || "",
      base_url: "https://generativelanguage.googleapis.com/v1beta/openai/"
    },
    ollama: {
      textModel: "llama3",
      visionModel: "llava",
      embeddingModel: "llama2:7b-embed",
      apikey: process.env.OLLAMA_APIKEY || "ollama",
      base_url: "http://localhost:11434/v1"
    },
    grok: {
      textModel: "grok-beta",
      visionModel: "",
      embeddingModel: "grok-embedding",
      apikey: process.env.GROK_APIKEY || "",
      base_url: "https://api.x.ai"
    },
    openai: {
      textModel: "gpt-4-turbo",
      visionModel: "gpt-4-vision-preview",
      embeddingModel: "text-embedding-3-large", 
      apikey: process.env.OPENAI_APIKEY || "",
      base_url: "https://api.openai.com/v1"
    }
  } as const;

  function getCurrentConfig(): ModelConfig {
    return agent[agent.useModel];
  }
  
  const supportModel = Object.keys(agent).filter(
    key => key !== 'useModel'
  ) as Array<keyof Omit<AgentConfig, 'useModel'>>;

  function validateEmbeddingModel(model: string): boolean {
    const current = getCurrentConfig();
    return !!current.embeddingModel && model === current.embeddingModel;
  }
  
  export default {
    agent: agent as AgentConfig,
    models: supportModel,
    modelConfig: getCurrentConfig(),
    RSS: RSS,
    utils: {
      validateEmbeddingModel
    }
  };