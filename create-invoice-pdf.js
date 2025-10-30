const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create a document
const doc = new PDFDocument();

// Pipe its output somewhere, like to a file or HTTP response
doc.pipe(fs.createWriteStream('uploads/invoice-test.pdf'));

// Add invoice information
doc.fontSize(18).text('增值税电子普通发票', 150, 50, { align: 'center' });
doc.fontSize(12).text('发票代码: 123456789012', 100, 100);
doc.fontSize(12).text('发票号码: 98765432', 100, 120);
doc.fontSize(12).text('开票日期: 2025-10-28', 100, 140);
doc.fontSize(12).text('购 买 方: 测试公司', 100, 160);
doc.fontSize(12).text('销售方: 示例公司', 100, 180);
doc.fontSize(12).text('商品名称: 测试服务', 100, 200);
doc.fontSize(12).text('规格型号: 无', 100, 220);
doc.fontSize(12).text('单位: 次', 100, 240);
doc.fontSize(12).text('数量: 1', 100, 260);
doc.fontSize(12).text('单价: 1000.00', 100, 280);
doc.fontSize(12).text('金额: 1000.00', 100, 300);
doc.fontSize(12).text('税率: 13%', 100, 320);
doc.fontSize(12).text('税额: 130.00', 100, 340);
doc.fontSize(12).text('价税合计: 1130.00', 100, 360);
doc.fontSize(12).text('不含税金额: 1000.00', 100, 380);

// Finalize PDF file
doc.end();

console.log('Invoice test PDF created successfully!');