import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class AppGateway {
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
  async handleMessage(client: any, payload: any): Promise<void> {
    const answer = await this.findAnswer(payload);
    this.respond(answer);
  }

  async respond(answer: string) {
    console.log('responding with', { msg: answer });
    this.server.emit('bot_message', { msg: answer });
  }

  private async findAnswer(prompt: string): Promise<string> {
    // return `Did you mean: "${this.msg}"?`;
    return 'OK';
  }
}
