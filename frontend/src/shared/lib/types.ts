export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type UserRole = "USER" | "MODERATOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "MUTED" | "BANNED";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  username: string;
  roles: UserRole[];
};

export type NewsArticleResponse = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DELETED";
  category: string;
  tags: string[];
  likes: number;
  bookmarks: number;
  publishedAt: string;
  liked?: boolean;
  bookmarked?: boolean;
};

export type CommentResponse = {
  id: number;
  content: string;
  username: string;
  likes: number;
  liked: boolean;
  replies: CommentResponse[];
  publishedAt: string;
  parentId?: number;
};

export type ForumCategoryResponse = {
  id: number;
  name: string;
  slug: string;
  description: string;
  threadCount: number;
  postCount: number;
};

export type ThreadResponse = {
  id: number;
  title: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  authorUsername: string;
  replyCount: number;
  viewCount: number;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  liked: boolean;
  likes: number;
  createdAt: string;
  lastPostAt: string;
  tags?: string[];
};

export type PostResponse = {
  id: number;
  author: string;           // backend field is "author", not "authorUsername"
  content: string;
  createdAt: string;
  likeCount: number;        // backend field is "likeCount", not "likes"
  liked: boolean;
  // optional fields that may exist in extended responses
  hidden?: boolean;
  bestAnswer?: boolean;
};

export type ThreadDetailResponse = {
  thread: ThreadResponse;
  posts: PostResponse[];
};

export type StandingResponse = {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string;
  points: number;
  played: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
};

export type AiPredictionSummary = {
  homePct: number;
  drawPct: number;
  awayPct: number;
  pick: string;
  pickLabel: string;
  correctScore: string;
  averageGoals: number;
  confidence: number;
  overUnder25: string;
  bothTeamsToScore: string;
  homeForm: string[];
  awayForm: string[];
  trend: string;
};

export type PredictionResponse = {
  id: number;
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  ou25: string;
  btts: string;
  points?: number;
  correctScore: boolean;
  correctResult: boolean;
  correctOu25: boolean;
  correctBtts: boolean;
  submittedAt: string;
};

export type MatchCentreFixture = {
  id: number;
  fixtureId: string;
  league: string;
  round: string;
  status: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore?: number;
  awayScore?: number;
  aiPrediction?: AiPredictionSummary;
  userPrediction?: PredictionResponse;
};

export type MatchCentreResponse = {
  league: string;
  round: string;
  fixtures: MatchCentreFixture[];
  standings: StandingResponse[];
  rounds: string[];
  currentRound: string;
};

export type PredictionRequest = {
  homeScore: number;
  awayScore: number;
  ou25: string;
  btts: string;
};

export type StatsResponse = {
  totalPredictions: number;
  correctScores: number;
  correctResults: number;
  accuracy: number;
  totalPoints: number;
  rank: number;
};

export type LeaderboardEntryResponse = {
  userId: number;
  username: string;
  points: number;
  rank: number;
  correctScores: number;
  correctResults: number;
};

export type NewsCategoryResponse = {
  id: number;
  name: string;
  slug: string;
};

export type FixtureResponse = {
  id: number;
  fixtureId: string;
  leagueSlug: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  userPrediction?: PredictionResponse;
};

export type SearchResponse = {
  news: PageResponse<NewsArticleResponse>;
  forum: PageResponse<ThreadResponse>;
};

export type NotificationResponse = {
  id: number;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};
