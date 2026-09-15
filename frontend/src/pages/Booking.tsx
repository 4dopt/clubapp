import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Target, 
  Flag, 
  Sparkles, 
  CircleDot, 
  Award,
  Clock
} from 'lucide-react';

interface ActivityOption {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  bgGradient: string;
}

export function Booking() {
  const options: ActivityOption[] = [
    {
      id: 'driving-range',
      name: 'Driving Range',
      subtitle: 'TopTracer & Trackman Simulator Bays',
      icon: <Target size={24} />,
      accentColor: '#047857',
      bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    },
    {
      id: 'nine-holes',
      name: '9 Holes Course',
      subtitle: 'Championship Executive Golf Round',
      icon: <Flag size={24} />,
      accentColor: '#0284c7',
      bgGradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    },
    {
      id: 'putt-crazy',
      name: 'Putt Crazy Adventure Minigolf',
      subtitle: '18-Hole Neon Adventure Crazy Golf',
      icon: <Sparkles size={24} />,
      accentColor: '#d97706',
      bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    },
    {
      id: 'darts-interactive',
      name: 'Darts Interactive',
      subtitle: 'Smart AR Digital Target Darts',
      icon: <CircleDot size={24} />,
      accentColor: '#7c3aed',
      bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    },
  ];

  const [selectedId, setSelectedId] = useState<string>('driving-range');
  const activeOption = options.find((o) => o.id === selectedId) || options[0];

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('14:00');
  const [booked, setBooked] = useState<boolean>(false);
  const [bookingCode, setBookingCode] = useState<string>('');

  const timeSlots = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'];

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const randomCode = 'PG-' + Math.floor(100000 + Math.random() * 900000);
    setBookingCode(randomCode);
    setBooked(true);
  };

  return (
    <div style={{ padding: '20px 16px 40px 16px', maxWidth: '540px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon style={{ color: 'var(--brand-green)' }} size={24} /> Select Booking Option
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Choose one of our 4 activities to reserve your slot
        </p>
      </div>

      {booked ? (
        /* Confirmation Screen */
        <div 
          style={{ 
            background: '#ffffff', 
            border: '1px solid var(--border-color)', 
            borderRadius: '20px', 
            padding: '28px 20px', 
            textAlign: 'center', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)' 
          }}
        >
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', 
              color: '#047857', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.2)'
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {activeOption.name} Booked!
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-grey)', marginBottom: '16px', fontWeight: 600 }}>
            Booking Pass: <span style={{ fontFamily: 'monospace', color: 'var(--brand-green)', fontWeight: 800 }}>{bookingCode}</span>
          </div>

          <div 
            style={{ 
              background: activeOption.bgGradient, 
              border: `1px solid ${activeOption.accentColor}33`, 
              borderRadius: '16px', 
              padding: '18px', 
              textAlign: 'left',
              marginBottom: '20px' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: activeOption.accentColor }}>{activeOption.icon}</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activeOption.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {selectedDate} at {selectedTime}
                </div>
              </div>
            </div>
          </div>

          <div 
            style={{ 
              background: '#ecfdf5', 
              border: '1px solid #a7f3d0', 
              padding: '12px', 
              borderRadius: '12px', 
              color: '#047857', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '20px' 
            }}
          >
            <Award size={16} /> +100 Loyalty Points earned on check-in!
          </div>

          <button 
            onClick={() => setBooked(false)} 
            className="btn-primary"
            style={{ height: '48px', fontSize: '0.95rem' }}
          >
            Make Another Booking
          </button>
        </div>
      ) : (
        <form onSubmit={handleBookSubmit}>
          {/* THE 4 OPTIONS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
            {options.map((opt) => {
              const isSelected = opt.id === selectedId;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedId(opt.id)}
                  style={{
                    background: isSelected ? opt.bgGradient : '#ffffff',
                    border: isSelected ? `2px solid ${opt.accentColor}` : '1px solid var(--border-color)',
                    borderRadius: '18px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? `0 8px 24px -4px ${opt.accentColor}35` : '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div 
                    style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '14px', 
                      background: isSelected ? '#ffffff' : 'var(--bg-subtle)', 
                      color: opt.accentColor, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '12px',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {opt.icon}
                  </div>

                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.25' }}>
                    {opt.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
                    {opt.subtitle}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Booking Details Box */}
          <div 
            style={{ 
              background: '#ffffff', 
              border: '1px solid var(--border-color)', 
              borderRadius: '20px', 
              padding: '20px', 
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)' 
            }}
          >
            <div className="form-group">
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>

            {/* Time Slot Selector */}
            <div className="form-group">
              <label className="form-label">Select Time Slot</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {timeSlots.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: selectedTime === t ? `2px solid ${activeOption.accentColor}` : '1px solid var(--border-color)',
                      background: selectedTime === t ? `${activeOption.accentColor}15` : '#ffffff',
                      color: selectedTime === t ? activeOption.accentColor : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ 
                marginTop: '16px', 
                height: '50px',
                background: `linear-gradient(135deg, ${activeOption.accentColor}, ${activeOption.accentColor}dd)`,
                borderRadius: '14px',
                fontSize: '0.98rem',
                fontWeight: 800
              }}
            >
              Book {activeOption.name}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
