interface ModelConfig {
    textModel: string;
    visionModel: string;
    embeddingModel: string;
    apikey: string;
    base_url: string;
}

interface AgentConfig {
    useModel: keyof typeof agent;
    gemini: ModelConfig;
    ollama: ModelConfig;
    grok: ModelConfig;
    openai: ModelConfig;
}
