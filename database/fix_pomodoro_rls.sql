-- 修复 pomodoro_settings 和 pomodoro_sessions 表的 RLS 权限问题
-- 在 Supabase SQL Editor 中执行此脚本

-- ============================================
-- 1. 确保 RLS 已启用
-- ============================================
ALTER TABLE pomodoro_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 删除可能存在的旧策略
-- ============================================
-- pomodoro_settings 表
DROP POLICY IF EXISTS "Allow anonymous read" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous insert" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous update" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous delete" ON pomodoro_settings;

-- pomodoro_sessions 表
DROP POLICY IF EXISTS "Allow anonymous read" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous insert" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous update" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous delete" ON pomodoro_sessions;

-- ============================================
-- 3. 重新创建策略（确保匿名访问）
-- ============================================
-- pomodoro_settings 表策略
CREATE POLICY "Allow anonymous read" ON pomodoro_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON pomodoro_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON pomodoro_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON pomodoro_settings FOR DELETE USING (true);

-- pomodoro_sessions 表策略
CREATE POLICY "Allow anonymous read" ON pomodoro_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON pomodoro_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON pomodoro_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON pomodoro_sessions FOR DELETE USING (true);

-- ============================================
-- 4. 验证策略是否创建成功
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('pomodoro_settings', 'pomodoro_sessions')
ORDER BY tablename, policyname;
