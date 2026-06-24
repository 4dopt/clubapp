import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { theme } from '@/src/theme';

const TARGET_URL = 'https://order.pointone.co.uk/1956-playgolf/?qr';

const USER_AGENT = Platform.OS === 'android'
  ? 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';

// Custom CSS to inject into PointOne WebApp to match PlayGolf theme (applies on iOS/Android native WebView)
const CUSTOM_CSS = `
  /* Theme Harmonization Styles */
  :root {
    --main: #0E5A3A !important;
    --main-button-text-color: #FFFFFF !important;
    --category-bg-color: #FFFFFF !important;
    --category-text-color: #0F1B16 !important;
  }
  
  body, html {
    background-color: #F4F1EA !important;
    color: #0F1B16 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  }
  
  .container-fluid, .container, .row, .col-sm-8, .col-sm-4, .main-content {
    background-color: #F4F1EA !important;
  }
  
  /* Dining Option Selector Screen */
  .begin_grid, .begin_content {
    background-color: #F4F1EA !important;
    border: none !important;
    box-shadow: none !important;
  }
  
  /* Select inputs & date-time selection */
  .form-control, select, input, .form-group select {
    background-color: #FFFFFF !important;
    border: 1.5px solid #C6BFB2 !important;
    border-radius: 12px !important;
    color: #0F1B16 !important;
    height: 48px !important;
    font-size: 15px !important;
    font-weight: 600 !important;
  }
  
  .select_dining_row_1, .select_dining_row_2, .select_dining_row_3, .flex-drops-container {
    background-color: #FFFFFF !important;
    border: 1px solid #E0DAD0 !important;
    border-radius: 16px !important;
    padding: 14px !important;
    margin-bottom: 12px !important;
    box-shadow: 0 2px 8px rgba(74,92,84,0.04) !important;
  }
  
  /* Webapp top bar / header */
  .order_header {
    background-color: #0E5A3A !important;
    color: #FFFFFF !important;
    box-shadow: 0 2px 10px rgba(14,90,58,0.12) !important;
    border-bottom: 1px solid #093A26 !important;
  }
  
  .order_header *, .navbar-brand {
    color: #FFFFFF !important;
  }
  
  /* Menu item cards */
  .product-box, .item-box, .card, .menu-item-card, .menu_item, .fancybox-content {
    background-color: #FFFFFF !important;
    border: 1px solid #E0DAD0 !important;
    border-radius: 18px !important;
    box-shadow: 0 4px 12px rgba(74,92,84,0.05) !important;
    margin-bottom: 16px !important;
    padding: 14px !important;
  }
  
  /* Titles & Headings */
  .product-title, .title, h1, h2, h3, h4, h5, h6 {
    color: #0F1B16 !important;
    font-weight: 800 !important;
    letter-spacing: -0.3px !important;
  }
  
  .description, .product-desc, p, span, label, .text-muted {
    color: #4A5C54 !important;
  }
  
  /* Category filter pills */
  .category-link, .category-pill, .nav-link {
    background-color: #FFFFFF !important;
    border: 1px solid #E0DAD0 !important;
    color: #4A5C54 !important;
    border-radius: 20px !important;
    padding: 6px 14px !important;
    margin-right: 6px !important;
    font-weight: 700 !important;
    font-size: 13px !important;
  }
  
  .category-link.active, .category-pill.active, .nav-link.active {
    background-color: #0E5A3A !important;
    border-color: #0E5A3A !important;
    color: #FFFFFF !important;
  }
  
  /* Add / checkout action buttons */
  .btn, .btn-primary, .btn-checkout, .checkout-button, button, .btn-success, .btn_add_to_basket {
    background-color: #0E5A3A !important;
    border-color: #0E5A3A !important;
    color: #FFFFFF !important;
    border-radius: 24px !important;
    font-weight: 700 !important;
    padding: 10px 24px !important;
    font-size: 13px !important;
    letter-spacing: 0.5px !important;
  }
  
  .btn:hover, .btn-primary:hover, button:hover {
    background-color: #093A26 !important;
    border-color: #093A26 !important;
    color: #FFFFFF !important;
  }
  
  /* Warning alerts / notices */
  .alert, .alert-warning, .alert-info {
    background-color: #E1F2E6 !important;
    border: 1.5px solid #16A567 !important;
    color: #0E5A3A !important;
    border-radius: 12px !important;
  }
  
  /* Hide non-app footer components & cookie warnings */
  footer, .footer, .cookies-banner, #cookie-consent-banner, #cookie-banner {
    display: none !important;
  }
`;

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  // Injected JavaScript that appends our custom styles and redirects web logs to the React Native debugger console
  const INJECTED_JS = `
    (function() {
      // 1. Redirect Console Logging to React Native
      try {
        var originalLog = console.log;
        var originalError = console.error;
        var originalWarn = console.warn;
        
        console.log = function() {
          var args = Array.prototype.slice.call(arguments);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WEB_CONSOLE_LOG', data: args.join(' ') }));
            } catch (err) {}
          }
          originalLog.apply(console, arguments);
        };
        
        console.error = function() {
          var args = Array.prototype.slice.call(arguments);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WEB_CONSOLE_ERROR', data: args.join(' ') }));
            } catch (err) {}
          }
          originalError.apply(console, arguments);
        };

        console.warn = function() {
          var args = Array.prototype.slice.call(arguments);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WEB_CONSOLE_WARN', data: args.join(' ') }));
            } catch (err) {}
          }
          originalWarn.apply(console, arguments);
        };

        window.onerror = function(message, source, lineno, colno, error) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WEB_WINDOW_ERROR',
                data: message + ' at ' + source + ':' + lineno + ':' + colno
              }));
            } catch (err) {}
          }
          return false;
        };
        
        console.log("PointOne console redirected to native successfully.");
      } catch (e) {
        // Fail-silent
      }

      // 2. Inject Theme Customizations
      try {
        var css = ${JSON.stringify(CUSTOM_CSS)};
        function inject() {
          try {
            if (document.getElementById('p1-native-theme')) return;
            var style = document.createElement('style');
            style.id = 'p1-native-theme';
            style.type = 'text/css';
            style.innerHTML = css;
            if (document.head) {
              document.head.appendChild(style);
            } else if (document.documentElement) {
              document.documentElement.appendChild(style);
            }
          } catch (e) {
            console.error("Theme style injection error:", e);
          }
        }
        
        inject();
        
        // Watch for DOM content loaded and re-inject in case of dynamic routing/SPA
        document.addEventListener('DOMContentLoaded', inject);
        var interval = setInterval(inject, 200);
        setTimeout(function() { clearInterval(interval); }, 6000);
      } catch (err) {
        console.error("Injected theme script error:", err);
      }
    })();
    true;
  `;

  const handleBack = () => {
    if (canGoBack && webViewRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      webViewRef.current.goBack();
    }
  };

  const handleReload = () => {
    if (webViewRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      webViewRef.current.reload();
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.leftBtn}>
          {canGoBack && Platform.OS !== 'web' && (
            <Pressable
              testID="web-back-btn"
              onPress={handleBack}
              style={({ pressed }) => [styles.navIconBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={24} color={theme.color.onSurface} />
            </Pressable>
          )}
        </View>

        <Text style={styles.title}>Club Cafe</Text>

        <View style={styles.rightBtn}>
          {Platform.OS !== 'web' && (
            <Pressable
              testID="web-reload-btn"
              onPress={handleReload}
              style={({ pressed }) => [styles.navIconBtn, pressed && styles.pressed]}
            >
              <Ionicons name="refresh-outline" size={22} color={theme.color.onSurface} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main WebView / Iframe Container */}
      <View style={styles.webViewWrap}>
        {Platform.OS === 'web' ? (
          <iframe
            src={TARGET_URL}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#F4F1EA',
            }}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: TARGET_URL }}
            userAgent={USER_AGENT}
            originWhitelist={['*']}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={true}
            geolocationEnabled={true}
            mixedContentMode="always"
            injectedJavaScript={INJECTED_JS}
            injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[WebView Native Error]', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[WebView Native HTTP Error]', nativeEvent);
            }}
            onMessage={(event) => {
              try {
                const message = JSON.parse(event.nativeEvent.data);
                if (message.type === 'WEB_CONSOLE_LOG') {
                  console.log('[PointOne Log]', message.data);
                } else if (message.type === 'WEB_CONSOLE_ERROR') {
                  console.error('[PointOne Error]', message.data);
                } else if (message.type === 'WEB_CONSOLE_WARN') {
                  console.warn('[PointOne Warn]', message.data);
                } else if (message.type === 'WEB_WINDOW_ERROR') {
                  console.error('[PointOne Window Error]', message.data);
                }
              } catch {
                console.log('[WebView Msg]', event.nativeEvent.data);
              }
            }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => <View />}
          />
        )}
        
        {/* Loading Indicator Overlay (Only for native WebView) */}
        {loading && Platform.OS !== 'web' && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.color.brandPrimary} />
            <Text style={styles.loaderText}>Opening Menu...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  topBar: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
    backgroundColor: theme.color.surfaceSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  title: {
    color: theme.color.onSurface,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  leftBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightBtn: {
    width: 40,
    alignItems: 'flex-end',
  },
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  webViewWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.color.surface,
  },
  webView: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: theme.color.onSurfaceSecondary,
    fontWeight: '600',
  },
});
