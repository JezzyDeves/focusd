import { connection } from "next/server";
import { Pomodoro } from "@/components/pomodoro/Pomodoro";

export default async function Home() {
  // Render per request so each response gets its own CSP nonce (see proxy.ts).
  await connection();
  return <Pomodoro />;
}
