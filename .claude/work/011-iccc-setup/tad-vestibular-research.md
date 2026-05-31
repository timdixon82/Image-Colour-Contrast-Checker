# Vestibular Checker: Research Report

Work folder: 011-iccc-setup
Produced: 2026-05-23
Author: Tad

---

## Bottom line

The feature branch `claude/vestibular-checker-extension-O5NPm` cannot be read from the current clone because the working tree is checked out on `main`. The branch exists in the remote refs but its files are not accessible without Sonja switching the clone. This report therefore draws on the branch name, the WCAG context, and general knowledge to describe what a vestibular checker in this codebase is most likely intended to do. The description is a reasoned inference, not a confirmed reading of the branch's code.

---

## 1. Plain-language description of the intended feature

The vestibular checker extension is most likely intended to analyse an uploaded image or screenshot for visual patterns that could trigger dizziness, nausea, or disorientation in people with vestibular disorders. Vestibular disorders affect the body's balance system; they are worsened by motion, flicker, parallax, or rapidly alternating visual patterns on screen. The checker would look for those kinds of patterns in an image and flag them, in much the same way the existing tool finds text-contrast problems. The most directly relevant WCAG criterion is WCAG 2.3.3 "Animation from Interactions" (Level AAA), which says that motion animation triggered by user interaction can be disabled unless it is essential to the function. A related criterion is WCAG 2.3.1 "Three Flashes or Below Threshold" (Level A), which sets a limit on how many times per second a page may flash a large high-contrast area. A static-image checker cannot directly test triggered animation, but it could detect visual patterns associated with vestibular risk, such as high-contrast repeating patterns, parallax-suggestive designs, busy backgrounds, or evidence of autoplay video frames.

Note: the evidence for this description is circumstantial. The branch files must be read before the team can confirm whether the checker is implemented, partially implemented, or is a stub. Tim's answer to Q38 (see Section 5 below) is the quickest way to settle this.

---

## 2. File paths that mention "vestibular" in the ICCC repository

A case-insensitive grep across the entire cloned repository on the `main` branch returned zero matches.

There are no mentions of "vestibular" anywhere on `main`.

The feature branch `claude/vestibular-checker-extension-O5NPm` is recorded at:

- Commit SHA: `76a5968ad31790861969cc6d09f40e3310c2b367`
- Reference: `refs/remotes/origin/claude/vestibular-checker-extension-O5NPm`
- File path in the clone: `/Users/timdixon/Library/Mobile Documents/com~apple~CloudDocs/AgentTeam/Inputs/Image-Colour-Contrast-Checker/.git/packed-refs` (line 2)

The branch is stored in the git pack file but is not checked out. To read its files, Sonja must switch the working tree to that branch. This research does not include a listing of feature-branch file paths because those files are not readable without a branch switch.

---

## 3. WCAG criteria the feature implements or relates to

### WCAG 2.3.3 Animation from Interactions (Level AAA)

Full title: Success Criterion 2.3.3 Animation from Interactions.

This criterion states that motion animation triggered by interaction can be disabled, unless the animation is essential to the functionality or the information being conveyed. It is at Level AAA, which is the team's target for ICCC's own interface. It directly protects people with vestibular disorders, who can experience nausea, dizziness, headaches, or difficulty concentrating when exposed to non-essential motion on screen. The W3C's Understanding document for this criterion explicitly names vestibular disorders and notes that affected people may find that even subtle motion, such as parallax scrolling or zoom animations, triggers symptoms.

Source: W3C Web Content Accessibility Guidelines 2.2, Success Criterion 2.3.3. The Understanding document is published at `https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html`. Because WebFetch is unavailable in this session, this citation draws on my knowledge base (cutoff August 2025).

### WCAG 2.3.1 Three Flashes or Below Threshold (Level A)

Full title: Success Criterion 2.3.1 Three Flashes or Below Threshold.

This criterion states that web pages do not contain anything that flashes more than three times per second, unless the flash is below the general flash and red flash thresholds. It is at Level A, the baseline. It protects people with photosensitive epilepsy and also benefits people with vestibular disorders, because rapid high-contrast flicker can trigger both seizures and vestibular symptoms. A checker that inspects static images for patterns associated with this criterion would look for repeating high-contrast alternating regions.

Source: W3C WCAG 2.2, Success Criterion 2.3.1.

### Relationship to `prefers-reduced-motion`

The CSS media feature `prefers-reduced-motion` is the implementation mechanism for WCAG 2.3.3. The ICCC codebase already includes a `prefers-reduced-motion: reduce` media query in `src/styles.css` (line 461), which collapses animation durations to zero. A vestibular checker in this tool would likely assess whether images from other sites or applications show visual patterns that should be gated behind a similar preference, and would flag them accordingly.

---

## 4. Comparable tools

I cannot provide verified current links because WebSearch and WebFetch are both unavailable in this session. The following tools and projects are described from my knowledge base (cutoff August 2025). Tim or Sonja should verify URLs before citing them.

### The Photosensitive Epilepsy Analysis Tool (PEAT)

PEAT is a tool produced by Trace Research and Development Centre at the University of Maryland. It analyses video files for flashing patterns against the Harding Photosensitive Epilepsy Analysis standard and the WCAG 2.3.1 thresholds. It is the most widely cited tool in this space, though it is designed for video content rather than static images. It is available from the Trace R&D Centre website.

### The Harding Flash and Pattern Analyser (FPA)

The Harding FPA is the commercial equivalent of PEAT, used by broadcasters and streaming services to test video content against the broadcast safe-harbour standard for photosensitive epilepsy. It is not a web tool and is not designed for still images, but it defines the thresholds that WCAG 2.3.1 references.

### No-Motion Media Query Linters

Several accessibility linting tools, including `axe-core` by Deque Systems and `Lighthouse` by Google, include checks for the presence or absence of `prefers-reduced-motion` media queries in CSS. These are code-level checks, not image-level checks, and so are complementary to what ICCC would be doing rather than equivalent.

### The Accessible Colour Palette Builder and Similar Contrast Tools

These are analogous to ICCC for colour contrast but do not address motion or vestibular risk. They are mentioned only to illustrate that the vestibular checker would occupy a niche that no widely available browser-based image checker currently fills, which would make it genuinely novel.

---

## 5. Gap notice

This report has three gaps:

1. The feature branch files have not been read. Every claim about what the checker does is inferred from the branch name and from general knowledge of vestibular accessibility. The inference could be wrong in whole or in part.
2. WebSearch and WebFetch were both denied during this research session. Web-based primary sources for WCAG 2.3.3 and comparable tools could not be fetched or verified. All web citations draw on my knowledge base with a cutoff of August 2025.
3. The branch name includes the suffix `O5NPm`, which is consistent with an automatically generated identifier from a previous AI session. The brief notes this and flags it as an unknown-provenance branch. The gap is material: the team does not know whether the branch is a working implementation, a stub, or abandoned code.

---

## 6. Verdict options for Tim (Q38)

Q38 is open. Tim confirms one of these options.

A. The one-paragraph description in Section 1 of this report matches what the vestibular checker is intended to do. Tim accepts the description as the working definition, and Sonja proceeds to switch the clone and read the branch files before Jacob and Jed review it.

B. The vestibular checker is intended to do something different. Tim adds one sentence to correct the description. Sonja updates this file and proceeds with the corrected definition.

C. The vestibular checker feature is exploratory and should be archived rather than reviewed for merge. Sonja closes the open branch and records the decision in the project log.
