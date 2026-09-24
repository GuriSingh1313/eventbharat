// Order Card: mirrors the broker order screen field-by-field. Never places orders.
import { inr } from './format';
import { isOnTick, round2, toTick } from './money';

export type Intent = 'sell' | 'buy' | 'stoploss' | 'target';

export interface OrderInput {
  intent: Intent;
  ltp: number;
  qty: number;
  heldQty: number; // 0 if not holding
  avgPrice: number; // 0 if not holding
  price?: number; // limit price for buy / sell / target
  trigger?: number; // stop-loss trigger
  limit?: number; // stop-loss limit
  target?: number; // optional target for P&L preview on buy/stoploss
}

export interface OrderField {
  key: 'side' | 'product' | 'type' | 'trigger' | 'limit' | 'qty' | 'validity';
  label: string;
  value: string;
  copy?: string; // raw value for the copy button
}

export interface OrderCard {
  fields: OrderField[];
  errors: string[];
  warnings: string[];
  explanation: string;
  pnlAtTrigger: number | null;
  pnlAtTarget: number | null;
}

/** Sensible defaults for a fresh card. */
export function suggest(intent: Intent, ltp: number, dangerLevel?: number | null): Partial<OrderInput> {
  if (intent === 'stoploss') {
    const trigger = dangerLevel && dangerLevel < ltp ? toTick(dangerLevel, 0.05, 'down') : toTick(ltp * 0.95, 0.05, 'down');
    return { trigger, limit: slLimitFor(trigger) };
  }
  if (intent === 'target') return { price: toTick(ltp * 1.05, 0.05, 'up') };
  return { price: toTick(ltp) };
}

/** Limit a little below trigger (≈0.3%, min 1 tick) so the SL order actually fills. */
export function slLimitFor(trigger: number): number {
  const gap = Math.max(0.05, toTick(trigger * 0.003, 0.05, 'up'));
  return toTick(trigger - gap, 0.05, 'down');
}

export function buildOrderCard(i: OrderInput): OrderCard {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isSell = i.intent !== 'buy';
  const isSL = i.intent === 'stoploss';

  if (!Number.isInteger(i.qty) || i.qty <= 0) errors.push('Quantity 1 ya usse zyada poori sankhya honi chahiye.');
  if (isSell && i.heldQty > 0 && i.qty > i.heldQty) errors.push(`Aapke paas sirf ${i.heldQty} shares hain — usse zyada nahi bech sakte.`);
  if (isSell && i.heldQty === 0) warnings.push('Ye stock aapki holdings mein nahi hai. Delivery mein bina shares ke bechna mana hai.');

  let execPrice = 0;
  if (isSL) {
    const t = i.trigger ?? NaN;
    const l = i.limit ?? NaN;
    if (!(t > 0)) errors.push('Trigger price daalo.');
    if (!(l > 0)) errors.push('Limit price daalo.');
    if (t > 0 && t >= i.ltp) errors.push(`Stop-loss ka trigger abhi ke price (${inr(i.ltp)}) se neeche hona chahiye, warna turant bik jayega.`);
    if (t > 0 && l > 0 && l > t) errors.push('Bechne wale stop-loss mein limit price trigger se zyada nahi ho sakta.');
    if (t > 0 && l > 0 && l <= t && (t - l) / t > 0.05) warnings.push('Trigger aur limit mein 5% se zyada ka gap hai — kaafi neeche bik sakta hai.');
    if (t > 0 && l > 0 && l === t) warnings.push('Limit = trigger rakha hai. Tezi se girne par order fill nahi bhi ho sakta. Limit thoda neeche rakhna safe hai.');
    if (t > 0 && !isOnTick(t)) errors.push('Trigger ₹0.05 ke multiple mein hona chahiye (jaise 1850.05, 1850.10).');
    if (l > 0 && !isOnTick(l)) errors.push('Limit ₹0.05 ke multiple mein hona chahiye.');
    execPrice = l;
  } else {
    const p = i.price ?? NaN;
    if (!(p > 0)) errors.push('Price daalo.');
    if (p > 0 && !isOnTick(p)) errors.push('Price ₹0.05 ke multiple mein hona chahiye.');
    if (p > 0 && i.intent === 'buy' && p > i.ltp) warnings.push('Aapka price abhi ke price se upar hai — order turant lag jayega.');
    if (p > 0 && i.intent === 'sell' && p < i.ltp) warnings.push('Aapka price abhi ke price se neeche hai — turant bik jayega.');
    if (p > 0 && i.intent === 'target' && p <= i.ltp) errors.push(`Target abhi ke price (${inr(i.ltp)}) se upar hona chahiye.`);
    execPrice = p;
  }

  const fields: OrderField[] = [
    { key: 'side', label: 'Side', value: isSell ? 'SELL (Bechna)' : 'BUY (Kharidna)' },
    { key: 'product', label: 'Product', value: 'Delivery (CNC)' },
    { key: 'type', label: 'Order type', value: isSL ? 'SL (Stop-loss limit)' : 'Limit' },
  ];
  if (isSL) fields.push({ key: 'trigger', label: 'Trigger price', value: inr(i.trigger ?? 0), copy: fmtRaw(i.trigger) });
  fields.push({ key: 'limit', label: isSL ? 'Limit price' : 'Price', value: inr(execPrice || 0), copy: fmtRaw(execPrice) });
  fields.push({ key: 'qty', label: 'Quantity', value: String(i.qty), copy: String(i.qty) });
  fields.push({ key: 'validity', label: 'Validity', value: 'Day' });

  const explanation = explain(i);
  const hasAvg = i.avgPrice > 0;
  const pnlAtTrigger = isSell && hasAvg && execPrice > 0 ? round2((execPrice - i.avgPrice) * i.qty) : null;
  let pnlAtTarget: number | null = null;
  if (i.target && i.target > 0) {
    const base = i.intent === 'buy' ? (i.price ?? 0) : i.avgPrice;
    if (base > 0) pnlAtTarget = round2((i.target - base) * i.qty);
  }
  return { fields, errors, warnings, explanation, pnlAtTrigger, pnlAtTarget };
}

function fmtRaw(n: number | undefined): string {
  return n && Number.isFinite(n) ? n.toFixed(2) : '';
}

function explain(i: OrderInput): string {
  switch (i.intent) {
    case 'stoploss':
      return `Agar price ${inr(i.trigger ?? 0)} tak gira, toh order chalu hoga aur ${inr(i.limit ?? 0)} ya usse upar ke price par ${i.qty} shares bikenge. Tab tak kuch nahi hoga.`;
    case 'target':
      return `Jab price ${inr(i.price ?? 0)} ya upar pahunchega, ${i.qty} shares bik jayenge. Tab tak order line mein rahega (sirf aaj ke liye).`;
    case 'sell':
      return `${i.qty} shares ${inr(i.price ?? 0)} ya usse behtar price par bikenge. Price wahan tak nahi aaya toh aaj shaam order cancel ho jayega.`;
    case 'buy':
      return `${i.qty} shares ${inr(i.price ?? 0)} ya usse sasta milne par kharide jayenge. Kul lagbhag ${inr((i.price ?? 0) * i.qty)} lagenge (charges alag).`;
  }
}
