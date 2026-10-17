import { User, getStoredRedemptions, saveStoredRedemptions, RewardRedemption } from './api';

export type DayOfWeekKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DailyOffer {
  dayKey: DayOfWeekKey;
  /** JS Date.getDay() index: 1 = Monday ... 6 = Saturday, 0 = Sunday */
  jsDayIndex: number;
  dayName: string;
  shortDay: string;
  title: string;
  subtitle: string;
  dealBadge: string;
  timeWindow: string;
  description: string;
  promoCode: string;
  bookingPath: string;
  bookingLabel: string;
  imageUrl: string;
  accentColor: string;
  badgeGradient: string;
  active: boolean;
  terms: string;
}

export interface DailyOfferClaim {
  id: string;
  pass_code: string;
  day_key: DayOfWeekKey;
  day_name: string;
  offer_title: string;
  deal_badge: string;
  promo_code: string;
  time_window: string;
  user_id: string;
  user_name: string;
  user_member_id: string;
  claimed_date: string; // YYYY-MM-DD
  created_at: string;
  fulfilled?: boolean;
}

const DAILY_OFFERS_STORAGE_KEY = 'playgolf.daily_offers_v1';
const DAILY_CLAIMS_STORAGE_KEY = 'playgolf.daily_offer_claims_v1';

export const DEFAULT_DAILY_OFFERS: DailyOffer[] = [
  {
    dayKey: 'monday',
    jsDayIndex: 1,
    dayName: 'Monday',
    shortDay: 'Mon',
    title: 'Monday Mornings Off-Peak',
    subtitle: 'Early Bird Driving Range Special',
    dealBadge: '50% OFF RANGE BAYS',
    timeWindow: '08:00 – 12:00',
    description:
      'Start your week strong with half-price 100-ball TrackMan range buckets and 50% off off-peak bay hire every Monday morning.',
    promoCode: 'MONOFFPEAK',
    bookingPath: '/booking/driving-range',
    bookingLabel: 'Book Morning Bay',
    imageUrl: '/promos/promo_range.jpg',
    accentColor: '#10b981',
    badgeGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    active: true,
    terms: 'Valid Mondays between 08:00 and 12:00. Show QR pass at reception or apply code when booking.',
  },
  {
    dayKey: 'tuesday',
    jsDayIndex: 2,
    dayName: 'Tuesday',
    shortDay: 'Tue',
    title: 'Two-for-One Putt Crazy Tuesday',
    subtitle: 'Adventure Minigolf Social Deal',
    dealBadge: '2-FOR-1 MINIGOLF',
    timeWindow: 'All Day Tuesday',
    description:
      'Bring a friend, partner, or family member for free on our 18-hole Putt Crazy adventure minigolf course all day Tuesday.',
    promoCode: 'TUEPUTT241',
    bookingPath: '/booking/putt-crazy',
    bookingLabel: 'Book Putt Crazy',
    imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?crop=entropy&cs=srgb&fm=jpg&q=80',
    accentColor: '#f59e0b',
    badgeGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    active: true,
    terms: 'Valid all day Tuesday. Second player of equal or lesser value plays free.',
  },
  {
    dayKey: 'wednesday',
    jsDayIndex: 3,
    dayName: 'Wednesday',
    shortDay: 'Wed',
    title: 'Wednesday Golf & Wings',
    subtitle: 'Midweek Range & Clubhouse Feast',
    dealBadge: 'FREE BASKET OF WINGS',
    timeWindow: '12:00 – 21:00',
    description:
      'Book any 60-minute Driving Range or Interactive Darts bay on Wednesday and enjoy a complimentary basket of signature Clubhouse Wings.',
    promoCode: 'WEDWINGS',
    bookingPath: '/booking/driving-range',
    bookingLabel: 'Book Bay & Wings',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=srgb&fm=jpg&q=80',
    accentColor: '#ea580c',
    badgeGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    active: true,
    terms: 'Valid Wednesdays from 12:00 PM. Present daily offer QR pass at reception & Clubhouse Kitchen.',
  },
  {
    dayKey: 'thursday',
    jsDayIndex: 4,
    dayName: 'Thursday',
    shortDay: 'Thu',
    title: 'TrackMan Pro Tune-Up Thursday',
    subtitle: 'Pro Coaching & Launch Monitor Perk',
    dealBadge: '+15 MIN PRO ANALYSIS',
    timeWindow: '10:00 – 20:00',
    description:
      'Upgrade your Thursday practice with complimentary TrackMan 4 swing speed & carry distance benchmarking plus 20% off Pro Shop gloves.',
    promoCode: 'THUTRACKMAN',
    bookingPath: '/booking/driving-range',
    bookingLabel: 'Reserve TrackMan Bay',
    imageUrl: '/promos/promo_trackman.jpg',
    accentColor: '#0284c7',
    badgeGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    active: true,
    terms: 'Valid all day Thursday at PlayGolf Northwick Park.',
  },
  {
    dayKey: 'friday',
    jsDayIndex: 5,
    dayName: 'Friday',
    shortDay: 'Fri',
    title: 'Friday Night Darts & Drinks',
    subtitle: 'AR Social Darts Kickoff',
    dealBadge: '25% OFF AR DARTS LANE',
    timeWindow: '16:00 – Close',
    description:
      'Kick off the weekend with 25% off Interactive AR Darts lane bookings after 4:00 PM plus member happy-hour pricing on Clubhouse pitchers.',
    promoCode: 'FRIDARTS25',
    bookingPath: '/booking/darts-interactive',
    bookingLabel: 'Book AR Darts Lane',
    imageUrl: '/promos/promo_proshop.jpg',
    accentColor: '#8b5cf6',
    badgeGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    active: true,
    terms: 'Valid Fridays from 16:00 onwards for up to 6 players per lane.',
  },
  {
    dayKey: 'saturday',
    jsDayIndex: 6,
    dayName: 'Saturday',
    shortDay: 'Sat',
    title: 'Super Saturday 2X Points Boost',
    subtitle: 'Weekend Loyalty Accelerator',
    dealBadge: '⚡ 2X LOYALTY POINTS',
    timeWindow: 'All Day Saturday',
    description:
      'Earn double loyalty points (+200 PTS) on every Driving Range bucket, 9-Hole tee time, and Pro Shop purchase all Saturday.',
    promoCode: 'SAT2XBOOST',
    bookingPath: '/booking',
    bookingLabel: 'Book Weekend Session',
    imageUrl: '/promos/promo_range.jpg',
    accentColor: '#059669',
    badgeGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    active: true,
    terms: 'Valid all day Saturday. Bonus points automatically credited upon reception scan.',
  },
  {
    dayKey: 'sunday',
    jsDayIndex: 0,
    dayName: 'Sunday',
    shortDay: 'Sun',
    title: 'Sunday Twilight 9-Hole Special',
    subtitle: 'Championship Course & Warm Drink',
    dealBadge: '£15 TWILIGHT GREEN FEE',
    timeWindow: 'After 14:00',
    description:
      'Enjoy a relaxing Sunday afternoon 9-hole round from 2:00 PM for just £15, including a complimentary barista coffee or tea before tee-off.',
    promoCode: 'SUNTWILIGHT',
    bookingPath: '/booking/nine-holes',
    bookingLabel: 'Book 9-Hole Tee Time',
    imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80',
    accentColor: '#0d9488',
    badgeGradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    active: true,
    terms: 'Valid Sundays for tee times after 14:00. Includes 1 hot drink voucher at Clubhouse Café.',
  },
];

function emitOffersUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('playgolf-daily-offers-updated'));
  }
}

export function getDailyOffers(): DailyOffer[] {
  try {
    const raw = localStorage.getItem(DAILY_OFFERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DAILY_OFFERS_STORAGE_KEY, JSON.stringify(DEFAULT_DAILY_OFFERS));
      return DEFAULT_DAILY_OFFERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 7) {
      localStorage.setItem(DAILY_OFFERS_STORAGE_KEY, JSON.stringify(DEFAULT_DAILY_OFFERS));
      return DEFAULT_DAILY_OFFERS;
    }
    return parsed;
  } catch {
    return DEFAULT_DAILY_OFFERS;
  }
}

export function saveDailyOffers(offers: DailyOffer[]): void {
  try {
    localStorage.setItem(DAILY_OFFERS_STORAGE_KEY, JSON.stringify(offers));
    emitOffersUpdate();
  } catch {
    /* ignore */
  }
}

export function updateDailyOffer(dayKey: DayOfWeekKey, updates: Partial<DailyOffer>): DailyOffer[] {
  const current = getDailyOffers();
  const next = current.map((offer) => (offer.dayKey === dayKey ? { ...offer, ...updates } : offer));
  saveDailyOffers(next);
  return next;
}

export function resetDailyOffersToDefaults(): DailyOffer[] {
  saveDailyOffers(DEFAULT_DAILY_OFFERS);
  return DEFAULT_DAILY_OFFERS;
}

export function getCurrentDayOffer(offers: DailyOffer[] = getDailyOffers()): DailyOffer {
  const todayJsIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  return offers.find((o) => o.jsDayIndex === todayJsIndex) || offers[0];
}

export function getStoredDailyClaims(): DailyOfferClaim[] {
  try {
    const raw = localStorage.getItem(DAILY_CLAIMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredDailyClaims(claims: DailyOfferClaim[]): void {
  try {
    localStorage.setItem(DAILY_CLAIMS_STORAGE_KEY, JSON.stringify(claims));
    emitOffersUpdate();
  } catch {
    /* ignore */
  }
}

export function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getUserClaimForToday(userId: string, dayKey: DayOfWeekKey): DailyOfferClaim | undefined {
  const today = getTodayDateStr();
  return getStoredDailyClaims().find(
    (c) => c.user_id === userId && c.day_key === dayKey && c.claimed_date === today
  );
}

export function claimDailyOfferPass(offer: DailyOffer, user: User): DailyOfferClaim {
  const existing = getUserClaimForToday(user.id, offer.dayKey);
  if (existing) return existing;

  const today = getTodayDateStr();
  const shortRand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const passCode = `QR_DAILY_${offer.shortDay.toUpperCase()}_${shortRand}`;

  const newClaim: DailyOfferClaim = {
    id: `do_claim_${Date.now()}`,
    pass_code: passCode,
    day_key: offer.dayKey,
    day_name: offer.dayName,
    offer_title: offer.title,
    deal_badge: offer.dealBadge,
    promo_code: offer.promoCode,
    time_window: offer.timeWindow,
    user_id: user.id,
    user_name: user.name || 'Club Member',
    user_member_id: user.member_id || 'PG-MEMBER',
    claimed_date: today,
    created_at: new Date().toISOString(),
    fulfilled: false,
  };

  const currentClaims = getStoredDailyClaims();
  saveStoredDailyClaims([newClaim, ...currentClaims]);

  // Also register in redemptions list so reception staff can see & verify it in Voucher Desk & QR Scanner
  const currentRedemptions = getStoredRedemptions();
  const redemptionEntry: RewardRedemption = {
    id: newClaim.id,
    user_id: user.id,
    user_name: user.name || 'Club Member',
    user_member_id: user.member_id || 'PG-MEMBER',
    reward_id: `daily_${offer.dayKey}`,
    reward_title: `${offer.dayName} Offer: ${offer.title} (${offer.dealBadge})`,
    points_cost: 0,
    redemption_type: 'qr',
    discount_code: offer.promoCode,
    qr_code_token: passCode,
    fulfilled: false,
    created_at: newClaim.created_at,
  };
  saveStoredRedemptions([redemptionEntry, ...currentRedemptions]);

  return newClaim;
}

export function buildDailyOfferQrPayload(claim: DailyOfferClaim): string {
  return JSON.stringify({
    t: 'PG_DO',
    code: claim.pass_code,
    day: claim.day_name,
    title: claim.offer_title,
    badge: claim.deal_badge,
    promo: claim.promo_code,
    win: claim.time_window,
    uName: claim.user_name,
    uMid: claim.user_member_id,
    dt: claim.claimed_date,
  });
}

export function parseDailyOfferQrPayload(raw: string): DailyOfferClaim | null {
  try {
    const clean = (raw || '').trim();
    if (!clean.startsWith('{')) return null;
    const p = JSON.parse(clean);
    if (p.t !== 'PG_DO' || !p.code) return null;
    return {
      id: `do_qr_${p.code}`,
      pass_code: p.code,
      day_key: (p.day || 'monday').toLowerCase() as DayOfWeekKey,
      day_name: p.day || 'Today',
      offer_title: p.title || 'Offer of the Day',
      deal_badge: p.badge || 'DAILY DEAL',
      promo_code: p.promo || 'DAILY',
      time_window: p.win || 'Today',
      user_id: 'usr_scanned',
      user_name: p.uName || 'Club Member',
      user_member_id: p.uMid || 'PG-MEMBER',
      claimed_date: p.dt || getTodayDateStr(),
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
