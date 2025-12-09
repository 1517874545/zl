-- 修复 financial_records 表的 RLS 策略
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 创建 financial_records 表（如果不存在）
CREATE TABLE IF NOT EXISTS financial_records (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  source VARCHAR,
  note TEXT,
  record_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建 budgets 表（如果不存在）
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  category VARCHAR NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL,
  current_month_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON financial_records(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);

-- 4. 启用 RLS
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 5. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow anonymous read" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous insert" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous update" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous delete" ON financial_records;

DROP POLICY IF EXISTS "Allow anonymous read" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous insert" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous update" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous delete" ON budgets;

-- 6. 创建允许匿名访问的策略（开发阶段）
CREATE POLICY "Allow anonymous read" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON financial_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON financial_records FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON financial_records FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON budgets FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON budgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON budgets FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON budgets FOR DELETE USING (true);

