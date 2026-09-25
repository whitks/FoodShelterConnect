import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle2, Camera, Sparkles, X } from 'lucide-react-native';

import { AppColors, AppRadius, AppShadows, AppSpacing } from '@/constants/theme';
import type { FoodVisionItem, DietaryTag } from '@/api/client';

const FOOD_CATEGORIES = [
  'Cooked Meals',
  'Raw Produce',
  'Bakery & Bread',
  'Packaged Snacks',
  'Dairy & Drinks',
];

const DIETARY_TAGS: DietaryTag[] = ['Veg', 'Non-Veg', 'Egg'];

type Props = {
  visible: boolean;
  photoUri: string | null;
  item: FoodVisionItem | null;
  analyzing: boolean;
  onApply: (item: FoodVisionItem) => void;
  onRetake: () => void;
  onManual: () => void;
};

export function FoodVisionResult({
  visible,
  photoUri,
  item,
  analyzing,
  onApply,
  onRetake,
  onManual,
}: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cooked Meals');
  const [dietaryTag, setDietaryTag] = useState<DietaryTag>('Veg');
  const [eggQuantity, setEggQuantity] = useState('0');

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setCategory(item.category || 'Cooked Meals');
      setDietaryTag(item.dietary_tag || 'Veg');
      setEggQuantity(String(item.egg_quantity ?? 0));
    }
  }, [item]);

  const handleApply = () => {
    const qty = parseInt(eggQuantity, 10);
    const nextItem: FoodVisionItem = {
      title: title.trim() || 'Food Item',
      category: FOOD_CATEGORIES.includes(category) ? category : 'Cooked Meals',
      food_type: dietaryTag === 'Egg' ? 'COOKED' : item?.food_type || 'COOKED',
      dietary_tag: dietaryTag,
      egg_quantity: dietaryTag === 'Egg' ? (Number.isFinite(qty) ? Math.max(0, qty) : 1) : 0,
      confidence: item?.confidence || 'MEDIUM',
      reasoning: item?.reasoning || null,
    };
    onApply(nextItem);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onRetake}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={16} color="#18352b" />
              <Text style={styles.headerTitle}>AI Food Detection</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onRetake}>
              <X size={16} color="#6c7b73" />
            </TouchableOpacity>
          </View>

          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoPreview}
              contentFit="cover"
              transition={200}
            />
          )}

          {analyzing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#18352b" />
              <Text style={styles.loadingText}>Analyzing your food photo…</Text>
              <Text style={styles.loadingSub}>
                Detecting dish, category, dietary tag & egg count
              </Text>
            </View>
          ) : item ? (
            <>
              <View style={styles.confidenceRow}>
                <View
                  style={[
                    styles.confidenceBadge,
                    item.confidence === 'HIGH' && { backgroundColor: '#e6f0c9' },
                    item.confidence === 'MEDIUM' && { backgroundColor: '#f9ddcb' },
                    item.confidence === 'LOW' && { backgroundColor: '#f6dddd' },
                  ]}>
                  <Text style={styles.confidenceText}>
                    CONFIDENCE: {item.confidence}
                  </Text>
                </View>
                {item.reasoning ? (
                  <Text style={styles.reasoningText} numberOfLines={2}>
                    {item.reasoning}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.inputLabel}>FOOD ITEM TITLE *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Mixed Veg Curry & Rotis"
                placeholderTextColor={AppColors.textMuted}
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.chipsRow}>
                {FOOD_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}>
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>DIETARY TAG</Text>
              <View style={styles.dietRow}>
                {DIETARY_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.dietChip,
                      dietaryTag === tag && styles.dietChipActive,
                      tag === 'Veg' && { backgroundColor: '#e6f0c9' },
                      tag === 'Non-Veg' && { backgroundColor: '#f9ddcb' },
                    ]}
                    onPress={() => setDietaryTag(tag)}>
                    <Text style={[styles.dietChipText, dietaryTag === tag && { fontWeight: '800' }]}>
                      {tag === 'Veg' ? '🌱 Pure Veg' : tag === 'Non-Veg' ? '🍖 Non-Veg' : '🥚 Contains Egg'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {dietaryTag === 'Egg' && (
                <>
                  <Text style={styles.inputLabel}>EGG QUANTITY *</Text>
                  <TextInput
                    style={styles.input}
                    value={eggQuantity}
                    onChangeText={(v) => setEggQuantity(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="e.g. 2"
                    placeholderTextColor={AppColors.textMuted}
                  />
                </>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onManual}>
                  <Text style={styles.secondaryBtnText}>Enter Manually</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleApply}>
                  <CheckCircle2 size={16} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Use Detected</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
                <Camera size={15} color="#18352b" />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.failedBox}>
              <Text style={styles.failedTitle}>Could not detect food details</Text>
              <Text style={styles.failedSub}>
                You can retake the photo or enter the details manually.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onManual}>
                <Text style={styles.primaryBtnText}>Enter Manually</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
                <Camera size={15} color="#18352b" />
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 53, 43, 0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: AppRadius.xl,
    borderTopRightRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    paddingBottom: 40,
    ...AppShadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AppSpacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: AppRadius.pill,
    backgroundColor: AppColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 170,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.cardAlt,
    marginBottom: AppSpacing.md,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginTop: 8,
  },
  loadingSub: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: AppSpacing.md,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AppRadius.pill,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.textPrimary,
  },
  reasoningText: {
    flex: 1,
    fontSize: 11,
    color: AppColors.textSecondary,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: AppColors.textSecondary,
    marginTop: AppSpacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: AppRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  chipActive: {
    backgroundColor: '#18352b',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  dietRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dietChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dietChipActive: {
    borderColor: '#18352b',
    borderWidth: 2,
  },
  dietChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: AppSpacing.xl,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#18352b',
    paddingVertical: 14,
    borderRadius: AppRadius.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: AppSpacing.md,
    paddingVertical: 6,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  failedBox: {
    alignItems: 'stretch',
    paddingVertical: 12,
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  failedSub: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: AppSpacing.xl,
  },
});