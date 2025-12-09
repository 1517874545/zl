// 将学校课表 Excel 转为小程序可导入的 JSON
// 用法（在项目根目录执行）：
//   npm install xlsx --no-save
//   node scripts/convert-schedule-xlsx.js "吕楠(2025-2026-1)课表.xlsx" > schedule.json
//
// 生成的 schedule.json 可直接粘贴到小程序「课程表」→ 添加 → 导入课表。

const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')

const [, , xlsxPathArg] = process.argv
if (!xlsxPathArg) {
  console.error('用法: node scripts/convert-schedule-xlsx.js <xlsx文件>')
  process.exit(1)
}

const xlsxPath = path.resolve(xlsxPathArg)
const wb = xlsx.readFile(xlsxPath)
const ws = wb.Sheets[wb.SheetNames[0]]
const range = xlsx.utils.decode_range(ws['!ref'])

// 星期映射
const WEEK_MAP = {
  '星期一': 1,
  '星期二': 2,
  '星期三': 3,
  '星期四': 4,
  '星期五': 5,
  '星期六': 6,
  '星期日': 0,
  '星期天': 0,
}

// 课节默认时间段
const SLOT_TIME = {
  1: ['08:00', '08:45'],
  2: ['08:55', '09:40'],
  3: ['10:00', '10:45'],
  4: ['10:55', '11:40'],
  5: ['14:00', '14:45'],
  6: ['14:55', '15:40'],
  7: ['16:00', '16:45'],
  8: ['16:55', '17:40'],
  9: ['19:00', '19:45'],
  10: ['19:55', '20:40'],
}

const decode = (r, c) => {
  const cell = ws[xlsx.utils.encode_cell({ r, c })]
  return cell && cell.v !== undefined ? String(cell.v).trim() : ''
}

// 找表头行（含“星期一”）
let headerRow = -1
for (let r = range.s.r; r <= Math.min(range.s.r + 12, range.e.r); r++) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    if (WEEK_MAP[decode(r, c)] !== undefined) {
      headerRow = r
      break
    }
  }
  if (headerRow !== -1) break
}
if (headerRow === -1) {
  console.error('未找到包含“星期一/星期二...”的表头行')
  process.exit(1)
}

// 映射每列对应星期
const weekdayCols = {}
for (let c = range.s.c; c <= range.e.c; c++) {
  const v = decode(headerRow, c)
  if (WEEK_MAP[v] !== undefined) {
    weekdayCols[c] = WEEK_MAP[v]
  }
}

const results = []

for (let r = headerRow + 1; r <= range.e.r; r++) {
  for (const [cStr, weekday] of Object.entries(weekdayCols)) {
    const c = Number(cStr)
    const text = decode(r, c)
    if (!text) continue

    // 按换行/分号拆分
    const lines = text
      .split(/[\r\n；;]+/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (!lines.length) continue

    const name = lines[0].replace(/[★☆]/g, '') || '未命名课程'

    // 节次
    let startLesson = 1
    let endLesson = 2
    const lessonLine = lines.find((l) => l.includes('节'))
    if (lessonLine) {
      const m = lessonLine.match(/(\d+)\s*[-~]\s*(\d+)/)
      if (m) {
        startLesson = Number(m[1])
        endLesson = Number(m[2])
      } else {
        const n = lessonLine.match(/(\d+)/)
        if (n) startLesson = endLesson = Number(n[1] || n[0])
      }
    }

    // 地点、教师
    const location = lines.find((l) => /教室|校区|楼/.test(l)) || '未填写'
    const teacher = lines.find((l) => /教师|老师/.test(l)) || '未填写'

    const [startTime, endTime] = SLOT_TIME[startLesson] || SLOT_TIME[1]

    results.push({
      weekday,
      name,
      location,
      teacher,
      startLesson,
      endLesson,
      startTime,
      endTime,
    })
  }
}

fs.writeFileSync(
  path.resolve('schedule_from_xlsx.json'),
  JSON.stringify(results, null, 2),
  { encoding: 'utf-8' },
)

console.log(`转换完成，生成 schedule_from_xlsx.json，共 ${results.length} 条课程记录`)
