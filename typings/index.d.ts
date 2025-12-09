/// <reference path="./types/index.d.ts" />

interface AnniversaryMeta {
  id: string
  title: string
  from: string
  target: string
  avatars: {
    left: string
    right: string
  }
  pinned?: boolean
  repeat?: 'none' | 'year' | 'month' | 'day'
}

interface FeatureShortcut {
  id: string
  name: string
  description: string
  bgColor: string
  textColor: string
  iconPath: string
}

interface MomentComment {
  id: string
  nickname: string
  content: string
  time: string
}

interface MomentItem {
  id: string
  avatar: string
  nickname: string
  time: string
  location: string
  content: string
  images: string[]
  comments: MomentComment[]
  likes?: number
  likedByMe?: boolean
}

interface NoteEntry {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  attachments: string[]
  pinned?: boolean
  category_id?: string
  tags?: string[]
  reminder_time?: string
  template_type?: string
}

interface UserProfile {
  avatar: string
  username: string
  bio: string
}

interface MealDish {
  name: string
  cost: number
}

interface MealPackage {
  id: string
  name: string
  mainDish: MealDish
  vegetable: MealDish
  totalCost: number
  method: string
  iconType: 'rice1' | 'rice2' | 'rice3'
}

interface HabitTask {
  id: string
  type: 'signin' | 'random'
  title: string
  description: string
  keywords: string[]
  completed: boolean
  completedAt?: string
}

interface HabitRecord {
  date: string
  tasks: HabitTask[]
  progress: number
  completed: boolean
}

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    anniversaries: AnniversaryMeta[],
    featureShortcuts: FeatureShortcut[],
    moments: MomentItem[],
    notes: NoteEntry[],
    userProfile: UserProfile,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}