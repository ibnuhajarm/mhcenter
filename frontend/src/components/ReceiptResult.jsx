import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FloppyDisk, ShareNetwork } from "@phosphor-icons/react";
import ReceiptExport from "@/components/ReceiptExport";
import { buildReceiptCanvas } from "@/lib/receipt";

// Renders the receipt as a real PNG <img> (so it can be long-pressed → Save to
// gallery on mobile) plus a direct <a download> link and a native share button.
// The download link uses a ready object URL, so tapping it is a genuine user
// gesture and reliably saves the file (fixes the "says saved but nothing downloads" bug).
export default function ReceiptResult({
  title,
  filename,
  sales,
  items,
  total,
  note,
  dateStr,
  downloadTestId = "btn-download-png",
  shareTestId = "btn-share-png",
}) {
  const ref = useRef(null);
  const [url, setUrl] = useState("");
  const [blob, setBlob] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objUrl = "";
    (async () => {
      setBusy(true);
      await new Promise((r) => setTimeout(r, 350)); // let layout + fonts settle
      try {
        const canvas = await buildReceiptCanvas(ref.current);
        const b = await new Promise((res) => canvas.toBlob(res, "image/png", 1.0));
        if (cancelled || !b) return;
        objUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objUrl);
      } catch (e) {
        console.error("receipt build failed", e);
        if (!cancelled) toast.error("Gagal membuat gambar struk");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [items, total, dateStr]);

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
      } catch (e) {
        if (e && e.name !== "AbortError") toast.error("Gagal membagikan gambar");
      }
    } else {
      toast.message("Bagikan tidak didukung di perangkat ini — pakai tombol Download");
    }
  };

  return (
    <div data-testid="receipt-result">
      {/* off-screen source used only to render the PNG */}
      <div style={{ position: "fixed", left: -10000, top: 0, zIndex: -1 }} aria-hidden="true">
        <ReceiptExport
          ref={ref}
          title={title}
          sales={sales}
          items={items}
          total={total}
          note={note}
          dateStr={dateStr}
        />
      </div>

      <div className="overflow-x-auto border-2 border-zinc-900 bg-zinc-100 p-3">
        {url ? (
          <img
            src={url}
            alt={title}
            className="mx-auto block h-auto"
            style={{ width: 860, maxWidth: "none" }}
            data-testid="receipt-image"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm font-bold text-zinc-500">
            Menyiapkan gambar struk…
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] text-zinc-500">
        Di HP: tekan lama gambar lalu pilih <b>Simpan Gambar</b> untuk ke galeri.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <a
          data-testid={downloadTestId}
          href={url || undefined}
          download={filename}
          onClick={(e) => {
            if (!url) e.preventDefault();
          }}
          className={`flex items-center justify-center gap-2 border-2 border-zinc-900 bg-[#142043] py-4 text-sm font-black uppercase tracking-widest text-white active:translate-y-[2px] ${
            !url ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <FloppyDisk size={16} weight="bold" /> {busy ? "Menyiapkan…" : "Download"}
        </a>
        <button
          data-testid={shareTestId}
          onClick={share}
          disabled={busy}
          className="flex items-center justify-center gap-2 border-2 border-zinc-900 bg-white py-4 text-sm font-black uppercase tracking-widest active:translate-y-[2px] disabled:opacity-50"
        >
          <ShareNetwork size={16} weight="bold" /> Ke Galeri
        </button>
      </div>
    </div>
  );
}
