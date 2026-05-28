import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { Send, X, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface Message {
  id: number;
  content: string;
  senderId: number;
  recipientId?: number;
  groupId?: string;
  timestamp: string;
  isRead: boolean;
  sender?: {
    fullName: string;
    role: string;
  };
}

interface User {
  id: number;
  fullName: string;
  username: string;
  role: string;
}

// Легкий звук повідомлення (Base64) - м'який "пік" (згенерований sine wave / notification sound)
const notificationSound = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgDwtIADABn///4H3///////8TGA8IAACQ+AAAAAAB3//r/////////5//f/9//////4Hg/A8LSAAwAZ///+B9////////ExgPCAAAkPgAAAAAAd//6/////////8P/7//f/////wP/8TTEAAAEAAAAAAAB3//r/////////5//f/9//////4Hg/A8LSAA==');

const ChatPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCounts();
    fetchUsers();
    
    // Встановлюємо інтервал для перевірки списку
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      markMessagesAsRead(selectedRecipientId);
    }
  }, [isOpen, selectedRecipientId]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message: Message) => {
        // Якщо ми зараз у цьому ж чаті - додаємо і позначаємо як прочитане
        const isCurrentContext = 
          (!selectedRecipientId && !message.recipientId && !message.groupId) ||
          (selectedRecipientId && (
            (message.senderId === selectedRecipientId && message.recipientId === user?.id) ||
            (message.senderId === user?.id && message.recipientId === selectedRecipientId)
          ));

        if (isCurrentContext) {
          setMessages((prev) => [...prev, message]);
          if (message.recipientId === user?.id && isOpen) {
            markMessagesAsRead(selectedRecipientId);
          }
        } else {
          // Якщо прийшло повідомлення не з відкритого чату
          if (message.recipientId === user?.id) {
             setUnreadCounts(prev => ({
               ...prev,
               [message.senderId]: (prev[message.senderId] || 0) + 1
             }));
             setTotalUnread(prev => prev + 1);
          }
        }

        // Завжди грати звук якщо відправник не я (тільки для мене або в загальний)
        if (message.senderId !== user?.id) {
           notificationSound.currentTime = 0;
           notificationSound.play().catch((audioError) => console.log('Помилка відтворення звуку:', audioError));
        }
      };

      socket.on('new_message', handleNewMessage);

      return () => {
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [socket, selectedRecipientId, user?.id, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUnreadCounts = async () => {
    try {
      const res = await api.get('/chat/unread');
      setUnreadCounts(res.data.userCounts);
      setTotalUnread(res.data.totalUnread);
    } catch (error) {
      console.error('Помилка завантаження лічильників непрочитаних', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const params: any = {};
      if (selectedRecipientId) params.recipientId = selectedRecipientId;
      
      const response = await api.get('/chat', { params });
      setMessages(response.data);
    } catch (error) {
      console.error('Не вдалося завантажити повідомлення:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data.filter((u: User) => u.id !== user?.id));
    } catch (error) {
      console.error('Не вдалося завантажити список користувачів:', error);
    }
  };

  const markMessagesAsRead = async (senderId: number | null) => {
    if (!senderId) return; // Зараз ми відслідковуємо unread тільки для приватних
    try {
      await api.patch('/chat/read', { senderId });
      // Оновлюємо локальний стейт
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        const removed = newCounts[senderId] || 0;
        delete newCounts[senderId];
        setTotalUnread(current => Math.max(0, current - removed));
        return newCounts;
      });
    } catch (error) {
      console.error('Помилка позначення повідомлень як прочитаних', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || !user) return;

    socket.emit('send_message', {
      senderId: user.id,
      recipientId: selectedRecipientId || undefined,
      content: inputValue
    });

    setInputValue('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-warm-500 text-white p-4 rounded-full shadow-lg hover:bg-warm-600 hover:scale-105 transition-all z-50 flex items-center justify-center group"
      >
        <MessageCircle size={24} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] items-center justify-center flex h-5 w-5 rounded-full font-bold border-2 border-white animate-pulse">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-warm-100 overflow-hidden font-montserrat animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="bg-warm-500 text-white p-3 md:p-4 flex justify-between items-center shadow-sm z-10 relative">
        <div className="flex items-center gap-2">
           <MessageCircle size={20} />
           <h3 className="font-bold text-sm tracking-wide">
             Комунікація
           </h3>
           <span className="relative flex h-2 w-2 ml-1">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
              )}
           </span>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:text-warm-100 transition-colors p-1 rounded-lg hover:bg-warm-600">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Список користувачів */}
        <div className="w-[35%] border-r border-warm-100 bg-gray-50 overflow-y-auto text-xs flex flex-col">
          <button
            onClick={() => setSelectedRecipientId(null)}
            className={`w-full p-3 text-left transition-colors border-b border-warm-50/50 flex items-center justify-between
              ${selectedRecipientId === null ? 'bg-warm-50/80 font-bold border-l-4 border-l-warm-500 text-warm-800' : 'hover:bg-warm-50/50 text-gray-700'}
            `}
          >
            <span>Загальний</span>
          </button>
          {users.map((u) => {
            const unread = unreadCounts[u.id] || 0;
            return (
              <button
                key={u.id}
                onClick={() => setSelectedRecipientId(u.id)}
                className={`w-full py-2.5 px-3 text-left transition-colors border-b border-warm-50/50 relative flex flex-col gap-0.5
                  ${selectedRecipientId === u.id ? 'bg-warm-50/80 font-bold border-l-4 border-l-warm-500 text-warm-800' : 'hover:bg-warm-50/50 text-gray-700'}
                `}
              >
                <div className="truncate flex justify-between items-center w-full pr-1">
                   <span className="truncate mr-1 max-w-[80%]">{u.fullName.split(' ')[0]} {u.fullName.split(' ')[1]?.[0] || ''}.</span>
                   {unread > 0 && (
                     <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5 flex-shrink-0 font-bold ml-auto shadow-sm">
                       {unread}
                     </span>
                   )}
                </div>
                <div className="text-[9px] opacity-50 truncate">{u.role}</div>
              </button>
            )
          })}
        </div>

        {/* Вікно повідомлень */}
        <div className="flex-1 flex flex-col bg-white relative">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8 scrollbar-thin scrollbar-thumb-warm-200" ref={messagesContainerRef}>
            {messages.map((msg, index) => {
              const isMine = msg.senderId === user?.id;
              const showDate = index === 0 || new Date(messages[index-1].timestamp).getDate() !== new Date(msg.timestamp).getDate();
              
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                     <div className="w-full flex justify-center my-3">
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {format(new Date(msg.timestamp), 'dd MMMM', { locale: uk })}
                        </span>
                     </div>
                  )}
                  <div
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] p-2.5 rounded-2xl text-sm relative shadow-sm ${
                        isMine
                          ? 'bg-warm-500 text-white rounded-br-sm'
                          : 'bg-gray-100/80 text-gray-800 rounded-bl-sm border border-gray-100'
                      }`}
                    >
                      {!isMine && (
                        <div className="text-[10px] font-bold opacity-70 mb-1 tracking-wide flex justify-between items-center gap-2">
                          <span className="truncate">{msg.sender?.fullName || 'Система'}</span>
                        </div>
                      )}
                      <div className="break-words leading-snug pb-3">{msg.content}</div>
                      
                      <div className={`absolute bottom-1 right-2 text-[9px] opacity-60 font-medium tracking-wider ${isMine ? 'text-warm-100' : 'text-gray-500'}`}>
                        {format(new Date(msg.timestamp), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          <form onSubmit={handleSendMessage} className="p-2 border-t border-gray-100 flex gap-2 bg-gray-50/50 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Введіть повідомлення..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-warm-500/20 focus:border-warm-500 bg-white transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={`p-2 rounded-xl text-white transition-all shadow-sm ${inputValue.trim() ? 'bg-warm-500 hover:bg-warm-600 hover:scale-105 active:scale-95 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              <Send size={16} className={`${inputValue.trim() ? 'translate-x-0.5' : ''}`} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
