"use client";

import { useEffect } from "react";
import { iniciarPostHog } from "@/lib/posthog";

// Inicializa PostHog al montar (inerte sin key). Se coloca una vez en el layout.
export default function PostHogInit() {
  useEffect(() => {
    void iniciarPostHog();
  }, []);
  return null;
}
