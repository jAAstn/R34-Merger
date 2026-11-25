# Steamy34 · Beta

An all-in-one upgrade for rule34.xxx: a cleaner look, a popup viewer, a much easier search and downloads with tag-named files – on your computer and on your Android phone.

> **A fan-made hobby project.** Steamy34 is made for fun. It's free and will never be monetized: no ads, no paid features, no data collection. It isn't made by or connected to rule34.xxx.
>
> **About the code.** Steamy34 is designed by steamycorner, a designer (web design, corporate identity, 3D) rather than a programmer. The code is written with AI (Claude), and bug fixes are made the same way, so mistakes are possible. Each version is tested before release. Problems can be reported on Discord or in the Feedback tab. The source is split into modules under `src/` and built into the single userscript file – see the build section below.
>
> **New in Beta 3.10: blur instead of hide, and better collections.** Any blacklisted tag can now **blur** its posts instead of hiding them: the tag is named and a **Show** button uncovers the post. A post with any other blacklisted tag still stays hidden. Collections get a **cover**, **sorting**, **drag to arrange** and a **note**. Plus: a **Similar** strip in the popup (more from the same artist and character, Shift + ← / → to go through it), buttons on phones by **holding a thumbnail**, and versions of the same picture grouped into one (with your API key).
>
> **Since Beta 3.9:** blocked stays blocked everywhere (lists, popup, comments, Collections, Downloads), tags **muted** for 24 hours or 7 days, backups that **combine**, Watch later, iCame in the popup, Find source / Upscale / Report, download subfolders per artist, calmer Artists, Wiki, Aliases and iCame pages. **Since 3.8:** collections on all your devices (optional), download and viewed buttons on the thumbnails, a Downloads window. **Since 3.7:** blacklists as long as you like, saved searches, an optional API key for fewer Cloudflare checks.

## 🔨 Build / development (since the module split)

The userscript is no longer edited as one file. It lives in `src/` (60 modules) and is
built with esbuild into the single installable `Steamy34.js`:

```bash
npm install          # once – installs esbuild + ESLint (dev dependencies)
npm run build              # rebuilds Steamy34.js (version unchanged)
npm run build -- --bump    # rebuilds and bumps the last number in src/version.js (3.11.1-beta → 3.11.2-beta)
npm run test:imports       # checks that every module import/export is complete
npm run test:smoke         # mock-browser test: built bundle vs. the committed Git version
npm run lint               # ESLint (eslint:recommended; no-undef stays on)
```

- **Source of truth:** `src/` – `Steamy34.js` is the built, installable file and stays in the repo.
- **Version:** `@version` comes from `src/version.js`; the version shown inside the script
  (`CURRENT_VERSION`) comes from the newest `CHANGELOG` entry in `src/changelog.js` – update both.
- **Modules:** `init.js` (entry: all top-level side effects, in the original order) ·
  `config.js` (defaults, saved config, CSS variables, `onReady`) · `version.js` / `changelog.js` ·
  `styles/` (`core`, `windows`, `pages`, `site` = the CSS strings) · `theme.js` · `ads.js` ·
  `thumbs.js`, `tag-bar.js`, `list-actions.js`, `hover.js`, `hover-info.js`, `thumb-buttons.js` ·
  `downloads/` (`names`, `state`, `folder`, `download`) and `downloads-window.js` ·
  `search.js`, `search-box.js`, `search-chips.js`, `autocomplete.js`, `saved-searches.js`,
  `infinite-scroll.js`, `quick-panel.js`, `resume.js`, `pages.js` ·
  `popup.js`, `popup-more.js`, `popup-zoom.js`, `comments.js`, `post-info.js`, `auto-next.js`,
  `collections.js`, `collections-sync.js`, `sidebar.js`, `window-shell.js`, `stats.js` ·
  `following.js`, `following-window.js`, `home.js` · `blacklist.js`, `blacklist-window.js`,
  `settings-menu.js`, `privacy.js`, `backup.js`, `support.js`, `censored-mode.js` ·
  `favourites.js`, `account.js`, `batch.js`, `api.js`, `video.js`, `media.js` ·
  `welcome.js`, `mobile-guide.js`, `tips.js`, `phone-menu.js`.
- **Shared state:** a mutable top-level `let` stays in the module that owns it. Other modules
  read it as a live binding and write through an exported `set…()` function, so no behaviour changes.

## Features

**Look**

- White, Dark and OLED (true black) colour modes, each with depth (cards, panels, shadows) – rule34's own theme follows along, so pages don't flash white while they load
- A calm sidebar: search, what you follow, view switches and your tools – in four tidy groups; recent searches and favourite tags open as small menus next to it (on phones: a sheet from the bottom)
- Modern thumbnail layout (original ratios or square tiles), with a size slider
- VID / GIF labels, plus artist and character tags right on the thumbnails – or keep the pictures clean: tags and buttons in a strip below, or only on hover
- Rounded or square corners – your choice
- A start page that's a small home: your search, "Continue" where you left off, recent searches, favourite tags and the newest posts from who you follow
- My Account as tiles and Options in tidy groups, with the API field folded away

**Viewing posts**

- Popup viewer: open posts without leaving the page, browse with ← / → or WASD (at the end of the list the next page loads by itself), F / C / T for favourite, collection and theater mode, L to follow the artist, close with Esc or a middle click
- Comments (all of them, with "More comments"), votes, favourites, post info and parent / child / pool links inside the popup
- ♥ favourites both ways: ♥ again removes a favourite (with Undo) – on thumbnails, in the popup and right on your favourites page
- **Similar** strip in the popup: more posts from the same artist and character, Shift + ← / → to go through it while ← / → stay on the page
- Slideshow (auto next post) with a timer, theater mode, zoom and video options
- Hover previews: videos play and score / resolution show when you hover a thumbnail
- Post pages: a click on the picture shows it at its real size; long comic strips fit the width and read from the top
- Videos stall? Pick another video server in the settings

**Search, following & saved searches**

- Tags as bubbles you can add, remove or exclude with one click
- Filter menus for score, size, sort, type and rating
- Pinned filters that carry over to every new search
- Recent searches and favourite tags, one click away
- **Follow artists:** one click on the bell next to an artist – the sidebar lists everyone you follow, each with a count of their new posts
- **The Following window** (G): your artists as circles, their newest posts in a grid – always newest first, posts since your last visit marked NEW, "Open as a search" for every filter and sort
- **Saved searches:** the disk button next to Search saves a search with all its filters – listed under Following with its new posts; a click opens that search, with NEW on what's new

**Blacklist**

- One Blacklist panel – in the sidebar and on rule34's Options page – with tag types, sorting, a filter and your recent tags
- ⊘ next to any tag blacklists it; posts already on screen are greyed out, with Undo
- **As long as you like:** Steamy34 keeps the whole list and hides what doesn't fit into rule34's cookie itself
- Your account keeps a copy: tags not on it yet are marked, and Save on Options puts the list there
- **Blocked stays blocked:** Steamy34 checks every post against your whole blacklist itself – on every list, while scrolling, in the popup and the Following window. A blacklisted post you open anyway is covered ("Show anyway" if you really want to)
- **Mute for a while:** hide a tag for 24 hours or 7 days – it comes back by itself
- **Blur instead of hide**, per tag: its posts show blurred with the tag named and a Show button (any other blacklisted tag still hides the post)

**Organising**

- Download and viewed buttons on the thumbnails: green = downloaded, blue = viewed. Hover the eye to mark a post as viewed – or as downloaded without downloading it. Every thumbnail item has its own switch
- Hides viewed or downloaded posts if you like
- Collections: your own folders of posts – optionally on all your devices (their posts are favourited too, so they're on your phone)
- Collection tools: pick a cover, sort the posts or drag them into your own order, add a note
- Your favourites page: mark all as viewed or downloaded, or select posts to download, put into a collection or unfavourite in one go
- A Downloads window with every post you downloaded, newest first
- Your stats: top artists, characters and series you've downloaded

**Downloads**

- Press **B** on a post to download it (the key can be changed in the settings) – or the ⬇ on a thumbnail, without opening it
- Downloads at maximum resolution, named `[character] [series] [artist] #post` (e.g. `[amelie lacroix] [overwatch] [someartist] #101.jpg`) – or the classic `Character_Series_Artist_Resolution` style
- Optional own download folder – pick any folder once, e.g. Eagle's watch folder (Chrome, Edge and Brave on computers)
- Batch download ticked posts or whole collections, with a progress panel (Pause / Cancel)
- Asks before downloading a post a second time (can be switched off)
- If the server doesn't answer, you get a message with a Retry button instead of a hanging download

**On your phone (Android)**

- Phone layout: in the popup the picture is on top, with info, tags and comments below
- Swipe left / right to browse, swipe down or press Back to close
- One ☰ Menu with Steamy34's tools (switches, Collections, Stats, Blacklist, Downloads, Settings, tips) and all of rule34's pages
- Their own thumbnail size (the Size slider in the menu); tag buttons and ♥ always visible, no data-hungry preloading
- Quick tips with a Phone tab that lists all gestures
- The Following window fills the screen; Back closes it

**More**

- Infinite scrolling with "Page N" dividers – and "Continue at page N" when you come back to a search
- New posts from what you follow show in the browser tab: "(12) rule34"
- With an ad blocker on, no empty ad spaces next to or above the posts (without one, every ad stays as rule34 shows it)
- Gentle on the site: page loads are spaced out, so Cloudflare checks come much less often. When one does come, a clear notice at the bottom of the screen shows it with a _Solve_ button (and a _?_ that explains why it matters) – without the check, rule34 loads nothing new. The check window also points to the optional API key, which makes checks rarer
- Steamy34 Settings sits in rule34's top menu, on every page
- A welcome guide on first start – every feature in chapters, a keyboard map of all keys and every touch gesture – quick tips with all the shortcuts, and a short "What's new" after notable updates
- Censored mode: press X and every picture, video and comment is blurred – share a screenshot safely
- Settings with a search box: type a word and jump straight to the right option
- Works with the keyboard (Tab, Enter) as well
- Backup and restore of all your settings and data – e.g. to move everything to your phone
- **Optional: your rule34 API key** (Settings → API key) for new-post counts and hover previews – fewer Cloudflare checks. The key only goes to rule34's own API, stays in your browser and is never in a backup. Steamy34 works just the same without it

[![](https://greasyfork.s3.us-east-2.amazonaws.com/8fwo3kly72nnpvtgzw5slxdwdhkq)](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MzIzOTE1LCJwdXIiOiJibG9iX2lkIn19--a197eac6812fb1e57eda561aecf0331e15529475/01.png) [![](https://greasyfork.s3.us-east-2.amazonaws.com/h036pkongduh4x018ouof24msjo4)](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MzIzOTE2LCJwdXIiOiJibG9iX2lkIn19--96b17e24ba51935f38fbe698302f2c60a34724e6/02.png) [![](https://greasyfork.s3.us-east-2.amazonaws.com/4rpu8p6vxmurw0pkqsn8nir8cy9p)](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MzIzOTE3LCJwdXIiOiJibG9iX2lkIn19--53791b9d64ac1a85ef393aeab6981a378101e1b2/03.png) [![](https://greasyfork.s3.us-east-2.amazonaws.com/i240jklbmp9ptxom7547n7tctugd)](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MzIzOTE4LCJwdXIiOiJibG9iX2lkIn19--88f61ccd36be203087237950106630e7789acbaa/04.png) [![](https://greasyfork.s3.us-east-2.amazonaws.com/xw3rjxfn4ii8xw9eq6wuahevdcq7)](https://greasyfork.org/rails/active_storage/blobs/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MzIzOTE5LCJwdXIiOiJibG9iX2lkIn19--6637960f1a496206c856de6ffdb9b1ca111122ac/05.png)
