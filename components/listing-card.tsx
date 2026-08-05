import Image from "next/image";
import { Package } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Listing } from "@/types";

const statusLabel: Record<Listing["status"], string> = {
  available: "Available",
  pending: "Pending",
  swapped: "Swapped",
};

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-muted">
        {listing.imageUrl ? (
          <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>
        )}
        <Badge className="absolute right-2 top-2" variant={listing.status === "available" ? "default" : "secondary"}>
          {statusLabel[listing.status]}
        </Badge>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1">{listing.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-0">
        <Badge variant="outline">{listing.category}</Badge>
        {listing.wantedInReturn && (
          <span className="truncate text-xs text-muted-foreground">
            Wants: {listing.wantedInReturn}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
