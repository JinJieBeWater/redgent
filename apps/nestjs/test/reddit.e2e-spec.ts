import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { RedditService } from '../src/reddit/reddit.service';
import { RedditSort, RedditPostInfo } from '@redgent/types/reddit';

// Helper to create a mock post
const createMockPost = (id: string, subreddit: string): RedditPostInfo => ({
  id,
  title: `Title for ${id}`,
  author: 'test-author',
  author_fullname: 't2_test-author',
  created_utc: Date.now() / 1000,
  subreddit,
  subreddit_name_prefixed: `r/${subreddit}`,
  subreddit_subscribers: 1000,
  url: `https://www.reddit.com/r/${subreddit}/comments/${id}/`,
  is_video: false,
  over_18: false,
  permalink: `/r/${subreddit}/comments/${id}/`,
  score: 100,
  num_comments: 50,
  upvote_ratio: 0.9,
  num_crossposts: 1,
  thumbnail: 'self',
  archived: false,
  locked: false,
});

// Helper to create a mock API response
const createMockResponse = (posts: RedditPostInfo[]) => ({
  kind: 'Listing',
  data: {
    after: 't3_xyz',
    before: null,
    dist: posts.length,
    modhash: 'mock_modhash',
    geo_filter: null,
    children: posts.map((post) => ({ kind: 't3', data: post })),
  },
});

describe('RedditService (Integration)', () => {
  let app: INestApplication;
  let redditService: RedditService;
  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    redditService = app.get<RedditService>(RedditService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('getSubredditsByQuery', () => {
    it('should fetch subreddits by query from the real Reddit API', async () => {
      const query = 'programming';
      const result = await redditService.getSubredditsByQuery(query);

      expect(result).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
      expect(result.children.length).toBeGreaterThan(0);
    });
  });

  describe('getHotPostsBySubreddit', () => {
    it('should fetch hot posts by subreddit from a real subreddit API', async () => {
      const subreddit = 'typescript';
      const result = await redditService.getHotPostsBySubreddit(
        subreddit,
        RedditSort.Hot,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
      expect(result.children.length).toBeGreaterThan(0);

      const firstPost = result.children[0];
      expect(firstPost.kind).toBe('t3'); // t3 kind represents a link post
      expect(firstPost.data).toBeDefined();
      expect(firstPost.data.subreddit).toBe(subreddit);
    });
  });

  describe('getHotPostsBySubreddits', () => {
    describe('Mocked', () => {
      let getHotPostsBySubredditSpy: jest.SpyInstance;

      beforeEach(() => {
        // Mock the dependency to control its behavior
        getHotPostsBySubredditSpy = jest.spyOn(
          redditService,
          'getHotPostsBySubreddit',
        );
      });

      afterEach(() => {
        // Restore the original implementation after each test
        getHotPostsBySubredditSpy.mockRestore();
      });

      it('should fetch posts from multiple subreddits and remove duplicates', async () => {
        const post1 = createMockPost('post1', 'typescript');
        const post2 = createMockPost('post2', 'javascript');
        const post3Shared = createMockPost('post3', 'shared'); // This post is in both responses

        const tsResponse = createMockResponse([post1, post3Shared]);
        const jsResponse = createMockResponse([post2, post3Shared]);

        getHotPostsBySubredditSpy.mockImplementation(async (subreddit) => {
          if (subreddit === 'typescript') {
            return tsResponse.data;
          }
          if (subreddit === 'javascript') {
            return jsResponse.data;
          }
          return createMockResponse([]).data;
        });

        const result = await redditService.getHotPostsBySubreddits([
          'typescript',
          'javascript',
        ]);

        expect(result).toBeDefined();
        expect(result.length).toBe(3); // post1, post2, post3 (deduplicated)
        expect(result.map((p) => p.id).sort()).toEqual([
          'post1',
          'post2',
          'post3',
        ]);
        expect(getHotPostsBySubredditSpy).toHaveBeenCalledTimes(2);
      });

      it('should handle partial failures gracefully', async () => {
        const post1 = createMockPost('post1', 'nestjs');
        const nestjsResponse = createMockResponse([post1]);

        const loggerErrorSpy = jest
          .spyOn(redditService['logger'], 'error')
          .mockImplementation(() => {});

        getHotPostsBySubredditSpy.mockImplementation(async (subreddit) => {
          if (subreddit === 'nestjs') {
            return nestjsResponse.data;
          }
          if (subreddit === 'failing') {
            throw new Error('API Error: Subreddit not found');
          }
          return createMockResponse([]).data;
        });

        const result = await redditService.getHotPostsBySubreddits([
          'nestjs',
          'failing',
        ]);

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('post1');
        expect(getHotPostsBySubredditSpy).toHaveBeenCalledTimes(2);

        expect(loggerErrorSpy).toHaveBeenCalledTimes(1);

        loggerErrorSpy.mockRestore();
      });
    });

    it('should fetch hot posts for multiple subreddits and deduplicate results', async () => {
      const result = await redditService.getHotPostsBySubreddits([
        'nestjs',
        'javascript',
      ]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Check if there are no duplicate posts
      const uniquePosts = new Set(result.map((post) => post.id));
      expect(uniquePosts.size).toBe(result.length);
    });
  });

  describe('getHotPostsByQuery', () => {
    it('should fetch hot posts by search query from the real Reddit API', async () => {
      const query = 'nestjs';
      const result = await redditService.getHotPostsByQuery(query);

      expect(result).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
      expect(result.children.length).toBeGreaterThan(0);
    });
  });

  describe('getHotPostsByQueries', () => {
    it('should fetch hot posts for multiple queries and deduplicate results', async () => {
      const query1 = 'nestjs';
      const query2 = 'Nestjs_framework'; // Same query to test deduplication
      const result = await redditService.getHotPostsByQueries([query1, query2]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Check if there are no duplicate posts
      const uniquePosts = new Set(result.map((post) => post.id));
      expect(uniquePosts.size).toBe(result.length);
    });
  });

  describe('getHotPostsByQueriesAndSubreddits', () => {
    it('should fetch hot posts for multiple queries and subreddits and deduplicate results', async () => {
      const query1 = 'nestjs';
      const subreddit1 = 'javascript';
      const result = await redditService.getHotPostsByQueriesAndSubreddits(
        [query1],
        [subreddit1],
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Check if there are no duplicate posts
      const uniquePosts = new Set(result.map((post) => post.id));
      expect(uniquePosts.size).toBe(result.length);
    });
  });
});
