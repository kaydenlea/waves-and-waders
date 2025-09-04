"use client";

import { useRouter } from "next/navigation";

import { ArrowLeft as BackIcon } from "lucide-react";

const BackButton = () => {
  const router = useRouter();
  return (
    <button aria-label="go back" onClick={() => router.back()} className="">
      <BackIcon />
    </button>
  );
};

export default BackButton;
