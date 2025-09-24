// src/components/MemberProfileCard.tsx
import React from 'react';
import type { MemberProfile } from '../types/member';

type Props = {
  profile: MemberProfile;
  loading?: boolean;
  error?: string | null;
  onViewOffers?: () => void;
  onViewVouchers?: () => void;
};

const fmtNumber = (n?: number) =>
  typeof n === 'number' ? n.toLocaleString() : '—';

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

const initials = (first = '', last = '') =>
  `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}`;

export default function MemberProfileCard({
  profile,
  loading,
  error,
  onViewOffers,
  onViewVouchers,
}: Props) {
  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div style={{ ...styles.avatar, opacity: 0.5 }} />
          <div style={{ flex: 1 }}>
            <div style={styles.skelLine} />
            <div style={{ ...styles.skelLine, width: '40%' }} />
          </div>
        </div>
        <div style={{ ...styles.skelLine, width: '60%', marginTop: 16 }} />
        <div style={{ ...styles.skelLine, width: '80%', marginTop: 8 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={{ color: '#b00020', fontWeight: 600 }}>Error</div>
        <div style={{ marginTop: 4 }}>{error}</div>
      </div>
    );
  }

  const {
    firstName,
    lastName,
    tier,
    availablePoints,
    membershipNumber,
    memberSince,
    vouchersCount,
    offersCount,
    avatarUrl,
  } = profile;

  // New: tolerant reads for miles/MQDs/escrow (works even if your MemberProfile type
  // doesn't have them yet; you can add them later without changing this file)
  const miles = (profile as any)?.miles as number | undefined;
  const mqds =
    (profile as any)?.mqds ??
    (profile as any)?.mqd as number | undefined; // accept either key
  const escrowPoints = (profile as any)?.escrowPoints as number | undefined;

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={styles.avatarImg} />
        ) : (
          <div style={styles.avatar}>{initials(firstName, lastName)}</div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.nameRow}>
            <div style={styles.name}>
              {firstName} {lastName}
            </div>
            <span style={styles.tierBadge}>{tier.name}</span>
          </div>
          <div style={styles.metaRow}>
            {membershipNumber && (
              <span style={styles.metaItem}>
                Member # <strong>{membershipNumber}</strong>
              </span>
            )}
            {memberSince && (
              <span style={styles.metaItem}>
                Since <strong>{fmtDate(memberSince)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={styles.kpiRow}>
        {/* Available Points (unchanged) */}
        <div style={styles.kpi}>
          <div style={styles.kpiLabel}>Available Points</div>
          <div style={styles.kpiValue}>{fmtNumber(availablePoints)}</div>
        </div>

        {/* Miles and MQDs */}
        <div style={styles.kpi}>
          <div style={styles.kpiRowCompact}>
            <div>
              <div style={styles.kpiLabel}>Miles</div>
              <div style={styles.kpiValueSmall}>{fmtNumber(miles)}</div>
              {typeof escrowPoints === 'number' && escrowPoints > 0 && (
                <div style={styles.kpiSubtext}>
                  {fmtNumber(escrowPoints)} pending
                </div>
              )}
            </div>
            <div>
              <div style={styles.kpiLabel}>MQDs</div>
              <div style={styles.kpiValueSmall}>{fmtNumber(mqds)}</div>
            </div>
          </div>
        </div>

        {typeof vouchersCount === 'number' && (
          <div style={styles.kpi}>
            <div style={styles.kpiLabel}>Vouchers</div>
            <div style={styles.kpiValue}>{fmtNumber(vouchersCount)}</div>
          </div>
        )}
        {typeof offersCount === 'number' && (
          <div style={styles.kpi}>
            <div style={styles.kpiLabel}>Offers</div>
            <div style={styles.kpiValue}>{fmtNumber(offersCount)}</div>
          </div>
        )}
      </div>

      {/* Progress to next tier (if provided) */}
      {typeof tier.progressPercent === 'number' && tier.nextTierName && (
        <div style={{ marginTop: 16 }}>
          <div style={styles.progressHeader}>
            <span>Progress to {tier.nextTierName}</span>
            <span>{Math.round(tier.progressPercent)}%</span>
          </div>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.max(0, Math.min(100, tier.progressPercent))}%`,
              }}
            />
          </div>
        </div>
      )}

      {(onViewOffers || onViewVouchers) && (
        <div style={styles.ctaRow}>
          {onViewOffers && (
            <button style={styles.ctaBtn} onClick={onViewOffers}>
              View Offers
            </button>
          )}
          {onViewVouchers && (
            <button style={styles.ctaBtnOutline} onClick={onViewVouchers}>
              View Vouchers
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '1px solid #e6e8eb',
    borderRadius: 16,
    padding: 16,
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    maxWidth: 720,
  },
  headerRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#eef2f7',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    color: '#475569',
    flex: '0 0 auto',
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    objectFit: 'cover',
    flex: '0 0 auto',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  tierBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: 999,
    background:
      'linear-gradient(135deg, rgb(17,94,163) 0%, rgb(99,102,241) 100%)',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaRow: {
    marginTop: 4,
    display: 'flex',
    gap: 12,
    color: '#64748b',
    fontSize: 12,
    flexWrap: 'wrap',
  },
  metaItem: { whiteSpace: 'nowrap' },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginTop: 16,
  },
  kpi: {
    border: '1px dashed #e6e8eb',
    borderRadius: 12,
    padding: 12,
    background: '#fbfdff',
  },
  kpiLabel: { fontSize: 12, color: '#64748b' },
  kpiValue: { fontSize: 20, fontWeight: 800, marginTop: 2 },

  // New compact KPI row (two columns for Miles/MQDs)
  kpiRowCompact: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  // Triple column layout for Miles/MQDs/Escrow
  kpiRowTriple: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
  },
  kpiValueSmall: { fontSize: 18, fontWeight: 800, marginTop: 2 },
  kpiSubtext: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: 500 },

  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    background: '#eef2f7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background:
      'linear-gradient(90deg, rgb(16,185,129) 0%, rgb(59,130,246) 100%)',
  },
  ctaRow: {
    display: 'flex',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  ctaBtn: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: '#111827',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  ctaBtnOutline: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#111827',
    fontWeight: 600,
    cursor: 'pointer',
  },
  skelLine: {
    height: 12,
    background: 'linear-gradient(90deg,#eee,#f6f7f8,#eee)',
    borderRadius: 6,
  },
};

export {};
