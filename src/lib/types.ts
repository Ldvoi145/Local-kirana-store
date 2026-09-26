export type UserRole = "customer" | "vendor";
export type OrderStatus =
  | "Pending"
  | "Preparing"
  | "Ready"
  | "Completed"
  | "Cancelled";
export type OrderType = "Pickup" | "Delivery";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  phone: string | null;
  address: string | null;
}

export interface Shop {
  id: string;
  owner_id?: string | null;
  name: string;
  address: string | null;
  timings: string | null;
  description: string | null;
  is_open: boolean;
  product_count?: number;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock_quantity: number;
  is_available: boolean;
  image_url: string | null;
  shop_name?: string;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string;
  type: OrderType;
  payment_method: string;
  total_amount: number;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  created_at: string;
  updated_at: string;
  shop_name?: string;
  items?: OrderItem[];
}

export interface OrderEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  created_at: string;
}

export type SuggestionStatus = "Pending" | "Approved" | "Rejected" | "Added";

export interface Suggestion {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  item_name: string;
  note: string;
  status: SuggestionStatus;
  created_at: string;
}

export const PAYMENT_METHODS = [
  "Cash on Delivery",
  "UPI",
  "Card",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Preset {
  id: string;
  customer_id: string;
  shop_id: string;
  name: string;
  shop_name?: string;
  items?: PresetItem[];
}

export interface PresetItem {
  preset_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface CartLine {
  product_id: string;
  name: string;
  price: number;
  unit: string;
  shop_id: string;
  shop_name: string;
  quantity: number;
}
