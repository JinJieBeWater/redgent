import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  RedditAccessTokenResponse,
  RedditListingResponse,
  RedditSort,
  RedditPostWrapper,
  RedditPostInfo,
} from '@repo/types/reddit';
import { SubredditWrapper } from '@repo/types/subreddit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedditService implements OnModuleInit {
  private accessToken: string;
  private readonly redditClientId: string;
  private readonly redditSecret: string;
  private readonly logger = new Logger(RedditService.name);

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.redditClientId = this.configService.get<string>('REDDIT_CLIENT_ID')!;
    this.redditSecret = this.configService.get<string>('REDDIT_SECRET')!;
  }

  async onModuleInit() {
    this.accessToken = await this.getRedditToken();
    this.httpService.axiosRef.defaults.headers.common['Authorization'] =
      `Bearer ${this.accessToken}`;
  }

  async getRedditToken() {
    const auth = Buffer.from(
      `${this.redditClientId}:${this.redditSecret}`,
    ).toString('base64');

    const params = new URLSearchParams({ grant_type: 'client_credentials' });

    const response = await firstValueFrom(
      this.httpService
        .post<RedditAccessTokenResponse>(
          'https://www.reddit.com/api/v1/access_token',
          params,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
          },
        )
        .pipe(map((res) => res.data)),
    );

    return response.access_token;
  }

  async getSubredditsByQuery(query: string) {
    const url = `https://oauth.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}`;
    const response = await firstValueFrom(
      this.httpService
        .get<RedditListingResponse<SubredditWrapper>>(url)
        .pipe(map((res) => res.data)),
    );
    return response.data;
  }

  async getHotPostsBySubreddit(
    subreddit: string = 'popular',
    sort: RedditSort = RedditSort.Hot,
  ) {
    const url = `https://oauth.reddit.com/r/${subreddit}/${sort}.json`;
    const response = await firstValueFrom(
      this.httpService
        .get<RedditListingResponse<RedditPostWrapper>>(url)
        .pipe(map((res) => res.data)),
    );
    return response.data;
  }

  async getHotPostsBySubreddits(
    subreddits: string[],
    sort: RedditSort = RedditSort.Hot,
  ) {
    const requests = subreddits.map((subreddit) =>
      this.getHotPostsBySubreddit(subreddit, sort),
    );

    const results = await Promise.allSettled(requests);
    const postMap = new Map<string, RedditPostInfo>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const post of result.value.children) {
          postMap.set(post.data.id, post.data);
        }
      } else {
        this.logger.error(
          `Failed to fetch posts for a subreddit: ${result.reason}`,
        );
      }
    }

    return Array.from(postMap.values());
  }

  async getHotPostsByQuery(query: string, sort: RedditSort = RedditSort.Hot) {
    const url = `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=${sort}`;
    const response = await firstValueFrom(
      this.httpService
        .get<RedditListingResponse<RedditPostWrapper>>(url)
        .pipe(map((res) => res.data)),
    );
    return response.data;
  }

  async getHotPostsByQueries(
    querys: string[],
    sort: RedditSort = RedditSort.Hot,
  ) {
    const requests = querys.map((query) =>
      this.getHotPostsByQuery(query, sort),
    );
    const results = await Promise.allSettled(requests);
    const postMap = new Map<string, RedditPostInfo>();
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const post of result.value.children) {
          postMap.set(post.data.id, post.data);
        }
      } else {
        this.logger.error(
          `Failed to fetch posts for a query: ${result.reason}`,
        );
      }
    }
    return Array.from(postMap.values());
  }

  async getHotPostsByQueriesAndSubreddits(
    querys: string[] = [],
    subreddits: string[] = [],
    sort: RedditSort = RedditSort.Hot,
  ) {
    const requests = [
      ...querys.map((query) => this.getHotPostsByQuery(query, sort)),
      ...subreddits.map((subreddit) =>
        this.getHotPostsBySubreddit(subreddit, sort),
      ),
    ];

    const results = await Promise.allSettled(requests);
    const postMap = new Map<string, RedditPostInfo>();
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const post of result.value.children) {
          postMap.set(post.data.id, post.data);
        }
      } else {
        this.logger.error(
          `Failed to fetch posts for a query or subreddit: ${result.reason}`,
        );
      }
    }
    return Array.from(postMap.values());
  }
}
