-- Supabase 表创建脚本
-- 在 Supabase 控制台的 SQL Editor 中运行这些命令

-- 1. profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT,
  avatar TEXT,
  level INTEGER DEFAULT 1,
  total_exp INTEGER DEFAULT 0,
  gift_balance INTEGER DEFAULT 0,
  unread_interaction_count INTEGER DEFAULT 0,
  notifications JSONB DEFAULT '{}',
  journey JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. practice_sessions 表
CREATE TABLE IF NOT EXISTS practice_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  practice_id TEXT NOT NULL,
  song_id TEXT,
  song_name TEXT,
  timestamp BIGINT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  score REAL,
  analysis JSONB,
  media_id TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, practice_id)
);

-- 3. works 表
CREATE TABLE IF NOT EXISTS works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  song_id TEXT,
  song_name TEXT,
  media_id TEXT,
  audio JSONB,
  payload JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. interactions 表 (如果需要)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'comment', 'gift', 'like'
  content JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. leaderboard 表 (如果需要)
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  song_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  username TEXT,
  score REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(song_id, user_id)
);

-- 启用 RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- 为匿名用户创建策略 (允许所有操作，因为是匿名)
CREATE POLICY "Allow all operations for anonymous users on profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations for anonymous users on practice_sessions" ON practice_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations for anonymous users on works" ON works FOR ALL USING (true);
CREATE POLICY "Allow all operations for anonymous users on interactions" ON interactions FOR ALL USING (true);
CREATE POLICY "Allow all operations for anonymous users on leaderboard" ON leaderboard FOR ALL USING (true);

-- Storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;

-- Policies for media bucket (RLS is enabled by default on storage.objects)
CREATE POLICY "Allow anonymous uploads to media bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'media');

CREATE POLICY "Allow anonymous selects from media bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Allow anonymous deletes from media bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'media');