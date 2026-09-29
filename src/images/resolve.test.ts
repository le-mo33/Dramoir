import { describe, expect, it } from "vitest";
import { classifySource, extractFirstUrl, findPinImage, resolveImageSource, toOriginalSize } from "./resolve";

describe("extractFirstUrl", () => {
  it("repairs a URL pasted twice (Kdrama r339, Money flower)", () => {
    expect(extractFirstUrl("https://pin.it/3xbr2WsEohttps://pin.it/3xbr2WsEo")).toBe("https://pin.it/3xbr2WsEo");
  });
  it("trims and handles empty cells", () => {
    expect(extractFirstUrl("  https://pin.it/abc  ")).toBe("https://pin.it/abc");
    expect(extractFirstUrl("")).toBeNull();
    expect(extractFirstUrl("n/a")).toBeNull();
  });
});

describe("classifySource", () => {
  it.each([
    ["https://pin.it/3k58j7Xpd", "pin_short"],
    ["https://www.pinterest.com/pin/817333032422096443/", "pinterest_pin"],
    ["https://share.google/OHfLq0dBoSua2tNSB", "share_google"],
    ["https://example.com/poster.jpg", "direct"],
    ["not a url", "invalid"],
  ])("%s → %s", (url, kind) => expect(classifySource(url)).toBe(kind));
});

describe("findPinImage / toOriginalSize", () => {
  it("reads og:image regardless of attribute order", () => {
    const a = '<meta content="https://i.pinimg.com/736x/58/98/78/x.jpg" data-app="true" name="og:image" property="og:image"/>';
    const b = '<meta property="og:image" content="https://i.pinimg.com/736x/58/98/78/y.jpg"/>';
    expect(findPinImage(a)).toBe("https://i.pinimg.com/736x/58/98/78/x.jpg");
    expect(findPinImage(b)).toBe("https://i.pinimg.com/736x/58/98/78/y.jpg");
    expect(findPinImage("<html></html>")).toBeNull();
  });
  it("upgrades to the originals size", () => {
    expect(toOriginalSize("https://i.pinimg.com/736x/58/98/78/x.jpg")).toBe("https://i.pinimg.com/originals/58/98/78/x.jpg");
  });
});

describe("resolveImageSource", () => {
  it("never fetches share.google links", async () => {
    const r = await resolveImageSource("https://share.google/abc", () => {
      throw new Error("should not fetch");
    });
    expect(r).toMatchObject({ ok: false, kind: "share_google" });
  });
  it("returns originals then 736x for a pin page", async () => {
    const html = '<meta property="og:image" content="https://i.pinimg.com/736x/aa/bb/cc/z.jpg"/>';
    const fake = (async () => new Response(html, { status: 200 })) as unknown as typeof fetch;
    const r = await resolveImageSource("https://pin.it/xyz", fake);
    expect(r).toEqual({
      ok: true,
      kind: "pin_short",
      imageUrls: ["https://i.pinimg.com/originals/aa/bb/cc/z.jpg", "https://i.pinimg.com/736x/aa/bb/cc/z.jpg"],
    });
  });
});
