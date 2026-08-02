import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: () => null,
  beforeLoad: async () => {
    if (import.meta.env.SSR) return;
    throw redirect({ to: "/claim", replace: true });
  },
  head: () => ({ meta: [{ title: "Redirecting — Bos' Kọ́nà" }] }),
});
