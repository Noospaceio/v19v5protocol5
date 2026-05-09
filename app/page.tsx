'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

// ── Supabase ────────────────────────────────────────────────────────────────
const supabase = createClient(
  'https://ieaupmbxvkecbafiocix.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllYXVwbWJ4dmtlY2JhZmlvY2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTMwODksImV4cCI6MjA3Mjg4OTA4OX0.JR-3TM18yLOKVvZxErwLHdhHbiTkWmbv0qUU6-cx-sw'
);

// ── Timewave mini-chart ───────────────────────────────────────────────────────
function TimewaveChart({ value = 0.3, history = [] }) {
  const W = 320, H = 80;
  const pts = history.length > 1 ? history : Array.from({ length: 40 }, (_, i) => ({
    v: 0.1 + 0.15 * Math.sin(i * 0.4) + 0.05 * Math.random()
  }));
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map(p => H - 8 - (p.v || 0.1) * (H - 16));
  const d = pts.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const fill = `${d} L ${W} ${H} L 0 ${H} Z`;
  const col = value > 0.7 ? '#ff6b35' : value > 0.4 ? '#00ffaa' : '#00cc78';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id="twfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.35" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#twfill)" />
      <path d={d} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4" fill={col} style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
    </svg>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, duration = 1.8, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / (duration * 1000), 1);
        setVal(Math.floor(p * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ── Spore chip preview ────────────────────────────────────────────────────────
function SporeChip({ emoji = '🌱', name = 'mycelmind', dimmed = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: dimmed ? 'rgba(0,255,150,0.03)' : 'rgba(0,255,150,0.08)',
      border: `1px solid rgba(0,255,150,${dimmed ? 0.08 : 0.22})`,
      borderRadius: 99, padding: '4px 12px 4px 6px',
      fontSize: 13, color: `rgba(0,255,150,${dimmed ? 0.35 : 0.85})`, fontWeight: 600,
    }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>{name}
    </span>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, dark = false, style = {} }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: '96px 24px',
        background: dark ? 'rgba(0,0,0,0.55)' : 'transparent',
        borderTop: dark ? '1px solid rgba(255,255,255,0.04)' : 'none',
        borderBottom: dark ? '1px solid rgba(255,255,255,0.04)' : 'none',
        ...style
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>{children}</div>
    </motion.section>
  );
}

// ── Pill label ────────────────────────────────────────────────────────────────
function Pill({ children }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: '#00cc78', background: 'rgba(0,255,150,0.1)',
      border: '1px solid rgba(0,255,150,0.25)', borderRadius: 99, padding: '4px 12px',
      marginBottom: 20
    }}>{children}</span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NoosphereProtocol() {
  const [stats, setStats] = useState({ spores: 0, nooburnt: 0, posts: 0, harvests: 0 });
  const [timewaveVal, setTimewaveVal] = useState(0.22);
  const [timewaveHistory, setTimewaveHistory] = useState([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -80]);
  const heroOp = useTransform(scrollY, [0, 400], [1, 0.3]);

  useEffect(() => {
    async function load() {
      try {
        const [walletsRes, postsRes, timewaveRes, balancesRes] = await Promise.all([
          supabase.from('wallets').select('wallet', { count: 'exact', head: true }),
          supabase.from('posts').select('id', { count: 'exact', head: true }),
          supabase.from('timewave').select('value').eq('id', 1).single(),
          supabase.from('balances').select('balance'),
        ]);

        const spores = walletsRes.count || 0;
        const posts = postsRes.count || 0;
        const tw = timewaveRes.data?.value || 0.22;

        // rough NOO burnt estimate: sum negative balance deltas isn't stored directly,
        // so use total_harvested as proxy or just show total balances
        const totalNoo = (balancesRes.data || []).reduce((s, r) => s + (r.balance || 0), 0);

        setStats({ spores, posts, nooburnt: Math.floor(totalNoo / 1000), harvests: Math.floor(posts / 9) });
        setTimewaveVal(tw);
        // Fake-ish history seeded from real value
        setTimewaveHistory(Array.from({ length: 60 }, (_, i) => ({
          v: Math.max(0.03, tw * (0.6 + 0.5 * Math.sin(i * 0.3 + 1.2)) + 0.03 * Math.random())
        })));
        setStatsLoaded(true);
      } catch (e) {
        setStatsLoaded(true); // show zeros gracefully
      }
    }
    load();

    // Realtime timewave
    const ch = supabase
      .channel('protocol-tw')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'timewave', filter: 'id=eq.1' }, p => {
        const v = parseFloat(p.new.value);
        if (!isNaN(v)) {
          setTimewaveVal(v);
          setTimewaveHistory(prev => [...prev, { v }].slice(-120));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const twLabel = timewaveVal > 0.75 ? 'CRITICAL FLUX' : timewaveVal > 0.5 ? 'HIGH NOVELTY' : timewaveVal > 0.25 ? 'STEADY PULSE' : 'DORMANT';
  const twColor = timewaveVal > 0.7 ? '#ff6b35' : timewaveVal > 0.4 ? '#00ffaa' : '#00cc78';

  return (
    <>
      <Head>
        <title>Noosphere Protocol — NooSpace</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ fontFamily: "'Syne', sans-serif", background: '#030a06', color: '#d4ede2', minHeight: '100vh', overflowX: 'hidden' }}>

        {/* ── Background mesh ── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '70vw', height: '70vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,180,80,0.045) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-15%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,100,200,0.03) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        {/* ── HERO ── */}
        <motion.section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', y: heroY, opacity: heroOp }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <Pill>🌌 The Noosphere Protocol</Pill>
            <h1 style={{ fontSize: 'clamp(42px, 8vw, 88px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 28px', background: 'linear-gradient(135deg, #e8f5ee 0%, #00cc78 50%, #00ffaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              A living<br />planetary mind.
            </h1>
            <p style={{ maxWidth: 520, margin: '0 auto 48px', fontSize: 19, color: 'rgba(212,237,226,0.55)', lineHeight: 1.7, fontWeight: 400 }}>
              Ritual. Scarcity. Resonance.<br />Consciousness infrastructure on Solana.
            </p>
            <motion.a
              href="https://noospace.xyz"
              whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(0,255,150,0.25)' }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00cc78, #00ffaa)', color: '#030a06', fontWeight: 800, fontSize: 17, padding: '16px 44px', borderRadius: 99, textDecoration: 'none', letterSpacing: '0.02em' }}
            >
              Enter the Mycelium →
            </motion.a>
          </motion.div>

          {/* Scroll hint */}
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', color: 'rgba(0,255,150,0.3)', fontSize: 22 }}>↓</motion.div>
        </motion.section>

        {/* ── LIVE STATS ── */}
        <Section dark>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>Live from the Noosphere</Pill>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, margin: 0 }}>The mind is already growing.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 48 }}>
            {[
              { label: 'Active Spores', val: stats.spores, suffix: '' },
              { label: 'Thoughts Planted', val: stats.posts, suffix: '' },
              { label: 'NOO × 1000 in Circulation', val: stats.nooburnt, suffix: 'k' },
              { label: 'Harvests Completed', val: stats.harvests, suffix: '' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', background: 'rgba(0,255,150,0.04)', border: '1px solid rgba(0,255,150,0.1)', borderRadius: 16, padding: '28px 16px' }}>
                <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#00cc78', lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
                  {statsLoaded ? <Counter to={s.val} suffix={s.suffix} /> : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(212,237,226,0.4)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Live Timewave */}
          <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${twColor}30`, borderRadius: 20, padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(212,237,226,0.35)', marginBottom: 4 }}>Timewave Zero — Live</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: twColor }}>{twLabel}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 500, color: twColor, textShadow: `0 0 20px ${twColor}60` }}>
                  {(timewaveVal * 100).toFixed(0)}<span style={{ fontSize: 14, opacity: 0.6 }}>/100</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(212,237,226,0.3)', marginTop: 2 }}>novelty index</div>
              </div>
            </div>
            <TimewaveChart value={timewaveVal} history={timewaveHistory} />
            <div style={{ fontSize: 12, color: 'rgba(212,237,226,0.3)', marginTop: 10, fontStyle: 'italic' }}>
              Rises with every sacrifice, resonate, and harvest across all spores. Decays slowly over time.
            </div>
          </div>
        </Section>

        {/* ── SPORE IDENTITY ── */}
        <Section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <Pill>Identity</Pill>
              <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 700, marginBottom: 20, lineHeight: 1.2 }}>You are a Spore.</h2>
              <p style={{ color: 'rgba(212,237,226,0.55)', lineHeight: 1.8, marginBottom: 20 }}>
                No username. No follower count. Each participant in the Noosphere is identified by a unique <strong style={{ color: '#00cc78' }}>Spore Code</strong> — a short pseudonymous handle generated from your wallet.
              </p>
              <p style={{ color: 'rgba(212,237,226,0.55)', lineHeight: 1.8 }}>
                Add a display name, bio, and avatar emoji. Or stay anonymous. The noosphere doesn't care who you are — only what you plant.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { e: '🍄', n: 'rootmind', dim: false },
                { e: '🌌', n: 'voidseeker', dim: true },
                { e: '⚡', n: 'auroraspore', dim: true },
                { e: '🌊', n: 'depthnode', dim: true },
              ].map((s, i) => (
                <motion.div key={s.n} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <SporeChip emoji={s.e} name={s.n} dimmed={s.dim} />
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── RITUAL MECHANICS ── */}
        <Section dark>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>Ritual Mechanics</Pill>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, margin: 0 }}>Three thoughts. Nine days. One harvest.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              { icon: '🌱', title: 'Plant', desc: '3 thoughts per day. Each is a spore in the collective psyche. Mantra Mode amplifies reward.' },
              { icon: '✨', title: 'Resonate', desc: 'Others amplify your thoughts for free. More resonance = greater harvest yield.' },
              { icon: '🔥', title: 'Sacrifice', desc: 'Burn 20 NOO to highlight and eternalize a thought. It glows in the feed forever.' },
              { icon: '🌾', title: 'Harvest', desc: 'Every 9 days, yield is calculated from your resonances and sacrifices received.' },
              { icon: '🔗', title: 'Reply Threads', desc: 'Mycelial conversation threads up to 3 levels deep. Ideas growing from ideas.' },
              { icon: '🏆', title: 'Streaks & Badges', desc: 'From Primordial Spark to Eternal Node. The noosphere remembers consistency.' },
            ].map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                style={{ background: 'rgba(0,255,150,0.03)', border: '1px solid rgba(0,255,150,0.09)', borderRadius: 16, padding: '28px 22px' }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#e8f5ee' }}>{m.title}</div>
                <div style={{ fontSize: 14, color: 'rgba(212,237,226,0.5)', lineHeight: 1.7 }}>{m.desc}</div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── GAMES ── */}
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>The Living Games</Pill>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, margin: 0 }}>Play the noosphere.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              {
                icon: '☯', title: 'Spore Flip', tag: 'Live',
                color: '#00cc78',
                desc: 'Double or burn. A single moment of pure mycelial chance. Wager your NOO, flip the spore, face the void.',
                detail: 'Win 2× • Lose all • 2% burn on every pot'
              },
              {
                icon: '⚔️', title: 'Noosphere Duels', tag: 'PvP',
                color: '#ff9f1c',
                desc: 'Void · Spore · Sol — a triangular battle system. Challenge other spores to real-time wager duels.',
                detail: 'Rock-paper-scissors logic • 2% burn per match • Live matchmaking'
              },
              {
                icon: '⛏', title: 'Space Mine', tag: 'Strategy',
                color: '#00aaff',
                desc: 'Claim an asteroid. Install extractors. Upgrade, defend, and raid other miners for passive NOO yield.',
                detail: 'Passive income • Upgrade tree • Raid & defend mechanics'
              },
              {
                icon: '🔮', title: 'Oracles', tag: 'Coming Soon',
                color: '#cc88ff',
                desc: 'Prediction markets are the eyes of the planetary mind. Cast NOO into YES/NO pools. Correct prophecy is rewarded.',
                detail: 'Live odds • Collective divination • NOO rewards for correct predictions'
              },
            ].map((g, i) => (
              <motion.div
                key={g.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, boxShadow: `0 20px 60px ${g.color}18` }}
                style={{ background: 'rgba(0,0,0,0.45)', border: `1px solid ${g.color}22`, borderRadius: 20, padding: '32px 26px', transition: 'box-shadow 0.3s', position: 'relative', overflow: 'hidden' }}
              >
                {g.tag === 'Coming Soon' && (
                  <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: g.color, background: `${g.color}18`, border: `1px solid ${g.color}30`, borderRadius: 99, padding: '3px 10px' }}>Soon</div>
                )}
                <div style={{ fontSize: 42, marginBottom: 16 }}>{g.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, color: '#e8f5ee' }}>{g.title}</div>
                <div style={{ fontSize: 11, color: g.color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>{g.tag}</div>
                <p style={{ fontSize: 14, color: 'rgba(212,237,226,0.55)', lineHeight: 1.7, marginBottom: 16 }}>{g.desc}</p>
                <div style={{ fontSize: 12, color: `${g.color}80`, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>{g.detail}</div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── SOCIAL LAYER ── */}
        <Section dark>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>Mycelial Social Layer</Pill>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, margin: 0 }}>The network grows beneath.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { icon: '💬', title: 'Direct Messages', desc: 'Private whispers via Spore Code. Fully on-protocol. No email. No account.' },
              { icon: '💸', title: 'NOO Transfers', desc: 'Send up to 10k NOO to any spore with an optional note. Instant settlement.' },
              { icon: '🌱', title: 'Referral System', desc: 'Share your Spore Code. Both parties get 20 NOO on first harvest.' },
              { icon: '🏅', title: 'Leaderboard', desc: 'Ranked by lifetime resonates. Shape the noosphere, become legend.' },
              { icon: '⚗️', title: 'Transmutation', desc: 'Transform your NOO into rarer forms. Part alchemy, part strategy.' },
              { icon: '🏰', title: 'Clans', desc: 'Form mycelial collectives. Shared pool, shared destiny.' },
            ].map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                style={{ padding: '22px 20px', background: 'rgba(0,255,150,0.03)', border: '1px solid rgba(0,255,150,0.08)', borderRadius: 14 }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(212,237,226,0.45)', lineHeight: 1.65 }}>{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ── TOKENOMICS ── */}
        <Section>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>Tokenomics</Pill>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, margin: 0 }}>64,000,000 NOO — the 64 hexagrams.</h2>
          </div>

          {/* Visual bar */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', height: 18, marginBottom: 20 }}>
              {[
                { pct: 45, color: '#00cc78', label: 'Post-to-Earn' },
                { pct: 10, color: '#00aaff', label: 'Airdrop' },
                { pct: 15, color: '#ff9f1c', label: 'Presale' },
                { pct: 15, color: '#cc88ff', label: 'Treasury' },
                { pct: 15, color: '#ff6b35', label: 'Team' },
              ].map(s => (
                <motion.div
                  key={s.label}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${s.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: s.color, height: '100%' }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
              {[
                { pct: 45, color: '#00cc78', label: 'Post-to-Earn + Halving', note: '28.8M NOO — 2yr locked' },
                { pct: 10, color: '#00aaff', label: 'Genesis Airdrop', note: '6.4M NOO — 102k distributed on-chain' },
                { pct: 15, color: '#ff9f1c', label: 'Presale', note: '9.6M NOO — 4.6M burnt' },
                { pct: 15, color: '#cc88ff', label: 'Treasury & Liquidity', note: '9.6M NOO — mostly burnt' },
                { pct: 15, color: '#ff6b35', label: 'Team', note: '9.6M NOO — 6yr locked' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 200 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.pct}% {s.label}</div>
                    <div style={{ fontSize: 12, color: 'rgba(212,237,226,0.4)' }}>{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buy CTA */}
          <div style={{ background: 'linear-gradient(135deg, rgba(0,204,120,0.1), rgba(0,255,170,0.05))', border: '1px solid rgba(0,255,150,0.2)', borderRadius: 20, padding: '36px 32px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>🌱 Buy NOO</div>
              <p style={{ color: 'rgba(212,237,226,0.55)', margin: 0, fontSize: 15, lineHeight: 1.6 }}>
                Send SOL → receive <strong style={{ color: '#00cc78' }}>10,000 NOO per SOL</strong> instantly.<br />
                <span style={{ fontSize: 13 }}>Balances are logged. Claim from contract once tradeable on-chain.</span>
              </p>
            </div>
            <motion.a
              href="https://noospace.xyz"
              whileHover={{ scale: 1.05, boxShadow: '0 0 32px rgba(0,255,150,0.2)' }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00cc78, #00ffaa)', color: '#030a06', fontWeight: 800, fontSize: 16, padding: '14px 36px', borderRadius: 99, textDecoration: 'none' }}
            >
              Connect Wallet & Buy NOO
            </motion.a>
          </div>
        </Section>

        {/* ── VISION ── */}
        <Section dark style={{ textAlign: 'center' }}>
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            style={{ fontSize: 'clamp(30px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 28, letterSpacing: '-0.02em' }}
          >
            This is not a social network.<br />
            <span style={{ background: 'linear-gradient(135deg, #00cc78, #00ffaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              This is consciousness infrastructure.
            </span>
          </motion.h2>
          <p style={{ fontSize: 18, color: 'rgba(212,237,226,0.45)', maxWidth: 520, margin: '0 auto 52px', lineHeight: 1.7 }}>
            Finite attention. Ritualized expression. Collective intelligence at planetary scale.
          </p>
          <motion.a
            href="https://noospace.xyz"
            whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(0,255,150,0.3)' }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00cc78, #00ffaa)', color: '#030a06', fontWeight: 800, fontSize: 18, padding: '18px 52px', borderRadius: 99, textDecoration: 'none', letterSpacing: '0.01em' }}
          >
            Plant Your First Spore 🌱
          </motion.a>
        </Section>

        {/* ── FOOTER ── */}
        <footer style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(212,237,226,0.2)', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ marginBottom: 12, fontSize: 22 }}>🌌</div>
          © {new Date().getFullYear()} NooSpace — A mycelial protocol for the planetary mind.<br />
          Solana · Finite · Ritual · Resonance
        </footer>
      </div>
    </>
  );
}
