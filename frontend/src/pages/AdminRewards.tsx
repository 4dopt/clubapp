import React, { useEffect, useState } from 'react';
import { Gift, Plus, Edit2, Search, CheckCircle, Tag, Eye, EyeOff, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../auth';
import { adminApi, Reward } from '../api';

export function AdminRewards() {
  const { token } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [message, setMessage] = useState('');

  // Add / Edit Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(200);
  const [category, setCategory] = useState('Driving Range');
  const [redemptionType, setRedemptionType] = useState<'qr' | 'discount'>('qr');
  const [discountCode, setDiscountCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (token) {
      adminApi.listRewards(token)
        .then(setRewards)
        .catch(() => setRewards([]))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPointsCost(200);
    setCategory('Driving Range');
    setRedemptionType('qr');
    setDiscountCode('');
    setImageUrl('https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80');
    setActive(true);
    setEditingReward(null);
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
    setImageUrl(reward.image_url || 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80');
    setActive(reward.active);
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const newReward = await adminApi.createReward(token, {
        title,
        description,
        points_cost: pointsCost,
        category,
        image_url: imageUrl || 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?crop=entropy&cs=srgb&fm=jpg&q=80',
        active,
        redemption_type: redemptionType,
        discount_code: redemptionType === 'discount' ? discountCode : undefined,
      });

      setRewards((prev) => [...prev, newReward]);
      setMessage('✅ Reward created successfully!');
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
      const updated = await adminApi.updateReward(token, editingReward.id, {
        title,
        description,
        points_cost: pointsCost,
        category,
        image_url: imageUrl,
        active,
        redemption_type: redemptionType,
        discount_code: redemptionType === 'discount' ? discountCode : undefined,
      });

      setRewards((prev) =>
        prev.map((r) => (r.id === editingReward.id ? { ...r, title, description, points_cost: pointsCost, category, image_url: imageUrl, active, redemption_type: redemptionType, discount_code: discountCode } : r))
      );

      setMessage(`✅ Updated reward "${title}"!`);
      setEditingReward(null);
      resetForm();
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Failed to update reward'}`);
    }
  };

  const toggleRewardActive = async (reward: Reward) => {
    if (!token) return;
    try {
      const newStatus = !reward.active;
      await adminApi.updateReward(token, reward.id, { active: newStatus });
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, active: newStatus } : r))
      );
      setMessage(`Status updated for ${reward.title}`);
    } catch (err: any) {
      setMessage('Failed to toggle status');
    }
  };

  const categories = ['All', 'Driving Range', 'Pro Shop', 'Coaching', 'Food & Beverage'];

  const filteredRewards = rewards.filter((r) => {
    const matchesQuery = r.title.toLowerCase().includes(query.toLowerCase()) || r.description.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const activeCount = rewards.filter((r) => r.active).length;
  const avgCost = rewards.length > 0 ? Math.round(rewards.reduce((acc, r) => acc + r.points_cost, 0) / rewards.length) : 0;

  return (
    <div style={{ background: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '20px 20px 40px 20px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift style={{ color: '#10b981' }} /> Reward Catalog Management
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Configure rewards, points costs, discount codes & edit live perks
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 16px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
        >
          <Plus size={16} /> New Reward
        </button>
      </div>

      {message && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '20px', fontWeight: 700 }}>
          {message}
        </div>
      )}

      {/* Analytics Summary Bar (Green Shades Only) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Items</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{rewards.length}</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Active Perks</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>{activeCount}</div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Avg Points Cost</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6ee7b7', marginTop: '2px' }}>{avgCost} PTS</div>
        </div>
      </div>

      {/* Category Filter & Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search rewards by title or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: '40px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: selectedCategory === cat ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedCategory === cat ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: selectedCategory === cat ? '#10b981' : '#94a3b8',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Rewards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading rewards catalog...</div>
        ) : filteredRewards.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>No reward items match your filter.</div>
        ) : (
          filteredRewards.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                opacity: r.active ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Image Banner */}
                <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                  <img src={r.image_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Points Badge */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(9, 13, 22, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.85rem' }}>
                    {r.points_cost} PTS
                  </div>

                  {/* Status & Category Badge */}
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                    <span style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '3px 8px', borderRadius: '4px', color: '#ffffff', fontSize: '0.7rem', fontWeight: 600 }}>
                      {r.category}
                    </span>
                    <span style={{ background: r.active ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {r.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                      {r.title}
                    </h4>
                  </div>

                  <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.45, marginBottom: '14px' }}>
                    {r.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(9, 13, 22, 0.6)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                      Redemption Method: <strong style={{ color: '#ffffff' }}>{r.redemption_type === 'discount' ? `Discount Code (${r.discount_code || 'PLAYGOLF20'})` : 'QR Code Scanner Pass'}</strong>
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="btn-secondary"
                      style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', padding: '10px', fontSize: '0.8rem', fontWeight: 800 }}
                    >
                      <Edit2 size={15} /> Edit Item
                    </button>

                    <button
                      onClick={() => toggleRewardActive(r)}
                      className="btn-secondary"
                      style={{ background: 'transparent', color: r.active ? '#f87171' : '#10b981', borderColor: r.active ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)', padding: '10px', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      {r.active ? <EyeOff size={15} /> : <Eye size={15} />} {r.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Reward Modal */}
      {(showAddModal || editingReward) && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditingReward(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', color: '#fff', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={20} color="#10b981" /> {editingReward ? `Edit Reward: ${editingReward.title}` : 'Add New Reward Item'}
            </h3>

            <form onSubmit={editingReward ? handleUpdateReward : handleCreateReward}>
              <div className="form-group">
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

              <div className="form-group">
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Points Cost</label>
                  <input
                    type="number"
                    className="form-input"
                    value={pointsCost}
                    onChange={(e) => setPointsCost(parseInt(e.target.value) || 0)}
                    required
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Category</label>
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
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1' }}>Redemption Method</label>
                <select
                  className="form-input"
                  value={redemptionType}
                  onChange={(e) => setRedemptionType(e.target.value as any)}
                  style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                >
                  <option value="qr">QR Code Scanner Pass</option>
                  <option value="discount">Discount Promo Code</option>
                </select>
              </div>

              {redemptionType === 'discount' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Discount Promo Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PLAYGOLF20"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    required={redemptionType === 'discount'}
                    style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1' }}>Image URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={{ background: 'rgba(9, 13, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <label htmlFor="activeToggle" style={{ fontSize: '0.85rem', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>
                  Active Reward in Member Catalog
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingReward(null); }}
                  className="btn-secondary"
                  style={{ background: 'transparent', color: '#94a3b8', borderColor: '#334155' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {editingReward ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
