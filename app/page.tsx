import { AppHeader } from "@/components/app-header";
import { WorldCupView } from "@/components/worldcup-view";
import { getWorldCup } from "@/lib/worldcup";

export default async function Home() {
  // Snapshot del fixture en build; el cliente lo refresca solo (useWorldCup).
  const data = await getWorldCup();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] sm:px-6">
      <AppHeader />
      <WorldCupView initialMatches={data.matches} />
    </main>
  );
}
