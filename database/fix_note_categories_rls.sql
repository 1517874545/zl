-- 修复 note_categories 表的 RLS 权限问题
-- 在 Supabase SQL Editor 中执行此脚本

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow anonymous read" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous insert" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous update" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous delete" ON note_categories;

-- 重新创建策略（确保匿名访问）
CREATE POLICY "Allow anonymous read" ON note_categories FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON note_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON note_categories FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON note_categories FOR DELETE USING (true);

-- 验证策略是否创建成功
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'note_categories';

