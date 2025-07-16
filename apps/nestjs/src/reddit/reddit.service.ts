import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  RedditAccessTokenResponse,
  RedditListingResponse,
} from '@repo/types/reddit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedditService implements OnModuleInit {
  private accessToken: string;
  private readonly redditClientId: string;
  private readonly redditSecret: string;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.redditClientId = this.configService.get<string>('REDDIT_CLIENT_ID')!;
    this.redditSecret = this.configService.get<string>('REDDIT_SECRET')!;
  }

  async onModuleInit() {
    this.accessToken = await this.getRedditToken();
  }

  async getRedditToken(): Promise<string> {
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

  async getHotPosts(
    subreddit: string = 'popular',
  ): Promise<RedditListingResponse> {
    const url = `https://oauth.reddit.com/r/${subreddit}/hot.json`;
    const response = await firstValueFrom(
      this.httpService
        .get<RedditListingResponse>(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        })
        .pipe(map((res) => res.data)),
    );
    return response;
  }
}
