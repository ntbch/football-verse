import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { Server as HttpServer } from 'http';
import { verifySocketToken } from './auth';
import { logError, logInfo, logWarn } from './logger';

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
      socket.data.roles = payload.roles ?? [];

      next();
    } catch {
      logWarn('Socket.io authentication failed');
      next(new Error('Unauthorized'));
    }
  });

  const redisSub = new Redis(redisUrl);

  redisSub.on('error', (err: unknown) => {
    logError('Redis connection error:', err);
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (userId) {
      const room = `room:user:${userId}`;
      socket.join(room);
      logInfo(`Socket ${socket.id} joined user room: ${room}`);
    }

    socket.on('join_thread', (data: { slug: string }) => {
      if (data && data.slug) {
        const room = `room:thread:${data.slug}`;
        socket.join(room);
        logInfo(`Socket ${socket.id} joined thread room: ${room}`);
      }
    });

    socket.on('leave_thread', (data: { slug: string }) => {
      if (data && data.slug) {
        const room = `room:thread:${data.slug}`;
        socket.leave(room);
        logInfo(`Socket ${socket.id} left thread room: ${room}`);
      }
    });

    socket.on('disconnect', () => {
      logInfo(`Socket ${socket.id} disconnected`);
    });
  });

  // Subscribe to global channels
  redisSub.subscribe('realtime:matches', 'realtime:leaderboard', (err) => {
    if (err) {
      logError('Failed to subscribe to Redis channels:', err);
    } else {
      logInfo('Successfully subscribed to Redis channels (matches, leaderboard)');
    }
  });

  // Pattern subscribe to user notifications and thread replies
  redisSub.psubscribe('realtime:notifications:*', 'realtime:threads:*', (err) => {
    if (err) {
      logError('Failed to psubscribe to Redis patterns:', err);
    } else {
      logInfo('Successfully pattern-subscribed to realtime:notifications:* and realtime:threads:*');
    }
  });

  // Handle standard messages
  redisSub.on('message', (channel: string, message: string) => {
    try {
      const data: unknown = JSON.parse(message);
      io.emit(channel, data);
    } catch (error: unknown) {
      logError(`Error parsing Redis message on channel ${channel}`);
    }
  });

  // Handle pattern-matched messages
  redisSub.on('pmessage', (pattern: string, channel: string, message: string) => {
    // Redis payloads are intentionally not logged.
    try {
      const data: unknown = JSON.parse(message);
      
      const parts = channel.split(':');
      
      if (pattern === 'realtime:notifications:*') {
        const userId = parts[2];
        if (userId) {
          const room = `room:user:${userId}`;
          io.to(room).emit('notification', data);
        } else {
          logWarn('[Socket Gateway] userId not found in channel name');
        }
      } else if (pattern === 'realtime:threads:*') {
        const slug = parts[2];
        if (slug) {
          const room = `room:thread:${slug}`;
          io.to(room).emit('new_reply', data);
        } else {
          logWarn('[Socket Gateway] thread slug not found in channel name');
        }
      }
    } catch (error: unknown) {
      logError(`Error parsing Redis pattern message on channel ${channel}`);
    }
  });
};
