/**
 * 文本整合模块
 * 将PDF提取的文本数据进行智能整合，提高文本的可读性
 */

/**
 * 第一个函数：处理同一行文本框的水平合并（基于X坐标）
 * 合并条件：前一个文本框右侧X与后一个文本框左侧X的距离相近或有重叠
 * @param {Object} data - PDF数据对象
 * @returns {Object} 整合后的数据
 */
function integrateHorizontalTextDataFirstPass(data) {
  // 深拷贝数据以避免修改原始数据
  const groupedData = JSON.parse(JSON.stringify(data));

  // 处理每一页的数据
  groupedData.pages.forEach(page => {
    // 先过滤掉trim后是空的文本
    page.content = page.content.filter(item => {
      return item.str && item.str.trim() !== '';
    });

    // 过滤掉已经纵向合并过的文本（只要有grouted属性的文本）
    const nonVerticalItems = page.content.filter(item => {
      // 过滤掉有grouted属性的文本
      return item.grouted === undefined;
    });

    // 按照 y 坐标分组文本项（将同一行的文本归为一组）
    const groupedByTextRow = {};

    // 遍历所有未纵向合并的文本项
    nonVerticalItems.forEach(item => {
      // 使用 y 坐标作为分组键，允许稍大的差异（例如 5 个单位以内）
      // 这样可以将同一行上的文本归为一组
      const yKey = Math.round(item.y / 5) * 5;  // 以5为单位进行分组

      if (!groupedByTextRow[yKey]) {
        groupedByTextRow[yKey] = [];
      }
      groupedByTextRow[yKey].push(item);
    });

    // 为每个分组添加分组信息，并整合符合条件的文本
    Object.keys(groupedByTextRow).forEach(yKey => {
      let itemsInRow = groupedByTextRow[yKey];

      // 不再过滤有旋转角度的文本项，保留它们供前端Canvas正确渲染
      // 只对无旋转角度的文本进行合并处理

      // 按照 x 坐标排序，确保从左到右的顺序
      itemsInRow.sort((a, b) => a.x - b.x);

      // 只合并间距与字符高度相等的文本框（仅对无旋转角度的文本）
      if (itemsInRow.length > 1) {
        const mergedItems = [];
        let i = 0;

        while (i < itemsInRow.length) {
          let currentItem = itemsInRow[i];

          // 查找可以合并的连续项
          let j = i + 1;
          while (j < itemsInRow.length) {
            const nextItem = itemsInRow[j];
            // 只对无旋转角度的文本进行合并
            if (!(currentItem.angle !== undefined && Math.abs(currentItem.angle) > 0.1) &&
              !(nextItem.angle !== undefined && Math.abs(nextItem.angle) > 0.1)) {
              // 计算前面文本框的右下角X坐标与后面文本框左下角X坐标的距离
              const frontRightX = currentItem.x + currentItem.width;
              const backLeftX = nextItem.x;
              const distance = backLeftX - frontRightX;
              //       console.log('distance:', distance);
              // 获取前面文本框的字符高度作为参考标准
              const charHeight = currentItem.height || 1;
              //      console.log('charHeight:', charHeight);
              // 检查两个文本的字符高度差异
              const heightDifference = Math.abs(currentItem.height - nextItem.height);
              const maxHeight = Math.max(currentItem.height, nextItem.height);

              // 如果距离与字符高度相近，且两个文本的字符高度相差不到一半，则合并（允许20%的误差）
              //    if (Math.abs(distance - charHeight) < charHeight * 1.2 && 
              if (distance < 2 &&

                heightDifference < maxHeight * 0.5) {
                // 合并文本
                currentItem = {
                  ...currentItem,
                  str: currentItem.str + nextItem.str,
                  width: (nextItem.x + nextItem.width) - currentItem.x,
                  rowgrouted: true // 添加一个属性来标识是否为横向整合
                };
                j++;
              } else {
                // 距离不符合条件或高度差异过大，停止合并
                break;
              }
            } else {
              // 有旋转角度的文本不参与合并
              break;
            }
          }

          mergedItems.push(currentItem);
          i = j;
        }

        itemsInRow = mergedItems;
      }

      // 更新原始数据中的项
      groupedByTextRow[yKey] = itemsInRow;
    });

    // 将分组后的项更新回页面内容
    const integratedItems = [];
    Object.keys(groupedByTextRow).forEach(yKey => {
      const items = groupedByTextRow[yKey];
      integratedItems.push(...items);
    });

    // 合并未处理的文本项和横向整合后的项
    page.content = [...page.content.filter(item => item.grouted !== undefined), ...integratedItems];
  });

  return groupedData;
}

/**
 * 第二个函数：处理同一列文本框的垂直合并（基于Y坐标）
 * 合并条件：前一个文本框底部Y与后一个文本框顶部Y的距离相近或有重叠
 * @param {Object} data - PDF数据对象
 * @returns {Object} 整合后的数据
 */
function integrateVerticalTextDataFirstPass(data) {
  // 深拷贝数据以避免修改原始数据
  const groupedData = JSON.parse(JSON.stringify(data));

  // 处理每一页的数据
  groupedData.pages.forEach(page => {
    // 按照 x 坐标分组文本项（将同一列的文本归为一组）
    const groupedByTextColumn = {};

    // 只处理单字符文本
    const singleCharItems = page.content.filter(item => {
      // 判断是否为单字符（包括中文字符、英文字母、数字等）
      return item.str && item.str.length === 1 && item.str.trim() !== '';
    });

    singleCharItems.forEach(item => {
      // 使用 x 坐标作为分组键，允许稍大的差异（例如 5 个单位以内）
      // 这样可以将同一列（垂直线）上的文本归为一组
      const xKey = Math.round(item.x / 2) * 2;  // 以5为单位进行分组

      if (!groupedByTextColumn[xKey]) {
        groupedByTextColumn[xKey] = [];
      }
      groupedByTextColumn[xKey].push(item);
    });

    // 为每个分组添加分组信息，并整合符合条件的文本
    Object.keys(groupedByTextColumn).forEach(xKey => {
      let itemsInColumn = groupedByTextColumn[xKey];

      // 按照 y 坐标排序，确保从下到上的顺序（PDF坐标系）
      itemsInColumn.sort((a, b) => a.y - b.y);

      // 计算平均字符高度作为基准
      let totalHeight = 0;
      itemsInColumn.forEach(item => {
        totalHeight += item.height;
      });

      const avgCharHeight = itemsInColumn.length > 0 ? totalHeight / itemsInColumn.length : 0;

      // 检查是否需要整合文本
      if (itemsInColumn.length > 1 && avgCharHeight > 0) {
        // 检查间距是否基本为一个字符大小
        const integratedItems = [];
        let i = 0;

        while (i < itemsInColumn.length) {
          let currentItem = itemsInColumn[i];

          // 查找连续的可以整合的项
          let j = i + 1;
          while (j < itemsInColumn.length) {
            const nextItem = itemsInColumn[j];
            // 计算间距（下一个字符的底部到当前字符的顶部的距离）
            const spacing = (nextItem.y - nextItem.height) - currentItem.y;
            //    console.log('spacing:', spacing);
            // 如果间距在合理范围内，则整合
            //         if (Math.abs(spacing) <= nextItem.height * 1.2) {
            if (spacing < 2) {

              // 创建新的整合项
              // 如果这是第一次合并，记录第一个字符的Y坐标作为baseY
              const baseY = currentItem.baseY !== undefined ? currentItem.baseY : currentItem.y - nextItem.width;
              currentItem = {
                ...currentItem,
                str: currentItem.str + nextItem.str,
                y: nextItem.y,
                baseY: baseY, // 保存第一个字符的Y坐标
                height: (nextItem.y) - baseY, // 高度从第一个字符到最后一个字符
                // 更新x坐标为第一个字的位置，宽度为第一个字到最后一个字的距离加上最后一个字的宽度
                width: (nextItem.x + nextItem.width) - currentItem.x,
                grouted: true // 添加一个属性来标识是否被整合
              };
              j++;
            } else {
              break;
            }
          }

          // 添加整合后的项
          integratedItems.push(currentItem);
          i = j;
        }

        // 更新itemsInColumn为整合后的结果
        itemsInColumn = integratedItems;
      }

      // 更新原始数据中的项
      groupedByTextColumn[xKey] = itemsInColumn;

      // 为每个项添加分组标识
      itemsInColumn.forEach((item, index) => {
        item.groupId = xKey;  // 列号（X坐标）
        item.groupIndex = index;  // 在该列中的序号
      });
    });

    // 将分组后的项更新回页面内容
    // 先移除原有的单字符项
    const nonSingleCharItems = page.content.filter(item => !(item.str && item.str.length === 1));

    // 再添加分组后的项
    const integratedItems = [];
    Object.keys(groupedByTextColumn).forEach(xKey => {
      const items = groupedByTextColumn[xKey];
      integratedItems.push(...items);
    });

    // 合并非单字符项和整合后的项
    page.content = [...nonSingleCharItems, ...integratedItems];
  });

  return groupedData;
}

/**
 * 第三个函数：再次处理同一列文本框的垂直合并（基于Y坐标）
 * @param {Object} data - PDF数据对象
 * @returns {Object} 整合后的数据
 */
function integrateVerticalTextDataSecondPass(data) {
  // 深拷贝数据以避免修改原始数据
  const groupedData = JSON.parse(JSON.stringify(data));

  // 处理每一页的数据
  groupedData.pages.forEach(page => {
    // 按照 x 坐标分组文本项（将同一列的文本归为一组）
    const groupedByTextColumn = {};

    // 只处理单字符文本
    const singleCharItems = page.content.filter(item => {
      // 判断是否为单字符（包括中文字符、英文字母、数字等）
      return item.str && item.str.length === 1 && item.str.trim() !== '';
    });

    singleCharItems.forEach(item => {
      // 使用 x 坐标作为分组键，允许稍大的差异（例如 5 个单位以内）
      // 这样可以将同一列（垂直线）上的文本归为一组
      const xKey = Math.round(item.x / 5) * 5;  // 以5为单位进行分组

      if (!groupedByTextColumn[xKey]) {
        groupedByTextColumn[xKey] = [];
      }
      groupedByTextColumn[xKey].push(item);
    });

    // 为每个分组添加分组信息，并整合符合条件的文本
    Object.keys(groupedByTextColumn).forEach(xKey => {
      let itemsInColumn = groupedByTextColumn[xKey];

      // 按照 y 坐标排序，确保从下到上的顺序（PDF坐标系）
      itemsInColumn.sort((a, b) => a.y - b.y);

      // 计算平均字符高度作为基准
      let totalHeight = 0;
      itemsInColumn.forEach(item => {
        totalHeight += item.height;
      });

      const avgCharHeight = itemsInColumn.length > 0 ? totalHeight / itemsInColumn.length : 0;

      // 检查是否需要整合文本
      if (itemsInColumn.length > 1 && avgCharHeight > 0) {
        // 检查间距是否基本为一个字符大小
        const integratedItems = [];
        let i = 0;

        while (i < itemsInColumn.length) {
          let currentItem = itemsInColumn[i];

          // 查找连续的可以整合的项
          let j = i + 1;
          while (j < itemsInColumn.length) {
            const nextItem = itemsInColumn[j];
            // 计算间距（下一个字符的底部到当前字符的顶部的距离）
            const spacing = (nextItem.y - nextItem.height) - currentItem.y;

            // 如果间距在合理范围内，则整合
            if (Math.abs(spacing) <= nextItem.height * 1.2) {
              // 创建新的整合项
              // 如果这是第一次合并，记录第一个字符的Y坐标作为baseY
              const baseY = currentItem.baseY !== undefined ? currentItem.baseY : currentItem.y - nextItem.width;
              currentItem = {
                ...currentItem,
                str: currentItem.str + nextItem.str,
                y: nextItem.y,
                baseY: baseY, // 保存第一个字符的Y坐标
                height: (nextItem.y) - baseY, // 高度从第一个字符到最后一个字符
                // 更新x坐标为第一个字的位置，宽度为第一个字到最后一个字的距离加上最后一个字的宽度
                width: (nextItem.x + nextItem.width) - currentItem.x,
                grouted: true // 添加一个属性来标识是否被整合
              };
              j++;
            } else {
              break;
            }
          }

          // 添加整合后的项
          integratedItems.push(currentItem);
          i = j;
        }

        // 更新itemsInColumn为整合后的结果
        itemsInColumn = integratedItems;
      }

      // 更新原始数据中的项
      groupedByTextColumn[xKey] = itemsInColumn;

      // 为每个项添加分组标识
      itemsInColumn.forEach((item, index) => {
        item.groupId = xKey;  // 列号（X坐标）
        item.groupIndex = index;  // 在该列中的序号
      });
    });

    // 将分组后的项更新回页面内容
    // 先移除原有的单字符项
    const nonSingleCharItems = page.content.filter(item => !(item.str && item.str.length === 1));

    // 再添加分组后的项
    const integratedItems = [];
    Object.keys(groupedByTextColumn).forEach(xKey => {
      const items = groupedByTextColumn[xKey];
      integratedItems.push(...items);
    });

    // 合并非单字符项和整合后的项
    page.content = [...nonSingleCharItems, ...integratedItems];
  });

  return groupedData;
}

/**
 * 第四个函数：再次处理同一行文本框的水平合并（基于X坐标）
 * @param {Object} data - PDF数据对象
 * @returns {Object} 整合后的数据
 */
function integrateHorizontalTextDataSecondPass(data) {
  // 深拷贝数据以避免修改原始数据
  const groupedData = JSON.parse(JSON.stringify(data));

  // 处理每一页的数据
  groupedData.pages.forEach(page => {
    // 先过滤掉trim后是空的文本
    page.content = page.content.filter(item => {
      return item.str && item.str.trim() !== '';
    });

    // 过滤掉已经纵向合并过的文本（只要有grouted属性的文本）
    const nonVerticalItems = page.content.filter(item => {
      // 过滤掉有grouted属性的文本
      return item.grouted === undefined;
    });

    // 按照 y 坐标分组文本项（将同一行的文本归为一组）
    const groupedByTextRow = {};

    // 遍历所有未纵向合并的文本项
    nonVerticalItems.forEach(item => {
      // 使用 y 坐标作为分组键，允许稍大的差异（例如 5 个单位以内）
      // 这样可以将同一行上的文本归为一组
      const yKey = Math.round(item.y / 5) * 5;  // 以5为单位进行分组

      if (!groupedByTextRow[yKey]) {
        groupedByTextRow[yKey] = [];
      }
      groupedByTextRow[yKey].push(item);
    });

    // 为每个分组添加分组信息，并整合符合条件的文本
    Object.keys(groupedByTextRow).forEach(yKey => {
      let itemsInRow = groupedByTextRow[yKey];

      // 不再过滤有旋转角度的文本项，保留它们供前端Canvas正确渲染
      // 只对无旋转角度的文本进行合并处理

      // 按照 x 坐标排序，确保从左到右的顺序
      itemsInRow.sort((a, b) => a.x - b.x);

      // 只合并间距与字符高度相等的文本框（仅对无旋转角度的文本）
      if (itemsInRow.length > 1) {
        const mergedItems = [];
        let i = 0;

        while (i < itemsInRow.length) {
          let currentItem = itemsInRow[i];

          // 查找可以合并的连续项
          let j = i + 1;
          while (j < itemsInRow.length) {
            const nextItem = itemsInRow[j];
            // 只对无旋转角度的文本进行合并
            if (!(currentItem.angle !== undefined && Math.abs(currentItem.angle) > 0.1) &&
              !(nextItem.angle !== undefined && Math.abs(nextItem.angle) > 0.1)) {
              // 计算前面文本框的右下角X坐标与后面文本框左下角X坐标的距离
              const frontRightX = currentItem.x + currentItem.width;
              const backLeftX = nextItem.x;
              const distance = Math.abs(backLeftX - frontRightX);

              // 获取前面文本框的字符高度作为参考标准
              const charHeight = currentItem.height || 1;

              // 检查两个文本的字符高度差异
              const heightDifference = Math.abs(currentItem.height - nextItem.height);
              const maxHeight = Math.max(currentItem.height, nextItem.height);

              // 如果距离与字符高度相近，且两个文本的字符高度相差不到一半，则合并（允许20%的误差）
              // 并且两个文本都是单字符
              const areBothSingleChars = currentItem.str.length === 1 && nextItem.str.length === 1;
              if (areBothSingleChars &&
                Math.abs(distance - charHeight) < charHeight * 1.2 &&
                heightDifference < maxHeight * 0.5) {

                // 合并文本
                currentItem = {
                  ...currentItem,
                  str: currentItem.str + nextItem.str,
                  width: (nextItem.x + nextItem.width) - currentItem.x,
                  rowgrouted: true // 添加一个属性来标识是否为横向整合
                };
                j++;
              } else {
                // 距离不符合条件或高度差异过大，停止合并
                break;
              }
            } else {
              // 有旋转角度的文本不参与合并
              break;
            }
          }

          mergedItems.push(currentItem);
          i = j;
        }

        itemsInRow = mergedItems;
      }

      // 更新原始数据中的项
      groupedByTextRow[yKey] = itemsInRow;
    });

    // 将分组后的项更新回页面内容
    const integratedItems = [];
    Object.keys(groupedByTextRow).forEach(yKey => {
      const items = groupedByTextRow[yKey];
      integratedItems.push(...items);
    });

    // 合并未处理的文本项和横向整合后的项
    page.content = [...page.content.filter(item => item.grouted !== undefined), ...integratedItems];
  });

  return groupedData;
}
/**
 * 第五个函数：再次处理同一行文本框的水平合并（基于X坐标）
 * @param {Object} data - PDF数据对象
 * @returns {Object} 整合后的数据
 */
function integrateHorizontalTextDataThreePass(data) {
  // 深拷贝数据以避免修改原始数据
  const groupedData = JSON.parse(JSON.stringify(data));

  // 处理每一页的数据
  groupedData.pages.forEach(page => {
    // 先过滤掉trim后是空的文本
    page.content = page.content.filter(item => {
      return item.str && item.str.trim() !== '';
    });

    // 过滤掉已经纵向合并过的文本（只要有grouted属性的文本）
    const nonVerticalItems = page.content.filter(item => {
      // 过滤掉有grouted属性的文本
      return item.grouted === undefined;
    });

    // 按照 y 坐标分组文本项（将同一行的文本归为一组）
    const groupedByTextRow = {};

    // 遍历所有未纵向合并的文本项
    nonVerticalItems.forEach(item => {
      // 使用 y 坐标作为分组键，允许稍大的差异（例如 5 个单位以内）
      // 这样可以将同一行上的文本归为一组
      const yKey = Math.round(item.y / 2.5) * 2.5;  // 以5为单位进行分组

      if (!groupedByTextRow[yKey]) {
        groupedByTextRow[yKey] = [];
      }
      groupedByTextRow[yKey].push(item);
    });

    // 为每个分组添加分组信息，并整合符合条件的文本
    Object.keys(groupedByTextRow).forEach(yKey => {
      let itemsInRow = groupedByTextRow[yKey];

      // 不再过滤有旋转角度的文本项，保留它们供前端Canvas正确渲染
      // 只对无旋转角度的文本进行合并处理

      // 按照 x 坐标排序，确保从左到右的顺序
      itemsInRow.sort((a, b) => a.x - b.x);

      // 只合并间距与字符高度相等的文本框（仅对无旋转角度的文本）
      if (itemsInRow.length > 1) {
        const mergedItems = [];
        let i = 0;

        while (i < itemsInRow.length) {
          let currentItem = itemsInRow[i];

          // 查找可以合并的连续项
          let j = i + 1;
          while (j < itemsInRow.length) {
            const nextItem = itemsInRow[j];
            // 只对无旋转角度的文本进行合并
            if (!(currentItem.angle !== undefined && Math.abs(currentItem.angle) > 0.1) &&
              !(nextItem.angle !== undefined && Math.abs(nextItem.angle) > 0.1)) {
              // 计算前面文本框的右下角X坐标与后面文本框左下角X坐标的距离
              const frontRightX = currentItem.x + currentItem.width;
              const backLeftX = nextItem.x;
              const distance = Math.abs(backLeftX - frontRightX);

              // 获取前面文本框的字符高度作为参考标准
              const charHeight = currentItem.height || 1;

              // 检查两个文本的字符高度差异
              const heightDifference = Math.abs(currentItem.height - nextItem.height);
              const maxHeight = Math.max(currentItem.height, nextItem.height);

              // 如果距离与字符高度相近，且两个文本的字符高度相差不到一半，则合并（允许20%的误差）
              if (Math.abs(distance - charHeight) < charHeight * 0.2 &&
                heightDifference < maxHeight * 0.5) {

                // 合并文本
                currentItem = {
                  ...currentItem,
                  str: currentItem.str + nextItem.str,
                  width: (nextItem.x + nextItem.width) - currentItem.x,
                  rowgrouted: true // 添加一个属性来标识是否为横向整合
                };
                j++;
              } else {
                // 距离不符合条件或高度差异过大，停止合并
                break;
              }
            } else {
              // 有旋转角度的文本不参与合并
              break;
            }
          }

          mergedItems.push(currentItem);
          i = j;
        }

        itemsInRow = mergedItems;
      }

      // 更新原始数据中的项
      groupedByTextRow[yKey] = itemsInRow;
    });

    // 将分组后的项更新回页面内容
    const integratedItems = [];
    Object.keys(groupedByTextRow).forEach(yKey => {
      const items = groupedByTextRow[yKey];
      integratedItems.push(...items);
    });

    // 合并未处理的文本项和横向整合后的项
    page.content = [...page.content.filter(item => item.grouted !== undefined), ...integratedItems];
  });

  return groupedData;
}
/**
 * 依次执行四个整合函数
 * @param {Object} data - PDF数据对象
 * @returns {Object} 整合后的数据
 */
function integrateTextDataInSequence(data) {
  let result = data;

  // 第一个函数：处理同一行文本框的水平合并
  result = integrateHorizontalTextDataFirstPass(result);

  // 第二个函数：处理同一列文本框的垂直合并
  result = integrateVerticalTextDataFirstPass(result);

  // 第三个函数：再次处理同一列文本框的垂直合并
  result = integrateVerticalTextDataSecondPass(result);

  // 第四个函数：再次处理同一行文本框的水平合并
  result = integrateHorizontalTextDataSecondPass(result);

  // 第五个函数：再次处理同一行文本框的水平合并
  result = integrateHorizontalTextDataThreePass(result);


  return result;
}

/**
 * 对同一行文本进行合并，生成两种合并结果：
 * 1. 直接拼接
 * 2. 用分号分割
 * @param {Object} data - PDF数据对象
 * @returns {Object} 处理后的数据，包含 directConcat 和 semicolonSeparated 两种合并结果
 */
function mergeTextInSameLine(data) {
  // 深拷贝数据以避免修改原始数据
  const mergedData = JSON.parse(JSON.stringify(data));

  // 处理每一页的数据
  mergedData.pages.forEach(page => {
    // 按照 y 坐标分组文本项（将同一行的文本归为一组）
    const groupedByTextRow = {};

    // 遍历所有文本项
    page.content.forEach(item => {
      // 使用 y 坐标作为分组键，允许稍大的差异（例如 5 个单位以内）
      const yKey = Math.round(item.y / 8) * 8;

      if (!groupedByTextRow[yKey]) {
        groupedByTextRow[yKey] = [];
      }
      groupedByTextRow[yKey].push(item);
    });

    // 为每个分组添加合并信息
    Object.keys(groupedByTextRow).forEach(yKey => {
      const itemsInRow = groupedByTextRow[yKey];

      // 按照 x 坐标排序，确保从左到右的顺序
      itemsInRow.sort((a, b) => a.x - b.x);

      // 生成两种合并结果
      if (itemsInRow.length > 1) {
        // 直接拼接
        const directConcatStr = itemsInRow.map(item => item.str).join('');

        // 用分号分割
        const semicolonSeparatedStr = itemsInRow.map(item => item.str).join(';');

        // 将合并结果添加到第一个文本项中
        itemsInRow[0].directConcat = directConcatStr;
        itemsInRow[0].semicolonSeparated = semicolonSeparatedStr;
      } else if (itemsInRow.length === 1) {
        // 只有一个文本项的情况
        itemsInRow[0].directConcat = itemsInRow[0].str;
        itemsInRow[0].semicolonSeparated = itemsInRow[0].str;
      }
    });
  });
  // console.log('mergeTextInSameLine:', mergedData.pages[0].content);
  return mergedData;
}

/**
 * 从合并后的文本中提取发票信息
 * @param {Object} data - 包含合并文本的PDF数据对象
 * @param {Object} invoiceFields - 发票字段配置对象
 * @returns {Object} 提取的发票信息
 */
function extractInvoiceInfo(data) {
  // 初始化发票信息对象
  const invoiceInfo = {
    invoiceNumber: '',     // 发票号码
    invoiceDate: '',       // 开票日期
    amountExcludingTax: '', // 不含税金额
    taxAmount: '',         // 税额
    amountIncludingTax: ''  // 含税金额
  };
  //console.log('invoiceFields:', invoiceFields);
  // 处理每一页的数据
  data.pages.forEach(page => {
    // 遍历所有文本项，查找包含发票信息的文本
    page.content.forEach(item => {
      // 检查是否有 directConcat 字段
      if (item.directConcat) {
        console.log('item.directConcat:', item.directConcat);
        // 提取发票号码（通常为数字，可能包含字母）
        if (!invoiceInfo.invoiceNumber) {
          const invoiceNumberMatch = item.directConcat.match(/(?:发\s*票\s*号\s*码|发\s*票\s*号|票\s*号)\s*[:：]?\s*([A-Za-z0-9]+)/);
          if (invoiceNumberMatch && invoiceNumberMatch[1]) {
            invoiceInfo.invoiceNumber = invoiceNumberMatch[1];
          }
        }

        // 提取开票日期（通常为 YYYY-MM-DD 或 YYYY/MM/DD 格式）
        if (!invoiceInfo.invoiceDate) {
          const dateMatch = item.directConcat.match(/(?:开\s*票\s*日\s*期|开\s*票\s*时\s*间|日\s*期)\s*[:：]?\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
          if (dateMatch && dateMatch[1]) {
            invoiceInfo.invoiceDate = dateMatch[1].replace(/\//g, '-'); // 统一使用横线分隔符
          }
        }

        // 提取不含税金额（通常为数字，可能包含小数点）
        if (!invoiceInfo.amountExcludingTax) {
          const amountExcludingTaxMatch = item.directConcat.match(/(?:不含税金额|不含税价|金额)[:：]?\s*[￥$]?\s*(\d+(?:\.\d{2})?)/);
          if (amountExcludingTaxMatch && amountExcludingTaxMatch[1]) {
            invoiceInfo.amountExcludingTax = amountExcludingTaxMatch[1];
          }
        }

        // 提取税额（通常为数字，可能包含小数点）
        if (!invoiceInfo.taxAmount) {
          const taxAmountMatch = item.directConcat.match(/(?:税额|增值税)[:：]?\s*[￥$]?\s*(\d+(?:\.\d{2})?)/);
          if (taxAmountMatch && taxAmountMatch[1]) {
            invoiceInfo.taxAmount = taxAmountMatch[1];
          }
        }

        // 补充处理“合计¥不含税金额¥税额”格式（合计前无字符，后接两个¥金额）
        if ((!invoiceInfo.amountExcludingTax || !invoiceInfo.taxAmount) && item.directConcat) {
          // 正则匹配：开头为“合计”，后接两个带¥的金额（保留两位小数）
          const totalMatch = item.directConcat.match(/^合计¥(\d+(?:\.\d{2})?)¥(\d+(?:\.\d{2})?)$/);
          if (totalMatch) {
            // 第一个¥后为不含税金额（若未提取则赋值）
            if (!invoiceInfo.amountExcludingTax) {
              invoiceInfo.amountExcludingTax = totalMatch[1];
            }
            // 第二个¥后为税额（若未提取则赋值）
            if (!invoiceInfo.taxAmount) {
              invoiceInfo.taxAmount = totalMatch[2];
            }
          }
        }

        // 提取含税金额（通常为数字，可能包含小数点）
        if (!invoiceInfo.amountIncludingTax) {
          const amountIncludingTaxMatch = item.directConcat.match(/(?:含\s*税\s*金\s*额|价\s*税\s*合\s*计).*?[￥$]?\s*(\d+(?:\.\d{2})?)/);
          if (amountIncludingTaxMatch && amountIncludingTaxMatch[1]) {
            invoiceInfo.amountIncludingTax = amountIncludingTaxMatch[1];
          }
        }
      }
    });
  });

  return invoiceInfo;
}

module.exports = {
  integrateHorizontalTextDataFirstPass,
  integrateVerticalTextDataFirstPass,
  integrateVerticalTextDataSecondPass,
  integrateHorizontalTextDataSecondPass,
  integrateTextDataInSequence,
  integrateHorizontalTextDataThreePass,
  mergeTextInSameLine,
  extractInvoiceInfo
};