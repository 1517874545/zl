-- 校园生活小程序数据库表结构
-- 在 Supabase SQL Editor 中执行此脚本创建所有表

-- 1. 用户资料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  avatar TEXT NOT NULL DEFAULT '../../assets/avatar-b.png',
  username TEXT NOT NULL DEFAULT '生活记录者',
  bio TEXT NOT NULL DEFAULT '点击编辑个人简介，让朋友更了解你。',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 纪念日表
CREATE TABLE IF NOT EXISTS anniversaries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  from_date DATE NOT NULL,
  target_date DATE NOT NULL,
  avatars JSONB NOT NULL DEFAULT '{"left": "../../assets/avatar-a.png", "right": "../../assets/avatar-b.png"}',
  pinned BOOLEAN DEFAULT FALSE,
  repeat_type TEXT DEFAULT 'none' CHECK (repeat_type IN ('none', 'year', 'month', 'day')),
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 动态表
CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  avatar TEXT NOT NULL,
  nickname TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  likes INTEGER DEFAULT 0,
  liked_by_me BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 动态评论表
CREATE TABLE IF NOT EXISTS moment_comments (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 笔记表
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  pinned BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 打卡记录表
CREATE TABLE IF NOT EXISTS habit_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  tasks JSONB NOT NULL DEFAULT '[]',
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 存钱记录表
CREATE TABLE IF NOT EXISTS saving_records (
  id TEXT PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  date TEXT NOT NULL,
  note TEXT,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 课程表
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  teacher TEXT NOT NULL,
  start_lesson INTEGER NOT NULL,
  end_lesson INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  color TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_anniversaries_user_id ON anniversaries(user_id);
CREATE INDEX IF NOT EXISTS idx_anniversaries_target_date ON anniversaries(target_date);
CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moment_comments_moment_id ON moment_comments(moment_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_records_date ON habit_records(date);
CREATE INDEX IF NOT EXISTS idx_saving_records_user_id ON saving_records(user_id);
CREATE INDEX IF NOT EXISTS idx_saving_records_created_at ON saving_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_weekday ON courses(weekday);
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);

-- 启用 Row Level Security (RLS) - 允许匿名访问（可根据需要调整）
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- 创建允许匿名访问的策略（开发阶段，生产环境建议使用认证）
CREATE POLICY "Allow anonymous read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON user_profiles FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read" ON anniversaries FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON anniversaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON anniversaries FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON anniversaries FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON moments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON moments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON moments FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON moments FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON moment_comments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON moment_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON moment_comments FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON moment_comments FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON notes FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON notes FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON notes FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON habit_records FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON habit_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON habit_records FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON habit_records FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON saving_records FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON saving_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON saving_records FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON saving_records FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON courses FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON courses FOR DELETE USING (true);

