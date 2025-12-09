-- 为预算表添加月份字段
-- 执行此脚本以支持按月份管理预算

-- 添加月份字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budgets' AND column_name = 'month'
  ) THEN
    ALTER TABLE budgets ADD COLUMN month VARCHAR(7) DEFAULT '';
    -- 为现有数据设置默认月份（当前月份）
    UPDATE budgets 
    SET month = TO_CHAR(NOW(), 'YYYY-MM')
    WHERE month = '' OR month IS NULL;
  END IF;
END $$;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_budgets_category_month ON budgets(category, month);
