import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getSocketBaseUrl } from '../api/serverConfig';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isActive = true;
    let currentSocket: Socket | null = null;

    if (user && token) {
      setSocket(null);
      setIsConnected(false);

      const connectSocket = async () => {
        const { io } = await import('socket.io-client');

        if (!isActive) {
          return;
        }

        const newSocket = io(getSocketBaseUrl(), {
          auth: { token }
        });

        currentSocket = newSocket;

        newSocket.on('connect', () => {
          if (!isActive) {
            return;
          }

          setIsConnected(true);
          newSocket.emit('join', user.id);
        });

        newSocket.on('disconnect', () => {
          if (!isActive) {
            return;
          }

          setIsConnected(false);
        });

        setSocket(newSocket);
      };

      void connectSocket();

      return () => {
        isActive = false;
        currentSocket?.close();
      };
    }

    setSocket(null);
    setIsConnected(false);

    return () => {
      isActive = false;
      currentSocket?.close();
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket потрібно використовувати всередині SocketProvider');
  }
  return context;
};
