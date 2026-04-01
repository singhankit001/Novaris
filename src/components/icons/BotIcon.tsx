import { cn } from "@/lib/utils";
import Image from "next/image";

export function BotIcon({ className }: { className?: string }) {
    return (
        <Image
            src="/no-bg-novaris.png"
            alt="Novaris Bot"
            width={40}
            height={40}
            className={cn("w-full h-full object-contain", className)}
        />
    );
}
