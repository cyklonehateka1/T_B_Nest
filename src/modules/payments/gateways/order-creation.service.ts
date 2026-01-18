/**
 * Order Creation Service Types
 * These types are used by payment gateways for order/payment data
 */

export interface MobileMoneyPaymentData {
  phoneNumber: string;
  network?: string;
  currency?: string;
}

export function isMobileMoneyPaymentData(
  data: any,
): data is MobileMoneyPaymentData {
  return (
    data &&
    typeof data === "object" &&
    typeof data.phoneNumber === "string" &&
    data.phoneNumber.trim() !== ""
  );
}
