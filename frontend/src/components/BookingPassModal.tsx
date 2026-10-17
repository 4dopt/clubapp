import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Calendar, Clock, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import { BookingItem } from '../bookingsStore';

interface Props {
  booking: BookingItem;
  onClose: () => void;
}

export function BookingPassModal({ booking, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ textAlign: 'center', maxWidth: '420px', borderRadius: '24px', padding: '22px 18px' }}
      >
        <button
          onClick={onClose}
          aria-label="Close Pass"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'var(--bg-subtle)',
            border: 'none',
            color: 'var(--slate-dark)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--brand-green-subtle)',
            color: 'var(--brand-green)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 800,
            marginBottom: '10px',
          }}
        >
          <Ticket size={14} /> RECEPTION CHECK-IN PASS
        </div>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', padding: '0 24px' }}>
          {booking.activity_name}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--slate-grey)', marginBottom: '14px', fontWeight: 600 }}>
          Booking Ref: <span style={{ fontFamily: 'monospace', color: 'var(--brand-green)', fontWeight: 800 }}>{booking.booking_code}</span>
        </p>

        {/* QR Code Container */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '18px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            marginBottom: '16px',
          }}
        >
          <QRCodeSVG
            value={booking.booking_code}
            size={180}
            level="M"
            marginSize={1}
            bgColor="#ffffff"
            fgColor="#090d16"
          />
        </div>

        {/* Booking Details Card */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: '16px',
            padding: '14px 16px',
            textAlign: 'left',
            marginBottom: '14px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--slate-grey)', fontWeight: 600, flexShrink: 0 }}>Member</span>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {booking.user_name} ({booking.user_member_id})
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--slate-grey)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Date
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.date}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--slate-grey)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> Time Slot
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--brand-green)' }}>{booking.time}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--slate-grey)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} /> Venue
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>PlayGolf Reception</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: 'var(--brand-green)',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '4px',
          }}
        >
          <ShieldCheck size={15} /> Ready for Reception Desk Verification
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--slate-grey)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
          Show this pass to staff at reception upon arrival to check in and proceed to play.
        </p>

        <button onClick={onClose} className="btn-secondary" style={{ height: '44px', fontWeight: 700 }}>
          Close Pass
        </button>
      </div>
    </div>
  );
}
