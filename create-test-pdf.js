const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create a document
const doc = new PDFDocument();

// Pipe its output somewhere, like to a file or HTTP response
doc.pipe(fs.createWriteStream('uploads/test-document.pdf'));

// Embed a font, set the font size, and render some text
doc.fontSize(20).text('这是一个测试PDF文档', 100, 100);
doc.fontSize(16).text('第二行文本内容', 100, 150);
doc.fontSize(14).text('第三行文本，用于测试边框功能', 100, 200);

// Add another page
doc.addPage().fontSize(25).text('第二页内容', 100, 100);

// Finalize PDF file
doc.end();

console.log('Test PDF created successfully!');