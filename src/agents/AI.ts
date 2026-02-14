import { Configuration, OpenAIApi } from "openai";

const openAIApiKey =
  process.env.OPENAI_API_KEY ||
  process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
  "";

const configuration = new Configuration({
    apiKey: openAIApiKey,
});
delete configuration.baseOptions.headers['User-Agent'];

export const openai = new OpenAIApi(configuration);
