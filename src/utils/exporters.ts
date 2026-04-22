import { jsPDF } from 'jspdf'

const toPngDataUrl = async (svg: SVGSVGElement): Promise<string> => {
  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load SVG for export'))
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.width || 1400
    canvas.height = image.height || 900

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas context is unavailable')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

const download = (href: string, fileName: string): void => {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
}

export const exportAsImage = async (svg: SVGSVGElement): Promise<void> => {
  const png = await toPngDataUrl(svg)
  download(png, 'showjumping-course.png')
}

export const exportAsPdf = async (svg: SVGSVGElement): Promise<void> => {
  const png = await toPngDataUrl(svg)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.addImage(png, 'PNG', 10, 10, pageWidth - 20, pageHeight - 20)
  pdf.save('showjumping-course.pdf')
}

export const printLayout = (svgMarkup: string): void => {
  const printableWindow = window.open('', '_blank', 'width=1200,height=900')
  if (!printableWindow) {
    return
  }

  printableWindow.document.write(`
    <html>
      <head><title>Printable Course Layout</title></head>
      <body style="margin:0;padding:16px;font-family:Arial,sans-serif;">
        <h2>Course Layout</h2>
        ${svgMarkup}
      </body>
    </html>
  `)
  printableWindow.document.close()
  printableWindow.focus()
  printableWindow.print()
}
