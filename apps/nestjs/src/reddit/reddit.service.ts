import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { map } from 'rxjs/operators'

import {
  RedditAccessTokenResponse,
  RedditListingResponse,
  RedditSort,
  RedditLinkWrapper,
  RedditLinkInfoUntrusted,
  RedditCommentResponse,
  RedditCommentInfoUntrusted,
  RedditCommentWrapper,
} from '@redgent/types/reddit'
import { SubredditWrapper } from '@redgent/types/subreddit'

import { ConfigService } from '@nestjs/config'

export interface CommentNode {
  author: string
  body: string
  replies?: CommentNode[]
}

@Injectable()
export class RedditService implements OnModuleInit {
  private accessToken: string
  private readonly redditClientId: string
  private readonly redditSecret: string
  private readonly logger = new Logger(RedditService.name)

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.redditClientId = this.configService.get<string>('REDDIT_CLIENT_ID')!
    this.redditSecret = this.configService.get<string>('REDDIT_SECRET')!
  }

  async onModuleInit() {
    this.accessToken = await this.getRedditToken()
    this.httpService.axiosRef.defaults.headers.common['Authorization'] =
      `Bearer ${this.accessToken}`
  }

  async getRedditToken() {
    const auth = Buffer.from(
      `${this.redditClientId}:${this.redditSecret}`,
    ).toString('base64')

    const params = new URLSearchParams({ grant_type: 'client_credentials' })

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
    )

    return response.access_token
  }

  async getSubredditsByQuery(query: string) {
    const url = `https://oauth.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}`
    const response = await firstValueFrom(
      this.httpService
        .get<RedditListingResponse<SubredditWrapper>>(url)
        .pipe(map((res) => res.data)),
    )
    return response.data
  }

  async getHotLinksBySubreddit(
    subreddit: string = 'popular',
    sort: RedditSort = RedditSort.Hot,
  ) {
    const url = `https://oauth.reddit.com/r/${subreddit}/${sort}.json`
    const response = await firstValueFrom(
      this.httpService
        .get<RedditListingResponse<RedditLinkWrapper>>(url)
        .pipe(map((res) => res.data)),
    )
    return response.data
  }

  async getHotLinksBySubreddits(
    subreddits: string[],
    sort: RedditSort = RedditSort.Hot,
  ) {
    const requests = subreddits.map((subreddit) =>
      this.getHotLinksBySubreddit(subreddit, sort),
    )

    const results = await Promise.allSettled(requests)
    const allLinks: RedditLinkInfoUntrusted[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        // 直接添加所有链接，不进行去重和排序
        allLinks.push(...result.value.children.map(link => link.data))
      } else {
        this.logger.error(
          `Failed to fetch links for a subreddit: ${result.reason}`,
        )
      }
    }

    return allLinks
  }

  async getHotLinksByQuery(query: string, sort: RedditSort = RedditSort.Hot) {
    const url = `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=${sort}`
    const response = await firstValueFrom(
      this.httpService
        .get<RedditListingResponse<RedditLinkWrapper>>(url)
        .pipe(map((res) => res.data)),
    )
    return response.data
  }

  async getHotLinksByQueries(
    querys: string[],
    sort: RedditSort = RedditSort.Hot,
  ) {
    const requests = querys.map((query) => this.getHotLinksByQuery(query, sort))
    const results = await Promise.allSettled(requests)
    const allLinks: RedditLinkInfoUntrusted[] = []
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        // 直接添加所有链接，不进行去重和排序
        allLinks.push(...result.value.children.map(link => link.data))
      }
    }
    
    return allLinks
  }

  async getHotLinksByQueriesAndSubreddits(
    querys: string[] = [],
    subreddits: string[] = [],
    sort: RedditSort = RedditSort.Hot,
  ) {
    const requests = [
      ...querys.map((query) => this.getHotLinksByQuery(query, sort)),
      ...subreddits.map((subreddit) =>
        this.getHotLinksBySubreddit(subreddit, sort),
      ),
    ]

    const results = await Promise.allSettled(requests)
    const allLinks: RedditLinkInfoUntrusted[] = []
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        // 直接添加所有链接，不进行去重和排序
        allLinks.push(...result.value.children.map(link => link.data))
      }
    }
    
    return allLinks
  }

  async getCommentsByLinkId(linkId: string) {
    const url = `https://oauth.reddit.com/comments/${linkId}.json?sort=confidence&limit=5`
    const response = await firstValueFrom(
      this.httpService
        .get<RedditCommentResponse>(url)
        .pipe(map((res) => res.data)),
    )
    return response
  }

  async getCommentsByLinkIds(linkIds: string[]) {
    const requests = linkIds.map((linkId) => this.getCommentsByLinkId(linkId))
    const results = await Promise.allSettled(requests)
    const currentData: {
      content: RedditLinkInfoUntrusted
      comment: CommentNode[]
    }[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        currentData.push({
          content: result.value[0].data.children[0].data,
          comment: this.extractCommentNodes(
            result.value[1].data.children.map((c) => c.data),
          ),
        })
      }
    }
    return currentData
  }

  public extractCommentNodes(
    comments: RedditCommentInfoUntrusted[],
  ): CommentNode[] {
    const nodes: CommentNode[] = []
    for (const comment of comments) {
      const node: CommentNode = {
        author: comment.author,
        body: comment.body,
      }
      if (
        comment.replies !== '' &&
        comment.replies &&
        comment.replies.data.children.length > 0
      ) {
        const nestedComments = comment.replies.data.children.map(
          (reply: RedditCommentWrapper) => reply.data,
        )
        node.replies = this.extractCommentNodes(nestedComments)
      }
      nodes.push(node)
    }
    return nodes
  }
}
