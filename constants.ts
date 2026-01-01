
import { User, UserRole, Trade, TradeStatus, Channel, ChatMessage, TradeStrategy, Notification, MentorOutlook, VideoResource, CourseModule, CourseContent, UserCourseProgress, RegistrationToken } from './types';

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Alex Mentor', email: 'admin@proscalp.com', role: UserRole.ADMIN, avatar: 'https://picsum.photos/100/100?random=1', following: [], privacy: 'public' },
  { id: '2', name: 'Sarah Scalp', email: 'sarah@demo.com', role: UserRole.TRADER, avatar: 'https://picsum.photos/100/100?random=2', following: ['3'], privacy: 'public' },
  { id: '3', name: 'Mike Pip', email: 'mike@demo.com', role: UserRole.TRADER, avatar: 'https://picsum.photos/100/100?random=3', following: ['2'], privacy: 'private' },
  { id: '4', name: 'John Doe', email: 'john@demo.com', role: UserRole.TRADER, avatar: 'https://picsum.photos/100/100?random=4', following: [], privacy: 'public' },
];

export const MOCK_TOKENS: RegistrationToken[] = [
    { code: 'PRO-2024-ALPHA', isUsed: false, generatedBy: '1', generatedAt: Date.now() },
    { code: 'VIP-TRADER-99', isUsed: true, generatedBy: '1', generatedAt: Date.now() - 100000, usedBy: '2' },
    { code: 'SECRET-KEY-123', isUsed: false, generatedBy: '1', generatedAt: Date.now() - 200000 },
];

export const CHANNELS: Channel[] = [
  { id: 'general', name: 'General Lounge', type: 'public' },
  { id: 'analysis', name: 'XAUUSD Analysis', type: 'public' },
  { id: 'wins', name: 'Winning Trades', type: 'public' },
  { id: 'voice-1', name: 'Live Trading Floor', type: 'voice' },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'm1', userId: '1', userName: 'Alex Mentor', content: 'Welcome to the mentorship! Remember, risk management is key.', timestamp: Date.now() - 100000, channelId: 'general' },
  { id: 'm2', userId: '2', userName: 'Sarah Scalp', content: 'Just posted a nice long on Gold.', timestamp: Date.now() - 50000, channelId: 'analysis' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { 
    id: 'n1', 
    userId: '2', 
    type: 'mentor_review', 
    title: 'Trade Reviewed', 
    message: 'Your recent XAUUSD Long has been reviewed by the Mentor.', 
    timestamp: Date.now() - 1200000, 
    read: false,
    relatedId: 't0'
  },
  { 
    id: 'n2', 
    userId: '2', 
    type: 'new_trade', 
    title: 'New Trade Alert', 
    message: 'Mike Pip just posted a new Breakout trade on EURUSD.', 
    timestamp: Date.now() - 3600000, 
    read: true,
    relatedId: 't1'
  },
];

export const MOCK_OUTLOOKS: MentorOutlook[] = [
    {
        id: 'daily-1',
        type: 'daily',
        title: 'Daily Briefing',
        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }),
        timestamp: Date.now(),
        bias: 'bullish',
        summary: 'Price has successfully reclaimed the 2030 level. We are looking for a retest of the London low to engage longs targeting 2050 liquidity. Be wary of DXY strength at 104.50.',
        levels: [
            { price: 2055.00, type: 'resistance', strength: 'strong', note: 'Weekly High' },
            { price: 2042.50, type: 'resistance', strength: 'medium', note: 'Swing High' },
            { price: 2030.00, type: 'support', strength: 'strong', note: 'Breaker Block' },
            { price: 2022.00, type: 'support', strength: 'medium', note: 'London Low' },
        ],
        timeline: [
            { id: 't1', label: '08:30', title: 'CPI Data', type: 'news', impact: 'high' },
            { id: 't2', label: '09:30', title: 'NYSE Open Volatility', type: 'mentor', impact: 'medium' },
            { id: 't3', label: '14:00', title: 'FOMC Minutes', type: 'news', impact: 'medium' },
            { id: 't4', label: '16:00', title: 'London Close', type: 'structure', impact: 'low' },
        ]
    },
    {
        id: 'session-1',
        type: 'session',
        title: 'New York Session Plan',
        date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }),
        timestamp: Date.now() - 3600000,
        bias: 'neutral',
        sessionName: 'New York',
        startHour: 13,
        endHour: 21,
        summary: 'Expecting choppy price action initially due to news. Look for the manipulation leg to complete by 14:00 before committing to direction.',
        levels: [
             { price: 2035.00, type: 'resistance', strength: 'medium', note: 'Intraday Cap' },
             { price: 2028.00, type: 'support', strength: 'medium', note: 'Value Low' },
        ],
        timeline: [
            { id: 's1', label: '13:00', title: 'Session Open', type: 'structure', impact: 'medium' },
            { id: 's2', label: '13:30', title: 'Macro Injection', type: 'mentor', impact: 'high' },
            { id: 's3', label: '15:00', title: 'PM Trend Check', type: 'structure', impact: 'low' },
        ]
    },
    {
        id: 'weekly-1',
        type: 'weekly',
        title: 'Weekly Roadmap',
        startDate: '2024-10-14',
        endDate: '2024-10-20',
        timestamp: Date.now() - 86400000,
        bias: 'bearish',
        summary: 'Higher timeframe market structure is shifting bearish on the weekly. We are looking for rallies to be sold into 2060. Targets are 1980 liquidity.',
        levels: [
            { price: 2080.00, type: 'resistance', strength: 'strong', note: 'Monthly High' },
            { price: 1980.00, type: 'support', strength: 'strong', note: 'Old Lows' },
        ],
        timeline: [
            { id: 'w1', label: 'Mon', title: 'Accumulation', type: 'structure', impact: 'low' },
            { id: 'w2', label: 'Tue', title: 'Initial Balance', type: 'structure', impact: 'medium' },
            { id: 'w3', label: 'Wed', title: 'FOMC / Volatility', type: 'news', impact: 'high' },
            { id: 'w4', label: 'Thu', title: 'Expansion Leg', type: 'mentor', impact: 'medium' },
            { id: 'w5', label: 'Fri', title: 'Weekly Close', type: 'structure', impact: 'medium' },
        ]
    }
];

export const MOCK_VIDEOS: VideoResource[] = [
    {
        id: 'v1',
        title: 'NY Session Live Trade Review',
        description: 'Reviewing the breakout strategy execution during the 8:30am news impact.',
        url: '#', // Placeholder
        authorName: 'Alex Mentor',
        timestamp: Date.now() - 86400000,
        type: 'live_recording',
        duration: '45:20',
        thumbnail: 'https://picsum.photos/400/225?random=50'
    },
    {
        id: 'v2',
        title: 'Risk Management Masterclass',
        description: 'How to calculate R-Multiples correctly and position size for XAUUSD.',
        url: '#',
        authorName: 'Alex Mentor',
        timestamp: Date.now() - 172800000,
        type: 'upload',
        duration: '12:05',
        thumbnail: 'https://picsum.photos/400/225?random=51'
    }
];

// --- COURSE MOCK DATA ---

export const MOCK_COURSE_MODULES: CourseModule[] = [
    { id: 'mod1', title: '1. Introduction', description: 'Foundations of the ProScalp system.', order: 1 },
    { id: 'mod2', title: '2. Breakout', description: 'Mastering momentum and volatility expansion.', order: 2 },
    { id: 'mod3', title: '3. Wick Fill', description: 'Trading exhaustion and liquidity grabs.', order: 3 },
    { id: 'mod4', title: '4. Flip', description: 'Support becomes resistance (and vice versa).', order: 4 },
    { id: 'mod5', title: '5. Psychological', description: 'Mindset mastery for high performance.', order: 5 },
    { id: 'mod6', title: '6. Final', description: 'Putting it all together.', order: 6 },
];

export const MOCK_COURSE_CONTENT: CourseContent[] = [
    // Module 1
    {
        id: 'c1', moduleId: 'mod1', type: 'text', order: 1, title: 'Welcome to ProScalp',
        textContent: "Welcome to the elite circle. This course is designed to take you from a novice to a funded scalp trader. We focus purely on XAUUSD (Gold) due to its high volatility and respect for technical levels.\n\nPlease watch the video below to understand how to use this platform."
    },
    {
        id: 'c2', moduleId: 'mod1', type: 'video', order: 2, title: 'System Overview Video',
        videoUrl: '#', // Placeholder
    },
    {
        id: 'c3', moduleId: 'mod1', type: 'quiz', order: 3, title: 'Knowledge Check 1',
        quizData: [
            { id: 'q1', question: 'What is the primary pair we trade?', options: ['EURUSD', 'BTCUSD', 'XAUUSD', 'US30'], correctOptionIndex: 2 },
            { id: 'q2', question: 'What is the key to longevity?', options: ['High Leverage', 'Risk Management', 'Predicting News', 'Luck'], correctOptionIndex: 1 }
        ]
    },
    // Module 2
    {
        id: 'c4', moduleId: 'mod2', type: 'text', order: 1, title: 'The Anatomy of a Breakout',
        textContent: "A true breakout occurs when price displaces heavily away from a consolidation zone. We do not chase; we wait for the retest or the immediate continuation pattern on lower timeframes (M1)."
    },
     {
        id: 'c5', moduleId: 'mod2', type: 'quiz', order: 2, title: 'Breakout Quiz',
        quizData: [
            { id: 'q3', question: 'What confirms a valid breakout?', options: ['A wick above resistance', 'A candle close with displacement', 'High volume only', 'RSI overbought'], correctOptionIndex: 1 }
        ]
    }
];

export const MOCK_USER_PROGRESS: UserCourseProgress[] = [
    { userId: '2', completedContentIds: ['c1', 'c2'] }, // Sarah has done intro
    { userId: '3', completedContentIds: [] }, // Mike hasn't started
];

export const STRATEGIES: TradeStrategy[] = ['Breakout', 'Wick Fill', 'Flip', 'News'];
export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '60m', '4h', '1d'];

const generateTrades = (count: number): Trade[] => {
  const trades: Trade[] = [];
  const now = Date.now();
  const dayMs = 86400000;
  
  for (let i = 0; i < count; i++) {
    const isWin = Math.random() > 0.45; 
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    
    const daysAgo = Math.floor(Math.random() * 400); 
    const closeTime = now - (daysAgo * dayMs) - Math.floor(Math.random() * 1000000);
    const duration = 300000 + Math.floor(Math.random() * 14400000); 
    const openTime = closeTime - duration;

    const entryPrice = 2000 + Math.random() * 400;
    const slDist = 2 + Math.random() * 3;
    const rr = isWin ? (1 + Math.random() * 2) : -1;
    
    let stopLoss, exitPrice, pnl;

    if (type === 'BUY') {
      stopLoss = entryPrice - slDist;
      const risk = entryPrice - stopLoss;
      const profit = risk * rr;
      exitPrice = entryPrice + profit;
      pnl = (exitPrice - entryPrice) * 10;
    } else {
      stopLoss = entryPrice + slDist;
      const risk = stopLoss - entryPrice;
      const profit = risk * rr;
      exitPrice = entryPrice - profit;
      pnl = (entryPrice - exitPrice) * 10;
    }

    // Assign to a random user from mock users
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

    trades.push({
      id: `t${i}`,
      userId: user.id,
      userName: user.name,
      pair: 'XAUUSD',
      type,
      timeframe: TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)],
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      exitPrice: parseFloat(exitPrice.toFixed(2)),
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(2)),
      strategy: STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)],
      notes: isWin ? 'Clean market structure break. Held to TP.' : 'Choppy price action, hit SL.',
      status: Math.random() > 0.8 ? TradeStatus.PENDING : TradeStatus.REVIEWED,
      timestamp: closeTime,
      openTime,
      closeTime,
      adminFeedback: Math.random() > 0.7 ? 'Great risk management on this setup. Your entry was precise, but consider trailing your stop sooner.' : undefined,
      imageUrl: Math.random() > 0.5 ? `https://picsum.photos/800/450?random=${i}` : undefined,
      likes: [],
      comments: []
    });
  }
  return trades.sort((a, b) => b.timestamp - a.timestamp);
};

export const MOCK_TRADES = generateTrades(40);
