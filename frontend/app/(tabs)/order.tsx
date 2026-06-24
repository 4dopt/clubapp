import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { theme } from '@/src/theme';

type MenuItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'mains' | 'sides' | 'drinks';
};

const OFFERS = [
  {
    id: 'off-burger-combo',
    title: 'Tee-Time Burger Combo',
    description: 'Double beef patty cheeseburger, crispy gold fries, and a cold draft beer.',
    originalPrice: 24.50,
    price: 18.50,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?crop=entropy&cs=srgb&fm=jpg&q=85',
    badge: 'Popular Combo',
  },
  {
    id: 'off-salad',
    title: 'Augusta Green Salad',
    description: 'Fresh organic greens, local avocados, walnuts, and house honey mustard dressing.',
    originalPrice: 15.00,
    price: 12.00,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?crop=entropy&cs=srgb&fm=jpg&q=85',
    badge: 'Healthy Choice',
  },
  {
    id: 'off-pitcher',
    title: 'Birdie Beer Pitcher',
    description: 'A cold, refreshing 64oz pitcher of our signature local craft lager for the range.',
    originalPrice: 20.00,
    price: 15.00,
    imageUrl: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?crop=entropy&cs=srgb&fm=jpg&q=85',
    badge: 'Range Classic',
  },
];

const MENU_ITEMS: MenuItem[] = [
  // Mains
  {
    id: 'item-burger',
    title: 'Classic Cheeseburger',
    description: 'Angus beef, cheddar, club sauce, lettuce, brioche bun.',
    price: 14.00,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'mains',
  },
  {
    id: 'item-tenders',
    title: 'Crispy Chicken Tenders',
    description: 'Hand-breaded tenders served with ranch or BBQ dipping sauce.',
    price: 11.50,
    imageUrl: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'mains',
  },
  {
    id: 'item-sandwich',
    title: 'Grilled Chicken Sandwich',
    description: 'Marinated chicken breast, swiss cheese, avocado mash, aioli.',
    price: 13.00,
    imageUrl: 'https://images.unsplash.com/photo-1601244000763-8a3d76ccdd27?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'mains',
  },
  // Sides
  {
    id: 'item-fries',
    title: 'Loaded Fairway Fries',
    description: 'Crispy fries topped with melted cheese sauce, bacon bits, chives.',
    price: 9.00,
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'sides',
  },
  {
    id: 'item-pretzel',
    title: 'Warm Bavarian Pretzel',
    description: 'Jumbo salted pretzel served warm with house beer cheese dip.',
    price: 7.50,
    imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'sides',
  },
  // Drinks
  {
    id: 'item-beer',
    title: 'Craft Draft Beer',
    description: 'Local IPA or light lager served ice-cold in a pint.',
    price: 6.50,
    imageUrl: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'drinks',
  },
  {
    id: 'item-latte',
    title: 'Signature Iced Latte',
    description: 'Fresh espresso, cold milk, shot of vanilla syrup, over ice.',
    price: 5.00,
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'drinks',
  },
  {
    id: 'item-soda',
    title: 'Club Soda & Lime',
    description: 'Sparkling mineral water served with fresh lime wedge.',
    price: 3.50,
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'drinks',
  },
];

export default function OrderScreen() {
  const insets = useSafeAreaInsets();

  const [fullMenuVisible, setFullMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [bayNumber, setBayNumber] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState<any | null>(null);

  const handleSelectItem = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setBayNumber('');
  };

  const handlePlaceOrder = async () => {
    if (!selectedItem) return;
    if (!bayNumber.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setOrdering(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Simulate ordering API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const id = '#PG-' + Math.floor(100 + Math.random() * 900);
    setOrderReceipt({
      id,
      itemTitle: selectedItem.title,
      price: selectedItem.price,
      bay: bayNumber,
      time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    });

    setOrdering(false);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.eyebrow}>DINING & REFRESHMENTS</Text>
            <Text style={styles.title}>Club Cafe</Text>
          </View>
          <Pressable
            testID="see-full-menu-btn"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setFullMenuVisible(true);
            }}
            style={({ pressed }) => [styles.fullMenuBtn, pressed && styles.pressed]}
          >
            <Ionicons name="restaurant-outline" size={14} color="#FFFFFF" />
            <Text style={styles.fullMenuBtnText}>See Full Menu</Text>
          </Pressable>
        </View>
        <Text style={styles.sub}>Order food & drinks delivered straight to your range bay or tee box</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + 120 }}>
        {/* Special Offers Section */}
        <Text style={styles.sectionTitle}>Special Offers</Text>
        <Text style={styles.sectionSubtitle}>Exclusive discounts for club members today</Text>

        <View style={styles.offersContainer}>
          {OFFERS.map((offer) => (
            <Pressable
              key={offer.id}
              testID={`offer-card-${offer.id}`}
              style={({ pressed }) => [styles.offerCard, pressed && styles.pressed]}
              onPress={() => handleSelectItem(offer)}
            >
              <Image source={{ uri: offer.imageUrl }} style={styles.offerImage} contentFit="cover" />
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>{offer.badge}</Text>
              </View>
              <View style={styles.offerContent}>
                <Text style={styles.offerCardTitle}>{offer.title}</Text>
                <Text style={styles.offerCardDesc} numberOfLines={2}>{offer.description}</Text>
                
                <View style={styles.offerFooter}>
                  <View style={styles.priceRow}>
                    <Text style={styles.originalPrice}>${offer.originalPrice.toFixed(2)}</Text>
                    <Text style={styles.offerPrice}>${offer.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.orderSmallBtn}>
                    <Text style={styles.orderSmallBtnText}>Add</Text>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Full Menu Modal */}
      <Modal
        visible={fullMenuVisible}
        animationType="slide"
        onRequestClose={() => setFullMenuVisible(false)}
      >
        <View style={[styles.menuModalContainer, { paddingTop: insets.top }]}>
          {/* Menu Modal Header */}
          <View style={styles.menuModalHeader}>
            <View>
              <Text style={styles.menuModalEyebrow}>PLAYGOLF DINING</Text>
              <Text style={styles.menuModalTitle}>Full Menu</Text>
            </View>
            <Pressable
              testID="close-menu-modal"
              onPress={() => setFullMenuVisible(false)}
              style={styles.menuModalCloseBtn}
            >
              <Ionicons name="close" size={24} color={theme.color.onSurface} />
            </Pressable>
          </View>

          {/* Menu Items List */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + 40 }}>
            {/* Category: Mains */}
            <Text style={styles.menuCatLabel}>BURGERS & MAINS</Text>
            <View style={styles.menuGrid}>
              {MENU_ITEMS.filter((item) => item.category === 'mains').map((item) => (
                <Pressable
                  key={item.id}
                  testID={`menu-item-${item.id}`}
                  style={({ pressed }) => [styles.menuItemCard, pressed && styles.pressed]}
                  onPress={() => handleSelectItem(item)}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.menuItemImg} contentFit="cover" />
                  <View style={styles.menuItemBody}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.menuItemFooter}>
                      <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                      <View style={styles.itemAddIcon}>
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Category: Sides */}
            <Text style={styles.menuCatLabel}>SIDES & SNACKS</Text>
            <View style={styles.menuGrid}>
              {MENU_ITEMS.filter((item) => item.category === 'sides').map((item) => (
                <Pressable
                  key={item.id}
                  testID={`menu-item-${item.id}`}
                  style={({ pressed }) => [styles.menuItemCard, pressed && styles.pressed]}
                  onPress={() => handleSelectItem(item)}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.menuItemImg} contentFit="cover" />
                  <View style={styles.menuItemBody}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.menuItemFooter}>
                      <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                      <View style={styles.itemAddIcon}>
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Category: Drinks */}
            <Text style={styles.menuCatLabel}>COLD DRINKS</Text>
            <View style={styles.menuGrid}>
              {MENU_ITEMS.filter((item) => item.category === 'drinks').map((item) => (
                <Pressable
                  key={item.id}
                  testID={`menu-item-${item.id}`}
                  style={({ pressed }) => [styles.menuItemCard, pressed && styles.pressed]}
                  onPress={() => handleSelectItem(item)}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.menuItemImg} contentFit="cover" />
                  <View style={styles.menuItemBody}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.menuItemFooter}>
                      <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                      <View style={styles.itemAddIcon}>
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Checkout Selection Modal */}
      <Modal
        visible={selectedItem !== null && !orderReceipt}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedItem(null)} />
          <View style={styles.checkoutSheet}>
            <View style={styles.modalHandle} />
            
            {selectedItem && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalEyebrow}>ADD TO ORDER</Text>
                    <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                    <Text style={styles.modalDesc}>{selectedItem.description}</Text>
                  </View>
                  <Pressable
                    testID="close-checkout-modal"
                    onPress={() => setSelectedItem(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={theme.color.onSurfaceSecondary} />
                  </Pressable>
                </View>

                {/* Delivery location input */}
                <Text style={styles.checkoutLabel}>ENTER RANGE BAY / TIER TABLE NUMBER</Text>
                <TextInput
                  testID="bay-number-input"
                  value={bayNumber}
                  onChangeText={setBayNumber}
                  placeholder="e.g. Bay 14, Table 3"
                  placeholderTextColor={theme.color.onSurfaceTertiary}
                  style={styles.bayInput}
                  autoFocus
                />

                <Pressable
                  testID="place-order-btn"
                  disabled={ordering || !bayNumber.trim()}
                  onPress={handlePlaceOrder}
                  style={({ pressed }) => [
                    styles.orderConfirmBtn,
                    (!bayNumber.trim() || ordering) && styles.disabledBtn,
                    pressed && bayNumber.trim() && { opacity: 0.9 }
                  ]}
                >
                  {ordering ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.orderConfirmBtnText}>
                        Place Order · ${(selectedItem.price).toFixed(2)}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Order Receipt Modal */}
      <Modal
        visible={orderReceipt !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setOrderReceipt(null);
          setSelectedItem(null);
          setFullMenuVisible(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setOrderReceipt(null);
            setSelectedItem(null);
            setFullMenuVisible(false);
          }}
        >
          <Pressable style={styles.receiptSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.receiptSuccessHeader}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.receiptTitle}>Order Placed Successfully!</Text>
              <Text style={styles.receiptSubtitle}>Your order will be delivered shortly</Text>
            </View>

            {orderReceipt && (
              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Order ID</Text>
                  <Text style={styles.receiptValue}>{orderReceipt.id}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Item</Text>
                  <Text style={styles.receiptValue}>{orderReceipt.itemTitle}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Price</Text>
                  <Text style={styles.receiptValue}>${orderReceipt.price.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Delivery Location</Text>
                  <Text style={styles.receiptValue}>{orderReceipt.bay}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Ordered At</Text>
                  <Text style={styles.receiptValue}>{orderReceipt.time}</Text>
                </View>
              </View>
            )}

            <Pressable
              testID="close-receipt-btn"
              onPress={() => {
                setOrderReceipt(null);
                setSelectedItem(null);
                setFullMenuVisible(false);
              }}
              style={({ pressed }) => [styles.receiptDoneBtn, pressed && { opacity: 0.95 }]}
            >
              <Text style={styles.receiptDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.color.surface,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  sub: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  fullMenuBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fullMenuBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.color.onSurface,
    marginTop: theme.spacing.lg,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    marginBottom: theme.spacing.md,
  },
  offersContainer: {
    gap: theme.spacing.lg,
  },
  offerCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  offerImage: {
    width: '100%',
    height: 160,
  },
  offerBadge: {
    position: 'absolute',
    top: 12, left: 12,
    backgroundColor: theme.color.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offerContent: {
    padding: theme.spacing.lg,
  },
  offerCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.onSurface,
    letterSpacing: -0.3,
  },
  offerCardDesc: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: theme.color.divider,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: theme.color.onSurfaceTertiary,
    textDecorationLine: 'line-through',
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.accent,
  },
  orderSmallBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  orderSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Full Menu Modal Styles
  menuModalContainer: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  menuModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  menuModalEyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '800',
  },
  menuModalTitle: {
    color: theme.color.onSurface,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  menuModalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.color.surfaceTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  menuCatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.color.brandPrimary,
    letterSpacing: 1.5,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  menuGrid: {
    gap: theme.spacing.md,
  },
  menuItemCard: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItemImg: {
    width: 100,
    height: 100,
  },
  menuItemBody: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  menuItemDesc: {
    fontSize: 11,
    color: theme.color.onSurfaceSecondary,
    lineHeight: 15,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  menuItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  itemAddIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.color.brandPrimary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Checkout overlay sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,22,0.55)',
    justifyContent: 'flex-end',
  },
  checkoutSheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  modalEyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '800',
  },
  modalTitle: {
    color: theme.color.onSurface,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.4,
  },
  modalDesc: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.color.surfaceTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkoutLabel: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  bayInput: {
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
    borderRadius: theme.radius.md,
    height: 52,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    fontWeight: '700',
    color: theme.color.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  orderConfirmBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  disabledBtn: {
    backgroundColor: theme.color.surfaceTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  orderConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Receipt Modal Styles
  receiptSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: theme.spacing.xl,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  receiptSuccessHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  successIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: theme.color.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.color.onSurface,
    textAlign: 'center',
  },
  receiptSubtitle: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  receiptDetails: {
    backgroundColor: theme.color.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  receiptDoneBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
