import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: "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",
});
delete configuration.baseOptions.headers['User-Agent'];

export const openai = new OpenAIApi(configuration);
