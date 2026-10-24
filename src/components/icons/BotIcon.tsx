import Image from "next/image";
import { cn } from "@/lib/utils";

export function BotIcon({ className }: { className?: string }) {
    return <Image src="/brand/novaris-mark.png" alt="" aria-hidden width={40} height={40} className={cn("h-full w-full object-contain mix-blend-multiply", className)} />;
}
