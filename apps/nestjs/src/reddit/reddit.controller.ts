import { Controller, Get, Query } from '@nestjs/common';
import { RedditService } from './reddit.service';

@Controller('reddit')
export class RedditController {
  constructor(private readonly redditService: RedditService) {}

  @Get('hot')
  getHotPosts(@Query('subreddit') subreddit?: string) {
    return this.redditService.getHotPosts(subreddit);
  }
}
