-- 修复 weather_settings 表的 RLS 权限问题
-- 在 Supabase SQL Editor 中执行此脚本

-- ============================================
-- 1. 确保 RLS 已启用
-- ============================================
ALTER TABLE weather_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 删除可能存在的旧策略
-- ============================================
DROP POLICY IF EXISTS "Allow anonymous read" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous insert" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous update" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous delete" ON weather_settings;

-- ============================================
-- 3. 重新创建策略（确保匿名访问）
-- ============================================
CREATE POLICY "Allow anonymous read" ON weather_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON weather_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON weather_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON weather_settings FOR DELETE USING (true);

-- ============================================
-- 4. 验证策略是否创建成功
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'weather_settings'
ORDER BY tablename, policyname;
