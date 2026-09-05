"use client";

import { useState } from "react";
import { Coins, LockOpen, Rocket, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { POINTS_COSTS } from "@/lib/gamification/constants";

interface ShopItem {
  key: string;
  title: string;
  description: string;
  cost: number;
  icon: typeof Rocket;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    key: "boost",
    title: "Feature a listing",
    description:
      "Bump one of your listings to the top of Discover for 24 hours",
    cost: POINTS_COSTS.FEATURED_LISTING_BOOST_24H,
    icon: Rocket,
  },
  {
    key: "priority",
    title: "Priority match",
    description: "Flag one of your swap requests as priority in their inbox",
    cost: POINTS_COSTS.PRIORITY_MATCH_FLAG,
    icon: Zap,
  },
  {
    key: "flair",
    title: "Profile flair",
    description: "Unlock a colored badge frame for your profile",
    cost: POINTS_COSTS.PROFILE_COSMETIC,
    icon: Sparkles,
  },
  {
    key: "unlock",
    title: "Early category access",
    description:
      "List into a not-yet-public launch category before it opens to everyone",
    cost: POINTS_COSTS.CATEGORY_EARLY_UNLOCK,
    icon: LockOpen,
  },
];

interface PointsShopProps {
  initialBalance: number;
}

/**
 * Redeeming here is a *preview* of the flow, not a real transaction —
 * balance resets on refresh and nothing is written to points_transactions.
 * That's deliberate, not an oversight: direct writes to
 * gamification_profiles/points_transactions are blocked by RLS by design
 * (see lib/gamification/queries.ts's file comment) — the only way points
 * can move is through a SECURITY DEFINER RPC, the same pattern
 * prisma/migrations_manual/0011_gamification_wiring.sql already
 * established for XP/quests. Wiring real redemption up means adding one
 * of those RPCs (and deciding what "priority match" etc. actually do
 * downstream), which felt like its own follow-up rather than something to
 * improvise here.
 */
export function PointsShop({ initialBalance }: PointsShopProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());

  function redeem(item: ShopItem) {
    if (redeemed.has(item.key) || item.cost > balance) return;
    setBalance((b) => b - item.cost);
    setRedeemed((r) => new Set(r).add(item.key));
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl bg-reward-soft p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background">
          <Coins className="h-5 w-5 text-reward" />
        </span>
        <div>
          <p className="text-xl font-semibold text-reward-soft-foreground">
            {balance} pts
          </p>
          <p className="text-xs text-reward-soft-foreground/80">
            Earned from swaps, streaks &amp; quests
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {SHOP_ITEMS.map((item) => {
          const isRedeemed = redeemed.has(item.key);
          const canAfford = item.cost <= balance;
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="rounded-2xl border border-border p-3"
            >
              <div className="flex gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-reward-soft">
                  <Icon className="h-4 w-4 text-reward" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="rounded-full bg-reward-soft px-2.5 py-0.5 text-xs font-semibold text-reward-soft-foreground">
                  {item.cost} pts
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={isRedeemed ? "outline" : "default"}
                  disabled={isRedeemed || !canAfford}
                  onClick={() => redeem(item)}
                >
                  {isRedeemed ? "Redeemed" : "Redeem"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Preview only for now — redeeming here doesn&apos;t touch your real
        balance yet.
      </p>
    </div>
  );
}
