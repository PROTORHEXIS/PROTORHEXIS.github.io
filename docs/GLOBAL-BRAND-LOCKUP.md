# Global brand asset policy

`src/components/SiteBrand.astro` is the **only public-page logo entry point**; it wraps `src/components/BrandLockup.astro`, the canonical owner-supplied 20-vector SVG geometry. The home page, 404 page, and engineering layout all render the same component. No page should embed a second SVG or add duplicate HTML text spelling the brand.

Brand dimensions, base color, hover color, and mobile sizing are controlled in the **global** `src/styles/site.css` through `--site-brand-width`, `--site-brand-height`, `--site-brand-color`, and `--site-brand-hover-color`. The SVG continues to use `currentColor`.

The retired `/brand/mark.svg` placeholder is not referenced by any page. The separate homepage and workstation visual systems remain distinct outside their common brand asset.

Regression checks cover all six public HTML routes (home, 404, four roadmap views), identical canonical SVG markup, absence of old HTML wordmarks and placeholder-image use, and CSS-driven SVG color on both homepage and workstation.
