import type { Metadata } from "next";
import { RepairsWorkspace } from "@/components/reparaciones/repairs-workspace";

export const metadata: Metadata = {
  title: "Servicio técnico",
};

export default function ReparacionesPage() {
  return <RepairsWorkspace />;
}