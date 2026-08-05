import assert from "node:assert/strict";
import test from "node:test";
import { upgradeImageUrl } from "./images.ts";

test("upgradeImageUrl requests an image rendition that matches the rendered width", () => {
  assert.equal(
    upgradeImageUrl("https://example.test/asset.jpg?w=300&q=90", 800),
    "https://example.test/asset.jpg?w=800&q=80",
  );
  assert.equal(
    upgradeImageUrl("https://i.ytimg.com/vi/example/maxresdefault.jpg", 320),
    "https://i.ytimg.com/vi/example/hqdefault.jpg",
  );
  assert.equal(
    upgradeImageUrl("https://cdn.example.test/alternates/s1200/image.jpg", 1600),
    "https://cdn.example.test/alternates/s1600/image.jpg",
  );
});
