import { redirect } from "next/navigation";

// Listing detail pages live at /listings/[id]. This route used to be a
// duplicate detail implementation that read a missing `params.id` at
// runtime, so visiting /listings always failed.
export default function ListingsPage() {
  redirect("/discover");
}
