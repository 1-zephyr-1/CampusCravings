/**
 * Centralized user-facing strings for CampusCravings.
 *
 * This is the source of truth for everything a buyer, seller, creator, or
 * marketing visitor might see in the UI. Keys are flat, dot-namespaced by
 * feature so they're easy to grep, easy to tree-shake, and easy to bulk-edit
 * when a translator is hired.
 *
 * Conventions:
 *  - Use `feature.section.thing` (e.g. `auth.signin.cta`, `feed.empty.title`).
 *  - Use sentence case for body copy, Title Case for titles/buttons.
 *  - Variables use `{name}` interpolation — keep them stable so callers can
 *    swap them out at usage time without breaking the layout.
 *  - Brand strings (BRACU, CampusCravings) stay verbatim.
 *
 * This file is intentionally English-only for now. A real i18n rollout will
 * split this into `en.ts`, `bn.ts`, etc. and have `use-translation` pick one
 * based on the user's preferred locale.
 */

export const translations = {
  // --- Marketing landing page (/) ---
  "marketing.brand.tag": "BRAC University only",
  "marketing.hero.heading.line1": "Skip the canteen queue.",
  "marketing.hero.heading.line2": "Order homemade food on campus.",
  "marketing.hero.subhead":
    "Browse meals from your fellow BRACU students, pre-order in seconds, and pick up at a time that works for you. Cash on pickup — no apps to download, no commissions.",
  "marketing.hero.cta.primary": "Get started — it's free",
  "marketing.hero.cta.secondary": "Browse the feed",
  "marketing.hero.bullet.near": "Pickup near you",
  "marketing.hero.bullet.verified": "Verified BRACU sellers",
  "marketing.hero.bullet.cash": "Pay on pickup, no fees",
  "marketing.auth.heading": "Ready to skip the queue?",
  "marketing.auth.body":
    "Sign in with your @g.bracu.ac.bd email to start browsing meals, placing pre-orders, and supporting student cooks across campus.",
  "marketing.auth.bullet.verified": "Verified BRACU students only",
  "marketing.auth.bullet.noCommission": "No commission, pay on pickup",
  "marketing.auth.bullet.hot": "Pre-order so it's hot when you arrive",
  "marketing.auth.alreadyHave": "Already have an account?",
  "marketing.auth.browseFeed": "Browse the feed →",
  "marketing.howItWorks.heading": "How CampusCravings works",
  "marketing.howItWorks.step1.title": "1. Browse",
  "marketing.howItWorks.step1.body":
    "Find a dish by category, dietary tag, or seller. Filter by price and rating.",
  "marketing.howItWorks.step2.title": "2. Pre-order",
  "marketing.howItWorks.step2.body":
    "Add to your cart, choose a pickup time, and send the order. The seller is notified instantly.",
  "marketing.howItWorks.step3.title": "3. Pick up & enjoy",
  "marketing.howItWorks.step3.body":
    "Show up at the pickup spot, pay in cash (or as the seller prefers), and enjoy fresh homemade food.",
  "marketing.testimonials.heading": "What students say",
  "marketing.footer.product": "Product",
  "marketing.footer.company": "Company",
  "marketing.footer.about": "About",
  "marketing.footer.contact": "Contact",
  "marketing.footer.privacy": "Privacy",
  "marketing.footer.terms": "Terms",
  "marketing.footer.copyright": "© 2026 CampusCravings",
  "marketing.footer.builtAt": "Built with ♥ at BRACU",
  "marketing.footer.tagline":
    "The campus-only food marketplace for BRAC University students. Skip the queue, support fellow student cooks, and pre-order your next meal.",

  // --- Auth card (marketing + onboarding) ---
  "auth.signin.title": "Welcome back",
  "auth.signin.tab": "Sign in",
  "auth.signup.tab": "Sign up",
  "auth.signin.cta": "Continue with Google",
  "auth.signin.submit": "Sign in",
  "auth.signup.submit": "Create account",
  "auth.signin.withGoogle": "Sign in with Google",
  "auth.signin.or": "or continue with",
  "auth.signin.forgotPassword": "Forgot password?",
  "auth.field.fullName": "Full name",
  "auth.field.emailPlaceholder": "you@g.bracu.ac.bd",
  "auth.field.password": "Password",
  "auth.field.emailInvalid":
    "Only BRAC University emails (@g.bracu.ac.bd) are accepted.",
  "auth.signin.pleaseWait": "Please wait...",
  "auth.signup.checkEmail": "Check your email!",
  "auth.signin.togglePassword.show": "Show password",
  "auth.signin.togglePassword.hide": "Hide password",
  "auth.feature.freshHomemade": "Fresh homemade",
  "auth.feature.campusOnly": "Campus only",
  "auth.feature.peerToPeer": "Peer-to-peer",
  "auth.disclaimer":
    "By signing in, you agree that CampusCravings only facilitates listings and orders. We are not responsible for food safety or quality. Sellers are independent students.",

  // --- Onboarding (/onboarding) ---
  "onboarding.heading": "Welcome to CampusCravings",
  "onboarding.subheading": "How do you want to use the platform?",
  "onboarding.role.customer.title": "Customer",
  "onboarding.role.customer.body": "Browse and pre-order homemade food",
  "onboarding.role.seller.title": "Seller",
  "onboarding.role.seller.body": "Sell your homemade food to fellow students",
  "onboarding.shopName.label": "Shop Name",
  "onboarding.shopName.placeholder": "e.g. Amma's Kitchen",
  "onboarding.shopName.help":
    "You'll need admin approval before your shop goes live",
  "onboarding.error.invalidRole": "Invalid role selected",
  "onboarding.error.shopNameRequired": "Please enter a shop name",
  "onboarding.error.generic": "Something went wrong",
  "onboarding.cta": "Continue",
  "onboarding.cta.loading": "Setting up...",
  "onboarding.note.bothRoles": "You can also be both buyer and seller later",

  // --- Feed (/feed) ---
  "feed.title": "What's cooking on campus",
  "feed.subtitle": "Browse food from your fellow BRACU students",
  "feed.search.placeholder": "Search for food...",
  "feed.search.label": "Open search",
  "feed.search.dialogLabel": "Search food",
  "feed.search.inputLabel": "Search food and sellers",
  "feed.search.placeholderDialog": "Search food, sellers...",
  "feed.search.cancel": "Cancel",
  "feed.search.mobilePlaceholder": "Search food, sellers...",
  "feed.categories.ariaLabel": "Category filters",
  "feed.categories.all": "All",
  "feed.viewToggle.ariaLabel": "Browse as",
  "feed.viewToggle.sellers": "Sellers",
  "feed.viewToggle.items": "Items",
  "feed.filters.button": "Filters",
  "feed.filters.priceRange": "Price range: ৳{min} – ৳{max}",
  "feed.filters.priceMinLabel": "Minimum price",
  "feed.filters.priceMaxLabel": "Maximum price",
  "feed.filters.dietaryTags": "Dietary tags",
  "feed.filters.recommended": "Recommended for you ({count})",
  "feed.filters.ariaLabel": "Dietary filter",
  "feed.refresh.label": "Refresh feed",
  "feed.refresh.button": "Refresh",
  "feed.updatedAgo": "Updated {time}",
  "feed.loading.label": "Loading results",
  "feed.error.title": "Couldn't load the feed",
  "feed.empty.sellers.title": "No sellers yet",
  "feed.empty.sellers.noMatch":
    'No sellers match "{query}". Try a different term.',
  "feed.empty.sellers.signupPrompt":
    "Be the first to set up a shop on campus — sign in and pick 'Seller' to start cooking for your peers.",
  "feed.empty.sellers.cta": "Sign in to start selling",
  "feed.empty.items.title": "Nothing cooking right now",
  "feed.empty.items.noMatch": 'No items match "{query}".',
  "feed.empty.items.message":
    "Check back around lunch or dinner — that's when sellers usually post.",
  "feed.empty.items.cta": "Browse sellers",
  "feed.error.fetch":
    "We couldn't load the feed. Please try again in a moment.",

  // --- Cart (/cart) ---
  "cart.title": "Your cart",
  "cart.empty.title": "Your cart is empty",
  "cart.empty.message":
    "Browse the feed and add some homemade meals to get started.",
  "cart.empty.cta": "Browse food",
  "cart.empty.savedNotice":
    "Your cart is empty, but you have {count} {itemWord} saved for later.",
  "cart.empty.savedNotice.item": "item",
  "cart.empty.savedNotice.items": "items",
  "cart.holdingNotice":
    "Heads up: items are held until you place the order. If a seller marks something sold out while you're here, we'll drop it automatically.",
  "cart.pickupAt": "Pick up at: {area}",
  "cart.pickupFallback": "seller's preferred spot",
  "cart.savedForLater.heading": "Saved for later",
  "cart.savedForLater.count": "{count} {itemWord} tucked away",
  "cart.savedForLater.move": "Move to cart",
  "cart.savedForLater.add": "Add {name} to cart",
  "cart.suggested.heading": "Popular at {store}",
  "cart.suggested.empty": "No suggestions right now — check back later.",
  "cart.total": "Total",
  "cart.pickupTime.required":
    "Choose a pickup time for each store before placing your order.",
  "cart.placeOrder": "Place order · ৳{total}",
  "cart.placeOrders": "Place orders · ৳{total}",
  "cart.placing": "Placing orders…",
  "cart.payNote": "You'll pay in cash when you pick up. No commissions, no upfront fees.",
  "cart.promo.label": "Have a promo code?",
  "cart.promo.placeholder": "Enter code",
  "cart.promo.apply": "Apply",
  "cart.promo.empty": "Enter a promo code first.",
  "cart.promo.comingSoon": "Promo codes coming soon — stay tuned!",
  "cart.clear.button": "Clear cart",
  "cart.clear.confirm.title": "Clear your cart?",
  "cart.clear.confirm.body":
    "This removes every item currently in your cart. Items you've saved for later will be kept.",
  "cart.clear.confirm.confirmLabel": "Clear cart",
  "cart.toast.cleared": "Cart cleared",
  "cart.toast.savedForLater": "{name} saved for later",
  "cart.toast.tooManyPending": "You have too many pending orders.",
  "cart.suggestions.mobileHint": "Pick a pickup time for each store above first.",
  "cart.keepBrowsing": "Keep browsing →",
  "cart.savedForLater.itemSaved": "{name} saved for later",
  "cart.savedForLater.removeAria": "Remove {name} from saved for later",
  "cart.savedForLater.moveAria": "Move {name} back to cart",

  // --- Orders list + detail ---
  "orders.title": "My Orders",
  "orders.tabs.ariaLabel": "Order status",
  "orders.tabs.active": "Active ({count})",
  "orders.tabs.history": "History ({count})",
  "orders.loading.label": "Loading orders",
  "orders.empty.active.title": "No active orders",
  "orders.empty.active.message":
    "When you place an order, you'll see it here as it progresses.",
  "orders.empty.history.title": "No order history yet",
  "orders.empty.history.message":
    "Once an order is completed, declined, or cancelled, it'll appear here.",
  "orders.empty.cta": "Browse food",
  "orders.itemsSummary": "{count} items · Pickup: {time}",
  "orders.detail.title": "Order Details",
  "orders.detail.loading": "Loading order",
  "orders.detail.notFound": "Order not found",
  "orders.detail.back": "Back to orders",
  "orders.detail.breadcrumb": "My Orders",
  "orders.detail.placedBanner":
    "Order placed — you're all set!",
  "orders.detail.placedSub":
    "We've notified the seller. You'll see status updates here as they confirm your pickup time.",
  "orders.detail.ready": "Ready for pickup now!",
  "orders.detail.pickupAt": "Pickup around {time}",
  "orders.detail.payCash":
    "Pay in cash when you arrive. Have your order number handy.",
  "orders.detail.status.waiting": "Waiting for seller to respond",
  "orders.detail.status.accepted": "Seller accepted your order",
  "orders.detail.status.ready": "Ready for pickup!",
  "orders.detail.status.completed": "Order completed",
  "orders.detail.declined": "Order Declined",
  "orders.detail.viewStore": "View store",
  "orders.detail.messageSeller": "Message seller",
  "orders.detail.pickup": "Pickup: {time}",
  "orders.detail.total": "Total",
  "orders.detail.review.heading": "Your Review",
  "orders.detail.review.ratedAria": "Rated {rating} out of 5",
  "orders.detail.review.cta": "Rate this order",
  "orders.detail.review.label": "Rate your experience",
  "orders.detail.review.placeholder": "Tell others about your experience...",
  "orders.detail.review.submit": "Submit Review",
  "orders.detail.review.cancel": "Cancel",
  "orders.detail.review.ratingAria": "Rating",
  "orders.detail.dismiss": "Dismiss",

  // --- Global / system ---
  "common.skipToMain": "Skip to main content",
  "common.signIn": "Sign in",
  "common.cancel": "Cancel",
  "common.tryAgain": "Try Again",
  "common.goHome": "Go home",
  "common.errorBoundary.heading": "Something went wrong",
  "common.errorBoundary.body":
    "An unexpected error occurred. Please try again.",
  "common.notFound.title": "Page not found",
  "common.notFound.body":
    "The page you're looking for doesn't exist or has been moved.",
  "common.notFound.browseFood": "Browse Food",
  "common.notFound.goHome": "Go Home",

  // --- Accessibility-only labels (aria / sr-only) ---
  "a11y.refreshFeed": "Refresh feed",
  "a11y.openSearch": "Open search",
  "a11y.searchFoodDialog": "Search food",
  "a11y.mobileSearchInput": "Search food and sellers",
  "a11y.categoryFilters": "Category filters",
  "a11y.browseAs": "Browse as",
  "a11y.dietaryFilter": "Dietary filter",
  "a11y.priceMin": "Minimum price",
  "a11y.priceMax": "Maximum price",
  "a11y.hidePassword": "Hide password",
  "a11y.showPassword": "Show password",
  "a11y.dismiss": "Dismiss",
  "a11y.ratedStars": "Rated {rating} out of 5",
  "a11y.ratingControl": "Rating",
  "a11y.checkoutSummary": "Checkout summary",
} as const;

export type TranslationKey = keyof typeof translations;
