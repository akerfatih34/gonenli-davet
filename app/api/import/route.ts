import { requireRole } from "@/lib/auth";
import { parseRows, parseCsv } from "@/lib/import";
import readXlsx from "read-excel-file/node";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "Dosya yok" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  let rows: any[][];
  try {
    if (/\.(csv|txt)$/i.test(file.name)) {
      let text = buf.toString("utf8");
      if (text.includes("�")) text = new TextDecoder("windows-1254").decode(buf);
      rows = parseCsv(text.replace(/^﻿/, ""));
    } else {
      const sheets: any = await readXlsx(buf);
      // En çok satırı olan sayfayı al
      const sheet = sheets.sort((a: any, b: any) => b.data.length - a.data.length)[0];
      rows = sheet.data;
    }
  } catch (e: any) {
    return Response.json({ error: "Dosya okunamadı. .xlsx veya .csv olarak kaydedip tekrar deneyin. (" + e?.message + ")" }, { status: 400 });
  }
  return Response.json(parseRows(rows));
}
