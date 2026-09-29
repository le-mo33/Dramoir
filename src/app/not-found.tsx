import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
      <h1 className="font-serif text-4xl font-semibold">This shelf is empty</h1>
      <p className="mt-4 text-lg text-mauve-text">We couldn&apos;t find that page. Some parts of Dramoir are still being built.</p>
      <Link href="/" className="mt-8 rounded-full bg-aubergine px-8 py-3 text-offwhite hover:bg-mauve">
        Back to the shelf
      </Link>
    </section>
  );
}
