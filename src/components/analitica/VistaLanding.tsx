"use client";

import { useEffect } from "react";
import { capturar } from "@/lib/posthog";

// Primer paso del funnel: la visita a la landing. Sin PII.
export default function VistaLanding() {
  useEffect(() => {
    capturar("landing_vista");
  }, []);
  return null;
}
