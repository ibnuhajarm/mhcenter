import { Brand } from "@/components/Brand";

export default function BrandHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b-2 border-zinc-900 bg-white"
      data-testid="app-header"
    >
      <div className="mx-auto flex max-w-2xl items-center px-4 py-2.5">
        <Brand />
      </div>
    </header>
  );
}
