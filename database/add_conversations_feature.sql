-- 添加多对话功能支持
-- 在 Supabase SQL Editor 中执行此脚本

-- ============================================
-- 1. 创建对话表（conversations）
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  title VARCHAR NOT NULL, -- 对话标题（第一个用户提问）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. 修改 ai_conversations 表，添加 conversation_id 字段
-- ============================================
-- 添加 conversation_id 字段（允许为空，兼容旧数据）
ALTER TABLE ai_conversations 
ADD COLUMN IF NOT EXISTS conversation_id VARCHAR;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_ai_conversations_conversation_id 
ON ai_conversations(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
ON conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
ON conversations(updated_at DESC);

-- ============================================
-- 3. 启用 RLS
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. 创建 RLS 策略
-- ============================================
-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow anonymous read" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous insert" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous update" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous delete" ON conversations;

-- 创建新策略
CREATE POLICY "Allow anonymous read" ON conversations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON conversations FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON conversations FOR DELETE USING (true);

-- ============================================
-- 5. 更新 ai_conversations 的 RLS 策略（如果需要更新）
-- ============================================
-- 确保 ai_conversations 表有 UPDATE 策略（用于更新 conversation_id）
DROP POLICY IF EXISTS "Allow anonymous update" ON ai_conversations;
CREATE POLICY "Allow anonymous update" ON ai_conversations FOR UPDATE USING (true);

-- ============================================
-- 6. 验证
-- ============================================
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('conversations', 'ai_conversations')
ORDER BY tablename, policyname;
