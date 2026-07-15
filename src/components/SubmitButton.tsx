"use client";

import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";

// ปุ่ม submit ที่โชว์สปินเนอร์ + disable ตอน server action กำลังทำงาน
export default function SubmitButton({
  children,
  className = "btn-primary",
  pendingText,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-70`}>
      {pending && <Spinner className="text-current" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
