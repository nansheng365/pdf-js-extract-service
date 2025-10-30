// API 基础 URL - 修改为相对路径，适应统一的服务托管
const API_BASE = '/api';

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileList = document.getElementById('fileList');
const pdfPreview = document.getElementById('pdfPreview');
const parseBtn = document.getElementById('parseBtn');
const parseIntegratedBtn = document.getElementById('parseIntegratedBtn');
const extractInvoiceBtn = document.getElementById('extractInvoiceBtn'); // 新增发票信息提取按钮
const parseResult = document.getElementById('parseResult');
const textContent = document.getElementById('textContent');
const graphicContent = document.getElementById('graphicContent');
const invoiceInfo = document.getElementById('invoiceInfo'); // 发票信息显示区域
const invoiceContent = document.getElementById('invoiceContent'); // 发票信息内容区域
const showTextBorders = document.getElementById('showTextBorders');

// 当前选中的文件路径和最近的解析数据
let currentFilePath = null;
let lastParseData = null;
let lastIntegratedData = null;

// 页面加载时获取 PDF 文件列表
document.addEventListener('DOMContentLoaded', function () {
    loadPDFFiles();
});

// 选择文件按钮点击事件
selectFileBtn.addEventListener('click', function () {
    fileInput.click();
});

// 文件输入变化事件
fileInput.addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
    }
});

// 拖拽上传功能
uploadArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadArea.style.backgroundColor = '#e3f2fd';
});

uploadArea.addEventListener('dragleave', function (e) {
    e.preventDefault();
    uploadArea.style.backgroundColor = '#f8f9fa';
});

uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.style.backgroundColor = '#f8f9fa';

    if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            uploadFile(file);
        } else {
            alert('请选择 PDF 文件');
        }
    }
});

// 显示文本边框复选框变化事件
showTextBorders.addEventListener('change', function () {
    // 如果有最近的解析数据，则重新显示图形内容
    if (lastParseData) {
        displayGraphicContent(lastParseData);
    }
});

// 上传文件
function uploadFile(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('上传失败: ' + data.error);
            } else {
                console.log('上传成功:', data);
                currentFilePath = data.file.path;
                fileName.textContent = file.name;
                fileInfo.style.display = 'block';
                parseBtn.disabled = false;
                parseIntegratedBtn.disabled = false;
                extractInvoiceBtn.disabled = false; // 启用发票信息提取按钮

                // 显示 PDF 预览
                // 确保路径正确
                pdfPreview.src = currentFilePath.startsWith('/') ? currentFilePath : '/' + currentFilePath;

                // 重新加载文件列表
                loadPDFFiles();
            }
        })
        .catch(error => {
            console.error('上传错误:', error);
            alert('上传过程中发生错误');
        });
}

// 加载 PDF 文件列表
function loadPDFFiles() {
    fetch(`${API_BASE}/pdf-files`)
        .then(response => response.json())
        .then(files => {
            fileList.innerHTML = '';

            if (files.length === 0) {
                fileList.innerHTML = '<li>没有找到 PDF 文件</li>';
                return;
            }

            files.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file.name;
                li.addEventListener('click', function () {
                    selectFile(file);
                });
                fileList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('加载文件列表错误:', error);
            fileList.innerHTML = '<li>加载文件列表失败</li>';
        });
}

// 选择文件
function selectFile(file) {
    currentFilePath = file.path;
    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    parseBtn.disabled = false;
    parseIntegratedBtn.disabled = false;
    extractInvoiceBtn.disabled = false; // 启用发票信息提取按钮

    // 显示 PDF 预览
    // 确保路径正确
    pdfPreview.src = file.path.startsWith('/') ? file.path : '/' + file.path;
}

// 解析 PDF 按钮点击事件
parseBtn.addEventListener('click', function () {
    if (!currentFilePath) {
        alert('请先选择一个 PDF 文件');
        return;
    }

    // 显示加载状态
    parseBtn.disabled = true;
    parseBtn.textContent = '解析中...';

    fetch(`${API_BASE}/parse-pdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath: currentFilePath })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('解析失败: ' + data.error);
            } else {
                // 保存解析数据以便重新绘制
                lastParseData = data;
                lastIntegratedData = null; // 清除整合数据
                displayParseResult(data);
            }
        })
        .catch(error => {
            console.error('解析错误:', error);
            alert('解析过程中发生错误');
        })
        .finally(() => {
            // 恢复按钮状态
            parseBtn.disabled = false;
            parseBtn.textContent = '解析 PDF 内容';
        });
});

// 显示整合的文本按钮点击事件
parseIntegratedBtn.addEventListener('click', function () {
    if (!currentFilePath) {
        alert('请先选择一个 PDF 文件');
        return;
    }

    // 显示加载状态
    parseIntegratedBtn.disabled = true;
    parseIntegratedBtn.textContent = '解析中...';

    fetch(`${API_BASE}/parse-pdf-integrated`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath: currentFilePath })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('解析失败: ' + data.error);
            } else {
                // 保存整合数据
                lastIntegratedData = data;
                lastParseData = null; // 清除原始数据
                displayParseResult(data);
            }
        })
        .catch(error => {
            console.error('解析错误:', error);
            alert('解析过程中发生错误');
        })
        .finally(() => {
            // 恢复按钮状态
            parseIntegratedBtn.disabled = false;
            parseIntegratedBtn.textContent = '显示整合的文本';
        });
});

// 发票信息提取按钮点击事件
extractInvoiceBtn.addEventListener('click', function () {
    if (!currentFilePath) {
        alert('请先选择一个 PDF 文件');
        return;
    }

    // 显示加载状态
    extractInvoiceBtn.disabled = true;
    extractInvoiceBtn.textContent = '提取中...';

    fetch(`${API_BASE}/extract-invoice-info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath: currentFilePath })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('提取失败: ' + data.error);
            } else {
                // 显示发票信息
                displayInvoiceInfo(data);
            }
        })
        .catch(error => {
            console.error('提取错误:', error);
            alert('提取过程中发生错误');
        })
        .finally(() => {
            // 恢复按钮状态
            extractInvoiceBtn.disabled = false;
            extractInvoiceBtn.textContent = '提取发票信息';
        });
});

// 显示解析结果
function displayParseResult(data) {
    console.log('解析数据:', data);

    // 显示文本内容（包含增强的属性信息和分组信息）
    let textResult = '';
    data.pages.forEach((page, pageIndex) => {
        textResult += `--- 第 ${pageIndex + 1} 页 ---\n`;

        // 添加调试信息，显示所有文本项的坐标
        textResult += '\n[调试信息 - 所有文本项坐标]\n';
        page.content.forEach((item, index) => {
            textResult += `${index + 1}. "${item.str}" - X: ${item.x.toFixed(2)}, Y: ${item.y.toFixed(2)}, W: ${item.width.toFixed(2)}, H: ${item.height.toFixed(2)}\n`;
        });

        // 按 groupId 分组显示
        const groups = {};
        page.content.forEach(item => {
            const groupId = item.groupId || 'unassigned';
            if (!groups[groupId]) {
                groups[groupId] = [];
            }
            groups[groupId].push(item);
        });

        // 按 groupId 排序显示
        Object.keys(groups).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(groupId => {
            const items = groups[groupId];
            textResult += `\n[文本列 X=${groupId}, 包含 ${items.length} 个文本项]\n`;

            // 按 Y 坐标排序显示
            items.sort((a, b) => a.y - b.y);

            items.forEach((item, index) => {
                textResult += `  ${index + 1}. 文本: "${item.str}"\n`;
                textResult += `     坐标: (x=${item.x.toFixed(2)}, y=${item.y.toFixed(2)})\n`;
                textResult += `     尺寸: (w=${item.width.toFixed(2)}, h=${item.height.toFixed(2)})\n`;
                if (item.fontSize || item.angle !== undefined) {
                    textResult += `     属性: [fontSize: ${item.fontSize ? item.fontSize.toFixed(2) : 'N/A'}, angle: ${item.angle !== undefined ? item.angle.toFixed(2) : '0'}]\n`;
                }
                textResult += '\n';
            });
        });

        textResult += '\n';
    });

    textContent.textContent = textResult;

    // 显示结果区域
    parseResult.style.display = 'block';
    invoiceInfo.style.display = 'none'; // 隐藏发票信息区域

    // 根据数据类型选择显示图形内容的函数
    if (lastIntegratedData) {
        // 如果是整合后的数据，使用新的显示函数
        displayIntegratedGraphicContent(data);
    } else {
        // 否则使用原有的显示函数
        displayGraphicContent(data);
    }

    // 滚动到结果区域
    parseResult.scrollIntoView({ behavior: 'smooth' });
}

// 显示发票信息
function displayInvoiceInfo(data) {
    console.log('发票信息:', data);
    
    // 构造发票信息的HTML内容
    let invoiceResult = '<table border="1" cellpadding="5" cellspacing="0">';
    invoiceResult += '<tr><th>字段</th><th>值</th></tr>';
    invoiceResult += `<tr><td>发票号码</td><td>${data.invoiceNumber || '未找到'}</td></tr>`;
    invoiceResult += `<tr><td>开票日期</td><td>${data.invoiceDate || '未找到'}</td></tr>`;
    invoiceResult += `<tr><td>不含税金额</td><td>${data.amountExcludingTax || '未找到'}</td></tr>`;
    invoiceResult += `<tr><td>税额</td><td>${data.taxAmount || '未找到'}</td></tr>`;
    invoiceResult += `<tr><td>含税金额</td><td>${data.amountIncludingTax || '未找到'}</td></tr>`;
    invoiceResult += '</table>';
    
    invoiceContent.innerHTML = invoiceResult;
    
    // 显示发票信息区域
    invoiceInfo.style.display = 'block';
    parseResult.style.display = 'none'; // 隐藏解析结果区域
    
    // 滚动到发票信息区域
    invoiceInfo.scrollIntoView({ behavior: 'smooth' });
}

// 显示图形内容
function displayGraphicContent(data) {
    graphicContent.innerHTML = '<h4>按坐标显示的图形内容</h4>';

    // 获取是否显示文本边框的选项
    const shouldShowTextBorders = showTextBorders.checked;

    // 创建 canvas 元素用于绘制
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.border = '1px solid #ddd';
    canvas.style.display = 'block';
    canvas.style.marginTop = '15px';

    const ctx = canvas.getContext('2d');

    // 设置字体和样式
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';

    // 绘制第一页的内容作为示例
    if (data.pages.length > 0) {
        const page = data.pages[0];
        const pageInfo = page.pageInfo;

        const parentWidth = graphicContent.clientWidth - 40; // 高精度宽度
        console.log('parentWidth:', parentWidth);
        canvas.width = pageInfo.width;
        canvas.height = pageInfo.height;

        // 计算缩放比例
        const scaleX = parentWidth / canvas.width;
        const scaleY = scaleX;
        canvas.width = pageInfo.width * scaleX;
        canvas.height = pageInfo.height * scaleX;

        // 绘制文本内容
        page.content.forEach(item => {
            // 根据 PDF 坐标系统转换坐标
            const x = item.x * scaleX;
            const y = item.y * scaleY;

            // 使用更准确的字体大小信息
            const fontSize = item.fontSize || item.height || 12;
            ctx.font = `${fontSize}px Arial`;

            // 计算文本框的尺寸
            const boxWidth = item.width ? item.width * scaleX : 0;
            const boxHeight = item.height ? item.height * scaleY : 0;

            // 如果有旋转角度，则进行旋转绘制
            if (item.angle !== undefined && item.angle !== 0) {
                // 保存当前绘图状态
                ctx.save();

                // 平移到文本位置
                ctx.translate(x, y);

                // 旋转画布
                ctx.rotate(-item.angle * Math.PI / 180); // PDF角度是顺时针，而Canvas是逆时针

                // 如果有文本框尺寸信息，则进行缩放处理以填满边框
                if (boxWidth > 0 && boxHeight > 0) {
                    // 计算文本的实际渲染尺寸
                    const textWidth = ctx.measureText(item.str).width;

                    // 计算水平和垂直缩放比例
                    const scaleXRatio = boxWidth / textWidth;
                    const scaleYRatio = boxHeight / fontSize;

                    // 应用缩放
                    ctx.scale(scaleXRatio, scaleYRatio);

                    // 设置文本基线
                    ctx.textBaseline = 'bottom';

                    // 绘制文本（在缩放后的坐标系中）
                    ctx.fillText(item.str, 0, 0);
                } else {
                    // 如果没有文本框尺寸信息，使用原始绘制方式
                    ctx.fillText(item.str, 0, 0);
                }

                // 恢复绘图状态
                ctx.restore();
            } else {
                // 如果没有旋转角度，使用原始绘制方式，但确保文本填满边框
                if (boxWidth > 0 && boxHeight > 0) {
                    // 计算文本的实际渲染尺寸
                    const textWidth = ctx.measureText(item.str).width;

                    // 计算水平和垂直缩放比例
                    const scaleXRatio = boxWidth / textWidth;
                    const scaleYRatio = boxHeight / fontSize;

                    // 保存当前绘图状态
                    ctx.save();

                    // 平移到文本框的左上角位置
                    ctx.translate(x, y - boxHeight);

                    // 应用缩放
                    ctx.scale(scaleXRatio, scaleYRatio);

                    // 设置文本基线
                    ctx.textBaseline = 'top';

                    // 绘制文本（在缩放后的坐标系中）
                    ctx.fillText(item.str, 0, 0);

                    // 恢复绘图状态
                    ctx.restore();
                } else {
                    // 如果没有文本框尺寸信息，使用原始绘制方式
                    ctx.fillText(item.str, x, y);
                }
            }

            // 如果用户选择显示文本边框，则绘制边框
            if (shouldShowTextBorders && item.width && item.height) {
                // 保存当前绘图状态
                ctx.save();

                // 设置边框样式
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;

                // 如果有旋转角度，则进行旋转变换
                if (item.angle !== undefined && item.angle !== 0) {
                    // 平移到文本位置
                    ctx.translate(x, y);

                    // 旋转画布
                    ctx.rotate(-item.angle * Math.PI / 180);

                    // 绘制边框（在旋转坐标系中）
                    ctx.strokeRect(0, -boxHeight, boxWidth, boxHeight);
                } else {
                    // 计算边框位置和尺寸
                    const borderX = item.x * scaleX;
                    // 调整Y坐标，因为PDF的Y轴向上，而Canvas的Y轴向下
                    const borderY = (item.y - item.height) * scaleY;
                    const borderWidth = item.width * scaleX;
                    const borderHeight = item.height * scaleY;

                    // 绘制边框
                    ctx.strokeRect(borderX, borderY, borderWidth, borderHeight);
                }

                // 恢复绘图状态
                ctx.restore();
            }
        });

        // 绘制链接（如果有的话）
        if (page.links && page.links.length > 0) {
            ctx.fillStyle = 'blue';
            page.links.forEach(link => {
                // 简单示例：在左下角显示链接
                ctx.fillText('[链接: ' + link + ']', 10, canvas.height - 20);
            });
        }
    }

    graphicContent.appendChild(canvas);
}

// 显示纵向整合文本的图形内容
function displayVerticalIntegratedText(ctx, item, scaleX, scaleY, shouldShowTextBorders) {
    // 检查是否为纵向整合后的文本（只要grouted属性被定义，不管是true还是false）
    const isVerticalIntegratedText = item.grouted !== undefined;
    
    if (!isVerticalIntegratedText) return false; // 不是纵向整合文本，返回false
    
    // 根据 PDF 坐标系统转换坐标
    const x = item.x * scaleX;
    let y = (item.baseY || item.y) * scaleY; // 使用baseY如果存在，否则使用y

    // 使用更准确的字体大小信息
    const fontSize = item.fontSize || item.height || 12;
    ctx.font = `${fontSize}px Arial`;

    // 计算文本框的尺寸
    const boxWidth = item.width ? item.width * scaleX : 0;
    const boxHeight = item.height ? item.height * scaleY : 0;

    // 保存当前绘图状态
    ctx.save();

    // 平移到文本位置
    ctx.translate(x, y);

    // 旋转画布270度（在原来90度基础上再旋转180度）
    ctx.rotate(-270 * Math.PI / 180); // 逆时针旋转270度

    // 如果有文本框尺寸信息，则进行缩放处理以填满边框
    if (boxWidth > 0 && boxHeight > 0) {
        // 计算文本的实际渲染尺寸
        const textWidth = ctx.measureText(item.str).width;

        // 计算水平和垂直缩放比例
        const scaleXRatio = boxHeight / textWidth; // 交换宽高因为旋转了270度
        const scaleYRatio = boxWidth / fontSize;   // 交换宽高因为旋转了270度

        // 应用缩放
        ctx.scale(scaleXRatio, scaleYRatio);

        // 设置文本基线
        ctx.textBaseline = 'bottom';

        // 绘制文本（在缩放后的坐标系中）
        ctx.fillText(item.str, 0, 0);
    } else {
        // 如果没有文本框尺寸信息，使用原始绘制方式
        ctx.fillText(item.str, 0, 0);
    }

    // 恢复绘图状态
    ctx.restore();

    // 如果用户选择显示文本边框，则绘制边框
    if (shouldShowTextBorders && item.width && item.height) {
        // 保存当前绘图状态
        ctx.save();

        // 设置边框样式
        ctx.strokeStyle = 'blue'; // 纵向整合后的文本用蓝色边框
        ctx.lineWidth = 2; // 边框更粗

        // 平移到文本位置
        ctx.translate(x, y);

        // 旋转画布270度
        ctx.rotate(-270 * Math.PI / 180);

        // 绘制边框（在旋转坐标系中）
        ctx.strokeRect(0, 0, boxHeight, -boxWidth); // 交换宽高因为旋转了270度

        // 恢复绘图状态
        ctx.restore();
    }
    
    return true; // 成功处理了纵向整合文本
}

// 显示横向整合文本的图形内容
function displayHorizontalIntegratedText(ctx, item, scaleX, scaleY, shouldShowTextBorders) {
    // 检查是否为横向整合后的文本
    const isHorizontalIntegratedText = item.rowgrouted === true;
    
    if (!isHorizontalIntegratedText) return false; // 不是横向整合文本，返回false
    
    // 根据 PDF 坐标系统转换坐标
    const x = item.x * scaleX;
    const y = item.y * scaleY;

    // 使用更准确的字体大小信息
    const fontSize = item.fontSize || item.height || 12;
    ctx.font = `${fontSize}px Arial`;

    // 计算文本框的尺寸
    const boxWidth = item.width ? item.width * scaleX : 0;
    const boxHeight = item.height ? item.height * scaleY : 0;

    // 如果有旋转角度，则进行旋转绘制
    if (item.angle !== undefined && item.angle !== 0) {
        // 保存当前绘图状态
        ctx.save();

        // 平移到文本位置
        ctx.translate(x, y);

        // 旋转画布
        ctx.rotate(-item.angle * Math.PI / 180); // PDF角度是顺时针，而Canvas是逆时针

        // 如果有文本框尺寸信息，则进行缩放处理以填满边框
        if (boxWidth > 0 && boxHeight > 0) {
            // 计算文本的实际渲染尺寸
            const textWidth = ctx.measureText(item.str).width;

            // 计算水平和垂直缩放比例
            const scaleXRatio = boxWidth / textWidth;
            const scaleYRatio = boxHeight / fontSize;

            // 应用缩放
            ctx.scale(scaleXRatio, scaleYRatio);

            // 设置文本基线
            ctx.textBaseline = 'bottom';

            // 绘制文本（在缩放后的坐标系中）
            ctx.fillText(item.str, 0, 0);
        } else {
            // 如果没有文本框尺寸信息，使用原始绘制方式
            ctx.fillText(item.str, 0, 0);
        }

        // 恢复绘图状态
        ctx.restore();
    } else {
        // 如果没有旋转角度，使用原始绘制方式，但确保文本填满边框
        if (boxWidth > 0 && boxHeight > 0) {
            // 计算文本的实际渲染尺寸
            const textWidth = ctx.measureText(item.str).width;

            // 计算水平和垂直缩放比例
            const scaleXRatio = boxWidth / textWidth;
            const scaleYRatio = boxHeight / fontSize;

            // 保存当前绘图状态
            ctx.save();

            // 平移到文本框的左上角位置
            ctx.translate(x, y - boxHeight);

            // 应用缩放
            ctx.scale(scaleXRatio, scaleYRatio);

            // 设置文本基线
            ctx.textBaseline = 'top';

            // 绘制文本（在缩放后的坐标系中）
            ctx.fillText(item.str, 0, 0);

            // 恢复绘图状态
            ctx.restore();
        } else {
            // 如果没有文本框尺寸信息，使用原始绘制方式
            ctx.fillText(item.str, x, y);
        }
    }

    // 如果用户选择显示文本边框，则绘制边框
    if (shouldShowTextBorders && item.width && item.height) {
        // 保存当前绘图状态
        ctx.save();

        // 设置边框样式
        ctx.strokeStyle = 'green'; // 横向整合后的文本用棕色边框
        ctx.lineWidth = 2; // 边框更粗

        // 如果有旋转角度，则进行旋转变换
        if (item.angle !== undefined && item.angle !== 0) {
            // 平移到文本位置
            ctx.translate(x, y);

            // 旋转画布
            ctx.rotate(-item.angle * Math.PI / 180);

            // 绘制边框（在旋转坐标系中）
            ctx.strokeRect(0, -boxHeight, boxWidth, boxHeight);
        } else {
            // 计算边框位置和尺寸
            const borderX = item.x * scaleX;
            // 调整Y坐标，因为PDF的Y轴向上，而Canvas的Y轴向下
            const borderY = (item.y - item.height) * scaleY;
            const borderWidth = item.width * scaleX;
            const borderHeight = item.height * scaleY;

            // 绘制边框
            ctx.strokeRect(borderX, borderY, borderWidth, borderHeight);
        }

        // 恢复绘图状态
        ctx.restore();
    }
    
    return true; // 成功处理了横向整合文本
}

// 显示普通文本的图形内容
function displayNormalText(ctx, item, scaleX, scaleY, shouldShowTextBorders) {
    // 检查是否为普通文本（非整合文本）
    const isVerticalIntegratedText = item.grouted !== undefined;
    const isHorizontalIntegratedText = item.rowgrouted === true;
    
    if (isVerticalIntegratedText || isHorizontalIntegratedText) return false; // 是整合文本，返回false
    
    // 根据 PDF 坐标系统转换坐标
    const x = item.x * scaleX;
    const y = item.y * scaleY;

    // 使用更准确的字体大小信息
    const fontSize = item.fontSize || item.height || 12;
    ctx.font = `${fontSize}px Arial`;

    // 计算文本框的尺寸
    const boxWidth = item.width ? item.width * scaleX : 0;
    const boxHeight = item.height ? item.height * scaleY : 0;

    // 如果有旋转角度，则进行旋转绘制
    if (item.angle !== undefined && item.angle !== 0) {
        // 保存当前绘图状态
        ctx.save();

        // 平移到文本位置
        ctx.translate(x, y);

        // 旋转画布
        ctx.rotate(-item.angle * Math.PI / 180); // PDF角度是顺时针，而Canvas是逆时针

        // 如果有文本框尺寸信息，则进行缩放处理以填满边框
        if (boxWidth > 0 && boxHeight > 0) {
            // 计算文本的实际渲染尺寸
            const textWidth = ctx.measureText(item.str).width;

            // 计算水平和垂直缩放比例
            const scaleXRatio = boxWidth / textWidth;
            const scaleYRatio = boxHeight / fontSize;

            // 应用缩放
            ctx.scale(scaleXRatio, scaleYRatio);

            // 设置文本基线
            ctx.textBaseline = 'bottom';

            // 绘制文本（在缩放后的坐标系中）
            ctx.fillText(item.str, 0, 0);
        } else {
            // 如果没有文本框尺寸信息，使用原始绘制方式
            ctx.fillText(item.str, 0, 0);
        }

        // 恢复绘图状态
        ctx.restore();
    } else {
        // 如果没有旋转角度，使用原始绘制方式，但确保文本填满边框
        if (boxWidth > 0 && boxHeight > 0) {
            // 计算文本的实际渲染尺寸
            const textWidth = ctx.measureText(item.str).width;

            // 计算水平和垂直缩放比例
            const scaleXRatio = boxWidth / textWidth;
            const scaleYRatio = boxHeight / fontSize;

            // 保存当前绘图状态
            ctx.save();

            // 平移到文本框的左上角位置
            ctx.translate(x, y - boxHeight);

            // 应用缩放
            ctx.scale(scaleXRatio, scaleYRatio);

            // 设置文本基线
            ctx.textBaseline = 'top';

            // 绘制文本（在缩放后的坐标系中）
            ctx.fillText(item.str, 0, 0);

            // 恢复绘图状态
            ctx.restore();
        } else {
            // 如果没有文本框尺寸信息，使用原始绘制方式
            ctx.fillText(item.str, x, y);
        }
    }

    // 如果用户选择显示文本边框，则绘制边框
    if (shouldShowTextBorders && item.width && item.height) {
        // 保存当前绘图状态
        ctx.save();

        // 设置边框样式
        ctx.strokeStyle = 'red'; // 普通文本用红色边框
        ctx.lineWidth = 1; // 边框较细

        // 如果有旋转角度，则进行旋转变换
        if (item.angle !== undefined && item.angle !== 0) {
            // 平移到文本位置
            ctx.translate(x, y);

            // 旋转画布
            ctx.rotate(-item.angle * Math.PI / 180);

            // 绘制边框（在旋转坐标系中）
            ctx.strokeRect(0, -boxHeight, boxWidth, boxHeight);
        } else {
            // 计算边框位置和尺寸
            const borderX = item.x * scaleX;
            // 调整Y坐标，因为PDF的Y轴向上，而Canvas的Y轴向下
            const borderY = (item.y - item.height) * scaleY;
            const borderWidth = item.width * scaleX;
            const borderHeight = item.height * scaleY;

            // 绘制边框
            ctx.strokeRect(borderX, borderY, borderWidth, borderHeight);
        }

        // 恢复绘图状态
        ctx.restore();
    }
    
    return true; // 成功处理了普通文本
}

// 显示整合文本的图形内容（新的函数，不破坏原有的显示函数）
function displayIntegratedGraphicContent(data) {
    graphicContent.innerHTML = '<h4>整合后的图形内容</h4>';

    // 获取是否显示文本边框的选项
    const shouldShowTextBorders = showTextBorders.checked;

    // 创建 canvas 元素用于绘制
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.border = '1px solid #ddd';
    canvas.style.display = 'block';
    canvas.style.marginTop = '15px';

    const ctx = canvas.getContext('2d');

    // 设置字体和样式
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';

    // 绘制第一页的内容作为示例
    if (data.pages.length > 0) {
        const page = data.pages[0];
        const pageInfo = page.pageInfo;

        const parentWidth = graphicContent.clientWidth - 40; // 高精度宽度
        console.log('parentWidth:', parentWidth);
        canvas.width = pageInfo.width;
        canvas.height = pageInfo.height;

        // 计算缩放比例
        const scaleX = parentWidth / canvas.width;
        const scaleY = scaleX;
        canvas.width = pageInfo.width * scaleX;
        canvas.height = pageInfo.height * scaleX;

        // 绘制文本内容（整合后的文本）
        page.content.forEach(item => {
            // 尝试处理纵向整合文本
            if (displayVerticalIntegratedText(ctx, item, scaleX, scaleY, shouldShowTextBorders)) {
                return; // 已处理，继续下一个
            }
            
            // 尝试处理横向整合文本
            if (displayHorizontalIntegratedText(ctx, item, scaleX, scaleY, shouldShowTextBorders)) {
                return; // 已处理，继续下一个
            }
            
            // 处理普通文本
            displayNormalText(ctx, item, scaleX, scaleY, shouldShowTextBorders);
        });

        // 绘制链接（如果有的话）
        if (page.links && page.links.length > 0) {
            ctx.fillStyle = 'blue';
            page.links.forEach(link => {
                // 简单示例：在左下角显示链接
                ctx.fillText('[链接: ' + link + ']', 10, canvas.height - 20);
            });
        }
    }

    graphicContent.appendChild(canvas);
}
