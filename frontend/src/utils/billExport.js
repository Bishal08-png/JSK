import { PDFDocument, StandardFonts, rgb, TextAlignment } from 'pdf-lib'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from 'docx'

const fmtCur = (n) => `Rs. ${Number(n || 0).toFixed(2)}`

const sanitizeWinAnsi = (value) =>
  String(value ?? '')
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7e\xa0-\xff\n]/g, '')

const fmtBillDate = (d) =>
  sanitizeWinAnsi(new Date(d || Date.now()).toLocaleString('en-IN'))

const estimateWrappedLines = (text, font, fontSize, maxWidth) => {
  const clean = sanitizeWinAnsi(text)
  if (!clean) return 1
  const paragraphs = clean.split('\n')
  let totalLines = 0

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      totalLines += 1
      continue
    }
    let currentLine = words[0]
    let lines = 1
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate
      } else {
        lines += 1
        currentLine = words[i]
      }
    }
    totalLines += lines
  }
  return Math.max(1, totalLines)
}

const addEditableTextField = ({
  form,
  page,
  name,
  value,
  x,
  y,
  width,
  height,
  font,
  fontSize,
  color = rgb(0.1, 0.1, 0.1),
  align = TextAlignment.Left,
  multiline = false,
}) => {
  const field = form.createTextField(name)
  field.setText(sanitizeWinAnsi(value))
  field.setAlignment(align)
  if (multiline) field.enableMultiline()
  field.addToPage(page, {
    x,
    y,
    width,
    height,
    textColor: color,
    borderWidth: 0,
    font,
  })
  field.setFontSize(fontSize)
  field.updateAppearances(font)
  return field
}

/**
 * Generates an A5 PDF where all bill data values are editable AcroForm text fields
 * and static labels/lines are crisp PDF vector graphics.
 */
export async function buildBillPdfBytes(bill, business) {
  const pageWidth = 419.53 // A5 width in pt (148mm)
  const pageHeight = 595.28 // A5 height in pt (210mm)
  const marginX = 28
  const marginBottom = 28
  const contentW = pageWidth - marginX * 2

  const pdfDoc = await PDFDocument.create()
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const form = pdfDoc.getForm()

  const brandColor = rgb(0.102, 0.435, 0.588) // #1a6f96
  const darkText = rgb(0.1, 0.1, 0.1)
  const mutedText = rgb(0.4, 0.4, 0.4)
  const greenText = rgb(0.08, 0.55, 0.35)
  const headerBg = rgb(0.875, 0.945, 0.976) // #dff1f9
  const borderLight = rgb(0.88, 0.88, 0.88)
  const dashColor = rgb(0.75, 0.75, 0.75)

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - 28

  // Shop header (editable fields)
  const initialsH = 24
  y -= initialsH
  addEditableTextField({
    form,
    page,
    name: 'shop_initials',
    value: business?.initials || '',
    x: marginX,
    y,
    width: contentW,
    height: initialsH,
    font: fontBold,
    fontSize: 18,
    color: brandColor,
    align: TextAlignment.Center,
  })

  y -= 2
  const shopNameH = 16
  y -= shopNameH
  addEditableTextField({
    form,
    page,
    name: 'shop_name',
    value: business?.name || '',
    x: marginX,
    y,
    width: contentW,
    height: shopNameH,
    font: fontBold,
    fontSize: 11,
    color: darkText,
    align: TextAlignment.Center,
  })

  const addrText = business?.address || ''
  const addrLines = estimateWrappedLines(addrText, fontReg, 8.5, contentW - 12)
  const addrH = Math.max(14, addrLines * 11 + 4)
  y -= addrH
  addEditableTextField({
    form,
    page,
    name: 'shop_address',
    value: addrText,
    x: marginX,
    y,
    width: contentW,
    height: addrH,
    font: fontReg,
    fontSize: 8.5,
    color: mutedText,
    align: TextAlignment.Center,
    multiline: addrLines > 1,
  })

  const tagH = 13
  y -= tagH
  addEditableTextField({
    form,
    page,
    name: 'shop_tagline',
    value: 'Your trusted stationery destination',
    x: marginX,
    y,
    width: contentW,
    height: tagH,
    font: fontReg,
    fontSize: 8.5,
    color: mutedText,
    align: TextAlignment.Center,
  })

  y -= 6
  const metaRows = [
    { label: 'Bill No:', name: 'bill_number', value: bill?.billNumber || '', bold: true },
    { label: 'Date:', name: 'bill_date', value: fmtBillDate(bill?.createdAt), bold: false },
    {
      label: 'Customer:',
      name: 'customer_name',
      value: bill?.customerName || 'Walk-in Customer',
      bold: true,
    },
  ]

  const metaLabelW = 62
  for (const row of metaRows) {
    const rowH = 14
    y -= rowH
    page.drawText(row.label, {
      x: marginX,
      y: y + 3.5,
      size: 9,
      font: fontReg,
      color: mutedText,
    })
    addEditableTextField({
      form,
      page,
      name: row.name,
      value: row.value,
      x: marginX + metaLabelW,
      y,
      width: contentW - metaLabelW,
      height: rowH,
      font: row.bold ? fontBold : fontReg,
      fontSize: 9.5,
      color: darkText,
      align: TextAlignment.Left,
    })
  }

  // Dashed divider
  y -= 8
  page.drawLine({
    start: { x: marginX, y },
    end: { x: marginX + contentW, y },
    thickness: 1,
    color: dashColor,
    dashArray: [3, 3],
  })
  y -= 10

  // Table column layout
  const colW = {
    item: 175,
    qty: 36,
    rate: 74,
    total: contentW - (175 + 36 + 74),
  }
  const colX = {
    item: marginX,
    qty: marginX + colW.item,
    rate: marginX + colW.item + colW.qty,
    total: marginX + colW.item + colW.qty + colW.rate,
  }

  const drawTableHeader = (targetPage, topY) => {
    const headerH = 18
    const bottomY = topY - headerH
    targetPage.drawRectangle({
      x: marginX,
      y: bottomY,
      width: contentW,
      height: headerH,
      color: headerBg,
    })

    const textY = bottomY + 5.5
    targetPage.drawText('Item', { x: colX.item + 4, y: textY, size: 9, font: fontBold, color: darkText })

    const qtyLabel = 'Qty'
    const qtyW = fontBold.widthOfTextAtSize(qtyLabel, 9)
    targetPage.drawText(qtyLabel, {
      x: colX.qty + (colW.qty - qtyW) / 2,
      y: textY,
      size: 9,
      font: fontBold,
      color: darkText,
    })

    const rateLabel = 'Rate'
    const rateW = fontBold.widthOfTextAtSize(rateLabel, 9)
    targetPage.drawText(rateLabel, {
      x: colX.rate + colW.rate - rateW - 4,
      y: textY,
      size: 9,
      font: fontBold,
      color: darkText,
    })

    const totalLabel = 'Total'
    const totalW = fontBold.widthOfTextAtSize(totalLabel, 9)
    targetPage.drawText(totalLabel, {
      x: colX.total + colW.total - totalW - 4,
      y: textY,
      size: 9,
      font: fontBold,
      color: darkText,
    })

    return bottomY
  }

  y = drawTableHeader(page, y)

  const items = Array.isArray(bill?.items) ? bill.items : []
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    const itemName = item.productName || ''
    const lineCount = estimateWrappedLines(itemName, fontReg, 9, colW.item - 8)
    const rowH = Math.max(18, lineCount * 11 + 6)

    if (y - rowH < marginBottom + 20) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - 28
      y = drawTableHeader(page, y)
    }

    y -= rowH
    const fieldY = y + 2
    const fieldH = rowH - 4

    addEditableTextField({
      form,
      page,
      name: `item_name_${i}`,
      value: itemName,
      x: colX.item + 2,
      y: fieldY,
      width: colW.item - 4,
      height: fieldH,
      font: fontReg,
      fontSize: 9,
      color: darkText,
      align: TextAlignment.Left,
      multiline: lineCount > 1,
    })

    addEditableTextField({
      form,
      page,
      name: `item_qty_${i}`,
      value: String(item.quantity ?? 0),
      x: colX.qty + 2,
      y: fieldY,
      width: colW.qty - 4,
      height: fieldH,
      font: fontReg,
      fontSize: 9,
      color: darkText,
      align: TextAlignment.Center,
    })

    addEditableTextField({
      form,
      page,
      name: `item_rate_${i}`,
      value: fmtCur(item.finalPrice),
      x: colX.rate + 2,
      y: fieldY,
      width: colW.rate - 4,
      height: fieldH,
      font: fontReg,
      fontSize: 9,
      color: darkText,
      align: TextAlignment.Right,
    })

    addEditableTextField({
      form,
      page,
      name: `item_total_${i}`,
      value: fmtCur(item.itemTotal),
      x: colX.total + 2,
      y: fieldY,
      width: colW.total - 4,
      height: fieldH,
      font: fontReg,
      fontSize: 9,
      color: darkText,
      align: TextAlignment.Right,
    })

    page.drawLine({
      start: { x: marginX, y },
      end: { x: marginX + contentW, y },
      thickness: 0.5,
      color: borderLight,
    })
  }

  // Ensure enough vertical room for totals + footer
  if (y - 102 < marginBottom) {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - 28
  }

  // Dashed divider above totals
  y -= 10
  page.drawLine({
    start: { x: marginX, y },
    end: { x: marginX + contentW, y },
    thickness: 1,
    color: dashColor,
    dashArray: [3, 3],
  })
  y -= 6

  const totalLabelW = 160
  const totalValW = contentW - totalLabelW

  // Subtotal
  y -= 15
  page.drawText('Subtotal (MRP):', { x: marginX, y: y + 4, size: 9.5, font: fontReg, color: darkText })
  addEditableTextField({
    form,
    page,
    name: 'subtotal',
    value: fmtCur(bill?.subtotal),
    x: marginX + totalLabelW,
    y,
    width: totalValW,
    height: 15,
    font: fontReg,
    fontSize: 9.5,
    color: darkText,
    align: TextAlignment.Right,
  })

  // Total Discount
  y -= 15
  page.drawText('Total Discount:', { x: marginX, y: y + 4, size: 9.5, font: fontReg, color: greenText })
  addEditableTextField({
    form,
    page,
    name: 'total_discount',
    value: `- ${fmtCur(bill?.totalDiscount)}`,
    x: marginX + totalLabelW,
    y,
    width: totalValW,
    height: 15,
    font: fontReg,
    fontSize: 9.5,
    color: greenText,
    align: TextAlignment.Right,
  })

  // Line above Grand Total
  y -= 4
  page.drawLine({
    start: { x: marginX, y },
    end: { x: marginX + contentW, y },
    thickness: 0.75,
    color: dashColor,
  })

  // Grand Total
  y -= 20
  page.drawText('GRAND TOTAL:', { x: marginX, y: y + 5, size: 11, font: fontBold, color: darkText })
  addEditableTextField({
    form,
    page,
    name: 'grand_total',
    value: fmtCur(bill?.grandTotal),
    x: marginX + totalLabelW,
    y,
    width: totalValW,
    height: 18,
    font: fontBold,
    fontSize: 11,
    color: darkText,
    align: TextAlignment.Right,
  })

  // Footer
  y -= 32
  addEditableTextField({
    form,
    page,
    name: 'footer_note',
    value: `Thank you for shopping at ${business?.name || 'our shop'}!\nVisit Again!`,
    x: marginX,
    y,
    width: contentW,
    height: 26,
    font: fontReg,
    fontSize: 8.5,
    color: mutedText,
    align: TextAlignment.Center,
    multiline: true,
  })

  return pdfDoc.save({ updateFieldAppearances: false })
}

/**
 * Generates an editable .docx Word document matching the bill structure.
 */
export function buildBillDocxDocument(bill, business) {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' }
  const lightBorder = { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }
  const dashedBorder = { style: BorderStyle.DASHED, size: 6, color: 'CCCCCC' }

  const items = Array.isArray(bill?.items) ? bill.items : []

  const headerCells = [
    { text: 'Item', align: AlignmentType.LEFT, width: 46 },
    { text: 'Qty', align: AlignmentType.CENTER, width: 14 },
    { text: 'Rate', align: AlignmentType.RIGHT, width: 20 },
    { text: 'Total', align: AlignmentType.RIGHT, width: 20 },
  ].map(
    (col) =>
      new TableCell({
        width: { size: col.width, type: WidthType.PERCENTAGE },
        shading: { fill: 'DFF1F9', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        borders: { top: noBorder, left: noBorder, right: noBorder, bottom: lightBorder },
        children: [
          new Paragraph({
            alignment: col.align,
            children: [new TextRun({ text: col.text, bold: true, size: 19, color: '111111' })],
          }),
        ],
      }),
  )

  const itemRows = items.map(
    (item) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 46, type: WidthType.PERCENTAGE },
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: lightBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: String(item.productName || ''), size: 18, color: '111111' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: lightBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(item.quantity ?? 0), size: 18, color: '111111' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: { top: 70, bottom: 70, left: 80, right: 100 },
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: lightBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: fmtCur(item.finalPrice), size: 18, color: '111111' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: { top: 70, bottom: 70, left: 80, right: 100 },
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: lightBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: fmtCur(item.itemTotal), size: 18, color: '111111' })],
              }),
            ],
          }),
        ],
      }),
  )

  const summaryRow = (label, value, { bold = false, color = '111111', topBorder = noBorder } = {}) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          margins: { top: 50, bottom: 50, left: 60, right: 60 },
          borders: { top: topBorder, left: noBorder, right: noBorder, bottom: noBorder },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: label, bold, size: bold ? 22 : 19, color })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          margins: { top: 50, bottom: 50, left: 60, right: 60 },
          borders: { top: topBorder, left: noBorder, right: noBorder, bottom: noBorder },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: value, bold, size: bold ? 22 : 19, color })],
            }),
          ],
        }),
      ],
    })

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(148),
              height: convertMillimetersToTwip(210),
            },
            margin: {
              top: convertMillimetersToTwip(12),
              right: convertMillimetersToTwip(12),
              bottom: convertMillimetersToTwip(12),
              left: convertMillimetersToTwip(12),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: business?.initials || '',
                bold: true,
                size: 36,
                color: '1A6F96',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: business?.name || '', bold: true, size: 22, color: '1A1A1A' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [new TextRun({ text: business?.address || '', size: 17, color: '666666' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'Your trusted stationery destination', size: 17, color: '666666' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Bill No: ', size: 18, color: '555555' }),
              new TextRun({ text: bill?.billNumber || '', bold: true, size: 19, color: '111111' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Date: ', size: 18, color: '555555' }),
              new TextRun({ text: fmtBillDate(bill?.createdAt), size: 18, color: '111111' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            border: { bottom: dashedBorder },
            children: [
              new TextRun({ text: 'Customer: ', size: 18, color: '555555' }),
              new TextRun({
                text: bill?.customerName || 'Walk-in Customer',
                bold: true,
                size: 19,
                color: '111111',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: headerCells }), ...itemRows],
          }),
          new Paragraph({
            spacing: { before: 120, after: 80 },
            border: { bottom: dashedBorder },
            children: [],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              summaryRow('Subtotal (MRP):', fmtCur(bill?.subtotal)),
              summaryRow('Total Discount:', `- ${fmtCur(bill?.totalDiscount)}`, { color: '15803D' }),
              summaryRow('GRAND TOTAL:', fmtCur(bill?.grandTotal), {
                bold: true,
                topBorder: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 220, after: 40 },
            children: [
              new TextRun({
                text: `Thank you for shopping at ${business?.name || 'our shop'}!`,
                size: 17,
                color: '666666',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Visit Again!', size: 17, color: '666666' })],
          }),
        ],
      },
    ],
  })
}

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function saveBillAsPDF(bill, business) {
  const bytes = await buildBillPdfBytes(bill, business)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  triggerDownload(blob, `${bill?.billNumber || 'Bill'}.pdf`)
}

export async function saveBillAsDOCX(bill, business) {
  const doc = buildBillDocxDocument(bill, business)
  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${bill?.billNumber || 'Bill'}.docx`)
}
