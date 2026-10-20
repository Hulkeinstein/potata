"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { InitialLoader } from "./InitialLoader";

export function CustomerChrome({ placement }: { readonly placement: "header" | "footer" }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return placement === "header" ? <><InitialLoader /><Navbar /></> : <Footer />;
}
