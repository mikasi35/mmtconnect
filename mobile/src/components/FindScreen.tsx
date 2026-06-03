import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { C, sh } from '../lib/theme';
import { TypeBadge, Btn, EmptyState, Card } from './index';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const CARE_OPTIONS = [
  { key: 'personal_care',       label: 'Personal care'       },
  { key: 'nursing',             label: 'Nursing support'     },
  { key: 'behavioural_support', label: 'Behavioural support' },
  { key: 'complex_medical',     label: 'Complex medical'     },
  { key: 'overnight_support',   label: 'Overnight support'   },
  { key: '24h_support',         label: '24h support'         },
];

const URGENCY_OPTIONS = [
  { value: 'low',       label: 'No urgency',     color: C.green,  bg: C.greenLight  },
  { value: 'medium',    label: 'Within 1 month', color: C.yellow, bg: C.yellowLight },
  { value: 'high',      label: 'Within 2 weeks', color: C.orange, bg: C.orangeLight },
  { value: 'immediate', label: 'Urgent now',      color: C.red,    bg: C.redLight    },
];

const RELATIONSHIPS = ['Parent', 'Sibling', 'Spouse/Partner', 'Child (adult)', 'Guardian', 'Carer', 'Other'];
const STATES        = ['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'];
const CARE_LABELS: Record<string,string> = {
  personal_care:'Personal care', nursing:'Nursing',
  behavioural_support:'Behavioural support', complex_medical:'Complex medical',
  overnight_support:'Overnight support', '24h_support':'24h support',
};

const BLANK_REFERRAL = {
  clientName:'', clientAge:'', urgency:'medium', locPref:'',
  submitterName:'', submitterEmail:'', submitterPhone:'',
  relationship:'', notes:'',
  careNeeds: {} as Record<string,boolean>,
};

export default function FindScreen({ isPublic }: { isPublic?: boolean }) {
  const [search,      setSearch]      = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [careFilter,  setCareFilter]  = useState<Record<string,boolean>>({});
  const [results,     setResults]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [selected,    setSelected]    = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [showForm,    setShowForm]    = useState(false);
  const [prefacility, setPrefacility] = useState<{id:string;name:string}|null>(null);
  const [formStep,    setFormStep]    = useState(1);
  const [form,        setForm]        = useState({...BLANK_REFERRAL});
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState('');
  const [submitted,   setSubmitted]   = useState<any>(null);

  const [showTrack,   setShowTrack]  = useState(false);
  const [trackingId,  setTrackingId] = useState('');
  const [trackResult, setTrackResult]= useState<any>(null);
  const [tracking,    setTracking]   = useState(false);
  const [trackErr,    setTrackErr]   = useState('');


  const runSearch = async () => {
    setLoading(true); setSearched(true); setSelected(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (stateFilter) params.set('state', stateFilter);
      if (typeFilter)  params.set('type',  typeFilter);
      const needs = Object.entries(careFilter).filter(([,v])=>v).map(([k])=>k);
      if (needs.length) params.set('care_needs', needs.join(','));

      const res  = await fetch(`${API_BASE}/public/facilities?${params}`);
      const json = await res.json();
      setResults(Array.isArray(json.data) ? json.data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = () => runSearch();

  const openReferral = (facility?: any) => {
    setForm({...BLANK_REFERRAL});
    setPrefacility(facility ? { id: facility.id, name: facility.name } : null);
    setFormStep(1); setFormErr(''); setSubmitted(null);
    setShowForm(true);
  };

  const validateStep = () => {
    if (formStep === 1) {
      if (!form.clientName.trim()) { setFormErr('Please enter the name of the person needing care'); return false; }
      if (!form.clientAge)         { setFormErr('Please enter their age'); return false; }
    }
    if (formStep === 3) {
      if (!form.submitterName.trim()) { setFormErr('Please enter your name'); return false; }
      if (!form.submitterEmail.trim() && !form.submitterPhone.trim()) {
        setFormErr('Please provide at least an email or phone number'); return false;
      }
    }
    setFormErr(''); return true;
  };

  const nextStep      = () => { if (validateStep()) setFormStep(s => s + 1); };
  const submitReferral = async () => {
    if (!validateStep()) return;
    setSaving(true); setFormErr('');
    try {
      const res = await fetch(`${API_BASE}/public/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name:            form.clientName,
          client_age:             parseInt(form.clientAge),
          care_needs:             form.careNeeds,
          urgency:                form.urgency,
          location_preference:    form.locPref       || undefined,
          submitter_name:         form.submitterName,
          submitter_email:        form.submitterEmail || undefined,
          submitter_phone:        form.submitterPhone || undefined,
          submitter_relationship: form.relationship   || undefined,
          notes:                  form.notes          || undefined,
          preferred_facility_id:  prefacility?.id     || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const json = await res.json();
      setSubmitted(json.data);
      setFormStep(4);
    } catch (e: any) {
      setFormErr(e.message ?? 'Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const doTrack = async () => {
    const id = trackingId.trim().toUpperCase();
    if (id.length < 6) { setTrackErr('Please enter your 8-character tracking ID'); return; }
    setTracking(true); setTrackErr(''); setTrackResult(null);
    try {
      const res  = await fetch(`${API_BASE}/public/referrals/track/${id}`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      setTrackResult((await res.json()).data);
    } catch (e: any) {
      setTrackErr(e.message ?? 'Referral not found');
    } finally {
      setTracking(false);
    }
  };

  const selectedCareCount = Object.values(careFilter).filter(Boolean).length;
  const formCareCount     = Object.values(form.careNeeds).filter(Boolean).length;
  const hasFilters        = selectedCareCount > 0 || !!typeFilter || !!stateFilter;

  const openSignin = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.g50 }}>
      <View style={s.header}>
        <View>
          <Text style={sh.h2}>{isPublic ? 'Search vacancies' : 'Find a Place'}</Text>
          <Text style={sh.xs}>{isPublic ? 'Browse available NDIS accommodation without signing in' : 'NDIS accommodation near you'}</Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap: 10 }}>
          {isPublic && (
            <TouchableOpacity style={s.signInBtn} onPress={openSignin} activeOpacity={0.85}>
              <Text style={s.signInText}>Sign in</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.trackBtn} onPress={() => setShowTrack(true)}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.brand }}>Track referral</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={s.searchBox}>
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Facility name (optional)"
              placeholderTextColor={C.g400}
              returnKeyType="search"
              onSubmitEditing={doSearch}
            />
            <TouchableOpacity style={s.searchBtn} onPress={doSearch} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.searchBtnText}>Search</Text>
              }
            </TouchableOpacity>
          </View>


          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 7 }}>
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={[s.chip, hasFilters && { backgroundColor: C.brand, borderColor: C.brand }]}
              >
                <Text style={[s.chipText, hasFilters && { color: '#fff' }]}>Filters{hasFilters ? ` (${selectedCareCount + (typeFilter?1:0) + (stateFilter?1:0)})` : ''}</Text>
              </TouchableOpacity>
              {['SIL','SDA','STA'].map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTypeFilter(typeFilter === t ? '' : t)}
                  style={[s.chip, typeFilter === t && { backgroundColor: C.brand, borderColor: C.brand }]}
                >
                  <Text style={[s.chipText, typeFilter === t && { color: '#fff' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
              {STATES.map(st => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStateFilter(stateFilter === st ? '' : st)}
                  style={[s.chip, stateFilter === st && { backgroundColor: C.brand, borderColor: C.brand }]}
                >
                  <Text style={[s.chipText, stateFilter === st && { color: '#fff' }]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {loading && (
          <View style={{ alignItems: 'center', padding: 60 }}>
            <ActivityIndicator size="large" color={C.brand} />
            <Text style={[sh.sm, { marginTop: 12 }]}>Searching for available beds…</Text>
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <EmptyState
            icon="—"
            title="No vacancies found"
            message="Try a different state, remove some care filters, or search a facility name. Submit a referral and our team will search the full network."
            action={<Btn label="Submit a referral anyway" onPress={() => openReferral()} size="sm" />}
          />
        )}

        {!loading && !searched && (
          <View style={{ alignItems: 'center', padding: 48 }}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>⌖</Text>
            <Text style={[sh.h3, { textAlign: 'center', marginBottom: 6 }]}>Find accommodation near you</Text>
            <Text style={[sh.sm, { textAlign: 'center', lineHeight: 20, color: C.g500, maxWidth: 300 }]}>Choose an accommodation type and state to see available vacancies. You can also optionally search by facility name.</Text>
            <TouchableOpacity style={[s.heroSecondaryBtn]} onPress={() => openReferral()}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.brand }}>Submit a referral without searching</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && results.length > 0 && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={[sh.sm, { fontWeight: '600' }]}>{results.length} facilit{results.length === 1 ? 'y' : 'ies'} with available beds</Text>

            {results.map((f: any) => {
              const avail          = parseInt(f.available_beds ?? '0');
              const supportedNeeds = Object.entries(f.supported_care ?? {}).filter(([,v])=>v).map(([k])=>k);
              const isSelected     = selected?.id === f.id;
              const detailAddress  = f.address ?? f.full_address ?? [f.street_address, f.suburb, f.state].filter(Boolean).join(', ');

              return (
                <Card
                  key={f.id}
                  onPress={() => setSelected(isSelected ? null : f)}
                  style={{ borderWidth: isSelected ? 1.5 : 0.5, borderColor: isSelected ? C.brand : C.g200 }}
                >
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <View style={{ flex:1, gap:3 }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                        <TypeBadge type={f.type} />
                        <Text style={sh.xs}>{f.suburb}, {f.state}</Text>
                        {f.distance_km != null && (
                          <View style={s.distBadge}>
                            <Text style={s.distBadgeText}>{f.distance_km} km</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[sh.h3, { fontSize:15 }]}>{f.name}</Text>
                    </View>
                    <View style={{ alignItems:'flex-end', marginLeft:10 }}>
                      <Text style={{ fontSize:24, fontWeight:'800', color: avail>0 ? C.green : C.red, lineHeight:26 }}>{avail}</Text>
                      <Text style={sh.xs}>bed{avail!==1?'s':''} free</Text>
                    </View>
                  </View>

                  {f.description ? (
                    <Text style={[sh.sm, { lineHeight:18, marginBottom:8 }]} numberOfLines={2}>{f.description}</Text>
                  ) : null}

                  {supportedNeeds.length > 0 && (
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, marginBottom:10 }}>
                      {supportedNeeds.slice(0, 4).map((k:string) => (
                        <View key={k} style={{ backgroundColor:C.greenLight, borderRadius:4, paddingHorizontal:6, paddingVertical:2 }}>
                          <Text style={{ fontSize:10, fontWeight:'600', color:C.green }}>+ {CARE_LABELS[k]??k}</Text>
                        </View>
                      ))}
                      {supportedNeeds.length > 4 && <Text style={sh.xs}>+{supportedNeeds.length-4} more</Text>}
                    </View>
                  )}

                  {isSelected && (
                    <View style={s.expandedDetail}>
                      <Text style={s.detailLabel}>CONTACT</Text>
                      {f.contact_phone && <Text style={sh.sm}>{f.contact_phone}</Text>}
                      {f.contact_email && <Text style={sh.sm}>{f.contact_email}</Text>}
                      {(f.address || f.full_address || f.street_address) && (
                        <>
                          <Text style={[s.detailLabel, { marginTop: 10 }]}>ADDRESS</Text>
                          <Text style={sh.sm}>{f.address ?? f.full_address ?? f.street_address}</Text>
                        </>
                      )}
                    </View>
                  )}

                  <TouchableOpacity style={s.requestBtn} onPress={() => openReferral(f)} activeOpacity={0.85}>
                    <Text style={s.requestBtnText}>Request this accommodation</Text>
                  </TouchableOpacity>
                </Card>
              );
            })}

            <Card style={{ backgroundColor:C.brandLight, borderColor:C.brand }}>
              <Text style={[sh.h4, { color:C.brand, marginBottom:4 }]}>Can't find what you need?</Text>
              <Text style={[sh.sm, { color:C.brand, opacity:0.8, marginBottom:10 }]}>Submit a referral and our coordinators will search the full network for you.</Text>
              <Btn label="Submit a referral" onPress={() => openReferral()} size="sm" />
            </Card>
          </View>
        )}
      </ScrollView>

      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setCareFilter({}); setStateFilter(''); setTypeFilter(''); }}>
              <Text style={{ fontSize:14, color:C.red }}>Clear all</Text>
            </TouchableOpacity>
            <Text style={sh.h3}>Filters</Text>
            <TouchableOpacity onPress={() => { setShowFilters(false); doSearch(); }}>
              <Text style={{ fontSize:14, color:C.brand, fontWeight:'600' }}>Apply</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding:20, gap:20 }}>
            <View>
              <Text style={s.filterLabel}>STATE</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                {STATES.map(st => (
                  <TouchableOpacity key={st} onPress={() => setStateFilter(stateFilter===st?'':st)}
                    style={[s.chip, stateFilter===st && { backgroundColor:C.brand, borderColor:C.brand }]}> 
                    <Text style={[s.chipText, stateFilter===st && { color:'#fff' }]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={s.filterLabel}>TYPE</Text>
              <View style={{ flexDirection:'row', gap:8 }}>
                {['SIL','SDA','STA'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setTypeFilter(typeFilter===t?'':t)}
                    style={[s.chip, typeFilter===t && { backgroundColor:C.brand, borderColor:C.brand }]}> 
                    <Text style={[s.chipText, typeFilter===t && { color:'#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={s.filterLabel}>CARE NEEDS</Text>
              {CARE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.key}
                  onPress={() => setCareFilter(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                  style={[s.careRow, { backgroundColor: careFilter[opt.key] ? C.brandLight : '#fff', borderColor: careFilter[opt.key] ? C.brand : C.g200 }]}
                >
                  <Text style={[sh.body, { flex:1, color: careFilter[opt.key] ? C.brand : C.g800 }]}>{opt.label}</Text>
                  <View style={{ width:22, height:22, borderRadius:5, backgroundColor: careFilter[opt.key] ? C.brand : C.g100, alignItems:'center', justifyContent:'center' }}>
                    {careFilter[opt.key] && <Text style={{ fontSize:12, color: '#fff', fontWeight:'700' }}>+</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => formStep>1&&formStep<4 ? setFormStep(s=>s-1) : setShowForm(false)}>
              <Text style={{ fontSize:15, color:C.g500 }}>{formStep>1&&formStep<4 ? 'Back' : 'Close'}</Text>
            </TouchableOpacity>
            <Text style={sh.h3}>{formStep===1?'About them':formStep===2?'Care needs':formStep===3?'Your details':'Submitted'}</Text>
            <View style={{ width:50 }} />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1 }}>
            <ScrollView contentContainerStyle={{ padding:20, gap:16 }} keyboardShouldPersistTaps="handled">
              {formStep<4 && (
                <View style={{ flexDirection:'row', gap:6, marginBottom:4 }}>
                  {[1,2,3].map(n => (
                    <View key={n} style={{ flex:1, height:4, borderRadius:2, backgroundColor:formStep>=n?C.brand:C.g200 }} />
                  ))}
                </View>
              )}

              {prefacility && formStep<4 && (
                <View style={{ backgroundColor:C.brandLight, borderRadius:8, padding:10, flexDirection:'row', alignItems:'center', gap:8 }}>
                  <Text style={{ fontSize:13, color:C.brand, fontWeight:'500', flex:1 }}>Requesting: {prefacility.name}</Text>
                </View>
              )}

              {formStep===1 && (
                <>
                  <Text style={[sh.sm,{color:C.g500}]}>Tell us about the person who needs accommodation.</Text>
                  <View>
                    <Text style={sh.label}>Their full name *</Text>
                    <TextInput style={sh.input} value={form.clientName} onChangeText={v=>setForm(f=>({...f,clientName:v}))} placeholder="e.g. James Thompson" placeholderTextColor={C.g300} />
                  </View>
                  <View>
                    <Text style={sh.label}>Their age *</Text>
                    <TextInput style={sh.input} value={form.clientAge} onChangeText={v=>setForm(f=>({...f,clientAge:v}))} placeholder="42" placeholderTextColor={C.g300} keyboardType="number-pad" />
                  </View>
                  <View>
                    <Text style={sh.label}>Urgency</Text>
                    {URGENCY_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt.value} onPress={() => setForm(f=>({...f,urgency:opt.value}))}
                        style={[s.urgencyOpt,{borderColor:form.urgency===opt.value?opt.color:C.g200,backgroundColor:form.urgency===opt.value?opt.bg:'#fff'}]}>
                        <Text style={{fontSize:13,fontWeight:'700',color:opt.color}}>{opt.label}</Text>
                        {form.urgency===opt.value && <Text style={{color:opt.color}}>+</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View>
                    <Text style={sh.label}>Preferred location (optional)</Text>
                    <TextInput style={sh.input} value={form.locPref} onChangeText={v=>setForm(f=>({...f,locPref:v}))} placeholder="e.g. Sydney, NSW" placeholderTextColor={C.g300} />
                  </View>
                </>
              )}

              {formStep===2 && (
                <>
                  <Text style={[sh.sm,{color:C.g500,lineHeight:18}]}>Select all care needs. You can skip this — a coordinator will discuss it with you.</Text>
                  {CARE_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt.key}
                      onPress={() => setForm(f=>({...f,careNeeds:{...f.careNeeds,[opt.key]:!f.careNeeds[opt.key]}}))}
                      style={[s.careOptRow,{borderColor:form.careNeeds[opt.key]?C.brand:C.g200,backgroundColor:form.careNeeds[opt.key]?C.brandLight:'#fff'}]}
                    >
                      <Text style={[sh.h4,{flex:1,color:form.careNeeds[opt.key]?C.brand:C.g800}]}>{opt.label}</Text>
                      <View style={{width:22,height:22,borderRadius:5,backgroundColor:form.careNeeds[opt.key]?C.brand:C.g100,alignItems:'center',justifyContent:'center'}}>
                        {form.careNeeds[opt.key] && <Text style={{fontSize:12,color:'#fff',fontWeight:'700'}}>+</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                  <View>
                    <Text style={sh.label}>Additional notes (optional)</Text>
                    <TextInput style={[sh.input,{height:80,textAlignVertical:'top',paddingTop:10}]}
                      value={form.notes} onChangeText={v=>setForm(f=>({...f,notes:v}))}
                      placeholder="Any other details…" placeholderTextColor={C.g300}
                      multiline numberOfLines={3} />
                  </View>
                </>
              )}

              {formStep===3 && (
                <>
                  <Text style={[sh.sm,{color:C.g500,lineHeight:18}]}>So we can contact you. We never share your details.</Text>
                  <View>
                    <Text style={sh.label}>Your name *</Text>
                    <TextInput style={sh.input} value={form.submitterName} onChangeText={v=>setForm(f=>({...f,submitterName:v}))} placeholder="Mary Thompson" placeholderTextColor={C.g300} />
                  </View>
                  <View>
                    <Text style={sh.label}>Your relationship to them</Text>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
                      {RELATIONSHIPS.map(r => (
                        <TouchableOpacity key={r} onPress={()=>setForm(f=>({...f,relationship:r}))}
                          style={[s.chip,form.relationship===r&&{backgroundColor:C.brand,borderColor:C.brand}]}> 
                          <Text style={[s.chipText,form.relationship===r&&{color:'#fff'}]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Text style={sh.label}>Email *</Text>
                    <TextInput style={sh.input} value={form.submitterEmail} onChangeText={v=>setForm(f=>({...f,submitterEmail:v}))} placeholder="mary@example.com" placeholderTextColor={C.g300} keyboardType="email-address" autoCapitalize="none" />
                  </View>
                  <View>
                    <Text style={sh.label}>Phone *</Text>
                    <TextInput style={sh.input} value={form.submitterPhone} onChangeText={v=>setForm(f=>({...f,submitterPhone:v}))} placeholder="0400 123 456" placeholderTextColor={C.g300} keyboardType="phone-pad" />
                  </View>
                  <Text style={[sh.xs,{color:C.g400}]}>* Please provide at least one — email or phone</Text>
                  <View style={s.summary}>
                    <Text style={s.summaryLabel}>REFERRAL SUMMARY</Text>
                    <Text style={sh.sm}>{form.clientName}, age {form.clientAge}</Text>
                    <Text style={sh.sm}>{URGENCY_OPTIONS.find(u=>u.value===form.urgency)?.label}</Text>
                    {form.locPref ? <Text style={sh.sm}>{form.locPref}</Text> : null}
                    {formCareCount > 0 ? <Text style={sh.sm}>{formCareCount} care need{formCareCount!==1?'s':''} selected</Text> : null}
                    {prefacility ? <Text style={sh.sm}>Requested: {prefacility.name}</Text> : null}
                  </View>
                </>
              )}

              {formStep===4 && submitted && (
                <View style={{alignItems:'center',padding:20}}>
                  <View style={s.successIcon}><Text style={{fontSize:28,color:C.green,fontWeight:'700'}}>+</Text></View>
                  <Text style={[sh.h2,{textAlign:'center',marginBottom:8}]}>Referral submitted</Text>
                  <Text style={[sh.sm,{textAlign:'center',lineHeight:20,marginBottom:24}]}>A coordinator will contact you within 1 business day to discuss {submitted.client_name}'s options.</Text>
                  <View style={s.trackingBox}>
                    <Text style={s.trackingLabel}>TRACKING ID</Text>
                    <Text style={s.trackingId}>{submitted.tracking_id}</Text>
                    <Text style={[sh.xs,{textAlign:'center',marginTop:4}]}>Save this to check your referral status</Text>
                  </View>
                  {form.urgency==='immediate' && (
                    <View style={[s.urgentNote,{marginTop:16}]}> 
                      <Text style={{fontSize:13,fontWeight:'700',color:C.red}}>Urgent referral received</Text>
                      <Text style={{fontSize:12,color:C.red,marginTop:3,lineHeight:17}}>A coordinator will be in contact as soon as possible.</Text>
                    </View>
                  )}
                  <Btn label="Done" onPress={()=>setShowForm(false)} style={{marginTop:20,width:'100%'}} />
                  <TouchableOpacity onPress={()=>{setShowForm(false);setShowTrack(true);setTrackingId(submitted.tracking_id);}} style={{marginTop:12}}>
                    <Text style={{fontSize:13,color:C.brand,fontWeight:'600'}}>Track my referral</Text>
                  </TouchableOpacity>
                </View>
              )}

              {formErr ? <View style={s.errBox}><Text style={{color:C.red,fontSize:13}}>{formErr}</Text></View> : null}
              {formStep<4 && (
                <Btn
                  label={formStep<3?'Next':'Submit referral'}
                  onPress={formStep<3?nextStep:submitReferral}
                  loading={saving} size="lg" style={{marginTop:8}}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showTrack} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowTrack(false)}>
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={()=>setShowTrack(false)}><Text style={{fontSize:15,color:C.g500}}>Close</Text></TouchableOpacity>
            <Text style={sh.h3}>Track Referral</Text>
            <View style={{width:40}} />
          </View>
          <ScrollView contentContainerStyle={{padding:20,gap:16}}>
            <Text style={[sh.sm,{color:C.g500}]}>Enter the tracking ID you received when you submitted your referral.</Text>
            <View style={{flexDirection:'row',gap:10}}>
              <TextInput
                style={[sh.input,{flex:1,letterSpacing:2,fontSize:16}]}
                value={trackingId}
                onChangeText={v=>setTrackingId(v.toUpperCase())}
                placeholder="e.g. A3B7C2D1"
                placeholderTextColor={C.g300}
                maxLength={8}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={s.trackBtn2} onPress={doTrack} disabled={tracking}>
                {tracking ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{color:'#fff',fontWeight:'700',fontSize:14}}>Track</Text>}
              </TouchableOpacity>
            </View>

            {trackErr ? <View style={s.errBox}><Text style={{color:C.red,fontSize:13}}>{trackErr}</Text></View> : null}

            {trackResult && (() => {
              const STATUS_INFO: Record<string,{label:string;color:string;bg:string;desc:string}> = {
                new:      {label:'Received',   color:'#1E40AF',bg:'#DBEAFE',desc:'Your referral is in our queue.'},
                reviewing:{label:'Reviewing',  color:C.yellow, bg:C.yellowLight,desc:'A coordinator is actively reviewing your referral.'},
                matched:  {label:'Matched',    color:C.orange, bg:C.orangeLight,desc:'We found a placement. A coordinator will contact you shortly.'},
                placed:   {label:'Placed',     color:C.green,  bg:C.greenLight,desc:'Your loved one has been successfully placed.'},
                rejected: {label:'Closed',     color:C.red,    bg:C.redLight,desc:'Unable to find a match. Please call us to discuss alternatives.'},
              };
              const si = STATUS_INFO[trackResult.status] ?? STATUS_INFO.new;
              return (
                <View style={{gap:12}}>
                  <View style={[s.statusBanner,{backgroundColor:si.bg,borderColor:si.color+'33'}]}>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:18,fontWeight:'800',color:si.color}}>{si.label}</Text>
                      <Text style={{fontSize:13,color:C.g700,marginTop:3,lineHeight:18}}>{si.desc}</Text>
                    </View>
                  </View>
                  <View style={s.progressCard}>
                    {['new','reviewing','matched','placed'].map((step,i,arr)=>{
                      const done = ['new','reviewing','matched','placed'].indexOf(trackResult.status) >= i;
                      return (
                        <View key={step} style={{flexDirection:'row',gap:12,paddingBottom:i<arr.length-1?14:0}}>
                          <View style={{alignItems:'center',width:22}}>
                            <View style={{width:22,height:22,borderRadius:11,backgroundColor:done?C.brand:C.g200,alignItems:'center',justifyContent:'center'}}>
                              <Text style={{fontSize:10,fontWeight:'700',color:done?'#fff':C.g400}}>{done?'v':i+1}</Text>
                            </View>
                            {i<arr.length-1 && <View style={{width:2,flex:1,backgroundColor:done?C.brand:C.g200,marginTop:2}} />}
                          </View>
                          <Text style={[sh.sm,{paddingTop:2,fontWeight:done?'600':'400',color:done?C.g800:C.g400}]}>{['Referral received','Under review','Match found','Placement confirmed'][i]}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={s.progressCard}>
                    {[
                      ['Person',       trackResult.client_name],
                      ['Submitted',    new Date(trackResult.created_at).toLocaleDateString('en-AU')],
                      ['Last updated', new Date(trackResult.updated_at).toLocaleDateString('en-AU')],
                      ...(trackResult.status==='placed'?[
                        ['Placed at', trackResult.placed_facility_name??'—'],
                        ['Location',  trackResult.placed_facility_location??'—'],
                      ]:[]),
                    ].map(([label,val])=>(
                      <View key={label} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:7,borderBottomWidth:0.5,borderBottomColor:C.g100}}>
                        <Text style={sh.xs}>{label}</Text>
                        <Text style={[sh.sm,{fontWeight:'500'}]}>{val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            <Btn label="Submit another referral" variant="secondary" onPress={()=>{setShowTrack(false);openReferral();}} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, backgroundColor:'#fff', borderBottomWidth:0.5, borderBottomColor:C.g200 },
  trackBtn:      { backgroundColor:C.brandLight, borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  signInBtn:     { backgroundColor:C.g100, borderRadius:20, paddingHorizontal:14, paddingVertical:6 },
  signInText:    { fontSize:12, fontWeight:'700', color:C.g700 },
  searchBox:     { backgroundColor:'#fff', padding:16, borderBottomWidth:0.5, borderBottomColor:C.g200 },
  searchRow:     { flexDirection:'row', gap:8 },
  searchInput:   { flex:1, backgroundColor:C.g50, borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, color:C.g800, borderWidth:0.5, borderColor:C.g200 },
  searchBtn:     { backgroundColor:C.brand, borderRadius:8, paddingHorizontal:18, alignItems:'center', justifyContent:'center' },
  searchBtnText: { color:'#fff', fontWeight:'700', fontSize:14 },
  gpsBtn:        { flexDirection:'row', alignItems:'center', marginTop:10, paddingVertical:8, paddingHorizontal:4 },
  gpsActive:     { flexDirection:'row', alignItems:'center', marginTop:8, paddingHorizontal:4 },
  chip:          { paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:C.g200, backgroundColor:'#fff' },
  chipText:      { fontSize:12, fontWeight:'600', color:C.g600 },
  distBadge:     { backgroundColor:C.brandLight, borderRadius:4, paddingHorizontal:5, paddingVertical:2 },
  distBadgeText: { fontSize:10, fontWeight:'700', color:C.brand },
  requestBtn:    { backgroundColor:C.brand, borderRadius:8, padding:10, alignItems:'center', marginTop:6 },
  requestBtnText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  heroGpsBtn:    { backgroundColor:C.brand, borderRadius:10, paddingHorizontal:24, paddingVertical:14, marginTop:20 },
  heroSecondaryBtn:{ marginTop:14, paddingVertical:10 },
  expandedDetail:{ backgroundColor:C.g50, borderRadius:7, padding:10, marginBottom:8 },
  detailLabel:   { fontSize:9, fontWeight:'700', color:C.g400, letterSpacing:0.7, textTransform:'uppercase', marginBottom:4 },
  modalHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:18, borderBottomWidth:0.5, borderBottomColor:C.g200 },
  filterLabel:   { fontSize:10, fontWeight:'700', color:C.g400, letterSpacing:0.7, textTransform:'uppercase', marginBottom:8 },
  careRow:       { flexDirection:'row', alignItems:'center', gap:10, padding:12, borderRadius:8, borderWidth:1, marginBottom:6 },
  careOptRow:    { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderRadius:10, borderWidth:1 },
  urgencyOpt:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:12, borderRadius:9, borderWidth:1, marginBottom:7 },
  summary:       { backgroundColor:C.g50, borderRadius:9, padding:12, gap:5 },
  summaryLabel:  { fontSize:9, fontWeight:'700', color:C.g400, letterSpacing:0.7, marginBottom:4 },
  errBox:        { backgroundColor:C.redLight, borderRadius:8, padding:10 },
  successIcon:   { width:64, height:64, borderRadius:32, backgroundColor:C.greenLight, alignItems:'center', justifyContent:'center', marginBottom:16 },
  trackingBox:   { backgroundColor:C.brandLight, borderRadius:12, padding:18, alignItems:'center', width:'100%', borderWidth:1.5, borderColor:C.brand },
  trackingLabel: { fontSize:10, fontWeight:'700', color:C.brand, letterSpacing:0.7, marginBottom:6 },
  trackingId:    { fontSize:26, fontWeight:'800', color:C.brand, letterSpacing:3 },
  urgentNote:    { backgroundColor:C.redLight, borderRadius:10, padding:12, width:'100%' },
  trackBtn2:     { backgroundColor:C.brand, borderRadius:8, paddingHorizontal:16, alignItems:'center', justifyContent:'center' },
  statusBanner:  { flexDirection:'row', alignItems:'center', gap:14, padding:16, borderRadius:12, borderWidth:1.5 },
  progressCard:  { backgroundColor:'#fff', borderRadius:12, padding:16, borderWidth:0.5, borderColor:C.g200 },
});
