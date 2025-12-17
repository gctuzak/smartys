import path from "path";
import fs from "fs/promises";

const baseDir = path.join(process.cwd(), "public", "documents");

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveFileToPublicDocuments(opts: {
  file: File;
  type: string;
  proposalId?: string | null;
  companyId?: string | null;
  personId?: string | null;
  orderId?: string | null;
}) {
  const arrayBuffer = await opts.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalName = opts.file.name;
  const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const timestamp = Date.now();
  
  // Create a structured path: /company_ID/person_ID/order_ID/proposal_ID/type/filename
  // Or just use the most relevant ID for the folder structure to keep it somewhat organized but flat enough.
  // Actually, the previous implementation was nested. Let's keep it nested but optional.
  
  const proposalPart = opts.proposalId ? `proposal_${opts.proposalId}` : "no_proposal";
  const companyPart = opts.companyId ? `company_${opts.companyId}` : "no_company";
  const personPart = opts.personId ? `person_${opts.personId}` : "no_person";
  const orderPart = opts.orderId ? `order_${opts.orderId}` : "no_order";
  
  // New structure to accommodate Order ID
  const dir = path.join(baseDir, companyPart, personPart, orderPart, proposalPart, opts.type);
  
  await ensureDir(dir);
  const filename = `${timestamp}_${safeName}`;
  const storagePath = path.join(dir, filename);
  await fs.writeFile(storagePath, buffer);
  
  // Public URL needs to be relative to the public folder
  const publicUrl = `/documents/${companyPart}/${personPart}/${orderPart}/${proposalPart}/${opts.type}/${filename}`;
  
  return {
    storagePath,
    publicUrl,
    originalName,
    mimeType: opts.file.type || "application/octet-stream",
    size: buffer.length,
  };
}
