import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { AppTranslations } from '../types';
import { TranslationService } from '../services/api';

export type Language = 'bg' | 'en';

// Your "Source of Truth" for structure and default text.
// This loads INSTANTLY (0ms delay).
export const DEFAULT_TRANSLATIONS: AppTranslations = {
  bg: {
    // General
    "app.name": "PROSCALP",
    "app.slogan": "Елитно Менторство",
    
    // Auth
    "auth.login": "Вход за членове",
    "auth.apply": "Кандидатствай за достъп",
    "auth.email": "Имейл",
    "auth.password": "Парола",
    "auth.submit": "Влез в Терминала",
    "auth.register_submit": "Изпрати Заявка",
    "auth.welcome_back": "Добре дошъл, трейдър.",
    "auth.start_journey": "Започни пътя си към успеха.",
    "auth.or_continue": "Или продължи с",
    "auth.demo_login": "Демо Вход",
    
    // Navigation
    "nav.dashboard": "Табло",
    "nav.course": "ProScalp Курс",
    "nav.outlook": "Перспектива",
    "nav.trades": "Търговски Център",
    "nav.archive": "Видео Архив",
    "nav.traders": "Трейдъри",
    "nav.community": "Общност",
    "nav.notifications": "Известия",
    "nav.profile": "Моят Профил",
    "nav.admin": "Админ Панел",
    "nav.signout": "Изход",

    // Dashboard
    "dash.analytics": "Анализ на представянето",
    "dash.realtime": "Данни в реално време за",
    "dash.equity_curve_show": "Покажи Крива на капитала",
    "dash.equity_curve_hide": "Скрий Крива на капитала",
    "dash.net_profit": "Нетна Печалба",
    "dash.realized_pnl": "Обща реализирана печалба",
    "dash.win_rate": "Успеваемост",
    "dash.risk_reward": "Риск / Печалба",
    "dash.accumulated_r": "Натрупани R-множители",
    "dash.profit_factor": "Профит Фактор",
    "dash.gross_ratio": "Брутна печалба / Брутна загуба",
    "dash.search_placeholder": "Търси сделки...",
    "dash.filter_all": "Всички",
    "dash.filter_win": "Печеливши",
    "dash.filter_loss": "Губещи",
    "dash.no_trades": "Няма намерени сделки",
    
    // Trade Center
    "trade.center": "Търговски Център",
    "trade.feed": "Общност",
    "trade.post": "Публикувай",
    "trade.upload_title": "Протокол за вход",
    "trade.protocol_desc": "Стоп лос е задължителен за изчисляване на риска.",
    "trade.pair": "Валутна Двойка",
    "trade.strategy": "Стратегия",
    "trade.timeframe": "Времева Рамка",
    "trade.direction": "Посока",
    "trade.buy": "КУПУВА / LONG",
    "trade.sell": "ПРОДАВА / SHORT",
    "trade.entry": "Вход",
    "trade.sl": "Стоп Лос",
    "trade.tp": "Тейк Профит",
    "trade.open_time": "Време на отваряне",
    "trade.close_time": "Време на затваряне",
    "trade.notes": "Анализ и Бележки",
    "trade.notes_placeholder": "Опишете сетъпа...",
    "trade.media": "Доказателство (Снимка/Видео)",
    "trade.drop_media": "Пуснете скрийншот или кликнете",
    "trade.visibility": "Видимост",
    "trade.vis_public": "Публично",
    "trade.vis_private": "Частно",
    "trade.submit": "Изпрати за Анализ",
    "trade.filter_user": "Филтър по потребител:",
    "trade.everyone": "Всички",
    "trade.following": "Следвани",
    
    // Video Archive
    "video.title": "Видео Архив",
    "video.subtitle": "Преглед на минали сесии и образователно съдържание.",
    "video.search": "Търси в архива...",
    "video.upload": "Качи",
    "video.cancel": "Отказ",
    "video.upload_new": "Качи нов ресурс",
    "video.vid_title": "Заглавие",
    "video.vid_desc": "Описание",
    "video.select_file": "Избери файл",
    "video.publish": "Публикувай Видео",
    "video.tab.all": "Всички Видеа",
    "video.tab.live": "Записи на Живо",
    "video.tab.upload": "Качени",
    "video.no_videos": "Няма намерени видеоклипове.",

    // Course
    "course.map": "Карта на Курса",
    "course.admin_edit": "Редакция",
    "course.view_progress": "Виж прогреса на",
    "course.steps": "Стъпки",
    "course.select_content": "Изберете съдържание",
    "course.completed": "Завършено",
    "course.continue": "Завърши & Продължи",

    // Community
    "comm.rooms": "Стаи за Търговия",
    "comm.online": "Трейдъри Онлайн",
    "comm.active": "Активни",
    "comm.live_sharing": "СПОДЕЛЯНЕ НА ЖИВО",
    "comm.screen": "Екран",
    "comm.rec": "ЗАПИС",
    "comm.placeholder": "Съобщение до",
    "comm.image_attached": "Прикачена снимка",
    "comm.ready_send": "Готово за изпращане",
  },
  en: {
    // General
    "app.name": "PROSCALP",
    "app.slogan": "Elite Mentorship",
    
    // Auth
    "auth.login": "Member Login",
    "auth.apply": "Apply for Access",
    "auth.email": "Email Access",
    "auth.password": "Password",
    "auth.submit": "Enter Terminal",
    "auth.register_submit": "Submit Application",
    "auth.welcome_back": "Welcome back, trader.",
    "auth.start_journey": "Start your journey to funding.",
    "auth.or_continue": "Or continue with",
    "auth.demo_login": "Demo Login",
    
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.course": "ProScalp Course",
    "nav.outlook": "Mentor Outlook",
    "nav.trades": "Trade Center",
    "nav.archive": "Video Archive",
    "nav.traders": "Traders",
    "nav.community": "Community",
    "nav.notifications": "Notifications",
    "nav.profile": "My Profile",
    "nav.admin": "Admin Panel",
    "nav.signout": "Sign Out",

    // Dashboard
    "dash.analytics": "Performance Analytics",
    "dash.realtime": "Real-time data for",
    "dash.equity_curve_show": "Show Equity Curve",
    "dash.equity_curve_hide": "Hide Equity Curve",
    "dash.net_profit": "Net Profit",
    "dash.realized_pnl": "Total realized PnL",
    "dash.win_rate": "Win Rate",
    "dash.risk_reward": "Risk Reward",
    "dash.accumulated_r": "Accumulated R-Multiple",
    "dash.profit_factor": "Profit Factor",
    "dash.gross_ratio": "Gross Win / Gross Loss",
    "dash.search_placeholder": "Search trades...",
    "dash.filter_all": "All",
    "dash.filter_win": "Wins",
    "dash.filter_loss": "Losses",
    "dash.no_trades": "No trades found",

    // Trade Center
    "trade.center": "Trade Center",
    "trade.feed": "Community Feed",
    "trade.post": "Post Trade",
    "trade.upload_title": "Trade Entry Protocol",
    "trade.protocol_desc": "Stop Loss is strictly required for risk analysis.",
    "trade.pair": "Pair",
    "trade.strategy": "Strategy",
    "trade.timeframe": "Timeframe",
    "trade.direction": "Direction",
    "trade.buy": "BUY / LONG",
    "trade.sell": "SELL / SHORT",
    "trade.entry": "Entry",
    "trade.sl": "Stop Loss",
    "trade.tp": "Take Profit",
    "trade.open_time": "Open Time",
    "trade.close_time": "Close Time",
    "trade.notes": "Analysis Notes",
    "trade.notes_placeholder": "Describe your setup...",
    "trade.media": "Media Evidence",
    "trade.drop_media": "Drop screenshot or click to browse",
    "trade.visibility": "Visibility",
    "trade.vis_public": "Public",
    "trade.vis_private": "Private",
    "trade.submit": "Submit Trade Logic",
    "trade.filter_user": "Filter by User:",
    "trade.everyone": "Everyone",
    "trade.following": "Following",

    // Video Archive
    "video.title": "Video Archive",
    "video.subtitle": "Review past live sessions and educational content.",
    "video.search": "Search archive...",
    "video.upload": "Upload",
    "video.cancel": "Cancel",
    "video.upload_new": "Upload New Resource",
    "video.vid_title": "Video Title",
    "video.vid_desc": "Description",
    "video.select_file": "Select video file",
    "video.publish": "Publish Video",
    "video.tab.all": "All Videos",
    "video.tab.live": "Live Recordings",
    "video.tab.upload": "Uploads",
    "video.no_videos": "No videos found in archive.",

    // Course
    "course.map": "Course Map",
    "course.admin_edit": "Toggle Admin Edit Mode",
    "course.view_progress": "View Student Progress",
    "course.steps": "Steps",
    "course.select_content": "Select content to view",
    "course.completed": "Completed",
    "course.continue": "Complete & Continue",

    // Community
    "comm.rooms": "Trading Rooms",
    "comm.online": "Traders Online",
    "comm.active": "Active",
    "comm.live_sharing": "LIVE SHARING",
    "comm.screen": "Screen",
    "comm.rec": "REC",
    "comm.placeholder": "Message",
    "comm.image_attached": "Image Attached",
    "comm.ready_send": "Ready to send",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: AppTranslations;
  updateTranslations: (newTranslations: AppTranslations) => Promise<boolean>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('bg');

  // --- SMART INITIALIZATION (Fixes Flicker) ---
  const [translations, setTranslations] = useState<AppTranslations>(() => {
      // 1. Try to get cached translations from Local Storage (Instant)
      try {
          const cached = localStorage.getItem('app_translations');
          if (cached) {
              return JSON.parse(cached);
          }
      } catch (e) {
          console.warn("Failed to load translations from cache");
      }
      // 2. Fallback to hardcoded defaults (Instant)
      return DEFAULT_TRANSLATIONS;
  });

  // --- BACKGROUND SYNC (Fixes Stale Data) ---
  useEffect(() => {
      const syncTranslations = async () => {
          const stored = await TranslationService.getTranslations();
          if (stored) {
              // Merge Logic:
              // Start with Defaults (to ensure new keys from code exist)
              // Overwrite with DB values (to apply Admin edits)
              const merged = { ...DEFAULT_TRANSLATIONS };
              
              Object.keys(stored).forEach(lang => {
                  merged[lang] = { ...merged[lang], ...stored[lang] };
              });
              
              // Only update state if there are actual changes to prevent re-renders
              if (JSON.stringify(merged) !== JSON.stringify(translations)) {
                  setTranslations(merged);
                  localStorage.setItem('app_translations', JSON.stringify(merged));
              }
          }
      };
      
      syncTranslations();
  }, []);

  const updateTranslations = async (newTranslations: AppTranslations) => {
      // 1. Optimistic Update (Update UI immediately)
      setTranslations(newTranslations);
      localStorage.setItem('app_translations', JSON.stringify(newTranslations));
      
      // 2. Persist to Database (Background)
      const success = await TranslationService.saveTranslations(newTranslations);
      return success;
  };

  const t = (key: string) => {
    // 1. Try selected language
    if (translations[language] && translations[language][key]) {
        return translations[language][key];
    }
    // 2. Fallback to English
    if (translations['en'] && translations['en'][key]) {
        return translations['en'][key];
    }
    // 3. Fallback to Key itself
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations, updateTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};