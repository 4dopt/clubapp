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
  Copy,
  Trash2,
  Star,
  CheckCircle2,
  QrCode,
  Layers,
  ShieldCheck,
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
    label: '🎯 VIP TrackMan Bay',
    title: '60-Min VIP TrackMan 4 Range Bay Pass',
    description: 'Reserved 1-hour VIP Driving Range bay session with full TrackMan 4 launch monitor & virtual courses.',
    points_cost: 550,
    category: 'Driving Range',
    redemption_type: 'qr',
    min_tier: 'Gold',
    retail_value: '£25.00',
    stock_limit: 25,
    image_url: 'https://images.unsplash.com/photo-1592919505780-303950717480?crop=entropy&cs=srgb&fm=jpg&q=80',
    terms: 'Valid any day at Northwick Park Driving Range. Book via reception desk.',
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
    label: 'TrackMan Radar',
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

  // Default to Vouchers Desk when staff open this page unless ?tab=daily or ?tab=catalog
  const [activeTab, setActiveTab] = useState<'redemptions' | 'catalog' | 'daily_offers'>(() =>
    location.search.includes('daily')
      ? 'daily_offers'
      : location.search.includes('catalog')
      ? 'catalog'
      : 'redemptions'
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
      setMessage(`✅ Added reward "${newReward.title}" to the shop!`);
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Could not create reward'}`);
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

      setMessage(`✅ Saved changes to "${title}"!`);
      setEditingReward(null);
      resetForm();
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Could not update reward'}`);
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
    setMessage(`📋 Copied "${reward.title}" for quick editing.`);
  };

  const handleDeleteReward = async (reward: Reward) => {
    if (!token) return;
    await adminApi.deleteReward(token, reward.id);
    setRewards((prev) => prev.filter((r) => r.id !== reward.id));
    setMessage(`🗑️ Removed "${reward.title}" from the shop.`);
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
    setMessage(nextFeatured ? `⭐ Highlighted "${reward.title}" as Featured!` : `Removed featured star from "${reward.title}".`);
  };

  const toggleRewardActive = async (reward: Reward) => {
    if (!token) return;
    try {
      const newStatus = !reward.active;
      await adminApi.updateReward(token, reward.id, { active: newStatus });
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, active: newStatus } : r))
      );
      setMessage(`${newStatus ? '✅ Turned On' : '⏸️ Paused'} "${reward.title}"`);
    } catch {
      setMessage('Could not change status');
    }
  };

  const handleVerifyVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !verifyCodeInput.trim()) return;
    try {
      const res = await adminApi.fulfillRewardQr(token, verifyCodeInput.trim());
      setMessage(
        `✅ Voucher Verified! Please hand "${res.redemption.reward_title}" to ${res.member.name} (${res.member.member_id}).`
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
      setMessage(`✅ Marked "${redemption.reward_title}" handed over to ${redemption.user_name || 'Member'}.`);
    } catch {
      setMessage('❌ Could not update voucher.');
    }
  };

  const categories = ['All', 'Driving Range', 'Pro Shop', 'Food & Beverage', 'Course & Games'];

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
  const pendingVoucherCount = redemptions.filter((r) => !r.fulfilled).length;

  return (
    <div className="admin-page-container" style={{ color: '#0f172a', flex: 1 }}>
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '9px 16px',
            borderRadius: '999px',
            fontSize: '0.84rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ArrowLeft size={16} /> Back to Reception Desk
        </button>
      </div>

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.2,
              marginBottom: '6px',
            }}
          >
            <Gift size={24} style={{ color: '#047857', flexShrink: 0 }} /> Vouchers & Rewards
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.45 }}>
            Check off member reward vouchers at the desk, or manage the club’s rewards shop and daily deals.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{
            width: 'auto',
            minHeight: '48px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #047857, #10b981)',
            boxShadow: '0 4px 14px rgba(4, 120, 87, 0.25)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={18} /> Add New Reward
        </button>
      </div>

      {message && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1.5px solid #6ee7b7',
            color: '#065f46',
            padding: '14px 16px',
            borderRadius: '14px',
            fontSize: '0.9rem',
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
            style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode Switcher: Vouchers Desk (Default) vs Rewards Catalog vs Daily Offers */}
      <div
        style={{
          display: 'flex',
          background: '#e2e8f0',
          padding: '5px',
          borderRadius: '16px',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('redemptions')}
          style={{
            flex: 1,
            minHeight: '46px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'redemptions' ? '#047857' : 'transparent',
            color: activeTab === 'redemptions' ? '#ffffff' : '#334155',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            boxShadow: activeTab === 'redemptions' ? '0 4px 10px rgba(4, 120, 87, 0.22)' : 'none',
          }}
        >
          <QrCode size={17} />
          <span>1. Vouchers to Hand Out</span>
          {pendingVoucherCount > 0 && (
            <span
              style={{
                background: '#fbbf24',
                color: '#0f172a',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {pendingVoucherCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            flex: 1,
            minHeight: '46px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'catalog' ? '#047857' : 'transparent',
            color: activeTab === 'catalog' ? '#ffffff' : '#334155',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            boxShadow: activeTab === 'catalog' ? '0 4px 10px rgba(4, 120, 87, 0.22)' : 'none',
          }}
        >
          <Layers size={17} />
          <span>2. Rewards Shop ({activeCount} Active)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daily_offers')}
          style={{
            flex: 1,
            minHeight: '46px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'daily_offers' ? '#047857' : 'transparent',
            color: activeTab === 'daily_offers' ? '#ffffff' : '#334155',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            boxShadow: activeTab === 'daily_offers' ? '0 4px 10px rgba(4, 120, 87, 0.22)' : 'none',
          }}
        >
          <Calendar size={17} />
          <span>3. Daily Deals (Mon–Sun)</span>
        </button>
      </div>

      {activeTab === 'daily_offers' ? (
        <AdminDailyOffersStudio onStatusMessage={(msg) => setMessage(msg)} />
      ) : activeTab === 'redemptions' ? (
        /* VOUCHER VERIFICATION & REDEMPTION HISTORY DESK (CLEAN LIGHT MODE) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Instant Voucher / QR Code Verification Box */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '18px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#047857" /> Check Off a Member’s Voucher Code
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '14px' }}>
              Type the voucher code from the member’s phone screen, or tap <strong>"Mark Handed Out"</strong> on any waiting voucher below.
            </p>

            <form onSubmit={handleVerifyVoucher} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type Voucher Code (e.g. PLAYGOLF20)..."
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value)}
                style={{
                  flex: '1 1 200px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  marginBottom: 0,
                  fontWeight: 700,
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: 'auto', padding: '0 22px', minHeight: '48px', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #047857, #10b981)' }}
              >
                Verify Voucher
              </button>
            </form>
          </div>

          {/* Filter Tabs for Redemptions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(
              [
                { id: 'all', label: `All Vouchers (${redemptions.length})` },
                { id: 'pending', label: `Waiting for Pickup (${pendingVoucherCount})` },
                { id: 'fulfilled', label: `Already Handed Out (${redemptions.length - pendingVoucherCount})` },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setRedemptionFilter(st.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '999px',
                  border: redemptionFilter === st.id ? '1.5px solid #047857' : '1px solid #cbd5e1',
                  background: redemptionFilter === st.id ? '#ecfdf5' : '#ffffff',
                  color: redemptionFilter === st.id ? '#047857' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Redemptions List */}
          <div className="admin-cards-grid">
            {filteredRedemptions.length === 0 ? (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '36px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.92rem' }}>
                No reward vouchers match this filter.
              </div>
            ) : (
              filteredRedemptions.map((red) => (
                <div
                  key={red.id}
                  style={{
                    background: '#ffffff',
                    border: red.fulfilled ? '1px solid #e2e8f0' : '2px solid #f59e0b',
                    borderLeft: red.fulfilled ? '5px solid #10b981' : '5px solid #f59e0b',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            background: red.fulfilled ? '#d1fae5' : '#fef3c7',
                            color: red.fulfilled ? '#065f46' : '#b45309',
                            textTransform: 'uppercase',
                          }}
                        >
                          {red.fulfilled ? '✓ Handed Out' : '⏳ Waiting for Pickup'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: '#0369a1',
                            background: '#e0f2fe',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          Code: {red.qr_code_token || red.discount_code || 'PASS'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {red.reward_title}
                      </h4>
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                        Member: <strong style={{ color: '#0f172a' }}>{red.user_name || 'Alex Morgan'}</strong> ({red.user_member_id || 'PG-2445B5'}) •{' '}
                        {new Date(red.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#047857', whiteSpace: 'nowrap' }}>
                      {red.points_cost} PTS
                    </span>
                  </div>

                  {!red.fulfilled && (
                    <button
                      type="button"
                      onClick={() => handleFulfillRedemptionRow(red)}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        background: 'linear-gradient(135deg, #047857, #10b981)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(4, 120, 87, 0.2)',
                      }}
                    >
                      <CheckCircle2 size={17} /> Mark Handed Out to Member
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* REWARD CATALOG STUDIO VIEW (CLEAN LIGHT MODE) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1-Click Quick-Launch Templates Strip */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '16px',
              padding: '14px 16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Wand2 size={15} /> Quick-Add Popular Rewards (Tap to pre-fill)
              </span>
            </div>

            <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              {QUICK_REWARD_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyQuickTemplate(tpl)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tpl.label}</span>
                  <span style={{ color: '#047857', fontWeight: 800, fontSize: '0.74rem' }}>({tpl.points_cost} PTS)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search, Category Pills & Sort Controls */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search rewards by title or category..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  paddingLeft: '42px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  marginBottom: 0,
                  minHeight: '46px',
                  fontWeight: 600,
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
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    border: selectedCategory === cat ? '1.5px solid #047857' : '1px solid #cbd5e1',
                    background: selectedCategory === cat ? '#ecfdf5' : '#f8fafc',
                    color: selectedCategory === cat ? '#047857' : '#475569',
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
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'active', 'featured', 'inactive'] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setStatusScope(sc)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: statusScope === sc ? '1px solid #0369a1' : '1px solid #e2e8f0',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      background: statusScope === sc ? '#e0f2fe' : '#f8fafc',
                      color: statusScope === sc ? '#0369a1' : '#64748b',
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
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                }}
              >
                <option value="popular">Sort: Most Claimed</option>
                <option value="cost_asc">Sort: Lowest Points</option>
                <option value="cost_desc">Sort: Highest Points</option>
              </select>
            </div>
          </div>

          {/* Detailed Rewards Cards Grid */}
          <div className="admin-cards-grid">
            {loading ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.92rem' }}>
                Loading rewards catalog...
              </div>
            ) : filteredRewards.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.92rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
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
                      background: '#ffffff',
                      border: r.featured ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      opacity: r.active ? 1 : 0.65,
                    }}
                  >
                    {/* Image Header */}
                    <div style={{ height: '148px', position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
                      <img src={r.image_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.05) 50%, rgba(15,23,42,0.75) 100%)',
                        }}
                      />

                      {/* Top Left Badges: Featured + Tier Eligibility */}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {r.featured && (
                          <span
                            style={{
                              background: '#d97706',
                              color: '#ffffff',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Star size={11} fill="#ffffff" /> FEATURED
                          </span>
                        )}

                        <span
                          style={{
                            background: 'rgba(255, 255, 255, 0.92)',
                            color: '#0f172a',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                          }}
                        >
                          {r.min_tier && r.min_tier !== 'All' ? `${r.min_tier}+ Tier` : 'All Members'}
                        </span>
                      </div>

                      {/* Top Right: Points Cost */}
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div
                          style={{
                            background: '#047857',
                            color: '#ffffff',
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: 900,
                            fontSize: '0.84rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          }}
                        >
                          {r.points_cost} PTS
                        </div>
                      </div>

                      {/* Bottom Overlay: Category, Status & Claim Count */}
                      <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(255, 255, 255, 0.92)', padding: '3px 8px', borderRadius: '6px', color: '#0f172a', fontSize: '0.68rem', fontWeight: 800 }}>
                            {r.category}
                          </span>
                          <span style={{ background: r.active ? '#10b981' : '#ef4444', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.66rem', fontWeight: 800 }}>
                            {r.active ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff', background: 'rgba(15,23,42,0.8)', padding: '3px 8px', borderRadius: '6px' }}>
                          {claimed} Claimed
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '16px' }}>
                      <h4 style={{ fontSize: '1.06rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>
                        {r.title}
                      </h4>

                      <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, marginBottom: '12px' }}>
                        {r.description}
                      </p>

                      {/* Quick Points Cost Adjuster */}
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          marginBottom: '12px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 700 }}>
                          {hasStock ? `${remainingStock} left in stock` : 'Unlimited Stock'}
                        </span>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginRight: '2px' }}>Points:</span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustCost(r, -25)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
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
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#047857',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            +25
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto auto', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="btn-secondary"
                          style={{
                            background: '#ecfdf5',
                            color: '#047857',
                            borderColor: '#a7f3d0',
                            padding: '8px 10px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            minHeight: '40px',
                          }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>

                        <button
                          onClick={() => toggleRewardActive(r)}
                          className="btn-secondary"
                          style={{
                            background: '#ffffff',
                            color: r.active ? '#dc2626' : '#047857',
                            borderColor: r.active ? '#fecaca' : '#a7f3d0',
                            padding: '8px 10px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            minHeight: '40px',
                          }}
                        >
                          {r.active ? <EyeOff size={14} /> : <Eye size={14} />} {r.active ? 'Pause' : 'Turn On'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(r)}
                          title="Highlight as Featured"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            border: '1px solid #fde68a',
                            background: r.featured ? '#fef3c7' : '#ffffff',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Star size={16} fill={r.featured ? '#d97706' : 'none'} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateReward(r)}
                          title="Copy Reward"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Copy size={15} />
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

      {/* Add / Edit Reward Modal (Clean Light Mode) */}
      {(showAddModal || editingReward) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setEditingReward(null);
          }}
        >
          <div
            className="modal-content admin-modal-dialog-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
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
                background: '#f1f5f9',
                border: 'none',
                color: '#334155',
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

            <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '32px' }}>
              <Gift size={20} color="#047857" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editingReward ? `Edit Reward: ${editingReward.title}` : 'Add New Reward to Shop'}
              </span>
            </h3>

            {/* Live Mini Card Preview */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <img
                src={imageUrl || CURATED_GOLF_IMAGES[0].url}
                alt="Preview"
                style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                    {category}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 800 }}>• {pointsCost} PTS</span>
                  {retailValue && <span style={{ fontSize: '0.68rem', color: '#64748b' }}>(Worth {retailValue})</span>}
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {title || 'Reward Title Preview'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {description || 'Short description shown to members...'}
                </div>
              </div>
            </div>

            <form onSubmit={editingReward ? handleUpdateReward : handleCreateReward}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Reward Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Complimentary Bucket of 100 Range Balls"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Short Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Enjoy a free range session with 100 premium balls."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Points Cost</label>
                  <input
                    type="number"
                    className="form-input"
                    value={pointsCost}
                    onChange={(e) => setPointsCost(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Driving Range">Driving Range</option>
                    <option value="Pro Shop">Pro Shop</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Course & Games">Course & Games</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Who Can Claim?</label>
                  <select
                    className="form-input"
                    value={minTier}
                    onChange={(e) => setMinTier(e.target.value as any)}
                  >
                    <option value="All">All Members</option>
                    <option value="Silver">Silver & Above</option>
                    <option value="Gold">Gold & Above</option>
                    <option value="Platinum">Platinum Only</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Usual Price (£)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="£14.00"
                    value={retailValue}
                    onChange={(e) => setRetailValue(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '4px' }}>Stock Limit (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Unlimited"
                    value={stockLimit}
                    onChange={(e) => setStockLimit(e.target.value)}
                  />
                </div>
              </div>

              {/* Curated Golf Image Picker + Device Upload */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>Choose a Photo</span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    style={{ background: 'none', border: 'none', color: '#047857', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showUrlInput ? 'Choose from Presets' : 'Paste Image Link'}
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
                            border: imageUrl === img.url ? '2px solid #047857' : '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            background: imageUrl === img.url ? '#ecfdf5' : '#f8fafc',
                            color: imageUrl === img.url ? '#047857' : '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 800,
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
                        padding: '11px',
                        borderRadius: '10px',
                        border: '1.5px dashed #10b981',
                        background: '#ecfdf5',
                        color: '#047857',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={15} />
                      {uploadingImage ? 'Loading Photo...' : 'Upload Photo from Computer / Phone'}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '10px 0 14px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', color: '#0f172a', cursor: 'pointer', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#047857' }}
                  />
                  Show in Member App
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', color: '#b45309', cursor: 'pointer', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#d97706' }}
                  />
                  ⭐ Highlight as Featured
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                {editingReward && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteReward(editingReward);
                      setEditingReward(null);
                    }}
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '12px',
                      padding: '0 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete Reward"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingReward(null);
                  }}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>
                  {editingReward ? 'Save Changes' : 'Add Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
