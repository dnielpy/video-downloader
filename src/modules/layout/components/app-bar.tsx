import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/src/modules/layout/components/theme-toggle";

export function AppBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/" aria-label="Download Manager home">
          <span className="grid size-9 place-items-center rounded-xl bg-primary shadow-sm">
            <Image src="/download-manager-logo.svg" alt="" width={22} height={22} priority />
          </span>
          <span className="text-[17px] font-bold tracking-[-0.035em]">Download Manager</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
