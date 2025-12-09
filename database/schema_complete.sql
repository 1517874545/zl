-- 校园生活小程序数据库表结构（完整版）
-- 在 Supabase SQL Editor 中执行此脚本创建所有表
-- 执行前请先检查是否已有表，避免重复创建

-- ============================================
-- 1. 用户资料表
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  avatar TEXT NOT NULL DEFAULT '../../assets/avatar-b.png',
  username TEXT NOT NULL DEFAULT '生活记录者',
  bio TEXT NOT NULL DEFAULT '点击编辑个人简介，让朋友更了解你。',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. 纪念日表
-- ============================================
CREATE TABLE IF NOT EXISTS anniversaries (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  title TEXT NOT NULL,
  from_date DATE NOT NULL,
  target_date DATE NOT NULL,
  avatars JSONB NOT NULL DEFAULT '{"left": "../../assets/avatar-a.png", "right": "../../assets/avatar-b.png"}',
  pinned BOOLEAN DEFAULT FALSE,
  repeat_type TEXT DEFAULT 'none' CHECK (repeat_type IN ('none', 'year', 'month', 'day')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. 动态表（增强版：支持心情和话题）
-- ============================================
CREATE TABLE IF NOT EXISTS moments (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  avatar TEXT NOT NULL,
  nickname TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  mood VARCHAR, -- 心情：happy, sad, excited, tired, angry, calm, love
  topics JSONB, -- 话题标签数组，JSON格式
  likes INTEGER DEFAULT 0,
  liked_by_me BOOLEAN DEFAULT FALSE,
  favorited_by_me BOOLEAN DEFAULT FALSE, -- 收藏状态
  visibility VARCHAR DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. 动态评论表
-- ============================================
CREATE TABLE IF NOT EXISTS moment_comments (
  id VARCHAR PRIMARY KEY,
  moment_id VARCHAR NOT NULL,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  time TEXT NOT NULL,
  parent_id VARCHAR, -- 父评论ID，用于二级评论
  reply_to_user VARCHAR, -- 回复的用户名
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. 动态点赞表（可选，用于记录点赞用户）
-- ============================================
CREATE TABLE IF NOT EXISTS moment_likes (
  id VARCHAR PRIMARY KEY,
  moment_id VARCHAR NOT NULL,
  user_id VARCHAR DEFAULT 'default_user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

-- ============================================
-- 6. 动态收藏表
-- ============================================
CREATE TABLE IF NOT EXISTS moment_favorites (
  id VARCHAR PRIMARY KEY,
  moment_id VARCHAR NOT NULL,
  user_id VARCHAR DEFAULT 'default_user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

-- ============================================
-- 7. 笔记表（增强版：支持分类、标签、提醒）
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  pinned BOOLEAN DEFAULT FALSE,
  category_id VARCHAR, -- 分类ID
  tags JSONB, -- 标签数组，JSON格式
  reminder_time TIMESTAMP WITH TIME ZONE, -- 提醒时间
  template_type VARCHAR, -- 模板类型
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. 笔记分类表
-- ============================================
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

-- ============================================
-- 9. 财务记录表（存钱罐增强版）
-- ============================================
CREATE TABLE IF NOT EXISTS financial_records (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR NOT NULL, -- 收入类型或支出分类
  amount DECIMAL(10, 2) NOT NULL,
  source VARCHAR, -- 收入来源或支出商家
  note TEXT,
  record_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. 预算表
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  category VARCHAR NOT NULL, -- 支出分类
  monthly_limit DECIMAL(10, 2) NOT NULL,
  current_month_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. 课程表
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  teacher TEXT NOT NULL,
  start_lesson INTEGER NOT NULL,
  end_lesson INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  color TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. 天气设置表
-- ============================================
CREATE TABLE IF NOT EXISTS weather_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  city_name VARCHAR NOT NULL,
  city_code VARCHAR,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 13. 番茄钟设置表
-- ============================================
CREATE TABLE IF NOT EXISTS pomodoro_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  focus_duration INTEGER DEFAULT 25, -- 专注时长（分钟）
  short_break_duration INTEGER DEFAULT 5, -- 短休息时长（分钟）
  long_break_duration INTEGER DEFAULT 15, -- 长休息时长（分钟）
  auto_start_next BOOLEAN DEFAULT FALSE, -- 自动开始下一个
  sound_enabled BOOLEAN DEFAULT TRUE, -- 提醒音效
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 14. 番茄钟记录表
-- ============================================
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  task_name VARCHAR,
  duration INTEGER NOT NULL, -- 专注时长（分钟）
  type VARCHAR DEFAULT 'focus' CHECK (type IN ('focus', 'break')), -- 类型：专注或休息
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 15. AI对话记录表
-- ============================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 16. 通知设置表（可选，用于真实通知功能）
-- ============================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  type VARCHAR NOT NULL CHECK (type IN ('anniversary', 'course', 'study', 'finance')),
  enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME, -- 免打扰开始时间
  quiet_hours_end TIME, -- 免打扰结束时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 17. 通知历史表（可选）
-- ============================================
CREATE TABLE IF NOT EXISTS notification_history (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR DEFAULT 'default_user',
  type VARCHAR NOT NULL,
  content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

-- ============================================
-- 创建索引以提高查询性能
-- ============================================
CREATE INDEX IF NOT EXISTS idx_anniversaries_user_id ON anniversaries(user_id);
CREATE INDEX IF NOT EXISTS idx_anniversaries_target_date ON anniversaries(target_date);
CREATE INDEX IF NOT EXISTS idx_anniversaries_pinned ON anniversaries(pinned);

CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_mood ON moments(mood);

CREATE INDEX IF NOT EXISTS idx_moment_comments_moment_id ON moment_comments(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_comments_parent_id ON moment_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_moment_likes_moment_id ON moment_likes(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_likes_user_id ON moment_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_moment_favorites_moment_id ON moment_favorites(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_favorites_user_id ON moment_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);

CREATE INDEX IF NOT EXISTS idx_note_categories_user_id ON note_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_note_categories_sort_order ON note_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON financial_records(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_weekday ON courses(weekday);

CREATE INDEX IF NOT EXISTS idx_weather_settings_user_id ON weather_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_settings_is_default ON weather_settings(is_default);

CREATE INDEX IF NOT EXISTS idx_pomodoro_settings_user_id ON pomodoro_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed_at ON pomodoro_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_type ON pomodoro_sessions(type);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(type);

CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);

-- ============================================
-- 启用 Row Level Security (RLS)
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 创建允许匿名访问的策略（开发阶段）
-- 生产环境建议使用认证和更严格的策略
-- ============================================

-- 用户资料策略
DROP POLICY IF EXISTS "Allow anonymous read" ON user_profiles;
DROP POLICY IF EXISTS "Allow anonymous insert" ON user_profiles;
DROP POLICY IF EXISTS "Allow anonymous update" ON user_profiles;
CREATE POLICY "Allow anonymous read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON user_profiles FOR UPDATE USING (true);

-- 纪念日策略
DROP POLICY IF EXISTS "Allow anonymous read" ON anniversaries;
DROP POLICY IF EXISTS "Allow anonymous insert" ON anniversaries;
DROP POLICY IF EXISTS "Allow anonymous update" ON anniversaries;
DROP POLICY IF EXISTS "Allow anonymous delete" ON anniversaries;
CREATE POLICY "Allow anonymous read" ON anniversaries FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON anniversaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON anniversaries FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON anniversaries FOR DELETE USING (true);

-- 动态策略
DROP POLICY IF EXISTS "Allow anonymous read" ON moments;
DROP POLICY IF EXISTS "Allow anonymous insert" ON moments;
DROP POLICY IF EXISTS "Allow anonymous update" ON moments;
DROP POLICY IF EXISTS "Allow anonymous delete" ON moments;
CREATE POLICY "Allow anonymous read" ON moments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON moments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON moments FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON moments FOR DELETE USING (true);

-- 动态评论策略
DROP POLICY IF EXISTS "Allow anonymous read" ON moment_comments;
DROP POLICY IF EXISTS "Allow anonymous insert" ON moment_comments;
DROP POLICY IF EXISTS "Allow anonymous delete" ON moment_comments;
CREATE POLICY "Allow anonymous read" ON moment_comments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON moment_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON moment_comments FOR DELETE USING (true);

-- 动态点赞策略
DROP POLICY IF EXISTS "Allow anonymous read" ON moment_likes;
DROP POLICY IF EXISTS "Allow anonymous insert" ON moment_likes;
DROP POLICY IF EXISTS "Allow anonymous delete" ON moment_likes;
CREATE POLICY "Allow anonymous read" ON moment_likes FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON moment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON moment_likes FOR DELETE USING (true);

-- 动态收藏策略
DROP POLICY IF EXISTS "Allow anonymous read" ON moment_favorites;
DROP POLICY IF EXISTS "Allow anonymous insert" ON moment_favorites;
DROP POLICY IF EXISTS "Allow anonymous delete" ON moment_favorites;
CREATE POLICY "Allow anonymous read" ON moment_favorites FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON moment_favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON moment_favorites FOR DELETE USING (true);

-- 笔记策略
DROP POLICY IF EXISTS "Allow anonymous read" ON notes;
DROP POLICY IF EXISTS "Allow anonymous insert" ON notes;
DROP POLICY IF EXISTS "Allow anonymous update" ON notes;
DROP POLICY IF EXISTS "Allow anonymous delete" ON notes;
CREATE POLICY "Allow anonymous read" ON notes FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON notes FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON notes FOR DELETE USING (true);

-- 笔记分类策略
DROP POLICY IF EXISTS "Allow anonymous read" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous insert" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous update" ON note_categories;
DROP POLICY IF EXISTS "Allow anonymous delete" ON note_categories;
CREATE POLICY "Allow anonymous read" ON note_categories FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON note_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON note_categories FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON note_categories FOR DELETE USING (true);

-- 财务记录策略
DROP POLICY IF EXISTS "Allow anonymous read" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous insert" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous update" ON financial_records;
DROP POLICY IF EXISTS "Allow anonymous delete" ON financial_records;
CREATE POLICY "Allow anonymous read" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON financial_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON financial_records FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON financial_records FOR DELETE USING (true);

-- 预算策略
DROP POLICY IF EXISTS "Allow anonymous read" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous insert" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous update" ON budgets;
DROP POLICY IF EXISTS "Allow anonymous delete" ON budgets;
CREATE POLICY "Allow anonymous read" ON budgets FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON budgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON budgets FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON budgets FOR DELETE USING (true);

-- 课程表策略
DROP POLICY IF EXISTS "Allow anonymous read" ON courses;
DROP POLICY IF EXISTS "Allow anonymous insert" ON courses;
DROP POLICY IF EXISTS "Allow anonymous update" ON courses;
DROP POLICY IF EXISTS "Allow anonymous delete" ON courses;
CREATE POLICY "Allow anonymous read" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON courses FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON courses FOR DELETE USING (true);

-- 天气设置策略
DROP POLICY IF EXISTS "Allow anonymous read" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous insert" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous update" ON weather_settings;
DROP POLICY IF EXISTS "Allow anonymous delete" ON weather_settings;
CREATE POLICY "Allow anonymous read" ON weather_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON weather_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON weather_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON weather_settings FOR DELETE USING (true);

-- 番茄钟设置策略
DROP POLICY IF EXISTS "Allow anonymous read" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous insert" ON pomodoro_settings;
DROP POLICY IF EXISTS "Allow anonymous update" ON pomodoro_settings;
CREATE POLICY "Allow anonymous read" ON pomodoro_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON pomodoro_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON pomodoro_settings FOR UPDATE USING (true);

-- 番茄钟记录策略
DROP POLICY IF EXISTS "Allow anonymous read" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous insert" ON pomodoro_sessions;
CREATE POLICY "Allow anonymous read" ON pomodoro_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON pomodoro_sessions FOR INSERT WITH CHECK (true);

-- AI对话策略
DROP POLICY IF EXISTS "Allow anonymous read" ON ai_conversations;
DROP POLICY IF EXISTS "Allow anonymous insert" ON ai_conversations;
CREATE POLICY "Allow anonymous read" ON ai_conversations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON ai_conversations FOR INSERT WITH CHECK (true);

-- 通知设置策略
DROP POLICY IF EXISTS "Allow anonymous read" ON notification_settings;
DROP POLICY IF EXISTS "Allow anonymous insert" ON notification_settings;
DROP POLICY IF EXISTS "Allow anonymous update" ON notification_settings;
CREATE POLICY "Allow anonymous read" ON notification_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON notification_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON notification_settings FOR UPDATE USING (true);

-- 通知历史策略
DROP POLICY IF EXISTS "Allow anonymous read" ON notification_history;
DROP POLICY IF EXISTS "Allow anonymous insert" ON notification_history;
CREATE POLICY "Allow anonymous read" ON notification_history FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON notification_history FOR INSERT WITH CHECK (true);

-- ============================================
-- 完成
-- ============================================
-- 所有表已创建完成
-- 注意：如果表已存在，CREATE TABLE IF NOT EXISTS 不会报错
-- 如果需要修改现有表结构，请使用 ALTER TABLE 语句

