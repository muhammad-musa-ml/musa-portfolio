# Portfolio display font

`syne-variable-full.woff2` is Syne 2.200 (weight axis 400–800), converted losslessly from Google's upstream variable TTF to WOFF2 with FontTools. The complete glyphs and OpenType layout tables are retained. No outlines or metrics were edited.

- Upstream: https://github.com/google/fonts/blob/main/ofl/syne/Syne%5Bwght%5D.ttf
- Original TTF SHA-256: `ce5ac77142a65cab2248a1a2ebb740b1d4d9c20b52488877d3ff664d1356104a`
- License: SIL Open Font License 1.1, included in `Syne-OFL.txt`.

The default `g` deliberately has an open tail. The portfolio enables `ss04` (the font's “g double storey” alternate) wherever it uses this face, including non-heading display text. The complete webfont is necessary because the Google Fonts CSS subset did not expose that alternate. The CSS alias `Syne Portfolio` prevents older sample stylesheets from selecting the subset again. Historical sample font rules remain unchanged.
