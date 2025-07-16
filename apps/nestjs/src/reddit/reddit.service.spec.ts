import { Test, TestingModule } from '@nestjs/testing';
import { RedditService } from './reddit.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('RedditService', () => {
  const axiosResponse = {
    status: 200,
    statusText: 'OK',
    headers: {},
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    config: { headers: {} as any },
  };

  let service: RedditService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedditService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDDIT_CLIENT_ID') return 'test_client_id';
              if (key === 'REDDIT_SECRET') return 'test_secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedditService>(RedditService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRedditToken', () => {
    it('should return an access token', async () => {
      const mockTokenResponse = { access_token: 'new_mock_token' };
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: mockTokenResponse,
          ...axiosResponse,
        }),
      );

      const token = await service.getRedditToken();
      expect(token).toEqual('new_mock_token');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(httpService.post).toHaveBeenCalledWith(
        'https://www.reddit.com/api/v1/access_token',
        expect.any(URLSearchParams),
        {
          headers: {
            Authorization: 'Basic dGVzdF9jbGllbnRfaWQ6dGVzdF9zZWNyZXQ=',
          },
        },
      );
    });
  });

  describe('getHotPosts', () => {
    it('should return hot posts for a given subreddit', async () => {
      const subreddit = 'nestjs';
      const mockPostsResponse = {
        data: { children: [{ data: { title: 'Post 1' } }] },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockPostsResponse,
          ...axiosResponse,
        }),
      );

      const result = await service.getHotPosts(subreddit);

      expect(result).toEqual(mockPostsResponse);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(httpService.get).toHaveBeenCalledWith(
        `https://oauth.reddit.com/r/${subreddit}/hot.json`,
        {
          headers: {
            Authorization: 'Bearer undefined',
          },
        },
      );
    });

    it('should return hot posts for popular if no subreddit is provided', async () => {
      const mockPostsResponse = {
        data: { children: [{ data: { title: 'Popular Post' } }] },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: mockPostsResponse,
          ...axiosResponse,
        }),
      );

      const result = await service.getHotPosts();

      expect(result).toEqual(mockPostsResponse);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(httpService.get).toHaveBeenCalledWith(
        `https://oauth.reddit.com/r/popular/hot.json`,
        {
          headers: {
            Authorization: 'Bearer undefined',
          },
        },
      );
    });
  });
});
