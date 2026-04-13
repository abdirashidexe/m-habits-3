import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

// USE_TEST_STORE is true automatically in development
// and false automatically in production builds via
// __DEV__. No manual changes needed before shipping.
const USE_TEST_STORE = __DEV__;

/**
 * Configure RevenueCat. Uses Test Store key in development when USE_TEST_STORE is true.
 * Release builds should set `EXPO_PUBLIC_REVENUE_CAT_*` (or legacy names) so Metro inlines keys.
 * @returns {void}
 */
export function initializePurchases() {
  if (USE_TEST_STORE) {
    const apiKey = process.env.EXPO_PUBLIC_RC_TEST_KEY;
    if (apiKey) {
      Purchases.configure({ apiKey });
    }
    return;
  }

  const iosApiKey =
    process.env.EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY ?? process.env.REVENUE_CAT_IOS_API_KEY;
  const androidApiKey =
    process.env.EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY ?? process.env.REVENUE_CAT_ANDROID_API_KEY;

  if (Platform.OS === 'ios' && iosApiKey) {
    Purchases.configure({ apiKey: iosApiKey });
  } else if (Platform.OS === 'android' && androidApiKey) {
    Purchases.configure({ apiKey: androidApiKey });
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function checkPlusEntitlement() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const active = customerInfo.entitlements.active['plus'];
    return active != null;
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function restorePurchases() {
  try {
    await Purchases.restorePurchases();
    return await checkPlusEntitlement();
  } catch (e) {
    if (__DEV__) {
      console.warn('restorePurchases', e);
    }
    return false;
  }
}
