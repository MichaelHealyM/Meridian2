# Meridian Process Controls website

Plain HTML with Bootstrap 5.3.8 (included in `vendor/`, nothing loads from a CDN). No build step,
no Node, no framework, no tooling. Open `index.html` in a browser to preview; edit with any text editor.

## Before launch

Replace the placeholders, then check none are left (this prints nothing when you are done):

```
grep -rIn -E "example\.com|meridian\.example|YOUR_FORM_ID|000 0000" --exclude-dir=vendor --exclude=README.md .
```

(No `grep`? Use your editor's "Find in Files" for those four words.)

1. **Web address:** replace `https://www.example.com` in `index.html`, `404.html`, `robots.txt`, `sitemap.xml`.
2. **Contact form:** replace `YOUR_FORM_ID` in `index.html` with your Formspree form ID.
3. **Contact details:** replace `hello@meridian.example`, `careers@meridian.example` and
   `+353 21 000 0000` in `index.html`, `404.html` and `js/contact-form.js`.

## Publish on GitHub Pages

Put these files at the top of the repository (delete the old Astro files and workflows), then
Settings, Pages, Source: **Deploy from a branch**, branch `main`, folder `/ (root)`. Add a custom
domain in the same settings. Any other host works too: just upload the folder.

`404.html` uses paths starting with `/`. If the site lives at `username.github.io/repo/` instead of a
domain, change them to start with `/repo/`.

## Where to change things

| To change                       | Edit                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| Any text, card, FAQ, project    | `index.html`: search for the banner (`===== FAQ =====`) or the words. |
| Colours and fonts               | Section 2 at the top of `css/style.css`.                              |
| A new section                   | Copy a block between banners; add a link in the `<nav>` at the top.   |
| A repeated item (card, FAQ)     | Copy one block. FAQ items and carousel slides need new unique ids.    |
| Share image, icons              | Replace `og.png` (1200x630), `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`. |

## Analytics (optional, cookie-free)

Paste your GoatCounter or Cloudflare snippet where the comment in `<head>` says so, then allow its
hosts in the `Content-Security-Policy` tag in each page:

- GoatCounter: add `https://gc.zgo.at` to `script-src` and `https://YOURCODE.goatcounter.com` to `connect-src`.
- Cloudflare: add `https://static.cloudflareinsights.com` to `script-src` and `https://cloudflareinsights.com` to `connect-src`.

## What is in the folder

- `index.html`, `404.html`: the pages. Text is written directly in the HTML.
- `css/style.css`: brand theme and page styles. `vendor/`: Bootstrap. `fonts/`: self-hosted fonts.
- `js/`: `site.js` (every page), `theme-init.js` (runs before first paint), `contact-form.js`,
  `plc-demo.js`, `batch-demo.js`.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, icons.

Security headers: GitHub Pages cannot set them, so each page carries a Content-Security-Policy tag
instead. On Netlify or Cloudflare Pages you can add a `_headers` file as well.

To update Bootstrap, replace the two files in `vendor/bootstrap-5.3.8/` with the new release's
`dist/css/bootstrap.min.css` and `dist/js/bootstrap.bundle.min.js`, and update the version in the
folder name and the two pages.
