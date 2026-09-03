export type UserRole = "customer" | "seller" | "creator";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_approved: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  name: string;
  description: string;
  photo_url: string | null;
  pickup_area: string;
  is_open: boolean;
  is_approved: boolean;
  rating: number;
  total_ratings: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface FoodItem {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  is_sold_out: boolean;
  ordering_window: string | null;
  photo_urls: string[];
  dietary_tags: string[];
  spice_level: number;
  created_at: string;
  updated_at: string;
  store?: Store;
  average_rating?: number;
  total_ratings?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

export interface ItemCategory {
  item_id: string;
  category_id: string;
}

export type OrderStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "ready"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  customer_id: string;
  store_id: string;
  status: OrderStatus;
  total_price: number;
  pickup_time: string;
  notes: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  store?: Store;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  price_at_time: number;
  item?: FoodItem;
}

export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  store_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Profile;
}

export interface Favorite {
  user_id: string;
  item_id: string | null;
  store_id: string | null;
  created_at: string;
}

export type ReportTargetType = "user" | "item" | "store";
export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  reporter?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface Waitlist {
  id: string;
  user_id: string;
  item_id: string;
  created_at: string;
}

export interface CartItem {
  item: FoodItem;
  quantity: number;
  notes: string;
}

export interface CartStore {
  store: Store;
  items: CartItem[];
}
