/**
 * PDF提取工具模块
 * 封装了pdf.js-extract相关的功能，方便在不同项目中复用
 */

const { PDFExtract } = require('pdf.js-extract');
const fs = require('fs');
const path = require('path');

// 引入 pdfjs 模块以获取更详细的文本属性
const pdfjsLib = require('pdf.js-extract/lib/pdfjs/pdf.js');
const LocalCMapReaderFactory = require('pdf.js-extract/lib/cmap-reader.js');

/**
 * 增强的 PDF 解析函数，获取更完整的文本属性
 * @param {string} filePath - PDF文件路径
 * @param {Object} options - 解析选项
 * @returns {Promise<Object>} 解析后的PDF数据
 */
async function extractEnhancedPDFData(filePath, options = {}) {
  // 使用 pdf.js-extract 获取基础数据
  const pdfExtract = new PDFExtract();
  const basicData = await pdfExtract.extract(filePath, options);
  
  // 使用 pdfjs 获取更详细的文本属性
  if (options.verbosity === undefined) {
    options.verbosity = -1;
  }
  if (options.cMapUrl === undefined) {
    options.cMapUrl = path.join(__dirname, 'node_modules/pdf.js-extract/lib/cmaps/'); // trailing path delimiter is important
  }
  if (options.cMapPacked === undefined) {
    options.cMapPacked = true;
  }
  if (options.CMapReaderFactory === undefined) {
    options.CMapReaderFactory = LocalCMapReaderFactory;
  }
  
  const buffer = fs.readFileSync(filePath);
  options.data = new Uint8Array(buffer);
  
  const doc = await pdfjsLib.getDocument(options).promise;
  const firstPage = (options && options.firstPage) ? options.firstPage : 1;
  const lastPage = Math.min((options && options.lastPage) ? options.lastPage : doc.numPages, doc.numPages);
  
  // 增强每一页的数据
  for (let i = firstPage; i <= lastPage; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    
    // 获取更详细的文本内容
    const textContent = await page.getTextContent({
      normalizeWhitespace: !!(options && options.normalizeWhitespace === true),
      disableCombineTextItems: !!(options && options.disableCombineTextItems === true)
    });
    
    // 获取页面的注释信息
    const annotations = await page.getAnnotations();
    const links = annotations.filter(annot => annot.subtype === "Link" && !!annot.url)
      .map(link => link.url);
    
    // 找到对应的基础页面数据
    const basicPage = basicData.pages.find(p => p.pageInfo.num === i);
    if (basicPage) {
      // 更新链接信息
      basicPage.links = links;
      
      // 增强每个文本项的属性
      basicPage.content.forEach((basicItem, index) => {
        if (textContent.items[index]) {
          const detailedItem = textContent.items[index];
          
          // 将 detailedItem 中的所有属性添加到 basicItem 中
          // 这样可以确保不会遗漏任何额外的属性
          for (const key in detailedItem) {
            if (detailedItem.hasOwnProperty(key)) {
              // 如果是 transform 属性，确保它是一个数组
              if (key === 'transform' && Array.isArray(detailedItem[key])) {
                basicItem[key] = [...detailedItem[key]];
              } else {
                basicItem[key] = detailedItem[key];
              }
            }
          }
          
          // 特别处理一些可能需要的属性
          basicItem.hasEOL = detailedItem.hasEOL || false;
          
          // 从 transform 矩阵解析旋转角度和其他属性
          if (detailedItem.transform && detailedItem.transform.length >= 6) {
            const transform = detailedItem.transform;
            // transform 矩阵: [a, b, c, d, e, f]
            // a = scaleX * cos(rotation)
            // b = scaleX * sin(rotation)
            // c = -scaleY * sin(rotation)
            // d = scaleY * cos(rotation)
            
            // 计算旋转角度（以度为单位）
            const a = transform[0];
            const b = transform[1];
            const rotationRad = Math.atan2(b, a);
            const rotationDeg = rotationRad * 180 / Math.PI;
            basicItem.angle = rotationDeg;
            
            // 计算字体大小
            // 字体大小是变换矩阵的缩放因子
            const scaleX = Math.sqrt(a * a + b * b);
            basicItem.fontSize = scaleX;
          }
        }
      });
    }
  }
  
  return basicData;
}

module.exports = {
  extractEnhancedPDFData
};