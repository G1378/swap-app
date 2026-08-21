import { Flame, Sparkles, Star, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProfileBadge } from "@/types";

const ICONS = { trophy: Trophy, star: Star, flame: Flame, sparkles: Sparkles } as const;

export function BadgePill({ badge }: { badge: ProfileBadge }) {
  const Icon = ICONS[badge.icon];

  return (
    <Badge variant="accent" className="gap-1.5 py-1" title={badge.description}>
      <Icon className="h-3 w-3" />
      {badge.label}
    </Badge>
  );
}
