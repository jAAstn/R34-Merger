// Unit-Tests für den puren Post-Seiten-Parser (src/overlay-parser.js).
// Fixture = echtes rule34-Sidebar-Markup (#tag-sidebar mit li.tag-type-* und
// Zwei-Anker-Struktur + #stats mit „Posted … by <user>“), geparst mit linkedom.
// Lauf: node test/overlay-parser.test.mjs
import { parseHTML } from 'linkedom';
import { extractSidebarTags, extractUploader } from '../src/overlay-parser.js';

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (desc, actual, expected) => {
    const ok = eq(actual, expected);
    ok ? pass++ : fail++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};

const FIXTURE = `<!DOCTYPE html><html><body>
<div id="tag-sidebar">
  <div class="tag-list">
    <li><h6>Artist</h6></li>
    <li class="tag-type-artist tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=reenka25">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=reenka25">reenka25</a></li>
    <li><h6>Copyright</h6></li>
    <li class="tag-type-copyright tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=bleach">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=bleach">bleach</a></li>
    <li class="tag-type-copyright tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=patreon">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=patreon">patreon</a></li>
    <li><h6>Character</h6></li>
    <li class="tag-type-character tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=inoue_orihime">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=inoue%20orihime">inoue orihime</a></li>
    <li class="tag-type-character tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=orihime_inoue">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=orihime%20inoue">orihime inoue</a></li>
    <li><h6>Metadata</h6></li>
    <li class="tag-type-metadata tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=ai">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=ai">ai</a></li>
    <li class="tag-type-metadata tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=ai_generated">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=ai%20generated">ai generated</a></li>
    <li><h6>General</h6></li>
    <li class="tag-type-general tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=1girls">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=1girls">1girls</a></li>
    <li class="tag-type-general tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=beach">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=beach">beach</a></li>
    <li class="tag-type-general tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=big_ass">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=big%20ass">big ass</a></li>
  </div>
</div>
<div id="stats">
  <ul>
    <li>Id: 18501281</li>
    <li>Posted: 2026-08-19 01:23:45 by <a href="index.php?page=account&amp;s=profile&amp;id=123456">some_uploader</a></li>
    <li>Size: 1280x720</li>
    <li>Rating: Explicit</li>
    <li>Score: 123</li>
  </ul>
</div>
</body></html>`;

const { document } = parseHTML(FIXTURE);

console.log('extractSidebarTags:');
const tags = extractSidebarTags(document);
check('10 Tags gefunden (h6-Header ignoriert)', tags.length, 10);
check('Artist: reenka25', tags.filter(t => t.category === 'artist').map(t => t.name), ['reenka25']);
check('Copyright: bleach + patreon', tags.filter(t => t.category === 'copyright').map(t => t.name), ['bleach', 'patreon']);
check('Character: Leerzeichen → Unterstriche', tags.filter(t => t.category === 'character').map(t => t.name), ['inoue_orihime', 'orihime_inoue']);
check('Metadata: ai + ai_generated', tags.filter(t => t.category === 'metadata').map(t => t.name), ['ai', 'ai_generated']);
check('General: 1girls + beach + big_ass', tags.filter(t => t.category === 'general').map(t => t.name), ['1girls', 'beach', 'big_ass']);
check('Kein „?“-Wiki-Link als Name', tags.some(t => t.name === '?'), false);

console.log('extractUploader:');
const up = extractUploader(document);
check('Uploader-Name aus #stats', up && up.name, 'some_uploader');
check('Uploader-URL (Profil-Link)', up && up.url, 'index.php?page=account&s=profile&id=123456');

console.log('extractUploader – Fallback ohne #stats:');
{
    const doc2 = parseHTML('<html><body><div id="tag-sidebar"><li class="tag-type-artist tag"><a href="index.php?page=wiki&amp;s=tag&amp;title=x">?</a> <a href="index.php?page=post&amp;s=list&amp;tags=x">x</a></li></div><p><a href="index.php?page=account&amp;s=profile&amp;uname=other">other_user</a></p></body></html>').document;
    const up2 = extractUploader(doc2);
    check('Profil-Link außerhalb der Sidebar gefunden', up2 && up2.name, 'other_user');
}

console.log('Robustheit:');
check('extractSidebarTags(null) → []', extractSidebarTags(null), []);
check('extractUploader(null) → null', extractUploader(null), null);

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
