import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class BotService implements OnModuleInit {
  private api: any;
  parentMessageId: string | undefined;

  async onModuleInit() {
    const chatgpt = await import('chatgpt');
    this.api = new chatgpt.ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
      completionParams: {
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 40,
      },
    });
  }

  onConversationEnd() {
    this.parentMessageId = undefined;
  }

  public async askBot(prompt: string): Promise<string> {
    try {
      const query = this.parentMessageId
        ? prompt
        : `Limit all your answers to 40 words. Prompt: "${prompt}"`;

      const response = await this.api.sendMessage(query, {
        ...(this.parentMessageId && {
          parentMessageId: this.parentMessageId,
        }),
      });
      this.parentMessageId = response.id;
      return response.text;
    } catch (error) {
      return `Error: ${error.statusText || error.toString().substr(0, 40)}`;
    }
  }
}
