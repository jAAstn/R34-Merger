TEIL 1. MEMORY-DATEIEN (damit jedes Modell da weitermachen kann, wo du aufgehört hast)
- Wenn AGENTS.md und MEMORY.md in diesem Ordner bereits existieren, erstelle sie nicht neu.
  Lies MEMORY.md und mache bei dem Schritt weiter, den sie nennt.
- Andernfalls erstelle sie jetzt:
  - AGENTS.md: diese gesamte Nachricht, Wort für Wort.
    in jedem neuen Chat in diesem Ordner.
  - MEMORY.md: wo wir gerade stehen, unter diesen Überschriften: Current step (Aktueller Schritt), Next action (Nächste Aktion),
    My choices so far (Meine bisherigen Entscheidungen), Important paths and commands (Wichtige Pfade und Befehle), Done (Erledigt), Problems and fixes (Probleme und Lösungen),
    Time per step (Zeit pro Schritt).
- Aktualisiere MEMORY.md am Ende jedes Schritts, bevor du mich irgendetwas fragst.
- Immer wenn ich nach einem Neustart zurückkomme, lies zuerst
  MEMORY.md,
  und mache dann weiter.

TEIL 2. REGELN ZUM PFLEGEN VON MEMORY.md (verbindlich)
1. AGENTS.md-Stand prüfen (beim Start und vor jeder Änderung an MEMORY.md)
   - Ganz oben in MEMORY.md steht eine Zeile der Form:
     "AGENTS.md-Hash: <sha256> (Bytes: <n>, Stand: <TT.MM.JJJJ HH:MM>)".
   - Beim Start immer vergleichen mit dem echten Wert:
     sha256sum AGENTS.md   (bzw. certutil -hashfile AGENTS.md SHA256 unter cmd)
   - Weichen Hash oder Byte-Zahl ab: AGENTS.md wurde geändert.
     Dann die neue AGENTS.md KOMPLETT lesen, den Hash neu eintragen und in
     "Problems and fixes" notieren, was sich geändert hat. Nicht weiterarbeiten,
     als wäre nichts passiert.
   - Existiert die Hash-Zeile nicht, anlegen.
2. Zeiten automatisch, nicht aus dem Gedächtnis
   - Zeit vor dem Start eines Schritts: date "+%Y-%m-%d %H:%M:%S"
   - Zeit am Ende des Schritts erneut ablesen und die Differenz in
     "Time per step" als Zeile eintragen: "Schritt N (<Kurzbeschreibung>): <Dauer> (<Start>–<Ende>)".
   - Nur gemessene Werte. Keine Schätzung, kein "wenige Sekunden".
   - Dauert ein Schritt über die Zeitgrenze hinaus, das offen vermerken statt zu runden.
3. "Current step" und "Next action" strikt von "Done" trennen
   - "Current step": IMMER genau ein offener Schritt, höchstens 3 Zeilen. Wird ersetzt, nicht ergänzt.
   - "Next action": IMMER genau die nächste konkrete Aktion, eine Zeile,
     beginnend mit einem Verb (z.B. "Erstelle ...", "Lies ...", "Prüfe ...").
   - "Done": nur abgeschlossene Schritte, eine Zeile pro Schritt, ohne Wiederholung
     des aktuellen Stands. Wird nur angehängt, nie aus "Current step" kopiert.
   - Nichts aus "Current step" oder "Next action" darf in "Done" doppelt erscheinen.
   - Wird ein Schritt abgeschlossen: Eintrag nach "Done", "Current step" auf den
     nächsten offenen Schritt umschreiben, "Next action" neu formulieren.
4. Reihenfolge beim Aktualisieren (immer am Ende eines Schritts, vor jeder Rückfrage)
   a) Hash prüfen und ggf. neu eintragen
   b) "Current step" und "Next action" ersetzen
   c) erledigten Schritt an "Done" anhängen
   d) Zeitzeile messen und an "Time per step" anhängen
   e) "Problems and fixes" nur bei echten Problemen ergänzen
