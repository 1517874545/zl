-- 为notes表添加cover字段
-- 在 Supabase SQL Editor 中执行此脚本

-- 检查并添加cover字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'cover'
  ) THEN
    ALTER TABLE notes ADD COLUMN cover VARCHAR DEFAULT 'summer';
    COMMENT ON COLUMN notes.cover IS '封面类型：summer, dusk, wave, dream, green, lemon';
  END IF;
END $$;

-- 为现有数据设置默认封面
UPDATE notes 
SET cover = 'summer'
WHERE cover IS NULL OR cover = '';

