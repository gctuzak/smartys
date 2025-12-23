import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";

// Browser-safe Base64 conversion
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const generateProposalPDF = async (data: any) => {
  const doc = new jsPDF();

  // Load fonts
  try {
    const [regularFont, boldFont] = await Promise.all([
      fetch("/fonts/Roboto-Regular.ttf"),
      fetch("/fonts/Roboto-Bold.ttf"),
    ]);

    if (regularFont.ok) {
      const fontBuffer = await regularFont.arrayBuffer();
      const fontBase64 = arrayBufferToBase64(fontBuffer);
      doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    }

    if (boldFont.ok) {
      const fontBuffer = await boldFont.arrayBuffer();
      const fontBase64 = arrayBufferToBase64(fontBuffer);
      doc.addFileToVFS("Roboto-Bold.ttf", fontBase64);
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    }

    doc.setFont("Roboto", "normal");
  } catch (error) {
    console.warn("Error loading fonts:", error);
  }

  // Helper to format currency
  const formatCurrency = (amount: number, currency: string) => {
    return (
      Number(amount).toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) +
      " " +
      (currency || "TRY")
    );
  };

  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.text("TEKLİF DETAYI", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Proposal Info
  doc.setFontSize(10);
  doc.text(`Teklif No: ${data.proposal_no || "-"}`, margin, yPos);

  const dateStr = formatDate(data.proposal_date || data.created_at);
  doc.text(`Tarih: ${dateStr}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 7;

  if (data.legacy_proposal_no) {
    doc.text(`Ref No: ${data.legacy_proposal_no}`, margin, yPos);
    yPos += 7;
  }
  yPos += 5;

  // Company and Person Info
  const startY = yPos;

  // Left side: Company
  doc.setFontSize(12);
  doc.setFont("Roboto", "bold");
  doc.text("Müşteri Bilgileri", margin, yPos);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  yPos += 6;

  if (data.company) {
    doc.text(data.company.name || "", margin, yPos);
    yPos += 5;
    if (data.company.address) {
      const addressLines = doc.splitTextToSize(data.company.address, pageWidth / 2 - 20);
      doc.text(addressLines, margin, yPos);
      yPos += addressLines.length * 5;
    }
    if (data.company.tax_no) {
      doc.text(
        `VKN: ${data.company.tax_no} ${data.company.tax_office ? `(${data.company.tax_office} VD)` : ""}`,
        margin,
        yPos
      );
      yPos += 5;
    }
    if (data.company.phone) {
      doc.text(`Tel: ${data.company.phone}`, margin, yPos);
      yPos += 5;
    }
    if (data.company.email) {
      doc.text(`E-posta: ${data.company.email}`, margin, yPos);
      yPos += 5;
    }
  } else {
    doc.text("Müşteri bilgisi yok", margin, yPos);
    yPos += 5;
  }

  // Right side: Person
  let rightY = startY;
  const rightX = pageWidth / 2 + 10;

  doc.setFontSize(12);
  doc.setFont("Roboto", "bold");
  doc.text("İlgili Kişi", rightX, rightY);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  rightY += 6;

  if (data.person) {
    doc.text(`${data.person.first_name} ${data.person.last_name}`, rightX, rightY);
    rightY += 5;
    if (data.person.title) {
      doc.text(data.person.title, rightX, rightY);
      rightY += 5;
    }
    if (data.person.phone) {
      doc.text(`Tel: ${data.person.phone}`, rightX, rightY);
      rightY += 5;
    }
    if (data.person.email) {
      doc.text(`E-posta: ${data.person.email}`, rightX, rightY);
      rightY += 5;
    }
  } else {
    doc.text("İlgili kişi yok", rightX, rightY);
    rightY += 5;
  }

  yPos = Math.max(yPos, rightY) + 10;

  // Items Table
  const tableHeaders = [["Açıklama", "Detaylar", "Miktar", "Birim Fiyat", "Toplam"]];

  const tableData = data.items?.map((item: any) => {
    if (item.is_header) {
      return [
        {
          content: item.description,
          colSpan: 5,
          styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
        },
      ];
    }

    // Format attributes
    let attrStr = "";
    const parts = [];

    // New dedicated fields
    if (item.width && item.width > 0) parts.push(`En: ${item.width} cm`);
    if (item.length && item.length > 0) parts.push(`Boy: ${item.length} cm`);
    if (item.piece_count && item.piece_count > 0) parts.push(`Adet: ${item.piece_count}`);
    if (item.kelvin && item.kelvin > 0) parts.push(`K: ${item.kelvin}`);
    if (item.watt && item.watt > 0) parts.push(`Watt: ${item.watt}`);
    if (item.lumen && item.lumen > 0) parts.push(`Lümen: ${item.lumen}`);

    if (item.attributes) {
      // Legacy fallback
      if (!item.width && (item.attributes.enCm || item.attributes.En || item.attributes.en))
        parts.push(`En: ${item.attributes.enCm || item.attributes.En || item.attributes.en}`);
      if (!item.length && (item.attributes.boyCm || item.attributes.Boy || item.attributes.boy))
        parts.push(`Boy: ${item.attributes.boyCm || item.attributes.Boy || item.attributes.boy}`);
      if (!item.piece_count && (item.attributes.adet || item.attributes.Adet))
        parts.push(`Adet: ${item.attributes.adet || item.attributes.Adet}`);

      Object.entries(item.attributes).forEach(([key, value]) => {
        if (!["en", "boy", "adet", "encm", "boycm", "width", "length", "piececount", "kelvin", "watt", "lumen"].includes(key.toLowerCase())) {
          parts.push(`${key}: ${value}`);
        }
      });
    }
    attrStr = parts.join(", ");

    return [
      item.description,
      attrStr,
      `${item.quantity} ${item.unit}`,
      formatCurrency(item.unit_price, data.currency),
      formatCurrency(item.total_price, data.currency),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: tableHeaders,
    body: tableData,
    styles: {
      font: "Roboto", // Use the custom font
      fontStyle: "normal", // Default style
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: 255,
      fontStyle: "bold", // Use bold for header
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page for totals
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Totals
  const totalWidth = 60;
  const totalX = pageWidth - margin - totalWidth;

  doc.setFontSize(10);

  doc.text("Ara Toplam:", totalX, yPos);
  doc.text(formatCurrency(data.total_amount, data.currency), pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  doc.text(`KDV (%${data.vat_rate || 20}):`, totalX, yPos);
  doc.text(formatCurrency(data.vat_amount || 0, data.currency), pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  doc.text("Genel Toplam:", totalX, yPos);
  doc.text(
    formatCurrency(
      data.grand_total || Number(data.total_amount) + Number(data.vat_amount || 0),
      data.currency
    ),
    pageWidth - margin,
    yPos,
    { align: "right" }
  );
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);

  yPos += 15;

  // Terms and Notes
  if (data.payment_terms) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont("Roboto", "bold");
    doc.text("Ödeme Koşulları:", margin, yPos);
    yPos += 5;
    doc.setFont("Roboto", "normal");
    const terms = doc.splitTextToSize(data.payment_terms, pageWidth - margin * 2);
    doc.text(terms, margin, yPos);
    yPos += terms.length * 5 + 5;
  }

  if (data.notes) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont("Roboto", "bold");
    doc.text("Notlar:", margin, yPos);
    yPos += 5;
    doc.setFont("Roboto", "normal");
    const notes = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(notes, margin, yPos);
  }

  // Save or Return
  // doc.save(`Teklif-${data.proposal_no || "Detay"}.pdf`);
  return doc;
};
