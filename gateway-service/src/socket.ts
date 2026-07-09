import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { Server as HttpServer } from 'http';
import { verifySocketToken } from './auth';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

export const setupSocket = (server: HttpServer): void => {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = verifySocketToken(token);

      socket.data.userId = payload.uid.toString();
      socket.data.email = payload.sub;
      socket.data.roles = payload.roles ?? [];

      next();
    } catch (err) {
      console.warn('Socket.io authentication failed:', err instanceof Error ? err.message : err);
      next(new Error('Unauthorized'));
    }
  });

  const redisSub = new Redis(redisUrl);

  redisSub.on('error', (err: unknown) => {
    console.error('Redis connection error:', err);
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (userId) {
      const room = `room:user:${userId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined user room: ${room} (email: ${socket.data.email})`);
    }

    socket.on('join_thread', (data: { slug: string }) => {
      if (data && data.slug) {
        const room = `room:thread:${data.slug}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined thread room: ${room}`);
      }
    });

    socket.on('leave_thread', (data: { slug: string }) => {
      if (data && data.slug) {
        const room = `room:thread:${data.slug}`;
        socket.leave(room);
        console.log(`Socket ${socket.id} left thread room: ${room}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });

  // Subscribe to global channels
  redisSub.subscribe('realtime:matches', 'realtime:leaderboard', (err) => {
    if (err) {
      console.error('Failed to subscribe to Redis channels:', err);
    } else {
      console.log('Successfully subscribed to Redis channels (matches, leaderboard)');
    }
  });

  // Pattern subscribe to user notifications and thread replies
  redisSub.psubscribe('realtime:notifications:*', 'realtime:threads:*', (err) => {
    if (err) {
      console.error('Failed to psubscribe to Redis patterns:', err);
    } else {
      console.log('Successfully pattern-subscribed to realtime:notifications:* and realtime:threads:*');
    }
  });

  // Handle standard messages
  redisSub.on('message', (channel: string, message: string) => {
    console.log(`[Socket Gateway] Received Redis message on channel "${channel}":`, message);
    try {
      const data: unknown = JSON.parse(message);
      io.emit(channel, data);
    } catch (error: unknown) {
      console.error(`Error parsing message on channel ${channel}:`, error);
    }
  });

  // Handle pattern-matched messages
  redisSub.on('pmessage', (pattern: string, channel: string, message: string) => {
    console.log(`[Socket Gateway] Received Redis pmessage on channel "${channel}" (pattern "${pattern}"):`, message);
    try {
      const data: unknown = JSON.parse(message);
      
      const parts = channel.split(':');
      
      if (pattern === 'realtime:notifications:*') {
        const userId = parts[2];
        if (userId) {
          const room = `room:user:${userId}`;
          console.log(`[Socket Gateway] Forwarding notification to room: ${room}`);
          io.to(room).emit('notification', data);
        } else {
          console.warn('[Socket Gateway] userId not found in channel name:', channel);
        }
      } else if (pattern === 'realtime:threads:*') {
        const slug = parts[2];
        if (slug) {
          const room = `room:thread:${slug}`;
          console.log(`[Socket Gateway] Forwarding new reply to room: ${room}`);
          io.to(room).emit('new_reply', data);
        } else {
          console.warn('[Socket Gateway] thread slug not found in channel name:', channel);
        }
      }
    } catch (error: unknown) {
      console.error(`Error parsing pmessage on channel ${channel}:`, error);
    }
  });
};
