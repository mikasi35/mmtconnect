import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, TextInput, Switch, Alert, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mobileApi } from '../../src/lib/api';
import { C, sh, URGENCY } from '../../src/lib/theme';
import { UrgencyBadge, StatusBadge, Btn, PillFilter, Loader, EmptyState, Card } from '../../src/components';

const STATUSES  = ['all','new','reviewing','matched','placed','rejected'] as const;
const URGENCIES = ['immediate','high','medium','low'] as const;
const SOURCES   = ['hospital','coordinator','family','self'] as const;
const CARE_OPTIONS = [
  { key:'personal_care',       label:'Personal care' },
  { key:'nursing',             label:'Nursing' },
  { key:'behavioural_support', label:'Behavioural support' },
  { key:'complex_medical',     label:'Complex medical' },
  { key:'overnight_support',   label:'Overnight support' },
  { key:'24h_support',         label:'24h support' },
];

type StatusFilter = typeof STATUSES[number];

const BLANK_FORM = {
  client_name: '', client_age: '',
  urgency: 'medium' as string,
  source_type: 'coordinator' as string,
  source_contact: '', location_preference: '', notes: '',
  care_needs: {} as Record<string, boolean>,
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day:'numeric', month:'short' });
}

export default function ReferralsScreen() {
  const [referrals,  setReferrals]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<StatusFilter>('all');
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ ...BLANK_FORM });
  const [saving,     setSaving]     = useState(false);
  const [formErr,    setFormErr]    = useState('');
  const [selected,   setSelected]   = useState<any>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params: Record<string,string> = { limit: '50' };
      if (filter !== 'all') params.status = filter;
      const res = await mobileApi.referrals.list(params);
      setReferrals(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch { /* keep stale */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const submitReferral = async () => {
    if (!form.client_name.trim()) { setFormErr('Client name is required'); return; }
    if (!form.client_age)         { setFormErr('Client age is required');  return; }
    setSaving(true); setFormErr('');
    try {
      await mobileApi.referrals.create({
        ...form,
        client_age: parseInt(form.client_age),
      });
      setShowForm(false);
      setForm({ ...BLANK_FORM });
      load();
      Alert.alert('Success', 'Referral submitted successfully!');
    } catch (e: any) {
      setFormErr(e.message || 'Submission failed');
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await mobileApi.referrals.update(id, { status });
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const renderItem = ({ item: r }: { item: any }) => (
    <TouchableOpacity onPress={() => setSelected(r)} activeOpacity={0.85} style={{ marginBottom: 8, marginHorizontal: 16 }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={[s.urgDot, { backgroundColor: URGENCY[r.urgency]?.text ?? C.g400 }]} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={sh.h4}>{r.client_name}</Text>
              <StatusBadge status={r.status} />
            </View>
            <Text style={sh.xs}>Age {r.client_age} · {r.source_type} · {r.location_preference ?? '—'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <UrgencyBadge urgency={r.urgency} />
              <Text style={sh.xs}>{fmtDate(r.created_at)}</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.g50 }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={sh.h2}>Referrals</Text>
          <Text style={sh.xs}>{referrals.length} total</Text>
        </View>
        <Btn label="+ New" onPress={() => { setShowForm(true); setFormErr(''); }} size="sm" />
      </View>

      {/* Filters */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.g200 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <PillFilter
            options={STATUSES.map(s => ({ label: s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1), value: s }))}
            value={filter}
            onChange={setFilter}
          />
        </ScrollView>
      </View>

      {loading && referrals.length === 0 ? <Loader /> : (
        <FlatList
          data={referrals}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.brand} />}
          ListEmptyComponent={<EmptyState icon="\u25C7" title="No referrals" message="Tap New Referral to submit a placement request." action={<Btn label="New Referral" onPress={() => setShowForm(true)} />} />}
        />
      )}

      {/* ── Detail Modal ── */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ fontSize: 15, color: C.g500 }}>Close</Text>
            </TouchableOpacity>
            <Text style={sh.h3}>Referral Detail</Text>
            <View style={{ width: 40 }} />
          </View>
          {selected && (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              {/* Avatar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={s.bigAvatar}>
                  <Text style={s.bigAvatarText}>{selected.client_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={sh.h2}>{selected.client_name}</Text>
                  <Text style={sh.sm}>Age {selected.client_age}</Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                {[
                  ['Urgency',  <UrgencyBadge urgency={selected.urgency} />],
                  ['Status',   <StatusBadge status={selected.status} />],
                  ['Source',   selected.source_type],
                  ['Contact',  selected.source_contact || '—'],
                  ['Location', selected.location_preference || '—'],
                  ['Submitted',fmtDate(selected.created_at)],
                ].map(([label, val]) => (
                  <View key={label as string} style={s.detailRow}>
                    <Text style={[sh.xs, { flex: 1 }]}>{label}</Text>
                    {typeof val === 'string' ? <Text style={[sh.sm, { fontWeight:'500' }]}>{val}</Text> : val as any}
                  </View>
                ))}
              </View>

              {/* Care needs */}
              {Object.entries(selected.care_needs ?? {}).some(([,v]) => v) && (
                <View style={s.careBox}>
                  <Text style={s.careTitle}>CARE NEEDS</Text>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginTop:6 }}>
                    {CARE_OPTIONS.filter(o => (selected.care_needs ?? {})[o.key]).map(o => (
                      <View key={o.key} style={{ backgroundColor:C.brandLight, borderRadius:4, paddingHorizontal:7, paddingVertical:3 }}>
                        <Text style={{ fontSize:11, fontWeight:'600', color:C.brand }}>{o.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {selected.notes ? (
                <View style={s.careBox}>
                  <Text style={s.careTitle}>NOTES</Text>
                  <Text style={[sh.sm, { marginTop:4, lineHeight:18 }]}>{selected.notes}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View style={{ gap: 10, marginTop: 8 }}>
                {selected.status === 'new' && (
                  <Btn label="Mark as Reviewing" onPress={() => { updateStatus(selected.id,'reviewing'); setSelected({...selected,status:'reviewing'}); }} />
                )}
                {selected.status === 'reviewing' && (
                  <Btn label="Mark as Matched" onPress={() => { updateStatus(selected.id,'matched'); setSelected({...selected,status:'matched'}); }} />
                )}
                {selected.status === 'matched' && (
                  <Btn label="Confirm Placement" onPress={() => { updateStatus(selected.id,'placed'); setSelected({...selected,status:'placed'}); }} />
                )}
                {!['placed','rejected'].includes(selected.status) && (
                  <Btn label="Reject" variant="danger" onPress={() => Alert.alert('Confirm','Reject this referral?',[{text:'Cancel',style:'cancel'},{text:'Reject',style:'destructive',onPress:()=>{updateStatus(selected.id,'rejected');setSelected({...selected,status:'rejected'});}}])} />
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── New Referral Form Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={{ fontSize: 15, color: C.g500 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={sh.h3}>New Referral</Text>
            <TouchableOpacity onPress={submitReferral}>
              <Text style={{ fontSize: 15, color: C.brand, fontWeight: '600' }}>Submit</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
              {formErr ? <View style={s.errBox}><Text style={{ color:C.red, fontSize:13 }}>{formErr}</Text></View> : null}

              {/* Client info */}
              <View style={s.formSection}>
                <Text style={s.sectionLabel}>CLIENT INFORMATION</Text>
                <View>
                  <Text style={sh.label}>Full name *</Text>
                  <TextInput style={sh.input} value={form.client_name} onChangeText={v => setForm(f=>({...f,client_name:v}))} placeholder="James Thompson" placeholderTextColor={C.g300} />
                </View>
                <View>
                  <Text style={sh.label}>Age *</Text>
                  <TextInput style={sh.input} value={form.client_age} onChangeText={v => setForm(f=>({...f,client_age:v}))} placeholder="42" placeholderTextColor={C.g300} keyboardType="number-pad" />
                </View>
              </View>

              {/* Urgency */}
              <View style={s.formSection}>
                <Text style={s.sectionLabel}>URGENCY</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                  {URGENCIES.map(u => {
                    const uc = URGENCY[u];
                    const sel = form.urgency === u;
                    return (
                      <TouchableOpacity key={u} onPress={() => setForm(f=>({...f,urgency:u}))}
                        style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:8, backgroundColor: sel ? uc.text : uc.bg }}>
                        <Text style={{ fontSize:12, fontWeight:'700', color: sel ? '#fff' : uc.text }}>{u.toUpperCase()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Source */}
              <View style={s.formSection}>
                <Text style={s.sectionLabel}>REFERRAL SOURCE</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                  {SOURCES.map(src => {
                    const sel = form.source_type === src;
                    return (
                      <TouchableOpacity key={src} onPress={() => setForm(f=>({...f,source_type:src}))}
                        style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:8, backgroundColor: sel ? C.brand : C.g100, borderWidth:1, borderColor: sel ? C.brand : C.g200 }}>
                        <Text style={{ fontSize:12, fontWeight:'600', color: sel ? '#fff' : C.g600, textTransform:'capitalize' }}>{src}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={{ marginTop:8 }}>
                  <Text style={sh.label}>Source contact name</Text>
                  <TextInput style={sh.input} value={form.source_contact} onChangeText={v=>setForm(f=>({...f,source_contact:v}))} placeholder="Royal North Shore Hospital" placeholderTextColor={C.g300} />
                </View>
              </View>

              {/* Care needs */}
              <View style={s.formSection}>
                <Text style={s.sectionLabel}>CARE NEEDS</Text>
                {CARE_OPTIONS.map(opt => (
                  <View key={opt.key} style={s.careRow}>
                    <Text style={[sh.body, { flex:1 }]}>{opt.label}</Text>
                    <Switch
                      value={!!form.care_needs[opt.key]}
                      onValueChange={() => setForm(f=>({...f,care_needs:{...f.care_needs,[opt.key]:!f.care_needs[opt.key]}}))}
                      trackColor={{ true:C.brand, false:C.g200 }}
                      thumbColor="#fff"
                    />
                  </View>
                ))}
              </View>

              {/* Location + notes */}
              <View style={s.formSection}>
                <Text style={s.sectionLabel}>LOCATION & NOTES</Text>
                <View>
                  <Text style={sh.label}>Location preference</Text>
                  <TextInput style={sh.input} value={form.location_preference} onChangeText={v=>setForm(f=>({...f,location_preference:v}))} placeholder="Sydney, NSW" placeholderTextColor={C.g300} />
                </View>
                <View>
                  <Text style={sh.label}>Notes</Text>
                  <TextInput
                    style={[sh.input, { height:80, textAlignVertical:'top', paddingTop:10 }]}
                    value={form.notes} onChangeText={v=>setForm(f=>({...f,notes:v}))}
                    placeholder="Special requirements or context…" placeholderTextColor={C.g300}
                    multiline numberOfLines={3}
                  />
                </View>
              </View>

              <Btn label="Submit Referral" onPress={submitReferral} loading={saving} size="lg" />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, backgroundColor:'#fff', borderBottomWidth:0.5, borderBottomColor:C.g200 },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:18, borderBottomWidth:0.5, borderBottomColor:C.g200 },
  urgDot:      { width:8, height:8, borderRadius:4, marginTop:4 },
  bigAvatar:   { width:52, height:52, borderRadius:26, backgroundColor:C.brandLight, alignItems:'center', justifyContent:'center' },
  bigAvatarText:{ fontSize:18, fontWeight:'700', color:C.brand },
  detailRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:0.5, borderBottomColor:C.g100 },
  careBox:     { backgroundColor:C.g50, borderRadius:9, padding:12 },
  careTitle:   { fontSize:10, fontWeight:'700', color:C.g400, letterSpacing:0.7 },
  formSection: { gap:10 },
  sectionLabel:{ fontSize:10, fontWeight:'700', color:C.g400, letterSpacing:0.7, textTransform:'uppercase' },
  errBox:      { backgroundColor:C.redLight, borderRadius:8, padding:10 },
  careRow:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:0.5, borderBottomColor:C.g100 },
});
