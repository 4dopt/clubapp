import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useAuth } from '@/src/auth';
import { api } from '@/src/api';
import { theme } from '@/src/theme';

type MenuItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'mains' | 'sides' | 'drinks';
};

type CartItem = {
  item: MenuItem | typeof OFFERS[0];
  quantity: number;
};

type DeliveryLocation = {
  type: 'bay' | 'table';
  number: string;
};

const OFFERS = [
  {
    id: 'off-burger-combo',
    title: 'Tee-Time Burger Combo',
    description: 'Double beef patty cheeseburger, crispy gold fries, and a cold draft beer.',
    originalPrice: 24.50,
    price: 18.50,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'mains' as const,
    badge: 'Popular Combo',
  },
  {
    id: 'off-salad',
    title: 'Augusta Green Salad',
    description: 'Fresh organic greens, local avocados, walnuts, and house honey mustard dressing.',
    originalPrice: 15.00,
    price: 12.00,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'mains' as const,
    badge: 'Healthy Choice',
  },
  {
    id: 'off-pitcher',
    title: 'Birdie Beer Pitcher',
    description: 'A cold, refreshing 64oz pitcher of our signature local craft lager for the range.',
    originalPrice: 20.00,
    price: 15.00,
    imageUrl: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?crop=entropy&cs=srgb&fm=jpg&q=85',
    category: 'drinks' as const,
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
  const router = useRouter();
  const { user, token, refresh } = useAuth();

  // Navigation & Location states
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [tempLocationType, setTempLocationType] = useState<'bay' | 'table'>('bay');
  const [tempLocationNumber, setTempLocationNumber] = useState('');
  
  // Catalog filtering state
  const [activeCategory, setActiveCategory] = useState<'all' | 'offers' | 'mains' | 'sides' | 'drinks'>('all');
  
  // Shopping Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Order placement states
  const [ordering, setOrdering] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState<{
    id: string;
    items: { title: string; quantity: number; price: number }[];
    total: number;
    pointsEarned: number;
    locationLabel: string;
    time: string;
  } | null>(null);

  // Cart operations
  const handleAddToCart = (item: MenuItem | typeof OFFERS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (item: MenuItem | typeof OFFERS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id);
      if (idx === -1) return prev;
      if (prev[idx].quantity === 1) {
        return prev.filter(c => c.item.id !== item.id);
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity - 1 };
      return next;
    });
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find(c => c.item.id === itemId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Place Order integration with Supabase Points Earning
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !location || !token) return;
    setOrdering(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // 1. Calculate points: $1 spent = 10 loyalty points
      const pointsEarned = Math.round(cartTotal * 10);
      const locationLabel = location.type === 'bay' ? `Range Bay ${location.number}` : `Cafe Table ${location.number}`;
      const itemSummaries = cart.map(c => `${c.item.title} (x${c.quantity})`).join(', ');
      
      // 2. Insert transaction to Supabase
      await api.addPoints(token, pointsEarned, `Cafe Order: ${itemSummaries} (${locationLabel})`);
      
      // 3. Refresh Auth session to sync points locally
      await refresh();

      // 4. Generate Receipt
      const ordId = '#ORD-' + Math.floor(1000 + Math.random() * 9000);
      setOrderReceipt({
        id: ordId,
        items: cart.map(c => ({
          title: c.item.title,
          quantity: c.quantity,
          price: c.item.price,
        })),
        total: cartTotal,
        pointsEarned,
        locationLabel,
        time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      });

      // 5. Reset Cart & state
      setCart([]);
      setNotes('');
      setCartVisible(false);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Error placing order:', e);
    } finally {
      setOrdering(false);
    }
  };

  // Auth Guard Screen
  if (!user || !token) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.authPromptCard}>
          <View style={styles.authIconCircle}>
            <Ionicons name="restaurant-outline" size={32} color={theme.color.brandPrimary} />
          </View>
          <Text style={styles.authTitle}>Club Cafe Ordering</Text>
          <Text style={styles.authDesc}>
            Log in to your member account to browse the full menu and order refreshments delivered right to your tee box or range bay.
          </Text>
          <Pressable
            testID="order-login-redirect"
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.authBtn, pressed && styles.pressed]}
          >
            <Text style={styles.authBtnText}>Sign In / Check In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Phase 1: Location Setup Landing Screen
  if (!location) {
    const isReady = tempLocationNumber.trim().length > 0;
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.root, styles.center]}
      >
        <View style={styles.locationCard}>
          <Text style={styles.eyebrow}>DINING & REFRESHMENTS</Text>
          <Text style={styles.locationTitle}>Club Cafe</Text>
          <Text style={styles.locationSubtitle}>
            Please select your location to continue. We deliver freshly prepared food and cold drinks straight to you.
          </Text>

          <View style={styles.typeSelectorRow}>
            <Pressable
              testID="select-type-bay"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTempLocationType('bay');
              }}
              style={[
                styles.typeOption,
                tempLocationType === 'bay' && styles.typeOptionActive,
              ]}
            >
              <Ionicons
                name="golf-outline"
                size={22}
                color={tempLocationType === 'bay' ? '#FFFFFF' : theme.color.onSurfaceSecondary}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  tempLocationType === 'bay' && styles.typeOptionTextActive,
                ]}
              >
                Driving Range Bay
              </Text>
            </Pressable>

            <Pressable
              testID="select-type-table"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTempLocationType('table');
              }}
              style={[
                styles.typeOption,
                tempLocationType === 'table' && styles.typeOptionActive,
              ]}
            >
              <Ionicons
                name="cafe-outline"
                size={22}
                color={tempLocationType === 'table' ? '#FFFFFF' : theme.color.onSurfaceSecondary}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  tempLocationType === 'table' && styles.typeOptionTextActive,
                ]}
              >
                Cafe Table / Patio
              </Text>
            </Pressable>
          </View>

          <Text style={styles.inputLabel}>
            {tempLocationType === 'bay' ? 'ENTER RANGE BAY NUMBER (1-50)' : 'ENTER TABLE NUMBER (1-30)'}
          </Text>
          
          <TextInput
            testID="location-input"
            keyboardType="number-pad"
            value={tempLocationNumber}
            onChangeText={(t) => setTempLocationNumber(t.replace(/[^0-9]/g, ''))}
            placeholder={tempLocationType === 'bay' ? 'e.g. 14' : 'e.g. 5'}
            placeholderTextColor={theme.color.onSurfaceTertiary}
            style={styles.locationInput}
          />

          <Pressable
            testID="start-ordering-btn"
            disabled={!isReady}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setLocation({ type: tempLocationType, number: tempLocationNumber });
            }}
            style={({ pressed }) => [
              styles.locationSubmitBtn,
              !isReady && styles.disabledBtn,
              pressed && isReady && styles.pressed,
            ]}
          >
            <Text style={styles.locationSubmitBtnText}>Enter Cafe Menu</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Phase 2: Menu Catalog Screen
  const filteredMains = MENU_ITEMS.filter(item => item.category === 'mains');
  const filteredSides = MENU_ITEMS.filter(item => item.category === 'sides');
  const filteredDrinks = MENU_ITEMS.filter(item => item.category === 'drinks');

  return (
    <View style={styles.root}>
      {/* Top Navbar */}
      <View style={[styles.navbar, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.navHeaderRow}>
          <View>
            <Text style={styles.navbarEyebrow}>PLAYGOLF AUGUSTA</Text>
            <Text style={styles.navbarTitle}>Club Cafe</Text>
          </View>
          <Pressable
            testID="change-location-btn"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setLocation(null);
            }}
            style={styles.locationBadge}
          >
            <Ionicons
              name={location.type === 'bay' ? 'golf' : 'cafe'}
              size={12}
              color={theme.color.brandPrimary}
            />
            <Text style={styles.locationBadgeText}>
              {location.type === 'bay' ? `Bay ${location.number}` : `Table ${location.number}`}
            </Text>
            <Ionicons name="create-outline" size={11} color={theme.color.brandPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Category Pills Bar */}
      <View style={styles.categoriesBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <Pressable
            testID="cat-all"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveCategory('all');
            }}
            style={[styles.catPill, activeCategory === 'all' && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, activeCategory === 'all' && styles.catPillTextActive]}>
              All Items
            </Text>
          </Pressable>

          <Pressable
            testID="cat-offers"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveCategory('offers');
            }}
            style={[styles.catPill, activeCategory === 'offers' && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, activeCategory === 'offers' && styles.catPillTextActive]}>
              ⚡ Special Offers
            </Text>
          </Pressable>

          <Pressable
            testID="cat-mains"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveCategory('mains');
            }}
            style={[styles.catPill, activeCategory === 'mains' && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, activeCategory === 'mains' && styles.catPillTextActive]}>
              Burgers & Mains
            </Text>
          </Pressable>

          <Pressable
            testID="cat-sides"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveCategory('sides');
            }}
            style={[styles.catPill, activeCategory === 'sides' && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, activeCategory === 'sides' && styles.catPillTextActive]}>
              Sides & Snacks
            </Text>
          </Pressable>

          <Pressable
            testID="cat-drinks"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveCategory('drinks');
            }}
            style={[styles.catPill, activeCategory === 'drinks' && styles.catPillActive]}
          >
            <Text style={[styles.catPillText, activeCategory === 'drinks' && styles.catPillTextActive]}>
              Beverages
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Catalog items list */}
      <ScrollView
        contentContainerStyle={[
          styles.catalogScroll,
          { paddingBottom: (Platform.OS === 'ios' ? 84 : 64) + 110 },
        ]}
      >
        
        {/* Special Offers Section */}
        {(activeCategory === 'all' || activeCategory === 'offers') && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>Augusta Specials</Text>
            <Text style={styles.sectionSub}>Exclusive pricing for members checking in today</Text>
            
            <View style={styles.offersList}>
              {OFFERS.map((offer) => {
                const qty = getItemQuantity(offer.id);
                return (
                  <View key={offer.id} style={styles.offerCard}>
                    <Image source={{ uri: offer.imageUrl }} style={styles.offerCardImg} contentFit="cover" />
                    <View style={styles.offerCardBadge}>
                      <Text style={styles.offerCardBadgeText}>{offer.badge}</Text>
                    </View>
                    <View style={styles.offerCardBody}>
                      <Text style={styles.offerCardTitle}>{offer.title}</Text>
                      <Text style={styles.offerCardDesc}>{offer.description}</Text>
                      
                      <View style={styles.offerCardFooter}>
                        <View style={styles.priceContainer}>
                          <Text style={styles.originalPriceText}>${offer.originalPrice.toFixed(2)}</Text>
                          <Text style={styles.priceText}>${offer.price.toFixed(2)}</Text>
                        </View>

                        {qty === 0 ? (
                          <Pressable
                            testID={`add-offer-${offer.id}`}
                            onPress={() => handleAddToCart(offer)}
                            style={styles.addBtn}
                          >
                            <Text style={styles.addBtnText}>Add</Text>
                            <Ionicons name="add" size={14} color="#FFFFFF" />
                          </Pressable>
                        ) : (
                          <View style={styles.qtyControl}>
                            <Pressable
                              testID={`remove-offer-${offer.id}`}
                              onPress={() => handleRemoveFromCart(offer)}
                              style={styles.qtyBtn}
                            >
                              <Ionicons name="remove" size={14} color={theme.color.brandPrimary} />
                            </Pressable>
                            <Text style={styles.qtyText}>{qty}</Text>
                            <Pressable
                              testID={`add-offer-more-${offer.id}`}
                              onPress={() => handleAddToCart(offer)}
                              style={styles.qtyBtn}
                            >
                              <Ionicons name="add" size={14} color={theme.color.brandPrimary} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Mains Section */}
        {(activeCategory === 'all' || activeCategory === 'mains') && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>Burgers & Mains</Text>
            <View style={styles.menuItemsList}>
              {filteredMains.map((item) => {
                const qty = getItemQuantity(item.id);
                return (
                  <View key={item.id} style={styles.menuItemRow}>
                    <Image source={{ uri: item.imageUrl }} style={styles.menuItemImg} contentFit="cover" />
                    <View style={styles.menuItemBody}>
                      <View>
                        <Text style={styles.menuItemTitle}>{item.title}</Text>
                        <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                      </View>
                      <View style={styles.menuItemFooter}>
                        <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                        
                        {qty === 0 ? (
                          <Pressable
                            testID={`add-item-${item.id}`}
                            onPress={() => handleAddToCart(item)}
                            style={styles.menuAddBtn}
                          >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                          </Pressable>
                        ) : (
                          <View style={styles.menuQtyControl}>
                            <Pressable
                              testID={`remove-item-${item.id}`}
                              onPress={() => handleRemoveFromCart(item)}
                              style={styles.menuQtyBtn}
                            >
                              <Ionicons name="remove" size={12} color={theme.color.brandPrimary} />
                            </Pressable>
                            <Text style={styles.menuQtyText}>{qty}</Text>
                            <Pressable
                              testID={`add-item-more-${item.id}`}
                              onPress={() => handleAddToCart(item)}
                              style={styles.menuQtyBtn}
                            >
                              <Ionicons name="add" size={12} color={theme.color.brandPrimary} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Sides Section */}
        {(activeCategory === 'all' || activeCategory === 'sides') && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>Sides & Snacks</Text>
            <View style={styles.menuItemsList}>
              {filteredSides.map((item) => {
                const qty = getItemQuantity(item.id);
                return (
                  <View key={item.id} style={styles.menuItemRow}>
                    <Image source={{ uri: item.imageUrl }} style={styles.menuItemImg} contentFit="cover" />
                    <View style={styles.menuItemBody}>
                      <View>
                        <Text style={styles.menuItemTitle}>{item.title}</Text>
                        <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                      </View>
                      <View style={styles.menuItemFooter}>
                        <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                        
                        {qty === 0 ? (
                          <Pressable
                            testID={`add-item-${item.id}`}
                            onPress={() => handleAddToCart(item)}
                            style={styles.menuAddBtn}
                          >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                          </Pressable>
                        ) : (
                          <View style={styles.menuQtyControl}>
                            <Pressable
                              testID={`remove-item-${item.id}`}
                              onPress={() => handleRemoveFromCart(item)}
                              style={styles.menuQtyBtn}
                            >
                              <Ionicons name="remove" size={12} color={theme.color.brandPrimary} />
                            </Pressable>
                            <Text style={styles.menuQtyText}>{qty}</Text>
                            <Pressable
                              testID={`add-item-more-${item.id}`}
                              onPress={() => handleAddToCart(item)}
                              style={styles.menuQtyBtn}
                            >
                              <Ionicons name="add" size={12} color={theme.color.brandPrimary} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Drinks Section */}
        {(activeCategory === 'all' || activeCategory === 'drinks') && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeading}>Beverages</Text>
            <View style={styles.menuItemsList}>
              {filteredDrinks.map((item) => {
                const qty = getItemQuantity(item.id);
                return (
                  <View key={item.id} style={styles.menuItemRow}>
                    <Image source={{ uri: item.imageUrl }} style={styles.menuItemImg} contentFit="cover" />
                    <View style={styles.menuItemBody}>
                      <View>
                        <Text style={styles.menuItemTitle}>{item.title}</Text>
                        <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                      </View>
                      <View style={styles.menuItemFooter}>
                        <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                        
                        {qty === 0 ? (
                          <Pressable
                            testID={`add-item-${item.id}`}
                            onPress={() => handleAddToCart(item)}
                            style={styles.menuAddBtn}
                          >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                          </Pressable>
                        ) : (
                          <View style={styles.menuQtyControl}>
                            <Pressable
                              testID={`remove-item-${item.id}`}
                              onPress={() => handleRemoveFromCart(item)}
                              style={styles.menuQtyBtn}
                            >
                              <Ionicons name="remove" size={12} color={theme.color.brandPrimary} />
                            </Pressable>
                            <Text style={styles.menuQtyText}>{qty}</Text>
                            <Pressable
                              testID={`add-item-more-${item.id}`}
                              onPress={() => handleAddToCart(item)}
                              style={styles.menuQtyBtn}
                            >
                              <Ionicons name="add" size={12} color={theme.color.brandPrimary} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <View
          style={[
            styles.floatingCartContainer,
            { bottom: (Platform.OS === 'ios' ? 84 : 64) + theme.spacing.sm },
          ]}
        >
          <Pressable
            testID="view-cart-btn"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setCartVisible(true);
            }}
            style={({ pressed }) => [styles.floatingCartBar, pressed && styles.pressed]}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.cartIconCircle}>
                <Ionicons name="basket" size={18} color={theme.color.brandPrimary} />
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                </View>
              </View>
              <Text style={styles.floatingCartText}>View Basket</Text>
            </View>
            <Text style={styles.floatingCartTotal}>${cartTotal.toFixed(2)}</Text>
          </Pressable>
        </View>
      )}

      {/* Cart Basket Checkout Modal */}
      <Modal
        visible={cartVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCartVisible(false)} />
          <View style={[styles.checkoutSheet, { paddingBottom: insets.bottom + theme.spacing.xl }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalEyebrow}>YOUR BASKET</Text>
                <Text style={styles.modalTitle}>Order Details</Text>
              </View>
              <Pressable
                testID="close-cart-modal"
                onPress={() => setCartVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={theme.color.onSurfaceSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.checkoutItemsScroll} showsVerticalScrollIndicator={false}>
              {cart.map((cartItem) => (
                <View key={cartItem.item.id} style={styles.checkoutItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkoutItemTitle}>{cartItem.item.title}</Text>
                    <Text style={styles.checkoutItemPrice}>${cartItem.item.price.toFixed(2)} each</Text>
                  </View>

                  <View style={styles.cartModalQtyControl}>
                    <Pressable
                      testID={`remove-item-modal-${cartItem.item.id}`}
                      onPress={() => handleRemoveFromCart(cartItem.item)}
                      style={styles.cartModalQtyBtn}
                    >
                      <Ionicons name="remove" size={12} color={theme.color.brandPrimary} />
                    </Pressable>
                    <Text style={styles.cartModalQtyText}>{cartItem.quantity}</Text>
                    <Pressable
                      testID={`add-item-modal-${cartItem.item.id}`}
                      onPress={() => handleAddToCart(cartItem.item)}
                      style={styles.cartModalQtyBtn}
                    >
                      <Ionicons name="add" size={12} color={theme.color.brandPrimary} />
                    </Pressable>
                  </View>

                  <Text style={styles.checkoutItemSubtotal}>
                    ${(cartItem.item.price * cartItem.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />

              {/* Delivery Details */}
              <View style={styles.deliveryDetailsRow}>
                <View style={styles.deliveryDetailIcon}>
                  <Ionicons name={location.type === 'bay' ? 'golf' : 'cafe'} size={18} color={theme.color.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveryDetailLabel}>Delivering To</Text>
                  <Text style={styles.deliveryDetailValue}>
                    {location.type === 'bay' ? `Range Bay ${location.number}` : `Cafe Patio Table ${location.number}`}
                  </Text>
                </View>
              </View>

              {/* Instructions input */}
              <Text style={styles.checkoutLabel}>SPECIAL COOKING OR DELIVERY NOTES</Text>
              <TextInput
                testID="order-notes-input"
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. No ice in drink, extra salad dressing..."
                placeholderTextColor={theme.color.onSurfaceTertiary}
                style={styles.notesInput}
                multiline
                numberOfLines={3}
              />

              {/* Loyalty Reward Preview */}
              <View style={styles.loyaltyEarnBadge}>
                <Ionicons name="ribbon-outline" size={18} color={theme.color.brandPrimary} />
                <Text style={styles.loyaltyEarnText}>
                  Loyalty Points Earning: <Text style={styles.loyaltyEarnHighlight}>+{Math.round(cartTotal * 10)} pts</Text>
                </Text>
              </View>
            </ScrollView>

            <View style={styles.checkoutSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${cartTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValueFree}>FREE</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 4 }]}>
                <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                <Text style={styles.summaryTotalValue}>${cartTotal.toFixed(2)}</Text>
              </View>
            </View>

            <Pressable
              testID="place-order-basket-btn"
              disabled={ordering}
              onPress={handlePlaceOrder}
              style={({ pressed }) => [
                styles.orderConfirmBtn,
                ordering && styles.disabledBtn,
                pressed && { opacity: 0.9 }
              ]}
            >
              {ordering ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.orderConfirmBtnText}>
                    Place Order & Pay
                  </Text>
                  <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Receipt Modal */}
      <Modal
        visible={orderReceipt !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderReceipt(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOrderReceipt(null)}>
          <Pressable style={styles.receiptSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.receiptSuccessHeader}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.receiptTitle}>Order Confirmed!</Text>
              <Text style={styles.receiptSubtitle}>Delivering fresh to your location shortly</Text>
            </View>

            {orderReceipt && (
              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Order ID</Text>
                  <Text style={styles.receiptValue}>{orderReceipt.id}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Destination</Text>
                  <Text style={styles.receiptValue}>{orderReceipt.locationLabel}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Ordered At</Text>
                  <Text style={styles.receiptValue}>{orderReceipt.time}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Paid</Text>
                  <Text style={styles.receiptValue}>${orderReceipt.total.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Loyalty Points</Text>
                  <Text style={styles.receiptValuePoints}>+{orderReceipt.pointsEarned} pts</Text>
                </View>

                <View style={styles.divider} />
                
                <Text style={styles.receiptEstimatedTitle}>ESTIMATED DELIVERY TIME</Text>
                <Text style={styles.receiptEstimatedTimer}>10 - 15 minutes</Text>
              </View>
            )}

            <Pressable
              testID="close-receipt-btn"
              onPress={() => setOrderReceipt(null)}
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
  center: { justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  pressed: { opacity: 0.95, transform: [{ scale: 0.98 }] },
  divider: { height: 1, backgroundColor: theme.color.border, marginVertical: theme.spacing.md },

  // Auth Guard Screen Styles
  authPromptCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  authIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E9F5EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.color.onSurface,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.xs,
  },
  authDesc: {
    fontSize: 13,
    color: theme.color.onSurfaceSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: theme.spacing.xl,
  },
  authBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  authBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Location Card Setup Screen Styles
  locationCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  eyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '800',
    textAlign: 'center',
  },
  locationTitle: {
    color: theme.color.onSurface,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  locationSubtitle: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.xl,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  typeOption: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  typeOptionActive: {
    backgroundColor: theme.color.brandPrimary,
    borderColor: theme.color.brandPrimary,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.onSurfaceSecondary,
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  inputLabel: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  locationInput: {
    backgroundColor: theme.color.surface,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  locationSubmitBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  locationSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: theme.color.surfaceTertiary,
    opacity: 0.6,
  },

  // Menu Screen Styles
  navbar: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.color.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  navHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navbarEyebrow: {
    color: theme.color.brandPrimary,
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  navbarTitle: {
    color: theme.color.onSurface,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  locationBadge: {
    backgroundColor: '#E9F5EF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderColor: '#D0EAE0',
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.brandPrimary,
  },
  categoriesBar: {
    backgroundColor: theme.color.surface,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  categoryScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  catPill: {
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
  },
  catPillActive: {
    backgroundColor: theme.color.brandPrimary,
    borderColor: theme.color.brandPrimary,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.onSurfaceSecondary,
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },

  // Catalog Scroll Wrappers
  catalogScroll: {
    backgroundColor: theme.color.surface,
  },
  sectionWrap: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.onSurface,
    letterSpacing: -0.4,
  },
  sectionSub: {
    fontSize: 11,
    color: theme.color.onSurfaceSecondary,
    marginBottom: theme.spacing.md,
  },

  // Special Offers List
  offersList: {
    gap: theme.spacing.md,
  },
  offerCard: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  offerCardImg: {
    width: '100%',
    height: 140,
  },
  offerCardBadge: {
    position: 'absolute',
    top: 12, left: 12,
    backgroundColor: theme.color.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offerCardBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offerCardBody: {
    padding: theme.spacing.md,
  },
  offerCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.color.onSurface,
  },
  offerCardDesc: {
    fontSize: 11,
    color: theme.color.onSurfaceSecondary,
    lineHeight: 16,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  offerCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: theme.color.border,
    paddingTop: theme.spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  originalPriceText: {
    fontSize: 11,
    color: theme.color.onSurfaceTertiary,
    textDecorationLine: 'line-through',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.color.accent,
  },
  addBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9F5EF',
    borderWidth: 1,
    borderColor: '#D0EAE0',
    borderRadius: 12,
    height: 28,
  },
  qtyBtn: {
    width: 28,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.color.brandPrimary,
    minWidth: 16,
    textAlign: 'center',
  },

  // Mains, Sides, Drinks Item Row Styles
  menuItemsList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  menuItemRow: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItemImg: {
    width: 90,
    height: 90,
  },
  menuItemBody: {
    flex: 1,
    padding: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  menuItemDesc: {
    fontSize: 10.5,
    color: theme.color.onSurfaceSecondary,
    lineHeight: 14,
    marginTop: 2,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  menuAddBtn: {
    backgroundColor: theme.color.brandPrimary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9F5EF',
    borderWidth: 0.5,
    borderColor: '#D0EAE0',
    borderRadius: 8,
    height: 24,
  },
  menuQtyBtn: {
    width: 24,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuQtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.color.brandPrimary,
    minWidth: 12,
    textAlign: 'center',
  },

  // Floating Bottom Cart Styles
  floatingCartContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  floatingCartBar: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4, right: -4,
    backgroundColor: theme.color.accent,
    width: 16, height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  floatingCartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  floatingCartTotal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Cart/Checkout Drawer Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 27, 22, 0.55)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  checkoutSheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
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
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.color.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutItemsScroll: {
    maxHeight: 280,
  },
  checkoutItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  checkoutItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  checkoutItemPrice: {
    fontSize: 11,
    color: theme.color.onSurfaceSecondary,
    marginTop: 1,
  },
  checkoutItemSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.onSurface,
    minWidth: 50,
    textAlign: 'right',
  },
  cartModalQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9F5EF',
    borderWidth: 0.5,
    borderColor: '#D0EAE0',
    borderRadius: 8,
    height: 24,
  },
  cartModalQtyBtn: {
    width: 24,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartModalQtyText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.color.brandPrimary,
    minWidth: 14,
    textAlign: 'center',
  },
  deliveryDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  deliveryDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  deliveryDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.color.onSurfaceSecondary,
  },
  deliveryDetailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.color.onSurface,
  },
  checkoutLabel: {
    color: theme.color.onSurfaceSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  notesInput: {
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    borderRadius: 12,
    padding: theme.spacing.md,
    fontSize: 13,
    fontWeight: '600',
    color: theme.color.onSurface,
    textAlignVertical: 'top',
    height: 60,
    marginBottom: theme.spacing.md,
  },
  loyaltyEarnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF6EF',
    borderColor: '#D4ECE0',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  loyaltyEarnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  loyaltyEarnHighlight: {
    color: theme.color.brandPrimary,
    fontWeight: '800',
  },
  checkoutSummary: {
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    marginBottom: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.color.onSurfaceSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    color: theme.color.onSurface,
    fontWeight: '700',
  },
  summaryValueFree: {
    fontSize: 11,
    color: theme.color.brandPrimary,
    fontWeight: '800',
  },
  summaryTotalLabel: {
    fontSize: 13,
    color: theme.color.onSurface,
    fontWeight: '800',
  },
  summaryTotalValue: {
    fontSize: 15,
    color: theme.color.accent,
    fontWeight: '800',
  },
  orderConfirmBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: theme.color.brandPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  orderConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Receipt Modal Styles
  receiptSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: theme.spacing.xl,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  receiptSuccessHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  successIconCircle: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  receiptTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.color.onSurface,
    textAlign: 'center',
  },
  receiptSubtitle: {
    fontSize: 11.5,
    color: theme.color.onSurfaceSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  receiptDetails: {
    backgroundColor: theme.color.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11.5,
    color: theme.color.onSurfaceSecondary,
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.onSurface,
  },
  receiptValuePoints: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.color.brandPrimary,
  },
  receiptEstimatedTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.color.onSurfaceSecondary,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  receiptEstimatedTimer: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.accent,
    textAlign: 'center',
    marginTop: 2,
  },
  receiptDoneBtn: {
    backgroundColor: theme.color.brandPrimary,
    borderRadius: theme.radius.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
