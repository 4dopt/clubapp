import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Gift,
  Plus,
  Edit2,
  Search,
  Eye,
  EyeOff,
  Upload,
  X,
  Sparkles,
  Copy,
  Trash2,
  Star,
  CheckCircle2,
  QrCode,
  Tag,
  Award,
  TrendingUp,
  Layers,
  ShieldCheck,
  Clock,
  Wand2,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, Reward, RewardRedemption } from '../api';
import { AdminDailyOffersStudio } from '../components/AdminDailyOffersStudio';

interface RewardTemplate {
  label: string;
  title: string;
  description: string;
  points_cost: number;
  category: string;
  redemption_type: 'qr' | 'discount';
  discount_code?: string;
  min_tier: 'All' | 'Silver' | 'Gold' | 'Platinum';
  retail_value: string;
  stock_limit: number | null;
  image_url: string;
  terms: string;
}

const QUICK_REWARD_TEMPLATES: RewardTemplate[] = [
  {
    label: '🏌️ 100 Range Balls',
    title: 'Complimentary Bucket of 100 Range Balls',
    description: 'Enjoy a free range session with 100 premium Srixon balls and TrackMan bay tracking.',
    points_cost: 150,
    category: 'Driving Range',
    redemption_type: 'qr',
    min_tier: 'All',
    retail_value: '£14.00',
    stock_limit: null,
    image_url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80',
    terms: 'Valid any day at Northwick Park Driving Range. Scan QR at reception.',
  },
  {
    label: '☕ Coffee & Pastry',
    title: 'Clubhouse Barista Coffee & Warm Croissant',
    description: 'Start your morning round with a complimentary specialty coffee and fresh bakery pastry.',
    points_cost: 120,
    category: 'Food & Beverage',
    redemption_type: 'qr',
    min_tier: 'All',
    retail_value: '£7.50',
    stock_limit: null,
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=srgb&fm=jpg&q=80',
    terms: 'Redeemable daily at Clubhouse Café before 2:00 PM.',
  },
  {
    label: '🛍️ 20% Pro Shop',
    title: '20% Off Pro Shop Apparel & Footwear',
    description: 'Save 20% on seasonal golf polos, caps, gloves, and tour footwear in the Pro Shop.',
    points_cost: 300,
    category: 'Pro Shop',
    redemption_type: 'discount',
    discount_code: 'PLAYGOLF20',
    min_tier: 'Silver',
    retail_value: 'Up to £35',
    stock_limit: 100,
    image_url: 'https://images.unsplash.com/photo-1593111774601-dfbce324a35f?crop=entropy&cs=srgb&fm=jpg&q=80',
    terms: 'Valid on full-price items in store.',
  },
  {
    label: '🎯 PGA TrackMan Lesson',
    title: '45-Min PGA Pro TrackMan Swing Tune-Up',
    description: 'Private 1-on-1 launch monitor coaching session with a PlayGolf PGA Professional.',
    points_cost: 550,
    category: 'Coaching',
    redemption_type: 'qr',
    min_tier: 'Gold',
    retail_value: '£55.00',
    stock_limit: 25,
    image_url: 'https://images.unsplash.com/photo-1592919505780-303950717480?crop=entropy&cs=srgb&fm=jpg&q=80',
    terms: 'Subject to pro availability. Book via reception desk.',
  },
  {
    label: '⛳ 9-Hole Twilight Pass',
    title: 'Complimentary 9-Hole Twilight Green Fee',
    description: 'Play an executive 9-hole round after 16:00 completely free with your loyalty points.',
    points_cost: 400,
    category: 'Course & Games',
    redemption_type: 'qr',
    min_tier: 'Silver',
    retail_value: '£28.00',
    stock_limit: 40,
    image_url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?crop=entropy&cs=srgb&fm=jpg&q=80',
    terms: 'Valid for tee times after 16:00 Monday–Sunday.',
  },
];

const CURATED_GOLF_IMAGES = [
  {
    label: 'Range Bays',
    url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80',
  },
  {
    label: 'Pro Shop Gear',
    url: 'https://images.unsplash.com/photo-1593111774601-dfbce324a35f?crop=entropy&cs=srgb&fm=jpg&q=80',
  },
  {
    label: 'PGA Coaching',
    url: 'https://images.unsplash.com/photo-1592919505780-303950717480?crop=entropy&cs=srgb&fm=jpg&q=80',
  },
  {
    label: 'Fairway Course',
    url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?crop=entropy&cs=srgb&fm=jpg&q=80',
  },
  {
    label: 'Café & Drinks',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=srgb&fm=jpg&q=80',
  },
];

export function AdminRewards() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);

  // Main View Tab: Catalog Studio vs Daily Offers (Mon-Sun) vs Redemptions & Voucher Desk
  const [activeTab, setActiveTab] = useState<'catalog' | 'daily_offers' | 'redemptions'>(() =>
    location.search.includes('daily') ? 'daily_offers' : 'catalog'
  );

  // Catalog Filters
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusScope, setStatusScope] = useState<'all' | 'active' | 'inactive' | 'featured'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'cost_asc' | 'cost_desc'>('popular');
  const [message, setMessage] = useState('');

  // Voucher Verification State
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [redemptionFilter, setRedemptionFilter] = useState<'all' | 'pending' | 'fulfilled'>('all');

  // Add / Edit Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Device Image Upload States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(200);
  const [category, setCategory] = useState('Driving Range');
  const [redemptionType, setRedemptionType] = useState<'qr' | 'discount'>('qr');
  const [discountCode, setDiscountCode] = useState('');
  const [minTier, setMinTier] = useState<'All' | 'Silver' | 'Gold' | 'Platinum'>('All');
  const [retailValue, setRetailValue] = useState('£15.00');
  const [stockLimit, setStockLimit] = useState<string>('');
  const [featured, setFeatured] = useState(false);
  const [terms, setTerms] = useState('Present digital pass at PlayGolf reception.');
  const [imageUrl, setImageUrl] = useState(CURATED_GOLF_IMAGES[0].url);
  const [active, setActive] = useState(true);

  const loadAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rewList, redList] = await Promise.all([
        adminApi.listRewards(token),
        adminApi.listRedemptions(token),
      ]);
      setRewards(rewList);
      setRedemptions(redList);
    } catch {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [token]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPointsCost(200);
    setCategory('Driving Range');
    setRedemptionType('qr');
    setDiscountCode('');
    setMinTier('All');
    setRetailValue('£15.00');
    setStockLimit('');
    setFeatured(false);
    setTerms('Present digital pass at PlayGolf reception.');
    setImageUrl(CURATED_GOLF_IMAGES[0].url);
    setActive(true);
    setEditingReward(null);
    setShowUrlInput(false);
  };

  const applyQuickTemplate = (tpl: RewardTemplate) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setPointsCost(tpl.points_cost);
    setCategory(tpl.category);
    setRedemptionType(tpl.redemption_type);
    setDiscountCode(tpl.discount_code || '');
    setMinTier(tpl.min_tier);
    setRetailValue(tpl.retail_value);
    setStockLimit(tpl.stock_limit ? String(tpl.stock_limit) : '');
    setFeatured(true);
    setTerms(tpl.terms);
    setImageUrl(tpl.image_url);
    setActive(true);
    setShowAddModal(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
      }
      setUploadingImage(false);
    };
    reader.onerror = () => {
      setUploadingImage(false);
      setMessage('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (reward: Reward) => {
    setEditingReward(reward);
    setTitle(reward.title);
    setDescription(reward.description);
    setPointsCost(reward.points_cost);
    setCategory(reward.category);
    setRedemptionType(reward.redemption_type);
    setDiscountCode(reward.discount_code || '');
    setMinTier(reward.min_tier || 'All');
    setRetailValue(reward.retail_value || '£15.00');
    setStockLimit(reward.stock_limit ? String(reward.stock_limit) : '');
    setFeatured(Boolean(reward.featured));
    setTerms(reward.terms || 'Present digital pass at PlayGolf reception.');
    setImageUrl(reward.image_url || CURATED_GOLF_IMAGES[0].url);
    setActive(reward.active);
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const parsedStock = stockLimit.trim() ? parseInt(stockLimit, 10) : null;
      const newReward = await adminApi.createReward(token, {
        title,
        description,
        points_cost: pointsCost,
        category,
        image_url: imageUrl || CURATED_GOLF_IMAGES[0].url,
        active,
        redemption_type: redemptionType,
        discount_code: redemptionType === 'discount' ? discountCode : undefined,
        min_tier: minTier,
        retail_value: retailValue,
        stock_limit: parsedStock,
        featured,
        terms,
        redeemed_count: 0,
      });

      setRewards((prev) => [newReward, ...prev]);
      setMessage(`✅ Created reward "${newReward.title}" in catalog!`);
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Failed to create reward'}`);
    }
  };

  const handleUpdateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingReward) return;
    try {
      const parsedStock = stockLimit.trim() ? parseInt(stockLimit, 10) : null;
      const updates: Partial<Reward> = {
        title,
        description,
        points_cost: pointsCost,
        category,
        image_url: imageUrl,
        active,
        redemption_type: redemptionType,
        discount_code: redemptionType === 'discount' ? discountCode : undefined,
        min_tier: minTier,
        retail_value: retailValue,
        stock_limit: parsedStock,
        featured,
        terms,
      };
      await adminApi.updateReward(token, editingReward.id, updates);

      setRewards((prev) =>
        prev.map((r) => (r.id === editingReward.id ? { ...r, ...updates } : r))
      );

      setMessage(`✅ Updated reward "${title}"!`);
      setEditingReward(null);
      resetForm();
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Failed to update reward'}`);
    }
  };

  const handleDuplicateReward = async (reward: Reward) => {
    if (!token) return;
    const copy = await adminApi.createReward(token, {
      ...reward,
      title: `${reward.title} (Copy)`,
      redeemed_count: 0,
    });
    setRewards((prev) => [copy, ...prev]);
    setMessage(`📋 Duplicated "${reward.title}" for quick editing.`);
  };

  const handleDeleteReward = async (reward: Reward) => {
    if (!token) return;
    await adminApi.deleteReward(token, reward.id);
    setRewards((prev) => prev.filter((r) => r.id !== reward.id));
    setMessage(`🗑️ Removed "${reward.title}" from catalog.`);
  };

  const handleQuickAdjustCost = async (reward: Reward, delta: number) => {
    if (!token) return;
    const newCost = Math.max(25, reward.points_cost + delta);
    await adminApi.updateReward(token, reward.id, { points_cost: newCost });
    setRewards((prev) =>
      prev.map((r) => (r.id === reward.id ? { ...r, points_cost: newCost } : r))
    );
  };

  const handleToggleFeatured = async (reward: Reward) => {
    if (!token) return;
    const nextFeatured = !reward.featured;
    await adminApi.updateReward(token, reward.id, { featured: nextFeatured });
    setRewards((prev) =>
      prev.map((r) => (r.id === reward.id ? { ...r, featured: nextFeatured } : r))
    );
    setMessage(nextFeatured ? `⭐ Marked "${reward.title}" as Featured Perk!` : `Removed featured spotlight from "${reward.title}".`);
  };

  const toggleRewardActive = async (reward: Reward) => {
    if (!token) return;
    try {
      const newStatus = !reward.active;
      await adminApi.updateReward(token, reward.id, { active: newStatus });
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, active: newStatus } : r))
      );
      setMessage(`${newStatus ? '✅ Activated' : '⏸️ Paused'} "${reward.title}"`);
    } catch {
      setMessage('Failed to toggle status');
    }
  };

  const handleVerifyVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !verifyCodeInput.trim()) return;
    try {
      const res = await adminApi.fulfillRewardQr(token, verifyCodeInput.trim());
      setMessage(
        `✅ Verified & Fulfilled: "${res.redemption.reward_title}" for ${res.member.name} (${res.member.member_id})!`
      );
      setVerifyCodeInput('');
      const updatedReds = await adminApi.listRedemptions(token);
      setRedemptions(updatedReds);
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Voucher code not found or already used.'}`);
    }
  };

  const handleFulfillRedemptionRow = async (redemption: RewardRedemption) => {
    if (!token) return;
    try {
      await adminApi.fulfillRedemption(token, redemption.id);
      setRedemptions((prev) =>
        prev.map((r) =>
          r.id === redemption.id ? { ...r, fulfilled: true, fulfilled_at: new Date().toISOString() } : r
        )
      );
      setMessage(`✅ Fulfilled "${redemption.reward_title}" for ${redemption.user_name || 'Member'}.`);
    } catch {
      setMessage('❌ Failed to mark redemption as fulfilled.');
    }
  };

  const categories = ['All', 'Driving Range', 'Pro Shop', 'Coaching', 'Food & Beverage', 'Course & Games'];

  const filteredRewards = rewards
    .filter((r) => {
      const matchesQuery =
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase()) ||
        (r.discount_code || '').toLowerCase().includes(query.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
      const matchesStatus =
        statusScope === 'all'
          ? true
          : statusScope === 'active'
          ? r.active
          : statusScope === 'inactive'
          ? !r.active
          : Boolean(r.featured);
      return matchesQuery && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'cost_asc') return a.points_cost - b.points_cost;
      if (sortBy === 'cost_desc') return b.points_cost - a.points_cost;
      return (b.redeemed_count || 0) - (a.redeemed_count || 0);
    });

  const filteredRedemptions = redemptions.filter((r) => {
    if (redemptionFilter === 'pending') return !r.fulfilled;
    if (redemptionFilter === 'fulfilled') return r.fulfilled;
    return true;
  });

  const activeCount = rewards.filter((r) => r.active).length;
  const totalRedeemedCount = rewards.reduce((acc, r) => acc + (r.redeemed_count || 0), 0);
  const pendingVoucherCount = redemptions.filter((r) => !r.fulfilled).length;
  const avgCost =
    rewards.length > 0 ? Math.round(rewards.reduce((acc, r) => acc + r.points_cost, 0) / rewards.length) : 0;

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', flex: 1, padding: '24px 18px 44px 18px' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin')}
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#cbd5e1',
          padding: '8px 14px',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={15} /> Back to Staff Home
      </button>

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.2,
              marginBottom: '6px',
            }}
          >
            <Gift size={22} style={{ color: '#10b981', flexShrink: 0 }} /> Rewards & Vouchers
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.45 }}>
            Add new member perks or check off reward vouchers at reception.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{
            width: 'auto',
            minHeight: '44px',
            padding: '10px 16px',
            fontSize: '0.84rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={16} /> Add New Reward
        </button>
      </div>

      {message && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.85rem',
            marginBottom: '18px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Spacious 2x2 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div
          onClick={() => setActiveTab('catalog')}
          style={{
            background: '#111827',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 700 }}>Active Perks in Shop</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
            {activeCount} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>of {rewards.length}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Available to members</div>
        </div>

        <div
          onClick={() => setActiveTab('redemptions')}
          style={{
            background: '#111827',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: 700 }}>Waiting Vouchers</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>{pendingVoucherCount}</div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>Tap to verify codes</div>
        </div>
      </div>

      {/* Mode Switcher: Catalog Studio vs Daily Offers (Mon–Sun) vs Voucher Desk */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '4px',
          borderRadius: '13px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '16px',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            flex: 1,
            minHeight: '38px',
            borderRadius: '9px',
            border: 'none',
            background: activeTab === 'catalog' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeTab === 'catalog' ? '#ffffff' : '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <Layers size={14} /> Catalog ({rewards.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daily_offers')}
          style={{
            flex: 1,
            minHeight: '38px',
            borderRadius: '9px',
            border: 'none',
            background: activeTab === 'daily_offers' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeTab === 'daily_offers' ? '#ffffff' : '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <Calendar size={14} /> Daily Offers (7)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('redemptions')}
          style={{
            flex: 1,
            minHeight: '38px',
            borderRadius: '9px',
            border: 'none',
            background: activeTab === 'redemptions' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeTab === 'redemptions' ? '#ffffff' : '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <QrCode size={14} /> Vouchers
          {pendingVoucherCount > 0 && (
            <span
              style={{
                background: '#fbbf24',
                color: '#090d16',
                fontSize: '0.65rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: '999px',
              }}
            >
              {pendingVoucherCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'daily_offers' ? (
        <AdminDailyOffersStudio onStatusMessage={(msg) => setMessage(msg)} />
      ) : activeTab === 'redemptions' ? (
        /* VOUCHER VERIFICATION & REDEMPTION HISTORY DESK */
        <div>
          {/* Instant Voucher / QR Code Verification Box */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={17} color="#10b981" /> Verify & Fulfill Member Reward Pass
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '12px' }}>
              Enter a member's QR redemption token (e.g. <code style={{ color: '#34d399' }}>QR_REDEEM_8821A</code>) or click "Fulfill Now" below.
            </p>

            <form onSubmit={handleVerifyVoucher} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter QR_REDEEM_... or Promo Code"
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(9, 13, 22, 0.9)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#ffffff',
                  marginBottom: 0,
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: 'auto', padding: '0 16px', height: '48px', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                Fulfill Pass
              </button>
            </form>
          </div>

          {/* Filter Tabs for Redemptions */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {(['all', 'pending', 'fulfilled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setRedemptionFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: redemptionFilter === st ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  background: redemptionFilter === st ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                  color: redemptionFilter === st ? '#10b981' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {st} ({st === 'all' ? redemptions.length : st === 'pending' ? pendingVoucherCount : redemptions.length - pendingVoucherCount})
              </button>
            ))}
          </div>

          {/* Redemptions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredRedemptions.length === 0 ? (
              <div style={{ background: 'rgba(15, 23, 42, 0.85)', borderRadius: '16px', padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                No reward redemptions match this filter.
              </div>
            ) : (
              filteredRedemptions.map((red) => (
                <div
                  key={red.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: red.fulfilled ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(251, 191, 36, 0.35)',
                    borderLeft: red.fulfilled ? '4px solid #10b981' : '4px solid #fbbf24',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: red.fulfilled ? 'rgba(16, 185, 129, 0.16)' : 'rgba(251, 191, 36, 0.18)',
                            color: red.fulfilled ? '#10b981' : '#fbbf24',
                            textTransform: 'uppercase',
                          }}
                        >
                          {red.fulfilled ? '✓ Fulfilled' : '⏳ Awaiting Collection'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.12)',
                            padding: '2px 7px',
                            borderRadius: '6px',
                          }}
                        >
                          {red.qr_code_token || red.discount_code || 'PASS'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                        {red.reward_title}
                      </h4>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                        Claimed by <strong style={{ color: '#f8fafc' }}>{red.user_name || 'Alex Morgan'}</strong> ({red.user_member_id || 'PG-2445B5'}) &bull;{' '}
                        {new Date(red.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fbbf24', whiteSpace: 'nowrap' }}>
                      {red.points_cost} PTS
                    </span>
                  </div>

                  {!red.fulfilled && (
                    <button
                      type="button"
                      onClick={() => handleFulfillRedemptionRow(red)}
                      style={{
                        width: '100%',
                        minHeight: '38px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '9px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={15} /> Mark Fulfilled & Handed to Member
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* REWARD CATALOG STUDIO VIEW */
        <div>
          {/* 1-Click Quick-Launch Templates Strip */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '16px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Wand2 size={14} /> 1-Tap Quick-Create Templates
              </span>
              <span style={{ fontSize: '0.66rem', color: '#64748b' }}>Tap to pre-fill</span>
            </div>

            <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              {QUICK_REWARD_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyQuickTemplate(tpl)}
                  style={{
                    background: 'rgba(9, 13, 22, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '7px 11px',
                    color: '#f8fafc',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tpl.label}</span>
                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.68rem' }}>({tpl.points_cost} PTS)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search, Category Pills & Sort Controls */}
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search rewards by title, keyword or promo code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  paddingLeft: '40px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
                  marginBottom: 0,
                  minHeight: '44px',
                }}
              />
            </div>

            {/* Category Pills */}
            <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.73rem',
                    fontWeight: 800,
                    border: selectedCategory === cat ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: selectedCategory === cat ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                    color: selectedCategory === cat ? '#10b981' : '#94a3b8',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter + Sort Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['all', 'active', 'featured', 'inactive'] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setStatusScope(sc)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '7px',
                      border: 'none',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      background: statusScope === sc ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: statusScope === sc ? '#38bdf8' : '#94a3b8',
                    }}
                  >
                    {sc === 'featured' ? '⭐ Featured' : sc}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                <option value="popular">Sort: Most Redeemed</option>
                <option value="cost_asc">Sort: Lowest Points</option>
                <option value="cost_desc">Sort: Highest Points</option>
              </select>
            </div>
          </div>

          {/* Detailed Rewards Cards Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {loading ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                Loading rewards catalog...
              </div>
            ) : filteredRewards.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', background: 'rgba(15,23,42,0.8)', borderRadius: '16px' }}>
                No reward items match your current filter.
              </div>
            ) : (
              filteredRewards.map((r) => {
                const hasStock = typeof r.stock_limit === 'number' && r.stock_limit > 0;
                const claimed = r.redeemed_count || 0;
                const remainingStock = hasStock ? Math.max(0, (r.stock_limit || 0) - claimed) : null;

                return (
                  <div
                    key={r.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: r.featured
                        ? '1px solid rgba(251, 191, 36, 0.45)'
                        : '1px solid rgba(16, 185, 129, 0.22)',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      opacity: r.active ? 1 : 0.65,
                    }}
                  >
                    {/* Image Header */}
                    <div style={{ height: '148px', position: 'relative', overflow: 'hidden', background: '#0f172a' }}>
                      <img src={r.image_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(9,13,22,0.35) 0%, rgba(9,13,22,0.1) 50%, rgba(9,13,22,0.85) 100%)',
                        }}
                      />

                      {/* Top Left Badges: Featured + Tier Eligibility */}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {r.featured && (
                          <span
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: '#ffffff',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              fontSize: '0.64rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            }}
                          >
                            <Star size={11} fill="#ffffff" /> FEATURED
                          </span>
                        )}

                        <span
                          style={{
                            background: 'rgba(9, 13, 22, 0.85)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: r.min_tier === 'Gold' ? '#fbbf24' : r.min_tier === 'Platinum' ? '#34d399' : '#e2e8f0',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '0.64rem',
                            fontWeight: 800,
                          }}
                        >
                          {r.min_tier && r.min_tier !== 'All' ? `${r.min_tier}+ Tier` : 'All Tiers'}
                        </span>
                      </div>

                      {/* Top Right: Points Cost + Retail Value */}
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {r.retail_value && (
                          <span
                            style={{
                              background: 'rgba(15, 23, 42, 0.88)',
                              color: '#cbd5e1',
                              padding: '4px 9px',
                              borderRadius: '999px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}
                          >
                            Val: {r.retail_value}
                          </span>
                        )}
                        <div
                          style={{
                            background: 'rgba(9, 13, 22, 0.92)',
                            border: '1px solid rgba(16, 185, 129, 0.45)',
                            color: '#10b981',
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: 900,
                            fontSize: '0.82rem',
                          }}
                        >
                          {r.points_cost} PTS
                        </div>
                      </div>

                      {/* Bottom Overlay: Category, Status & Claim Count */}
                      <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '3px 8px', borderRadius: '6px', color: '#ffffff', fontSize: '0.66rem', fontWeight: 700 }}>
                            {r.category}
                          </span>
                          <span style={{ background: r.active ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.64rem', fontWeight: 800 }}>
                            {r.active ? 'LIVE' : 'PAUSED'}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(9,13,22,0.85)', padding: '3px 8px', borderRadius: '6px' }}>
                          🔥 {claimed} Claimed
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '15px' }}>
                      <h4 style={{ fontSize: '1.04rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px', lineHeight: 1.3 }}>
                        {r.title}
                      </h4>

                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45, marginBottom: '12px' }}>
                        {r.description}
                      </p>

                      {/* Redemption Method & Stock Progress Bar */}
                      <div
                        style={{
                          background: 'rgba(9, 13, 22, 0.65)',
                          padding: '10px 12px',
                          borderRadius: '11px',
                          marginBottom: '12px',
                          border: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.73rem', color: '#94a3b8', fontWeight: 600 }}>
                            Method:{' '}
                            <strong style={{ color: '#ffffff' }}>
                              {r.redemption_type === 'discount'
                                ? `Promo Code (${r.discount_code || 'PLAYGOLF20'})`
                                : 'QR Scanner Pass'}
                            </strong>
                          </span>

                          {/* Quick +/- Points Stepper */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, marginRight: '2px' }}>Quick Cost:</span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustCost(r, -25)}
                              style={{
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: '#cbd5e1',
                                borderRadius: '6px',
                                padding: '2px 7px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              -25
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustCost(r, 25)}
                              style={{
                                background: 'rgba(16, 185, 129, 0.14)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#34d399',
                                borderRadius: '6px',
                                padding: '2px 7px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              +25
                            </button>
                          </div>
                        </div>

                        {hasStock && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#cbd5e1', marginBottom: '4px', fontWeight: 700 }}>
                              <span>Inventory Quota</span>
                              <span style={{ color: (remainingStock || 0) <= 15 ? '#fbbf24' : '#34d399' }}>
                                {remainingStock} left of {r.stock_limit}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.round((claimed / (r.stock_limit || 1)) * 100))}%`,
                                  height: '100%',
                                  background: (remainingStock || 0) <= 15 ? '#fbbf24' : '#10b981',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto auto', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="btn-secondary"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                            padding: '8px 10px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            minHeight: '38px',
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        <button
                          onClick={() => toggleRewardActive(r)}
                          className="btn-secondary"
                          style={{
                            background: 'transparent',
                            color: r.active ? '#f87171' : '#10b981',
                            borderColor: r.active ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
                            padding: '8px 10px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            minHeight: '38px',
                          }}
                        >
                          {r.active ? <EyeOff size={13} /> : <Eye size={13} />} {r.active ? 'Pause' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(r)}
                          title="Toggle Featured Spotlight"
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            background: r.featured ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                            color: '#fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Star size={15} fill={r.featured ? '#fbbf24' : 'none'} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateReward(r)}
                          title="Duplicate Perk"
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Reward Modal with Live Member Preview & Curated Golf Image Presets */}
      {(showAddModal || editingReward) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setEditingReward(null);
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid rgba(16, 185, 129, 0.35)', maxWidth: '440px' }}
          >
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingReward(null);
              }}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.12rem', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '32px' }}>
              <Gift size={19} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editingReward ? `Edit: ${editingReward.title}` : 'Create Reward Perk'}
              </span>
            </h3>

            {/* Live Mini Card Preview */}
            <div
              style={{
                background: 'rgba(9, 13, 22, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '14px',
                padding: '10px',
                marginBottom: '14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <img
                src={imageUrl || CURATED_GOLF_IMAGES[0].url}
                alt="Preview"
                style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                    {category}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#fbbf24', fontWeight: 800 }}>• {pointsCost} PTS</span>
                  {retailValue && <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>({retailValue})</span>}
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {title || 'Reward Title Preview'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {description || 'Member catalog description preview...'}
                </div>
              </div>
            </div>

            <form onSubmit={editingReward ? handleUpdateReward : handleCreateReward}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>Reward Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Complimentary Bucket of 100 Range Balls"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Enjoy a free range session with 100 premium balls."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Points Cost</label>
                  <input
                    type="number"
                    className="form-input"
                    value={pointsCost}
                    onChange={(e) => setPointsCost(parseInt(e.target.value) || 0)}
                    required
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                  >
                    <option value="Driving Range">Driving Range</option>
                    <option value="Pro Shop">Pro Shop</option>
                    <option value="Coaching">Coaching</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Course & Games">Course & Games</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.72rem' }}>Min Tier</label>
                  <select
                    className="form-input"
                    value={minTier}
                    onChange={(e) => setMinTier(e.target.value as any)}
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '8px' }}
                  >
                    <option value="All">All Tiers</option>
                    <option value="Silver">Silver+</option>
                    <option value="Gold">Gold+</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.72rem' }}>Retail Value</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="£14.00"
                    value={retailValue}
                    onChange={(e) => setRetailValue(e.target.value)}
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '8px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px', fontSize: '0.72rem' }}>Stock Limit</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Unlimited"
                    value={stockLimit}
                    onChange={(e) => setStockLimit(e.target.value)}
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', padding: '8px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>Redemption Method</label>
                <select
                  className="form-input"
                  value={redemptionType}
                  onChange={(e) => setRedemptionType(e.target.value as any)}
                  style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                >
                  <option value="qr">QR Code Scanner Pass (Fulfilled at Desk)</option>
                  <option value="discount">Discount Promo Code (Instant Voucher)</option>
                </select>
              </div>

              {redemptionType === 'discount' && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Discount Promo Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PLAYGOLF20"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    required={redemptionType === 'discount'}
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff', fontFamily: 'monospace' }}
                  />
                </div>
              )}

              {/* Curated Golf Image Picker + Device Upload */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Reward Image (Pick Preset or Upload)</span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showUrlInput ? 'Use Presets / Upload' : 'Paste Image URL'}
                  </button>
                </label>

                {!showUrlInput ? (
                  <div>
                    <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '2px' }}>
                      {CURATED_GOLF_IMAGES.map((img) => (
                        <button
                          key={img.label}
                          type="button"
                          onClick={() => setImageUrl(img.url)}
                          style={{
                            border: imageUrl === img.url ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            background: imageUrl === img.url ? 'rgba(16,185,129,0.2)' : 'rgba(9,13,22,0.8)',
                            color: imageUrl === img.url ? '#10b981' : '#cbd5e1',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {img.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px dashed rgba(16, 185, 129, 0.4)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        color: '#10b981',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={14} />
                      {uploadingImage ? 'Loading...' : 'Upload Custom Photo from Device'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '10px 0 14px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                  />
                  Active in App
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', color: '#fbbf24', cursor: 'pointer', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#fbbf24' }}
                  />
                  ⭐ Featured Spotlight
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                {editingReward && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteReward(editingReward);
                      setEditingReward(null);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      borderRadius: '12px',
                      padding: '0 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete Reward"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingReward(null);
                  }}
                  className="btn-secondary"
                  style={{ flex: 1, background: 'transparent', color: '#94a3b8', borderColor: '#334155' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1.5, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {editingReward ? 'Save Changes' : 'Publish Perk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
