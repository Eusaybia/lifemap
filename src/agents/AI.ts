
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: "OPENAI_KEY_REMOVED",
  });
  delete configuration.baseOptions.headers['User-Agent'];
  export const openai = new OpenAIApi(configuration);