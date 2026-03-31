import { Server } from 'socket.io';

export class SocketService {
  private static io: Server;

  static init(io: Server) {
    this.io = io;
  }

  static getIo(): Server {
    return this.io;
  }

  static emitToAccount(accountId: number, event: string, data: any) {
    if (this.io) {
      this.io.to(`account-${accountId}`).emit(event, data);
    }
  }
}
