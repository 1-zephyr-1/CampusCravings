export const BRACU_DOMAIN = "g.bracu.ac.bd";
export const CREATOR_EMAIL = process.env.CREATOR_EMAIL || "fardin.emran@g.bracu.ac.bd";

export const ORDER_STATUSES = {
  requested: { label: "Requested", color: "bg-turmeric/20 text-amber-700" },
  accepted: { label: "Accepted", color: "bg-herb/20 text-herb" },
  declined: { label: "Declined", color: "bg-chili/20 text-chili" },
  ready: { label: "Ready for Pickup", color: "bg-tomato/20 text-tomato" },
  completed: { label: "Completed", color: "bg-herb/20 text-herb" },
  cancelled: { label: "Cancelled", color: "bg-bark/20 text-bark" },
} as const;

export const DIETARY_TAGS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Contains Nuts",
  "Gluten-Free",
  "Dairy-Free",
] as const;

export const SPICE_LEVELS = [
  { value: 0, label: "Mild" },
  { value: 1, label: "Medium" },
  { value: 2, label: "Spicy" },
  { value: 3, label: "Very Spicy" },
] as const;

export const DEFAULT_CATEGORIES = [
  { name: "Rice", icon: "🍚" },
  { name: "Snacks", icon: "🍿" },
  { name: "Desserts", icon: "🍰" },
  { name: "Drinks", icon: "🥤" },
  { name: "Bread", icon: "🍞" },
  { name: "Noodles", icon: "🍜" },
  { name: "Curry", icon: "🍛" },
  { name: "Salad", icon: "🥗" },
  { name: "Breakfast", icon: "🥞" },
  { name: "Pasta", icon: "🍝" },
];

export const PICKUP_AREAS = [
  "Admin Building",
  "Library",
  "Student Union",
  "Uttara Campus",
  "Bashundhara Campus",
  "Other",
] as const;

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_PHOTOS_PER_ITEM = 5;
export const MAX_PENDING_ORDERS = 3;
