import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { mobileApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/lib/authStore';
import { C, sh, URGENCY } from '../../src/lib/theme';
import { UrgencyBadge, StatusBadge, TypeBadge, Card, Loader } from '../../src/components';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DistanceBadge({ km }: { km?: number }) {
  if (km == null) return null;
  const label = km < 1 ? 'Less than 1 km away' : `${km} km away`;
  return (
    <View style={{ backgroundColor: C.brandLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.brand }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const user = useAuthStore(s => s.user);
  const [summary,       setSummary]       = useState<any>(null);
  const [referrals,     setReferrals]     = useState<any[]>([]);
  const [nearby,        setNearby]        = useState<any[]>([]);
  const [allFacilities, setAllFacilities] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [gpsLoading,    setGpsLoading]    = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const fetchNearby = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      // Reverse geocode for display label
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        setLocationLabel(place.city || place.subregion || place.region || 'your area');
      }

      const res  = await fetch(`${API_BASE}/public/facilities/nearby?lat=${latitude}&lng=${longitude}&radius=75`);
      const json = await res.json();
      setNearby(Array.isArray(json.data) ? json.data : []);
    } catch {
      // GPS failed silently — fallback to general list
    } finally {
      setGpsLoading(false);
    }
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [sRes, rRes, fRes] = await Promise.all([
        mobileApi.analytics.summary(),
        mobileApi.referrals.list({ limit: '5', sort: 'urgency' }),
        mobileApi.facilities.list({ limit: '6' }),
      ]);
      setSummary(sRes.data);
      setReferrals(Array.isArray(rRes.data) ? rRes.data : rRes.data?.data ?? []);
      setAllFacilities(Array.isArray(fRes.data) ? fRes.data : fRes.data?.data ?? []);
    } catch { /* show stale */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    fetchNearby();
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const displayFacilities = nearby.length > 0 ? nearby : allFacilities;
  const sectionTitle      = nearby.length > 0
    ? `Near ${locationLabel ?? 'you'}`
    : 'Available Now';
  const sectionSub        = nearby.length > 0
    ? 'Beds available within 75 km of your location'
    : 'Beds ready for immediate placement';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.g50 }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={sh.h2}>Welcome, {firstName}</Text>
          <Text style={[sh.sm, { marginTop: 2 }]}>NDIS accommodation, fast.</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { load(true); fetchNearby(); }} tintColor={C.brand} />}
      >
        {/* Urgent CTA */}
        <TouchableOpacity style={s.urgentCard} activeOpacity={0.9} onPress={() => router.push('/(tabs)/referrals')}>
          <View style={{ flex: 1 }}>
            <Text style={s.urgentTitle}>NEED URGENT PLACEMENT?</Text>
            <Text style={s.urgentSub}>Request immediate assistance</Text>
          </View>
          <TouchableOpacity style={s.urgentBtn} activeOpacity={0.85} onPress={() => router.push('/(tabs)/referrals')}>
            <Text style={s.urgentBtnText}>Get Help Now</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Stats */}
        {summary && (
          <View style={s.statsRow}>
            {[
              { label: 'Active referrals', value: summary.active_referrals ?? 0,                     color: C.brand  },
              { label: 'Beds available',   value: summary.available_beds   ?? 0,                     color: C.green  },
              { label: 'Placed this month',value: summary.referrals_by_status?.placed ?? 0,          color: C.orange },
            ].map(stat => (
              <View key={stat.label} style={s.statCard}>
                <Text style={[sh.h2, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[sh.xs, { textAlign: 'center', marginTop: 2 }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Near You / Available Now */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View>
              <Text style={sh.h3}>{sectionTitle}</Text>
              <Text style={[sh.xs, { marginTop: 2 }]}>{sectionSub}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/find')}>
              <Text style={{ fontSize: 12, color: C.brand, fontWeight: '600' }}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* GPS status bar */}
          {gpsLoading && (
            <View style={s.gpsBanner}>
              <ActivityIndicator size="small" color={C.brand} />
              <Text style={[sh.xs, { color: C.brand, marginLeft: 8 }]}>Detecting your location…</Text>
            </View>
          )}
          {locationDenied && !gpsLoading && (
            <View style={[s.gpsBanner, { backgroundColor: C.g100 }]}>
              <Text style={sh.xs}>Location access denied — showing all available beds</Text>
            </View>
          )}

          {loading && displayFacilities.length === 0 ? (
            <Loader />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10, paddingRight: 20 }}>
                {displayFacilities.map((f: any) => {
                  const avail = parseInt(f.available_beds ?? '0');
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={s.facCard}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/(tabs)/find', params: { highlightId: f.id } })}
                    >
                      {/* Colour band by type */}
                      <View style={[s.facBand, { backgroundColor: f.type === 'SIL' ? '#1A3A8F' : f.type === 'SDA' ? C.green : C.orange }]}>
                        <Text style={s.facBandText}>{f.type}</Text>
                        {avail > 0 && (
                          <View style={s.availBubble}>
                            <Text style={s.availBubbleText}>{avail}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ padding: 10, gap: 4 }}>
                        <Text style={sh.xs}>{f.suburb}, {f.state}</Text>
                        <Text style={[sh.h4, { fontSize: 13 }]} numberOfLines={2}>{f.name}</Text>
                        <DistanceBadge km={f.distance_km} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <Text style={[sh.xs, { color: avail > 0 ? C.green : C.red, fontWeight: '700' }]}>
                            {avail} bed{avail !== 1 ? 's' : ''} free
                          </Text>
                          <View style={s.viewBtn}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>View</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {displayFacilities.length === 0 && !loading && !gpsLoading && (
                  <View style={{ paddingVertical: 20, paddingRight: 20 }}>
                    <Text style={sh.sm}>No facilities in your area — try the Find tab to search anywhere.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Quick actions */}
        <View style={s.section}>
          {[
            { icon: '⊕', label: 'New referral',    sub: 'Submit a placement request',       color: C.greenLight, tc: C.green,  action: () => router.push('/(tabs)/referrals') },
            { icon: '⊙', label: 'Search listings', sub: 'Browse all NDIS accommodation',    color: C.brandLight, tc: C.brand,  action: () => router.push('/(tabs)/find') },
            { icon: '◎', label: 'Contact support', sub: 'Speak with our placement team',    color: C.redLight,   tc: C.red,    action: () => {} },
          ].map(item => (
            <TouchableOpacity key={item.label} style={[s.actionRow, { backgroundColor: item.color }]} activeOpacity={0.85} onPress={item.action}>
              <Text style={{ fontSize: 20, color: item.tc, fontWeight: '300' }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[sh.h4, { color: item.tc }]}>{item.label}</Text>
                <Text style={[sh.xs, { color: item.tc, opacity: 0.7 }]}>{item.sub}</Text>
              </View>
              <Text style={{ color: item.tc, opacity: 0.5, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent referrals */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={sh.h3}>Recent Referrals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/referrals')}>
              <Text style={{ fontSize: 12, color: C.brand }}>View all</Text>
            </TouchableOpacity>
          </View>
          {loading && referrals.length === 0 ? <Loader /> : (
            <View style={{ gap: 8, marginTop: 10 }}>
              {referrals.slice(0, 5).map((r: any) => (
                <Card key={r.id} onPress={() => router.push('/(tabs)/referrals')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[s.urgDot, { backgroundColor: URGENCY[r.urgency]?.text ?? C.g400 }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={sh.h4}>{r.client_name}</Text>
                      <Text style={sh.xs}>{r.location_preference ?? r.source_type} · {relTime(r.created_at)}</Text>
                    </View>
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                  </View>
                </Card>
              ))}
              {referrals.length === 0 && !loading && (
                <Text style={[sh.sm, { textAlign: 'center', paddingVertical: 16 }]}>No referrals yet</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, backgroundColor:'#fff', borderBottomWidth:0.5, borderBottomColor:C.g200 },
  avatar:         { width:36, height:36, borderRadius:18, backgroundColor:C.brandLight, alignItems:'center', justifyContent:'center' },
  avatarText:     { fontSize:14, fontWeight:'700', color:C.brand },
  urgentCard:     { margin:20, backgroundColor:'#1A3A8F', borderRadius:14, padding:16, flexDirection:'row', alignItems:'center', gap:12 },
  urgentTitle:    { fontSize:13, fontWeight:'800', color:'#fff', letterSpacing:0.3 },
  urgentSub:      { fontSize:11, color:'rgba(255,255,255,0.65)', marginTop:2 },
  urgentBtn:      { backgroundColor:'#fff', borderRadius:8, paddingHorizontal:12, paddingVertical:8 },
  urgentBtnText:  { fontSize:12, fontWeight:'700', color:'#1A3A8F' },
  statsRow:       { flexDirection:'row', paddingHorizontal:20, gap:10, marginBottom:4 },
  statCard:       { flex:1, backgroundColor:'#fff', borderRadius:10, padding:12, alignItems:'center', borderWidth:0.5, borderColor:C.g200 },
  section:        { paddingHorizontal:20, marginTop:20 },
  sectionHead:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 },
  gpsBanner:      { flexDirection:'row', alignItems:'center', backgroundColor:C.brandLight, borderRadius:8, padding:10, marginTop:8 },
  facCard:        { width:190, backgroundColor:'#fff', borderRadius:12, overflow:'hidden', borderWidth:0.5, borderColor:C.g200 },
  facBand:        { height:72, alignItems:'flex-start', justifyContent:'space-between', padding:10, flexDirection:'row' },
  facBandText:    { fontSize:12, fontWeight:'800', color:'rgba(255,255,255,0.85)', letterSpacing:0.5 },
  availBubble:    { width:28, height:28, borderRadius:14, backgroundColor:'rgba(255,255,255,0.25)', alignItems:'center', justifyContent:'center' },
  availBubbleText:{ fontSize:13, fontWeight:'800', color:'#fff' },
  viewBtn:        { backgroundColor:C.brand, borderRadius:5, paddingHorizontal:8, paddingVertical:3 },
  actionRow:      { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:10, marginBottom:8 },
  urgDot:         { width:8, height:8, borderRadius:4 },
});
