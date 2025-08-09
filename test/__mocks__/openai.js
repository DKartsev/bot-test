class OpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: async () => ({
          choices: [{ message: { content: 'Тестовый ответ OpenAI' } }]
        })
      }
    };
  }
}

module.exports = OpenAI;
