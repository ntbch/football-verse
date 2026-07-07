import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { Server as HttpServer } from 'http';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const setupSocket = (server: HttpServer): void => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const redisSub = new Redis(redisUrl);

  redisSub.on('error', (err: unknown) => {
    console.error('Redis connection error:', err);
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId;
    if (userId && typeof userId === 'string') {
      const room = `room:user:${userId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined user room: ${room}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });

  // Subscribe to global channels
  redisSub.subscribe('realtime:matches', 'realtime:leaderboard', (err) => {
    if (err) {
      console.error('Failed to subscribe to Redis channels:', err);
    }
  });

  // Pattern subscribe to user notifications
  redisSub.psubscribe('realtime:notifications:*', (err) => {
    if (err) {
      console.error('Failed to psubscribe to Redis pattern:', err);
    }
  });

  // Handle standard messages
  redisSub.on('message', (channel: string, message: string) => {
    try {
      const data: unknown = JSON.parse(message);
      io.emit(channel, data);
    } catch (error: unknown) {
      console.error(`Error parsing message on channel ${channel}:`, error);
    }
  });

  // Handle pattern-matched messages
  redisSub.on('pmessage', (pattern: string, channel: string, message: string) => {
    try {
      const data: unknown = JSON.parse(message);
      
      // Channel: realtime:notifications:<userId>
      const parts = channel.split(':');
      const userId = parts[2];
      
      if (userId) {
        io.to(`room:user:${userId}`).emit('notification', data);
      }
    } catch (error: unknown) {
      console.error(`Error parsing pmessage on channel ${channel}:`, error);
    }
  });
};
