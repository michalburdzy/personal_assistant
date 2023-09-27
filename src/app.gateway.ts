import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { BotService } from './bot.service';

@WebSocketGateway()
export class AppGateway {
  constructor(private readonly botService: BotService) {}
  @WebSocketServer()
  server: Server;

  afterInit(server: Server): void {
    server.on('connect', ({ connected, data, id: connectionId }) => {
      console.log(JSON.stringify({ connected, connectionId, ...data }));
    });
    server.on('disconnect', ({ connected, data, id: connectionId }) => {
      console.log(JSON.stringify({ connected, connectionId, ...data }));
    });
  }

  @SubscribeMessage('user_message')
  async handleMessage(client: any, payload: string): Promise<void> {
    const payloadWordCount = payload.split(' ').length;

    if (payloadWordCount > 20) {
      return this.respond('Your prompt is too long, please use max 20 words');
    }
    const answer = await this.botService.askBot(payload);
    this.respond(answer);
  }

  async respond(answer: string) {
    console.log('responding with', { msg: answer });
    this.server.emit('bot_message', { msg: answer });
  }
}
