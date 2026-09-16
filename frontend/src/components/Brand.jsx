import logo from "@/assets/logo.webp";

export function Brand({ textClass = "text-zinc-900", showSub = true }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand">
      <img src={logo} alt="Mayora United Home" className="h-10 w-auto shrink-0" />
      <div className="leading-none">
        <div className={`text-sm font-black uppercase tracking-tight ${textClass}`}>
          Mayora United Home
        </div>
        {showSub && (
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#E11414]">
            Field Sales App
          </div>
        )}
      </div>
    </div>
  );
}

export default Brand;
