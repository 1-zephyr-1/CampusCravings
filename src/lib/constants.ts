export const BRACU_DOMAIN = "g.bracu.ac.bd";
// CREATOR_EMAIL is server-only; do not import this in client components.
// Fallback is only for local dev without env set — override via CREATOR_EMAIL in .env.local
export const CREATOR_EMAIL =
  typeof process !== "undefined" && process.env.CREATOR_EMAIL
    ? process.env.CREATOR_EMAIL
    : "fardin.emran@g.bracu.ac.bd";

export const ORDER_STATUSES = {
  requested: { label: "Requested", color: "bg-amber-100 text-amber-700" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
  ready: { label: "Ready for Pickup", color: "bg-red-100 text-red-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600" },
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
  { name: "Rice", icon: "Rice" },
  { name: "Snacks", icon: "Snacks" },
  { name: "Desserts", icon: "Desserts" },
  { name: "Drinks", icon: "Drinks" },
  { name: "Bread", icon: "Bread" },
  { name: "Noodles", icon: "Noodles" },
  { name: "Curry", icon: "Curry" },
  { name: "Salad", icon: "Salad" },
  { name: "Breakfast", icon: "Breakfast" },
  { name: "Pasta", icon: "Pasta" },
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
