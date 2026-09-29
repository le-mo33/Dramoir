import Link from "next/link";
import { CircleUserRoundIcon, SearchIcon } from "lucide-react";
import { NavDrawer } from "./nav-drawer";

// Header + search bar as designed (Canva p1–p9): aubergine bar with menu, wordmark and profile,
// then the blush search strip. Search becomes functional in S5.
export function SiteHeader() {
  return (
    <header>
      <div className="grid h-16 grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 bg-aubergine px-3 sm:h-20 sm:px-6">
        <NavDrawer />
        <Link href="/" className="flex flex-col items-center text-offwhite" aria-label="Dramoir home">
          <span className="font-serif text-3xl leading-none font-semibold sm:text-4xl">Dramoir</span>
          <span className="mt-1 text-[0.6rem] tracking-[0.45em] uppercase sm:text-xs">The Drama Shelf</span>
        </Link>
        <Link
          href="/login"
          aria-label="Your profile"
          className="grid size-11 place-items-center rounded-full text-offwhite hover:bg-white/10"
        >
          <CircleUserRoundIcon className="size-9" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <form action="/search" role="search" className="border-b border-mauve/40 bg-blush">
        <label className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <SearchIcon className="size-6 shrink-0" aria-hidden />
          <span className="sr-only">Search</span>
          <input
            type="search"
            name="q"
            placeholder="Search dramas, movies, or tropes..."
            className="w-full min-w-0 bg-transparent text-base placeholder:text-aubergine/80 focus:outline-none sm:text-lg"
          />
        </label>
      </form>
    </header>
  );
}
