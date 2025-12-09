-- 修复 ai_conversations 表的 RLS 权限问题
-- 在 Supabase SQL Editor 中执行此脚本

-- ============================================
-- 1. 确保 RLS 已启用
-- ============================================
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 删除可能存在的旧策略
-- ============================================
DROP POLICY IF EXISTS "Allow anonymous read" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anonymous insert" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anonymous update" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anonymous delete" ON ai_conversations;

-- ============================================
-- 3. 重新创建策略（确保匿名访问）
-- ============================================
CREATE POLICY "Allow anonymous read" ON ai_conversations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON ai_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON ai_conversations FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON ai_conversations FOR DELETE USING (true);

-- ============================================
-- 4. 验证策略是否创建成功
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ai_conversations'
ORDER BY policyname;
