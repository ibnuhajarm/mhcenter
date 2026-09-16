import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloppyDisk } from "@phosphor-icons/react";
import { fmtRp } from "@/lib/api";

export default function ReviewDialog({
  open,
  onOpenChange,
  title,
  items,
  total,
  totalUnit,
  onConfirm,
  saving,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 border-2 border-zinc-900 p-0"
        data-testid="review-dialog"
      >
        <DialogHeader className="border-b-2 border-zinc-900 p-4 text-left">
          <DialogTitle className="text-lg font-black uppercase tracking-tight">{title}</DialogTitle>
          <p className="text-xs text-zinc-500">
            Periksa kembali sebelum simpan · {items.length} item · {totalUnit} unit
          </p>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto p-4" data-testid="review-item-list">
          {items.map((it, idx) => (
            <div
              key={idx}
              data-testid={`review-item-${it.kode_produk}`}
              className="flex items-start justify-between gap-3 border-b border-dashed border-zinc-300 pb-2 text-sm"
            >
              <div className="min-w-0">
                <div className="mono text-[10px] font-bold text-zinc-500">{it.kode_produk}</div>
                <div className="font-bold leading-tight">{it.nama_produk}</div>
                <div className="mono text-xs text-zinc-500">
                  {it.qty} × {fmtRp(it.harga_jual)}
                  {it.bonus_qty ? ` + ${it.bonus_qty} bonus` : ""}
                  {it.diskon ? ` − ${fmtRp(it.diskon)}` : ""}
                </div>
              </div>
              <div className="mono whitespace-nowrap font-black">{fmtRp(it.subtotal)}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t-2 border-zinc-900 p-4">
          <div>
            <div className="label-caps">Total</div>
            <div className="mono text-2xl font-black text-[#E11414]" data-testid="review-total">
              {fmtRp(total)}
            </div>
          </div>
          <button
            data-testid="btn-confirm-save"
            disabled={saving}
            onClick={onConfirm}
            className="flex items-center gap-2 border-2 border-zinc-900 bg-[#E11414] px-5 py-3 text-sm font-black uppercase tracking-widest text-white active:translate-y-[2px] disabled:opacity-50"
          >
            <FloppyDisk size={16} weight="bold" /> {saving ? "..." : "Simpan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
