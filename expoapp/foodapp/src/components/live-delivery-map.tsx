/**
 * LiveDeliveryMap
 * Full delivery-tracker component:
 *  matching  → spinner (no driver yet)
 *  assigned  → driver spawns at donor location and starts moving
 *  picked    → driver has picked up and continues toward shelter
 *  delivered → trip complete, celebration screen
 *
 * Shortest shelter is picked by Haversine distance from the donor coords.
 * Route is built as a Quadratic Bezier curve (no API key required).
 * Driver icon moves step-by-step along that curve every 400 ms.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  Bike,
  CheckCircle2,
  HeartHandshake,
  MapPin,
} from 'lucide-react-native';

// ─── Geometry helpers ────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type LatLng = { latitude: number; longitude: number };

function buildBezierRoute(origin: LatLng, dest: LatLng, steps = 40): LatLng[] {
  const mid = {
    latitude: (origin.latitude + dest.latitude) / 2,
    longitude: (origin.longitude + dest.longitude) / 2,
  };
  const dx = dest.longitude - origin.longitude;
  const dy = dest.latitude - origin.latitude;
  const k = 0.015;
  const ctrl = { latitude: mid.latitude - dx * k, longitude: mid.longitude + dy * k };

  const pts: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      latitude:
        (1 - t) ** 2 * origin.latitude +
        2 * (1 - t) * t * ctrl.latitude +
        t ** 2 * dest.latitude,
      longitude:
        (1 - t) ** 2 * origin.longitude +
        2 * (1 - t) * t * ctrl.longitude +
        t ** 2 * dest.longitude,
    });
  }
  return pts;
}

// ─── Default shelter list (Bengaluru) ────────────────────────────────────────

const SHELTERS = [
  { id: 's1', name: 'Harbor House NGO',    latitude: 12.9716, longitude: 77.5946 },
  { id: 's2', name: 'City Care Shelter',   latitude: 12.9352, longitude: 77.6245 },
  { id: 's3', name: 'Sunshine Foundation', latitude: 12.9950, longitude: 77.5700 },
  { id: 's4', name: 'Green Hope NGO',      latitude: 12.9610, longitude: 77.6410 },
];

export function findNearestShelter(donorLat: number, donorLng: number) {
  return SHELTERS.reduce((best, s) => {
    const d = haversineKm(donorLat, donorLng, s.latitude, s.longitude);
    const bd = haversineKm(donorLat, donorLng, best.latitude, best.longitude);
    return d < bd ? s : best;
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  donorLat?: number;
  donorLng?: number;
  donorName?: string;
  shelterLat?: number;
  shelterLng?: number;
  shelterName?: string;
  /** 'matching' | 'assigned' | 'picked' | 'delivered' */
  status: 'matching' | 'assigned' | 'picked' | 'delivered';
  driverName?: string;
}

const DRIVER_NAMES = ['Amara Singh', 'Ravi Patel', 'Priya Nair', 'Dev Kumar'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveDeliveryMap({
  donorLat = 12.9784,
  donorLng = 77.6408,
  donorName = 'Your Kitchen',
  shelterLat,
  shelterLng,
  shelterName,
  status,
  driverName,
}: Props) {
  const nearest = findNearestShelter(donorLat, donorLng);
  const destLat = shelterLat ?? nearest.latitude;
  const destLng = shelterLng ?? nearest.longitude;
  const destName = shelterName ?? nearest.name;
  const driver = driverName ?? DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)];

  const route = buildBezierRoute(
    { latitude: donorLat, longitude: donorLng },
    { latitude: destLat, longitude: destLng },
  );

  const distKm = haversineKm(donorLat, donorLng, destLat, destLng);
  const [driverIdx, setDriverIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When status moves to 'assigned' or 'picked' start / continue the animation
  useEffect(() => {
    if (status === 'matching' || status === 'delivered') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (status === 'delivered') setDriverIdx(route.length - 1);
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDriverIdx((prev) => {
        if (prev >= route.length - 1) {
          clearInterval(intervalRef.current!);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    return () => clearInterval(intervalRef.current!);
  }, [status, route.length]);

  const driverPos = route[Math.min(driverIdx, route.length - 1)];
  const progressPct = Math.round((driverIdx / (route.length - 1)) * 100);
  const etaMin = Math.max(1, Math.round(distKm * 3 * (1 - driverIdx / route.length)));

  const midLat = (donorLat + destLat) / 2;
  const midLng = (donorLng + destLng) / 2;
  const latDelta = Math.abs(donorLat - destLat) * 1.8 + 0.015;
  const lngDelta = Math.abs(donorLng - destLng) * 1.8 + 0.015;

  // ── Web fallback ────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <View style={styles.webRow}>
          <MapPin size={14} color="#9fbd42" />
          <Text style={styles.webTitle}>{donorName} → {destName}</Text>
        </View>
        <Text style={styles.webSub}>
          {distKm.toFixed(1)} km · {status === 'delivered' ? 'Delivered ✓' : `ETA ~${etaMin} min`}
        </Text>
      </View>
    );
  }

  // ── Delivered state ─────────────────────────────────────────────────────
  if (status === 'delivered') {
    return (
      <View style={styles.deliveredBox}>
        <CheckCircle2 size={40} color="#91bc48" />
        <Text style={styles.deliveredTitle}>Food Delivered!</Text>
        <Text style={styles.deliveredSub}>
          Successfully delivered to {destName}
        </Text>
        <View style={styles.deliveredMeta}>
          <Text style={styles.deliveredMetaText}>Driver: {driver}</Text>
          <Text style={styles.deliveredMetaText}>{distKm.toFixed(1)} km covered</Text>
        </View>
      </View>
    );
  }

  // ── Matching state ──────────────────────────────────────────────────────
  if (status === 'matching') {
    return (
      <View style={styles.container}>
        <View style={styles.statusBar}>
          <View style={styles.dotOrange} />
          <Text style={styles.statusText}>Finding nearest volunteer driver…</Text>
        </View>
        <View style={styles.matchingBody}>
          <ActivityIndicator color="#9fbd42" size="large" />
          <Text style={styles.matchingTitle}>Matching algorithm running</Text>
          <Text style={styles.matchingSub}>
            Nearest shelter: {destName} ({distKm.toFixed(1)} km)
          </Text>
        </View>
        <View style={styles.routeStrip}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#dd835d' }]} />
            <Text style={styles.routePointText} numberOfLines={1}>{donorName}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#5c9686' }]} />
            <Text style={styles.routePointText} numberOfLines={1}>{destName}</Text>
          </View>
          <Text style={styles.distText}>{distKm.toFixed(1)} km</Text>
        </View>
      </View>
    );
  }

  // ── Assigned / Picked state — live map ──────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Top status bar */}
      <View style={styles.statusBar}>
        <View style={styles.dotGreen} />
        <Text style={styles.statusText}>
          {status === 'picked'
            ? `${driver} picked up · heading to shelter`
            : `${driver} en route to your location`}
        </Text>
        <View style={styles.etaBadge}>
          <Text style={styles.etaText}>~{etaMin} min</Text>
        </View>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        showsCompass={false}
      >
        {/* Remaining route */}
        <Polyline
          coordinates={route}
          strokeColor="#c8dba8"
          strokeWidth={3}
          lineDashPattern={[6, 6]}
        />
        {/* Completed path */}
        <Polyline
          coordinates={route.slice(0, driverIdx + 1)}
          strokeColor="#9fbd42"
          strokeWidth={4}
        />

        {/* Donor pin */}
        <Marker coordinate={{ latitude: donorLat, longitude: donorLng }} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.donorPin}><MapPin size={13} color="#fff" /></View>
        </Marker>

        {/* Shelter pin */}
        <Marker coordinate={{ latitude: destLat, longitude: destLng }} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.shelterPin}><HeartHandshake size={13} color="#fff" /></View>
        </Marker>

        {/* Moving driver */}
        <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.driverPin}><Bike size={16} color="#18352b" /></View>
        </Marker>
      </MapView>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
      </View>

      {/* Route info strip */}
      <View style={styles.routeStrip}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#dd835d' }]} />
          <Text style={styles.routePointText} numberOfLines={1}>{donorName}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#5c9686' }]} />
          <Text style={styles.routePointText} numberOfLines={1}>{destName}</Text>
        </View>
        <Text style={styles.distText}>{distKm.toFixed(1)} km</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dce2d8',
    backgroundColor: '#f4f2eb',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18352b',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#91bc48' },
  dotOrange: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dd835d' },
  etaBadge: {
    backgroundColor: '#d7ee85',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  etaText: { color: '#18352b', fontWeight: '800', fontSize: 11 },
  map: { height: 210, width: '100%' },
  progressContainer: {
    height: 4,
    backgroundColor: '#dce2d8',
    width: '100%',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#9fbd42',
  },
  routeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f7f7f2',
    gap: 8,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  routeDot: { width: 9, height: 9, borderRadius: 5 },
  routePointText: { fontSize: 11, fontWeight: '600', color: '#18352b', flex: 1 },
  routeLine: { width: 24, height: 1, backgroundColor: '#aab6a7' },
  distText: { fontSize: 11, fontWeight: '800', color: '#9fbd42' },
  // pins
  donorPin: {
    backgroundColor: '#dd835d',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  shelterPin: {
    backgroundColor: '#5c9686',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverPin: {
    backgroundColor: '#d7ee85',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2.5,
    borderColor: '#18352b',
  },
  // matching
  matchingBody: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f2eb',
    gap: 12,
  },
  matchingTitle: { fontSize: 14, fontWeight: '700', color: '#18352b' },
  matchingSub: { fontSize: 12, color: '#607169' },
  // delivered
  deliveredBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef6d4',
    borderRadius: 18,
    padding: 28,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#c6dea0',
  },
  deliveredTitle: { fontSize: 20, fontWeight: '800', color: '#18352b', marginTop: 6 },
  deliveredSub: { fontSize: 13, color: '#4a7c60', textAlign: 'center' },
  deliveredMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    backgroundColor: '#d7ee85',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  deliveredMetaText: { fontSize: 12, fontWeight: '700', color: '#18352b' },
  // web fallback
  webFallback: {
    backgroundColor: '#eef6d4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c6dea0',
    marginBottom: 12,
    gap: 4,
  },
  webRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  webTitle: { fontSize: 13, fontWeight: '700', color: '#18352b' },
  webSub: { fontSize: 12, color: '#607169' },
});
