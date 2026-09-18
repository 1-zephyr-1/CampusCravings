"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/use-client";
import { useAuth } from "@/components/ui/auth-provider";
import { ChefHat, ShoppingBag, Utensils } from "lucide-react";
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
  const supabase = useSupabase();

  async function handleContinue() {
    if (!selectedRole || !user) return;
    if (!["customer", "seller"].includes(selectedRole)) {
      setError("Invalid role selected");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Update profile role — only customer/seller allowed (creator is server-assigned)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Utensils size={48} className="mx-auto mb-4 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to CampusCravings
          </h1>
          <p className="text-gray-500 text-sm">
            How do you want to use the platform?
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedRole("customer")}
            className={clsx(
              "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4",
              selectedRole === "customer"
                ? "border-red-600 bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div
              className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                selectedRole === "customer"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              <ShoppingBag size={24} strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Customer
              </p>
              <p className="text-sm text-gray-500">
                Browse and pre-order homemade food
              </p>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole("seller")}
            className={clsx(
              "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4",
              selectedRole === "seller"
                ? "border-red-600 bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div
              className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                selectedRole === "seller"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              <ChefHat size={24} strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Seller
              </p>
              <p className="text-sm text-gray-500">
                Sell your homemade food to fellow students
              </p>
            </div>
          </button>
        </div>

        {selectedRole === "seller" && (
          <div className="mb-6 animate-slide-up">
            <label htmlFor="shop-name" className="block text-sm font-medium text-gray-900 mb-1.5">
              Shop Name
            </label>
            <input
              id="shop-name"
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Amma's Kitchen"
              aria-required
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-600"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              You&apos;ll need admin approval before your shop goes live
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={!selectedRole || loading}
          className={clsx(
            "w-full py-3 rounded-xl font-semibold text-sm transition-all",
            selectedRole
              ? "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          )}
        >
          {loading ? "Setting up..." : "Continue"}
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          You can also be both buyer and seller later
        </p>
      </div>
    </div>
  );
}
