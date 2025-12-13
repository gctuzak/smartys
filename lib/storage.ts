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
}) {
  const arrayBuffer = await opts.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalName = opts.file.name;
  const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const timestamp = Date.now();
  const proposalPart = opts.proposalId ? `proposal_${opts.proposalId}` : "no_proposal";
  const companyPart = opts.companyId ? `company_${opts.companyId}` : "no_company";
  const personPart = opts.personId ? `person_${opts.personId}` : "no_person";
  const dir = path.join(baseDir, companyPart, personPart, proposalPart, opts.type);
  await ensureDir(dir);
  const filename = `${timestamp}_${safeName}`;
  const storagePath = path.join(dir, filename);
  await fs.writeFile(storagePath, buffer);
  const publicUrl = `/documents/${companyPart}/${personPart}/${proposalPart}/${opts.type}/${filename}`;
  return {
    storagePath,
    publicUrl,
    originalName,
    mimeType: opts.file.type || "application/octet-stream",
    size: buffer.length,
  };
}
