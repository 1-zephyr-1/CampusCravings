"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/ui/auth-provider";
import { ChefHat, ShoppingBag } from "lucide-react";
import { clsx } from "clsx";

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<"seller" | "customer" | null>(
    null
  );
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  async function handleContinue() {
    if (!selectedRole || !user) return;
    setLoading(true);
    setError("");

    try {
      // Update profile role
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: selectedRole })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // If seller, create a store
      if (selectedRole === "seller") {
        if (!shopName.trim()) {
          setError("Please enter a shop name");
          setLoading(false);
          return;
        }

        const { error: storeError } = await supabase.from("stores").insert({
          user_id: user.id,
          name: shopName.trim(),
          description: "",
          pickup_area: "Other",
        });

        if (storeError) throw storeError;
      }

      await refreshProfile();
      router.push("/feed");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-cream-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">🍛</span>
          <h1 className="text-2xl font-bold text-espresso dark:text-cream mb-2">
            Welcome to CampusCravings
          </h1>
          <p className="text-bark text-sm">
            How do you want to use the platform?
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedRole("customer")}
            className={clsx(
              "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4",
              selectedRole === "customer"
                ? "border-tomato bg-tomato/5"
                : "border-sand hover:border-bark/30 dark:border-[#4A3D30]"
            )}
          >
            <div
              className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                selectedRole === "customer"
                  ? "bg-tomato text-white"
                  : "bg-sand/50 text-bark dark:bg-[#3A2E20]"
              )}
            >
              <ShoppingBag size={24} strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-semibold text-espresso dark:text-cream">
                Customer
              </p>
              <p className="text-sm text-bark">
                Browse and pre-order homemade food
              </p>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole("seller")}
            className={clsx(
              "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4",
              selectedRole === "seller"
                ? "border-tomato bg-tomato/5"
                : "border-sand hover:border-bark/30 dark:border-[#4A3D30]"
            )}
          >
            <div
              className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                selectedRole === "seller"
                  ? "bg-tomato text-white"
                  : "bg-sand/50 text-bark dark:bg-[#3A2E20]"
              )}
            >
              <ChefHat size={24} strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-semibold text-espresso dark:text-cream">
                Seller
              </p>
              <p className="text-sm text-bark">
                Sell your homemade food to fellow students
              </p>
            </div>
          </button>
        </div>

        {selectedRole === "seller" && (
          <div className="mb-6 animate-slide-up">
            <label className="block text-sm font-medium text-espresso dark:text-cream mb-1.5">
              Shop Name
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Amma's Kitchen"
              className="w-full px-4 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso placeholder:text-bark/50 focus:outline-none focus:ring-2 focus:ring-tomato/30 focus:border-tomato dark:bg-surface-dark dark:border-[#4A3D30] dark:text-cream"
            />
            <p className="text-xs text-bark mt-1.5">
              You&apos;ll need admin approval before your shop goes live
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-chili mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className={clsx(
            "w-full py-3 rounded-xl font-semibold text-sm transition-all",
            selectedRole
              ? "bg-tomato text-white hover:bg-tomato-hover active:scale-[0.98]"
              : "bg-sand text-bark cursor-not-allowed dark:bg-[#3A2E20] dark:text-cream/40"
          )}
        >
          {loading ? "Setting up..." : "Continue"}
        </button>

        <p className="text-xs text-bark/60 text-center mt-6">
          You can also be both buyer and seller later
        </p>
      </div>
    </div>
  );
}
