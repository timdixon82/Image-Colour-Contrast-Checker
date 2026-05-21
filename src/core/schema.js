/**
 * Shared type definitions for the contrast-analysis pipeline.
 * Pure JSDoc — no runtime code. Import this file for editor completions.
 *
 * Dependency order (nothing here imports anything):
 *   schema  ←  contrast  ←  analyse  ←  adapters / render / export
 */

/**
 * Axis-aligned bounding box in image-pixel coordinates.
 * @typedef {Object} BBox
 * @property {number} x  Left edge
 * @property {number} y  Top edge
 * @property {number} w  Width
 * @property {number} h  Height
 */

/**
 * Single word returned by an OCR adapter.
 * @typedef {Object} OcrWord
 * @property {string} text     Recognised text
 * @property {number} score    Confidence 0–1
 * @property {BBox}   bbox     Location in the source image
 */

/**
 * Simulated contrast for one colour-vision deficiency.
 * @typedef {Object} CvdContrast
 * @property {string}  fgHex     Foreground as it appears with this deficiency
 * @property {string}  bgHex     Background as it appears with this deficiency
 * @property {number}  contrast  Recomputed WCAG contrast ratio
 * @property {boolean} pass      Meets the pair's AA threshold under simulation
 */

/**
 * APCA perceptual-contrast result.
 * @typedef {Object} ApcaResult
 * @property {number} lc                              Signed APCA Lc value
 * @property {'PASS'|'WARN'|'FAIL'} status
 * @property {string} message
 */

/**
 * Vestibular saturation result.
 * @typedef {Object} VestibularResult
 * @property {number} fgSat                           Foreground HSL saturation 0–100
 * @property {number} bgSat                           Background HSL saturation 0–100
 * @property {number} maxSat                          Higher of the two
 * @property {'SAFE'|'WARN'|'HIGH'} status
 * @property {string} message
 */

/**
 * Derived cognitive-load verdict.
 * @typedef {Object} CognitiveResult
 * @property {'PASS'|'WARN'|'FAIL'|'HARSH'} status
 * @property {string} message
 */

/**
 * A unique foreground/background colour combination found in the image.
 * @typedef {Object} ColourPair
 * @property {string}   fgHex       Foreground hex e.g. "#FFFFFF"
 * @property {string}   bgHex       Background hex
 * @property {number}   contrast    WCAG contrast ratio (e.g. 4.52)
 * @property {boolean}  pass        Meets WCAG 2.2 AA threshold
 * @property {number}   required    AA threshold used (3 or 4.5)
 * @property {boolean}  passAaa     Meets WCAG 2.2 AAA threshold
 * @property {number}   requiredAaa AAA threshold used (4.5 or 7)
 * @property {string[]} examples    Sample words from this pair
 * @property {BBox[]}   bboxes      All bboxes that belong to this pair
 * @property {{deuteranopia:CvdContrast,protanopia:CvdContrast,tritanopia:CvdContrast}} cvd
 *                                  Simulated contrast per dichromacy
 * @property {boolean}  cvdRisk     Passes AA normally but fails under a deficiency
 * @property {ApcaResult}       apca        APCA perceptual contrast
 * @property {VestibularResult} vestibular  Saturation / shimmer check
 * @property {CognitiveResult}  cognitive   Derived cognitive-load verdict
 * @property {'PASS'|'WARN'|'FAIL'} overall  Rolled-up verdict for this pair
 */

/**
 * @typedef {'PASS'|'FAIL'|'NO_TEXT'} Verdict
 */

/**
 * Analysis result for a single image.
 * @typedef {Object} ReportData
 * @property {boolean}      hasText      True if OCR detected any usable text
 * @property {ColourPair[]} colourPairs  Unique pairs, worst contrast first
 * @property {Verdict}      verdict
 * @property {boolean}      flag         True when verdict is FAIL
 * @property {string}       detail       Human-readable summary sentence
 */

/**
 * Canvas assets generated for one ColourPair (built during report rendering).
 * @typedef {Object} PairAsset
 * @property {ColourPair} pair
 * @property {string}     swatchDataUrl  PNG data URL of the bg/fg swatch
 * @property {string}     [clipDataUrl]  PNG data URL of the failing-region crop
 */

/**
 * One colour-blindness simulation of the whole image.
 * @typedef {Object} CbSimAsset
 * @property {string} key      CVD identifier (e.g. "deuteranopia")
 * @property {string} label    Display name
 * @property {string} note     Short plain-language description
 * @property {string} dataUrl  PNG data URL of the simulated image
 */

/**
 * Fully analysed entry ready for export.  The export modules (pdf, markdown)
 * accept an array of these and nothing else from the app internals.
 * @typedef {Object} AnalysedEntry
 * @property {string}       id
 * @property {string}       filename
 * @property {ReportData}   report
 * @property {string}       previewDataUrl  PNG data URL of the resized preview
 * @property {PairAsset[]}  pairAssets
 * @property {CbSimAsset[]} cbSimAssets     Colour-blindness simulations of the image
 */
