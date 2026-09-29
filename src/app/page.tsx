// Temporary S0 home: shows the brand while the real home page (hero + shelves) arrives in S8.
export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
      <h1 className="font-serif text-4xl font-semibold sm:text-5xl">Meet Dramoir — The Drama Shelf</h1>
      <p className="mt-4 text-lg">
        Find your next watch by the trope or mood you&apos;re craving.
        <br />
        Track your dramas and organize them into your own lists.
      </p>
      <p className="mt-10 rounded-full bg-mauve px-8 py-3 text-lg text-offwhite">Coming soon</p>
    </section>
  );
}
