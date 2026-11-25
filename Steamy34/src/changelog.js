// changelog – Steamy34 (aus Steamy34.js aufgeteilt)
import { openQuickTips } from './tips.js';
import { openWelcome } from './welcome.js';
import { openWindow } from './window-shell.js';

const CHANGELOG = [
	{ v: 'Beta 3.11.1', date: '2026-11-24', items: [
		'Blacklist: muted tags, rating:e and tags with an apostrophe no longer come back on screen when you blacklist another tag with ⊘.',
		'Long sessions stay light: the popup no longer leaves a timer running for every post you open, and only the most recent post pages are kept in memory.',
		'Backups now carry your "blur instead of hide" tags and each collection\'s note, cover and order. Combining a backup no longer changes this device\'s video options, Auto next timer or theater mode (only with "Also use the backup\'s settings").',
		'Downloads window: a post downloaded from the popup keeps its own picture, even if you moved on before the file arrived.',
		'Collections on all devices: when adding favourites fails (not logged in, a Cloudflare check), it waits a few hours instead of trying – and telling you – on every page.'
	] },
	{ v: 'Beta 3.11', date: '2026-11-24', notify: true, items: [
		'A new, much bigger welcome guide: every feature in chapters (popup, search, thumbnails, following, downloads, collections, blacklist …), switchable between Computer and Phone.',
		'Controls chapter: a keyboard with your keys lit up – press any key to see what it does – and drawings of every tap, hold and swipe on phones.',
		'Open it any time: Settings → Help → ✨ Welcome guide.'
	] },
	{ v: 'Beta 3.10.1', date: '2026-11-24', items: [
		'Phones: the Similar strip now shows right under the picture (it was out of sight), and a tap on one of its posts goes back up to the picture.',
		'Phones: arrange a collection with your finger – hold a post for a moment, then drag it.',
		'Similar no longer gets mixed up with long comic strips (the picture could vanish when both were open).',
		'Phones: the ★ and × on a collection\'s cover post are always there (they waited for a mouse hover).'
	] },
	{ v: 'Beta 3.10', date: '2026-11-23', notify: true, items: [
		'Blacklist: blur instead of hide, per tag. Click a tag in the Blacklist window → "Blur them, with Show". Its posts show blurred with the tag named and a Show button; a post with any other blacklisted tag still stays hidden.',
		'Collections: choose a cover (★ on a post), sort the posts (your own order, date added or post number), drag them to arrange, and add a note to each collection.'
	] },
	{ v: 'Beta 3.9.6', date: '2026-11-23', items: [
		'Collection button: clicking it again (or pressing C again) closes the little collections list.'
	] },
	{ v: 'Beta 3.9.5', date: '2026-11-23', items: [
		'Similar strip: stays open while you browse and fills with each post\'s similar ones. Shift + ← / → go through the strip, ← / → stay on the page (also from a strip post), the mouse wheel scrolls it sideways.'
	] },
	{ v: 'Beta 3.9.4', date: '2026-11-23', items: [
		'Popup → More → Similar: a filmstrip of posts with the same artist and character along the bottom – click one to see it, ← / → go through the strip.',
		'Phones: hold a thumbnail for a moment – favourite, download, viewed, collection and Watch later come up as a sheet.',
		'With your API key: versions of the same picture (parent / child) show as one thumbnail with "+N versions" – click to unfold them.'
	] },
	{ v: 'Beta 3.9.3', date: '2026-11-23', items: [
		'Popup: a "More" row – Find source (SauceNAO), Similar (iqdb) and Upscale (Waifu2x) open in a new tab with the post, and Report sends rule34\'s own report with a reason.',
		'Videos: frame by frame (⏮ ⏭ or the , and . keys) and A–B – loop just a part of a video.',
		'Artists, Wiki, Aliases and iCame Top 100 in Steamy34\'s look: calmer tables, a follow bell next to every artist, a leaderboard with medals and bars for iCame (Settings → Look & feel to switch it off).'
	] },
	{ v: 'Beta 3.9.2', date: '2026-11-23', items: [
		'Thumbnails: a collection button next to ♥ / 👁 / ⬇ – amber and always there when the post is in a collection (own switch in Settings → Posts page).',
		'Popup: when, who and where from as chips – "3 years ago", the uploader, and the source as a button with the site\'s name ("Twitter ↗").',
		'Popup: an iCame button (rule34\'s own counter, once every 24 hours) and "Later" – your Watch later list, kept in Collections.',
		'Your favourites page keeps the Posts menu row (My Favorites highlighted) instead of jumping to My Account.',
		'Downloads: a subfolder per artist (own download folder, Settings → Downloads), and a filter in the Downloads window – artist, character, series or #number.',
		'Random sort: a "Shuffle again" button, and no post shows up twice while you scroll on.'
	] },
	{ v: 'Beta 3.9.1', date: '2026-11-23', items: [
		'Blocked stays blocked – the last gaps: posts with a blacklisted tag are hidden on the comments page too ("Show them" if you want), and covered in your Collections and the Downloads window – "Show" on one post, or "Show blacklisted (N)" for all of them, since you saved those yourself.',
		'Mute a tag for a while: in the Blacklist, pick "Mute 24 hours" or "Mute 7 days" next to Add – the tag is hidden until then and comes back by itself.'
	] },
	{ v: 'Beta 3.9', date: '2026-11-23', notify: true, items: [
		'Backups combine now: importing adds everything from the file (follows, saved searches, collections, viewed / downloaded marks, blacklist) to what you have – nothing is removed, and this device keeps its own settings unless you choose to take them over. Export and import now and then, both ways, and two devices stay in step.',
		'Steamy34 keeps its data in each browser – it works best on one device. Settings → Privacy & data explains how to bring a second one along.',
		'Blacklist: "Save to account" right in the Options blacklist, one click – your other devices take the tags over when they open Options.',
		'Cloudflare checks explained: the welcome tour, the quick tips and the phone guide say what to do – and the first time a check comes up, the notice explains itself. (Solve, tick the box, done – until then rule34 loads nothing new.)',
		'An empty posts page ("Nobody here but us chickens!") now says what\'s going on – e.g. rule34 sends empty pages for a while after a Cloudflare check – with a Reload button.'
	] },
	{ v: 'Beta 3.8.5', date: '2026-11-23', items: [
		'Fixed: on post pages the box with search, Download and the tools stayed at the top while scrolling and covered the tags. It scrolls with the page now (B still downloads from anywhere).'
	] },
	{ v: 'Beta 3.8.4', date: '2026-11-23', items: [
		'Fixed: Options kept saying some tags were "not on your account yet" even after Save – tags with an apostrophe that were blacklisted before 3.8.1 were stored in a coded form. They\'re cleaned up by themselves now.'
	] },
	{ v: 'Beta 3.8.3', date: '2026-11-23', items: [
		'Fixed: searches could suddenly come back empty ("Nobody here but us chickens!") – rule34 now uses your blacklist cookie inside every search, and a damaged cookie (seen after reloading during a Cloudflare check) broke them. Steamy34 now checks the cookie on every page and writes it fresh when needed.'
	] },
	{ v: 'Beta 3.8.2', date: '2026-11-22', items: [
		'After a small update like this one, a short note says so once: "Steamy34 updated to …" with a What\'s new button. Big updates still open the What\'s new window.'
	] },
	{ v: 'Beta 3.8.1', date: '2026-11-22', items: [
		'Blacklist: tags with an apostrophe (like five_nights_at_freddy\'s) now hide their posts – rule34 writes the apostrophe in a coded form that never matched. Their names show properly too, without "&#039;".',
		'Blacklisted posts are now hidden by Steamy34 as well, not only by rule34 – a post with a blacklisted tag could still show up. rule34\'s "Hidden" link still shows them on request.',
		'Blocked stays blocked: a post with a blacklisted tag that you open anyway (a link, a post page) is covered – "Show anyway" if you really want to see it. Also hidden on other pages (pools…), short ratings like rating:e work, and posts you blacklist while they\'re on screen are blurred completely.'
	] },
	{ v: 'Beta 3.8', date: '2026-11-22', notify: true, items: [
		'Settings moved into rule34\'s top menu – "Steamy34 Settings", on every page. Its place in the sidebar is now Downloads: every post you downloaded, newest first (older downloads show their number – with an API key, their picture too).',
		'Your favourites page has buttons now: mark all favourites as viewed or as downloaded (only the mark – nothing downloads), and Select… to download, put into a collection or unfavourite several at once.',
		'Collections on all your devices (optional): Steamy34 can also favourite every post you put into a collection – rule34 keeps favourites on your account, so they\'re on your phone too. Your favourites page becomes "Favourites & Collections" and shows which collection each post is in. Take a post out of your favourites anywhere and it leaves its collections too. You\'re asked once when you open Collections; Settings → Downloads to change it.',
		'Thumbnails: next to the ♥ there are now a download button and a "viewed" button while you hover – download a post without opening it, or mark it as viewed / not viewed. They show what you did: green = downloaded, blue = viewed – and stay there without hovering. Hover the eye for a small menu: mark a post as viewed, or as downloaded without downloading it. Settings → Posts page has a switch for each thing on a thumbnail: ♥, download, viewed, the viewed / downloaded marks and the tags.'
	] },
	{ v: 'Beta 3.7.3', date: '2026-11-22', items: [
		'Long comic strips are readable now: on post pages and in the popup they fit the width and start at the top – scroll down to read. Click for the whole strip or its real size, as before.',
		'The Cloudflare check window mentions the optional API key, which makes these checks come up less often – with a button to its page in Settings.'
	] },
	{ v: 'Beta 3.7.2', date: '2026-11-22', items: [
		'Single post pages: click the picture to see it at its real size, click again to fit it to the window. With "Fit pictures to the screen" off (Steamy34 Settings → Viewing posts), pictures open at their real size.'
	] },
	{ v: 'Beta 3.7.1', date: '2026-11-22', items: [
		'Phones: thumbnails are back to their earlier size (as on computers). The Size slider in the ☰ Menu still changes them on their own.'
	] },
	{ v: 'Beta 3.7', date: '2026-11-21', notify: true, items: [
		'My Account in Steamy34\'s look: rule34\'s own links as clean tiles – its pages on top, password, two-factor and e-mail below.',
		'Blacklists as long as you like: rule34 keeps the blacklist in one browser cookie, which holds about 4,000 characters – longer lists used to get lost in the browser. Steamy34 now keeps the whole list and hides the tags that don\'t fit itself, everywhere.',
		'Options is sorted into four groups with a small menu: Filtering, Display, Video server, Account & API.',
		'One blacklist: the Blacklist window and the Filtering part of Options are the same panel (types, sorting, filter, recent tags) and edit the same list – changes apply right away. Your account keeps a copy: tags not on it yet get a dashed amber outline, and Save on Options puts the list there (the window links to it). Opening Options takes over every tag already on your account.',
		'Video server ("Preferred CDN location") is now also in Steamy34 Settings → Viewing posts – for when videos stall or won\'t start.',
		'rule34\'s own theme now follows Steamy34\'s colour mode, so pages don\'t flash white while they load. rule34\'s own tag suggestion list is off (Steamy34\'s search box has its own) – both can be changed in Settings.',
		'Saved searches are back – with filters: the square disk button next to Search saves what the search box holds (tags, score, size, sort, type, rating). They sit under Following in the sidebar, each with its new posts – a click opens that search, with NEW on what came out since your last visit. Click the disk again to remove one.',
		'Optional: your rule34 API key (Settings → API key). rule34\'s API sends plain data instead of whole pages – with your key, Steamy34 uses it for new-post counts and hover previews, so Cloudflare checks come less often. The page explains what it does and what Steamy34 promises: the key only goes to rule34\'s own API, stays in this browser, isn\'t in backups. Without it, everything works as before.',
		'White and OLED have depth now: in White, cards and panels sit lighter on a soft grey page, with darker borders and real shadows; in OLED the page stays true black while panels keep visible steps above it. (Dark stays as it was.)',
		'Fixed: "N new" for followed artists also counted posts with blacklisted tags – which the Following window (rightly) hides. The counts now match the NEW marks.',
		'Favourites both ways: ♥ (or F in the popup) on a post that\'s already a favourite removes it – with Undo. On your favourites page every ♥ is filled and removes the post right there, and the posts sit in the normal grid.',
		'On pages without the sidebar (your favourites, My Account, Options…), Steamy34 is an item in rule34\'s top menu now, instead of a button in the corner. And a list that fits on one page no longer shows a lone page number.',
		'The API key field in Options stays folded away – Steamy34 never reads it.'
	] },
	{ v: 'Beta 3.6', date: '2026-11-21', notify: true, items: [
		'New Following window: everything you follow in one window on top of the page you\'re on. Your artists sit in a row of circles at the top (a coloured ring = new posts), their newest posts in a grid below, with NEW on the ones since your last visit.',
		'Click a post and it opens in the popup as usual – ← / → go through that artist\'s posts and load more at the end. Close it and you\'re back in the grid; close the window and you\'re back on your page.',
		'Open it with the sidebar\'s Following box or the G key (changeable in Settings → Following). ← / → switch between artists, Esc closes. "Bigger" in its bottom right corner makes it nearly as big as the screen. On phones it fills the screen and Back closes it.',
		'New start page: rule34\'s start page becomes a small home. Your search, "Continue" where you left off, your recent searches and favourite tags on the left (the post count as plain text), the newest posts from who you follow on the right – click a circle to see just that artist. New to Steamy34? It shows three first steps instead. Settings → Look & feel brings back the site\'s own.',
		'Collections: a post opens in the popup viewer on top of the collection – ← / → go through the collection, Esc brings you back. (Ctrl + click still opens the post page in a new tab.)',
		'Video previews on hover no longer turn the thumbnail dark: they start a little into the clip and only appear once the first picture is there.',
		'Settings has a Discord button – ideas, bugs and news in the steamycorner Discord.',
		'Following is for artists only now – "All artists" means exactly that. Searches you followed moved into your Recent searches, so none is lost.',
		'Followed artists are always newest first now: the score and type filters per artist are gone. "Open as a search" in the window takes you to the normal search, with every filter and sort.',
		'Sidebar: Recent and Tags open as small menus right next to the sidebar, instead of long lists inside it – on phones as a sheet that slides up from the bottom (swipe it down, tap the page or press Back to close). And when the sidebar is taller than the window, it scrolls on its own with the mouse wheel – Settings and the tips below it are always in reach.',
		'With an ad blocker on, the empty ad space above "Page 1" folds away too, like the right column. Without an ad blocker every ad stays exactly as rule34 shows it.',
		'The Cloudflare check can\'t be missed any more (3.6.3): a big notice at the bottom of the screen that keeps pulsing until it\'s solved. The ? on it explains why it matters – without the check, rule34 loads nothing new.',
		'Phones (3.6.3): bigger thumbnails with their own size (about two posts to a row – the Size slider in the ☰ Menu changes it), and tapping an artist under Following in the menu closes the menu and opens the Following window.',
		'The little tip bubbles are gone (3.6.1) – the welcome tour and the quick tips (?) still explain everything when you want them.'
	] },
	{ v: 'Beta 3.5.1', date: '2026-11-21', items: [
		'The popup no longer stops at the last loaded post: → loads the next page and goes on (it already starts loading 3 posts before the end).',
		'Popup comments: the count shows all of them (rule34 sends 10 at a time), and "More comments" loads the rest right in the popup.',
		'Popup: the site\'s own "< previous · Tag search · next >" bar no longer shows up as if it were a note about the post.',
		'Sidebar: "Shortcuts & tips" and "What\'s new" no longer stick out of the site\'s narrow sidebar.'
	] },
	{ v: 'Beta 3.5', date: '2026-11-21', notify: true, items: [
		'Far fewer Cloudflare checks: everything Steamy34 loads from rule34 now waits in one line and is spaced out – what you asked for (the popup, scrolling) goes first, the extras after it. After a check, it all runs slower for a while.',
		'Fewer page loads: the popup loads only the next post in advance (its picture straight from the image server), the size on hover waits a full second, and the Following check waits until you stop clicking around.',
		'When a check does come, it no longer covers the top of the page: a small glowing "Quick check needed" sits in the corner, and "Solve check" shows up right where something stopped – at the end of the list or in the popup\'s tags.',
		'"Copy info for a bug report" now says what set off the last check, so we can find out what causes them.'
	] },
	{ v: 'Beta 3.4.2', date: '2026-11-21', items: [
		'On a followed artist\'s page (and "All artists"), the search box now stays on that page: a filter like Size 1440p+ or an extra tag only narrows that artist\'s posts instead of starting a new search over everything. "✕ Remove filters" in the bar at the top brings the full page back, and "Search all posts instead" in the sidebar searches everything.'
	] },
	{ v: 'Beta 3.4.1', date: '2026-11-20', items: [
		'New license: CC BY-NC-SA 4.0 – Steamy34 stays free to share and change, with credit to steamycorner, never commercially, and changed versions under the same license.'
	] },
	{ v: 'Beta 3.4', date: '2026-11-20', notify: true, items: [
		'Continue where you left off: back on a search you had scrolled deep into, a small message offers "Continue at page N".',
		'The browser tab shows "(12) rule34" (and a dot on its icon) while the artists and searches you follow have new posts.',
		'L in the popup follows (or unfollows) the post\'s artist – with several artists, a small menu lets you pick with 1, 2, 3… Each followed artist can now have its own filter (Following → Manage), e.g. "Everything" for one and "Score ≥ 100" for another.',
		'Screenshot mode is now "Censored mode" (still X) – and it blurs comment texts and names too, so screenshots are safe to share.',
		'Settings → Help → "Copy info for a bug report": shows what would be shared, then copies it for #feedback on Discord. Video previews wait a moment longer before loading, and the settings are tidier (new "Following" section).'
	] },
	{ v: 'Beta 3.3.5', date: '2026-11-20', items: [
		'With an ad blocker on, the ad column on the right is now always folded away – also when an ad slipped through your blocker (that happened mostly on the first visit). Without an ad blocker nothing changes.'
	] },
	{ v: 'Beta 3.3.4', date: '2026-11-20', items: [
		'Steamy34 has its own channels on steamycorner\'s Discord: #feedback and #new-ideas – the link is in Settings → Help and in the welcome tour.'
	] },
	{ v: 'Beta 3.3.3', date: '2026-11-20', items: [
		'Steamy34 now has its own page on Sleazy Fork – the script\'s homepage and feedback links (Tampermonkey dashboard) point there.'
	] },
	{ v: 'Beta 3.3.2', date: '2026-11-20', items: [
		'Phones: with "Only on hover", the tags and ♥ on thumbnails are now always shown – there\'s no hovering on a touch screen.',
		'"pinned" / "paused" now sits right next to the pin icon of a filter.',
		'Followed searches read nicer: "height:>=1080 width:>=1080" shows as "1080p+", and the bar on top is tidier on phones.'
	] },
	{ v: 'Beta 3.3.1', date: '2026-11-20', items: [
		'The bar on top of an artist\'s (or a followed search\'s) page is calmer: one line, with "Following" and "Manage" side by side on the right.',
		'Sidebar labels are no longer cut off ("Collec…", "Rec…") – in rule34\'s narrow sidebar the four tools show their icon above the name.'
	] },
	{ v: 'Beta 3.3', date: '2026-11-20', notify: true, items: [
		'A calmer sidebar: four clear groups instead of nine boxes. Under the search box: Recent, ★ Tags (your favourite tags) and the bell to follow the search – one list opens at a time. Then Following, then "View" (switches, size, batch download), then Collections, Stats, Blacklist and Settings in one small block.',
		'The White / Dark / OLED picker moved to Settings → Look – you usually set it once.'
	] },
	{ v: 'Beta 3.2', date: '2026-11-20', notify: true, items: [
		'New: screenshot mode. Press X (or the "Blur pictures" switch in the sidebar) and every picture and video is blurred – thumbnails, the popup, post pages – so you can share a screenshot safely. X again shows everything; downloads are never affected.',
		'On the pages of your followed artists and searches, a short note now explains why your pinned filters show "Any": they are paused there so you see everything new. Your pins stay as they are for every other search.'
	] },
	{ v: 'Beta 3.1.1', date: '2026-11-20', items: [
		'Fairer to rule34.xxx: your ad blocker always acts first. Steamy34 no longer hides the right-hand ad column early – only once the page has loaded and the column stayed empty, and it comes back the moment anything loads in it. Ad spaces in the sidebar are never tidied away.'
	] },
	{ v: 'Beta 3.1', date: '2026-11-20', notify: true, items: [
		'Saved searches and followed artists are now one thing: "Following" in the sidebar. The bell under the search box follows any search (e.g. a character with a score filter) – it gets its own "N new" count and NEW on its new posts, just like an artist.',
		'Your saved searches moved over automatically, with their counts. "Recent & saved" is now simply "Recent".'
	] },
	{ v: 'Beta 3.0.2', date: '2026-11-20', items: [
		'Your viewed and downloaded posts are even safer: if the storage ever hiccups while reading them, Steamy34 no longer saves over your history.',
		'Followed artists → Manage: "Mark everything as seen" is now "Clear new counts", and only shows up when there is something new.'
	] },
	{ v: 'Beta 3.0.1', date: '2026-11-20', items: [
		'A cleaner Blacklist button in the sidebar: a slim line icon like the Settings button, with the number of tags small next to it.'
	] },
	{ v: 'Beta 3.0', date: '2026-11-20', notify: true, items: [
		'New: follow artists. Click the bell 🔔 next to an artist in a post (popup or post page). The sidebar lists your followed artists, each with a count of their new posts – click one to see their posts, with NEW on the ones since your last visit.',
		'"All artists" at the top mixes everyone. New posts are counted quietly in the background (at most every 20 minutes); "Manage" adds artists by name and has a filter (score, type, rating).',
		'White mode: clearer colours in the popup (the + / ⊘ on tags, the score, the "child posts" note and the line under Download).'
	] },
	{ v: 'Beta 2.5', date: '2026-11-20', notify: true, items: [
		'Calmer by default: clean thumbnails (tags and ♥ appear while you hover) and square corners. Prefer the old look? Settings → Look → "Tags & buttons on thumbnails" and "Rounded corners".',
		'A shorter welcome tour: the essentials in four slides – "Show me more" for the rest.',
		'Little tips at the right moment: a small bubble the first time you open a post, search, pick a filter or download. Each one only once – "No more tips" switches them off.'
	] },
	{ v: 'Beta 2.4', date: '2026-11-20', items: [
		'Behind the scenes: Steamy34 is now built from 36 tidy parts instead of one giant file – easier to fix and safer to change. Old leftover styles were removed. Nothing changes for you.',
		'Clearer hints for the file name settings.'
	] },
	{ v: 'Beta 2.3', date: '2026-11-20', notify: true, items: [
		'A tidier sidebar: a slim "⚙ Settings" button, and Steamy34\'s logo with the installed version in a small line below it.'
	] },
	{ v: 'Beta 2.2.5', date: '2026-11-19', items: [
		'♥, viewed and downloaded icons on the thumbnails are all the same size now.',
		'With "Only on hover", the VID / GIF labels always stay visible too.',
		'The score pill while hovering is shorter again – just score and size.',
		'With "Only on hover", the viewed / downloaded marks and favourited hearts now always stay visible.',
		'The labels on video / GIF thumbnails now say VID / GIF (switch them off in Settings → Look). While you hover, the score pill takes their place instead of covering them.'
	] },
	{ v: 'Beta 2.2', date: '2026-11-19', notify: true, items: [
		'Not a fan of round corners? Settings → Look → "Rounded corners" off makes everything square – thumbnails, sidebar, tag bubbles, buttons and windows.',
		'The welcome tour has a new Thumbnails slide where you can try the three thumbnail styles and the corners. Watch it again any time with the ✨ Welcome tour button at the bottom of Settings.'
	] },
	{ v: 'Beta 2.1', date: '2026-11-19', notify: true, items: [
		'Clean thumbnails: Settings → Look → "Tags & buttons on thumbnails" puts the tags, labels, ♥ and marks in a strip below the picture, or shows them only while you hover.',
		'Favourited hearts are a soft red now.'
	] },
	{ v: 'Beta 2.0.2', date: '2026-11-19', items: [
		'The "Steamy34 Settings" button shows which version is running.',
		'Tidier sidebar: no stray bullet left by the AI filter switch, no leftover "(Supports wildcard *)" note.',
		'Videos always get their ▶ VIDEO label, even when a post is missing the "video" tag.'
	] },
	{ v: 'Beta 2.0',date: '2026-11-19', notify: true, items: [
		'Welcome to Beta 2.0! 🎉 New: a welcome tour that shows the best of Steamy34 in under a minute – popup viewer, search, downloads, organising and your colour mode. It opens by itself the first time you use Steamy34; you can take it any time with the "Welcome tour" button below or in Settings → Help.',
		'Beta 2.0 is a calm, steady version – time to enjoy it for a while. Found something odd? Tell steamycorner (Settings → Help).'
	] },
	{ v: 'Beta 1.9', date: '2026-11-19', notify: true, items: [
		'Search the settings: type a word ("folder", "keys", "backup" …) at the top of Settings and jump straight to the option.',
		'More popup keys: F favourite, C add to a collection, T theater mode – each changeable in Settings → Viewing posts. With WASD, W / S scroll to the comments and back.',
		'Batch and collection downloads show a small panel with progress ("12 / 40") and Pause / Resume / Cancel.'
	] },
	{ v: 'Beta 1.8', date: '2026-11-19', items: [
		'Phones: the search box has a Search button again (the site\'s phone layout has none).'
	] },
	{ v: 'Beta 1.7', date: '2026-11-19', notify: true, items: [
		'Tidier file names: costume and fan versions ("lifeguard pharah" next to "pharah"), repeats like "lara croft (survivor)", company names ("blizzard entertainment") and overlapping series ("call of duty warzone" next to "call of duty") are left out.',
		'File names end with the post number, e.g. "[tracer] [overwatch] [someartist] #1234567.jpg" – so you can always find the post again. Switch it off under Settings → Downloads → "Add the post number to file names".'
	] },
	{ v: 'Beta 1.6', date: '2026-11-19', notify: true, items: [
		'Own download folder: Settings → Downloads → "Choose folder…" – pick any folder (e.g. Eagle\'s watch folder) and downloads are written straight into it, with their names. Works in Chrome, Edge and Brave on computers (Brave: turn on brave://flags/#file-system-access-api first). The browser asks once per session whether Steamy34 may write there.',
		'The download folder attempt of Beta 1.4 / 1.5 (via Tampermonkey\'s downloader) is gone – it lost the file names.'
	] },
	{ v: 'Beta 1.4', date: '2026-11-19', notify: true, items: [
		'Browse posts with WASD: Settings → Viewing posts → "Keys for previous / next post" – arrow keys, A / D, or both.'
	] },
	{ v: 'Beta 1.3', date: '2026-11-19', notify: true, items: [
		'New file names: [character] [series] [artist] – e.g. "[judy alvarez, panam palmer] [cyberpunk 2077] [someartist].jpg". Readable, with spaces, and ready for Eagle.',
		'Prefer the old names? Settings → Downloads → File names → Character_Series_Artist_Resolution.'
	] },
	{ v: 'Beta 1.2', date: '2026-11-18', items: [
		'The Android guide shows how to install Steamy34 on the phone: Tampermonkey dashboard → Utilities → Import from file.'
	] },
	{ v: 'Beta 1.0', date: '2026-11-18', notify: true, items: [
		'Steamy34 is now in beta! Everything before this was the alpha – thanks for testing. From here on it\'s about polish and fixes.',
		'Settings texts always wrap instead of running past the switches.',
		'Tidier under the hood: leftovers removed and styles sorted. Fixed: with "Modern thumbnail layout" switched off, the popup and messages lost their look.',
		'Backups now also include your votes, the auto-next timer and theater mode, and Settings → Privacy & data lists every stored item.'
	] },
	{ v: 'Alpha 15.5', date: '2026-11-18', notify: true, items: [
		'New file names: Character_Copyright_Artist_Resolution – e.g. "amelie_lacroix_overwatch_someartist_1920x1080.jpg". Works for single downloads, the popup, batch downloads and collections.',
		'White mode: messages at the bottom and the phone ☰ Menu button are light now too.'
	] },
	{ v: 'Alpha 15.4', date: '2026-11-18', notify: true, items: [
		'Steamy34 on your phone: the popup shows the picture on top – swipe left / right to browse, swipe down or press Back to close.',
		'One ☰ Menu on phones with Steamy34\'s tools (switches, Collections · Stats, Blacklist, Settings, tips) and all of rule34\'s pages, in your colour mode.',
		'Touch-friendly: tag buttons and ♥ are always visible, no hover previews, the sidebar doesn\'t stick, "Recent & saved" starts folded and the next post isn\'t preloaded (saves mobile data).',
		'Redesigned quick tips with a Computer / Phone switch.',
		'Downloads give up after a while and offer Retry instead of hanging; long file names wrap in messages.',
		'Popup buttons, Settings, Blacklist and Download work with the keyboard (Tab, Enter).',
		'Steamy34 is a free fan-made hobby project – it will never be monetized (Settings → Help → About).'
	] },
	{ v: 'Alpha 14.3', date: '2026-11-18', items: [
		'A step-by-step guide for Android (Settings → Help → "On your phone").',
		'With an ad blocker on, the empty ad column on the right is gone – the posts use the full width. Without one, nothing changes.'
	] },
	{ v: 'Alpha 13.9', date: '2026-11-18', items: [
		'Icons are drawn instead of emoji, so they never show up as empty boxes.',
		'Messages stack (up to 3), so an "Undo" no longer disappears too early.',
		'The same search in a different order is only listed once under Recent.',
		'"Hide viewed / downloaded" keeps infinite scroll loading; Esc while setting the download key only cancels that.',
		'The Cloudflare check window is bigger, so the tick box is in view; the popup no longer shows the site\'s unclickable "image has been resized" notice.',
		'Ready for publishing: own namespace and a CC0 license – free to change and share.'
	] },
	{ v: 'Alpha 12.9', date: '2026-11-18', notify: true, items: [
		'Colour modes: White, Dark and OLED (true black) – in the sidebar or Settings → Look.',
		'Cleaner settings: sections on the left, switches, technical options under "Show advanced".',
		'Collections (your own folders), theater mode in the popup, a rating filter and your stats.',
		'This "What\'s new" window – it only shows up after notable updates.',
		'A calm Cloudflare notice, the site\'s AI filter as a matching switch, and no page jump when closing a post.'
	] },
	{ v: 'Alpha 11.5', date: '2026-11-18', notify: true, items: [
		'Posts always open in the popup – scroll down for the comments.',
		'"▶ Auto next" slideshow with a timer; pinned search filters that stay for every new search.',
		'Quick tips window with the most important keys and clicks.'
	] },
	{ v: 'Alpha 10.4', date: '2026-11-17', items: [
		'Blacklist window: tag types are looked up automatically, or set them yourself.',
		'Loading circles on ♥ and ▲, and much faster long pages.'
	] },
	{ v: 'Alpha 9.7', date: '2026-11-17', items: [
		'Batch download, hide viewed / downloaded, size slider, "+N new" for saved searches, favourite tags, popup zoom, preload, video options and favourites.',
		'Blacklist window with recent tags and sorting, "Privacy & data" in the settings, backup & restore, and a question before downloading a post again.'
	] }
];

const CURRENT_VERSION = CHANGELOG[0].v;

const CHANGELOG_SEEN_KEY = 'steamy34_changelog_seen';

const SPARKLE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" opacity=".7"/></svg>';

const VERSION_STAGES = ['alpha', 'beta', 'release'];

function parseVersion(v) {
	const m = String(v || '0').trim().match(/^(alpha|beta|release)?\s*v?([\d.]+)/i) || [];
	const stage = VERSION_STAGES.indexOf((m[1] || 'alpha').toLowerCase());
	return [stage].concat(String(m[2] || '0').split('.').map(n => parseInt(n, 10) || 0));
}

function compareVersions(a, b) {
	const pa = parseVersion(a), pb = parseVersion(b);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] || 0) - (pb[i] || 0);
		if (d) return d;
	}
	return 0;
}

function openChangelog(sinceVersion) {
	if (document.querySelector('.s34-cl-overlay')) return;
	const w = openWindow({ cls: 's34-cl-overlay', icon: SPARKLE_SVG, title: 'What\'s new in Steamy34', width: 600 });
	w.setSub(CURRENT_VERSION);
	const list = document.createElement('div');
	list.className = 's34-cl-list';
	// What's new for you plus the latest few; older ones folded away
	const older = document.createElement('div');
	older.className = 's34-cl-list';
	older.hidden = true;
	const recentCount = Math.max(3, CHANGELOG.filter(e => sinceVersion && compareVersions(e.v, sinceVersion) > 0).length);
	CHANGELOG.forEach((entry, idx) => {
		const isNew = sinceVersion && compareVersions(entry.v, sinceVersion) > 0;
		const block = document.createElement('div');
		block.className = 's34-cl-entry' + (isNew ? ' s34-cl-new' : '');
		const head = document.createElement('div');
		head.className = 's34-cl-head';
		head.innerHTML = `<b></b><span></span>${isNew ? '<em>NEW</em>' : ''}`;
		head.querySelector('b').textContent = entry.v;
		head.querySelector('span').textContent = new Date(entry.date + 'T12:00:00').toLocaleDateString();
		const ul = document.createElement('ul');
		entry.items.forEach(t => {
			const li = document.createElement('li');
			li.textContent = t;
			ul.appendChild(li);
		});
		block.append(head, ul);
		(idx < recentCount ? list : older).appendChild(block);
	});
	const foot = document.createElement('div');
	foot.className = 's34-cl-foot';
	foot.innerHTML = '<button type="button" class="s34-cl-tips"><span class="s34-qmark">?</span> Quick tips</button><button type="button" class="s34-cl-tips s34-cl-tour">✨ Welcome guide</button><button type="button" class="s34-cl-ok">Got it</button>';
	foot.querySelector('.s34-cl-ok').addEventListener('click', () => w.close());
	foot.querySelector('.s34-cl-tips').addEventListener('click', () => { w.close(); openQuickTips(); });
	foot.querySelector('.s34-cl-tour').addEventListener('click', () => { w.close(); openWelcome(0); });
	w.body.append(list);
	if (older.childElementCount) {
		const more = document.createElement('button');
		more.type = 'button';
		more.className = 's34-win-more s34-cl-more';
		more.textContent = `▸ Earlier versions (${older.childElementCount})`;
		more.addEventListener('click', () => {
			older.hidden = !older.hidden;
			more.textContent = (older.hidden ? '▸' : '▾') + ` Earlier versions (${older.childElementCount})`;
		});
		w.body.append(more, older);
	}
	w.body.append(foot);
	w.onClose = () => GM_setValue(CHANGELOG_SEEN_KEY, CURRENT_VERSION);
	foot.querySelector('.s34-cl-ok').focus({ preventScroll: true }); // start at the newest version
	w.body.scrollTop = 0;
}

export { CHANGELOG, CHANGELOG_SEEN_KEY, CURRENT_VERSION, SPARKLE_SVG, compareVersions, openChangelog };
