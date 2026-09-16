import html2canvas from "html2canvas";

// Render the receipt element to a canvas.
// Uses a FIXED scale (independent of device pixel ratio) and forces the
// Space Mono font to be fully loaded first, so the output PNG is consistent
// across laptop, Android and iPhone.
export async function buildReceiptCanvas(el) {
  if (document.fonts) {
    try {
      await document.fonts.load("700 30px 'Space Mono'");
      await document.fonts.load("400 13px 'Space Mono'");
      await document.fonts.ready;
    } catch (e) {
      /* ignore font-load errors, fall back to monospace */
    }
  }
  return html2canvas(el, {
    scale: 2,
    backgroundColor: "#FDFBF7",
    width: el.offsetWidth,
    height: el.offsetHeight,
    windowWidth: el.scrollWidth,
    useCORS: true,
    imageTimeout: 0,
    logging: false,
  });
}
