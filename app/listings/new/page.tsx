import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listing-form";

export default async function NewListingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create a listing</h1>
        <p className="mt-1 text-muted-foreground">
          Add a few details and a photo so other members can find it.
        </p>
      </div>
      <ListingForm mode="create" userId={user.id} />
    </div>
  );
}