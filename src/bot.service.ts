import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class BotService implements OnModuleInit {
  private api: any;

  async onModuleInit() {
    const chatgpt = await import('chatgpt');
    this.api = new chatgpt.ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
      completionParams: {
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 24,
      },
    });
  }

  public async askBot(propmt: string): Promise<string> {
    try {
      const response = await this.api.sendMessage(propmt);
      return response.text;
    } catch (error) {
      return `Error: ${error.statusText || error.toString().substr(0, 40)}`;
    }
  }
}
