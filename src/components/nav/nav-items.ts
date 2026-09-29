// Hamburger menu exactly as designed (Canva p5, D24), with the typo fixes from D31.
export type NavSection = {
  heading: string;
  href?: string;
  items: { label: string; href: string }[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Dramas",
    items: [
      { label: "Dramas List", href: "/dramas" },
      { label: "Top Dramas", href: "/dramas/top" },
    ],
  },
  {
    heading: "Movies",
    items: [
      { label: "Movies List", href: "/movies" },
      { label: "Top Movies", href: "/movies/top" },
    ],
  },
  {
    heading: "Variety Shows",
    items: [{ label: "Variety Shows List", href: "/variety" }],
  },
  {
    heading: "My List",
    items: [
      { label: "Favorites", href: "/me/lists/favorites" },
      { label: "Currently Watching", href: "/me/lists/watching" },
      { label: "Completed", href: "/me/lists/completed" },
      { label: "Want To Watch", href: "/me/lists/want" },
      { label: "Finish Later", href: "/me/lists/finish-later" },
      { label: "Dropped", href: "/me/lists/dropped" },
    ],
  },
  { heading: "Actors List", href: "/actors", items: [] },
];
