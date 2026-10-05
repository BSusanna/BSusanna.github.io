const { test, expect } = require("@playwright/test");

test("link page exposes profile destinations without the site chrome", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/al-folio/link/");
  expect(response.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Susanna Bardini", level: 1 })).toBeVisible();
  await expect(page.locator("#navbar, footer")).toHaveCount(0);

  const destinations = {
    Website: "/al-folio/",
    CV: "/al-folio/assets/pdf/susanna-bardini-cv.pdf",
    Email: "mailto:susanna.bardini@polimi.it",
    LinkedIn: "https://www.linkedin.com/in/susanna-bardini/",
    GitHub: "https://github.com/bsusanna",
    "Google Scholar": "https://scholar.google.com/citations?user=aaWwuRcAAAAJ",
    ORCID: "https://orcid.org/0009-0001-9265-1411",
  };

  for (const [name, href] of Object.entries(destinations)) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  const portrait = page.getByRole("img", { name: "Susanna Bardini" });
  await expect(portrait).toBeVisible();
  await expect.poll(() => portrait.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect((await page.request.get(destinations.CV)).ok()).toBe(true);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Website", exact: true })).toBeFocused();
  await expect(page.getByRole("link", { name: "Website", exact: true })).toHaveCSS("outline-style", "solid");
  expect(errors).toEqual([]);
});

test("standalone theme control switches the shared site preference", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/al-folio/link/");
  await page.getByRole("button", { name: "Change color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
});

for (const theme of ["light", "dark"]) {
  test(`link page uses the site ${theme} palette and touch-friendly layout`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
    await page.goto("/al-folio/");
    const palette = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      accent: getComputedStyle(document.documentElement).getPropertyValue("--global-theme-color").trim(),
    }));
    await page.goto("/al-folio/link/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("body")).toHaveCSS("background-color", palette.background);

    const layout = await page.evaluate(() => ({
      accent: getComputedStyle(document.documentElement).getPropertyValue("--global-theme-color").trim(),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      targets: Array.from(document.querySelectorAll("main a, main button"), (link) => {
        const bounds = link.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height };
      }),
    }));
    expect(layout.accent).toBe(palette.accent);
    expect(layout.overflow).toBe(false);
    expect(layout.targets).toHaveLength(8);
    for (const target of layout.targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
  });
}
