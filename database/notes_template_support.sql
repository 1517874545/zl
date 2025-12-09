-- 确保notes表支持template_type字段
-- 如果字段已存在，此脚本不会报错

-- 检查并添加template_type字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE notes ADD COLUMN template_type VARCHAR;
    COMMENT ON COLUMN notes.template_type IS '模板类型：blank, dot, grid, line, vintage1, vintage2';
  END IF;
END $$;

-- 为现有数据设置默认模板类型
UPDATE notes 
SET template_type = 'blank'
WHERE template_type IS NULL OR template_type = '';

-- 添加索引（可选，如果经常按模板类型查询）
CREATE INDEX IF NOT EXISTS idx_notes_template_type ON notes(template_type);
