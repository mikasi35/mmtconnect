'use client';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  return (
    <div style={{
      minHeight:'100vh', background:'linear-gradient(135deg,#1A56CC 0%,#0F3D8A 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px', fontFamily:"'DM Sans',system-ui,sans-serif",
    }}>
      <div style={{ width:'100%', maxWidth:520, textAlign:'center' }}>
        <div style={{ marginBottom:40 }}>
          <div style={{ width:64,height:64,borderRadius:16,background:'rgba(255,255,255,0.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800,color:'#fff',marginBottom:14 }}>M</div>
          <h1 style={{ fontSize:26,fontWeight:800,color:'#fff',margin:'0 0 6px' }}>MMT Care Connect</h1>
          <p style={{ fontSize:15,color:'rgba(255,255,255,0.65)',margin:0 }}>NDIS Accommodation Platform</p>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <button onClick={() => router.push('/find')} style={{ background:'#fff',border:'none',borderRadius:16,padding:'22px 24px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:16,boxShadow:'0 4px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ width:52,height:52,borderRadius:12,background:'#EBF2FF',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800 }}><span style={{ lineHeight: 1 }}>H</span></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16,fontWeight:700,color:'#111827',marginBottom:4 }}>I am looking for accommodation</div>
              <div style={{ fontSize:13,color:'#6B7280',lineHeight:1.5 }}>For myself, a family member or someone I care for. Search real-time vacancies and submit a referral — no account needed.</div>
            </div>
            <div style={{ fontSize:20,color:'#9CA3AF',flexShrink:0 }}>→</div>
          </button>
          <button onClick={() => router.push('/login')} style={{ background:'rgba(255,255,255,0.12)',border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:16,padding:'22px 24px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:16 }}>
            <div style={{ width:52,height:52,borderRadius:12,background:'rgba(255,255,255,0.2)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800 }}><span style={{ lineHeight: 1 }}>C</span></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16,fontWeight:700,color:'#fff',marginBottom:4 }}>I am a coordinator or provider</div>
              <div style={{ fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:1.5 }}>Sign in to manage referrals, facilities, and placements via the coordinator dashboard.</div>
            </div>
            <div style={{ fontSize:20,color:'rgba(255,255,255,0.5)',flexShrink:0 }}>→</div>
          </button>
        </div>
        <p style={{ fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:32 }}>MMT Care Connect · NDIS Registered Coordination Platform · Australia</p>
      </div>
    </div>
  );
}
