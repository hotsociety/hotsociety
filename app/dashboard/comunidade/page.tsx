import { redirect } from "next/navigation";

// A Comunidade virou a aba "Canais" do Feed.
export default function Comunidade() {
  redirect("/dashboard/feed?modo=canais");
}
