import Image from "next/image";
import { cn } from "@/lib/utils";

export function BotIcon({ className }: { className?: string }) {
    return <Image src="/no-bg-novaris.png" alt="" aria-hidden width={40} height={40} className={cn("h-full w-full object-contain", className)} />;
}
