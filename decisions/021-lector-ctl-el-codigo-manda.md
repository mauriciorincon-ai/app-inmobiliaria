# ADR 021 — The CTL reader: the registry code decides, and the label says what it was validated with

- **Status:** Accepted
- **Date:** 2026-10-26
- **Sprint:** 015 (the reader), 016 (validated against the official code table; completeness; the deploy gate)

## Context

The reader takes the text of a certificate of tradition and freedom (CTL) pasted by a buyer and marks what limits the
property: mortgages and other liens, embargoes, precautionary measures, limits on the title, a transfer prohibition on a
subsidised home, family home, family estate and false tradition. It runs on the buyer's phone; the text is not stored,
logged or searched.

Sprint 015 classified an annotation **by its words**. The investigation behind it had mis-classified 6 of 26 codes, and
Sprint 016 wrote the test the reader should have had first: every code of the official table (Resolución 11885 de 2016 of
the Superintendencia de Notariado y Registro, art. 4, read in two reproductions that agree; **the primary source was not
reached**; the header of `src/engine/ctl/codigos.ts` and the test fixture say so). The test was born red: **200 of its 391 cases failed**.

## Decision

1. **With a code, the group decides.** Each annotation's specification carries a code of 4 or 5 digits. The group of art.
   8 of Ley 1579 de 2012 fixes its nature (01 neutral, 02 liens, 03 limits on the title, 04 embargoes and precautionary
   measures, 05 limits, 06 false tradition, 07 and 08 cancellations, 09 others) and **the word only refines inside the
   group** (an embargo vs a precautionary measure in 04; family home or family estate in 03). Without a code the word
   decides and the mark says «without code». A code that is not in the table is read by its group and says so.
2. **Words match as words.** «Mortgage» means the word, not «hipotecada» or «hipotecaria» (three codes were read as
   mortgages for that). A **partial** cancellation cancels nothing and is listed as «not understood».
3. **Transfer prohibition on a subsidised home** is its own mark, with Ley 1537 de 2012 art. 21 as amended by Ley 2079 de
   2021 art. 13, read in their official text on 2026-10-25. The rest of group 03 is a generic «limit or encumbrance on the
   title»: it asks, it does not accuse.
4. **Completeness.** The reader compares the annotations with the certificate's «total number of annotations» and with the
   numbering. If one is missing it says «the text seems incomplete», names which, and **paints no green check**; without
   the total it says it cannot check.
5. **The label is always visible** and says what it was validated with: _validated with the official table of codes and
   few real certificates; confirm it on your certificate; it does not replace a title study._ Symbol and text, never color
   alone.
6. **It is off until it is validated.** `LECTOR_CTL_ACTIVO` is off by default. The deploy guard lets it through only if
   `scripts/ctl-validar.mjs` exits 0 at that moment: at least 2 real certificates in `privado/ctl/` (git-ignored), each
   with the owner's hand reading, and zero disagreements. The validator prints counts only. **No real certificate goes into
   a commit, a log, a fixture, a search or a closure document.** The fixtures are synthetic.

## Alternatives considered

- **Keep words first.** It was the Sprint 015 behaviour and the test proved it wrong about half the table. Rejected.
- **Upload the PDF and OCR it.** The document is seen and never stored (rule 3); a server-side copy is exactly what the
  rule forbids. Rejected.
- **Ask the registry.** There is no service for a buyer; out of scope.
- **A language model to read the certificate.** Rule 14: code first; a model would not be able to say which article
  backs each mark.
- **Switch it on with the table alone.** The table says what a code means, not whether real certificates read well. The
  label says exactly that, and the gate keeps it off until real ones pass.

## Consequences

- The reader stays off in production until two real certificates validate it. The repository carries the code, the table
  and its tests; the certificates never leave the owner's machine.
- If the registry changes the table, the catalogue test changes with it (`tests/fixtures/ctl/catalogo-snr-11885.json`).
- A certificate whose text is copied in pieces is flagged, not silently read short: a missing page can hide the most
  recent annotation.
- It is a reading of the text, not a title study: every screen says so and points to a lawyer.
