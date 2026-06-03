import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mobileApi } from '../../src/lib/api';
import { C, sh, VAC_DOT, FTYPE } from '../../src/lib/theme';
import { TypeBadge, VacancyStatusBadge, Btn, PillFilter, Loader, EmptyState, Card } from '../../src/components';

type TypeFilter = 'all' | 'SIL' | 'SDA' | 'STA';

export default function FacilitiesScreen() {
  const [facilities,  setFacilities]  = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>('all');
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [toggling,    setToggling]    = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params: Record<string,string> = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      const res = await mobileApi.facilities.list(params);
      setFacilities(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch { /* keep stale */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleVacancy = async (facilityId: string, vacancyId: string, current: string) => {
    const next = current === 'available' ? 'occupied' : current === 'occupied' ? 'available' : 'available';
    setToggling(vacancyId);
    try {
      await mobileApi.facilities.vacancyStatus(vacancyId, next);
      setFacilities(prev => prev.map(f => {
        if (f.id !== facilityId) return f;
        return { ...f, vacancies: (f.vacancies ?? []).map((v: any) => v.id === vacancyId ? { ...v, status: next } : v) };
      }));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setToggling(null); }
  };

  const totalAvail = facilities.reduce((n, f) => n + (f.vacancies ?? []).filter((v: any) => v.status === 'available').length, 0);

  const renderFacility = ({ item: f }: { item: any }) => {
    const vacancies = f.vacancies ?? [];
    const avail = vacancies.filter((v: any) => v.status === 'available').length;
    const occ   = vacancies.filter((v: any) => v.status === 'occupied').length;
    const pct   = vacancies.length > 0 ? Math.round(occ / vacancies.length * 100) : 0;
    const isOpen = expanded === f.id;

    return (
      <View style={[s.facCard, isOpen && { borderColor: C.brand, borderWidth: 1.5 }]}>
        <TouchableOpacity onPress={() => setExpanded(isOpen ? null : f.id)} activeOpacity={0.85} style={{ padding: 14 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <View style={{ flex:1, gap:4 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <TypeBadge type={f.type} />
                <Text style={sh.xs}>{f.suburb}, {f.state}</Text>
              </View>
              <Text style={sh.h3}>{f.name}</Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={[sh.h1, { color: avail > 0 ? C.green : C.red, lineHeight:26 }]}>{avail}</Text>
              <Text style={sh.xs}>/{vacancies.length} avail.</Text>
            </View>
          </View>

          {/* Occupancy bar */}
          <View style={{ marginBottom:10 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:3 }}>
              <Text style={sh.xs}>Occupancy</Text>
              <Text style={[sh.xs, { fontWeight:'600' }]}>{pct}%</Text>
            </View>
            <View style={s.occTrack}>
              <View style={[s.occFill, { width: `${pct}%` as any }]} />
            </View>
          </View>

          {/* Vacancy dots */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, alignItems:'center' }}>
            {vacancies.slice(0,12).map((v: any) => (
              <View key={v.id} style={[s.vacDot, { backgroundColor: VAC_DOT[v.status] + '22' }]}>
                <View style={{ width:7, height:7, borderRadius:4, backgroundColor: VAC_DOT[v.status] }} />
              </View>
            ))}
            {vacancies.length > 12 && <Text style={sh.xs}>+{vacancies.length-12}</Text>}
            <Text style={[sh.xs, { marginLeft:'auto' }]}>{isOpen ? '▲ Less' : '▼ Details'}</Text>
          </View>
        </TouchableOpacity>

        {/* Expanded vacancy list */}
        {isOpen && (
          <View style={s.vacList}>
            <View style={{ height:0.5, backgroundColor:C.g200, marginBottom:10 }} />
            {vacancies.map((v: any, i: number) => (
              <View key={v.id} style={s.vacRow}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:VAC_DOT[v.status] }} />
                <View style={{ flex:1 }}>
                  <Text style={[sh.h4, { fontSize:13 }]}>{v.label ?? `Bed ${i+1}`}</Text>
                </View>
                <VacancyStatusBadge status={v.status} />
                <TouchableOpacity
                  onPress={() => toggleVacancy(f.id, v.id, v.status)}
                  disabled={toggling === v.id}
                  style={s.toggleBtn}
                >
                  <Text style={{ fontSize:11, color:C.g600, fontWeight:'500' }}>
                    {toggling === v.id ? '…' : 'Toggle'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
            {vacancies.length === 0 && <Text style={[sh.sm, { textAlign:'center', paddingVertical:12 }]}>No beds configured</Text>}
            {f.contact_phone && <Text style={[sh.xs, { marginTop:10 }]}>Tel: {f.contact_phone}</Text>}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.g50 }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={sh.h2}>Facilities</Text>
          <Text style={sh.xs}>{facilities.length} facilities · {totalAvail} beds available</Text>
        </View>
      </View>

      {/* Type filter */}
      <View style={{ backgroundColor:'#fff', paddingHorizontal:16, paddingVertical:10, borderBottomWidth:0.5, borderBottomColor:C.g200 }}>
        <PillFilter
          options={[
            { label:'All types', value:'all' as TypeFilter },
            { label:'SIL',       value:'SIL' as TypeFilter },
            { label:'SDA',       value:'SDA' as TypeFilter },
            { label:'STA',       value:'STA' as TypeFilter },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </View>

      {loading && facilities.length === 0 ? <Loader /> : (
        <FlatList
          data={facilities}
          keyExtractor={f => f.id}
          renderItem={renderFacility}
          contentContainerStyle={{ padding:16, gap:12, paddingBottom:30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.brand} />}
          ListEmptyComponent={<EmptyState icon="\u25A1" title="No facilities found" message="No facilities match your filter." />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, backgroundColor:'#fff', borderBottomWidth:0.5, borderBottomColor:C.g200 },
  facCard: { backgroundColor:'#fff', borderRadius:14, borderWidth:0.5, borderColor:C.g200, overflow:'hidden' },
  occTrack:{ height:4, backgroundColor:C.g100, borderRadius:3 },
  occFill: { height:'100%', backgroundColor:C.brand, borderRadius:3 },
  vacDot:  { width:22, height:22, borderRadius:5, alignItems:'center', justifyContent:'center' },
  vacList: { paddingHorizontal:14, paddingBottom:14 },
  vacRow:  { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:7, borderBottomWidth:0.5, borderBottomColor:C.g100 },
  toggleBtn:{ backgroundColor:C.g100, borderRadius:5, paddingHorizontal:8, paddingVertical:3 },
});
