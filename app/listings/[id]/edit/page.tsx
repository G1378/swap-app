import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPhotosForListing } from "@/lib/listing-photos";
import { ListingForm } from "@/components/listing-form";
import { ListingGallery } from "@/components/listing-gallery";
import type { Listing } from "@/types";

interface EditListingPageProps {
  params: { id: string };
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single<Record<string, unknown>>();

  if (!data) {
    notFound();
  }

  if (data.owner_id !== user.id) {
    redirect("/profile");
  }

  const listing: Listing = {
    id: data.id as string,
    ownerId: data.owner_id as string,
    title: data.title as string,
    description: data.description as string,
    category: data.category as string,
    condition: data.condition as string,
    imageUrl: (data.image_url as string) ?? null,
    wantedInReturn: (data.wanted_in_return as string) ?? null,
    status: data.status as Listing["status"],
    createdAt: data.created_at as string,
  };

  const photos = await getPhotosForListing(supabase, listing.id);

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit listing</h1>
        <p className="mt-1 text-muted-foreground">Update the details or swap in a new photo.</p>
      </div>
      <ListingForm mode="edit" userId={user.id} listing={listing} />

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="mb-3 text-lg font-semibold">Additional photos</h2>
        <ListingGallery listingId={listing.id} userId={user.id} initialPhotos={photos} />
      </div>
    </div>
  );
}
