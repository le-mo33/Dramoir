"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_SECTIONS } from "./nav-items";

export function NavDrawer() {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Open menu"
        className="grid size-11 place-items-center rounded-md text-offwhite hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush"
      >
        <MenuIcon className="size-8" strokeWidth={2.5} aria-hidden />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[78%] max-w-sm overflow-y-auto border-none bg-aubergine px-8 py-10 text-offwhite [&_[data-slot=sheet-close]]:text-offwhite"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <nav aria-label="Main">
          {NAV_SECTIONS.map((section, i) => {
            const divider = section.heading === "My List" || section.heading === "Actors List";
            return (
              <div key={section.heading} className={divider && i > 0 ? "mt-6 border-t border-mauve pt-6" : i > 0 ? "mt-6" : ""}>
                {section.href ? (
                  <SheetClose asChild>
                    <Link href={section.href} className="text-lg font-bold uppercase tracking-wide hover:underline">
                      {section.heading}
                    </Link>
                  </SheetClose>
                ) : (
                  <p className="text-lg font-bold uppercase tracking-wide">{section.heading}</p>
                )}
                {section.items.length > 0 && (
                  <ul className="mt-2 space-y-2 pl-6">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <SheetClose asChild>
                          <Link href={item.href} className="text-lg hover:underline">
                            {item.label}
                          </Link>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
