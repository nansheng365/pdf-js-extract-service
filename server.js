const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 引入pdf提取工具模块
const { extractEnhancedPDFData } = require('./pdf-extract-util');

const app = express();
const PORT = 3000;

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);  //  cb(null, Date.now() + '-' + file.originalname);

  }
});

const upload = multer({ storage: storage });

// 创建 uploads 目录（如果不存在）
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 提供前端静态文件 - 明确指定 frontend 目录
app.use(express.static(path.join(__dirname, 'frontend')));

// 获取当前目录下的所有 PDF 文件
app.get('/api/pdf-files', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) {
      return res.status(500).json({ error: '无法读取文件目录' });
    }
    
    const pdfFiles = files.filter(file => 
      path.extname(file).toLowerCase() === '.pdf'
    ).map(file => ({
      name: file,
      path: `/uploads/${file}`
    }));
    
    res.json(pdfFiles);
  });
});

// 上传 PDF 文件
app.post('/api/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有文件被上传' });
  }
  
  res.json({
    message: '文件上传成功',
    file: {
      name: req.file.filename,
      path: `/uploads/${req.file.filename}`
    }
  });
});

// 增强的 PDF 解析函数，获取更完整的文本属性
// async function extractEnhancedPDFData(filePath, options = {}) {
//   // 使用 pdf.js-extract 获取基础数据
//   const pdfExtract = new PDFExtract();
//   const basicData = await pdfExtract.extract(filePath, options);
//   
//   // 使用 pdfjs 获取更详细的文本属性
//   if (options.verbosity === undefined) {
//     options.verbosity = -1;
//   }
//   if (options.cMapUrl === undefined) {
//     options.cMapUrl = path.join(__dirname, 'node_modules/pdf.js-extract/lib/cmaps/'); // trailing path delimiter is important
//   }
//   if (options.cMapPacked === undefined) {
//     options.cMapPacked = true;
//   }
//   if (options.CMapReaderFactory === undefined) {
//     options.CMapReaderFactory = LocalCMapReaderFactory;
//   }
//   
//   const buffer = fs.readFileSync(filePath);
//   options.data = new Uint8Array(buffer);
//   
//   const doc = await pdfjsLib.getDocument(options).promise;
//   const firstPage = (options && options.firstPage) ? options.firstPage : 1;
//   const lastPage = Math.min((options && options.lastPage) ? options.lastPage : doc.numPages, doc.numPages);
//   
//   // 增强每一页的数据
//   for (let i = firstPage; i <= lastPage; i++) {
//     const page = await doc.getPage(i);
//     const viewport = page.getViewport({ scale: 1.0 });
//     
//     // 获取更详细的文本内容
//     const textContent = await page.getTextContent({
//       normalizeWhitespace: !!(options && options.normalizeWhitespace === true),
//       disableCombineTextItems: !!(options && options.disableCombineTextItems === true)
//     });
//     
//     // 获取页面的注释信息
//     const annotations = await page.getAnnotations();
//     const links = annotations.filter(annot => annot.subtype === "Link" && !!annot.url)
//       .map(link => link.url);
//     
//     // 找到对应的基础页面数据
//     const basicPage = basicData.pages.find(p => p.pageInfo.num === i);
//     if (basicPage) {
//       // 更新链接信息
//       basicPage.links = links;
//       
//       // 增强每个文本项的属性
//       basicPage.content.forEach((basicItem, index) => {
//         if (textContent.items[index]) {
//           const detailedItem = textContent.items[index];
//           
//           // 将 detailedItem 中的所有属性添加到 basicItem 中
//           // 这样可以确保不会遗漏任何额外的属性
//           for (const key in detailedItem) {
//             if (detailedItem.hasOwnProperty(key)) {
//               // 如果是 transform 属性，确保它是一个数组
//               if (key === 'transform' && Array.isArray(detailedItem[key])) {
//                 basicItem[key] = [...detailedItem[key]];
//               } else {
//                 basicItem[key] = detailedItem[key];
//               }
//             }
//           }
//           
//           // 特别处理一些可能需要的属性
//           basicItem.hasEOL = detailedItem.hasEOL || false;
//           
//           // 从 transform 矩阵解析旋转角度和其他属性
//           if (detailedItem.transform && detailedItem.transform.length >= 6) {
//             const transform = detailedItem.transform;
//             // transform 矩阵: [a, b, c, d, e, f]
//             // a = scaleX * cos(rotation)
//             // b = scaleX * sin(rotation)
//             // c = -scaleY * sin(rotation)
//             // d = scaleY * cos(rotation)
//             
//             // 计算旋转角度（以度为单位）
//             const a = transform[0];
//             const b = transform[1];
//             const rotationRad = Math.atan2(b, a);
//             const rotationDeg = rotationRad * 180 / Math.PI;
//             basicItem.angle = rotationDeg;
//             
//             // 计算字体大小
//             // 字体大小是变换矩阵的缩放因子
//             const scaleX = Math.sqrt(a * a + b * b);
//             basicItem.fontSize = scaleX;
//           }
//         //  console.log(basicItem);
//         }
//       });
//     }
//   }
//   
//   return basicData;
// }

// 整合文本函数 - 按X坐标分组文本（将同一列的文本归为一组），只对单字符文本进行分组
// 并将同一组中间距基本为一个字符大小的文本整合成一个文本
// 注意：此函数已被移至 text-integration.js 模块中实现
// function integrateTextData(basicData) { ... }

// 横向整合函数 - 将Y坐标一致的同一行文本进行整合
// 注意：此函数已被移至 text-integration.js 模块中实现
// function integrateHorizontalTextData(integratedData) { ... }

// 引入文本整合模块
const textIntegration = require('./text-integration');

// 解析 PDF 文件
app.post('/api/parse-pdf', async (req, res) => {
  try {
    const { filePath } = req.body;
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 使用增强的解析函数
    const data = await extractEnhancedPDFData(fullPath);
    res.json(data);
  } catch (error) {
    console.error('PDF 解析错误:', error);
    res.status(500).json({ error: 'PDF 解析失败', details: error.message });
  }
});

// 获取整合后的 PDF 文本数据
app.post('/api/parse-pdf-integrated', async (req, res) => {
  try {
    const { filePath } = req.body;
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 使用增强的解析函数
    const basicData = await extractEnhancedPDFData(fullPath);
    
    // 使用新的整合函数序列处理数据
    const integratedData = textIntegration.integrateTextDataInSequence(basicData);
    
    res.json(integratedData);
  } catch (error) {
    console.error('PDF 解析错误:', error);
    res.status(500).json({ error: 'PDF 解析失败', details: error.message });
  }
});

// 提取发票信息的 API 接口
app.post('/api/extract-invoice-info', async (req, res) => {
  try {
    const { filePath } = req.body;
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 使用增强的解析函数
    const basicData = await extractEnhancedPDFData(fullPath);
    
    // 使用整合函数序列处理数据
    const integratedData = textIntegration.integrateTextDataInSequence(basicData);
    
    // 对同一行文本进行合并
    const mergedData = textIntegration.mergeTextInSameLine(integratedData);
    //console.log(mergedData);
    // 提取发票信息
    const invoiceInfo = textIntegration.extractInvoiceInfo(mergedData);
    
    res.json(invoiceInfo);
  } catch (error) {
    console.error('发票信息提取错误:', error);
    res.status(500).json({ error: '发票信息提取失败', details: error.message });
  }
});

// 根路由，提供前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});