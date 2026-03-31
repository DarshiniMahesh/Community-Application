"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SanghaRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sangha/login");
  }, [router]);
  return null;
}