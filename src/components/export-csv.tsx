"use client";

export function ExportCsvButton({
  csv,
  filename,
  label,
}: {
  csv: string;
  filename: string;
  label: string;
}) {
  return (
    <button
      onClick={() => {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }}
      className="rounded-lg border border-line text-sm font-semibold px-3 py-1.5 hover:bg-ledger"
    >
      {label}
    </button>
  );
}
