import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text, Platform } from 'react-native';
import { Recycle } from 'lucide-react-native';

export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="donor" href="/donor" asChild>
            <TabButton>Donate Food</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Shelters</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, isFocused && styles.tabButtonActive, pressed && styles.pressed]}>
      <Text style={[styles.tabButtonText, isFocused && styles.tabButtonTextActive]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Recycle size={14} color="#18352b" strokeWidth={2.5} />
          </View>
          <Text style={styles.brandText}>rescue<Text style={styles.dotText}>.</Text></Text>
        </View>

        <View style={styles.triggersRow}>
          {props.children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  innerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: 'rgba(24, 53, 43, 0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(24, 53, 43, 0.25)' } as any) : {}),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#FFA239',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  dotText: {
    color: '#FFA239',
  },
  triggersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 3,
    borderRadius: 100,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  tabButtonActive: {
    backgroundColor: '#FFA239',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
});
