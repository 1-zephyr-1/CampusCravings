import type { LucideIcon } from "lucide-react";
import {
  Beef,
  Cake,
  Coffee,
  CookingPot,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Hamburger,
  IceCreamCone,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Sprout,
  Utensils,
  UtensilsCrossed,
  Wheat,
  Wine,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export interface CategoryWithCount {
  id: string | null;
  name: string;
  /** Resolved lucide icon component (always populated). */
  icon: LucideIcon;
  /** Emoji from the DB row when available. May be the category name. */
  emoji: string | null;
  /** Number of currently-available items in this category. 0 if unknown. */
  itemCount: number;
}

const ICON_BY_NAME: Record<string, LucideIcon> = {
  Rice: Wheat,
  Snacks: Popcorn,
  Desserts: Cake,
  Drinks: CupSoda,
  Bread: Croissant,
  Noodles: Soup,
  Curry: CookingPot,
  Salad: Salad,
  Breakfast: EggFried,
  Pasta: UtensilsCrossed,
  Pizza: Pizza,
  Burger: Hamburger,
  Sandwich: Sandwich,
  Soup: Soup,
  Chicken: Drumstick,
  Beef: Beef,
  Coffee: Coffee,
  Tea: Coffee,
  Juice: CupSoda,
  Cake: Cake,
  Cookie: Cookie,
  IceCream: IceCreamCone,
  Wine: Wine,
  Vegan: Sprout,
  Momos: Utensils,
};

/** Resolve a category name to a lucide icon, defaulting to `Utensils`. */
export function resolveCategoryIcon(name: string): LucideIcon {
  return ICON_BY_NAME[name] || Utensils;
}

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
}

/**
 * Fetch every category with a count of approved+open items in it.
 *
 * Runs two parallel queries: the full `categories` list, plus a denormalised
 * count via `item_categories × food_items × stores`. RLS makes this safe
 * for anonymous visitors. On any error we fall back to DEFAULT_CATEGORIES
 * (zero counts) so the UI is still useful.
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  try {
    const supabase = await createClient();
    const [{ data: cats, error: catsErr }, { data: counts, error: countsErr }] =
      await Promise.all([
        supabase.from("categories").select("id, name, icon").order("name"),
        supabase
          .from("item_categories")
          .select(
            "category_id, food_items!inner(id, is_sold_out, store:stores!food_items_store_id_fkey(is_approved, is_open))"
          ),
      ]);

    if (catsErr || countsErr || !cats) {
      return fromDefaults();
    }

    const countMap = new Map<string, number>();
    if (counts) {
      for (const row of counts as unknown as Array<{
        category_id: string;
        food_items: {
          id: string;
          is_sold_out: boolean;
          store: { is_approved: boolean; is_open: boolean } | null;
        } | null;
      }>) {
        const item = row.food_items;
        if (!item) continue;
        if (item.is_sold_out) continue;
        if (!item.store?.is_approved || !item.store?.is_open) continue;
        countMap.set(
          row.category_id,
          (countMap.get(row.category_id) || 0) + 1
        );
      }
    }

    return (cats as CategoryRow[]).map((c) => ({
      id: c.id,
      name: c.name,
      icon: resolveCategoryIcon(c.name),
      emoji: c.icon && c.icon !== c.name ? c.icon : null,
      itemCount: countMap.get(c.id) ?? 0,
    }));
  } catch {
    return fromDefaults();
  }
}

function fromDefaults(): CategoryWithCount[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    id: null,
    name: c.name,
    icon: resolveCategoryIcon(c.name),
    emoji: null,
    itemCount: 0,
  }));
}
