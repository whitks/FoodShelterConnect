import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text, Platform } from 'react-native';
import { Recycle, Home as HomeIcon, PlusCircle, HeartHandshake, MapPin } from 'lucide-react-native';

export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon={HomeIcon}>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="donor" href="/donor" asChild>
            <TabButton icon={PlusCircle}>Donate</TabButton>
          </TabTrigger>
          <TabTrigger name="shelter" href="/shelter" asChild>
            <TabButton icon={HeartHandshake}>Shelters</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon={MapPin}>Explore</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, icon: Icon, ...props }: TabTriggerSlotProps & { icon?: any }) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, isFocused && styles.tabButtonActive, pressed && styles.pressed]}>
      {Icon && (
        <Icon size={16} color={isFocused ? '#18352b' : 'rgba(255, 255, 255, 0.75)'} strokeWidth={2.2} />
      )}
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
            <Recycle size={14} color="#18352b" strokeWidth={2.6} />
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
    bottom: 20,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  innerContainer: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(24, 53, 43, 0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(24, 53, 43, 0.3)' } as any) : {}),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#d7ee85',
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
    color: '#9fbd42',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 100,
  },
  tabButtonActive: {
    backgroundColor: '#d7ee85',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabButtonTextActive: {
    color: '#18352b',
    fontWeight: '800',
  },
});
