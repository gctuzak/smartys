import { createCanvas, Canvas, Image, ImageData, DOMMatrix, DOMPoint } from "canvas";
import path from "path";

// 1. Global Polyfills
// PDF.js v5 in Node environment checks for these globals
// @ts-ignore
if (!global.Canvas) global.Canvas = Canvas;
// @ts-ignore
if (!global.Image) global.Image = Image;
// @ts-ignore
if (!global.ImageData) global.ImageData = ImageData;
// @ts-ignore
if (!global.DOMMatrix) global.DOMMatrix = DOMMatrix;
// @ts-ignore
if (!global.DOMPoint) global.DOMPoint = DOMPoint;

// Promise.withResolvers polyfill (needed for pdfjs-dist v4+)
// @ts-ignore
if (!global.Promise.withResolvers) {
    // @ts-ignore
    global.Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

// 2. Canvas Factory
class NodeCanvasFactory {
    create(width: number, height: number) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        return {
            canvas,
            context,
        };
    }

    reset(canvasAndContext: any, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: any) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

// 3. Main Conversion Function
export async function convertPdfToImage(buffer: Buffer): Promise<string> {
    // Dynamic import to ensure global polyfills are seen by pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const data = new Uint8Array(buffer);
    
    // Node modules path resolution
    const pdfjsDistPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist');
    const cMapUrl = path.join(pdfjsDistPath, 'cmaps/');
    const standardFontDataUrl = path.join(pdfjsDistPath, 'standard_fonts/');

    const loadingTask = pdfjsLib.getDocument({
        data,
        cMapUrl,
        cMapPacked: true,
        standardFontDataUrl,
        // Disable font face rule generation to avoid canvas issues
        disableFontFace: true
    });

    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvasFactory = new NodeCanvasFactory();
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);

    await page.render({
        canvasContext: context as any,
        viewport: viewport,
        canvasFactory: canvasFactory as any
    }).promise;

    return canvas.toDataURL().split(',')[1];
}
