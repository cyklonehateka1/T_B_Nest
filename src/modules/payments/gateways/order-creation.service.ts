/**
 * Payment Service Types
 * These types are used by payment gateways for payment data
 * Updated for direct tip purchases - no longer requires account details upfront
 */

export interface MobileMoneyPaymentData {
  phoneNumber?: string; // Optional - payment gateway will collect this
  network?: string;
  currency?: string;
}

/**
 * Check if data contains mobile money payment info
 * Note: For direct tip purchases, account details are optional
 * The payment gateway will collect payment details via checkoutUrl redirect
 */
export function isMobileMoneyPaymentData(
  data: any,
): data is MobileMoneyPaymentData {
  // For tip purchases, additionalData is optional
  // If provided, it should be an object but doesn't require phoneNumber
  if (!data || typeof data !== "object") {
    return false;
  }

  // If phoneNumber is provided, validate it
  if (data.phoneNumber !== undefined) {
    return (
      typeof data.phoneNumber === "string" && data.phoneNumber.trim() !== ""
    );
  }

  // Allow empty object or object with optional fields only
  // This supports direct tip purchases where payment gateway collects details
  return true;
}
