const COLOR_PRIMARY = [15, 76, 92]
const COLOR_TEXT = [28, 43, 51]
const COLOR_MUTED = [92, 107, 115]
const COLOR_LIGHT_BG = [232, 241, 243]
const COLOR_LINK = [21, 101, 192]
const MARGIN = 14
const PAGE_HEIGHT = 297
const PAGE_WIDTH = 210

export function newStyledPdf(doc, title, subtitle, patientName) {
  doc.setFillColor(...COLOR_PRIMARY)
  doc.rect(0, 0, PAGE_WIDTH, 38, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text('DR. ROGELIO SÁNCHEZ', MARGIN, 12)
  doc.setFontSize(7)
  doc.text('Medicina interna · Terapia intensiva · Pie diabético', MARGIN, 17)

  doc.setFontSize(17)
  doc.setFont(undefined, 'bold')
  doc.text(title, MARGIN, 27)

  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text(subtitle, MARGIN, 33)

  doc.setTextColor(...COLOR_TEXT)

  let y = 48
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text(patientName || 'Paciente', MARGIN, y)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_MUTED)
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(fecha, PAGE_WIDTH - MARGIN, y, { align: 'right' })
  doc.setTextColor(...COLOR_TEXT)

  return y + 8
}

export function checkPageBreak(doc, y, needed) {
  if (y + needed > PAGE_HEIGHT - 20) {
    doc.addPage()
    return 20
  }
  return y
}

export function addSectionBox(doc, y, lines) {
  doc.setFillColor(...COLOR_LIGHT_BG)
  const boxHeight = lines.length * 4.6 + 8
  doc.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, boxHeight, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_TEXT)
  doc.text(lines, MARGIN + 4, y + 6)
  return y + boxHeight + 8
}

export function addDayHeader(doc, y, dayLabel) {
  doc.setFillColor(...COLOR_PRIMARY)
  doc.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 8, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text(dayLabel, MARGIN + 4, y + 5.5)
  doc.setTextColor(...COLOR_TEXT)
  doc.setFont(undefined, 'normal')
  return y + 12
}

export function addItemLine(doc, y, titleText, metaText, noteText) {
  doc.setFontSize(9.5)
  doc.setFont(undefined, 'bold')
  doc.text(`•  ${titleText}`, MARGIN + 2, y)
  doc.setFont(undefined, 'normal')
  y += 4.5

  if (metaText) {
    doc.setFontSize(8.5)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(metaText, MARGIN + 6, y)
    doc.setTextColor(...COLOR_TEXT)
    y += 4.2
  }

  if (noteText) {
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_MUTED)
    const noteLines = doc.splitTextToSize(noteText, PAGE_WIDTH - MARGIN * 2 - 8)
    doc.text(noteLines, MARGIN + 6, y)
    doc.setTextColor(...COLOR_TEXT)
    y += noteLines.length * 3.8
  }

  return y + 1
}

export function addVideoLink(doc, y, query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_LINK)
  doc.textWithLink(`▶ Ver video: ${query}`, MARGIN + 6, y, { url })
  doc.setTextColor(...COLOR_TEXT)
  return y + 4.5
}

export function addFootersToAllPages(doc) {
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(221, 227, 230)
    doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15)
    doc.setFontSize(7.5)
    doc.setTextColor(...COLOR_MUTED)
    doc.text('Generado por la plataforma de seguimiento del Dr. Rogelio Sánchez. Este documento es orientativo y no sustituye la valoración médica presencial.', MARGIN, PAGE_HEIGHT - 10, { maxWidth: PAGE_WIDTH - MARGIN * 2 })
    doc.text(`${i} / ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' })
  }
}
