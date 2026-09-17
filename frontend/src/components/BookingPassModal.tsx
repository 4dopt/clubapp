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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '420px', borderRadius: '24px', padding: '24px' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--bg-subtle)',
            border: 'none',
            color: 'var(--slate-dark)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--brand-green-subtle)', color: 'var(--brand-green)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '14px' }}>
          <Ticket size={14} /> RECEPTION CHECK-IN PASS
        </div>

        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {booking.activity_name}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate-grey)', marginBottom: '16px', fontWeight: 600 }}>
          Booking Ref: <span style={{ fontFamily: 'monospace', color: 'var(--brand-green)', fontWeight: 800 }}>{booking.booking_code}</span>
        </p>

        {/* QR Code Container */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '20px', display: 'inline-block', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', marginBottom: '18px' }}>
          <QRCodeSVG 
            value={booking.booking_code} 
            size={200} 
            level="M"
            marginSize={1}
            bgColor="#ffffff"
            fgColor="#090d16"
          />
        </div>

        {/* Booking Details Card */}
        <div style={{ background: 'var(--bg-subtle)', borderRadius: '16px', padding: '16px', textAlign: 'left', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-grey)', fontWeight: 600 }}>Member Name</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{booking.user_name} ({booking.user_member_id})</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-grey)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Date
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.date}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-grey)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> Time Slot
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--brand-green)' }}>{booking.time}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-grey)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} /> Venue
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>PlayGolf Reception</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--brand-green)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
          <ShieldCheck size={16} /> Ready for Reception Desk Verification
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--slate-grey)', margin: 0 }}>
          Show this pass to staff at reception upon arrival to check in and proceed to play.
        </p>
      </div>
    </div>
  );
}
