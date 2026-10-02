export const COSMOS_GIFT_DELIVERY_KEY = "portfolio:cosmos:gifts:v2";
export const COSMOS_FINAL_GIFT_UNLOCK_KEY = "portfolio:cosmos:final-gift:v1";
export const COSMOS_FINAL_GIFT_UNLOCK_EVENT =
  "portfolio:cosmos-final-gift-unlocked";

export type CosmosGiftDeliveryState = Record<string, boolean>;

function canUseLocalStorage() {
  return typeof window !== "undefined";
}

export function areAllCosmosGiftsDelivered(
  deliveryState: CosmosGiftDeliveryState,
  requiredGiftIds: readonly string[],
) {
  return (
    requiredGiftIds.length > 0 &&
    requiredGiftIds.every((giftId) => deliveryState[giftId] === true)
  );
}

export function isCosmosFinalGiftUnlocked() {
  if (!canUseLocalStorage()) return false;

  try {
    return window.localStorage.getItem(COSMOS_FINAL_GIFT_UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

export function persistCosmosFinalGiftUnlock() {
  if (!canUseLocalStorage()) return false;

  try {
    window.localStorage.setItem(COSMOS_FINAL_GIFT_UNLOCK_KEY, "true");
    window.dispatchEvent(new Event(COSMOS_FINAL_GIFT_UNLOCK_EVENT));
    return true;
  } catch {
    return false;
  }
}
