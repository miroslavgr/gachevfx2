import React from 'react';
import { Notification } from '../types';
import { Bell, CheckCircle, UserPlus, Clock } from 'lucide-react';

interface NotificationsProps {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  onNotificationClick: (notification: Notification) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, markAsRead, onNotificationClick }) => {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gold-500/20 p-3 rounded-xl text-gold-500">
            <Bell size={24} />
        </div>
        <div>
            <h2 className="text-3xl font-serif font-bold text-white">Notifications</h2>
            <p className="text-slate-400 text-sm">Updates from your mentor and community</p>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-xl text-slate-500">
                <Bell size={48} className="mx-auto mb-4 opacity-20" />
                <p>You're all caught up!</p>
            </div>
        ) : (
            notifications.map((notif) => (
                <div 
                    key={notif.id} 
                    className={`glass-panel p-6 rounded-xl border-l-4 transition-all hover:bg-slate-800/50 cursor-pointer ${
                        notif.read ? 'border-slate-700 opacity-70' : 'border-gold-500 shadow-lg shadow-gold-500/5'
                    }`}
                    onClick={() => onNotificationClick(notif)}
                >
                    <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            notif.type === 'mentor_review' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                        }`}>
                            {notif.type === 'mentor_review' ? <CheckCircle size={20} /> : <UserPlus size={20} />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className={`font-bold text-lg ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                                    {notif.title}
                                    {!notif.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-gold-500 animate-pulse"></span>}
                                </h3>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-slate-400 mt-1">{notif.message}</p>
                            {notif.relatedId && <p className="text-xs text-gold-600 mt-2 font-medium">Click to view trade details →</p>}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
