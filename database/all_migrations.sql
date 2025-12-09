-- 综合迁移脚本（按原脚本顺序合并）
-- 在 Supabase SQL Editor 中执行，确保幂等（已有列/表/策略不会报错）
-- 来源：
-- 1) migration_add_fields.sql
-- 2) migration_add_month_to_budgets.sql
-- 3) add_cover_to_notes.sql
-- 4) notes_template_support.sql
-- 5) add_conversations_feature.sql
-- 6) fix_financial_records.sql
-- 7) fix_note_categories_rls.sql
-- 8) fix_pomodoro_rls.sql
-- 9) fix_weather_settings_rls.sql
-- 10) fix_ai_conversations_rls.sql

-- ============================================================
-- 1. migration_add_fields.sql
-- ============================================================

-- 为 moments 表添加新字段
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moments' AND column_name = 'mood')
  THEN ALTER TABLE moments ADD COLUMN mood VARCHAR; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moments' AND column_name = 'topics')
  THEN ALTER TABLE moments ADD COLUMN topics JSONB; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moments' AND column_name = 'favorited_by_me')
  THEN ALTER TABLE moments ADD COLUMN favorited_by_me BOOLEAN DEFAULT FALSE; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moments' AND column_name = 'visibility')
  THEN ALTER TABLE moments ADD COLUMN visibility VARCHAR DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')); END IF;
END $$;

-- 为 moment_comments 添加 parent_id / reply_to_user
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moment_comments' AND column_name = 'parent_id')
  THEN ALTER TABLE moment_comments ADD COLUMN parent_id VARCHAR; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moment_comments' AND column_name = 'reply_to_user')
  THEN ALTER TABLE moment_comments ADD COLUMN reply_to_user VARCHAR; END IF;
END $$;

-- 为 notes 添加 category_id / tags / reminder_time / template_type
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'category_id')
  THEN ALTER TABLE notes ADD COLUMN category_id VARCHAR; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'tags')
  THEN ALTER TABLE notes ADD COLUMN tags JSONB; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'reminder_time')
  THEN ALTER TABLE notes ADD COLUMN reminder_time TIMESTAMP WITH TIME ZONE; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'template_type')
  THEN ALTER TABLE notes ADD COLUMN template_type VARCHAR; END IF;
END $$;

-- 创建缺失的表
CREATE TABLE IF NOT EXISTS note_categories (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  name VARCHAR NOT NULL,
  color VARCHAR DEFAULT '#4A90E2',
  icon VARCHAR,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  category VARCHAR NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL,
  current_month_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weather_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  city_name VARCHAR NOT NULL,
  city_code VARCHAR,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pomodoro_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  focus_duration INTEGER DEFAULT 25,
  short_break_duration INTEGER DEFAULT 5,
  long_break_duration INTEGER DEFAULT 15,
  auto_start_next BOOLEAN DEFAULT FALSE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  task_name VARCHAR,
  duration INTEGER NOT NULL,
  type VARCHAR DEFAULT 'focus' CHECK (type IN ('focus', 'break')),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moment_likes (
  id VARCHAR PRIMARY KEY,
  moment_id VARCHAR NOT NULL,
  user_id VARCHAR DEFAULT 'default_user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

CREATE TABLE IF NOT EXISTS moment_favorites (
  id VARCHAR PRIMARY KEY,
  moment_id VARCHAR NOT NULL,
  user_id VARCHAR DEFAULT 'default_user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  type VARCHAR NOT NULL CHECK (type IN ('anniversary', 'course', 'study', 'finance')),
  enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_history (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  type VARCHAR NOT NULL,
  content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_moments_mood ON moments(mood);
CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
CREATE INDEX IF NOT EXISTS idx_moment_comments_parent_id ON moment_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date DESC);

-- 为新增表启用 RLS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'note_categories') THEN
    ALTER TABLE note_categories ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
    ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_settings') THEN
    ALTER TABLE weather_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pomodoro_settings') THEN
    ALTER TABLE pomodoro_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pomodoro_sessions') THEN
    ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_conversations') THEN
    ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'moment_likes') THEN
    ALTER TABLE moment_likes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'moment_favorites') THEN
    ALTER TABLE moment_favorites ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_settings') THEN
    ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_history') THEN
    ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================
-- 2. migration_add_month_to_budgets.sql
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'month')
  THEN
    ALTER TABLE budgets ADD COLUMN month VARCHAR(7) DEFAULT '';
    UPDATE budgets SET month = TO_CHAR(NOW(), 'YYYY-MM') WHERE month = '' OR month IS NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_budgets_category_month ON budgets(category, month);

-- ============================================================
-- 3. add_cover_to_notes.sql
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'cover')
  THEN
    ALTER TABLE notes ADD COLUMN cover VARCHAR DEFAULT 'summer';
    COMMENT ON COLUMN notes.cover IS '封面类型：summer, dusk, wave, dream, green, lemon';
  END IF;
END $$;
UPDATE notes SET cover = 'summer' WHERE cover IS NULL OR cover = '';

-- ============================================================
-- 4. notes_template_support.sql
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'template_type')
  THEN
    ALTER TABLE notes ADD COLUMN template_type VARCHAR;
    COMMENT ON COLUMN notes.template_type IS '模板类型：blank, dot, grid, line, vintage1, vintage2';
  END IF;
END $$;
UPDATE notes SET template_type = 'blank' WHERE template_type IS NULL OR template_type = '';
CREATE INDEX IF NOT EXISTS idx_notes_template_type ON notes(template_type);

-- ============================================================
-- 5. add_conversations_feature.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  title VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS conversation_id VARCHAR;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_conversation_id ON ai_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous insert" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous update" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous delete" ON conversations;
CREATE POLICY "Allow anonymous read" ON conversations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON conversations FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON conversations FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anonymous update" ON ai_conversations;
CREATE POLICY "Allow anonymous update" ON ai_conversations FOR UPDATE USING (true);

-- ============================================================
-- 6. fix_financial_records.sql
-- ============================================================
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

CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  category VARCHAR NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL,
  current_month_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON financial_records(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous insert" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous update" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous delete" ON financial_records;
CREATE POLICY "Allow anonymous read" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON financial_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON financial_records FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON financial_records FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous insert" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous update" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous delete" ON budgets;
CREATE POLICY "Allow anonymous read" ON budgets FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON budgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON budgets FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON budgets FOR DELETE USING (true);

-- ============================================================
-- 7. fix_note_categories_rls.sql
-- ============================================================
DROP POLICY IF EXISTS "Allow anonymous read" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous insert" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous update" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous delete" ON note_categories;
CREATE POLICY "Allow anonymous read" ON note_categories FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON note_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON note_categories FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON note_categories FOR DELETE USING (true);

-- ============================================================
-- 8. fix_pomodoro_rls.sql
-- ============================================================
ALTER TABLE pomodoro_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous insert" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous update" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous delete" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous read" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous insert" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous update" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous delete" ON pomodoro_sessions;

CREATE POLICY "Allow anonymous read" ON pomodoro_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON pomodoro_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON pomodoro_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON pomodoro_settings FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON pomodoro_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON pomodoro_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON pomodoro_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON pomodoro_sessions FOR DELETE USING (true);

-- ============================================================
-- 9. fix_weather_settings_rls.sql
-- ============================================================
ALTER TABLE weather_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous insert" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous update" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous delete" ON weather_settings;
CREATE POLICY "Allow anonymous read" ON weather_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON weather_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON weather_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON weather_settings FOR DELETE USING (true);

-- ============================================================
-- 10. fix_ai_conversations_rls.sql
-- ============================================================
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anonymous insert" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anonymous update" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anonymous delete" ON ai_conversations;
CREATE POLICY "Allow anonymous read" ON ai_conversations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON ai_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON ai_conversations FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON ai_conversations FOR DELETE USING (true);

-- 结束

