-- 数据库迁移脚本：为已有表添加新字段
-- 如果表已存在但缺少新字段，执行此脚本
-- 在 Supabase SQL Editor 中执行

-- ============================================
-- 1. 为 moments 表添加新字段（如果不存在）
-- ============================================

-- 添加心情字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND column_name = 'mood'
  ) THEN
    ALTER TABLE moments ADD COLUMN mood VARCHAR;
  END IF;
END $$;

-- 添加话题字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND column_name = 'topics'
  ) THEN
    ALTER TABLE moments ADD COLUMN topics JSONB;
  END IF;
END $$;

-- 添加收藏字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND column_name = 'favorited_by_me'
  ) THEN
    ALTER TABLE moments ADD COLUMN favorited_by_me BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 添加可见性字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE moments ADD COLUMN visibility VARCHAR DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends'));
  END IF;
END $$;

-- ============================================
-- 2. 为 moment_comments 表添加新字段
-- ============================================

-- 添加父评论ID字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moment_comments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE moment_comments ADD COLUMN parent_id VARCHAR;
  END IF;
END $$;

-- 添加回复用户名字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moment_comments' AND column_name = 'reply_to_user'
  ) THEN
    ALTER TABLE moment_comments ADD COLUMN reply_to_user VARCHAR;
  END IF;
END $$;

-- ============================================
-- 3. 为 notes 表添加新字段
-- ============================================

-- 添加分类ID字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE notes ADD COLUMN category_id VARCHAR;
  END IF;
END $$;

-- 添加标签字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'tags'
  ) THEN
    ALTER TABLE notes ADD COLUMN tags JSONB;
  END IF;
END $$;

-- 添加提醒时间字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'reminder_time'
  ) THEN
    ALTER TABLE notes ADD COLUMN reminder_time TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 添加模板类型字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE notes ADD COLUMN template_type VARCHAR;
  END IF;
END $$;

-- ============================================
-- 4. 创建缺失的表（如果不存在）
-- ============================================

-- 笔记分类表
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

-- 财务记录表
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

-- 预算表
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  category VARCHAR NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL,
  current_month_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 天气设置表
CREATE TABLE IF NOT EXISTS weather_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  city_name VARCHAR NOT NULL,
  city_code VARCHAR,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 番茄钟设置表
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

-- 番茄钟记录表
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  task_name VARCHAR,
  duration INTEGER NOT NULL,
  type VARCHAR DEFAULT 'focus' CHECK (type IN ('focus', 'break')),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI对话记录表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 动态点赞表
CREATE TABLE IF NOT EXISTS moment_likes (
  id VARCHAR PRIMARY KEY,
  moment_id VARCHAR NOT NULL,
  user_id VARCHAR DEFAULT 'default_user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

-- 动态收藏表
CREATE TABLE IF NOT EXISTS moment_favorites (
  id VARCHAR PRIMARY KEY,
  moment_id VARCHAR NOT NULL,
  user_id VARCHAR DEFAULT 'default_user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

-- 通知设置表
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

-- 通知历史表
CREATE TABLE IF NOT EXISTS notification_history (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  type VARCHAR NOT NULL,
  content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

-- ============================================
-- 5. 创建索引（如果不存在）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_moments_mood ON moments(mood);
CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
CREATE INDEX IF NOT EXISTS idx_moment_comments_parent_id ON moment_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date DESC);

-- ============================================
-- 6. 更新RLS策略（如果需要）
-- ============================================

-- 为新增的表启用RLS
DO $$ 
BEGIN
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

-- ============================================
-- 完成
-- ============================================
-- 此脚本会安全地为已有表添加新字段，不会影响现有数据
-- 如果字段已存在，不会报错

