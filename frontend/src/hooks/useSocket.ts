'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../lib/api';

export interface TerminalLog {
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
  meta?: any;
}

export interface CampaignProgressUpdate {
  campaignId: string;
  sent: number;
  failed: number;
  total: number;
  status: string;
}

export function useSocket(onCampaignProgress?: (update: CampaignProgressUpdate) => void) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const onProgressRef = useRef(onCampaignProgress);
  useEffect(() => {
    onProgressRef.current = onCampaignProgress;
  }, [onCampaignProgress]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tg_token') : null;
    const socketInstance = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token: token ? `Bearer ${token}` : '',
      },
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('tg_user') : null;
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.id) {
            socketInstance.emit('join_room', { userId: parsed.id });
          }
        } catch {}
      }
      setLogs((prev) => [
        {
          timestamp: new Date().toISOString(),
          type: 'SUCCESS',
          message: 'Connected to Telegram SaaS WebSocket Gateway.',
        },
        ...prev,
      ]);
    });

    socketInstance.on('auth_error', (err: { message: string }) => {
      console.warn('WebSocket authentication error:', err?.message);
      setLogs((prev) => [
        {
          timestamp: new Date().toISOString(),
          type: 'ERROR',
          message: `WebSocket Auth Failed: ${err?.message || 'Unauthorized'}`,
        },
        ...prev,
      ]);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('terminal_log', (log: TerminalLog) => {
      setLogs((prev) => [log, ...prev.slice(0, 200)]); // Keep last 200 logs
    });

    socketInstance.on('campaign_global_update', (update: CampaignProgressUpdate) => {
      if (onProgressRef.current) {
        onProgressRef.current(update);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const clearLogs = () => setLogs([]);

  return { socket, logs, isConnected, clearLogs };
}

