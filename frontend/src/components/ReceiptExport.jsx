import { forwardRef } from "react";
import { fmtRp } from "@/lib/api";
import logo from "@/assets/logo.webp";

// Fixed font stack so the exported image renders the same on any device.
const FONT = "'Space Mono', 'Courier New', monospace";

const infoLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "#71717A",
};
const infoVal = { fontSize: 14, fontWeight: 700, textTransform: "uppercase", marginTop: 2 };
const th = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  padding: "6px 6px",
  color: "#09090B",
};
const td = { padding: "8px 6px", verticalAlign: "top" };
const dash = { borderTop: "2px dashed #09090B", margin: "16px 0" };

const ReceiptExport = forwardRef(function ReceiptExport(
  { title, sales, items, total, note, dateStr },
  ref
) {
  const hasBonus = items.some((i) => i.bonus_qty);
  const hasDiskon = items.some((i) => i.diskon);
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalBonus = items.reduce((s, i) => s + (i.bonus_qty || 0), 0);

  return (
    <div
      ref={ref}
      className="receipt-paper"
      style={{
        width: 860,
        fontFamily: FONT,
        color: "#09090B",
        border: "3px solid #09090B",
        padding: 28,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={logo} alt="Mayora United Home" style={{ height: 64, width: "auto" }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
              Mayora United Home
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, textTransform: "uppercase", lineHeight: 1.1, marginTop: 2 }}>
              {title}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={infoLabel}>Tanggal</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{dateStr}</div>
        </div>
      </div>

      <div style={dash} />

      {/* Info strip */}
      <div style={{ display: "flex", gap: 40 }}>
        <div>
          <div style={infoLabel}>AREA</div>
          <div style={infoVal}>{sales?.area_sales}</div>
        </div>
        <div>
          <div style={infoLabel}>KODE SALES</div>
          <div style={infoVal}>{sales?.kode_sales}</div>
        </div>
        <div>
          <div style={infoLabel}>NAMA SALES</div>
          <div style={infoVal}>{sales?.nama_sales}</div>
        </div>
      </div>

      <div style={dash} />

      {/* Product table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #09090B" }}>
            <th style={{ ...th, width: 90, textAlign: "left" }}>KODE</th>
            <th style={{ ...th, textAlign: "left" }}>PRODUK</th>
            <th style={{ ...th, width: 55, textAlign: "center" }}>QTY</th>
            {hasBonus && <th style={{ ...th, width: 65, textAlign: "center" }}>BONUS</th>}
            <th style={{ ...th, width: 115, textAlign: "right" }}>@HARGA</th>
            {hasDiskon && <th style={{ ...th, width: 105, textAlign: "right" }}>DISKON</th>}
            <th style={{ ...th, width: 135, textAlign: "right" }}>SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} style={{ borderBottom: "1px dashed #a1a1aa" }}>
              <td style={{ ...td, fontWeight: 700 }}>{it.kode_produk}</td>
              <td style={{ ...td, textAlign: "left", textTransform: "uppercase" }}>{it.nama_produk}</td>
              <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{it.qty}</td>
              {hasBonus && (
                <td style={{ ...td, textAlign: "center" }}>{it.bonus_qty ? `+${it.bonus_qty}` : "-"}</td>
              )}
              <td style={{ ...td, textAlign: "right" }}>{fmtRp(it.harga_jual)}</td>
              {hasDiskon && (
                <td style={{ ...td, textAlign: "right" }}>{it.diskon ? `-${fmtRp(it.diskon)}` : "-"}</td>
              )}
              <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtRp(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={dash} />

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: 12 }}>
          <div>
            Total item: <b>{items.length}</b> · Total qty: <b>{totalQty}</b>
            {totalBonus ? (
              <>
                {" "}· Bonus: <b>{totalBonus}</b>
              </>
            ) : null}
          </div>
          {note ? <div style={{ fontStyle: "italic", marginTop: 4 }}>Note: {note}</div> : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={infoLabel}>Total</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{fmtRp(total)}</div>
        </div>
      </div>

      <div style={{ ...dash, margin: "16px 0 10px" }} />
      <div style={{ textAlign: "center", fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>
        Terima Kasih
      </div>
    </div>
  );
});

export default ReceiptExport;
